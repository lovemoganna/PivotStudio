import {test,expect} from '@playwright/test';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const chart=page=>page.locator('#pivot-chart-container');
const labels=page=>chart(page).locator('[data-value-label], .recharts-label-list text');
async function options(page) { await page.getByRole('button',{name:'图表选项',exact:true}).click(); }
async function close(page) { await page.getByRole('button',{name:'关闭图表选项',exact:true}).click(); }
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto('/?demo=retail'); await ready(page);
  await page.getByRole('button',{name:'仅图表',exact:true}).click();
});

for (const width of [360,768,1440]) test(`labels: visible controls and geometry at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  await options(page);
  const toggle=page.getByRole('checkbox',{name:'显示数值标签',exact:true});
  const position=page.getByRole('combobox',{name:'标签位置',exact:true});
  await expect(toggle).toBeChecked();
  for (const value of ['inside','top','insideBottom']) {
    await position.selectOption(value); await close(page);
    await expect(labels(page).first()).toBeVisible();
    const label=labels(page).first();
    const y=Number(await label.getAttribute('y'));
    // Match the first label to its corresponding bar by the shared Bar parent.
    const bar=chart(page).locator('.recharts-bar').first();
    const rect=await bar.locator('.recharts-bar-rectangle path').first().evaluate(el=>{const r=el.getBBox();return {y:r.y,height:r.height};});
    if(value==='inside') expect(Math.abs(y-(rect.y+rect.height/2))).toBeLessThan(1);
    if(value==='top') expect(y).toBeLessThan(rect.y);
    if(value==='insideBottom') expect(Math.abs(y-(rect.y+rect.height-8))).toBeLessThan(1);
    await options(page);
  }
  await toggle.uncheck(); await expect(position).toBeDisabled(); await close(page);
  await expect(labels(page)).toHaveCount(0);
  await options(page); await toggle.check(); await expect(position).toHaveValue('insideBottom');
  await page.screenshot({path:info.outputPath(`label-controls-${width}.png`)});
  await close(page);
  const svgDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出',exact:true}).click();
  await page.getByRole('menuitem',{name:'.SVG',exact:true}).click();
  const {readFile}=await import('node:fs/promises');
  expect(await readFile(await(await svgDownload).path(),'utf8')).toContain('data-value-label');
});

test('labels: all chart families respect visibility and applicable positions',async({page})=>{
  for(const type of ['pie','donut','heatmap','funnel','line','area','stacked_area','pct_area','combo','waterfall','histogram','horizontal_bar','pct_stacked_bar','scatter']) {
    await page.getByRole('combobox',{name:'选择图表类型'}).selectOption(type);
    await ready(page); await options(page);
    const toggle=page.getByRole('checkbox',{name:'显示数值标签',exact:true});
    await toggle.check();
    const position=page.getByRole('combobox',{name:'标签位置',exact:true});
    const value=['pie','donut'].includes(type)?'inside':type==='heatmap'?'insideBottom':type==='funnel'?'inside':'top';
    await position.selectOption(value); await close(page);
    await expect(labels(page).first(),`labels for ${type}`).toBeVisible();
    if(type==='pct_stacked_bar') expect(await labels(page).first().textContent()).toContain('%');
    await options(page); await toggle.uncheck(); await close(page);
    await expect(labels(page)).toHaveCount(0);
  }
});

test('labels: signed values retain correct rectangle placement and zero labels',async({page})=>{
  await page.locator('input[type=file]').first().setInputFiles({name:'signed-labels.csv',mimeType:'text/csv',buffer:Buffer.from('Group,Amount\nPositive,100\nNegative,-50\nZero,0')});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  await page.getByRole('button',{name:'+行 · 添加「Group」到行分组',exact:true}).click();
  await page.getByRole('button',{name:'+值 · 添加「Amount」到计算指标',exact:true}).click();await ready(page);
  for(const type of ['bar','horizontal_bar']) {
    await page.getByRole('combobox',{name:'选择图表类型'}).selectOption(type);await ready(page);
    await options(page);await page.getByRole('combobox',{name:'标签位置',exact:true}).selectOption('inside');await close(page);
    const values=await chart(page).locator('[data-value-label]').allTextContents();
    expect(values).toEqual(expect.arrayContaining(['100','-50','0']));
    const rects=await chart(page).locator('.recharts-bar-rectangle path').evaluateAll(els=>els.map(el=>{const r=el.getBBox();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
    const positions=await chart(page).locator('[data-value-label]').evaluateAll(els=>els.map(el=>({x:Number(el.getAttribute('x')),y:Number(el.getAttribute('y'))})));
    // Zero bars have no area, so compare the two signed nonzero rectangles.
    for(let i=0;i<2;i++) {
      expect(Math.abs(positions[i].x-(rects[i].x+rects[i].w/2))).toBeLessThan(1);
      expect(Math.abs(positions[i].y-(rects[i].y+rects[i].h/2))).toBeLessThan(1);
    }
  }
});
