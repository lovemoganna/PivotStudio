import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseCSVRecords } from '../src/utils/csvParser.js';
import { clickExport } from '../tests/browser/_toolbar.js';

// Use an explicit synthetic fixture for mechanics; this is not business-data evidence.
const remote=process.env.DELIVERY_URL;
const server=remote ? null : await createServer({server:{host:'127.0.0.1',port:5191,strictPort:true}});
if(server)await server.listen();
const url=remote || 'http://127.0.0.1:5191/';
const proxyURL=remote && process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const proxy=proxyURL ? {server:proxyURL.origin,username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)} : undefined;
const browser=await chromium.launch({proxy,executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence=[];
try {
  for(const width of [360,1440]) {
    const context=await browser.newContext({ignoreHTTPSErrors:process.env.DELIVERY_IGNORE_HTTPS_ERRORS==='1',viewport:{width,height:900},isMobile:width===360,hasTouch:width===360});
    const page=await context.newPage();const errors=[];const uploads=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))uploads.push({method:request.method(),url:request.url()});});
    await page.route('https://fonts.googleapis.com/**',route=>route.abort());
    await page.route('https://fonts.gstatic.com/**',route=>route.abort());
    await page.goto(url);
    await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-delivery.csv',mimeType:'text/csv',buffer:Buffer.from('区域,金额\n华东,10\n华东,20\n华南,40')});
    await expect(page.getByRole('dialog',{name:'文件数据预览与类型校准',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click();
    const ready=()=>expect(page.getByTestId('pivot-workbench')).toHaveAttribute('data-calculation-status','idle',{timeout:45000});
    await ready();
    if(width===360){const config=page.getByRole('button',{name:/分析配置/});if(await config.getAttribute('aria-expanded')==='false')await config.click();}
    await page.getByTestId('zone-rows').getByRole('button',{name:'筛选值',exact:true}).click();
    const filter=page.getByRole('dialog',{name:'字段筛选',exact:true});
    await filter.getByLabel('华南',{exact:true}).uncheck();
    await page.getByRole('button',{name:'关闭字段筛选',exact:true}).click(); await ready();
    await expect(page.locator('[role=status]').filter({hasText:/2 \/ 3 行/}).first()).toBeVisible();
    const cell=page.getByTestId('pivot-value-cell').first();await cell.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('#pivot-chart-container').scrollIntoViewIfNeeded();
    await page.locator('#pivot-chart-container .recharts-bar-rectangle').first().click();
    const drill=page.getByRole('dialog',{name:'原始交易明细下钻',exact:true});
    await expect(drill).toContainText('2 条记录');
    await page.getByRole('button',{name:'关闭下钻明细',exact:true}).click();
    const downloaded=page.waitForEvent('download');await clickExport(page,'.CSV');
    const rows=parseCSVRecords(await readFile(await (await downloaded).path(),'utf8'));
    expect(rows.flat()).toContain('华东');expect(rows.flat()).not.toContain('华南');
    expect(rows.flat().some(value=>value.replace(/^[¥$]/,'')==='30')).toBe(true);
    expect(errors).toEqual([]);expect(uploads).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await mkdir('artifacts/delivery',{recursive:true});
    await page.screenshot({path:`artifacts/delivery/${remote?'online':'candidate'}-${width}.png`,fullPage:true});
    evidence.push({url,width,mobileEmulation:width===360,fixture:'explicit synthetic CSV, 3 rows',filteredRows:2,exportRows:rows,errors,uploads,result:'passed'});
    await context.close();
  }
  await writeFile(`artifacts/delivery/${remote?'online':'candidate'}.json`,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
} finally {await browser.close();await server?.close();}
