import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {encodeView} from '../../src/utils/viewConfig.js';
import {clickExport} from './_toolbar.js';
import {ensureMobileShelves} from './_mobileShelves.js';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const preview=page=>page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
const upload=async(page,csv)=>{await page.locator('input[type=file]').first().setInputFiles({name:'explicit-synthetic-deep-audit.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await expect(preview(page)).toBeVisible();};
const confirm=async(page,auto=true)=>{await preview(page).getByRole('button',{name:auto?'确认导入并自动构建推荐透视':'仅导入数据（清空当前透视）',exact:true}).click();await expect(preview(page)).toHaveCount(0);await ready(page);};
const drill=page=>page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for(const width of [360,768,1280,1440])test(`deep: import, inspect unfamiliar field, construct, interpret and recover at ${width}`,async({page},info)=>{
  const field='Amount_with_a_long_business_field_name_that_must_remain_readable';
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await upload(page,`Region,${field}\nZero,0\nMissing,\nInvalid,error`);
  await preview(page).getByLabel(`${field} · 字段类型`,{exact:true}).selectOption('number');
  await page.screenshot({path:info.outputPath('01-import.png')});await confirm(page,false);
  await ensureMobileShelves(page,width);
  await page.getByRole('button',{name:`${field} · 查看字段分布`,exact:true}).press('Enter');
  const profile=page.getByRole('dialog',{name:'字段健康度与分布透视',exact:true});
  await expect(profile.getByTestId('numeric-quality')).toContainText('有效数值：1');
  await expect(profile.getByTestId('numeric-quality')).toContainText('无法作为数值：1');
  await expect(profile).toContainText('error');
  expect(await profile.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  const axeProfile=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axeProfile.violations).toEqual([]);
  await page.screenshot({path:info.outputPath('02-understand-field.png')});
  await profile.getByRole('button',{name:'+ 值指标',exact:true}).press('Enter');await ready(page);
  await page.getByRole('button',{name:'添加「Region」到行分组',exact:true}).click();await ready(page);
  await expect(page.getByTestId('pivot-value-cell')).toHaveText(['0','-','-']);
  const visibleValue=await page.getByTestId('pivot-value-cell').first().locator('span').last().boundingBox();
  const viewport=await page.getByRole('region',{name:'透视表结果，可横向滚动',exact:true}).boundingBox();
  expect(visibleValue.x+visibleValue.width/2).toBeLessThan(viewport.x+viewport.width);
  await expect(page.getByTestId('calculation-basis')).toHaveCount(0);
  await page.mouse.move(0,0);await expect(page.getByTestId('overall-summary')).toContainText('0');
  await page.screenshot({path:info.outputPath('03-analysis-basis.png'),fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.getByTestId('pivot-value-cell').nth(2).press('Enter');await expect(drill(page)).toContainText('error');
  expect(await drill(page).evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:info.outputPath('04-source-explanation.png')});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Missing (1)',exact:true}).click();await ready(page);await page.mouse.move(0,0);
  await expect(page.getByTestId('overall-summary')).toContainText('-');
  await expect(page.getByText('当前没有可展示的有效数值。请检查筛选条件、字段类型和计算依据。',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'全部 (All)',exact:true}).click();await ready(page);
  await expect(page.getByTestId('pivot-value-cell')).toHaveText(['0','-','-']);
  const xlsxPromise=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await(await xlsxPromise).path()),{cellNF:true});
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:false});
  expect(rows.slice(1,-1).map(r=>r[1])).toEqual(['0','-','-']);
});

test('deep: histogram uses all filtered records and drilldown is complete beyond 50 rows',async({page})=>{
  await page.goto('/');await upload(page,'Group,Value\n'+Array.from({length:240},(_,i)=>`${i<120?'A':'B'},1`).join('\n'));await confirm(page);
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('histogram');await ready(page);
  await expect(page.getByTestId('histogram-basis')).toContainText('有效样本：240/240');
  await expect(page.locator('#pivot-chart-container .recharts-label-list')).toContainText('240笔');
  await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
  await expect(drill(page)).toContainText('240 条记录)');
  await expect(drill(page).getByRole('button',{name:'下一页',exact:true})).toBeEnabled();
  await drill(page).getByRole('button',{name:'下一页',exact:true}).click();await expect(drill(page)).toContainText('51 – 100');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'B (120)',exact:true}).click();await ready(page);
  await expect(page.getByTestId('histogram-basis')).toContainText('有效样本：120/120');
  await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();await expect(drill(page)).toContainText('120 条记录)');
});

test('deep: escaped hierarchy values retain distinct totals, exports and source drilldown',async({page})=>{
  const view={fullConfig:{rows:[{id:'r1',field:'Group'},{id:'r2',field:'Detail'}],columns:[],values:[{id:'v',field:'Amount',agg:'sum'}],filters:[]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(view)));await upload(page,'Group,Detail,Amount\nA||B,C,10\nA,B||C,20\n__GRAND_TOTAL_ROW__,__SUBTOTAL__,5');await confirm(page);
  await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10','20','5']);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('35');
  await page.getByTestId('pivot-value-cell').first().press('Enter');await expect(drill(page)).toContainText('1 条记录)');await expect(drill(page)).toContainText('A||B');await expect(drill(page)).not.toContainText('B||C');await page.keyboard.press('Escape');
  const csvPromise=page.waitForEvent('download');await clickExport(page,'.CSV');const csv=await readFile(await(await csvPromise).path(),'utf8');
  expect(csv).toContain('"A||B","C","10"');expect(csv).toContain('"A","B||C","20"');expect(csv).not.toContain('%7C');
});

test('deep: boolean missing and unknown values are separate from false',async({page})=>{
  await page.goto('/');await upload(page,'Approved,Amount\ntrue,10\nfalse,20\n,30\nunknown,40');
  await preview(page).getByLabel('Approved · 字段类型',{exact:true}).selectOption('boolean');await confirm(page);
  const table=page.locator('#pivot-main-html-table');await expect(table).toContainText('是 (True)');await expect(table).toContainText('否 (False)');await expect(table).toContainText('(空)');await expect(table).toContainText('unknown');
  await expect(page.getByTestId('pivot-value-cell')).toHaveText(['10','20','30','40']);
});

test('deep: automatically selected scatter measure has a correct axis label and full-bucket value',async({page})=>{
  const view={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[],values:[{id:'x',field:'X',agg:'sum'}],filters:[]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(view)));await upload(page,'Group,X,Y\n'+Array.from({length:120},()=>`All,1,2`).join('\n'));await confirm(page);
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('scatter');await ready(page);
  await page.locator('#pivot-chart-container .recharts-scatter-symbol').first().hover();
  const tooltip=page.locator('#pivot-chart-container .recharts-tooltip-wrapper');await expect(tooltip).toContainText('240');await expect(tooltip).toContainText('Y(求和)');
});

test('deep: switching datasets restores independent filters, measures and undo history; intro keeps data',async({page})=>{
  await page.goto('/');await upload(page,'Region,Amount\nEast,10\nEast,20\nWest,30');await confirm(page);
  const first=await page.getByLabel('选择当前数据集',{exact:true}).inputValue();
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('avg');await ready(page);
  await page.getByRole('button',{name:'East (2)',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('15');
  await upload(page,'Region,Amount\nNorth,5\nSouth,7');await confirm(page);
  const second=await page.getByLabel('选择当前数据集',{exact:true}).inputValue();
  expect(second).not.toBe(first);
  await expect(page.getByRole('button',{name:'撤销',exact:true})).toBeDisabled();
  await page.getByLabel('选择当前数据集',{exact:true}).selectOption(first);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('15');
  await expect(page.getByLabel('切换聚合口径',{exact:true})).toHaveValue('avg');
  await expect(page.locator('#pivot-main-html-table')).not.toContainText('West');
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  await expect(page.locator('#pivot-main-html-table')).toContainText('West');
  await expect(page.getByLabel('切换聚合口径',{exact:true})).toHaveValue('avg');
  await page.getByLabel('选择当前数据集',{exact:true}).selectOption(second);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('12');
  await expect(page.getByRole('button',{name:'撤销',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'添加数据集或打开介绍主页',exact:true}).click();await expect(page.getByTestId('start-page')).toBeVisible();
  await page.getByRole('button',{name:/打开数据集：/}).first().press('Enter');await expect(page.locator('#pivot-main-html-table')).toContainText('East');
  await page.getByLabel('选择当前数据集',{exact:true}).selectOption('');await expect(page.getByTestId('start-page')).toBeVisible();
  await expect(page.getByRole('button',{name:/打开数据集：/})).toHaveCount(2);
});

test('deep: analysis notes adapt to uploaded dataset fields', async({page}) => {
  await page.goto('/');
  await upload(page, 'Department,Salary\nEngineering,100\nDesign,80\nMarketing,60');
  await confirm(page);
  await page.getByRole('button', { name: '仅图表', exact: true }).click();
  await ready(page);
  const guideToggle = page.getByRole('button', { name: '阅读提示', exact: true });
  await guideToggle.click();
  const guide = page.getByTestId('chart-guide-note');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('怎么读这张图');
  await expect(page.getByLabel('选择图表类型', { exact: true })).toBeVisible();
  await expect(page.locator('#pivot-main-html-table')).toHaveCount(0);
  await page.getByRole('button', { name: '仅透视表', exact: true }).click();
  await ready(page);
  await expect(page.locator('#pivot-main-html-table')).toContainText('Department');
});


