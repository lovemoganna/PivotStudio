import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as XLSX from 'xlsx';
import {encodeView} from '../../src/utils/viewConfig.js';

test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const preview=page=>page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});

for(const width of [360,768,1280,1440]) {
  test(`focus: multiple configured fields remain readable and editable at ${width}`,async({page})=>{
    const names=['销售区域完整业务字段名称','客户所属行业及细分市场','客户业务部门名称','统计日期','销售金额（人民币元）','销售利润（人民币元）','实际成交订单数量'];
    const config={fullConfig:{rows:names.slice(0,3).map((field,i)=>({id:'r'+i,field})),columns:[{id:'c',field:names[3]}],values:names.slice(4).map((field,i)=>({id:'v'+i,field,agg:'sum'})),filters:[{id:'f',field:names[0]}]}};
    await page.setViewportSize({width,height:1000});
    await page.goto('/#share_token='+encodeURIComponent(encodeView(config)));
    await page.locator('input[type=file]').first().setInputFiles({name:'explicit-synthetic-config.csv',mimeType:'text/csv',buffer:Buffer.from(names.join(',')+'\n华东,制造业,业务一部,2026-10-21,120,30,2\n华南,服务业,业务二部,2026-10-20,80,20,4')});
    await preview(page).getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
    if(width<768)await page.getByRole('button',{name:/分析配置/}).click();
    const labels=page.getByTestId('configured-field-name');await expect(labels).toHaveCount(8);
    const boxes=await labels.evaluateAll(els=>els.map(el=>({text:el.textContent,overflow:el.scrollWidth-el.clientWidth,font:parseFloat(getComputedStyle(el).fontSize),ellipsis:getComputedStyle(el).textOverflow})));
    for(const box of boxes){expect(box.overflow).toBeLessThanOrEqual(1);expect(box.font).toBeGreaterThanOrEqual(12);expect(box.ellipsis).not.toBe('ellipsis');}
    const rows=page.getByTestId('zone-rows');
    await rows.getByTestId('configured-field').nth(1).getByTitle('前移',{exact:true}).click();
    await expect(rows.getByTestId('configured-field-name').first()).toHaveText(names[1]);
    const values=page.getByTestId('zone-values');
    await values.getByLabel('切换聚合口径',{exact:true}).nth(1).selectOption('avg');await ready(page);
    await expect(values.getByLabel('切换聚合口径',{exact:true}).nth(1)).toHaveValue('avg');
    await values.getByRole('button',{name:'移除字段',exact:true}).last().click();await ready(page);
    await expect(values.getByTestId('configured-field-name')).toHaveCount(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`focus: long workbook names, sheet switching and column type calibration at ${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/');
    const book=XLSX.utils.book_new();
    const sheets=['第一季度销售明细_跨区域业务分析工作表','第二季度销售明细_跨区域业务分析工作表'];
    const field='客户所属行业及细分市场的完整业务字段名称';
    for(const [index,name] of sheets.entries())XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([[field,'Value'],[index?'第二季度真实解析值':'第一季度真实解析值',index?25:12]]),name);
    const filename='明确合成验证_跨区域销售经营分析_2026年季度汇总工作簿.xlsx';
    await page.locator('input[type=file]').first().setInputFiles({name:filename,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(book,{type:'buffer',bookType:'xlsx'})});
    const dialog=preview(page);await expect(dialog.getByTestId('import-file-name')).toHaveText(filename);
    await expect(dialog.getByTestId('import-sheet-name')).toHaveText(sheets[0]);
    await dialog.getByLabel('Value · 字段类型',{exact:true}).selectOption('text');
    await dialog.getByLabel('工作表',{exact:true}).selectOption('1');
    await expect(dialog.getByTestId('import-sheet-name')).toHaveText(sheets[1]);
    await expect(dialog.locator('tbody')).toContainText('第二季度真实解析值');
    await expect(dialog.getByLabel('Value · 字段类型',{exact:true})).toHaveValue('number');
    await dialog.getByLabel('工作表',{exact:true}).selectOption('0');
    await expect(dialog.getByLabel('Value · 字段类型',{exact:true})).toHaveValue('text');
    expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    const axe=await new AxeBuilder({page}).include('[role=dialog]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
    await dialog.getByLabel('工作表',{exact:true}).selectOption('1');
    await dialog.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
    await expect(page.locator('#pivot-main-html-table')).toContainText('第二季度真实解析值');
    await expect(page.getByTestId('pivot-value-cell').first()).toContainText('25');
  });
}

test('focus: start page prioritizes import, paste and examples without diagnostic prose',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/');
  const start=page.getByTestId('start-page');
  await expect(start.getByRole('button',{name:'选择本地文件',exact:true})).toBeInViewport();
  await expect(start.getByRole('button',{name:'加载示例数据',exact:true})).toBeInViewport();
  expect((await start.innerText()).length).toBeLessThan(300);
  await expect(page.getByText('Zero Crash Architecture',{exact:true})).toHaveCount(0);
  await expect(page.getByText('系统内核算法自检',{exact:true})).toHaveCount(0);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(axe.violations).toEqual([]);
  await page.getByRole('button',{name:'加载示例数据',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
});
