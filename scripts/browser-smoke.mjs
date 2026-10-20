// Chromium integration smoke: DOM interactions and responsive geometry.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile,readdir,readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { parseCSVRecords } from '../src/utils/csvParser.js';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),'pivotstudio-chrome-'));
await mkdir('artifacts/browser',{recursive:true});
const vite=spawn(process.platform==='win32'?'npm.cmd':'npm',['run','dev','--','--host','127.0.0.1'],{stdio:'ignore',shell:process.platform==='win32'});
let chrome,ws;
const waitFor=async(fn,label,timeout=30000)=>{
  const t=Date.now();
  while(Date.now()-t<timeout){try{const v=await fn();if(v)return v;}catch{}await sleep(250);}
  throw Error('Timed out: '+label);
};
try{
  await waitFor(async()=>(await fetch('http://127.0.0.1:5173/')).ok,'Vite');
  chrome=spawn(process.env.CHROME_BIN||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'google-chrome'),[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=9222',
    '--user-data-dir='+profile,'--window-size=1440,900','about:blank'
  ],{stdio:'ignore'});
  const target=await waitFor(async()=>{
    const list=await (await fetch('http://127.0.0.1:9222/json/list')).json();
    return list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
  },'Chrome debugger');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
  let nextId=0;
  const pending=new Map();
  ws.addEventListener('message',ev=>{
    const msg=JSON.parse(String(ev.data));
    if(msg.method==='Runtime.exceptionThrown')console.error('CHROME_EXCEPTION',JSON.stringify(msg.params).slice(0,1500));
    const p=pending.get(msg.id);if(!p)return;
    pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},15000);
    pending.set(id,{resolve:x=>{clearTimeout(timeout);resolve(x)},reject:x=>{clearTimeout(timeout);reject(x)}});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(expression)=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Browser exception '+JSON.stringify(r.exceptionDetails).slice(0,700));
    return r.result?.value;
  };
  const clickText=(label)=>evaluate('(() => { const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim().includes('+JSON.stringify(label)+')); if(!b)return false; b.click(); return true; })()');
  await send('Page.enable');
  await send('Runtime.enable');
  const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/?smoke=true'});
  console.log('BROWSER_NAVIGATION',JSON.stringify(navigation));
  await sleep(2500);
  console.log('BROWSER_BOOT',JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText.slice(0,500),html:document.documentElement?.outerHTML.slice(0,800)})')));
  await waitFor(async()=>await evaluate("Array.from(document.querySelectorAll('h1')).some(h => h.textContent.includes('PivotStudio'))"),'React app',12000);
  const isIntro=await evaluate('!document.getElementById("pivot-chart-container")');
  if(isIntro){
    console.log('BROWSER_INTRO_SCREEN_DETECTED: Loading benchmark retail dataset...');
    assert.equal(await clickText('全区零售经营测试集'),true,'load benchmark retail dataset from intro screen');
    await waitFor(async()=>await evaluate('!!document.getElementById("pivot-chart-container") && !!document.getElementById("pivot-main-html-table")'),'pivot work surface',12000);
  }
  const errors=[];
  for(const [name,width,height] of [['small-mobile',320,720],['mobile',390,844],['tablet',768,900],['laptop',1024,768],['desktop',1440,900],['wide',1920,1080]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await sleep(400);
    await evaluate('(() => { window.scrollTo(0,0); document.querySelectorAll("*").forEach(el => { if(el.scrollTop > 0) el.scrollTop=0; }); return true; })()');
    await sleep(90);
    const result=await evaluate('(() => { const ch=document.getElementById("pivot-chart-container"); const tb=document.getElementById("pivot-main-html-table"); const sidebar=document.querySelector("aside"); return {pageWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth, chartVisible:!!ch&&ch.getBoundingClientRect().height>0, tableVisible:!!tb&&tb.getBoundingClientRect().height>0, sidebarHeight:sidebar?.getBoundingClientRect().height || 0, datasetLabel:document.body.textContent.includes("数据来源："), appTitle:Array.from(document.querySelectorAll("h1")).find(h=>h.offsetParent!==null)?.textContent||""}; })()');
    if(result.pageWidth>result.viewportWidth+2)errors.push(name+': horizontal overflow '+JSON.stringify(result));
    if((name==='mobile'||name==='small-mobile') && result.sidebarHeight>235)errors.push('mobile sidebar exceeds compact height: '+result.sidebarHeight);
    if(name==='mobile'||name==='small-mobile') {
      const toolbar=await evaluate('(() => { const t=document.querySelector("[role=toolbar]"); if(!t)return null; return {height:t.getBoundingClientRect().height,clientWidth:t.clientWidth,scrollWidth:t.scrollWidth}; })()');
      if(!toolbar || toolbar.height>65)errors.push('mobile toolbar not compact: '+JSON.stringify(toolbar));
      else console.log('MOBILE_TOOLBAR',JSON.stringify(toolbar));
    }
    if(!result.tableVisible||!result.chartVisible||!result.datasetLabel)errors.push(name+': missing work surface '+JSON.stringify(result));
    const focusIssue=await evaluate('(() => { const nodes=[...document.querySelectorAll("button,select,input")].filter(e=>e.getClientRects().length && !e.disabled); return {count:nodes.length,unnamed:nodes.filter(e=>!((e.getAttribute("aria-label")||e.getAttribute("title")||e.textContent||"").trim())).length}; })()');
    console.log('VISIBLE_CONTROLS',name,JSON.stringify(focusIssue));
    if (focusIssue.unnamed) {
      const unnamed=await evaluate('Array.from(document.querySelectorAll("button,select,input")).filter(e=>e.getClientRects().length && !e.disabled && !((e.getAttribute("aria-label")||e.getAttribute("title")||e.textContent||"").trim())).map(e=>({tag:e.tagName,type:e.type,html:e.outerHTML.slice(0,230)}))');
      console.log('UNNAMED_CONTROLS',name,JSON.stringify(unnamed));
    }
    if(focusIssue.count===0)errors.push(name+': no accessible controls');
    if(focusIssue.unnamed>0)errors.push(name+': unnamed visible controls: '+focusIssue.unnamed);

    const img=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile('artifacts/browser/'+name+'.png',Buffer.from(img.data,'base64'));
    if(name==='small-mobile') {
      const moved=await evaluate('(() => { const toolbar=document.querySelector("[role=toolbar]"); const button=document.querySelector("button[aria-label^=\\"更多工具\\"]"); if(!toolbar || !button)return false; toolbar.scrollLeft=0; button.click(); return true; })()');
      await sleep(360);
      const scrolled=await evaluate('document.querySelector("[role=toolbar]")?.scrollLeft || 0');
      if(!moved || scrolled<50)errors.push('mobile more-tools button did not reveal hidden actions');
      await evaluate('document.querySelector("[role=toolbar]").scrollLeft=0');
    }
    if(name==='mobile') {
      const full=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      await writeFile('artifacts/browser/mobile-full.png',Buffer.from(full.data,'base64'));
      const scrollInfo=await evaluate('(() => { const chart=document.getElementById("pivot-chart-container"); const before=chart.getBoundingClientRect(); chart.scrollIntoView({block:"center"}); return {beforeTop:before.top,documentScroll:document.scrollingElement.scrollHeight,viewport:innerHeight}; })()');
      await sleep(350);
      const chartAfter=await evaluate('(() => { const r=document.getElementById("pivot-chart-container").getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight}; })()');
      console.log('MOBILE_CHART_REACHABILITY',JSON.stringify({scrollInfo,chartAfter}));
      if(chartAfter.top>=chartAfter.viewport || chartAfter.bottom<=0)errors.push('mobile chart cannot be reached by normal scrolling');
      const tickCount=await evaluate('document.querySelectorAll("#pivot-chart-container .recharts-xAxis .recharts-cartesian-axis-tick").length');
      console.log('MOBILE_AXIS_TICK_COUNT',tickCount);
      if(tickCount<1 || tickCount>5)errors.push('mobile category labels exceed density budget: '+tickCount);
      const chartShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      await writeFile('artifacts/browser/mobile-chart.png',Buffer.from(chartShot.data,'base64'));
    }
    console.log(JSON.stringify({viewport:name,...result}));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const isConfigCollapsed=await evaluate('document.querySelector("button[aria-controls=pivot-analysis-config]")?.getAttribute("aria-expanded")');
  if(isConfigCollapsed!=='false')errors.push('mobile analysis settings not collapsed by default');
  assert.equal(await clickText('分析配置'),true,'mobile analysis expansion');
  await sleep(100);
  if(await evaluate('document.querySelector("button[aria-controls=pivot-analysis-config]")?.getAttribute("aria-expanded")')!=='true')errors.push('mobile settings did not expand');
  assert.equal(await clickText('字段列表'),true,'mobile field expansion');
  await sleep(150);
  const expanded=await evaluate('document.querySelector("button[aria-controls=pivot-schema-fields]")?.getAttribute("aria-expanded")');
  if(expanded!=='true')errors.push('mobile schema did not expand');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  assert.equal(await clickText('仅图表'),true,'chart button');
  await sleep(200);
  assert.equal(await evaluate('!!document.getElementById("pivot-chart-container")'),true);
  assert.equal(await evaluate('!!document.getElementById("pivot-main-html-table")'),false);
  assert.equal(await clickText('仅透视表'),true,'table button');
  await sleep(200);
  assert.equal(await evaluate('!!document.getElementById("pivot-main-html-table")'),true);
  assert.equal(await clickText('表图并列') || await clickText('表图上下'),true,'split button');
  await sleep(200);
  const before=await evaluate('(() => { const e=document.querySelector("[role=separator]"); if(!e)return null; const v=e.getAttribute("aria-valuenow"); e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));return v; })()');
  if(before===null)errors.push('keyboard separator missing');
  else {
    await sleep(200);
    const after=await evaluate('document.querySelector("[role=separator]")?.getAttribute("aria-valuenow")');
    if(Number(after)!==Math.min(75,Number(before)+5))errors.push('keyboard splitter did not update');
  }
  // The secondary chart palettes must be discoverable but not obscure the data by default.
  if(await evaluate('!!document.getElementById("pivot-chart-types")'))errors.push('chart shortcut palette open by default');
  if(await evaluate('!!document.getElementById("pivot-lens-presets")'))errors.push('analysis preset palette open by default');
  assert.equal(await clickText('图表类型'),true,'expand chart type palette');
  await sleep(100);
  if(!await evaluate('!!document.getElementById("pivot-chart-types")'))errors.push('chart palette did not expand');
  assert.equal(await clickText('图表类型'),true);
  assert.equal(await clickText('分析视角'),true,'expand analytical presets');
  await sleep(100);
  if(!await evaluate('!!document.getElementById("pivot-lens-presets")'))errors.push('analysis presets did not expand');
  assert.equal(await clickText('分析视角'),true);

  // Every advertised chart type must remain switchable and preserve the workbench.
  const kinds=await evaluate(`Array.from(document.querySelector('select[aria-label="选择图表类型"]').options).map(x=>x.value)`);
  for(const kind of kinds) {
    const selected=await evaluate('(() => {const el=document.querySelector(\'select[aria-label="选择图表类型"]\'); el.value='+JSON.stringify(kind)+';el.dispatchEvent(new Event("change",{bubbles:true}));return el.value;})()');
    await sleep(140);
    if(selected!==kind || !await evaluate('!!document.getElementById("pivot-chart-container")'))errors.push('chart type failed: '+kind);
  }
  console.log('CHART_TYPES_VERIFIED',JSON.stringify(kinds));
  await evaluate('(() => { const el=document.querySelector(\'select[aria-label="选择图表类型"]\');el.value="bar";el.dispatchEvent(new Event("change",{bubbles:true}));return true; })()');
  await sleep(130);
  for(const [label,description] of [['格式与数值','数值与条件格式设置'],['内置校验','内置校验结果'],['工作区','本机工作区与配置分享']]){
    assert.equal(await clickText(label),true,'open '+description);
    await sleep(130);
    const focused=await evaluate('(() => {const d=document.querySelector("[role=dialog]"); return d?{label:d.getAttribute("aria-label"),focused:d.contains(document.activeElement)}:null;})()');
    if(!focused||focused.label!==description||!focused.focused)errors.push('dialog inaccessible: '+description+' '+JSON.stringify(focused));
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await sleep(130);
    if(await evaluate('!!document.querySelector("[role=dialog]")'))errors.push('Escape did not close '+description);
  }
  assert.equal(await clickText('SQL代理'),true);
  await sleep(160);
  const sql=await evaluate('document.querySelector("[role=dialog]")?.textContent || ""');
  if(!sql.includes('尚未实现'))errors.push('SQL integration misrepresented');
  const modalFocused=await evaluate('document.querySelector("[role=dialog]")?.contains(document.activeElement) ?? false');
  if(!modalFocused)errors.push('SQL dialog failed initial keyboard focus');
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
  await sleep(160);
  if(await evaluate('!!document.querySelector("[role=dialog]")'))errors.push('Escape did not close SQL dialog');
  assert.equal(await clickText('GSheet'),true);
  await sleep(160);
  const gsheet=await evaluate('document.querySelector("[role=dialog]")?.textContent || ""');
  if(!gsheet.includes('公开'))errors.push('GSheet access limits missing');
  await evaluate('document.querySelector("button[aria-label=\\"关闭数据源\\"]")?.click()');
  const themeBefore=await evaluate('!!document.querySelector(".dark")');
  await evaluate('document.querySelector("button[aria-label=\\"切换主题\\"]")?.click()');
  await sleep(250);
  const themeAfter=await evaluate('!!document.querySelector(".dark")');
  if(themeBefore===themeAfter)errors.push('theme toggle not responding');
  const light=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile('artifacts/browser/desktop-light.png',Buffer.from(light.data,'base64'));
  // Real file import -> type preview -> pivot initialization -> XLSX/CSV download.
  await send('DOM.enable');
  const doc=await send('DOM.getDocument');
  const fileNode=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"]'});
  if(!fileNode.nodeId)errors.push('file input not available');
  else {
    await send('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:[join(process.cwd(),'public/test_retail_sales.csv')]});
    await waitFor(async()=>await evaluate('!!document.querySelector("[role=dialog][aria-label=\\\"文件数据预览与类型校准\\\"]")'),'import file preview',12000);
    const preview=await evaluate('document.querySelector("[role=dialog]")?.textContent || ""');
    if(!preview.includes('33 行')||!preview.includes('12 个字段'))errors.push('import preview did not show 33 records and 12 fields');
    assert.equal(await clickText('确认导入并自动初始化透视'),true,'confirm real CSV import');
    await waitFor(async()=>await evaluate('document.body.textContent.includes("test_retail_sales.csv (33行)") && document.body.textContent.includes("数据来源：本地导入文件")'),'imported dataset state',12000);
    const imported=await evaluate('({name:document.querySelector("select")?.selectedOptions?.[0]?.textContent,table:document.querySelectorAll("#pivot-main-html-table tbody tr").length})');
    console.log('REAL_CSV_IMPORT',JSON.stringify(imported));
    if(imported.table<1)errors.push('imported pivot produced no table rows');

    const downloads=join(process.cwd(),'artifacts/browser/downloads');
    await mkdir(downloads,{recursive:true});
    await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
    assert.equal(await clickText('.XLSX'),true,'Excel export after real CSV import');
    const excelFile=await waitFor(async()=>{
      const names=await readdir(downloads);
      const name=names.find(n=>n.endsWith('.xlsx'));
      return name?join(downloads,name):null;
    },'Excel export download',12000);
    const book=XLSX.read(await readFile(excelFile),{type:'buffer'});
    const sheet=book.Sheets[book.SheetNames[0]];
    const exported=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    console.log('REAL_XLSX_EXPORT',JSON.stringify({sheets:book.SheetNames,rows:exported.length,columns:exported[0]?.length}));
    if(exported.length<4)errors.push('Excel workbook missing pivot rows');
    assert.equal(await clickText('.CSV'),true,'CSV export after import');
    const csvFile=await waitFor(async()=>{
      const names=await readdir(downloads);
      const name=names.find(n=>n.endsWith('.csv'));
      return name?join(downloads,name):null;
    },'CSV export download',12000);
    const csvContent=await readFile(csvFile,'utf-8');
    if(!csvContent.includes('销售额'))errors.push('CSV export missing value metric');
    const csvRows=parseCSVRecords(csvContent);
    if(csvRows.length !== exported.length)errors.push('CSV/XLSX pivot row counts disagree: '+csvRows.length+'/'+exported.length);
    console.log('REAL_CSV_EXPORT',JSON.stringify({bytes:csvContent.length,rows:csvRows.length}));
  }

  // Browser performance evidence: actual 100k synthetic records and responsiveness.
  await evaluate('(() => { window.__psLongTasks = []; if(typeof PerformanceObserver === "function"){try{const obs=new PerformanceObserver(list=>window.__psLongTasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({entryTypes:["longtask"]});window.__psLongTaskObserver=obs;}catch{}}return true;})()');
  const largeStart=Date.now();
  assert.equal(await clickText('100K压测'),true,'open synthetic data benchmark');
  await sleep(120);
  assert.equal(await clickText('生成 100,000 行合成数据'),true,'generate 100k local rows');
  await waitFor(async()=>await evaluate('document.body.textContent.includes("100,000 / 100,000 行") && document.body.textContent.includes("本地合成压测数据")'),'100k-row real browser analysis',45000);
  const largeWallMs=Date.now()-largeStart;
  const perf=await evaluate('({rows:document.body.textContent.includes("100,000 / 100,000 行"), chartVisible:!!document.getElementById("pivot-chart-container") && document.getElementById("pivot-chart-container").getBoundingClientRect().height>0, longTasks:window.__psLongTasks?.length||0,maxLongTaskMs:Math.round(Math.max(0,...(window.__psLongTasks||[]))),totalLongTaskMs:Math.round((window.__psLongTasks||[]).reduce((a,b)=>a+b,0))})');
  if(!perf.rows || !perf.chartVisible)errors.push('100k browser workbench not ready');
  console.log('BROWSER_100K_MEASUREMENT',JSON.stringify({wallTimeMs:largeWallMs,...perf,note:'Synthetic records, CI Chromium only; no performance SLA'}));
  console.log('CHROMIUM_SMOKE',errors.length?'FAIL':'PASS',errors);
  for (const err of errors) {
    console.log(`::error title=Smoke Error::${err}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Smoke Test Summary\n\nErrors (${errors.length}):\n${errors.map(e => '- ' + e).join('\n')}\n`);
    } catch {}
  }
  assert.equal(errors.length,0,errors.join('; '));
}catch(error){
  console.log(`::error title=Smoke Exception::${(error?.stack || error).toString().replace(/\r?\n/g, '%0A')}`);
  console.error('BROWSER_SMOKE_ERROR',error);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Smoke Test Exception\n\n\`\`\`\n${error?.stack || error}\n\`\`\`\n\nErrors list (${errors?.length || 0}):\n${(errors||[]).join('\n')}\n`);
    } catch {}
  }
  throw error;
}finally{
  try{ws?.close()}catch{}
  try{chrome?.kill('SIGTERM')}catch{}
  vite.kill('SIGTERM');
  await sleep(250);
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
