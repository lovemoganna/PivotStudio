import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {ensureMobileShelves} from './_mobileShelves.js';
import {clickExport} from './_toolbar.js';

const ready=page=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const csv='门店,月份,订单金额,订单编号\n东店,一月,100,O1\n东店,一月,300,O2\n东店,二月,500,O3\n西店,一月,900,O4\n西店,二月,,O5\n西店,二月,0,O6';
async function start(page,width) {
  await page.goto('/');
  await page.locator('input[type=file]').first().setInputFiles({name:'explicit-unfamiliar-orders.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();await ready(page);
  await ensureMobileShelves(page,width);
  for(const name of ['+行 · 添加「门店」到行分组','+列 · 添加「月份」到列比较','+值 · 添加「订单金额」到计算指标']) {
    await page.getByRole('button',{name,exact:true}).press('Enter');await ready(page);
  }
  await page.getByRole('button',{name:'仅透视表',exact:true}).click();
}
test.beforeEach(async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});
for(const width of [360,768,1440]) test(`understanding: unequal groups, empty/zero, scope, history and export at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await start(page,width);
  const help=page.getByTestId('total-reading');
  await expect(help).not.toHaveAttribute('open','');
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('avg');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('360');
  await help.locator('summary').press('Enter');await expect(help).toHaveAttribute('open','');
  await expect(help).toContainText('0 会参与');await expect(help).toContainText('不是各组平均值的简单平均');
  await page.getByRole('button',{name:'西店 (3)',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('450');
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('当前筛选范围');
  await expect(page.locator('#pivot-main-html-table tfoot')).not.toContainText('全量聚合');
  await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('360');
  await page.getByRole('button',{name:'重做',exact:true}).press('Enter');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('450');
  const download=page.waitForEvent('download');await clickExport(page,'.XLSX');
  const book=XLSX.read(await readFile(await(await download).path()));
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:true});
  expect(rows.at(-1).at(-1)).toBe(450);
  for(const theme of ['dark','light']) {
    await page.getByLabel('主题模式',{exact:true}).selectOption(theme);
    await expect(page.getByRole('button',{name:'行列互换',exact:true})).toHaveCSS('color',theme==='dark'?'rgb(248, 248, 242)':'rgb(39, 40, 34)');
    await page.screenshot({path:info.outputPath(`understanding-${width}-${theme}.png`),fullPage:true});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  await help.locator('summary').press('Enter');await expect(help).not.toHaveAttribute('open','');
  await expect(help.locator('summary')).toBeFocused();
});

test('understanding: count and average advice tracks changed definitions, including English',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await start(page,1440);
  const help=page.getByTestId('total-reading');await help.locator('summary').press('Enter');
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('count');await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('5 笔');
  await expect(help).toContainText('包括非空文本');await expect(help).not.toContainText('平均值 =');
  await page.getByLabel('切换聚合口径',{exact:true}).selectOption('avg');await ready(page);
  await page.getByLabel('快捷表计算',{exact:true}).selectOption('pct_grand');await ready(page);
  await expect(help).toContainText('显示值不一定能直接相加');
  await page.getByLabel('界面语言',{exact:true}).selectOption('en');
  await expect(help.locator('summary')).toHaveText('How are totals calculated?');
  await expect(help).toContainText('zero is included');await expect(help).toContainText('not a simple average');
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
