import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
import {encodeView} from '../../src/utils/viewConfig.js';
import {parseCSVRecords} from '../../src/utils/csvParser.js';
import {tradeCsv,tradeHeaders} from './_tradeFixture.js';
import {ensureMobileShelves} from './_mobileShelves.js';
import {clickExport} from './_toolbar.js';

const csv=process.env.USER_TRADE_CSV ? await readFile(process.env.USER_TRADE_CSV,'utf8') : tradeCsv;
const raw=parseCSVRecords(csv).slice(1).filter(row=>row[0]!=='1');
const numeric=value=>Number(String(value || '0').replaceAll(',',''));
const expectedSum=raw.reduce((sum,row)=>sum+numeric(row[16]),0);
const ready=p=>expect(p.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle');
const initial={rows:['用户主账户id','币对id','对手用户id'].map((field,i)=>({id:'r'+i,field})),columns:[],filters:[{id:'f',field:'序号',selectedValues:['2','3','4','5']}],values:[{id:'v1',field:'买入数量',agg:'count'},{id:'v2',field:'卖出数量',agg:'count'},{id:'v3',field:'总成交金额',agg:'sum'}]};
async function start(page,width,config=initial){
 await page.setViewportSize({width,height:1100});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto('/#share_token='+encodeURIComponent(encodeView({fullConfig:config,ct:'bar',csc:{primaryValueId:'v3',showDataLabels:true}})));
 await page.locator('input[type=file]').first().setInputFiles({name:'trade-analysis.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();await ready(page);
 await ensureMobileShelves(page,width);
 if(width>=768) await page.getByRole('button',{name:'配置',exact:true}).click();
 await page.getByRole('button',{name:/调整图表字段:/}).click();
}
async function unit(page,field,value){
 await page.getByRole('button',{name:'格式与数值',exact:true}).click();
 const format=page.getByRole('dialog',{name:'数值与条件格式设置',exact:true});
 await format.getByLabel(`${field} · 单位/符号`,{exact:true}).fill(value);
 await page.getByRole('button',{name:'关闭数值与条件格式设置',exact:true}).click();await ready(page);
}

for(const width of [360,768,1440]) test(`chart freedom: complete fields, units, history and export at ${width}`,async({page},info)=>{
 await start(page,width);
 const chart=page.locator('#pivot-chart-container');
 const rows=page.getByLabel('行字段',{exact:true}),cols=page.getByLabel('列字段',{exact:true}),values=page.getByLabel('值字段',{exact:true});
 await expect(rows).toHaveValue('用户主账户id'); // No browser fallback to the first option.
 await expect(values).toHaveValue('metric:v3');
 for(const selector of [rows,cols,values]) {
  const available=await selector.locator('option').evaluateAll(options=>options.map(option=>option.value));
  for(const field of tradeHeaders) expect(available).toContain(field);
 }
 await expect(page.getByTestId('dataset-telemetry')).toContainText('4 / 5 行');
 await expect(page.locator('#pivot-main-html-table tfoot')).toContainText('4 笔');
 await expect(page.locator('#pivot-main-html-table')).toContainText(raw[0][9]);
 await unit(page,'买入数量','条');
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4 条');
 await unit(page,'买入数量','');
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4');
 await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4 条');
 await page.getByRole('button',{name:'重做',exact:true}).press('Enter');await ready(page);
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4');
 await unit(page,'买入数量','条');await unit(page,'总成交金额','报价单位');
 await page.getByRole('button',{name:'格式与数值',exact:true}).click();
 const format=page.getByRole('dialog',{name:'数值与条件格式设置',exact:true});
 await expect(format.getByLabel('买入数量 · 单位/符号',{exact:true})).toHaveValue('条');
 await format.getByLabel('总成交金额 · 小数位数',{exact:true}).selectOption('2');
 await format.getByLabel('买入数量 · 单位/符号',{exact:true}).fill('项');
 await page.getByRole('button',{name:'关闭数值与条件格式设置',exact:true}).click();await ready(page);
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4 项');
 await expect(page.locator('#pivot-main-html-table tfoot td').last()).toHaveText(expectedSum.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' 报价单位');
 await expect(chart.locator('.recharts-label-list')).toContainText(['报价单位']);
 const dl=page.waitForEvent('download');await clickExport(page,'.XLSX');const download=await dl;
 const book=XLSX.read(await readFile(await download.path()),{cellNF:true});
 const sheet=book.Sheets[book.SheetNames[0]],matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true});
 expect(matrix.at(-1).slice(-3)).toEqual([4,4,expectedSum]);
 expect(Object.values(sheet).filter(cell=>cell?.t==='n').some(cell=>cell.z?.includes('报价单位'))).toBe(true);
 const csvDl=page.waitForEvent('download');await clickExport(page,'.CSV');const csvExport=await readFile(await(await csvDl).path(),'utf8');
 expect(csvExport).toContain('4 项');expect(csvExport).toContain('报价单位');
 await values.selectOption('metric:v1');await ready(page);
 await expect(chart.locator('.recharts-label-list')).toContainText(['项']);
 await values.selectOption('委托类型');await ready(page);
 await expect(page.getByTestId('zone-values').getByTestId('configured-field-name').first()).toHaveText('委托类型');
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText('4 笔');
 await rows.selectOption('买入金额');await ready(page);await expect(rows).toHaveValue('买入金额');
 await cols.selectOption('用户id');await ready(page);await expect(cols).toHaveValue('用户id');
 await page.getByRole('button',{name:'撤销',exact:true}).press('Enter');await ready(page);await expect(cols).toHaveValue('');
 await rows.selectOption('订单id');await ready(page);
 await expect(page.locator('#pivot-main-html-table')).toContainText(raw[0][11]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.screenshot({path:info.outputPath(`trade-fields-${width}.png`),fullPage:true});
});

test('chart freedom: source price fields retain explicitly chosen six-place display',async({page})=>{
 await start(page,1440);
 await page.getByLabel('值字段',{exact:true}).selectOption('买入均价_折U');await ready(page);
 await page.getByRole('button',{name:'格式与数值',exact:true}).click();
 const format=page.getByRole('dialog',{name:'数值与条件格式设置',exact:true});
 await format.getByLabel('买入均价_折U · 小数位数',{exact:true}).selectOption('6');
 await page.getByRole('button',{name:'关闭数值与条件格式设置',exact:true}).click();await ready(page);
 const prices=raw.map(row=>row[19]).filter(value=>value!=='').map(numeric);
 const average=prices.reduce((sum,value)=>sum+value,0)/prices.length;
 await expect(page.locator('#pivot-main-html-table tfoot td').nth(1)).toHaveText(average.toFixed(6));
 await expect(page.locator('#pivot-chart-container .recharts-label-list')).toContainText([average.toFixed(6)]);
});

test('chart freedom: distinct metric definitions and formulas stay selectable',async({page})=>{
 await start(page,1440,{...initial,values:[...initial.values,{id:'v4',field:'买入数量',agg:'sum'},{id:'v5',field:'复核金额',isCalculated:true,agg:'calc',formula:'SUM([买入金额])+SUM([卖出金额])'}]});
 const values=page.getByLabel('值字段',{exact:true});
 await values.selectOption('metric:v4');await ready(page);await expect(values).toHaveValue('metric:v4');
 await expect(page.locator('#pivot-chart-container .recharts-label-list')).not.toContainText(['笔']);
 await values.selectOption('metric:v1');await ready(page);await expect(values).toHaveValue('metric:v1');
 await expect(page.locator('#pivot-chart-container .recharts-label-list')).toContainText(['笔']);
 await values.selectOption('metric:v5');await ready(page);await expect(values).toHaveValue('metric:v5');
 await page.getByRole('button',{name:'仅图表',exact:true}).click();
 await expect(values).toHaveValue('metric:v5');
});
