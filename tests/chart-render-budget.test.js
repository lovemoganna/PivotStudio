import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
const config={rows:[{field:'Account'}],columns:[{field:'Time'}],values:[{id:'v',field:'Amount',agg:'sum'}],filters:[]};
const data=series=>({fields:[{name:'Account',type:'text'},{name:'Time',type:'text'},{name:'Amount',type:'number'}],rows:Array.from({length:350},(_,i)=>({Account:'A'+i%87,Time:'T'+i%series,Amount:i+1}))});
test('wide sparse charts bound series even when TopN would still leave an unreadable legend',()=>{
 const pivot=calculatePivot(data(165),config),before=JSON.stringify(pivot.displayMatrix);
 for(const type of ['bar','line','area','heatmap'])for(const topN of [0,10]){
  const spec=buildUnifiedChartSpec(data(165),pivot,type,{topN});
  assert.equal(spec.renderLimit?.kind,'series',type);
  assert.equal(spec.renderLimit.seriesCount,165);
  assert.equal(spec.items.length,0);
 }
 assert.equal(JSON.stringify(pivot.displayMatrix),before);
 assert.equal(pivot.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'].display,61425);
});
test('within the series budget, chart marks are bounded and explicit TopN recovers',()=>{
 const dataset=data(24),pivot=calculatePivot(dataset,config);
 for(const type of ['bar','line','area','heatmap']){
  const spec=buildUnifiedChartSpec(dataset,pivot,type,{});
  assert.equal(spec.renderLimit?.kind,'marks',type);
  assert.equal(spec.renderLimit.markCount,87*24);
  const scoped=buildUnifiedChartSpec(dataset,pivot,type,{topN:10,sortMode:'desc'});
  assert.equal(scoped.renderLimit,undefined);
  assert.equal(scoped.items.length,10);
 }
});
