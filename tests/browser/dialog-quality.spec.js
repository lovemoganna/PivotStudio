import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';

test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

test('startup: selecting a file immediately after render survives effect replay',async({page})=>{
  for(let attempt=0;attempt<5;attempt++){
    await page.goto('/?startup='+attempt);
    await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-fast-start.csv',mimeType:'text/csv',buffer:Buffer.from('Region,Value\nEast,12\nWest,25')});
    await expect(page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true})).toContainText('2 行数据');
    await page.keyboard.press('Escape');
  }
});

test('dialogs: shortcuts guide remains reachable in a short phone viewport',async({page},info)=>{
  await page.setViewportSize({width:360,height:450});await page.goto('/');
  await page.getByRole('button',{name:'快捷键指南',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.screenshot({path:info.outputPath('shortcuts-short.png')});
  const bounds=await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(450);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('dialogs: numeric grouping has named fields and preserves long titles at 360px',async({page},info)=>{
  const field='AmountWithAnExtremelyLongBusinessFieldName';
  const config={fullConfig:{rows:[{id:'r',field}],columns:[],values:[{id:'v',field:'Value',agg:'sum'}],filters:[]}};
  await page.setViewportSize({width:360,height:450});
  await page.goto('/#share_token='+encodeURIComponent(encodeView(config)));
  await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-grouping.csv',mimeType:'text/csv',buffer:Buffer.from(`${field},Value\n10,12\n25,25`)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
  await page.getByRole('button',{name:/分析配置/}).click();
  await page.getByTestId('zone-rows').getByRole('button',{name:'组',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'字段分组设置',exact:true});
  await page.screenshot({path:info.outputPath('grouping-long.png')});
  expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  const axe=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  await info.attach('axe-grouping',{body:JSON.stringify(axe.violations,null,2),contentType:'application/json'});
  expect(axe.violations).toEqual([]);
  await dialog.getByLabel('起始值 (Start):',{exact:true}).fill('0');
  await dialog.getByLabel('区间步长 (Step > 0):',{exact:true}).fill('20');
  await dialog.getByRole('button',{name:'应用区间分组',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
  await expect(page.locator('#pivot-main-html-table')).toContainText('[0, 20)');
});
