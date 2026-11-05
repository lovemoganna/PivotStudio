import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
const dataset={fields:[{name:'Group',type:'text'},{name:'Amount',type:'number'}],rows:[{Group:'A',Amount:10},{Group:'B',Amount:20}]};
const config={rows:[{field:'Group'}],columns:[],values:[{id:'v',field:'Amount',agg:'sum'}],filters:[]};
test('worker reuses only acknowledged table results on chart updates and invalidates them for data/config changes',async()=>{
 const messages=[];globalThis.self={postMessage:message=>messages.push(structuredClone(message))};
 try {
  await import('../src/features/pivot/engine/pivotWorker.js?performance-test');
  const request=(id,payload)=>{messages.length=0;self.onmessage({data:{id,payload}});return messages.find(message=>message.success);};
  const first=request(1,{dataset,pivotConfig:config,chartType:'bar'});
  assert.equal(first.pivotResultId,1);
  assert.equal(first.pivotResult.columnExtremes['__GRAND_TOTAL_COL___v'].maxVal,20);
  const next=request(2,{pivotConfig:config,chartType:'line',tableResultId:first.pivotResultId});
  assert.equal(next.pivotResult,undefined,'chart edits must not clone the complete unchanged table');
  assert.equal(next.pivotResultId,first.pivotResultId);
  self.onmessage({data:{kind:'drill',generation:2,rowKey:'A',colKey:'__GRAND_TOTAL_COL__'}});
  assert.deepEqual(messages.at(-1).records,[dataset.rows[0]],'cached table retains current-generation drill buckets');
  const unacknowledged=request(3,{pivotConfig:config,chartType:'bar',tableResultId:999});
  assert.ok(unacknowledged.pivotResult,'an unknown receiver cache must receive the table');
  const filtered=request(4,{pivotConfig:{...config,filters:[{field:'Group',selectedValues:['A']}]},chartType:'bar',tableResultId:1});
  assert.equal(filtered.pivotResult.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'].display,10);
  assert.equal(filtered.pivotResultId,4);
  const replaced=request(5,{dataset:{...dataset,rows:[{Group:'A',Amount:80}]},pivotConfig:config,chartType:'bar',tableResultId:4});
  assert.equal(replaced.pivotResult.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'].display,80);
 } finally {delete globalThis.self;}
});

test('sparse transfer preserves every cell and sample explanation while sharing identical empty cells',async()=>{
 const messages=[];globalThis.self={postMessage:message=>messages.push(structuredClone(message))};
 try {
  await import('../src/features/pivot/engine/pivotWorker.js?sparse-test');
  const sparse={fields:[...dataset.fields,{name:'Period',type:'text'}],rows:[{Group:'A',Period:'P1',Amount:10},{Group:'B',Period:'P2',Amount:20},{Group:'C',Period:'P3',Amount:30}]};
  for(const showAs of ['normal','pct_grand','pct_row','prev_diff']){
   const cfg={...config,columns:[{field:'Period'}],values:[{...config.values[0],showAs}]};
   self.onmessage({data:{id:messages.length+1,payload:{dataset:sparse,pivotConfig:cfg,chartType:'bar'}}});
   const result=messages.at(-1).pivotResult,expected=calculatePivot(sparse,cfg);
   assert.deepEqual(result.displayMatrix,expected.displayMatrix);
   assert.deepEqual(result.rawValueMatrix,expected.rawValueMatrix);
   if(showAs==='normal'){
    const cells=Object.values(result.displayMatrix).filter(cell=>cell.reason==='no_records');
    assert.ok(new Set(cells).size<cells.length,'exactly equivalent empty cells share references across structured clone');
   }
  }
 } finally {delete globalThis.self;}
});
