import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { encodeView } from '../../src/utils/viewConfig.js';
import { parseCSVRecords } from '../../src/utils/csvParser.js';
import { clickExport, clickMoreItem } from './_toolbar.js';
test.beforeEach(async ({page}) => { await page.route('https://fonts.googleapis.com/**',route=>route.abort()); await page.route('https://fonts.gstatic.com/**',route=>route.abort()); });
const upload = (page, buffer, name='data.csv') => page.locator('input[type=file]').first().setInputFiles({name,mimeType:'text/csv',buffer:Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer)});
const preview = page => page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
const ready = async page => { await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:45000}); };

test('R1 500k CSV responds, shows progress, and cancels',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{window.ticks=0;window.timer=setInterval(()=>window.ticks++,20)});
  const start=Date.now();
  const csv='区域,金额\n'+Array.from({length:500000},(_,i)=>`区域${i%10},${i%100}`).join('\n');
  await upload(page,csv,'500k.csv');
  await expect(page.locator('progress[aria-label="导入进度"]')).toBeVisible();
  // Fast parsers may already have opened the modal; do not click behind its overlay.
  await expect(preview(page)).toContainText('500000 行',{timeout:45000});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.locator('[role=status]').filter({hasText:/500,000 \/ 500,000 行/}).first()).toBeVisible({timeout:45000});
  await ready(page);
  await page.getByRole('button',{name:'切换主题',exact:true}).click();
  const ticks=await page.evaluate(()=>window.ticks);
  expect(ticks).toBeGreaterThan(10);
  console.log('R1 browser evidence',JSON.stringify({rows:500000,wallMs:Date.now()-start,uiTicks:ticks}));
  await upload(page,csv,'cancel.csv');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await expect(page.locator('progress[aria-label="导入进度"]')).toHaveCount(0);
});

test('R2 GBK Chinese preview, delimiter, header and field overrides',async({page})=>{
  await page.goto('/');
  const gbk=Buffer.from([0xd0,0xd5,0xc3,0xfb,0x3b,0xbd,0xf0,0xb6,0xee,0x0a,0xd5,0xc5,0xc8,0xfd,0x3b,0x31,0x32]);
  await upload(page,gbk,'gbk.csv');
  await expect(preview(page)).toContainText('张三');
  await expect(preview(page)).toContainText('GBK');
  const field=preview(page).locator('select').last();
  await field.selectOption('text');
  await expect(field).toHaveValue('text');
  await preview(page).getByLabel('表头',{exact:true}).selectOption('no');
  await expect(preview(page)).toContainText('2 行数据');
  await preview(page).getByLabel('表头',{exact:true}).selectOption('yes');
  await expect(preview(page)).toContainText('1 行数据');
  await page.getByRole('button',{name:'关闭文件预览',exact:true}).click();
  await upload(page,'区域\t日期\t金额\n'+Array.from({length:25},(_,i)=>`华东\t2026-10-20\t${i}`).join('\n'),'tab.tsv');
  await expect(preview(page)).toContainText('25 行数据');
  await expect(preview(page).locator('tbody tr')).toHaveCount(20);
  await expect(preview(page).locator('select').last()).toHaveValue('number');
});

test('R3 four-zone drag/drop, aggregations, history and 100k refresh budget',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await upload(page,'区域,渠道,金额\n'+Array.from({length:100000},(_,i)=>`区域${i%5},渠道${i%2},${i%100}`).join('\n'));
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();
  await ready(page);
  for(const [field,zone] of [['区域','rows'],['渠道','columns'],['金额','values'],['区域','filters']]) {
    await page.getByTestId(`field-${field}`).dragTo(page.getByTestId(`zone-${zone}`));
    await expect(page.getByTestId(`zone-${zone}`)).toContainText(field);
    await ready(page);
  }
  const agg=page.getByLabel('切换聚合口径',{exact:true}).first();
  for(const value of ['count','avg','count_distinct','sum']) {
    const start=Date.now();
    // Measure input-to-paint inside the browser; host RPC delays are logged separately.
    await agg.evaluate(el => {
      window.pivotRefreshMs = null;
      el.addEventListener('change', () => {
        const began = performance.now();
        const root = document.querySelector('[data-testid=pivot-workbench]');
        const observer = new MutationObserver(() => {
          if (root.dataset.calculationStatus !== 'idle') return;
          observer.disconnect();
          requestAnimationFrame(() => requestAnimationFrame(() => { window.pivotRefreshMs = performance.now() - began; }));
        });
        observer.observe(root, {attributes:true,attributeFilter:['data-calculation-status']});
      }, {capture:true,once:true});
    });
    await agg.selectOption(value);
    await expect(agg).toHaveValue(value);
    await ready(page);
    const elapsed=Date.now()-start;
    await page.waitForFunction(() => typeof window.pivotRefreshMs === 'number');
    const browserMs = await page.evaluate(() => window.pivotRefreshMs);
    console.log('R3 refresh',JSON.stringify({value,browserInputToPaintMs:Math.round(browserMs),hostWallMs:elapsed}));
    expect(browserMs).toBeLessThan(1000);
  }
  await page.getByLabel('快捷表计算',{exact:true}).first().selectOption('pct_grand');
  await ready(page);
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  await expect(page.getByLabel('快捷表计算',{exact:true}).first()).toHaveValue('normal');
  await page.getByRole('button',{name:'重做',exact:true}).click();
  await expect(page.getByLabel('快捷表计算',{exact:true}).first()).toHaveValue('pct_grand');
  await ready(page);
  await page.getByTestId('zone-columns').locator('[draggable=true]').first().dragTo(page.getByTestId('zone-rows'),{sourcePosition:{x:8,y:10},targetPosition:{x:8,y:8}});
  await expect(page.getByTestId('zone-rows')).toContainText('渠道');
  await expect(page.getByTestId('zone-columns')).not.toContainText('渠道');
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  await expect(page.getByTestId('zone-columns')).toContainText('渠道');
  await expect(page.getByTestId('zone-rows')).not.toContainText('渠道');
});

test('R4 chart drilldown, table highlight and four chart types',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await upload(page,'区域,金额\n'+Array.from({length:120},(_,i)=>`${i<80?'华东':'华南'},${i}`).join('\n'));
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
  await ready(page);
  const cell=page.getByTestId('pivot-value-cell').first();
  await cell.click({position:{x:10,y:10}});
  await expect(page.locator('#pivot-chart-container path[stroke="#FD971F"]').first()).toBeVisible();
  await expect(page.getByRole('dialog',{name:'原始交易明细下钻',exact:true})).toHaveCount(0);
  await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
  const detail=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
  await expect(detail).toContainText('80 条记录');
  await expect(detail.locator('tbody tr')).toHaveCount(50);
  await page.keyboard.press('Escape');
  await cell.dblclick({position:{x:10,y:10}});
  await expect(detail).toContainText('80 条记录');
  await page.keyboard.press('Escape');
  for(const type of ['line','pie','heatmap','bar']) {
    await page.getByLabel('选择图表类型',{exact:true}).selectOption(type);
    await ready(page);
    await expect(page.locator('#pivot-chart-container svg').first()).toBeVisible();
    if(type==='heatmap') {
      await page.locator('svg[data-chart-svg] [role=button]').first().click();
      await expect(detail).toContainText('80 条记录');
      await page.keyboard.press('Escape');
    }
  }
});

test('R5 local named views, last deletion and data-free share restore',async({page,context})=>{
  await page.goto('/?demo=retail'); await ready(page);
  await page.getByLabel('切换聚合口径',{exact:true}).first().selectOption('avg'); await ready(page);
  await clickMoreItem(page,/工作区/);
  await page.getByPlaceholder('输入新工作区快照名称...').fill('本机视图');
  await page.getByRole('button',{name:'保存快照',exact:true}).click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1')));
  expect(stored[0].name).toBe('本机视图'); expect(stored[0]).not.toHaveProperty('rows');
  const link=await page.getByLabel('分享配置链接',{exact:true}).inputValue();
  expect(new URL(link).search).toBe('');
  const fresh=await context.newPage();
  await fresh.goto(link); await expect(fresh.locator('#pivot-main-html-table')).toHaveCount(0);
  await upload(fresh,'销售大区,商品类别,销售额,销量\n华东,数码,100,1\n华南,家居,300,2');
  await expect(preview(fresh)).toBeVisible();
  await fresh.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await ready(fresh);
  await expect(fresh.getByLabel('切换聚合口径',{exact:true}).first()).toHaveValue('avg');
  await fresh.close();
  await page.getByRole('button',{name:'删除',exact:true}).click();
  await expect(page.getByText('保存或切换本机工作区快照 (0)',{exact:true})).toBeVisible();
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1')).length)).toBe(0);
});


test('R6 filtered sorted formatted CSV/XLSX and real PNG/SVG downloads',async({page})=>{
  const config={fullConfig:{rows:[{id:'r',field:'区域',sort:'desc'}],columns:[],filters:[{id:'f',field:'区域',selectedValues:['华东','华南']}],values:[{id:'v',field:'金额',agg:'sum',format:{decimals:2,currency:'¥',thousands:true}}]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(config)));
  await upload(page,'区域,金额\n华东,1234.56\n华南,-2000.25\n华北,99999');
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.locator('[role=status]').filter({hasText:/2 \/ 3 行/}).first()).toBeVisible(); await ready(page);
  const expected=await page.getByTestId('pivot-value-cell').allTextContents();
  const csvPromise=page.waitForEvent('download'); await clickExport(page,'.CSV');
  const csv=parseCSVRecords(await readFile(await (await csvPromise).path(),'utf8'));
  expect(csv.slice(1,-1).map(row=>row[1])).toEqual(expected.map(value=>value.trim()));
  const xlsxPromise=page.waitForEvent('download'); await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await (await xlsxPromise).path()),{cellNF:true});
  const sheet=book.Sheets[book.SheetNames[0]];
  expect(XLSX.utils.sheet_to_json(sheet,{header:1,raw:false}).slice(1,-1).map(row=>row[1])).toEqual(csv.slice(1,-1).map(row=>row[1]));
  for(const kind of ['bar','line','pie','heatmap','funnel']) {
    await page.getByLabel('选择图表类型',{exact:true}).selectOption(kind); await ready(page);
    if (kind === 'pie') {
      // Negative source values must never be silently clipped to make an exportable pie.
      await expect(page.getByTestId('chart-issue')).toContainText('负数');
      await page.getByRole('button',{name:'华东 (1)',exact:true}).click();await ready(page);
      await expect(page.getByTestId('chart-issue')).toHaveCount(0);
    }
    // Recharts animations are visual only; wait for the final geometry before image export.
    await page.waitForTimeout(1600);
    for(const format of ['SVG','PNG']) {
      const promise=page.waitForEvent('download'); await clickExport(page,'.'+format);
      const download=await promise; const bytes=await readFile(await download.path());
      expect(download.suggestedFilename()).toMatch(new RegExp('\\.'+format.toLowerCase()+'$'));
      if(format==='PNG') expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
      else { expect(bytes.toString()).toContain('<svg'); expect(bytes.toString()).not.toContain('foreignObject'); }
    }
  }
});

test('R7 system/manual themes, language persistence and mobile sticky horizontal table',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('.dark')).toHaveCount(1);
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('.dark')).toHaveCount(0);
  await page.getByLabel('主题模式',{exact:true}).selectOption('dark');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('.dark')).toHaveCount(1);
  await page.getByLabel('界面语言',{exact:true}).selectOption('en');
  await expect(page.getByRole('button',{name:'Load sample data',exact:true})).toBeVisible();
  await expect(page.getByLabel('Theme mode',{exact:true})).toHaveValue('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('button',{name:'Load sample data',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Load sample data',exact:true}).click();
  await expect(page.locator('#pivot-main-html-table')).toBeVisible(); await ready(page);
  await expect(page.getByLabel('Select chart type',{exact:true})).toBeVisible();
  const cell=page.locator('#pivot-main-html-table tbody [role=rowheader]').first();
  const scroll=page.locator('#pivot-main-html-table').locator('..');
  const positionBefore=await cell.evaluate(el=>el.getBoundingClientRect().left);
  await scroll.evaluate(el=>{el.scrollLeft=el.scrollWidth});
  const positionAfter=await cell.evaluate(el=>el.getBoundingClientRect().left);
  expect(Math.abs(positionAfter-positionBefore)).toBeLessThan(2);
  expect(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth && el.scrollLeft>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await page.getByLabel('Interface language',{exact:true}).selectOption('zh');
  await expect(page.getByLabel('选择图表类型',{exact:true})).toBeVisible();
});

test('R8 malformed empty missing-field inputs recover without blank screen or data uploads',async({page})=>{
  const requests=[];
  page.on('request',request=>requests.push(request.url()+' '+(request.postData()||'')));
  await page.goto('/');
  for(const [buffer,name,expected] of [
    ['', 'empty.csv', '文件为空'],
    ['not a spreadsheet', 'wrong.pdf', '不支持此文件格式'],
    ['name,value\n"broken,1','broken.csv','引号'],
    ['<!doctype html><html>denied</html>','html.csv','HTML'],
  ]) {
    await upload(page,buffer,name);
    await expect(page.locator('[role=status]').filter({hasText:expected}).first()).toBeVisible();
    await expect(page.locator('header h1')).toBeVisible();
  }
  await upload(page,'name,value\nPS_LOCAL_ONLY_SENTINEL','missing.csv');
  await expect(preview(page).getByRole('alert')).toContainText('缺少字段');
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await ready(page);
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
  expect(requests.some(request=>request.includes('PS_LOCAL_ONLY_SENTINEL'))).toBe(false);
});

test('R8 memory guard gives advice, blocks stale exports and recovers after config change',async({page})=>{
  const config={fullConfig:{rows:[{id:'r',field:'a'}],columns:[{id:'c',field:'b'}],values:[{id:'v',field:'n',agg:'sum'}],filters:[]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(config)));
  await upload(page,'a,b,n\n'+Array.from({length:1000},(_,i)=>`a${i},b${i},1`).join('\n'));
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','failed');
  await expect(page.getByRole('alert').filter({hasText:'内存不足'})).toBeVisible();
  await clickExport(page,'.CSV');
  await expect(page.locator('[role=status]').filter({hasText:'没有可导出'})).toBeVisible();
  await page.getByTestId('zone-columns').getByRole('button',{name:'移除字段',exact:true}).click();
  await ready(page);
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
});

test('R8 worker crash and storage quota failure stay visible and allow retry',async({page})=>{
  await page.addInitScript(()=>{
    const NativeWorker=window.Worker; window.workers=[];
    window.Worker=class extends NativeWorker { constructor(...args){super(...args);window.workers.push(this);} };
    const nativeSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){ if(key==='pivotstudio_workspaces_v1')throw new DOMException('Quota exceeded','QuotaExceededError');return nativeSet.call(this,key,value); };
  });
  await page.goto('/?demo=retail'); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:'本机存储不足'})).toBeVisible();
  await page.evaluate(()=>window.workers.at(-1).dispatchEvent(new ErrorEvent('error',{message:'simulated worker allocation failure'})));
  await expect(page.getByRole('alert').filter({hasText:'内存不足'})).toBeVisible();
  await page.getByRole('button',{name:'重新计算',exact:true}).click(); await ready(page);
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
});

test('review: Excel currency percentages dates and text IDs retain underlying values',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:1000});
  const sheet=XLSX.utils.aoa_to_sheet([
    ['Region','Amount','Rate','Date','ID'],
    ['East',1234.56,.125,new Date('2026-10-20T00:00:00Z'),'00123'],
    ['West',2000,.25,new Date('2026-10-21T00:00:00Z'),'00456'],
  ],{cellDates:true});
  sheet.D2={t:'n',v:Date.UTC(2026,9,20)/86400000+25569,z:'m/d/yy'};
  sheet.D3={t:'n',v:Date.UTC(2026,9,21)/86400000+25569,z:'m/d/yy'};
  for(const row of [2,3]) { sheet[`B${row}`].z='$#,##0.00'; sheet[`C${row}`].z='0.0%'; sheet[`D${row}`].z='m/d/yy'; }
  const book=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,sheet,'Finance');
  await page.goto('/');
  await upload(page,XLSX.write(book,{type:'buffer',bookType:'xlsx'}),'formatted.xlsx');
  await expect(preview(page).getByLabel('Amount · 字段类型',{exact:true})).toHaveValue('number');
  await expect(preview(page).getByLabel('Rate · 字段类型',{exact:true})).toHaveValue('number');
  await expect(preview(page).getByLabel('Date · 字段类型',{exact:true})).toHaveValue('date');
  await expect(preview(page).getByLabel('ID · 字段类型',{exact:true})).toHaveValue('text');
  await expect(preview(page)).toContainText('00123');
  await expect(preview(page)).toContainText('2026-10-20T00:00:00.000');
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click(); await ready(page);
  await page.getByTestId('field-Region').dragTo(page.getByTestId('zone-rows')); await ready(page);
  await page.getByTestId('field-Amount').dragTo(page.getByTestId('zone-values')); await ready(page);
  const csvPromise=page.waitForEvent('download'); await clickExport(page,'.CSV');
  const csv=parseCSVRecords(await readFile(await (await csvPromise).path(),'utf8'));
  expect(csv.flat().map(value=>value.replace(/^[¥$]/,''))).toEqual(expect.arrayContaining(['1,235','2,000','3,235']));
  await page.getByTestId('field-Rate').dragTo(page.getByTestId('zone-values')); await ready(page);
  await page.getByLabel('切换聚合口径',{exact:true}).last().selectOption('avg'); await ready(page);
  await page.getByTestId('zone-values').getByRole('button',{name:'移除字段',exact:true}).first().click(); await ready(page);
  await page.getByRole('button',{name:'格式与数值',exact:true}).click();
  await page.getByLabel('Rate · 小数位数',{exact:true}).selectOption('2');
  await page.keyboard.press('Escape'); await ready(page);
  const rateDownload=page.waitForEvent('download'); await clickExport(page,'.XLSX');
  const rateBook=XLSX.read(await readFile(await (await rateDownload).path()));
  const rateRows=XLSX.utils.sheet_to_json(rateBook.Sheets[rateBook.SheetNames[0]],{header:1});
  expect(rateRows.at(-1).at(-1)).toBe(.1875);
});

test('review: rejected cross-zone move preserves source and configuration history',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/'); await upload(page,'Date,Amount\n2026-10-20,10\n2026-10-21,20');
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click(); await ready(page);
  for(const zone of ['rows','filters']) { await page.getByTestId('field-Date').dragTo(page.getByTestId(`zone-${zone}`)); await ready(page); await expect(page.getByTestId(`zone-${zone}`)).toContainText('Date'); }
  await page.getByTestId('zone-rows').locator('[draggable=true]').first().dragTo(page.getByTestId('zone-filters'),{sourcePosition:{x:8,y:10},targetPosition:{x:8,y:8}});
  await expect(page.locator('[role=status]').filter({hasText:'已存在于该区域'})).toBeVisible();
  await expect(page.getByTestId('zone-rows')).toContainText('Date');
  await expect(page.getByTestId('zone-filters').locator('[draggable=true]')).toHaveCount(1);
  await page.getByRole('button',{name:'撤销',exact:true}).click(); await ready(page);
  await expect(page.getByTestId('zone-rows')).toContainText('Date');
  await expect(page.getByTestId('zone-filters')).not.toContainText('Date');
});

test('review: saving recovers malformed local workspace storage across reload',async({page})=>{
  // Seed corruption before React's initial persistence effect can overwrite it.
  // The session marker keeps the later reload pointed at the newly saved view.
  await page.addInitScript(()=>{
    if (!sessionStorage.getItem('workspace_corruption_injected')) {
      localStorage.setItem('pivotstudio_workspaces_v1','{broken');
      sessionStorage.setItem('workspace_corruption_injected','1');
    }
  });
  await page.goto('/?demo=retail'); await ready(page);
  await expect(page.locator('[role=status]').filter({hasText:'本机视图无法读取'})).toBeVisible();
  await clickMoreItem(page,/工作区/);
  await page.getByPlaceholder('输入新工作区快照名称...').fill('Recovered');
  await page.getByRole('button',{name:'保存快照',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1'))[0]?.name)).toBe('Recovered');
  await page.reload(); await ready(page);
  await clickMoreItem(page,/工作区/);
  await expect(page.getByRole('dialog')).toContainText('Recovered');
});

test('review: non-A Excel used ranges preserve dates and adjacent numbers',async({page})=>{
  for(const start of [{r:1,c:1},{r:3,c:3}]) {
    const sheet={};
    const serial=Date.UTC(2026,9,20,8,26)/86400000+25569;
    XLSX.utils.sheet_add_aoa(sheet,[['Label','Date','Amount'],['East',serial,12.5]],{origin:start});
    sheet['!ref']=XLSX.utils.encode_range({s:start,e:{r:start.r+1,c:start.c+2}});
    sheet[XLSX.utils.encode_cell({r:start.r+1,c:start.c+1})].z='yyyy-mm-dd hh:mm';
    const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Offset');
    await page.goto('/');
    await upload(page,XLSX.write(book,{type:'buffer',bookType:'xlsx'}),'offset.xlsx');
    await expect(preview(page)).toBeVisible();
    await expect(preview(page).getByLabel('Date · 字段类型',{exact:true})).toHaveValue('date');
    await expect(preview(page).getByLabel('Amount · 字段类型',{exact:true})).toHaveValue('number');
    await expect(preview(page).locator('select[aria-label$=" · 字段类型"]')).toHaveCount(3);
    await expect(preview(page)).toContainText('2026-10-20T08:26:00.000');
    await expect(preview(page).getByRole('cell',{name:'12.5',exact:true})).toBeVisible();
  }
});
