// Chromium integration smoke: DOM interactions and responsive geometry.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),'pivotstudio-chrome-'));
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
  await send('Page.navigate',{url:'http://127.0.0.1:5173/'});
  await waitFor(async()=>(await evaluate("document.querySelector('h1')?.textContent || ''")).includes('PivotStudio'),'React app');
  const errors=[];
  for(const [name,width,height] of [['mobile',390,844],['tablet',768,900],['desktop',1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    await sleep(400);
    const result=await evaluate('(() => { const ch=document.getElementById("pivot-chart-container"); const tb=document.getElementById("pivot-main-html-table"); return {pageWidth:document.documentElement.scrollWidth, viewportWidth:innerWidth, chartVisible:!!ch&&ch.getBoundingClientRect().height>0, tableVisible:!!tb&&tb.getBoundingClientRect().height>0, datasetLabel:document.body.textContent.includes("数据来源："), appTitle:document.querySelector("h1")?.textContent||""}; })()');
    if(result.pageWidth>result.viewportWidth+2)errors.push(name+': horizontal overflow '+JSON.stringify(result));
    if(!result.tableVisible||!result.chartVisible||!result.datasetLabel)errors.push(name+': missing work surface '+JSON.stringify(result));
    const img=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile('artifacts/browser/'+name+'.png',Buffer.from(img.data,'base64'));
    console.log(JSON.stringify({viewport:name,...result}));
  }
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
  assert.equal(await clickText('SQL代理'),true);
  await sleep(160);
  const sql=await evaluate('document.querySelector("[role=dialog]")?.textContent || ""');
  if(!sql.includes('尚未实现'))errors.push('SQL integration misrepresented');
  await evaluate('document.querySelector("button[aria-label=\\"关闭数据源\\"]")?.click()');
  assert.equal(await clickText('GSheet'),true);
  await sleep(160);
  const gsheet=await evaluate('document.querySelector("[role=dialog]")?.textContent || ""');
  if(!gsheet.includes('公开'))errors.push('GSheet access limits missing');
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
