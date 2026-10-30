import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {clickMoreItem,clickExport} from './_toolbar.js';
import {ensureMobileShelves} from './_mobileShelves.js';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const preview=page=>page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
async function upload(page,text,name='measurements.csv') {
 await page.locator('input[type=file]').first().setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(text)});
 await expect(preview(page)).toBeVisible();
}
async function confirm(page){await preview(page).getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);}
test.beforeEach(async({page})=>{
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440]) {
 test(`trust: explicit scales, undo and numeric Excel export at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  await upload(page,'Cohort,SuccessRate\nA,20\nB,40');
  const scale=preview(page).getByRole('combobox',{name:'SuccessRate · 数值尺度',exact:true});
  await expect(scale).toHaveValue('none');await scale.selectOption('whole');
  await expect(preview(page).getByTestId('percent-preview')).toHaveText('示例：20 → 20.00%');
  expect((await new AxeBuilder({page}).include('[role=dialog]').analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`scale-${width}.png`)});
  await confirm(page);await ensureMobileShelves(page,width);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0%');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await(await download).path()),{cellNF:true});const sheet=book.Sheets[book.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true});expect(rows.at(-1).at(-1)).toBeCloseTo(.3);
  const formatted=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false});expect(formatted.at(-1).at(-1)).toBe('30.0%');
  await page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true}).selectOption('sum');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('60.0%');
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0%');
 });
 test(`trust: time basis, gap and invalid category feedback at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  const view={fullConfig:{rows:[{field:'Timestamp',dateGranularity:'month'}],values:[{id:'v',field:'Load',agg:'sum'}]},vm:'chart',ct:'line',csc:{lineDerivedMetric:'mom_pct'}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(view)));
  await upload(page,'Timestamp,Load\n2026-04-02,20\n2026-01-04,10\n2026-02-08,15');await confirm(page);
  await expect(page.getByTestId('temporal-basis')).toContainText('当前存在缺期');
  await expect(page.getByTestId('pending-view')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`time-${width}.png`)});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  const other={...view,fullConfig:{rows:[{field:'Cohort'}],values:[{id:'v',field:'Load',agg:'sum'}]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(other)));
  await upload(page,'Cohort,Load\nA,10\nB,20');await confirm(page);
  await expect(page.getByTestId('derived-guidance')).toContainText('单一日期维度');
  await expect(page.getByTestId('temporal-basis')).toHaveCount(0);
 });
}
test('trust: saved configuration survives reload, rejects incompatible source and explicitly links compatible data',async({page},info)=>{
 await page.goto('/');await upload(page,'Team,Load\nA,10\nB,20','capacity.csv');await confirm(page);
 await clickMoreItem(page,/工作区/);await page.getByPlaceholder('输入新工作区快照名称...').fill('Capacity view');
 await page.getByRole('button',{name:'保存配置',exact:true}).click();
 await expect(page.getByText('仅保存分析配置，不含原始数据。关闭或刷新页面后，导入数据需要重新选择文件；请保留源文件。')).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'恢复分析配置',exact:true}).click();await page.getByRole('button',{name:'载入',exact:true}).click();
 await expect(page.getByTestId('workspace-link')).toContainText('尚未恢复配置');
 await page.getByRole('button',{name:'重新导入对应文件',exact:true}).click();
 await expect(page.getByTestId('pending-view')).toContainText('等待关联');
 await upload(page,'Team,Load\nA,broken\nB,unknown','wrong.csv');await confirm(page);
 await expect(page.getByTestId('pending-view')).toContainText('不匹配：Load');
 await upload(page,'Team,Load,Extra\nC,25,ok\nD,35,ok','capacity-updated.csv');await confirm(page);
 await expect(page.getByTestId('pending-view')).toHaveCount(0);
 await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('60');
 await clickMoreItem(page,/工作区/);await page.getByRole('button',{name:'载入',exact:true}).click();
 const linking=page.getByTestId('workspace-link');await linking.getByRole('combobox').selectOption({label:'wrong.csv (2行)'});
 await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toBeDisabled();
 await linking.getByRole('combobox').selectOption({label:'capacity-updated.csv (2行)'});
 await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toBeEnabled();
 await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toHaveCSS('opacity','1');
 expect((await new AxeBuilder({page}).include('[role=dialog]').analyze()).violations).toEqual([]);
 await page.screenshot({path:info.outputPath('link.png')});
 await linking.getByRole('button',{name:'确认关联并恢复',exact:true}).click();await ready(page);
 await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('60');
});
test('trust: Excel percentage metadata uses fractions; unknown CSV magnitude stays unchanged',async({page})=>{
 await page.goto('/');
 const book=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet([['Group','Ratio'],['A',.2],['B',.4]]);
 sheet.B2.z='0.0%';sheet.B3.z='0.0%';XLSX.utils.book_append_sheet(book,sheet,'Metrics');
 await page.locator('input[type=file]').first().setInputFiles({name:'metrics.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
 await expect(preview(page).getByRole('combobox',{name:'Ratio · 数值尺度',exact:true})).toHaveValue('fraction');
 await confirm(page);await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0%');
 await upload(page,'Group,Ratio\nA,20\nB,40');await confirm(page);
 await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('30.0');
});
