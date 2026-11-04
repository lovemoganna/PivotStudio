import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
import AxeBuilder from '@axe-core/playwright';
import {ensureMobileShelves} from './_mobileShelves.js';
import {encodeView} from '../../src/utils/viewConfig.js';

const headers=['Group','Period','Reading','RecordId'];
const rows=n=>Array.from({length:n},(_,i)=>[i%2?'B':'A',i%3?'P2':'P1',i+1,String(9000000000000000000n+BigInt(i))]);
const csv=(n,order=headers)=>[order,...rows(n).map(row=>order.map(field=>row[headers.indexOf(field)]))].map(row=>row.join(',')).join('\n');
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const workspace=p=>p.getByRole('dialog',{name:'本机工作区与配置分享',exact:true});
const file=(name,text)=>({name,mimeType:'text/csv',buffer:Buffer.from(text)});
async function upload(p,text,name='readings.csv') {
  await p.locator('input[type=file]').first().setInputFiles(file(name,text));
  await expect(p.getByRole('dialog',{name:'文件数据预览与类型校准'})).toBeVisible();
}
test.beforeEach(async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
});

for(const width of [360,768,1440])test(`analysis file: manually configure 100, save/reopen, reuse 1000 and reject mismatch at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1100});await page.goto('/');
  await upload(page,csv(100));
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  await expect(page.getByRole('button',{name:'复制完整透视表',exact:true})).toBeDisabled();
  expect((await new AxeBuilder({page}).include('[aria-label="复制完整透视表"]').analyze()).violations).toEqual([]);
  await ensureMobileShelves(page,width);
  for(const name of ['+行 · 添加「Group」到行分组','+列 · 添加「Period」到列比较','+值 · 添加「Reading」到计算指标']) {
    await page.getByRole('button',{name,exact:true}).press('Enter');await ready(page);
  }
  await page.getByRole('button',{name:'+字段 · 添加字段到筛选（限定范围）',exact:true}).click();
  await page.getByRole('dialog',{name:'添加字段到筛选（限定范围）',exact:true}).getByTestId('field-picker-option').filter({hasText:'Group'}).click();await ready(page);
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('dialog',{name:'字段筛选',exact:true}).getByLabel('B',{exact:true}).uncheck();await page.keyboard.press('Escape');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('2,500');
  await page.getByRole('button',{name:'保存与复用',exact:true}).click();
  const dl=page.waitForEvent('download');await workspace(page).getByRole('button',{name:'保存分析文件',exact:true}).click();
  const download=await dl,buffer=await readFile(await download.path()),saved=JSON.parse(buffer.toString());
  expect(saved.dataset.rows).toHaveLength(100);
  expect(saved.view.fullConfig.rows.map(x=>x.field)).toEqual(['Group']);
  expect(saved.view.fullConfig.columns.map(x=>x.field)).toEqual(['Period']);
  expect(saved.view.fullConfig.filters[0].selectedValues).toEqual(['A']);
  expect(saved.view.fullConfig.values[0].agg).toBe('sum');
  await page.getByRole('button',{name:'关闭本机工作区与配置分享',exact:true}).click();
  // Saving enables reuse on the normal upload path, without a second configuration step.
  await upload(page,csv(1000,[...headers].reverse()),'larger.csv');
  await expect(page.getByTestId('reuse-compatibility')).toContainText('字段匹配');
  await page.getByRole('button',{name:'使用原配置导入数据',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('250,000');
  await expect(page.getByTestId('dataset-telemetry')).toContainText('500 / 1,000 行');
  for(const [zone,field] of [['rows','Group'],['columns','Period'],['values','Reading'],['filters','Group']])await expect(page.getByTestId('zone-'+zone)).toContainText(field);
  await upload(page,'Group,Period,Wrong,RecordId\nA,P1,1,id','wrong.csv');
  await expect(page.getByTestId('reuse-compatibility')).toContainText('缺少字段：Reading');
  await expect(page.getByRole('button',{name:'使用原配置导入数据',exact:true})).toBeDisabled();
  await page.screenshot({animations:'disabled',path:info.outputPath(`field-mismatch-${width}.png`)});
  await page.getByRole('button',{name:'关闭文件预览',exact:true}).click();
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('250,000');
  await upload(page,'Group,Period,Reading,RecordId\nA,P1,not-a-number,id','changed-type.csv');
  await expect(page.getByTestId('reuse-compatibility')).toContainText('类型或数值尺度不匹配：Reading');
  await expect(page.getByRole('button',{name:'使用原配置导入数据',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'关闭文件预览',exact:true}).click();
  // A fresh page has no loaded data; the saved file restores both data and configuration.
  await page.reload();await page.getByRole('button',{name:'保存与复用',exact:true}).click();
  await workspace(page).getByLabel('选择分析文件',{exact:true}).setInputFiles({name:'saved.pivotstudio.json',mimeType:'application/json',buffer});await ready(page);
  await expect(workspace(page)).toHaveCount(0);
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('2,500');
  await page.getByRole('button',{name:'保存与复用',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await workspace(page).getByRole('button',{name:'用新数据复用当前配置',exact:true}).click();
  await(await chooser).setFiles(file('new.csv',csv(1000)));
  await page.getByRole('button',{name:'使用原配置导入数据',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('250,000');
  await page.getByRole('button',{name:'保存与复用',exact:true}).click();
  await page.screenshot({animations:'disabled',path:info.outputPath(`analysis-ready-${width}.png`)});
  await workspace(page).getByLabel('选择分析文件',{exact:true}).setInputFiles(file('broken.json','{bad'));
  await expect(workspace(page).getByRole('alert')).toContainText('JSON');
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('250,000');
  const axe=await new AxeBuilder({page}).include('[role=dialog]').analyze();expect(axe.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({animations:'disabled',path:info.outputPath(`analysis-file-${width}.png`)});
});

test('copy: native clipboard write includes all virtualized rows and numeric Excel-compatible values',async({page,browserName},info)=>{
  test.skip(browserName!=='chromium','The native clipboard is denied by this WebKit runner. Its recovery path is tested separately; successful native copy requires verification in a permitted WebKit environment.');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  const config={rows:[{field:'RecordId'}],columns:[],values:[{id:'v',field:'Reading',agg:'sum',format:{decimals:2,unit:'ms'}}]};
  await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig:config})));
  await upload(page,csv(240));await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
  await page.getByRole('button',{name:'复制完整透视表',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'已复制完整透视表'})).toBeVisible();
  const clipboard=await page.evaluate(async()=>{
    const items=await navigator.clipboard.read(),result={};
    for(const item of items)for(const type of item.types)result[type]=await(await item.getType(type)).text();
    return result;
  });
  expect(clipboard['text/plain'].split('\r\n')).toHaveLength(242);
  expect(clipboard['text/plain']).toContain('9000000000000000239');
  const book=XLSX.read(clipboard['text/html'],{type:'string'}),sheet=book.Sheets[book.SheetNames[0]];
  expect(sheet.A2.v).toBe('9000000000000000000');expect(sheet.A2.t).toBe('s');
  expect(sheet.B242.v).toBe(28920);expect(sheet.B242.t).toBe('n');
  await info.attach('clipboard.html',{body:clipboard['text/html'],contentType:'text/html'});
  await page.screenshot({animations:'disabled',path:info.outputPath('copy-complete.png')});
});

test('copy: denied native clipboard gives recovery feedback without changing results',async({page,browserName})=>{
  test.skip(browserName!=='webkit','This check uses the actual denied native clipboard in the WebKit runner.');
  await page.goto('/');await upload(page,csv(100));
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
  const before=await page.locator('#pivot-main-html-table tfoot').innerText();
  await page.getByRole('button',{name:'复制完整透视表',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'复制失败'})).toContainText('可使用导出 Excel');
  await expect(page.locator('#pivot-main-html-table tfoot')).toHaveText(before,{useInnerText:true});
});
