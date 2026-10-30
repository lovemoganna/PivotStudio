import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import XLSX from 'xlsx';
import {readFile} from 'node:fs/promises';
import {clickMoreItem,clickExport} from './_toolbar.js';

const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const zones={rows:'行（纵向分组）',columns:'列（横向对比）',values:'值（要算的数）',filters:'筛选（限定范围）'};
const storageKey='pivotstudio_workspaces_v1';
async function upload(p,name,csv,only=false){
  await p.locator('input[type=file]').first().setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
  await p.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true}).getByRole('button',{name:only?'仅导入数据（清空当前透视）':'确认导入并自动构建推荐透视',exact:true}).click();await ready(p);
}
async function configMode(p,width){
  if(width>=768)await p.getByRole('button',{name:'配置',exact:true}).click();
  else{
    const cfg=p.getByRole('button',{name:/分析配置/});if(await cfg.getAttribute('aria-expanded')==='false')await cfg.click();
    const fields=p.getByRole('button',{name:/字段列表/});if(await fields.getAttribute('aria-expanded')==='true')await fields.click();
  }
}
async function add(p,z,field,agg){
  await p.getByRole('button',{name:`+字段 · 添加字段到${zones[z]}`,exact:true}).press('Enter');
  const dialog=p.getByRole('dialog',{name:`添加字段到${zones[z]}`,exact:true});
  await dialog.getByRole('searchbox').fill(field);
  if(agg)await dialog.getByLabel(`${field} · 添加前计算方式`,{exact:true}).selectOption(agg);
  await dialog.getByTestId('field-picker-option').filter({has:p.getByText(field,{exact:true})}).press('Enter');await ready(p);
}
async function totals(p,average){
  await expect(p.locator('#pivot-main-html-table tfoot td').nth(5)).toHaveText(String(average));
  await expect(p.locator('#pivot-main-html-table tfoot td').nth(6)).toHaveText('1 笔');
}
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

test('reopen: cancelling pending recovery keeps the saved view without silently applying it later',async({page},info)=>{
  await page.goto('/');await upload(page,'cancel-source.csv','Batch,Reading\nA,10\nB,20',true);
  await configMode(page,1440);await add(page,'values','Reading','avg');
  await clickMoreItem(page,/工作区/);await page.getByPlaceholder('输入新工作区快照名称...').fill('Optional recovery');
  await page.getByRole('button',{name:'保存配置',exact:true}).click();await page.reload();
  await page.getByRole('button',{name:'恢复分析配置',exact:true}).click();await page.getByRole('button',{name:'载入',exact:true}).click();
  await page.getByTestId('workspace-link').getByRole('button',{name:'重新导入对应文件',exact:true}).click();
  await upload(page,'cancel-wrong.csv','Batch,Reading\nA,broken\nB,unknown');
  await expect(page.getByTestId('pending-view')).toContainText('不匹配：Reading');
  await page.getByTestId('pending-view').getByRole('button',{name:'取消恢复',exact:true}).press('Enter');
  await expect(page.getByTestId('pending-view')).toHaveCount(0);
  await upload(page,'cancel-correct.csv','Batch,Reading\nC,100\nD,200');
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('300');
  await expect(page.getByLabel('切换聚合口径',{exact:true})).toHaveValue('sum');
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  expect(saved).toHaveLength(1);expect(saved[0].pivotConfig.values[0].agg).toBe('avg');
  await page.screenshot({path:info.outputPath('cancelled-recovery.png'),fullPage:true});
});
for(const width of [360,768,1440])test(`reopen: manual view, reload, mismatch recovery, explicit relink and export at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await upload(page,'original.csv','Cohort,Phase,Reading,RecordKey\nA,P1,10,SOURCE_A_PRIVATE_ROW\nA,P1,20,SOURCE_A_PRIVATE_ROW\nA,P2,0,\nB,P1,100,SOURCE_B_PRIVATE_ROW',true);
  await configMode(page,width);
  await add(page,'rows','Cohort');await add(page,'columns','Phase');await add(page,'values','Reading','avg');
  await add(page,'values','RecordKey','count_distinct');await add(page,'filters','Cohort');
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('dialog',{name:'字段筛选',exact:true}).getByLabel('B',{exact:true}).uncheck();await page.keyboard.press('Escape');await ready(page);
  await totals(page,10);
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('line');await ready(page);
  await clickMoreItem(page,/工作区/);
  await expect(page.getByText('仅保存分析配置，不含原始数据。关闭或刷新页面后，导入数据需要重新选择文件；请保留源文件。',{exact:true})).toBeVisible();
  await page.getByPlaceholder('输入新工作区快照名称...').fill('Reusable arbitrary analysis');
  await page.getByRole('button',{name:'保存配置',exact:true}).press('Enter');
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]').length,storageKey)).toBe(1);
  const snapshot=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],storageKey);
  expect(snapshot.pivotConfig.values.map(v=>v.agg)).toEqual(['avg','count_distinct']);
  expect(snapshot.pivotConfig.filters[0].selectedValues).toEqual(['A']);
  expect(snapshot.chartType).toBe('line');expect(snapshot).not.toHaveProperty('rows');
  const serialized=JSON.stringify(snapshot);expect(serialized).not.toContain('SOURCE_A_PRIVATE_ROW');expect(serialized).not.toContain('SOURCE_B_PRIVATE_ROW');
  await page.screenshot({path:info.outputPath(`01-saved-${width}.png`)});
  await page.reload();
  await expect(page.locator('#pivot-main-html-table')).toHaveCount(0);
  await page.getByRole('button',{name:'恢复分析配置',exact:true}).press('Enter');
  await page.getByRole('button',{name:'载入',exact:true}).press('Enter');
  const linking=page.getByTestId('workspace-link');await expect(linking).toContainText('尚未恢复配置');
  await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toBeDisabled();
  await page.screenshot({path:info.outputPath(`02-needs-source-${width}.png`)});
  expect((await new AxeBuilder({page}).include('[role=dialog]').analyze()).violations).toEqual([]);
  await linking.getByRole('button',{name:'重新导入对应文件',exact:true}).press('Enter');
  await expect(page.getByTestId('pending-view')).toContainText('等待关联');
  await upload(page,'missing.csv','Cohort,Phase,Reading\nA,P1,2\nB,P2,4');
  await expect(page.getByTestId('pending-view')).toContainText('缺少字段：RecordKey');
  await upload(page,'wrong-type.csv','Cohort,Phase,Reading,RecordKey\nA,P1,broken,K1\nB,P2,unknown,K2');
  await expect(page.getByTestId('pending-view')).toContainText('类型或数值尺度不匹配：Reading');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],storageKey)).toEqual(snapshot);
  await page.screenshot({path:info.outputPath(`03-type-mismatch-${width}.png`),fullPage:true});
  // Reordered columns, extra field and new values must not reuse stale source data.
  await upload(page,'updated.csv','Reading,RecordKey,Cohort,Phase,Extra\n30,NEW_A,A,P1,x\n90,NEW_A,A,P1,x\n0,,A,P2,x\n500,NEW_B,B,P1,x');
  await expect(page.getByTestId('pending-view')).toHaveCount(0);await totals(page,40);
  await expect(page.getByLabel('选择图表类型',{exact:true})).toHaveValue('line');
  await configMode(page,width);
  for(const [zone,n]of [['rows',1],['columns',1],['values',2],['filters',1]])await expect(page.getByTestId(`zone-${zone}`).getByTestId('configured-field')).toHaveCount(n);
  const aggregates=page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true});
  await expect(aggregates.nth(0)).toHaveValue('avg');await expect(aggregates.nth(1)).toHaveValue('count_distinct');
  const pendingDownload=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const download=await pendingDownload;await download.saveAs(info.outputPath('restored-filtered.xlsx'));
  const book=XLSX.read(await readFile(await download.path()));
  const exported=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(exported.at(-1).slice(-2)).toEqual([40,1]);expect(exported.flat()).not.toContain('B');
  await clickMoreItem(page,/工作区/);await page.getByRole('button',{name:'载入',exact:true}).click();
  await linking.getByRole('combobox').selectOption({label:'wrong-type.csv (2行)'});
  await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toBeDisabled();
  await linking.getByRole('button',{name:'取消关联',exact:true}).press('Enter');
  await page.keyboard.press('Escape');await totals(page,40);
  await clickMoreItem(page,/工作区/);await page.getByRole('button',{name:'载入',exact:true}).click();
  await linking.getByRole('combobox').selectOption({label:'updated.csv (4行)'});
  await expect(linking.getByRole('button',{name:'确认关联并恢复',exact:true})).toBeEnabled();
  await linking.getByRole('button',{name:'确认关联并恢复',exact:true}).press('Enter');await ready(page);await totals(page,40);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`04-restored-${width}.png`),fullPage:true});
  await info.attach('snapshot-metadata.json',{body:JSON.stringify(snapshot,null,2),contentType:'application/json'});
  await info.attach('export-values.json',{body:JSON.stringify(exported),contentType:'application/json'});
});
