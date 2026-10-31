import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {encodeView} from '../../src/utils/viewConfig.js';
import {ensureMobileShelves} from './_mobileShelves.js';

const measure='Measurement_value_in_units_with_a_very_long_source_column_name';
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
for(const width of [360,768,1370]) test(`clarity: relevant guidance and usable shelves at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:width===1370?1131:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  const cfg={fullConfig:{rows:[{id:'r',field:'Group'}],columns:[{id:'c',field:'Period'}],filters:[],values:[{id:'v',field:measure,agg:'avg'},{id:'v2',field:'Capacity',agg:'sum'}]},ct:'bar'};
  await page.goto('/#share_token='+encodeURIComponent(encodeView(cfg)));
  await page.locator('input[type=file]').first().setInputFiles({name:'observations-with-a-long-imported-filename.csv',mimeType:'text/csv',buffer:Buffer.from(`Group,Period,${measure},Capacity\nAlpha,P1,10,100\nAlpha,P2,20,200\nBeta,P1,,300\nBeta,P2,0,400`)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
  if(width!==360) {
    await page.getByRole('combobox',{name:'主题模式',exact:true}).selectOption({label:'深色'});
    await expect(page.getByRole('button',{name:'行列互换',exact:true})).toHaveCSS('color','rgb(248, 248, 242)');
  }
  const status=page.getByTestId('dataset-telemetry');
  await expect(status).toContainText('4 / 4 行');
  await expect(status).not.toContainText(/ms|行就绪/);
  const tab=page.getByTestId('dataset-tabs');
  // The importer includes a row suffix in the dataset name; do not add a second counter.
  expect((await tab.innerText()).match(/\(4行\)/g)).toHaveLength(1);
  await expect(tab.getByRole('button',{name:'打开数据集：observations-with-a-long-imported-filename.csv (4行)',exact:true})).toHaveAttribute('title','observations-with-a-long-imported-filename.csv (4行)');
  const reading=page.getByTestId('total-reading');
  await expect(reading.locator('summary')).toContainText('计算与数据说明');
  await expect(reading.locator('summary')).toContainText('有排除项');
  await expect(page.getByTestId('sample-evidence')).not.toBeVisible();
  await reading.locator('summary').press('Enter');
  await expect(page.getByTestId('sample-evidence')).toContainText('空值排除 1');
  await expect(reading).toContainText('不是各组平均值的简单平均');
  // Desktop split panes have fixed height; mobile uses the normal document flow.
  if(width>=768) await expect.poll(()=>page.getByTestId('result-reading').evaluate(el=>el.getBoundingClientRect().height/el.parentElement.getBoundingClientRect().height)).toBeLessThanOrEqual(.405);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await reading.locator('summary').press('Enter');
  await expect(page.getByTestId('sample-evidence')).not.toBeVisible();
  await ensureMobileShelves(page,width);
  if(width>=768) await page.getByRole('button',{name:'配置',exact:true}).click();
  const grid=page.getByTestId('config-zones');
  const values=page.getByTestId('zone-values');
  const fit=async()=>{
    await expect.poll(()=>values.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    // The existing sidebar/card transitions settle after a keyboard resize.
    // Compare usable grid width, excluding native scrollbars and padding.
    await expect.poll(()=>values.evaluate(el=>{
      const grid=el.closest('[data-testid="config-zones"]'),style=getComputedStyle(grid);
      const usable=grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      return Math.abs(el.getBoundingClientRect().width-usable);
    })).toBeLessThanOrEqual(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  };
  await fit();
  await expect(values.getByTestId('configured-field-name').first()).toHaveText(measure);
  await expect(values).toContainText('计算');await expect(values).toContainText('显示');
  const empty=page.getByRole('button',{name:'可选 · 添加筛选字段',exact:true});
  await empty.press('Enter');
  await expect(page.getByRole('dialog',{name:'添加字段到筛选（限定范围）',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(empty).toBeFocused();
  if(width>=768) {
    const resize=page.getByRole('separator',{name:'调节侧边栏宽度',exact:true});
    await resize.press('Home');await fit();
    await expect.poll(async()=>{
      const r=await page.getByTestId('zone-rows').boundingBox(),c=await page.getByTestId('zone-columns').boundingBox();return Math.abs(r.x-c.x);
    }).toBeLessThanOrEqual(1);
    await resize.press('End');await fit();
    await expect.poll(async()=>{
      const r=await page.getByTestId('zone-rows').boundingBox(),c=await page.getByTestId('zone-columns').boundingBox();return Math.abs(r.y-c.y);
    }).toBeLessThanOrEqual(1);
    await resize.press('Enter');
  }
  await page.getByRole('button',{name:'阅读提示',exact:true}).click();
  await expect(page.getByTestId('chart-guide-note')).not.toContainText('比较各组高低，找出最高与最低。');
  await expect(page.getByTestId('chart-metric-reading')).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath(`clarity-${width}.png`),fullPage:true});
});
