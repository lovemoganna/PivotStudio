// Chromium integration smoke: DOM interactions and responsive geometry.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile,readdir,readFile} from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),'pivotstudio-chrome-'));
const downloadDir=join(process.cwd(),'artifacts/browser/downloads');
await mkdir(downloadDir,{recursive:true});
await mkdir('artifacts/browser',{recursive:true});
const vite=spawn('npm',['run','dev','--','--host','127.0.0.1'],{stdio:'ignore'});
let chrome,ws;
const waitFor=async(fn,label,timeout=30000)=>{
  const t=Date.now();
  while(Date.now()-t<timeout){try{const v=await fn();if(v)return v;}catch{}await sleep(250);}
  throw Error('Timed out: '+label);
};
try{
  await waitFor(async()=>(await fetch('http://127.0.0.1:5173/')).ok,'Vite');
  chrome=spawn(process.env.CHROME_BIN||'google-chrome',[
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
  await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir});
  const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/'});
  console.log('BROWSER_NAVIGATION',JSON.stringify(navigation));
  await sleep(2500);
  console.log('BROWSER_BOOT',JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText.slice(0,500),html:document.documentElement?.outerHTML.slice(0,800)})')));
  await waitFor(async()=>await evaluate("Array.from(document.querySelectorAll('h1')).some(h => h.textContent.includes('PivotStudio'))"),'React app',12000);
  const errors=[];
  const demoClosed=await evaluate('!document.body.textContent.includes("Keynote 演示")');
  if(await evaluate('document.body.textContent.includes("LENS_PRESETS:")')) errors.push('presentation presets clutter ordinary analysis chart');
  if(!demoClosed)errors.push('demo actions displace primary navigation on initial load');
  assert.equal(await clickText('演示与检查'),true);
  await sleep(80);
  if(!(await evaluate('document.body.textContent.includes("Keynote 演示")'))) errors.push('secondary demo actions cannot expand');
  assert.equal(await clickText('演示与检查'),true);
  for(const [name,width,height] of [['narrow',320,740],['mobile',390,844],['tablet',768,900],['desktop',1440,900],['wide',1920,1080]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await sleep(400);
    const result=await evaluate('(() => { const ch=document.getElementById("pivot-chart-container"); const tb=document.getElementById("pivot-main-html-table"); const sidebar=document.querySelector("aside"); return {pageWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth, chartVisible:!!ch&&ch.getBoundingClientRect().height>0, tableVisible:!!tb&&tb.getBoundingClientRect().height>0, sidebarHeight:sidebar?.getBoundingClientRect().height || 0, datasetLabel:document.body.textContent.includes("数据来源："), appTitle:Array.from(document.querySelectorAll("h1")).find(h=>h.offsetParent!==null)?.textContent||""}; })()');
    if(result.pageWidth>result.viewportWidth+2)errors.push(name+': horizontal overflow '+JSON.stringify(result));
    if(name==='mobile' && result.sidebarHeight>235)errors.push('mobile sidebar exceeds compact height: '+result.sidebarHeight);
    if(name==='mobile') {
      const toolbar=await evaluate('(() => { const t=document.querySelector("[role=toolbar]"); if(!t)return null; return {height:t.getBoundingClientRect().height,clientWidth:t.clientWidth,scrollWidth:t.scrollWidth}; })()');
      if(!toolbar || toolbar.height>65)errors.push('mobile toolbar not compact: '+JSON.stringify(toolbar));
      else console.log('MOBILE_TOOLBAR',JSON.stringify(toolbar));
    }
    if(!result.tableVisible||!result.chartVisible||!result.datasetLabel)errors.push(name+': missing work surface '+JSON.stringify(result));
    const img=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile('artifacts/browser/'+name+'.png',Buffer.from(img.data,'base64'));
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
  assert.equal(await clickText('表图并列'),true,'split button');
  await sleep(200);
  const before=await evaluate('(() => { const e=document.querySelector("[role=separator]"); if(!e)return null; const v=e.getAttribute("aria-valuenow"); e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));return v; })()');
  if(before===null)errors.push('keyboard separator missing');
  else {
    await sleep(200);
    const after=await evaluate('document.querySelector("[role=separator]")?.getAttribute("aria-valuenow")');
    if(Number(after)!==Math.min(75,Number(before)+5))errors.push('keyboard splitter did not update');
  }
  assert.equal(await clickText('SQL未接入'),true);
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
  // End-to-end: import a real UTF-8 CSV through the browser file input.
  const imported=await evaluate(`(() => {
    const csv='区域,金额,备注\\n华东,100,"包含,分隔符"\\n华南,200,"跨行\\n说明"\\n华北,,留空\\n';
    const input=document.querySelector('aside input[type="file"]');
    if(!input)return false;
    const transfer=new DataTransfer();
    transfer.items.add(new File([csv],'real-upload-regression.csv',{type:'text/csv'}));
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  if(!imported)errors.push('real CSV input missing');
  else {
    const previewReady=await waitFor(async()=>await evaluate('!!document.querySelector("[aria-label=\\\"文件数据预览与类型校准\\\"]")'),'file upload preview',12000);
    if(!previewReady)errors.push('real CSV preview unavailable');
    const previewRows=await evaluate('document.querySelector("[aria-label=\\\"文件数据预览与类型校准\\\"]")?.textContent || ""');
    if(!previewRows.includes('共解析 3 行数据') || !previewRows.includes('跨行'))errors.push('UTF-8 quoted CSV row count/preview mismatch');
    assert.equal(await clickText('确认导入并自动初始化透视'),true);
    await sleep(300);
    const importedState=await evaluate('({text:document.body.textContent.includes("real-upload-regression.csv (3行)"),total:document.querySelector("#pivot-main-html-table")?.textContent || ""})');
    if(!importedState.text || !importedState.total.includes('300'))errors.push('real imported pivot failed or amount aggregation incorrect: '+JSON.stringify(importedState).slice(0,600));
    const importShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile('artifacts/browser/real-csv-import.png',Buffer.from(importShot.data,'base64'));
    console.log('REAL_CSV_IMPORT',JSON.stringify({datasetVisible:importedState.text,pivotHasExpectedTotal:importedState.total.includes('300')}));
    assert.equal(await clickText('.XLSX'),true,'Excel export button');
    const xlsxName=await waitFor(async()=>{
      const files=await readdir(downloadDir);
      return files.find(name=>name.endsWith('.xlsx'));
    },'browser XLSX download',15000);
    const workbook=XLSX.read(await readFile(join(downloadDir,xlsxName)),{type:'buffer'});
    const exportedRows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,defval:''});
    if(!exportedRows.some(row=>row.some(cell=>cell===300 && typeof cell==='number')))errors.push('downloaded XLSX lacks a real numeric total cell of 300');
    if(!exportedRows.some(row=>row.some(cell=>String(cell)==='华东')))errors.push('downloaded XLSX has no imported Chinese dimension');

    assert.equal(await clickText('.CSV'),true,'CSV export button');
    const csvName=await waitFor(async()=>{
      const files=await readdir(downloadDir);
      return files.find(name=>name.endsWith('.csv'));
    },'browser CSV download',15000);
    const csvText=(await readFile(join(downloadDir,csvName))).toString('utf8');
    if(!csvText.includes('300') || !csvText.includes('华南'))errors.push('downloaded CSV does not preserve imported rows/totals');
    console.log('REAL_DOWNLOAD_ROUNDTRIP',JSON.stringify({xlsx:xlsxName,xlsxRows:exportedRows.length,csv:csvName,csvBytes:csvText.length}));
  }
  // Read-only preview must not expose active editing affordances.
  assert.equal(await clickText('工作区 ·'),true,'workspace access');
  await sleep(130);
  assert.equal(await clickText('访客预览账户'),true,'read-only role demo');
  await evaluate('document.querySelector("button[aria-label=\\\"关闭工作区\\\"]")?.click()');
  await sleep(170);
  const readonly=await evaluate('({uploadDisabled:!!document.querySelector("aside input[type=file]")?.disabled,quickFields:[...document.querySelectorAll(".ps-field-action")].every(b=>b.disabled),count:document.querySelectorAll(".ps-field-action").length})');
  if(!readonly.uploadDisabled || !readonly.quickFields || readonly.count===0)errors.push('read-only control affordances are not disabled: '+JSON.stringify(readonly));
  console.log('READONLY_AFFORDANCE',JSON.stringify(readonly));

  // Browser-level synthetic stress run; record user-visible readiness rather than extrapolating Node speed.
  assert.equal(await clickText('工作区 ·'),true);
  await sleep(120);
  assert.equal(await clickText('张工 (BI架构师)'),true);
  await evaluate('document.querySelector("button[aria-label=\\\"关闭工作区\\\"]")?.click()');
  await sleep(140);
  assert.equal(await clickText('100K压测'),true,'synthetic perf entry');
  await sleep(120);
  const perfStarted=Date.now();
  assert.equal(await clickText('生成 100,000 行合成数据'),true,'generate synthetic data');
  await waitFor(async()=>await evaluate('document.body.textContent.includes("100,000 / 100,000 行")'),'100K interface ready',60000);
  const elapsed=Date.now()-perfStarted;
  const stress=await evaluate('({label:document.body.textContent.includes("本地合成压测数据"),rows:document.querySelector("aside")?.textContent.includes("100,000 records"),table:!!document.getElementById("pivot-main-html-table"),chart:!!document.getElementById("pivot-chart-container")})');
  if(!stress.label||!stress.rows||!stress.table||!stress.chart)errors.push('100K UI failed to show actual dataset: '+JSON.stringify(stress));
  console.log('BROWSER_100K_SYNTHETIC',JSON.stringify({...stress,readyElapsedMs:elapsed,notice:'includes browser scheduling, React render and UI; CI hardware-specific'}));
  await sleep(900); // Wait for Recharts bar animation before judging painted chart.
  const drawn=await evaluate('({bars:document.querySelectorAll("#pivot-chart-container .recharts-bar-rectangle").length,axisText:[...document.querySelectorAll("#pivot-chart-container .recharts-yAxis .recharts-cartesian-axis-tick text")].map(n=>n.textContent)})');
  if(drawn.bars<1)errors.push('synthetic 100K chart has no rendered bars');
  if(!drawn.axisText.some(value=>/^(¥|\\$)?0(?:\\.0+)?$/.test(value)))errors.push('absolute positive bar chart vertical axis is not zero anchored: '+JSON.stringify(drawn.axisText));
  const labelGroups=await evaluate('document.querySelectorAll("#pivot-chart-container .recharts-label-list").length');
  if(labelGroups>0)errors.push('100K equal-value bars still have colliding numeric labels: '+labelGroups);
  console.log('BROWSER_100K_BAR_AXIS',JSON.stringify({...drawn,labelGroups}));
  const stressShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile('artifacts/browser/100k-synthetic.png',Buffer.from(stressShot.data,'base64'));

  console.log('CHROMIUM_SMOKE',errors.length?'FAIL':'PASS',errors);
  assert.equal(errors.length,0,errors.join('; '));
}catch(error){
  console.error('BROWSER_SMOKE_ERROR',error);
  throw error;
}finally{
  try{ws?.close()}catch{}
  try{chrome?.kill('SIGTERM')}catch{}
  vite.kill('SIGTERM');
  await sleep(250);
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
