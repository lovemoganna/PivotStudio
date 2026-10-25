import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import AxeBuilder from '@axe-core/playwright';
import { encodeView } from '../../src/utils/viewConfig.js';
import { parseCSVRecords } from '../../src/utils/csvParser.js';
import { clickExport } from './_toolbar.js';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:45000});
const preview=page=>page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
const upload=(page,buffer,name='bounds.csv')=>page.locator('input[type=file]').first().setInputFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from(buffer)});
const confirm=async page=>{await expect(preview(page)).toBeVisible();await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await expect(preview(page)).toHaveCount(0,{timeout:45000});await ready(page);};
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());});

for(const width of [360,1440])test(`chart boundary: explicit TopN keeps complete table and scoped exports at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const cfg={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum',format:{decimals:0,currency:'',thousands:true}}]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await upload(page,'Group,Amount\n'+Array.from({length:2500},(_,i)=>`Group${i},${i}`).join('\n'));await confirm(page);
  await expect(page.getByRole('heading',{name:'图表分组过多',exact:true})).toBeVisible();
  await page.mouse.move(0,0);
  await expect(page.locator('footer')).toContainText('3,123,750');
  await expect(page.locator('#pivot-chart-container .recharts-wrapper > svg, #pivot-chart-container svg[data-chart-svg]')).toHaveCount(0);
  let blockedDownloads=0;const recordBlockedDownload=()=>blockedDownloads++;page.on('download',recordBlockedDownload);
  await clickExport(page,'.SVG');
  await expect(page.locator('[role=status]').filter({hasText:'图表分组过多，请先筛选'})).toBeVisible();
  expect(blockedDownloads).toBe(0);page.off('download',recordBlockedDownload);
  await page.getByRole('button',{name:'关闭通知',exact:true}).click();
  await expect(page.getByRole('button',{name:'关闭通知',exact:true})).toHaveCount(0);
  await page.mouse.move(0,0);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const csvPromise=page.waitForEvent('download');await clickExport(page,'.CSV');
  const csv=parseCSVRecords(await readFile(await (await csvPromise).path(),'utf8'));
  expect(csv.length).toBe(2502);expect(csv.at(-1).at(-1)).toBe('3,123,750');
  await page.getByRole('button',{name:'按主指标显示 Top 10',exact:true}).focus();
  await page.keyboard.press('Enter');await ready(page);
  await expect(page.getByLabel('选择图表类型',{exact:true})).toBeFocused();
  await expect(page.locator('#pivot-chart-container .recharts-bar-rectangle')).toHaveCount(10);
  await expect(page.getByTestId('chart-scope')).toContainText('10/2500');
  await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  const svgPromise=page.waitForEvent('download');await clickExport(page,'.SVG');
  expect(await readFile(await (await svgPromise).path(),'utf8')).toContain('Top 10 / 2500; full table &amp; KPIs');
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('heatmap');await ready(page);
  await expect(page.locator('svg[data-chart-svg] [role=button]')).toHaveCount(10);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('histogram: filtered frequencies and drilldown include more than 50 records',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const cfg={fullConfig:{rows:[],columns:[],filters:[{id:'f',field:'Group',selectedValues:['Keep']}],values:[{id:'v',field:'Amount',agg:'sum'}]},ct:'histogram',csc:{histogramBins:4}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await upload(page,'Group,Amount\n'+Array.from({length:2000},(_,i)=>`${i<1000?'Keep':'Drop'},${i<500?0:i<1000?100:999}`).join('\n'));await confirm(page);
  await expect(page.locator('[role=status]').filter({hasText:'1,000 / 2,000 行'})).toBeVisible();
  const chart=page.locator('#pivot-chart-container');await chart.scrollIntoViewIfNeeded();
  await chart.locator('.recharts-bar-rectangle').first().click();
  const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
  await expect(drill).toContainText('500 条记录');
  const file=page.waitForEvent('download');await drill.getByRole('button',{name:'导出明细 CSV',exact:true}).click();
  const records=parseCSVRecords(await readFile(await (await file).path(),'utf8'));
  expect(records.length).toBe(501);expect(records.slice(1).every(row=>row[0]==='Keep'&&Number(row[1])===0)).toBe(true);
  await page.keyboard.press('Escape');
  await chart.locator('.recharts-bar-rectangle').last().click();
  await expect(drill).toContainText('500 条记录');
});

test('Excel calendars: wall-clock import stays stable across timezones and 1904 dates',async({browser,baseURL})=>{
  const cfg={fullConfig:{rows:[{id:'r',field:'Date',dateGranularity:'day'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]}};
  for(const timezoneId of ['UTC','Asia/Shanghai','America/New_York'])for(const date1904 of [false,true]) {
    const context=await browser.newContext({timezoneId,baseURL});const page=await context.newPage();
    try {
      await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());
      const serial=Date.UTC(2026,2,8,0,30)/86400000+25569-(date1904?1462:0);
      const sheet=XLSX.utils.aoa_to_sheet([['Date','Amount'],[serial,12.5]]);sheet.A2.z='yyyy-mm-dd hh:mm:ss';
      const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Clock');book.Workbook={WBProps:{date1904}};
      await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
      await upload(page,XLSX.write(book,{type:'buffer',bookType:'xlsx'}),'clock.xlsx');
      await expect(preview(page)).toContainText('2026-03-08T00:30:00.000');
      await expect(preview(page).getByLabel('Date · 字段类型',{exact:true})).toHaveValue('date');
      await confirm(page);await expect(page.locator('#pivot-main-html-table')).toContainText('2026-03-08');
    } finally {await context.close();}
  }
});

test('heatmap: columns-only TopN and drilldown keep the selected column key',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const cfg={fullConfig:{rows:[],columns:[{id:'c',field:'Group'}],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]},ct:'heatmap',csc:{topN:10,sortMode:'desc'}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await upload(page,'Group,Amount\n'+Array.from({length:250},(_,i)=>`Group${i},${i}`).join('\n'));await confirm(page);
  const cells=page.locator('svg[data-chart-svg] [role=button]');await expect(cells).toHaveCount(10);
  await cells.first().click();
  const detail=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
  await expect(detail).toContainText('1 条记录');await expect(detail).toContainText('Group249');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'图表选项',exact:true}).click();
  const modeChip = page.getByRole('button',{name:'明细',exact:true});
  await expect(modeChip).toBeVisible();
  await modeChip.click(); // drill → filter (label becomes 筛选)
  await expect(page.getByRole('button',{name:'筛选',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await cells.first().click();await ready(page);
  await expect(page.getByTestId('dataset-telemetry')).toContainText('1 / 250 行');
  await expect(page.locator('svg[data-chart-svg] [role=button]')).toHaveCount(1);
});


test('line: a full daily year stays available without TopN truncation',async({page})=>{
  const cfg={fullConfig:{rows:[{id:'r',field:'Day',dateGranularity:'day'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]},ct:'line'};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await upload(page,'Day,Amount\n'+Array.from({length:365},(_,i)=>`${new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10)},${i+1}`).join('\n'));await confirm(page);
  await expect(page.locator('#pivot-chart-container .recharts-line-curve')).toBeVisible();
  await expect(page.locator('#pivot-chart-container .recharts-line circle[data-highlighted]')).toHaveCount(365);
  await expect(page.getByRole('heading',{name:'图表分组过多',exact:true})).toHaveCount(0);
});


for(const width of [360,1440])test(`accessibility: bounded chart states retain whole-page AA checks at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const cfg={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]},ct:'heatmap'};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await upload(page,'Group,Amount\n'+Array.from({length:250},(_,i)=>`Group${i},${i}`).join('\n'));await confirm(page);
  await expect(page.getByRole('heading',{name:'图表分组过多',exact:true})).toBeVisible();
  for(const phase of ['bounded','scoped']) {
    await page.mouse.move(0,0);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    console.log('boundary accessibility',JSON.stringify({width,phase,violations:result.violations.map(issue=>({id:issue.id,targets:issue.nodes.map(node=>node.target)}))}));
    expect(result.violations.map(issue=>issue.id)).toEqual([]);
    if(phase==='bounded'){await page.getByRole('button',{name:'按主指标显示 Top 10',exact:true}).click();await ready(page);await expect(page.locator('svg[data-chart-svg] [role=button]')).toHaveCount(10);}
  }
});
