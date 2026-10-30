import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {clickMoreItem,clickExport} from './_toolbar.js';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const preview=p=>p.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
async function upload(p,text){await p.locator('input[type=file]').first().setInputFiles({name:'measurements.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await expect(preview(p)).toBeVisible();}
async function confirm(p){await preview(p).getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(p);}
test.beforeEach(async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440]) {
 test(`contracts: complete slicer search, blank selection, scope and undo at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  const config={rows:[{id:'r',field:'Label'}],filters:[{id:'f',field:'Scope',selectedValues:['A']}],values:[{id:'v',field:'Reading',agg:'sum'}]};
  await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig:config})));
  const records=Array.from({length:24},(_,i)=>[`V${i+1},A,${i+1}`,`V${i+1},B,100`]).flat();
  await upload(page,'Label,Scope,Reading\n'+records.join('\n')+'\n,A,7');await confirm(page);
  const slicer=page.getByTestId('quick-slicer');
  await expect(slicer).toContainText('括号为源数据条数，不随筛选变化');
  await expect(slicer.getByRole('button',{name:'V1 (2)',exact:true})).toBeVisible();
  await expect(slicer.getByRole('button',{name:'查看全部 (25)',exact:true})).toBeVisible();
  // Merely opening/closing a draft filter must not create a configuration or undo step.
  await slicer.getByRole('button',{name:'查看全部 (25)',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'字段筛选',exact:true});
  await expect(dialog).toContainText('(25项)');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'撤销',exact:true})).toBeDisabled();
  await slicer.getByRole('button',{name:'查看全部 (25)',exact:true}).click();
  await dialog.getByRole('textbox').fill('V24');
  await dialog.getByRole('button',{name:'仅此项',exact:true}).click();await ready(page);
  await page.keyboard.press('Escape');
  await expect(slicer).toContainText('当前选择：V24');
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('24');
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('307');
  await slicer.getByRole('button',{name:'查看全部 (25)',exact:true}).click();
  await dialog.getByRole('textbox').fill('(空)');
  // Search uses raw values, so clear the query and choose the explicit empty option.
  await dialog.getByRole('textbox').fill('');
  await dialog.locator('div.group').filter({hasText:'(空)'}).getByRole('button',{name:'仅此项',exact:true}).click();
  await ready(page);await page.keyboard.press('Escape');
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('7');
  await page.screenshot({path:info.outputPath(`slicer-${width}.png`),fullPage:true});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test(`contracts: declared source units prevent silent relinking at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await upload(page,'Batch,Reading\nA,10\nB,20');
  await preview(page).getByText('字段单位（可选）',{exact:true}).click();
  await preview(page).getByRole('textbox',{name:'Reading · 源单位',exact:true}).fill('kg');
  await confirm(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30 kg');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await(await download).path()),{cellNF:true});const sheet=book.Sheets[book.SheetNames[0]];
  expect(XLSX.utils.sheet_to_json(sheet,{header:1,raw:true}).at(-1).at(-1)).toBe(30);
  expect(XLSX.utils.sheet_to_json(sheet,{header:1,raw:false}).at(-1).at(-1)).toBe('30 kg');
  await clickMoreItem(page,/工作区/);await page.getByPlaceholder('输入新工作区快照名称...').fill('Measured view');
  await page.getByRole('button',{name:'保存配置',exact:true}).click();await page.reload();
  await page.getByRole('button',{name:'恢复分析配置',exact:true}).click();await page.getByRole('button',{name:'载入',exact:true}).click();
  await page.getByTestId('workspace-link').getByRole('button',{name:'重新导入对应文件',exact:true}).click();
  await upload(page,'Batch,Reading\nC,15\nD,25');await preview(page).getByText('字段单位（可选）',{exact:true}).click();
  await preview(page).getByRole('textbox',{name:'Reading · 源单位',exact:true}).fill('g');await confirm(page);
  await expect(page.getByTestId('pending-view')).toContainText('单位不匹配');
  await expect(page.getByTestId('pending-view')).toContainText('配置要求 kg，源数据为 g');
  await page.screenshot({path:info.outputPath(`unit-mismatch-${width}.png`),fullPage:true});
  await upload(page,'Batch,Reading\nC,15\nD,25');await preview(page).getByText('字段单位（可选）',{exact:true}).click();
  await preview(page).getByRole('textbox',{name:'Reading · 源单位',exact:true}).fill('kg');await confirm(page);
  await expect(page.getByTestId('pending-view')).toHaveCount(0);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('40 kg');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 });
}
