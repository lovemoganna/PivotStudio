import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import XLSX from 'xlsx';
import {readFile} from 'node:fs/promises';
import {clickExport} from './_toolbar.js';

const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const names={rows:'行（纵向分组）',values:'值（要算的数）',filters:'筛选（限定范围）'};
const opener=(p,z)=>p.getByRole('button',{name:`+字段 · 添加字段到${names[z]}`,exact:true});
async function add(p,zone,field,agg){
  await opener(p,zone).press('Enter');
  const dialog=p.getByRole('dialog',{name:`添加字段到${names[zone]}`,exact:true});
  const search=dialog.getByRole('searchbox',{name:'搜索要添加的字段',exact:true});
  await expect(search).toBeFocused();await search.fill(field);
  if(agg)await dialog.getByLabel(`${field} · 添加前计算方式`,{exact:true}).selectOption(agg);
  await dialog.getByTestId('field-picker-option').filter({has:p.getByText(field,{exact:true})}).press('Enter');
  await expect(dialog).toHaveCount(0);await ready(p);
}
const totals=p=>p.locator('#pivot-main-html-table tfoot td:not(:first-child)');
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440])test(`count tasks: manual selection, missing/duplicate/zero, filter, history and XLSX at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'count-contract.csv',mimeType:'text/csv',buffer:Buffer.from('Cohort,Token\nA,X\nA,X\nA,\nA,0\nB,X\nB,Y\nB,\nB,"   "')});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  if(width>=768)await page.getByRole('button',{name:'配置',exact:true}).click();
  else{
    const config=page.getByRole('button',{name:/分析配置/});if(await config.getAttribute('aria-expanded')==='false')await config.click();
    const fields=page.getByRole('button',{name:/字段列表/});if(await fields.getAttribute('aria-expanded')==='true')await fields.click();
  }
  await add(page,'rows','Cohort');await add(page,'values','记录数');
  await add(page,'values','Token','count');await add(page,'values','Token','count_distinct');
  await expect(totals(page)).toHaveText(['8 笔','5 笔','3 笔']);
  const body=page.locator('#pivot-main-html-table tbody tr');
  await expect(body.filter({has:page.getByText('A',{exact:true})}).locator('td:not(:first-child)')).toHaveText(['4 笔','3 笔','2 笔']);
  await expect(body.filter({has:page.getByText('B',{exact:true})}).locator('td:not(:first-child)')).toHaveText(['4 笔','2 笔','2 笔']);
  const reading=page.getByTestId('total-reading');await reading.locator('summary').press('Enter');
  await expect(reading).toContainText('包括字段为空的记录');
  await expect(reading).toContainText('包括非空文本');
  await expect(reading).toContainText('重复值只计一次');
  await add(page,'filters','Cohort');
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('dialog',{name:'字段筛选',exact:true}).getByLabel('B',{exact:true}).uncheck();await page.keyboard.press('Escape');await ready(page);
  await expect(totals(page)).toHaveText(['4 笔','3 笔','2 笔']);
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(totals(page)).toHaveText(['8 笔','5 笔','3 笔']);
  await page.getByRole('button',{name:'重做',exact:true}).press('Enter');await ready(page);
  await expect(totals(page)).toHaveText(['4 笔','3 笔','2 笔']);
  const pending=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const download=await pending;await download.saveAs(info.outputPath('filtered-counts.xlsx'));
  const book=XLSX.read(await readFile(await download.path()));
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(rows.at(-1).slice(-3)).toEqual([4,3,2]);
  expect(rows.flat().map(String)).not.toContain('B');
  const aggregates=page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true});
  await expect(aggregates.nth(0)).toBeDisabled();
  await aggregates.nth(1).selectOption('count_distinct');await ready(page);
  await expect(totals(page)).toHaveText(['4 笔','2 笔','2 笔']);
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(totals(page)).toHaveText(['4 笔','3 笔','2 笔']);
  await expect(page.locator('#pivot-chart-container .recharts-label-list text')).toHaveText(['4 笔','3 笔','2 笔']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`count-task-${width}.png`),fullPage:true});
  await info.attach('exported-counts.json',{body:JSON.stringify(rows),contentType:'application/json'});
});
