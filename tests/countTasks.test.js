import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot,computeAggregation} from '../src/features/pivot/engine/calculatePivot.js';
import {buildPivotExportRows} from '../src/utils/exportMatrix.js';

test('counts retain zero and false, exclude missing/blank, and deduplicate across groups',()=>{
  for(const field of ['Token','样本标识','arbitrary identifier']){
    const rows=[['A','X'],['A','X'],['A',null],['A',0],['B','X'],['B','Y'],['B',undefined],['B','   ']].map(([Group,value])=>({Group,[field]:value}));
    const dataset={fields:[{name:'Group',type:'text'},{name:field,type:'text'}],rows};
    const values=[{id:'all',field:'__COUNT__',agg:'count'},{id:'valid',field,agg:'count'},{id:'unique',field,agg:'count_distinct'}];
    for(const [filters,expected] of [[[],[8,5,3]],[[{field:'Group',selectedValues:['A']}],[4,3,2]],[[{field:'Group',selectedValues:['B']}],[4,2,2]],[[{field:'Group',excludeAll:true}],[0,0,0]]]){
      const pivot=calculatePivot(dataset,{rows:[{field:'Group'}],values,filters});
      assert.deepEqual(values.map(v=>pivot.displayMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${v.id}`].raw),expected);
      assert.deepEqual(buildPivotExportRows(pivot).at(-1).slice(-3),expected);
    }
  }
  const records=[false,false,true,0,0,null,undefined,'','  '].map(value=>({Value:value}));
  assert.equal(computeAggregation(records,'__COUNT__','count'),9);
  assert.equal(computeAggregation(records,'Value','count'),5);
  assert.equal(computeAggregation(records,'Value','count_distinct'),3);
});
