import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { buildHistogramBins, matchesHistogramBin } from '../src/features/pivot/engine/histogram.js';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';
import { buildUnifiedChartSpec } from '../src/features/pivot/engine/buildChartSpec.js';

const config={rows:[{field:'Group'}],columns:[],filters:[],values:[{id:'v',field:'Amount',agg:'sum'}]};
const dataset=(count,groups=1)=>({fields:[{name:'Group',type:'text'},{name:'Amount',type:'number'}],rows:Array.from({length:count},(_,i)=>({Group:`Group${i%groups}`,Amount:i,__RAW_RECORD_ONLY__:'private raw value'}))});

test('histogram covers all filtered records instead of its first 50 samples',()=>{
  const data=dataset(1000);const pivot=calculatePivot(data,config);
  const chart=buildUnifiedChartSpec(data,pivot,'histogram',{});
  assert.equal(chart.histogramItems.reduce((n,bin)=>n+bin.count,0),1000);
  for(const record of data.rows)assert.equal(chart.histogramItems.filter(bin=>matchesHistogramBin(record,bin)).length,1);
});

test('histogram ignores missing/invalid values, retains zero and closes only the last upper edge',()=>{
  const rows=[null,undefined,'',' ','bad',Infinity,-Infinity,0,.1,.2,'1,000'].map(Amount=>({Amount}));
  const bins=buildHistogramBins(rows,'Amount',4);
  assert.equal(bins.reduce((n,b)=>n+b.count,0),4);
  assert.equal(bins.at(-1).includeMax,true);
  assert.equal(bins.at(-1).high,1000);
  assert.equal(buildHistogramBins([{Amount:5},{Amount:5}],'Amount',10).length,1);
  assert.equal(buildHistogramBins([{Amount:null}],'Amount').length,0);
  const extremes=buildHistogramBins([-1e308,0,1e308].map(Amount=>({Amount})),'Amount',10);
  assert.equal(extremes.reduce((n,b)=>n+b.count,0),3);
  assert.ok(extremes.every(b=>Number.isFinite(b.low)&&Number.isFinite(b.high)));
});

test('large chart groups require explicit scope while full pivot and KPI totals remain',()=>{
  const data=dataset(2500,2500);const pivot=calculatePivot(data,config);
  const blocked=buildUnifiedChartSpec(data,pivot,'bar',{});
  assert.equal(blocked.renderLimit.groupCount,2500);assert.equal(blocked.items.length,0);assert.equal(blocked.primaryStats.total,3123750);
  assert.equal(pivot.tableRows.length,2501);assert.equal(pivot.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'],3123750);
  for(const type of ['bar','line','pie','heatmap']) {
    const chart=buildUnifiedChartSpec(data,pivot,type,{topN:10,sortMode:'desc'});
    assert.equal(chart.renderLimit,undefined);assert.equal(chart.items.length,10);
    assert.deepEqual(chart.scope,{shown:10,total:2500});assert.equal(chart.items[0].rowKey,'Group2499');
    assert.deepEqual(chart.kpiCards,blocked.kpiCards);
  }
});

test('actual worker transfers no chart raw samples and drills complete histogram bins',async()=>{
  const url=new URL('../src/features/pivot/engine/pivotWorker.js',import.meta.url).href;
  const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:m=>parentPort.postMessage(m)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
  const next=predicate=>new Promise((resolve,reject)=>{const onMessage=data=>{if(predicate(data)){worker.off('message',onMessage);worker.off('error',reject);resolve(data)}};worker.on('message',onMessage);worker.once('error',reject);});
  try {
    const data=dataset(1000);const resultPromise=next(m=>m.success!==undefined);
    worker.postMessage({id:1,payload:{dataset:data,pivotConfig:config,chartType:'histogram',chartSpecConfig:{histogramBins:4}}});
    const result=await resultPromise;assert.equal(result.success,true);
    assert.equal(JSON.stringify(result).includes('__RAW_RECORD_ONLY__'),false);
    const bin=result.unifiedChartSpec.histogramItems[0];assert.equal(bin.count,250);
    const drillPromise=next(m=>m.kind==='drill');
    worker.postMessage({kind:'drill',generation:1,rowKey:'__GRAND_TOTAL_ROW__',colKey:'__GRAND_TOTAL_COL__',histogramBin:0,metadata:{}});
    const drill=await drillPromise;assert.equal(drill.records.length,250);
    assert.ok(drill.records.every(record=>matchesHistogramBin(record,bin)));
  } finally {await worker.terminate();}
});


test('chart limits preserve a 365-day trend and retain compact heatmap bounds',()=>{
  const data=dataset(365,365);const pivot=calculatePivot(data,config);
  const line=buildUnifiedChartSpec(data,pivot,'line',{});
  assert.equal(line.renderLimit,undefined);assert.equal(line.items.length,365);
  assert.equal(buildUnifiedChartSpec(data,pivot,'heatmap',{}).renderLimit.maximum,200);
});
