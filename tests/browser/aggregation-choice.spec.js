import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440])for(const locale of ['zh','en'])test(`choice: contextual definitions, cancel and keyboard at ${width} ${locale}`,async({page},info)=>{
  const en=locale==='en';await page.setViewportSize({width,height:1000});
  await page.addInitScript(({locale})=>{localStorage.setItem('pivotstudio_locale',locale);localStorage.setItem('pivotstudio_theme',locale==='en'?'light':'dark');},{locale});
  await page.goto('/');
  const long='Reference_identifier_with_a_long_name_for_readability';
  const names=['Cohort',long,'Reading',...Array.from({length:45},(_,i)=>`Extra_${i}`)];
  const data=[['A','ID-1',10],['A','ID-1',20],['A','',0],['B','ID-2',30],['B','',40]];
  await page.locator('input[type=file]').first().setInputFiles({name:'arbitrary-schema.csv',mimeType:'text/csv',buffer:Buffer.from(names.join(',')+'\n'+data.map(row=>[...row,...Array(45).fill('X')].join(',')).join('\n'))});
  await page.getByRole('button',{name:en?'Import data only (clear pivot)':'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  if(width>=768)await page.getByRole('button',{name:en?'Zones':'配置',exact:true}).click();
  else{
    const shelf=page.getByRole('button',{name:en?/Pivot configuration/:/分析配置/});
    if(await shelf.getAttribute('aria-expanded')==='false')await shelf.click();
  }
  const open=page.getByRole('button',{name:en?'+ Field · Add field to Values (measure)':'+字段 · 添加字段到值（要算的数）',exact:true});
  await open.press('Enter');const dialog=page.getByRole('dialog');
  const search=dialog.getByRole('searchbox');await expect(search).toBeFocused();
  await expect(dialog.getByTestId('aggregation-choice-description').first()).toContainText(en?'including records with empty fields':'字段为空也计入');
  expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight&&el.scrollWidth<=el.clientWidth)).toBe(true);
  await search.fill(long);
  const select=dialog.getByRole('combobox');
  await expect(select.locator('option[value=count]')).toHaveText(en?'Non-empty count':'有效值计数');
  await expect(dialog.getByTestId('aggregation-choice-description')).toContainText(en?'including 0, false':'0、否');
  const descriptionId=await select.getAttribute('aria-describedby');
  await expect(dialog.locator(`[id="${descriptionId}"]`)).toContainText(en?'non-empty':'非空');
  await select.selectOption('count_distinct');
  await expect(dialog.getByTestId('aggregation-choice-description')).toContainText(en?'duplicates once':'重复值只计一次');
  await expect(select.locator('option[value=count_distinct]')).toHaveText(en?'Distinct count':'去重计数');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`choice-${width}-${locale}.png`)});
  await select.press('Escape');await expect(dialog).toHaveCount(0);await expect(open).toBeFocused();
  await expect(page.getByTestId('zone-values').getByTestId('configured-field')).toHaveCount(0);
  await open.press('Enter');await page.getByRole('dialog').getByRole('searchbox').fill('Reading');
  const numeric=page.getByRole('dialog').getByRole('combobox');
  await numeric.selectOption('stddev');
  await expect(page.getByRole('dialog').getByTestId('aggregation-choice-description')).toContainText('n−1');
  await numeric.selectOption('avg');
  await expect(page.getByRole('dialog').getByTestId('aggregation-choice-description')).toContainText(en?'include 0':'0 参与');
  await page.getByRole('dialog').getByTestId('field-picker-option').press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('20');
  await page.getByTestId('zone-values').getByRole('combobox',{name:en?'Aggregation':'切换聚合口径',exact:true}).selectOption('count');await ready(page);
  // The existing count formatter emits the same unit in both locales.
  // Keep the exact numeric contract; unit localization is a separate known gap.
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('5 笔');
  await expect(page.getByTestId('value-measure-hint')).toContainText(en?'including 0, false':'0、否');
  expect(await page.getByTestId('zone-values').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`configured-${width}-${locale}.png`),fullPage:true});
});
