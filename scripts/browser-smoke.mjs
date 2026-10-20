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
  const navigation=await send('Page.navigate',{url:'http://127.0.0.1:5173/'});
  console.log('BROWSER_NAVIGATION',JSON.stringify(navigation));
  await sleep(2500);
  console.log('BROWSER_BOOT',JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,title:document.title,body:document.body?.innerText.slice(0,500),html:document.documentElement?.outerHTML.slice(0,800)})')));
  await waitFor(async()=>await evaluate("Array.from(document.querySelectorAll('h1')).some(h => h.textContent.includes('PivotStudio'))"),'React app',12000);
  const errors=[];
  for(const [name,width,height] of [['mobile',390,844],['tablet',768,900],['desktop',1440,900]]){
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
