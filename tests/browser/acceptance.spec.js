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

test('R4 chart drilldown, table highlight and four chart types',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await upload(page,'区域,金额\n'+Array.from({length:120},(_,i)=>`${i<80?'华东':'华南'},${i}`).join('\n'));
  await expect(preview(page)).toBeVisible();
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await expect(page.locator('#pivot-main-html-table')).toBeVisible();
  await ready(page);
  const cell=page.getByTestId('pivot-value-cell').first();
  await cell.click({position:{x:10,y:10}});
  await expect(page.locator('#pivot-chart-container path[stroke="#FD971F"]').first()).toBeVisible();
  await expect(page.getByRole('dialog',{name:'原始交易明细下钻',exact:true})).toHaveCount(0);
  await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
  const detail=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
  await expect(detail).toContainText('80 条记录');
  await expect(detail.locator('tbody tr')).toHaveCount(50);
  await page.keyboard.press('Escape');
  await cell.dblclick({position:{x:10,y:10}});
  await expect(detail).toContainText('80 条记录');
  await page.keyboard.press('Escape');
  for(const type of ['line','pie','heatmap','bar']) {
    await page.getByLabel('选择图表类型',{exact:true}).selectOption(type);
    await ready(page);
    await expect(page.locator('#pivot-chart-container svg').first()).toBeVisible();
    if(type==='heatmap') {
      await page.locator('svg[data-chart-svg] [role=button]').first().click();
      await expect(detail).toContainText('80 条记录');
      await page.keyboard.press('Escape');
    }
  }
});

test('R5 local named views, last deletion and data-free share restore',async({page,context})=>{
  await page.goto('/?demo=retail'); await ready(page);
  await page.getByLabel('切换聚合口径',{exact:true}).first().selectOption('avg'); await ready(page);
  await page.getByRole('button',{name:/工作区 ·/}).click();
  await page.getByPlaceholder('输入新工作区快照名称...').fill('本机视图');
  await page.getByRole('button',{name:'保存快照',exact:true}).click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1')));
  expect(stored[0].name).toBe('本机视图'); expect(stored[0]).not.toHaveProperty('rows');
  const link=await page.getByLabel('分享配置链接',{exact:true}).inputValue();
  expect(new URL(link).search).toBe('');
  const fresh=await context.newPage();
  await fresh.goto(link); await expect(fresh.locator('#pivot-main-html-table')).toHaveCount(0);
  await upload(fresh,'销售大区,商品类别,销售额,销量\n华东,数码,100,1\n华南,家居,300,2');
  await expect(preview(fresh)).toBeVisible();
  await fresh.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
  await ready(fresh);
  await expect(fresh.getByLabel('切换聚合口径',{exact:true}).first()).toHaveValue('avg');
  await fresh.close();
  await page.getByRole('button',{name:'删除',exact:true}).click();
  await expect(page.getByText('保存或切换本机工作区快照 (0)',{exact:true})).toBeVisible();
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1')).length)).toBe(0);
});
