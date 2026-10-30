import {test,expect} from '@playwright/test';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
test.beforeEach(async ({page}) => {
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
async function importAndOpen(page,csv) {
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'explicit-preset-boundaries.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  await page.getByRole('button',{name:/^指标中心/}).click();
  return page.getByTestId('metric-center');
}

for (const width of [360,768,1440]) test(`trust boundary: long fields wrap and direct add is reachable at ${width}`,async ({page},info)=>{
  await page.setViewportSize({width,height:900});
  const amount='Amount_'+ 'LongFieldName'.repeat(8);
  const count='Quantity_'+ 'AnotherLongName'.repeat(6);
  const center=await importAndOpen(page,`Region,${amount},${count}\nA,10,2\nB,20,4`);
  const recipe=center.getByTestId('metric-preset-preset_ratio');
  await expect(recipe).toBeVisible();
  expect(await recipe.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  const add=center.getByTestId('metric-preset-add-preset_ratio');
  await expect(add).toHaveAttribute('aria-label',`+上表：${count}÷${amount} 比值 (%)`);
  await recipe.press('Enter');await expect(center.getByTestId('metric-live-preview')).toContainText('20.0%');
  await page.screenshot({path:info.outputPath(`long-presets-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await add.press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('20.0%');
});

test('trust boundary: missing safe templates leaves rate and average fields fully editable',async ({page})=>{
  const center=await importAndOpen(page,'Region,ConversionRate,Age\nA,0.1,20\nB,0.3,40');
  await expect(center.getByTestId('metric-preset-preset_ratio')).toHaveCount(0);
  await center.getByRole('button',{name:'FX 高级公式表达式',exact:true}).click();
  await center.getByLabel('自定义指标名称',{exact:true}).fill('Mean conversion rate');
  await center.getByLabel('自定义指标公式表达式',{exact:true}).fill('AVG([ConversionRate])');
  await center.getByLabel('自定义指标数值格式',{exact:true}).selectOption('percent');
  await expect(center.getByTestId('metric-live-preview')).toContainText('20.0%');
  await center.getByTestId('metric-center-submit').press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('20.0%');
});
