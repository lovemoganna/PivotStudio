import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {clickExport, clickMoreItem} from './_toolbar.js';
import {ensureMobileShelves} from './_mobileShelves.js';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
async function start(page){await page.goto('/?demo=retail');await ready(page);}

for(const width of [360,768,1280,1440])test(`system: shared configuration, dialog and fullscreen at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
    await page.addInitScript(theme=>localStorage.setItem('pivotstudio_theme',theme),theme);
    await start(page);
    await page.getByRole('button',{name:'仅图表',exact:true}).click();
    if(width<640)await ensureMobileShelves(page,width);
    for(const zone of ['rows','columns','values','filters'])await expect(page.getByTestId('zone-'+zone)).toBeVisible();
    await expect(page.getByTestId('zone-values')).toHaveCount(1);
    await expect(page.getByTestId('calculation-basis')).toHaveCount(0);
    await page.getByRole('button',{name:'图表全屏',exact:true}).click();
    const fullscreen=page.getByRole('dialog',{name:'全屏图表',exact:true});
    await expect(fullscreen).toBeVisible();
    const box=await fullscreen.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeGreaterThan(width-40);expect(box.y+box.height).toBeLessThanOrEqual(900);
    await expect(fullscreen).toHaveCSS('position','fixed');
    const fullscreenAxe=await new AxeBuilder({page}).include('#pivot-chart-container').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(fullscreenAxe.violations).toEqual([]);
    await fullscreen.screenshot({path:info.outputPath(`${width}-${theme}-fullscreen.png`)});
    await fullscreen.locator('.recharts-bar-rectangle').first().click();
    const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
    await expect(drill).toBeVisible();
    expect(await drill.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+20));})).toBe(true);
    await drill.getByRole('button',{name:'关闭下钻明细',exact:true}).click();
    await expect(fullscreen).toBeVisible();
    await page.keyboard.press('Escape');await expect(fullscreen).toHaveCount(0);
    await expect(page.getByRole('button',{name:'图表全屏',exact:true})).toBeFocused();
    await clickMoreItem(page,'演示舞台');
    // Safari pointer clicks do not focus buttons; exercise keyboard focus restoration explicitly.
    const opener=page.getByRole('button',{name:'编辑结论',exact:true});await opener.focus();await opener.press('Enter');
    const dialog=page.getByRole('dialog',{name:/编辑分析笔记/});
    await dialog.getByLabel('笔记标题:',{exact:true}).fill('');
    await expect(dialog.getByRole('button',{name:'保存修改',exact:true})).toBeDisabled();
    await dialog.getByLabel('笔记标题:',{exact:true}).fill('审查笔记');
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({path:info.outputPath(`${width}-${theme}-story.png`)});
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

test('system: modal shortcuts cannot mutate background configuration',async({page})=>{
  await start(page);const table=page.locator('#pivot-main-html-table');const before=await table.textContent();
  await page.getByRole('button',{name:'格式与数值',exact:true}).click();
  const formatDialog=page.getByRole('dialog');
  await expect(formatDialog).toBeVisible();
  await formatDialog.getByRole('button').first().focus();
  for(const key of ['r','t','[',']','Control+z','Control+Shift+z'])await page.keyboard.press(key);
  await expect(table).toHaveText(before);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'销售额 · 查看字段分布',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(page.getByTestId('numeric-quality')).toBeVisible();
  await expect(dialog).not.toContainText('属于主键');await expect(dialog).toContainText('数值度量字段');
  await dialog.getByRole('button',{name:'关闭字段质量透视弹窗',exact:true}).focus();
  await page.keyboard.press('Tab');await expect(dialog.getByRole('region',{name:'字段样本分布',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});

test('system: readonly formatting is disabled and administrator can recover',async({page})=>{
  await start(page);const table=page.locator('#pivot-main-html-table'),before=await table.textContent();
  await clickMoreItem(page,/^工作区/);
  await page.getByRole('button',{name:'访客预览账户 (只读)',exact:true}).click();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'格式与数值',exact:true}).click();
  const controls=page.getByRole('dialog').locator('input,select');
  for(const control of await controls.all())await expect(control).toBeDisabled();
  await page.keyboard.press('Escape');await page.keyboard.press('Control+z');await expect(table).toHaveText(before);
  await clickMoreItem(page,/^工作区/);
  await page.getByRole('button',{name:'张工 (BI架构师)',exact:true}).click();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'格式与数值',exact:true}).click();await expect(page.getByRole('dialog').locator('select').first()).toBeEnabled();
});

test('system: deleting and resetting stories keeps displayed shot and chart synchronized',async({page})=>{
  await start(page);await clickMoreItem(page,'演示舞台');
  for(const action of ['删除当前分析笔记','恢复为推荐分析场景']){
    await page.getByTitle(action,{exact:true}).click();await ready(page);
    const type=await page.getByLabel('选择图表类型',{exact:true}).inputValue();
    await page.getByRole('button',{name:'01',exact:true}).click();await ready(page);
    await expect(page.getByLabel('选择图表类型',{exact:true})).toHaveValue(type);
  }
  await page.getByRole('button',{name:'编辑结论',exact:true}).click();
  await page.getByRole('dialog').getByLabel('笔记标题:',{exact:true}).fill('核对后的分析');
  await page.getByRole('button',{name:'保存修改',exact:true}).click();
  await expect(page.getByRole('button',{name:'01',exact:true})).toHaveAttribute('title',/核对后的分析/);
  await page.getByRole('button',{name:'存为笔记',exact:true}).click();
  await page.getByRole('dialog').getByLabel('笔记标题:',{exact:true}).fill('保存的分析');
  await page.getByRole('button',{name:'保存笔记',exact:true}).click();await ready(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'06',exact:true})).toHaveAttribute('title',/保存的分析/);
});

test('system: cancelled public import cannot change data; retry uses consistent rate defaults',async({page})=>{
  await start(page);let release,requested;
  const hold=new Promise(r=>release=r),began=new Promise(r=>requested=r);
  await page.route('https://docs.google.com/**',async route=>{requested();await hold;await route.fulfill({status:200,contentType:'text/csv',body:'Region,ConversionRate\nA,0.1\nB,0.3'}).catch(()=>{});});
  const initial=await page.getByLabel('选择当前数据集',{exact:true}).inputValue();
  await page.getByRole('button',{name:'+来源',exact:true}).click();await page.getByRole('button',{name:'读取公开工作表',exact:true}).click();
  await began;await page.keyboard.press('Escape');release();await page.waitForTimeout(500);
  await expect(page.getByLabel('选择当前数据集',{exact:true})).toHaveValue(initial);
  await page.unroute('https://docs.google.com/**');let attempts=0;
  await page.route('https://docs.google.com/**',r=>{attempts++;return r.fulfill(attempts===1?{status:403,body:'Forbidden'}:{status:200,contentType:'text/csv',body:'Region,ConversionRate\nA,0.1\nB,0.3'});});
  await page.getByRole('button',{name:'+来源',exact:true}).click();await page.getByRole('button',{name:'读取公开工作表',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'导入失败'})).toBeVisible();await expect(page.getByRole('button',{name:'读取公开工作表',exact:true})).toBeEnabled();
  await expect(page.getByLabel('选择当前数据集',{exact:true})).toHaveValue(initial);
  await page.getByRole('button',{name:'读取公开工作表',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await ready(page);
  await expect(page.getByLabel('切换聚合口径',{exact:true}).first()).toHaveValue('avg');
  // Public CSV has no declared percentage scale: names must not invent units.
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('0.2');
  await expect(page.getByRole('button',{name:'撤销',exact:true})).toBeDisabled();
});

test('system: all source modes are reachable on a phone and SQL is explicitly nonexecuting',async({page})=>{
  await page.setViewportSize({width:360,height:700});await start(page);
  await page.getByRole('button',{name:'+来源',exact:true}).click();
  await page.getByRole('button',{name:'SQL 连接说明',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('数据库连接及 SQL 查询尚未实现');
  await page.getByRole('button',{name:'SQL 模板与压测',exact:true}).click();
  await expect(page.getByRole('region',{name:'DuckDB SQL 模板（不执行）',exact:true})).toContainText('SELECT');
  await page.getByRole('button',{name:'公开工作表',exact:true}).click();
  await page.getByLabel('Google Sheets 链接（可指定 gid）',{exact:true}).fill('invalid');
  await page.getByRole('button',{name:'读取公开工作表',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'请输入有效'})).toBeVisible();
});

test('system: every chart type renders finite geometry with no runtime errors',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);await page.getByRole('button',{name:'仅图表',exact:true}).click();
  const selector=page.getByLabel('选择图表类型',{exact:true});
  const types=await selector.locator('option').evaluateAll(options=>options.map(o=>o.value));expect(types.length).toBeGreaterThanOrEqual(15);
  for(const type of types){
    await selector.selectOption(type);await ready(page);
    const chart=page.locator('#pivot-chart-container');
    await expect(chart.locator('svg[data-chart-svg],svg.recharts-surface').first()).toBeVisible();
    const invalid=await chart.locator('path,rect,circle,line,polygon').evaluateAll(els=>els.flatMap(el=>[...el.attributes].filter(a=>/^(d|x|y|cx|cy|width|height|points|transform)$/.test(a.name)&&/NaN|Infinity/.test(a.value)).map(a=>a.name+'='+a.value)));
    expect(invalid,`finite geometry: ${type}`).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('system: print report contains computed results and restores analysis controls',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await start(page);
  await page.evaluate(()=>{window.print=()=>{window.__printedPivot={table:document.querySelector('#pivot-main-html-table')?.textContent,configCount:document.querySelectorAll('[data-testid="zone-values"]').length,chartCount:document.querySelectorAll('#pivot-chart-container').length};};});
  await clickExport(page,'.PDF');
  await expect.poll(()=>page.evaluate(()=>window.__printedPivot)).toBeTruthy();
  const report=await page.evaluate(()=>window.__printedPivot);
  expect(report.table).toContain('1,623,510');expect(report.configCount).toBe(0);expect(report.chartCount).toBe(1);
  await expect(page.getByTestId('zone-values')).toBeVisible();
});
