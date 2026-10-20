import test from 'node:test';
import assert from 'node:assert/strict';
import { profileField } from '../src/features/pivot/engine/profileField.js';
test('worker field statistics preserve missingness and transformed-to-raw filter mapping',()=>{
  const ds={fields:[{name:'date',type:'date'},{name:'value',type:'number'}],rows:[{date:'2024-01-01',value:0},{date:'2024-02-01',value:20},{date:'2025-01-01',value:null}]};
  const numeric=profileField(ds,'value');
  assert.equal(numeric.nonNullCount,2);assert.equal(numeric.nullCount,1);assert.equal(numeric.numAvg,10);
  const date=profileField(ds,'date',{field:'date',dateGranularity:'year'},'2024年');
  assert.deepEqual(date.matchingRawValues,['2024-01-01','2024-02-01']);
  assert.deepEqual(date.distinctValues,['2024年','2025年']);
});
