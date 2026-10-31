import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {ensureMobileShelves} from './_mobileShelves.js';
import {clickExport} from './_toolbar.js';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const preview=p=>p.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
async function upload(p,text){await p.locator('input[type=file]').first().setInputFiles({name:'arbitrary-data.csv',mimeType:'text/csv',buffer:Buffer.from(text)});await expect(preview(p)).toBeVisible();}
async function confirm(p){await preview(p).getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(p);}
async function start(p,config){await p.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig:config,ct:'bar'})));}
const labels=p=>p.locator('#pivot-chart-container .recharts-label-list text');
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});});
for(const width of [360,768,1440]) {
 test(`integrity: average, distinct and fold share one aggregation contract at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await start(page,{rows:[{field:'Parent'},{field:'Child'}],columns:[{field:'Series'}],values:[{id:'x',field:'X',agg:'avg',format:{decimals:0}}]});
  await upload(page,'Parent,Child,Series,X\nP,A,S,10\nP,A,S,30\nP,B,S,30\nP,B,S,90');await confirm(page);await ensureMobileShelves(page,width);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('40');await expect(labels(page)).toHaveText(['40']);
  await page.locator('#pivot-main-html-table tbody').getByRole('button',{name:'−',exact:true}).first().click();await ready(page);
  await expect(labels(page)).toHaveText(['40']);await expect(page.getByTestId('aggregation-basis')).toContainText('Parent');
  await page.screenshot({path:info.outputPath(`fold-${width}.png`),fullPage:true});
  await page.locator('#pivot-main-html-table tbody').getByRole('button',{name:'+',exact:true}).first().click();await ready(page);
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('count_distinct');await ready(page);
  await expect(labels(page)).toHaveText(['3 笔']);await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('3 笔');
  await page.locator('#pivot-main-html-table tbody').getByRole('button',{name:'−',exact:true}).first().click();await ready(page);await expect(labels(page)).toHaveText(['3 笔']);
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');const book=XLSX.read(await readFile(await(await download).path()));
  expect(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true}).at(-1).at(-1)).toBe(3);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 });
 test(`integrity: long integers after inference sample retain identity and export at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await start(page,{rows:[{field:'Token'}],values:[{id:'n',field:'Token',agg:'count_distinct'}]});
  const tokens=[...Array.from({length:110},(_,i)=>String(i+1)),'9007199254740992','9007199254740993'];
  await upload(page,'Token,X\n'+tokens.map(t=>`${t},1`).join('\n'));
  await expect(preview(page)).toContainText('超出安全整数精度');
  await expect(preview(page).getByRole('combobox',{name:'Token · 字段类型',exact:true})).toHaveValue('text');
  await expect(preview(page).getByRole('combobox',{name:'Token · 字段类型',exact:true}).locator('option[value=number]')).toBeDisabled();
  await page.screenshot({path:info.outputPath(`precision-${width}.png`),fullPage:true});
  expect((await new AxeBuilder({page}).include('[role=dialog]').analyze()).violations).toEqual([]);
  await confirm(page);await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('112 笔');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');const book=XLSX.read(await readFile(await(await download).path()));
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(rows.map(r=>r[0])).toContain('9007199254740992');expect(rows.map(r=>r[0])).toContain('9007199254740993');
 });
 test(`integrity: filtered evidence and zero-denominator reasons are accessible at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await start(page,{rows:[{field:'G'}],filters:[{field:'G',selectedValues:['A']}],values:[{id:'x',field:'X',agg:'avg'},{id:'q',field:'Ratio',isCalculated:true,agg:'calc',formula:'SUM([X])/SUM([Y])'}]});
  await upload(page,'G,X,Y\nA,10,0\nA,bad,0\nA,,0\nB,0,2');
  await preview(page).getByRole('combobox',{name:'X · 字段类型',exact:true}).selectOption('number');await confirm(page);
  const evidence=page.getByTestId('sample-evidence');await page.getByTestId('total-reading').locator('summary').press('Enter');
  await expect(evidence).toContainText('记录总数 3 · 有效记录 1 · 空值排除 1 · 无效数值排除 1');
  await expect(page.locator('[data-value-status=zero_denominator]').first()).toHaveAttribute('aria-label',/分母为 0/);
  await page.locator('#pivot-main-html-table tbody [data-value-status=zero_denominator]').first().dblclick();
  await expect(page.getByTestId('cell-evidence')).toHaveText('分母为 0，无法计算');
  await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath(`evidence-${width}.png`),fullPage:true});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 });
}
test('integrity: Excel numeric precision limitation is explicit and text IDs stay exact',async({page})=>{
 await page.goto('/');const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Token','Numeric'],['9007199254740993',9007199254740992]]),'Precision');
 await page.locator('input[type=file]').first().setInputFiles({name:'precision.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
 await expect(preview(page)).toContainText('可能已在源文件中丢失精度，无法还原');
 await expect(preview(page).getByRole('combobox',{name:'Token · 字段类型',exact:true})).toHaveValue('text');
 await expect(preview(page)).toContainText('9007199254740993');
});
