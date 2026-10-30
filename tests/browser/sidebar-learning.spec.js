import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {ensureMobileShelves} from './_mobileShelves.js';
import {clickExport} from './_toolbar.js';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440]) {
  test(`learning: unused status, undo and location without mutation at ${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:900});await page.goto('/?demo=retail');await ready(page);await ensureMobileShelves(page,width);
    await page.getByRole('button',{name:/^未使用/}).click();
    await expect(page.getByRole('button',{name:/^未使用/})).toHaveText('未使用 (7)');
    await expect(page.getByTestId('field-销售额')).toHaveCount(0);
    await page.getByRole('button',{name:'+值 · 添加「成本」到计算指标',exact:true}).press('Enter');await ready(page);
    await expect(page.getByRole('button',{name:/^未使用/})).toHaveText('未使用 (6)');
    await expect(page.getByRole('button',{name:/^未使用/})).toBeFocused();
    await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
    await expect(page.getByRole('button',{name:/^未使用/})).toHaveText('未使用 (7)');
    await page.getByRole('button',{name:'全部 (12)',exact:true}).click();
    if(width>=768) await page.getByRole('button',{name:'字段',exact:true}).click();
    const before=await page.locator('#pivot-main-html-table').textContent();
    await page.getByRole('button',{name:'定位已配置字段 · 销售额 · 值',exact:true}).press('Enter');
    await expect(page.locator('[data-configured-field="销售额"][data-zone="values"]')).toBeFocused();
    await expect(page.locator('#pivot-main-html-table')).toHaveText(before);
    await expect(page.getByTestId('zone-values').getByTestId('configured-field')).toHaveCount(2);
    await page.screenshot({path:info.outputPath(`location-${width}.png`),fullPage:true});
  });
  test(`learning: one next step and aggregation before adding at ${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:900});await page.goto('/');
    await page.locator('input[type=file]').first().setInputFiles({name:'learning-orders.csv',mimeType:'text/csv',buffer:Buffer.from('Region,Amount\nEast,100\nEast,200\nWest,300\nWest,400')});
    await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);await ensureMobileShelves(page,width);
    const guide=page.getByTestId('analysis-next-step');
    await expect(guide).toContainText('先选择要计算的指标');
    await guide.getByRole('button',{name:'选择指标',exact:true}).click();
    const dialog=page.getByRole('dialog');
    const aggregation=dialog.getByRole('combobox',{name:'Amount · 添加前计算方式',exact:true});
    await expect(aggregation).toHaveValue('sum');
    const textAggregation=dialog.getByRole('combobox',{name:'Region · 添加前计算方式',exact:true});
    await expect(textAggregation.locator('option')).toHaveCount(2);
    await aggregation.selectOption('avg');
    await page.screenshot({path:info.outputPath(`aggregation-${width}.png`)});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await dialog.getByTestId('field-picker-option').filter({has:page.getByText('Amount',{exact:true})}).click();await ready(page);
    await expect(page.getByTestId('zone-values').getByLabel('切换聚合口径',{exact:true})).toHaveValue('avg');
    await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('250');
    await expect(guide).toContainText('如需比较不同分组');
    await guide.getByRole('button',{name:'选择分组',exact:true}).click();
    await page.getByRole('dialog').getByTestId('field-picker-option').filter({has:page.getByText('Region',{exact:true})}).click();await ready(page);
    await expect(guide).toHaveCount(0);
    await expect(page.locator('[data-configured-field="Region"][data-zone="rows"]')).toBeFocused();
    await page.getByRole('button',{name:'撤销',exact:true}).click();await ready(page);await expect(guide).toContainText('如需比较不同分组');
    await page.getByRole('button',{name:'重做',exact:true}).click();await ready(page);await expect(guide).toHaveCount(0);
    const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
    const book=XLSX.read(await readFile(await(await download).path()));
    const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
    expect(rows.at(-1).at(-1)).toBe(250);
  });
}

test('learning: native aggregation keyboard navigation stays in the select',async({page})=>{
  await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('button',{name:'+字段 · 添加字段到值（要算的数）',exact:true}).click();
  const selector=page.getByRole('combobox',{name:'销售额 · 添加前计算方式',exact:true});
  await selector.selectOption('sum');await selector.press('ArrowDown');await selector.press('ArrowDown');
  await expect(selector).toHaveValue('avg');await expect(selector).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('zone-values').getByTestId('configured-field')).toHaveCount(2);
});

test('learning: English usage labels remain visible, accessible and navigable',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('pivotstudio_locale','en');localStorage.setItem('pivotstudio_theme','dark');});
  await page.goto('/?demo=retail');await ready(page);
  await page.getByRole('button',{name:'Fields',exact:true}).click();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:/^Locate configured field · 销售额 ·/}).press('Enter');
  await expect(page.locator('[data-configured-field="销售额"][data-zone="values"]')).toBeFocused();
});
