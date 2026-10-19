import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSVRecords,parseCSVTextToSheet} from '../src/utils/csvParser.js';
import {computeAggregation,calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {generateDuckDBPivotSQL} from '../src/services/duckdbQuery.js';

test('quoted CSV supports multi-line data',()=>{
  assert.deepEqual(parseCSVRecords('a,b\r\n"x,y","quoted ""word""\nline"\r\n'),[['a','b'],['x,y','quoted "word"\nline']]);
});
test('CSV rejects malformed and duplicate headings',()=>{
  assert.throws(()=>parseCSVRecords('a\n"broken'));
  assert.throws(()=>parseCSVTextToSheet('a,a\n1,2'));
});
test('numeric aggregation ignores blank, null and invalid numbers',()=>{
  const rows=[{v:10},{v:null},{v:''},{v:'oops'},{v:20},{v:Infinity}];
  assert.equal(computeAggregation(rows,'v','sum'),30);
  assert.equal(computeAggregation(rows,'v','avg'),15);
  assert.equal(computeAggregation(rows,'v','min'),10);
  assert.equal(computeAggregation(rows,'v','max'),20);
  assert.equal(computeAggregation(rows,'v','count'),4);
  assert.equal(computeAggregation(rows,'v','count_distinct'),4);
});
test('pivot groups and filters correctly',()=>{
  const ds={fields:[{name:'zone',type:'text'},{name:'year',type:'text'},{name:'amount',type:'number'}],rows:[
    {zone:'A',year:'2025',amount:10},{zone:'B',year:'2025',amount:20},{zone:'A',year:'2026',amount:30}
  ]};
  const cfg={rows:[{field:'zone'}],columns:[{field:'year'}],values:[{id:'v1',field:'amount',agg:'sum'}],filters:[]};
  const p=calculatePivot(ds,cfg);
  assert.equal(p.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'],60);
  assert.equal(p.rawValueMatrix['A@@2025@@v1'],10);
  const f=calculatePivot(ds,{...cfg,filters:[{field:'zone',selectedValues:['A']}]});
  assert.equal(f.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'],40);
});
test('SQL template groups by transformed year expression',()=>{
  const sql=generateDuckDBPivotSQL({id:'sales-data'},{rows:[{field:'order date',dateGranularity:'year'}],values:[{field:'amount',agg:'sum'}]});
  assert.match(sql,/GROUP BY ROLLUP\(EXTRACT\(YEAR FROM TRY_CAST\("order date" AS DATE\)\)\)/);
  assert.match(sql,/FROM "sales-data"/);
  assert.match(sql,/TEMPLATE ONLY/);
});
