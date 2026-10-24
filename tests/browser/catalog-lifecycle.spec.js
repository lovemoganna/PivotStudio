import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
async function upload(page,name='explicit-lifecycle.csv',csv='Region,Amount\nA,10\nB,20'){
 await page.locator('input[type=file]').first().setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
}
async function center(page){await page.getByRole('button',{name:/^指标中心/}).click();const c=page.getByTestId('metric-center');await c.getByRole('tab',{name:/指标库与模板/}).click();return c;}
async function definitions(c,items){await c.locator('input[type=file]').setInputFiles({name:'explicit-catalog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(items))});}
const base={id:'amount',field:'金额合计',formula:'SUM([Amount])'};
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});});
for(const width of [360,768,1280,1440])test(`catalog lifecycle: persistent definitions, schema isolation and themes at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const theme of ['light','dark']){
  await page.addInitScript(theme=>localStorage.setItem('pivotstudio_theme',theme),theme);await page.goto('/');await upload(page);let c=await center(page);await definitions(c,[base]);await expect(c.getByText(base.field,{exact:true})).toBeVisible();
  await page.reload();await upload(page,'explicit-lifecycle.csv','Region,Amount\nA,100\nB,200\nC,300');c=await center(page);await expect(c.getByText(base.field,{exact:true})).toBeVisible();await c.getByRole('button',{name:'+ 上表',exact:true}).first().click();await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('600');
  await definitions(c,[{...base,formula:'SUM([Amount])*2'}]);await expect(page.getByRole('status').filter({hasText:'同步更新 1 个已上表指标'})).toBeVisible();await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('1,200');await expect(c.locator('[title="SUM([Amount])*2"]')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.reload();await upload(page,'explicit-other.csv');c=await center(page);await expect(c.getByText(base.field,{exact:true})).toHaveCount(0);
  await page.reload();await upload(page,'explicit-lifecycle.csv','Region,Revenue\nA,10');c=await center(page);await expect(c.getByText(base.field,{exact:true})).toHaveCount(0);
 }
});
test('catalog lifecycle: duplicate imports reject the whole batch and recover',async({page})=>{
 await page.goto('/');await upload(page);const c=await center(page);await definitions(c,[base]);
 for(const batch of [[{id:'dup',field:'第一指标',formula:'COUNT()'},{id:'dup',field:'第二指标',formula:'COUNT()'}],[{id:'one',field:' 同名 ',formula:'COUNT()'},{id:'two',field:'同名',formula:'COUNT()'}],[{id:'fresh',field:'可用指标',formula:'COUNT()'},{...base,id:'different'}]]){
  await definitions(c,batch);await expect(page.getByRole('status').filter({hasText:'导入指标失败'})).toBeVisible();await expect(c.getByText(base.field,{exact:true})).toBeVisible();await expect(c.getByText('可用指标',{exact:true})).toHaveCount(0);await expect(c.getByText('第二指标',{exact:true})).toHaveCount(0);
 }
 await definitions(c,[{id:'fresh',field:'可用指标',formula:'COUNT()'}]);await expect(c.getByText('可用指标',{exact:true})).toBeVisible();
});
test('catalog lifecycle: duplicate creation and save-as cannot fork one named definition',async({page})=>{
 await page.goto('/');await upload(page);const c=await center(page);await definitions(c,[base]);await c.getByRole('button',{name:'+ 上表',exact:true}).first().click();await c.getByTitle('编辑该自定义指标',{exact:true}).click();
 await expect(c.getByRole('button',{name:'仅存指标库',exact:true})).toBeDisabled();await c.getByRole('button',{name:'另存为新指标',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'已存在，请修改名称或编辑原指标'})).toBeVisible();await expect(page.locator('#pivot-main-html-table thead')).toContainText(base.field);
 await c.getByLabel('自定义指标名称',{exact:true}).fill('金额合计副本');await c.getByRole('button',{name:'另存为新指标',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'已创建并上表'})).toBeVisible();await c.getByTestId('metric-center-submit').click();await expect(page.getByRole('status').filter({hasText:'已存在，请修改名称或编辑原指标'})).toBeVisible();await c.getByRole('tab',{name:/已配指标/}).click();await expect(c.getByTestId('metric-center-active-card')).toHaveCount(3);
});
