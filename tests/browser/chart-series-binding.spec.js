import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {encodeView} from '../../src/utils/viewConfig.js';
import {parseCSVRecords} from '../../src/utils/csvParser.js';
import {tradeCsv} from './_tradeFixture.js';
import {clickExport} from './_toolbar.js';

const csv=process.env.USER_TRADE_CSV ? await readFile(process.env.USER_TRADE_CSV,'utf8') : tradeCsv;
const records=parseCSVRecords(csv).slice(1).filter(row=>row[0]!=='1');
const sums=new Map();
for(const row of records) sums.set(row[9],(sums.get(row[9])||0)+Number(row[16].replaceAll(',','')));
const grand=[...sums.values()].reduce((a,b)=>a+b,0);
const display=v=>v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const config={rows:[{id:'r',field:'对手用户id'}],columns:[],filters:[{id:'f',field:'序号',selectedValues:['2','3','4','5']}],values:[
  {id:'count',field:'买入数量',agg:'count'},
  {id:'sell',field:'卖出数量',agg:'count'},
  {id:'sum',field:'总成交金额',agg:'sum',format:{decimals:2,thousands:true}},
  {id:'share',field:'总成交金额',agg:'sum',showAs:'pct_grand'},
]};

for(const width of [360,768,1440]) test(`binding: counterparty sum/share/count remain distinct at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1100});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig:config,ct:'bar',csc:{primaryValueId:'sum',showDataLabels:true}})));
  await page.locator('input[type=file]').first().setInputFiles({name:'counterparty-analysis.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
  await expect(page.locator('#pivot-main-html-table thead')).toContainText('占总计百分比');
  await expect(page.locator('#pivot-main-html-table tfoot')).toContainText(display(grand));
  await page.getByRole('button',{name:'仅图表',exact:true}).click();
  const chart=page.locator('#pivot-chart-container');
  await expect(chart.locator('.recharts-legend-item-text')).toHaveText(['总成交金额（求和）']);
  const marks=chart.locator('.recharts-bar-rectangle path');
  await expect(marks).toHaveCount(2);
  // Axis tooltips work throughout a category's plot band, including subpixel bars.
  const hoverGroup=async i=>{
    const mark=await marks.nth(i).boundingBox();
    const plot=await chart.locator('.recharts-surface').first().boundingBox();
    await page.mouse.move(mark.x+mark.width/2,plot.y+60);
  };
  for(const [i,[id,sum]] of [...sums].entries()) {
    await hoverGroup(i);
    await expect(page.getByRole('tooltip')).toContainText(id);
    await expect(page.getByRole('tooltip')).toContainText(display(sum));
    await expect(page.getByRole('tooltip')).not.toContainText('有效值计数');
  }
  const measure=page.getByLabel('值字段',{exact:true});
  if(!await measure.isVisible())await page.getByRole('button',{name:/调整图表字段:/}).click();
  await expect(measure.locator('option[value="metric:share"]')).toHaveText('总成交金额（求和 · 占总计百分比）');
  await measure.selectOption('metric:share');await ready(page);
  await expect(chart.locator('.recharts-legend-item-text')).toHaveText(['总成交金额（求和 · 占总计百分比）']);
  for(const [i,[,sum]] of [...sums].entries()) {
    await hoverGroup(i);await expect(page.getByRole('tooltip')).toContainText((sum/grand*100).toFixed(1)+'%');
  }
  await measure.selectOption('metric:count');await ready(page);
  await expect(chart.locator('.recharts-legend-item-text')).toHaveText(['买入数量（有效值计数）']);
  await expect(chart.locator('.recharts-label-list')).toHaveText(['1 笔3 笔']);
  const row=page.getByLabel('行字段',{exact:true});
  await row.selectOption('用户id');await ready(page);
  await expect(row).toHaveValue('用户id');
  await page.getByRole('button',{name:'使用透视表配置',exact:true}).click();await ready(page);
  await expect(row).toHaveValue('对手用户id');
  await measure.selectOption('metric:sum');await ready(page);
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('combo');
  await page.getByRole('button',{name:'图表选项',exact:true}).click();
  await expect(page.getByLabel('主指标绑定:',{exact:true})).toHaveValue('sum');
  await expect(page.getByLabel('次轴/Y轴指标:',{exact:true})).toHaveValue('count');
  await page.getByLabel('次轴/Y轴指标:',{exact:true}).selectOption('share');
  await page.getByRole('button',{name:'关闭图表选项',exact:true}).click();
  await expect(chart.locator('.recharts-legend-item-text')).toHaveText(['总成交金额（求和） [左轴]','总成交金额（求和 · 占总计百分比） [右轴]']);
  await hoverGroup(1);
  await expect(page.getByRole('tooltip')).toContainText(display([...sums.values()][1]));
  await expect(page.getByRole('tooltip')).toContainText(([...sums.values()][1]/grand*100).toFixed(1)+'%');
  await page.getByLabel('选择图表类型',{exact:true}).selectOption('bar');
  const dl=page.waitForEvent('download');await clickExport(page,'.CSV');
  const exported=await readFile(await(await dl).path(),'utf8');
  for(const sum of sums.values())expect(exported).toContain(display(sum));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.mouse.move(0,0);
  await page.screenshot({path:info.outputPath(`binding-${width}.png`),fullPage:true});
});
