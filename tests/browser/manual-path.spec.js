import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {ensureMobileShelves} from './_mobileShelves.js';
import {clickExport} from './_toolbar.js';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const csv='Region,Period,Revenue,Cost\nEast,Jan,100,60\nEast,Feb,200,100\nWest,Jan,300,210\nWest,Feb,400,300';
test.beforeEach(async ({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
async function start(page) {
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'explicit-manual-path.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
}
for (const width of [360,768,1440]) test(`manual: four shelves, filter, history and export by keyboard at ${width}`,async ({page},info)=>{
  await page.setViewportSize({width,height:900});await start(page);await ensureMobileShelves(page,width);
  for (const [label,field,destination,zone] of [
    ['+行','Region','行分组','rows'],['+列','Period','列比较','columns'],
    ['+值','Revenue','计算指标','values'],['+筛','Region','筛选','filters'],
  ]) {
    const button=page.getByRole('button',{name:`${label} · 添加「${field}」到${destination}`,exact:true});
    await button.press('Enter');await ready(page);
    await expect(page.getByTestId(`zone-${zone}`).getByTestId('configured-field')).toHaveCount(1);
  }
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,000');
  await page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true}).selectOption('avg');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('250');
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,000');
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).press('Enter');
  const filter=page.getByRole('dialog',{name:'字段筛选',exact:true});
  await filter.getByLabel('West',{exact:true}).uncheck();await page.keyboard.press('Escape');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('300');
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,000');
  await page.getByRole('button',{name:'重做',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('300');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await (await download).path()));
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(rows.at(-1).at(-1)).toBe(300);
  await page.screenshot({path:info.outputPath(`manual-config-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});

for (const width of [768,1280,1440]) test(`manual: editor follows actual pane width, including keyboard resizing at ${width}`,async ({page},info)=>{
  await page.setViewportSize({width,height:900});await start(page);
  if (width===1280) {
    await page.getByRole('separator',{name:'调节侧边栏宽度',exact:true}).press('End');
    await expect(page.getByRole('separator',{name:'调节侧边栏宽度',exact:true})).toHaveAttribute('aria-valuenow','680');
  }
  await page.getByRole('button',{name:/^指标中心/}).press('Enter');
  const center=page.getByTestId('metric-center');
  const field=center.getByLabel('自定义指标首项字段',{exact:true});
  await field.selectOption('Revenue');await field.press('Tab');
  await expect(center.getByLabel('首项聚合方式',{exact:true})).toBeFocused();
  expect(await field.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(120);
  expect(await center.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  const grid=await center.locator('.metric-metadata-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(grid).toBe(width===1440?12:1);
  await center.getByLabel('自定义指标名称',{exact:true}).fill('Revenue per record');
  await center.getByLabel('自定义指标次项字段',{exact:true}).selectOption('__COUNT__');
  await center.getByLabel('自定义指标数值格式',{exact:true}).selectOption('number');
  await expect(center.getByTestId('metric-live-preview')).toContainText('250.0');
  await center.getByTestId('metric-center-submit').press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('250.0');
  await page.screenshot({path:info.outputPath(`manual-editor-${width}.png`),fullPage:true});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
