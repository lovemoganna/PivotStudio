// Run against an already-running local dev server. Uses an isolated browser and
// generated data; never reads or replaces an existing browser tab or user file.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const url=process.env.PIVOT_BENCH_URL || 'http://127.0.0.1:5230/';
const count=Number(process.env.PIVOT_BENCH_ROWS || 100000);
const expectCache=process.env.PIVOT_BENCH_EXPECT_CACHE !== '0';
assert.ok(Number.isSafeInteger(count) && count>0 && count<=1000000);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.route('https://fonts.gstatic.com/**',route=>route.abort());
 await page.addInitScript(()=>{
  const NativeWorker=window.Worker;
  window.results=[];window.longTasks=[];window.lastTotal=null;
  window.Worker=class extends NativeWorker {
   constructor(...args){super(...args);this.addEventListener('message',({data})=>{
    if(data.success){
     if(data.pivotResult){
      const metricId=data.pivotResult.valConfigs[0]?.id;
      window.lastTotal=data.pivotResult.displayMatrix?.[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${metricId}`]?.display;
     }
     window.results.push({hasTable:Boolean(data.pivotResult),version:data.pivotResultId,total:window.lastTotal});
    }
   });}
  };
  new PerformanceObserver(list=>window.longTasks.push(...list.getEntries().map(entry=>entry.duration))).observe({type:'longtask'});
 });
 await page.goto(url);
 const csv='Group,Account,Period,Amount\n'+Array.from({length:count},(_,i)=>`G${i%20},A${i%10000},2026-${String(i%12+1).padStart(2,'0')}-01,${i%100}`).join('\n');
 await page.locator('input[type=file]').first().setInputFiles({name:'generated-performance.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'确认导入并自动构建推荐透视',exact:true}).click({timeout:90000});
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-testid=pivot-workbench]')?.dataset.calculationStatus==='idle',null,{timeout:90000});
 await ready();
 const measures=[];
 for(const [label,option] of [['切换聚合口径','avg'],['切换聚合口径','sum'],['选择图表类型','line'],['选择图表类型','bar']]){
  await page.getByLabel(label,{exact:true}).first().evaluate(element=>{
   window.actionMs=null;window.longTasks=[];
   element.addEventListener('change',()=>{
    const start=performance.now(),root=document.querySelector('[data-testid=pivot-workbench]');
    const observer=new MutationObserver(()=>{
     if(root.dataset.calculationStatus!=='idle')return;
     observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>{window.actionMs=performance.now()-start;}));
    });observer.observe(root,{attributes:true,attributeFilter:['data-calculation-status']});
   },{capture:true,once:true});
  });
  await page.getByLabel(label,{exact:true}).first().selectOption(option);await ready();
  await page.waitForFunction(()=>typeof window.actionMs==='number');
  const sample=await page.evaluate(()=>({inputToPaintMs:Math.round(window.actionMs),maxLongTaskMs:Math.round(Math.max(0,...window.longTasks)),response:window.results.at(-1)}));
  if(label==='选择图表类型')assert.equal(sample.response.hasTable,!expectCache,'chart result-transfer contract');
  else assert.equal(sample.response.hasTable,true,'changed statistics must send a fresh table');
  const cycles=Math.floor(count/100),remainder=count%100;
  const total=cycles*4950+remainder*(remainder-1)/2;
  assert.equal(sample.response.total,option==='avg'?total/count:total,'table total remains correct through chart changes');
  measures.push({action:option,...sample});
 }
 console.log(JSON.stringify({rows:count,scope:'Generated 10k-account cross-tab; isolated Chromium; input to two frames after result commit. Not the user-loaded dataset or a production SLA.',measures},null,2));
} finally {await browser.close();}
