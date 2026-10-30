import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {clickExport} from './_toolbar.js';

const ready = page => expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status', 'idle');
test.beforeEach(async ({page}) => {
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
});

async function studio(page, csv) {
  await page.goto(csv ? '/' : '/?demo=retail');
  if (csv) {
    await page.locator('input[type=file]').first().setInputFiles({name:'explicit-preset-trust.csv', mimeType:'text/csv', buffer:Buffer.from(csv)});
    await page.getByRole('button', {name:'仅导入数据（清空当前透视）', exact:true}).click();
  }
  await ready(page);
  await page.getByRole('button', {name:/^指标中心/}).click();
  const center = page.getByTestId('metric-center');
  await center.getByRole('tab', {name:/新建自定义指标/}).click();
  return center;
}

test('trust: retail presets never sum a region or equate customer types with customers', async ({page}) => {
  const center = await studio(page);
  await expect(center.getByRole('button', {name:/毛利率.*销售大区/})).toHaveCount(0);
  await expect(center.getByRole('button', {name:/客单价.*客户类型/})).toHaveCount(0);
  await expect(center.getByRole('button', {name:/销售额.*销量.*净率/})).toHaveCount(0);
  await center.getByTestId('metric-preset-preset_gross_margin').click();
  await expect(center.getByLabel('自定义指标首项字段', {exact:true})).toHaveValue('销售额');
  await expect(center.getByLabel('自定义指标次项字段', {exact:true})).toHaveValue('成本');
  await expect(center.getByTestId('metric-live-preview')).not.toContainText('SUM([销售大区])');
  await expect(center.getByLabel('业务口径说明', {exact:true})).not.toHaveValue(/真实|毛利率/);
});

for (const width of [360,768,1440]) test(`trust: review, add, filter, undo and export a supported formula at ${width}`, async ({page}, info) => {
  await page.setViewportSize({width,height:900});
  const center = await studio(page, '区域,销售额,成本,销量\n华东,100,60,2\n华东,200,100,3\n华南,100,90,1');
  await center.getByTestId('metric-preset-preset_gross_margin').press('Enter');
  await expect(center.getByTestId('metric-live-preview')).toContainText('37.5%');
  await expect(center.getByTestId('metric-preset-guidance')).toBeVisible();
  await page.screenshot({path:info.outputPath(`preset-review-${width}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await center.getByTestId('metric-center-submit').press('Enter'); await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('37.5%');
  await center.getByRole('button', {name:'收起指标中心',exact:true}).click();
  await page.getByRole('button',{name:/^可用字段/}).count().then(async count=>{if(count)await page.getByRole('button',{name:/^可用字段/}).click();});
  await page.getByRole('button', {name:'+行 · 添加「区域」到行分组',exact:true}).press('Enter'); await ready(page);
  await expect(page.getByTestId('pivot-value-cell').first()).toHaveText('46.7%');
  await page.getByLabel('选择字段切片器',{exact:true}).selectOption('区域');
  await page.getByRole('button',{name:'华东 (2)',exact:true}).click(); await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('46.7%');
  await page.getByRole('button',{name:'撤销',exact:true}).click(); await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('37.5%');
  await page.getByRole('button',{name:'重做',exact:true}).click(); await ready(page);
  await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText('46.7%');
  const download = page.waitForEvent('download'); await clickExport(page,'.XLSX');
  const book = XLSX.read(await readFile(await (await download).path()), {cellNF:true});
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {header:1,raw:false});
  expect(rows.at(-1).at(-1)).toBe('46.7%');
});

test('trust: ambiguous revenue fields and category names do not trigger business claims', async ({page}) => {
  const center = await studio(page, '区域,销售区域,客户类型,订单日期,收入,销售额,成本,Amount\nA,East,VIP,2026-01-01,100,100,60,20\nB,West,New,2026-01-02,200,200,100,30');
  await expect(center.getByTestId('metric-preset-preset_gross_margin')).toHaveCount(0);
  await expect(center.getByRole('button',{name:/客单价|转化率|万元/})).toHaveCount(0);
  await center.getByTestId('metric-preset-preset_ratio').click();
  await expect(center.getByLabel('业务口径说明',{exact:true})).not.toHaveValue(/占.*百分比/);
});
