import { test, expect } from '@playwright/test';
const upload = (page, buffer, name='data.csv') => page.locator('input[type=file]').first().setInputFiles({name,mimeType:'text/csv',buffer:Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer)});
const preview = page => page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
const ready = async page => { await expect(page.locator('progress[aria-label="计算进度"]')).toHaveCount(0); };

test('R1 500k CSV responds, shows progress, and cancels',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{window.ticks=0;window.timer=setInterval(()=>window.ticks++,20)});
  const csv='区域,金额\n'+Array.from({length:500000},(_,i)=>`区域${i%10},${i%100}`).join('\n');
  await upload(page,csv,'500k.csv');
  await expect(page.locator('progress[aria-label="导入进度"]')).toBeVisible();
  await expect(preview(page)).toContainText('500000 行');
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.getByText(/500,000 \/ 500,000 行/).first()).toBeVisible();
  await ready(page);
  await page.getByRole('button',{name:'切换主题',exact:true}).click();
  expect(await page.evaluate(()=>window.ticks)).toBeGreaterThan(10);
  await upload(page,csv,'cancel.csv');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await expect(page.locator('progress[aria-label="导入进度"]')).toHaveCount(0);
});

test('R2 GBK Chinese preview, delimiter, header and field overrides',async({page})=>{
  await page.goto('/');
  const gbk=Buffer.from([0xd0,0xd5,0xc3,0xfb,0x3b,0xbd,0xf0,0xb6,0xee,0x0a,0xd5,0xc5,0xc8,0xfd,0x3b,0x31,0x32]);
  await upload(page,gbk,'gbk.csv');
  await expect(preview(page)).toContainText('张三');
  await expect(preview(page)).toContainText('GBK');
  const field=preview(page).locator('select').last();
  await field.selectOption('text');
  await expect(field).toHaveValue('text');
  await preview(page).getByLabel('表头',{exact:true}).selectOption('no');
  await expect(preview(page)).toContainText('2 行数据');
  await preview(page).getByLabel('表头',{exact:true}).selectOption('yes');
  await expect(preview(page)).toContainText('1 行数据');
  await page.getByRole('button',{name:'关闭文件预览',exact:true}).click();
  await upload(page,'区域\t日期\t金额\n'+Array.from({length:25},(_,i)=>`华东\t2026-10-20\t${i}`).join('\n'),'tab.tsv');
  await expect(preview(page)).toContainText('25 行数据');
  await expect(preview(page).locator('tbody tr')).toHaveCount(20);
  await expect(preview(page).locator('select').last()).toHaveValue('number');
});

test('R3 four-zone drag/drop, aggregations, history and 100k refresh budget',async({page})=>{
  await page.goto('/');
  await upload(page,'区域,渠道,金额\n'+Array.from({length:100000},(_,i)=>`区域${i%5},渠道${i%2},${i%100}`).join('\n'));
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'仅导入数据（清空当前透视）',exact:true}).click();
  await ready(page);
  for(const [field,zone] of [['区域','rows'],['渠道','columns'],['金额','values'],['区域','filters']]) {
    await page.getByTestId(`field-${field}`).dragTo(page.getByTestId(`zone-${zone}`));
    await expect(page.getByTestId(`zone-${zone}`)).toContainText(field);
    await ready(page);
  }
  const agg=page.getByLabel('切换聚合口径',{exact:true}).first();
  for(const value of ['count','avg','count_distinct','sum']) {
    const start=Date.now();
    await agg.selectOption(value);
    await expect(agg).toHaveValue(value);
    await ready(page);
    const elapsed=Date.now()-start;
    console.log('R3 refresh',value,elapsed,'ms');
    expect(elapsed).toBeLessThan(1000);
  }
  await page.getByLabel('快捷表计算',{exact:true}).first().selectOption('pct_grand');
  await ready(page);
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  await expect(page.getByLabel('快捷表计算',{exact:true}).first()).toHaveValue('normal');
  await page.getByRole('button',{name:'重做',exact:true}).click();
  await expect(page.getByLabel('快捷表计算',{exact:true}).first()).toHaveValue('pct_grand');
});
