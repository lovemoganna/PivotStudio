import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveChartNote,buildTotalReading} from '../src/utils/analysisReading.js';
import {computeAggregation} from '../src/features/pivot/engine/calculatePivot.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
test('generated prompts never become findings about unrelated configured fields or filters',()=>{
 const shot={title:'Wrong title',subtitle:'Capacity: Alpha occurs most',generated:true};
 const cfg={rows:[{field:'Group'}],values:[{field:'Value',agg:'stddev'}],filters:[{field:'Group',selectedValues:['Beta']}]};
 for(const hasCustom of [false,true]) {
  const note=resolveChartNote(shot,hasCustom,cfg);
  assert.equal(note.authored,false);assert.match(note.body,/Value（标准差）/);assert.match(note.body,/已筛选/);
  assert.doesNotMatch(note.body,/Capacity|Alpha/);assert.notEqual(note.title,shot.title);
 }
 const changed=resolveChartNote(shot,false,{values:[{field:'任意字段',agg:'count_distinct'}]});
 assert.match(changed.body,/任意字段（去重计数）/);assert.doesNotMatch(changed.body,/Value/);
});
test('summary counts only calculable groups and higher than mean is strictly higher',()=>{
 const fields=[{name:'g',type:'text'},{name:'x',type:'number'}];
 const config={rows:[{field:'g'}],values:[{id:'x',field:'x',agg:'stddev'}]};
 const ds={fields,rows:[{g:'A',x:10},{g:'A',x:30},{g:'B',x:60},{g:'B',x:null}]};
 const insight=buildUnifiedChartSpec(ds,calculatePivot(ds,config),'bar',{}).executiveInsight;
 assert.equal(insight.totalGroupCount,2);assert.equal(insight.groupCount,1);assert.equal(insight.aboveMeanCount,0);
 const tied={fields,rows:[{g:'A',x:10},{g:'B',x:10}]};
 const sum={...config,values:[{id:'x',field:'x',agg:'sum'}]};
 const equal=buildUnifiedChartSpec(tied,calculatePivot(tied,sum),'bar',{}).executiveInsight;
 assert.equal(equal.groupCount,2);assert.equal(equal.aboveMeanCount,0);
});
test('authored and legacy saved notes are preserved even when configuration changes',()=>{
 for(const shot of [{title:'Reviewed',subtitle:'My findings',generated:false},{title:'Legacy',subtitle:'Previous note'}]) {
  const note=resolveChartNote(shot,true,{values:[{field:'Other',agg:'avg'}]});
  assert.equal(note.authored,true);assert.equal(note.title,shot.title);assert.equal(note.body,shot.subtitle);
 }
 assert.equal(resolveChartNote({title:'Blank',subtitle:'',generated:false},true,{}).body,'');
});
test('sample spread, median and distinct explanations match the actual aggregation definitions',()=>{
 const rows=[10,30,null].map(v=>({v}));
 assert.ok(Math.abs(computeAggregation(rows,'v','stddev')-Math.sqrt(200))<1e-10);
 assert.equal(computeAggregation(rows,'v','median'),20);
 const notes=buildTotalReading([{field:'v',agg:'stddev'},{field:'v',agg:'median'},{field:'v',agg:'count_distinct'}]).join();
 assert.match(notes,/样本口径（n−1）/);assert.match(notes,/至少需要两个/);assert.match(notes,/中间两值/);assert.match(notes,/不同的非空值/);
 assert.doesNotMatch(buildTotalReading([{field:'calc',agg:'stddev',isCalculated:true}]).join(),/样本口径/);
});
