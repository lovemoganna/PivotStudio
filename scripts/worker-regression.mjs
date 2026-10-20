import { Worker } from 'node:worker_threads';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

// Run the actual browser worker module with a minimal Node message bridge.
const workerURL = new URL('../src/features/pivot/engine/pivotWorker.js', import.meta.url).href;
const makeWorker = () => new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:m=>parentPort.postMessage(m)};import(${JSON.stringify(workerURL)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`, { eval: true });
const worker = makeWorker();
const fields = [{name:'区域',type:'text'},{name:'金额',type:'number'}];
const rows = Array.from({length:500000},(_,i)=>({'区域':`区域${i%10}`,'金额':i%100}));
const pivotConfig = {rows:[{field:'区域'}],columns:[],filters:[],values:[{id:'v',field:'金额',agg:'sum'}]};
let ticks = 0, progress = [];
const timer = setInterval(()=>ticks++,10);
const t = performance.now();
const result = await new Promise((resolve,reject)=>{
  worker.on('error',reject);
  worker.on('message',m=>{if(m.progress!==undefined)progress.push(m.progress);else resolve(m)});
  worker.postMessage({id:1,payload:{dataset:{fields,rows},pivotConfig,chartType:'bar',chartSpecConfig:{}}});
});
clearInterval(timer);
assert.equal(result.success,true);
assert.equal(result.pivotResult.totalCount,500000);
assert.equal(result.pivotResult.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'],24750000);
assert.ok(progress.length>10 && ticks>5);
console.log(JSON.stringify({rows:500000,wallMs:Math.round(performance.now()-t),mainThreadTicks:ticks,progressEvents:progress.length}));
await worker.terminate();
const cancelled=makeWorker();
cancelled.postMessage({id:2,payload:{dataset:{fields,rows},pivotConfig,chartType:'bar',chartSpecConfig:{}}});
await cancelled.terminate();
console.log('PASS worker aggregation, progress, termination; browser responsiveness tested separately');
