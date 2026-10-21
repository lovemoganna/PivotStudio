import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { encodeView } from '../src/utils/viewConfig.js';
import { parseCSVRecords } from '../src/utils/csvParser.js';

// Expected aggregates are generated independently using Python csv/openpyxl + Decimal.
const manifest=JSON.parse(await readFile('artifacts/business-data/manifest.json','utf8'));
const remote=process.env.DELIVERY_URL;
const server=remote?null:await createServer({server:{host:'127.0.0.1',port:5192,strictPort:true}});
if(server)await server.listen();
const base=remote||'http://127.0.0.1:5192/';
const expectFixed=!remote||process.env.BUSINESS_EXPECT_FIXED==='1';
const proxyURL=remote&&process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const proxy=proxyURL?{server:proxyURL.origin,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}:undefined;
const browser=await chromium.launch({proxy,executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
  for(const item of manifest) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:process.env.DELIVERY_IGNORE_HTTPS_ERRORS==='1'});
    const page=await context.newPage();const errors=[];const uploads=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))uploads.push({method:request.method(),url:request.url()});});
    await page.route('https://fonts.googleapis.com/**',route=>route.abort());
    await page.route('https://fonts.gstatic.com/**',route=>route.abort());
    const upload=async()=>{
      await page.locator('input[type=file]').first().setInputFiles(item.file);
      const dialog=page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});
      await expect(dialog).toBeVisible({timeout:45000});
      const types=await dialog.locator('select[aria-label$=" · 字段类型"]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.getAttribute('aria-label').replace(' · 字段类型',''),el.value])));
      await expect(dialog.locator('tbody tr')).toHaveCount(20);
      await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
      await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:60000});
      return types;
    };
    await page.goto(base);
    const began=Date.now();const types=await upload();
    await page.getByRole('button',{name:/工作区 ·/}).click();
    await page.getByPlaceholder('输入新工作区快照名称...').fill(`audit-${item.name}`);
    await page.getByRole('button',{name:'保存快照',exact:true}).click();
    const defaults=await page.evaluate(()=>JSON.parse(localStorage.getItem('pivotstudio_workspaces_v1'))[0].pivotConfig);
    const issues=[];
    if(item.name==='shoppers'&&defaults.values.find(value=>value.field==='Administrative_Duration')?.format?.isPercent)issues.push('Duration incorrectly inferred as ratio/percentage');
    for(const value of defaults.values) {
      if(/^(InvoiceNo|StockCode|CustomerID)$/i.test(value.field)&&value.agg==='sum')issues.push(`Identifier ${value.field} incorrectly defaults to SUM`);
      if(value.format?.currency==='¥'&&item.priceCurrency==='GBP')issues.push(`${value.field} incorrectly labelled CNY for GBP source`);
    }
    await page.getByRole('button',{name:'关闭本机工作区与配置分享',exact:true}).click();
    if(expectFixed)expect(issues).toEqual([]);
    const defaultMs=Date.now()-began;
    console.log(JSON.stringify({name:item.name,types,defaults,issues}));
    await writeFile(`artifacts/business-data/${remote?'online':'candidate'}-${item.name}-defaults.json`,JSON.stringify({types,defaults,issues},null,2));
    const config={fullConfig:{rows:[{id:'r',field:item.group,sort:'asc'}],columns:[],filters:[{id:'f',field:item.group,selectedValues:[item.selected]}],values:[{id:'v',field:item.measure,agg:item.agg,format:{decimals:2,thousands:true,currency:'',isPercent:item.name==='shoppers'}}]}};
    await page.goto(base+'#share_token='+encodeURIComponent(encodeView(config)));
    await page.reload(); await upload();
    await expect(page.locator('[role=status]').filter({hasText:`${item.filteredRows.toLocaleString()} / ${item.rows.toLocaleString()} 行`}).first()).toBeVisible();
    const file=page.waitForEvent('download');await page.getByRole('button',{name:'.XLSX',exact:true}).click();
    const book=XLSX.read(await readFile(await (await file).path()));
    const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
    const actual=rows.at(-1).at(-1);
    if(item.name==='shoppers') expect(XLSX.utils.format_cell(book.Sheets[book.SheetNames[0]].B3)).toBe('2.69%');expect(typeof actual).toBe('number');
    expect(Math.abs(actual-Number(item.expected))).toBeLessThan(1e-8);
    const csvFile=page.waitForEvent('download');await page.getByRole('button',{name:'.CSV',exact:true}).click();
    const csv=parseCSVRecords(await readFile(await (await csvFile).path(),'utf8'));
    if(item.name==='shoppers')expect(csv.at(-1).at(-1)).toBe('2.69%');
    const visible=await page.getByTestId('pivot-value-cell').allTextContents();
    expect(csv.slice(1,-1).map(row=>row.at(-1))).toEqual(visible.map(s=>s.trim()));
    await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
    const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
    await expect(drill).toContainText(`${item.filteredRows} 条记录`);
    if(item.name==='retail'&&expectFixed) {
      await expect(drill.getByRole('cell',{name:'85123A',exact:true}).first()).toBeVisible();
      await expect(drill.getByRole('cell',{name:'2010-12-01T08:26:00.000',exact:true}).first()).toBeVisible();
    }
    await page.getByRole('button',{name:'关闭下钻明细',exact:true}).click();
    for(const chart of ['line','pie','heatmap','bar']) {
      await page.getByLabel('选择图表类型',{exact:true}).selectOption(chart);
      await expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:45000});
      await expect(page.locator('#pivot-chart-container svg').first()).toBeVisible();
    }
    expect(errors).toEqual([]);expect(uploads).toEqual([]);
    await mkdir('artifacts/business-data',{recursive:true});
    await page.screenshot({path:`artifacts/business-data/${remote?'online':'candidate'}-${item.name}.png`,fullPage:true});
    const result={name:item.name,url:base,rows:item.rows,types,defaultConfig:defaults,defaultImportAndSaveMs:defaultMs,issues,filteredRows:item.filteredRows,expected:item.expected,actual,csvTotal:csv.at(-1).at(-1),errors,uploads,calculationResult:'passed'};
    results.push(result);console.log(JSON.stringify(result));
    await writeFile(`artifacts/business-data/${remote?'online':'candidate'}-results.json`,JSON.stringify(results,null,2));
    await context.close();
  }
} finally {await browser.close();await server?.close();}
