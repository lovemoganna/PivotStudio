import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
async function start(page,filters=[],vm='split'){
 const fullConfig={rows:[{field:'Region'}],columns:[],values:[{id:'sum',field:'Price',agg:'sum'},{id:'avg',field:'Price',agg:'avg'}],filters};
 await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig,vm})));
 await page.locator('input[type=file]').first().setInputFiles({name:'explicit-result-meaning.csv',mimeType:'text/csv',buffer:Buffer.from('Region,Price,Quantity\nA,10,1\nA,20,2\nB,40,3')});
 await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
}
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});});
for(const width of [360,768,1280,1440])test(`meaning: actual aggregation, readable formula scope and keyboard at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 for(const theme of ['light','dark']){
  await page.goto('about:blank');await page.addInitScript(theme=>localStorage.setItem('pivotstudio_theme',theme),theme);await start(page,[{field:'Region',selectedValues:['A']}]);
  await expect(page.getByTestId('analysis-reading')).toContainText('Price（求和）、Price（平均值）');await expect(page.getByTestId('analysis-reading')).toContainText('已筛选「Region」');await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('15');
  await page.getByRole('button',{name:/^指标中心/}).click();const c=page.getByTestId('metric-center');await c.getByRole('tab',{name:/新建自定义指标/}).click();
  await c.getByLabel('自定义指标首项字段',{exact:true}).selectOption('Price');await c.getByLabel('自定义指标运算符',{exact:true}).selectOption('*');await c.getByLabel('自定义指标次项字段',{exact:true}).selectOption('Quantity');await c.getByLabel('自定义指标数值格式',{exact:true}).selectOption('number');
  await expect(c.getByTestId('aggregate-product-warning')).toContainText('不是逐行相乘后求和');await expect(c.getByTestId('metric-preview-scope')).toContainText('不应用当前筛选');await expect(c.getByTestId('metric-live-preview')).toContainText('420');
  const explanation=c.getByTestId('metric-formula-explanation');await explanation.scrollIntoViewIfNeeded();expect(await explanation.locator('span').first().evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,clip:getComputedStyle(el).textOverflow}))).toEqual({overflow:false,clip:'clip'});
  await c.screenshot({path:info.outputPath(`meaning-${width}-${theme}.png`)});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await c.getByLabel('自定义指标名称',{exact:true}).fill(`${theme}汇总乘积`);await c.getByTestId('metric-center-submit').focus();await c.getByTestId('metric-center-submit').press('Enter');await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('90.0');
 }
});
test('meaning: filter placeholders are honest, and manual aggregation undo updates result framing',async({page})=>{
 await start(page,[{field:'Region',selectedValues:[]}]);await expect(page.getByTestId('analysis-reading')).not.toContainText('已筛选');
 await page.getByLabel('切换聚合口径',{exact:true}).first().selectOption('max');await expect(page.getByTestId('analysis-reading')).toContainText('Price（最大值）');
 await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.getByTestId('analysis-reading')).toContainText('Price（求和）');await page.getByRole('button',{name:'重做',exact:true}).click();await expect(page.getByTestId('analysis-reading')).toContainText('Price（最大值）');
 await page.goto('about:blank');await start(page,[],'chart');await expect(page.getByTestId('result-reading')).toContainText('查看各「Region」的「Price（求和）、Price（平均值）」');
});
