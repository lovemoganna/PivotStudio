import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {clickMoreItem} from './_toolbar.js';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});});
async function importCSV(page,csv,config){
  await page.goto(config?'/#share_token='+encodeURIComponent(encodeView({fullConfig:config})):'/');
  await page.locator('input[type=file]').first().setInputFiles({name:'explicit-metric-quality.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
}
async function openCenter(page){await page.getByRole('button',{name:/^指标中心/}).click();return page.getByTestId('metric-center');}
test('metric: system theme synchronizes a change between initial render and subscription',async({page})=>{
  await page.addInitScript(()=>{
    let current=true;const native=window.matchMedia.bind(window);
    window.matchMedia=query=>query.includes('prefers-color-scheme')?{media:query,get matches(){return current;},addEventListener(){current=false;},removeEventListener(){}}:native(query);
  });
  await page.goto('/');await expect(page.getByRole('heading',{level:1,name:/PivotStudio/})).toBeVisible();
  await expect(page.locator('[data-testid=pivot-workbench].dark')).toHaveCount(0);
});
for(const width of [360,768,1280,1440])test(`metric: responsive studio, formula errors and keyboard import at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
    await page.addInitScript(theme=>localStorage.setItem('pivotstudio_theme',theme),theme);
    await page.goto('/?demo=retail');await ready(page);const center=await openCenter(page);
    await center.getByRole('tab',{name:/新建自定义指标/}).click();
    await center.getByRole('button',{name:'FX 高级公式表达式',exact:true}).click();
    await center.getByLabel('自定义指标公式表达式',{exact:true}).fill('SUM([Missing])');
    await expect(center.getByTestId('metric-center-submit')).toBeDisabled();
    await expect(center.getByTestId('metric-live-preview')).toContainText('不存在字段');
    await center.getByLabel('自定义指标公式表达式',{exact:true}).fill('SUM([销售额]) / COUNT()');
    await expect(center.getByTestId('metric-center-submit')).toBeEnabled();
    await center.screenshot({path:info.outputPath(`${width}-${theme}-studio.png`)});
    expect(await center.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await center.getByRole('tab',{name:/指标库与模板/}).click();
    const importer=center.getByTitle('导入外部指标定义 (JSON)',{exact:true});await importer.focus();
    const chooser=page.waitForEvent('filechooser');await importer.press('Enter');await (await chooser).setFiles([]);
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
    await center.screenshot({path:info.outputPath(`${width}-${theme}-catalog.png`)});
    await page.keyboard.press('?');
    const guide=page.getByRole('dialog',{name:'快捷键指南',exact:true});
    const content=guide.getByRole('region',{name:'快捷键说明正文',exact:true});
    await content.focus();await page.keyboard.press('End');
    if(width===360)await expect.poll(()=>content.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    const guideAxe=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(guideAxe.violations).toEqual([]);
    await guide.screenshot({path:info.outputPath(`${width}-${theme}-guide.png`)});await page.keyboard.press('Escape');
  }
});
test('metric: real 记录数 field and bracketed names calculate correct results through the UI',async({page})=>{
  await importCSV(page,'Region,记录数,收入[元]\nA,10,100\nB,20,200');const center=await openCenter(page);
  await center.getByRole('tab',{name:/新建自定义指标/}).click();await center.getByRole('button',{name:'FX 高级公式表达式',exact:true}).click();
  await center.getByLabel('自定义指标名称',{exact:true}).fill('真实记录合计');
  await center.getByLabel('自定义指标公式表达式',{exact:true}).fill('SUM([记录数])');
  await center.getByLabel('自定义指标数值格式',{exact:true}).selectOption('number');
  await center.getByTestId('metric-center-submit').click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('30.0');
  await center.getByRole('button',{name:'FX 高级公式表达式',exact:true}).click();
  await center.getByLabel('自定义指标名称',{exact:true}).fill('单位收入');
  await center.getByLabel('自定义指标公式表达式',{exact:true}).fill('SUM([收入[元]]]) / SUM([记录数])');
  await expect(center.getByTestId('metric-live-preview')).toContainText('10.0');
  await center.getByTestId('metric-center-submit').click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('10.0');
});
for(const legacy of [false,true])test(`metric: restored formula editing preserves its meaning (${legacy?'legacy':'visual'})`,async({page})=>{
  const value={id:'v',field:'折算',agg:'calc',isCalculated:true,formula:'SUM([Amount]) / 100',operandAField:'Amount',operandAAgg:'sum',op:'/',format:{decimals:1},...(!legacy?{builderMode:'constant',constantValue:100,category:'scale'}:{})};
  await importCSV(page,'Region,Amount\nA,100\nB,200',{rows:[{id:'r',field:'Region'}],columns:[],filters:[],values:[value]});
  const center=await openCenter(page);await center.getByRole('tab',{name:/指标库与模板/}).click();await center.getByTitle('编辑该自定义指标',{exact:true}).click();
  await expect(center.getByTestId('metric-live-preview')).toContainText('3.0');
  if(legacy)await expect(center.getByLabel('自定义指标公式表达式',{exact:true})).toHaveValue(value.formula);
  else await expect(center.getByRole('button',{name:'常数折算 (A ÷ 10000)',exact:true})).toHaveAttribute('aria-pressed','true');
  await center.getByTestId('metric-center-submit').click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('3.0');
});
test('metric: malformed catalog import is atomic, recoverable, and copy failure is honest',async({page})=>{
  await page.goto('/?demo=retail');await ready(page);const center=await openCenter(page);await center.getByRole('tab',{name:/指标库与模板/}).click();
  const valid={id:'valid',field:'已验证合计',formula:'SUM([销售额])'};
  await center.locator('input[type=file]').setInputFiles({name:'explicit-invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([valid,{field:{wrong:true}}]))});
  await expect(page.getByRole('status').filter({hasText:'导入指标失败'})).toBeVisible();await expect(page.getByTestId('pivot-workbench')).toBeVisible();await expect(center).not.toContainText('已验证合计');
  await center.locator('input[type=file]').setInputFiles({name:'explicit-valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([valid]))});
  await expect(center).toContainText('已验证合计');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('controlled permission denied');}}}));
  await center.getByTitle('复制该指标公式',{exact:true}).click();await expect(page.getByRole('status').filter({hasText:'复制公式失败'})).toBeVisible();
  await center.getByTitle('收起指标中心',{exact:true}).click();await clickMoreItem(page,/^工作区/);await page.getByRole('button',{name:'访客预览账户 (只读)',exact:true}).click();await page.keyboard.press('Escape');
  await openCenter(page);await center.getByRole('tab',{name:/指标库与模板/}).click();await expect(center.getByTitle('导入外部指标定义 (JSON)',{exact:true})).toBeDisabled();await expect(center.locator('input[type=file]')).toBeDisabled();
});
test('metric: fifth KPI uses actual totals and external new-metric entry navigates to a fresh form',async({page})=>{
  await importCSV(page,'Region,Amount\nA,10\nB,20',{rows:[{field:'Region'}],columns:[],filters:[],values:Array.from({length:5},(_,i)=>({id:'v'+i,field:'Amount',agg:'sum'}))});
  let center=await openCenter(page);await center.getByRole('tab',{name:/已配指标/}).click();
  await expect(center.getByTestId('metric-center-active-card')).toHaveCount(5);await expect(center.getByTestId('metric-center-active-card').last().locator('.text-sm.font-bold')).toHaveText('30');
  for(const width of [360,768,1280,1440]){
    await page.setViewportSize({width,height:900});
    await expect.poll(async()=>{const overflows=await center.getByTestId('metric-center-active-card').evaluateAll(cards=>cards.flatMap(card=>{const box=card.getBoundingClientRect();return [...card.querySelectorAll('select')].map(select=>select.getBoundingClientRect().right-box.right);}));return Math.max(...overflows);}).toBeLessThanOrEqual(0);
  }
  await center.getByRole('tab',{name:/指标库与模板/}).click();await page.getByTitle('打开指标中心新建自定义计算指标',{exact:true}).click();
  center=page.getByTestId('metric-center');await expect(center.getByRole('tab',{name:/新建自定义指标/})).toHaveAttribute('aria-selected','true');await expect(center.getByLabel('自定义指标名称',{exact:true})).toBeVisible();
});
test('metric: valid legacy definitions round trip, and active definitions explain safe deletion',async({page})=>{
  await importCSV(page,'Region,Amount,Units\nA,100,10\nB,200,20');
  const center=await openCenter(page);await center.getByRole('tab',{name:/指标库与模板/}).click();
  const legacy={id:'old',field:'旧式单位收入',isCalculated:true,operandAField:'Amount',operandAAgg:'sum',op:'/',operandBField:'Units',operandBAgg:'sum',format:{decimals:1}};
  await center.locator('input[type=file]').setInputFiles({name:'explicit-valid-legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([legacy]))});
  await expect(center).toContainText('旧式单位收入');
  const item=center.locator('.p-2.rounded-lg').filter({hasText:'旧式单位收入'}).first();
  await item.getByRole('button',{name:'+ 上表',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('10.0');
  await expect(item.getByTitle('先点击“已上表”从数值区移除，再删除指标定义',{exact:true})).toBeDisabled();
  await item.getByRole('button',{name:'✓ 已上表',exact:true}).click();await ready(page);
  await item.getByTitle('从指标库删除',{exact:true}).click();await expect(center).not.toContainText('旧式单位收入');
});
test('metric: a queued Escape closes the first drilldown frame without leaving an overlay',async({page})=>{
  await page.goto('/?demo=retail');await ready(page);
  await page.evaluate(()=>{
    window.__earlyEscapeCount=0;const seen=new WeakSet();
    new MutationObserver(()=>{const dialog=document.querySelector('[role=dialog][aria-label="原始交易明细下钻"]');if(dialog&&!seen.has(dialog)){seen.add(dialog);window.__earlyEscapeCount++;document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}}).observe(document.body,{childList:true,subtree:true});
  });
  await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
  await expect.poll(()=>page.evaluate(()=>window.__earlyEscapeCount)).toBe(1);
  await expect(page.getByRole('dialog',{name:'原始交易明细下钻',exact:true})).toHaveCount(0);
});
