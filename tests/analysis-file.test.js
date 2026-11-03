import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalysisFile,parseAnalysisFile} from '../src/utils/analysisFile.js';
import {viewCompatibility} from '../src/utils/viewCompatibility.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
const data=n=>({name:'Synthetic readings',fields:[{name:'Group',type:'text'},{name:'Period',type:'text'},{name:'Reading',type:'number'},{name:'RecordId',type:'text'}],rows:Array.from({length:n},(_,i)=>({Group:i%2?'B':'A',Period:i%3?'P2':'P1',Reading:i+1,RecordId:'9007199254740993123'}))});
const config={rows:[{id:'r',field:'Group'}],columns:[{id:'c',field:'Period'}],filters:[{id:'f',field:'Group',selectedValues:['A']}],values:[{id:'sum',field:'Reading',agg:'sum'},{id:'calc',field:'Double',isCalculated:true,formula:'SUM([Reading])*2'}]};
test('100-row data and complete configuration roundtrip; 1000 rows reuse schema regardless of order',()=>{
  const saved=createAnalysisFile(data(100),{fullConfig:config,csc:{primaryValueId:'sum'},ts:{density:'compact'}});
  const restored=parseAnalysisFile(JSON.stringify(saved));
  assert.equal(restored.dataset.rows.length,100);
  assert.equal(restored.dataset.rows[0].RecordId,'9007199254740993123');
  assert.deepEqual(restored.view.fullConfig.values,config.values);
  const replacement=data(1000);replacement.fields.reverse();
  assert.deepEqual(viewCompatibility(restored.view.fullConfig,restored.view.schema,replacement,{allFields:true}),[]);
  for(const [n,expected] of [[100,2500],[1000,250000]]) {
    const result=calculatePivot(data(n),restored.view.fullConfig);
    assert.equal(result.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@sum'].display,expected);
    assert.equal(result.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@calc'].display,expected*2);
  }
});
test('missing unused fields and changed types are explicit; rows are never the compatibility key',()=>{
  const saved=createAnalysisFile(data(100),{fullConfig:config});
  const missing=data(1000);missing.fields=missing.fields.filter(f=>f.name!=='RecordId');
  assert.match(viewCompatibility(saved.view.fullConfig,saved.view.schema,missing,{allFields:true}).join(),/缺少字段：RecordId/);
  const changed=data(1000);changed.fields.find(f=>f.name==='Reading').type='text';
  assert.match(viewCompatibility(saved.view.fullConfig,saved.view.schema,changed,{allFields:true}).join(),/类型或数值尺度不匹配：Reading/);
});
test('malformed files fail before any state change, while unknown metadata and row properties are excluded',()=>{
  assert.throws(()=>parseAnalysisFile('{'),/JSON/);
  assert.throws(()=>parseAnalysisFile('{"version":900}'),/版本/);
  const ds=data(1);ds.secret='ignore';ds.rows[0].extra='ignore';
  const saved=createAnalysisFile(ds,{fullConfig:config,secret:'ignore'});
  assert.equal(saved.dataset.secret,undefined);assert.equal(saved.dataset.rows[0].extra,undefined);
  saved.view.fullConfig.rows[0].field='Missing';
  assert.throws(()=>parseAnalysisFile(JSON.stringify(saved)),/缺少字段：Missing/);
});
