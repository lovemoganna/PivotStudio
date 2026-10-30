import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {clickMoreItem} from './_toolbar.js';
import {RETAIL_TEST_DATASET} from '../../src/constants/pivotConstants.js';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const zoneNames={rows:'行（纵向分组）',columns:'列（横向对比）',values:'值（要算的数）',filters:'筛选（限定范围）'};
const opener=(page,zone)=>page.getByRole('button',{name:`+字段 · 添加字段到${zoneNames[zone]}`,exact:true});
async function configMode(page,width) {
  if(width>=768) await page.getByRole('button',{name:'配置',exact:true}).click();
  else {
    const accordion=page.getByRole('button',{name:/分析配置/});
    if(await accordion.getAttribute('aria-expanded')==='false') await accordion.click();
    const fields=page.getByRole('button',{name:/字段列表/});
    if(await fields.getAttribute('aria-expanded')==='true') await fields.click();
  }
}
async function add(page,zone,field) {
  await opener(page,zone).press('Enter');
  const dialog=page.getByRole('dialog',{name:`添加字段到${zoneNames[zone]}`,exact:true});
  const search=dialog.getByRole('searchbox',{name:'搜索要添加的字段',exact:true});
  await expect(search).toBeFocused();
  await search.fill(` ${field} `);
  await dialog.getByTestId('field-picker-option').filter({has:page.getByText(field,{exact:true})}).press('Enter');
  await expect(dialog).toHaveCount(0);await ready(page);
  await expect(opener(page,zone)).toBeFocused();
}
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for(const width of [360,768,1440]) test(`sidebar: independent four-zone configuration and history at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'sidebar-task.csv',mimeType:'text/csv',buffer:Buffer.from('Region,Period,Revenue\nEast,Jan,100\nEast,Feb,200\nWest,Jan,300\nWest,Feb,400')});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);await configMode(page,width);
  await expect(page.locator('#pivot-schema-fields')).not.toBeVisible();
  for(const [zone,field] of [['rows','Region'],['columns','Period'],['values','Revenue'],['filters','Region']]) await add(page,zone,field);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,000');
  await page.getByTestId('zone-filters').getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('dialog',{name:'字段筛选',exact:true}).getByLabel('West',{exact:true}).uncheck();await page.keyboard.press('Escape');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('300');
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,000');
  await page.getByRole('button',{name:'重做',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('300');
  await page.screenshot({path:info.outputPath(`configured-${width}.png`),fullPage:true});
  await opener(page,'values').click();
  const dialog=page.getByRole('dialog',{name:`添加字段到${zoneNames.values}`,exact:true});
  const rect=await dialog.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);
  await expect(dialog.getByTestId('field-picker-option').filter({has:page.getByText('记录数',{exact:true})})).toBeEnabled();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`picker-${width}.png`)});
  await page.keyboard.press('Escape');await expect(opener(page,'values')).toBeFocused();
});

test('sidebar: padded search, empty recovery, repeated dates and value aggregations',async({page})=>{
  await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('textbox',{name:'搜索可用字段名称',exact:true}).fill(' 销售 ');
  await expect(page.getByRole('button',{name:'+值 · 添加「销售额」到计算指标',exact:true})).toBeVisible();
  await configMode(page,1440);
  await opener(page,'rows').click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByTestId('field-picker-option').filter({has:page.getByText('销售大区',{exact:true})})).toBeDisabled();
  const search=dialog.getByRole('searchbox');await search.fill('no-such-field');
  await expect(dialog.getByText('无匹配字段',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'清空搜索条件',exact:true}).click();await expect(search).toBeFocused();
  await search.press('Escape');
  await add(page,'columns','订单日期');
  await expect(page.getByTestId('zone-columns').getByTestId('configured-field')).toHaveCount(2);
  await add(page,'values','销售额');
  await expect(page.getByTestId('zone-values').getByTestId('configured-field')).toHaveCount(3);
});

test('sidebar: field selection respects readonly mode',async({page})=>{
  await page.goto('/?demo=retail');await ready(page);
  await clickMoreItem(page,/^工作区/);await page.getByRole('button',{name:'访客预览账户 (只读)',exact:true}).click();await page.keyboard.press('Escape');
  await configMode(page,1440);
  for(const zone of Object.keys(zoneNames)) await expect(opener(page,zone)).toBeDisabled();
});

test('sidebar: long field names remain readable in a bounded searchable list',async({page},info)=>{
  await page.setViewportSize({width:360,height:740});await page.goto('/');
  const name='这是用于验证完整字段名称不会被隐藏的非常长的区域分类字段';
  const names=[name,...Array.from({length:80},(_,i)=>`Field${i}`)];
  await page.locator('input[type=file]').first().setInputFiles({name:'many-fields.csv',mimeType:'text/csv',buffer:Buffer.from(names.join(',')+'\n'+names.map(()=>1).join(','))});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);await configMode(page,360);
  await opener(page,'rows').click();
  const dialog=page.getByRole('dialog');
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await dialog.getByRole('searchbox').fill(' 完整字段 ');
  await expect(dialog.getByTestId('field-picker-option').filter({has:page.getByText(name,{exact:true})})).toBeVisible();
  await page.screenshot({path:info.outputPath('long-field.png')});
  await dialog.getByRole('searchbox').press('Enter');await ready(page);
  await expect(page.getByTestId('zone-rows').getByTestId('configured-field')).toHaveCount(1);
});

test('sidebar: saved custom metrics use the existing calculation and undo path',async({page})=>{
  const metric={id:'saved_net',field:'净额',isCalculated:true,agg:'calc',formula:'SUM([销售额]) - SUM([成本])',showAs:'normal',format:{thousands:true,decimals:0}};
  await page.addInitScript(({key,metric})=>localStorage.setItem('pivotstudio_custom_metrics_v1',JSON.stringify({[key]:[metric]})),{key:RETAIL_TEST_DATASET.id,metric});
  await page.goto('/?demo=retail');await ready(page);await configMode(page,1440);
  await add(page,'values','净额');
  const expected=RETAIL_TEST_DATASET.rows.reduce((sum,row)=>sum+row.销售额-row.成本,0);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText(expected.toLocaleString('en-US'));
  await opener(page,'values').click();
  await expect(page.getByRole('dialog').getByTestId('field-picker-option').filter({has:page.getByText('净额',{exact:true})})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);
  await expect(page.getByTestId('zone-values').getByTestId('configured-field')).toHaveCount(2);
});

test('sidebar: English dark picker keeps visible and spoken labels consistent',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('pivotstudio_locale','en');localStorage.setItem('pivotstudio_theme','dark');});
  await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('button',{name:'Zones',exact:true}).click();
  await page.getByRole('button',{name:'+ Field · Add field to Filters (scope)',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Add field to Filters (scope)',exact:true});
  await expect(dialog.getByText('Number',{exact:true})).toHaveCount(4);
  await expect(dialog.getByRole('searchbox',{name:'Search fields to add',exact:true})).toBeFocused();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
