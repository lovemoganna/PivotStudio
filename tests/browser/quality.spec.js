import { test, expect } from '@playwright/test';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status', 'idle');
test.beforeEach(async ({page}) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

for (const width of [360, 768, 1280, 1440]) {
  test(`quality: readable split panes and reachable chart at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/?demo=retail'); await ready(page);
    const table=page.locator('#pivot-main-html-table');
    const viewport=await table.evaluate(el=>el.parentElement.clientHeight);
    expect(viewport).toBeGreaterThanOrEqual(180);
    const cell=page.getByTestId('pivot-value-cell').first();
    await cell.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const chart=page.locator('#pivot-chart-container');
    await chart.scrollIntoViewIfNeeded();
    expect(await chart.locator('.recharts-wrapper').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(260);
    await chart.locator('.recharts-bar-rectangle').first().click();
    await expect(page.getByRole('dialog',{name:'原始交易明细下钻',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('quality: keyboard file chooser, named preview types and long headers',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto('/');
  const entry=page.getByRole('button',{name:'选择本地文件',exact:true});
  for(const key of ['Enter','Space']) {
    await entry.focus();
    const chooser=page.waitForEvent('filechooser');
    await page.keyboard.press(key);
    const file=await chooser;
    await file.setFiles({name:'very-long-file-name-for-local-preview-without-truncation.csv',mimeType:'text/csv',buffer:Buffer.from('RegionWithAnExtremelyLongBusinessFieldName,Value\nEast,12\nWest,25')});
    const dialog=page.getByRole('dialog');
    await expect(dialog.getByLabel('RegionWithAnExtremelyLongBusinessFieldName · 字段类型',{exact:true})).toBeVisible();
    await dialog.getByLabel('Value · 字段类型',{exact:true}).selectOption('text');
    await expect(dialog.getByLabel('Value · 字段类型',{exact:true})).toHaveValue('text');
    expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    // Shift+Tab and Tab stay inside the modal; Escape returns to the opener.
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(entry).toBeFocused();
  }
});

test('quality: named chart settings, target sizes and semantic text contrast',async({page})=>{
  await page.goto('/?demo=retail'); await ready(page);
  await page.getByLabel('主题模式',{exact:true}).selectOption('light');
  await page.getByRole('button',{name:'规格',exact:true}).click();
  for(const name of ['主指标绑定:','次轴/Y轴指标:','图表内排序:','TopN 焦点截断:','衍生分析序列:','缺失值处理策略:']) {
    await expect(page.getByLabel(name,{exact:true})).toBeVisible();
  }
  await page.getByRole('button',{name:'关闭图表规格面板',exact:true}).click();
  const small=await page.locator('button:visible,select:visible,[role=button]:visible').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width<24||r.height<24}).map(el=>el.outerHTML.slice(0,100)));
  expect(small).toEqual([]);
  const ratios=await page.evaluate(()=>{
    const lum=hex=>{const c=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
    const styles=getComputedStyle(document.documentElement);
    return ['cyan','green','pink','orange','yellow','purple','muted'].map(name=>({name,ratio:(lum('#EFECE1')+.05)/(lum(styles.getPropertyValue('--ps-ink-'+name).trim())+.05)}));
  });
  for(const {ratio} of ratios)expect(ratio).toBeGreaterThanOrEqual(4.5);
  // Fixed dark surfaces must keep their own readable icon ink even in the light theme.
  await page.locator('input[type=file]').first().setInputFiles({name:'empty.csv',mimeType:'text/csv',buffer:Buffer.from('')});
  const dismiss=page.getByRole('button',{name:'关闭通知',exact:true});
  await expect(dismiss).toBeVisible();
  const iconContrast=await dismiss.evaluate(el=>{
    const rgb=text=>text.match(/[\d.]+/g).slice(0,3).map(Number);
    const lum=values=>{const c=values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
    const a=lum(rgb(getComputedStyle(el).color)),b=lum(rgb(getComputedStyle(el.parentElement).backgroundColor));
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  expect(iconContrast).toBeGreaterThanOrEqual(3);

});

test('quality: mobile display controls stay discoverable and preserve settings',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto('/?demo=retail'); await ready(page);
  const toggle=page.getByRole('button',{name:/表格显示设置/});
  const settings=page.locator('#pivot-table-display-settings');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(settings).toBeHidden();
  await toggle.click();
  await expect(settings).toBeVisible();
  const zebra=page.getByLabel('启用表格隔行斑马纹背景',{exact:true});
  await zebra.uncheck();
  await toggle.click();
  await toggle.click();
  await expect(zebra).not.toBeChecked();
  await page.setViewportSize({width:1280,height:900});
  await expect(toggle).toBeHidden();
  await expect(settings).toBeVisible();
});

test('quality: English command search finds and executes exports by keyboard',async({page})=>{
  await page.goto('/?demo=retail'); await ready(page);
  await page.getByLabel('界面语言',{exact:true}).selectOption('en');
  await page.getByRole('button',{name:'Open command palette',exact:true}).click();
  const search=page.getByRole('combobox',{name:'Search commands',exact:true});
  await search.fill('Export');
  await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('dialog').getByRole('option').nth(1)).toContainText('Excel');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const download=page.waitForEvent('download');
  await page.keyboard.press('Enter');
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('quality: desktop toolbar remains scrollable and mobile tabs never overlap telemetry',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/?demo=retail'); await ready(page);
  const toolbar=page.getByRole('toolbar');
  expect(await toolbar.evaluate(el=>getComputedStyle(el).overflowX)).toBe('auto');
  const more=page.getByRole('button',{name:'更多工具，滚动到末尾后返回开头',exact:true});
  await expect(more).toBeVisible();
  await more.click();
  await expect.poll(()=>toolbar.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  const theme=page.getByRole('button',{name:'切换主题',exact:true});
  await theme.focus();
  await expect.poll(()=>theme.evaluate(el=>el.getBoundingClientRect().right-el.closest('[role=toolbar]').getBoundingClientRect().right)).toBeLessThanOrEqual(1);
  const rects=await theme.evaluate(el=>{const t=el.closest('[role=toolbar]').getBoundingClientRect(),r=el.getBoundingClientRect();return {right:r.right,left:r.left,edge:t.right,start:t.left};});
  expect(rects.right).toBeLessThanOrEqual(rects.edge+1);
  expect(rects.left).toBeGreaterThanOrEqual(rects.start-1);
  await page.setViewportSize({width:360,height:800});
  const bounds=await page.getByTestId('dataset-tabs').evaluate(el=>({right:el.getBoundingClientRect().right,next:document.querySelector('[data-testid=dataset-telemetry]').getBoundingClientRect().left}));
  expect(bounds.right).toBeLessThanOrEqual(bounds.next);
});

test('quality: core dialogs expose named controls and readable text',async({page},testInfo)=>{
  const {default:AxeBuilder}=await import('@axe-core/playwright');
  await page.goto('/?demo=retail'); await ready(page);
  const issues=[];
  for(const entry of [page.getByRole('button',{name:'格式与数值',exact:true}),page.getByRole('button',{name:/工作区 ·/}),page.getByRole('button',{name:'打开指令面板',exact:true})]) {
    await entry.click();
    const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
    if (await dialog.getByRole('button',{name:'+ 新建衍生计算指标',exact:true}).count()) {
      await dialog.getByRole('button',{name:'+ 新建衍生计算指标',exact:true}).click();
      await dialog.getByLabel('启用自定义阈值高亮规则',{exact:true}).check();
    }
    const result=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    issues.push(...result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    await page.keyboard.press('Escape');
  }
  await testInfo.attach('dialog-accessibility',{body:JSON.stringify(issues,null,2),contentType:'application/json'});
  console.log('Dialog accessibility',JSON.stringify(issues));
  expect(issues).toEqual([]);
});

test('quality: clipboard denial has an accessible paste fallback and real parsing',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{readText:async()=>{throw new Error('Permission denied');}}}));
  await page.setViewportSize({width:640,height:450});
  await page.goto('/');
  const entry=page.getByRole('button',{name:/粘贴剪贴板数据/});
  await entry.click();
  const dialog=page.getByRole('dialog',{name:'快速粘贴表格数据',exact:true});
  expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();
  await entry.click();
  await dialog.getByLabel('粘贴的表格文本',{exact:true}).fill('Region,Value\nEast,12\nWest,25');
  await dialog.getByRole('button',{name:'解析并导入为数据集',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true})).toContainText('2 行数据');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test.describe('touch controls',()=>{
  test.use({isMobile:true,hasTouch:true,viewport:{width:360,height:800}});
  test('quality: touch targets have room for fingers',async({page})=>{
    await page.goto('/?demo=retail'); await ready(page);
    expect(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches)).toBe(true);
    await page.getByRole('button',{name:/字段列表/}).tap();
    const small=await page.locator('button:visible,select:visible').evaluateAll(els=>els.filter(el=>{const r=el.getBoundingClientRect();return r.width<32||r.height<32}).map(el=>el.outerHTML.slice(0,100)));
    expect(small).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  });
});
