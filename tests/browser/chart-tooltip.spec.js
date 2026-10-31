import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';

for(const width of [360,768,1440]) for(const theme of ['浅色','深色']) test(`chart tooltip: opaque readable surface at ${width} ${theme}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  const cfg={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[],filters:[],values:[{id:'v',field:'Reading',agg:'sum',format:{decimals:0,thousands:true}}]}};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await page.locator('input[type=file]').first().setInputFiles({name:'readings.csv',mimeType:'text/csv',buffer:Buffer.from('Group,Reading,Reference\nAlpha,100,90\nBeta,250,220\nGamma,180,160')});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
  await page.getByRole('combobox',{name:'主题模式',exact:true}).selectOption({label:theme});
  await page.getByRole('button',{name:'仅图表',exact:true}).click();
  await page.locator('#pivot-chart-container .recharts-bar-rectangle path').first().hover();
  const tip=page.locator('.recharts-tooltip-wrapper').filter({visible:true});
  await expect(tip).toContainText('Alpha');
  await expect(tip).toContainText('100');
  const surface=tip.locator(':scope > div');
  const paint=await surface.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  console.log('tooltip paint',theme,paint);
  expect(paint.background).toBe(theme==='深色'?'rgb(30, 31, 28)':'rgb(255, 253, 247)');
  expect(paint.color).toBe(theme==='深色'?'rgb(248, 248, 242)':'rgb(39, 40, 34)');
  const bounds=await surface.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  // The swatch comes from series metadata, not a CSS background url(#gradient).
  await expect(tip.locator('span[style]').first()).toHaveCSS('background-color','rgb(249, 38, 114)');
  await expect(page.locator('#pivot-chart-container .recharts-tooltip-cursor')).toHaveAttribute('fill-opacity','0.045');
  const results=await new AxeBuilder({page}).include('.recharts-tooltip-wrapper').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`tooltip-${theme}.png`)});
  if(width===1440) for(const [type,selector] of [
    ['line','.recharts-line-dots circle'],['pie','.recharts-pie-sector'],
    ['waterfall','.recharts-bar-rectangle path'],['histogram','.recharts-bar-rectangle path'],
    ['scatter','.recharts-scatter-symbol'],
  ]) {
    await page.getByRole('combobox',{name:'选择图表类型'}).selectOption(type);
    const mark=page.locator('#pivot-chart-container').locator(selector).first();
    if(type==='line') {
      // WebKit can activate the larger dot while moving onto the ordinary dot.
      // Move the real pointer to the observed point; assert the resulting tooltip below.
      await expect(mark).toBeVisible();
      const point=await mark.boundingBox();
      await page.mouse.move(point.x+point.width/2,point.y+point.height/2);
    } else await mark.hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    if(type==='line') await expect(page.getByRole('tooltip')).toContainText('Alpha');
    await expect(page.getByRole('tooltip')).toHaveCSS('background-color',paint.background);
    const check=await new AxeBuilder({page}).include('.recharts-tooltip-wrapper').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(check.violations,`${theme} ${type}`).toEqual([]);
  }
});
