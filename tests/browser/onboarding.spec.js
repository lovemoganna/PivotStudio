import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {clickExport} from './_toolbar.js';
import {ensureMobileShelves} from './_mobileShelves.js';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const upload=async(page,csv,recommend=false,percentField)=>{
  await page.locator('input[type=file]').first().setInputFiles({name:'explicit-synthetic-learning.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  if(percentField)await page.getByLabel(`${percentField} · 数值尺度`,{exact:true}).selectOption('fraction');
  await page.getByRole('button',{name:recommend?'确认导入并自动构建推荐透视':'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
};
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for(const width of [360,768,1280,1440])test(`learning: first analysis, grouped counts, keyboard help and undo at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await upload(page,'区域,客户\n华东,甲\n华东,乙\n华南,丙');
  await expect(page.getByTestId('analysis-start')).toContainText('还没有数值指标');
  await page.getByRole('button',{name:'统计记录数',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('3 笔');
  await ensureMobileShelves(page,width);
  const file=page.getByLabel('上传 CSV / Excel',{exact:true});await file.focus();await expect(file).toBeFocused();
  await page.getByRole('button',{name:'+行 · 添加「区域」到行分组',exact:true}).press('Enter');await ready(page);
  await expect(page.getByTestId('pivot-value-cell').first()).toHaveText('2 笔');
  await expect(page.getByTestId('zone-values')).toContainText('记录数');
  await expect(page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true})).toBeDisabled();
  await expect(page.getByTestId('zone-values')).not.toContainText('__COUNT__');
  await expect(page.getByTestId('analysis-reading')).toBeVisible();
  await expect(page.getByTestId('analysis-reading')).toContainText('区域');
  await expect(page.getByTestId('result-reading')).toBeVisible();
  await expect(page.getByTestId('result-reading')).toContainText('区域');
  await expect(page.getByTestId('result-reading')).toContainText('记录数');
  const help=page.getByText('如何选择行、列和值？',{exact:true});await help.press('Enter');
  await expect(page.getByText(/平均值为记录的算术平均/)).toBeVisible();
  await page.screenshot({path:info.outputPath(`guided-count-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  await expect(page.getByTestId('zone-rows').getByTestId('configured-field')).toHaveCount(0);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('3 笔');
});

test('learning: overall rate is calculated from records, not by adding group averages',async({page})=>{
  await page.goto('/');await upload(page,'区域,转化率\n华东,0.1\n华东,0.3\n华南,0.5',true,'转化率');
  await expect(page.getByTestId('pivot-value-cell').first()).toHaveText('20.0%');
  await expect(page.getByTestId('pivot-value-cell').nth(1)).toHaveText('50.0%');
  await page.mouse.move(0,0);
  await expect(page.getByTestId('overall-summary')).toContainText('30.0%');
  await expect(page.getByTestId('overall-summary')).not.toContainText('70.0%');
  await page.getByTestId('pivot-value-cell').first().hover();
  await expect(page.getByRole('contentinfo')).not.toContainText('占总计');
  await page.mouse.move(0,0);
  await page.getByRole('button',{name:'仅图表',exact:true}).click();
  await expect(page.getByTestId('overall-summary')).toContainText('30.0%');
  await expect(page.getByTestId('result-reading')).toBeVisible();
  await expect(page.getByTestId('result-reading')).toContainText('区域');
  await expect(page.getByTestId('result-reading')).toContainText('转化率');
});

test('learning: manual rate is averaged, count has no percent and undo restores the rate',async({page})=>{
  await page.goto('/');await upload(page,'区域,转化率\n华东,0.1\n华东,0.3\n华南,0.5',false,'转化率');
  await page.getByRole('button',{name:'+值 · 添加「转化率」到计算指标',exact:true}).click();await ready(page);
  await expect(page.getByLabel('切换聚合口径',{exact:true})).toHaveValue('avg');
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0%');
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('count');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('3 笔');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await (await download).path()),{cellNF:true});
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:false});
  expect(rows[0][1]).not.toContain('[%]');expect(rows.at(-1)[1]).toBe('3 笔');
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0%');
});

test('learning: adding a count preserves existing filters',async({page})=>{
  const view={fullConfig:{rows:[{id:'r',field:'区域'}],columns:[],values:[],filters:[{id:'f',field:'区域',selectedValues:['华东']} ]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(view)));
  await upload(page,'区域,客户\n华东,甲\n华东,乙\n华南,丙',true);
  await page.getByRole('button',{name:'统计记录数',exact:true}).click();await ready(page);
  await expect(page.getByTestId('pivot-value-cell').last()).toHaveText('2 笔');
  await expect(page.getByTestId('zone-filters')).toContainText('1项');
  await expect(page.locator('#pivot-main-html-table')).not.toContainText('华南');
});

test('learning: small record counts have distinct integer chart ticks',async({page})=>{
  await page.goto('/');await upload(page,'区域,客户\n华东,甲\n华东,乙\n华南,丙',true);
  for(const kind of ['bar','line','area','stacked_area','stacked_bar','horizontal_bar','combo','waterfall']){
    await page.getByLabel('选择图表类型',{exact:true}).selectOption(kind);await ready(page);
    const axis=page.locator('#pivot-chart-container '+(kind==='horizontal_bar'?'.recharts-xAxis':'.recharts-yAxis')).first();
    await expect(axis.locator('.recharts-cartesian-axis-tick-value').first()).toBeVisible();
    const labels=await axis.locator('.recharts-cartesian-axis-tick-value').allTextContents();
    expect(labels.length).toBeGreaterThan(1);expect(new Set(labels).size).toBe(labels.length);
    for(const label of labels)expect(label).toMatch(/^-?\d+ 笔$/);
  }
});
