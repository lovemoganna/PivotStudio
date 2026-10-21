import { chromium,expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { join,basename } from 'node:path';
import * as XLSX from 'xlsx';
const projectRoot=process.cwd();
const oracle=JSON.parse(await readFile('artifacts/business-data/full-oracle.json','utf8'));
const folder=join(projectRoot,'artifacts/full-retail');await mkdir(folder,{recursive:true});
const workbookFile=join(projectRoot,oracle.file);
if(process.env.AUDIT_ROOT)process.chdir(process.env.AUDIT_ROOT);
const remote=process.env.DELIVERY_URL;
const server=remote?null:await createServer({root:process.env.AUDIT_ROOT||projectRoot,server:{host:'127.0.0.1',port:5193,strictPort:true}});if(server)await server.listen();
const proxyURL=remote&&process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const proxy=proxyURL?{server:proxyURL.origin,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}:undefined;
const browser=await chromium.launch({proxy,executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const phase=process.env.AUDIT_PHASE||(remote?'online':'after');const evidence={sourceSHA256:oracle.sourceSHA256,fileSHA256:oracle.fileSHA256,rows:oracle.rows,timezone:'Asia/Shanghai',errors:[],uploads:[]};
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:evidence.timezone,ignoreHTTPSErrors:process.env.DELIVERY_IGNORE_HTTPS_ERRORS==='1'});
 await context.addInitScript(()=>{const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data.success){const c=data.unifiedChartSpec;window.chartAudit={chartType:c.chartType,groups:c.renderLimit?.groupCount,renderLimit:c.renderLimit,scope:c.scope,histogramItems:c.histogramItems,histogramStats:c.histogramStats};}});}};});
 const page=await context.newPage();page.on('pageerror',error=>evidence.errors.push(error.message));page.on('crash',()=>evidence.errors.push('page crash'));
 page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))evidence.uploads.push({method:request.method(),url:request.url()});});
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());
 await page.goto(remote||'http://127.0.0.1:5193/');
 await page.evaluate(()=>{window.timings={ticks:0,maxGap:0,progress:[]};let last=performance.now();setInterval(()=>{const now=performance.now();window.timings.ticks++;window.timings.maxGap=Math.max(window.timings.maxGap,now-last);last=now;const p=document.querySelector('progress');if(p&&window.timings.progress.at(-1)!==p.value)window.timings.progress.push(p.value);},20);});
 let began=Date.now();await page.locator('input[type=file]').first().setInputFiles(workbookFile);
 const preview=page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true});await expect(preview).toBeVisible({timeout:180000});
 evidence.previewMs=Date.now()-began;evidence.previewMetrics=await page.evaluate(()=>window.timings);
 await expect(preview.locator('tbody tr')).toHaveCount(20);await expect(preview.getByLabel('StockCode · 字段类型',{exact:true})).toHaveValue('text');
 began=Date.now();await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
 await expect(preview).toHaveCount(0,{timeout:180000});
 await expect(page.locator('[role=status]').filter({hasText:`${oracle.rows.toLocaleString()} / ${oracle.rows.toLocaleString()} 行`}).first()).toBeVisible({timeout:180000});
 const ready=()=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:180000});await ready();
 evidence.readyMs=Date.now()-began;evidence.metrics=await page.evaluate(()=>window.timings);
 if(!process.env.MEASURE_ONLY) {await expect(page.getByRole('heading',{name:'图表分组过多',exact:true})).toBeVisible();evidence.groupCount=await page.evaluate(()=>window.chartAudit.groups); }
 console.log('FULL_WORKBOOK_READY',JSON.stringify({previewMs:evidence.previewMs,readyMs:evidence.readyMs,maxGap:evidence.metrics.maxGap,groupCount:evidence.groupCount}));
 if(process.env.MEASURE_ONLY) {evidence.result='measured';} else {
 // Functional performance is measured before optional fonts, matching the baseline.
 if(process.env.AUDIT_FONT_DIR){const dir=process.env.AUDIT_FONT_DIR;const css=(await Promise.all([400,500,600,700].map(weight=>readFile(join(dir,`${weight}.css`),'utf8')))).join('\n').replaceAll('./files/','https://audit-font/files/');await page.route('https://audit-font/files/**',async route=>route.fulfill({contentType:'font/woff2',headers:{'access-control-allow-origin':'*'},body:await readFile(join(dir,'files',basename(new URL(route.request().url()).pathname)))}));await page.addStyleTag({content:css+'\nbody,body *{font-family:"Noto Sans SC",sans-serif!important}'});await page.evaluate(()=>document.fonts.ready);}
 await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${folder}/${phase}-blocked.png`,fullPage:true});
 const exportRows=async()=>{const file=page.waitForEvent('download');await page.getByRole('button',{name:'.XLSX',exact:true}).click();const book=XLSX.read(await readFile(await (await file).path()));return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});};
 const fullRows=await exportRows();expect(fullRows.at(-1).at(-2)).toBe(oracle.quantity);evidence.fullExportRows=fullRows.length;evidence.quantity=fullRows.at(-1).at(-2);
 await page.getByRole('button',{name:'按主指标显示 Top 10',exact:true}).click();await ready();await expect(page.locator('#pivot-chart-container .recharts-bar-rectangle')).toHaveCount(20);
 const svgDownload=page.waitForEvent('download');await page.getByRole('button',{name:'.SVG',exact:true}).click();const svg=await readFile(await (await svgDownload).path(),'utf8');expect(svg).toContain(`Top 10 / ${evidence.groupCount}`);
 await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/${phase}-top10.png`});
 await page.getByTestId('zone-rows').getByRole('button',{name:'移除字段',exact:true}).first().click();await ready();
 const countryRows=await exportRows();expect(countryRows.length).toBe(Object.keys(oracle.groups).length+2);
 for(const row of countryRows.slice(1,-1))expect(row.at(-2)).toBe(oracle.groups[row[0]].quantity);
 evidence.countryGroups=countryRows.length-2;
 await page.getByTestId('field-CustomerID').locator('..').locator('..').getByRole('button',{name:'+值',exact:true}).click();await ready();
 const countRows=await exportRows();expect(countRows.at(-1).at(-1)).toBe(oracle.rows-oracle.missing.CustomerID);evidence.nonemptyCustomerIDs=countRows.at(-1).at(-1);
 await page.getByLabel('选择图表类型',{exact:true}).selectOption('histogram');await ready();
 const chart=await page.evaluate(()=>window.chartAudit);expect(chart.histogramStats.valid).toBe(oracle.rows);expect(chart.histogramItems.reduce((sum,bin)=>sum+bin.count,0)).toBe(oracle.rows);
 for(const bin of chart.histogramItems){const expected=Object.entries(oracle.quantityFrequency).reduce((sum,[value,count])=>Number(value)>=bin.low&&(bin.includeMax?Number(value)<=bin.high:Number(value)<bin.high)?sum+count:sum,0);expect(bin.count).toBe(expected);}
 evidence.histogram=chart.histogramItems.map(({low,high,count,pct})=>({low,high,count,pct}));
 const largest=chart.histogramItems.reduce((best,bin,index)=>bin.count>chart.histogramItems[best].count?index:best,0);
 await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();await page.locator('#pivot-chart-container .recharts-bar-rectangle').nth(largest).click();
 const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});await expect(drill).toContainText(`${chart.histogramItems[largest].count} 条记录`,{timeout:45000});await expect(drill.locator('tbody tr')).toHaveCount(50);
 evidence.histogramDrillRows=chart.histogramItems[largest].count;await page.keyboard.press('Escape');
 await page.screenshot({path:`${folder}/${phase}-histogram.png`});
 expect(evidence.errors).toEqual([]);expect(evidence.uploads).toEqual([]);evidence.result='passed';console.log('FULL_WORKBOOK_PASS',JSON.stringify({rows:oracle.rows,quantity:evidence.quantity,countryGroups:evidence.countryGroups,nonemptyCustomerIDs:evidence.nonemptyCustomerIDs,histogramCount:chart.histogramStats.valid,histogramDrillRows:evidence.histogramDrillRows}));
 }
} catch(error){evidence.result='failed';evidence.failure=error.message;throw error;}
finally{await writeFile(`${folder}/${phase}.json`,JSON.stringify(evidence,null,2));await browser.close();await server?.close();}
