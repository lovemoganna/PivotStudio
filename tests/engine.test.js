import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSVRecords,parseCSVTextToSheet} from '../src/utils/csvParser.js';
import {computeAggregation,calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {generateDuckDBPivotSQL} from '../src/services/duckdbQuery.js';

test('quoted CSV supports multi-line data',()=>{
  assert.deepEqual(parseCSVRecords('a,b\r\n"x,y","quoted ""word""\nline"\r\n'),[['a','b'],['x,y','quoted "word"\nline']]);
});
test('CSV rejects malformed and duplicate headings',()=>{
  assert.throws(()=>parseCSVRecords('a\n"broken'));
  assert.throws(()=>parseCSVTextToSheet('a,a\n1,2'));
  assert.throws(()=>parseCSVTextToSheet('a,b\n1,2,3'), /无表头字段/);
  assert.equal(parseCSVTextToSheet('a,b\n1').rows[0].b, '');
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

test('multi-dimensional pivot preserves audited totals, filters and underlying record evidence',()=>{
  const regions=['华东','华南','华北'], years=['2025','2026'], channels=['线上','线下'];
  const rows=Array.from({length:144},(_,i)=>({
    region:regions[i%3],year:years[Math.floor(i/3)%2],channel:channels[Math.floor(i/6)%2],
    amount:i%17===0?null:(i%13)-4,
    user:'U'+i%19
  }));
  const fields=[{name:'region',type:'text'},{name:'year',type:'text'},{name:'channel',type:'text'},{name:'amount',type:'number'},{name:'user',type:'text'}];
  const base={
    rows:[{field:'region',sort:'none'}],
    columns:[{field:'year',sort:'none'}],
    values:[
      {id:'sum',field:'amount',agg:'sum'},
      {id:'count',field:'amount',agg:'count'},
      {id:'avg',field:'amount',agg:'avg'},
      {id:'distinct',field:'user',agg:'count_distinct'}
    ],filters:[],showSubtotals:false
  };
  const configurations=[
    base,
    {...base,filters:[{field:'channel',selectedValues:['线上']}]},
    {...base,filters:[{field:'channel',selectedValues:['线下']}]},
    {...base,filters:[{field:'year',selectedValues:['2026']}]}
  ];
  for(const cfg of configurations){
    const result=calculatePivot({fields,rows},cfg);
    const expectedRows=rows.filter(r=>cfg.filters.every(f=>f.selectedValues.includes(String(r[f.field]))));
    assert.equal(result.filteredCount,expectedRows.length);
    for(const region of regions){
      for(const year of years){
        const matching=expectedRows.filter(r=>r.region===region && r.year===year);
        const finite=matching.filter(r=>r.amount !== null);
        const sum=finite.reduce((a,r)=>a+r.amount,0);
        const avg=finite.length?sum/finite.length:0;
        const prefix=region+'@@'+year+'@@';
        assert.equal((result.rawValueMatrix[prefix+'sum'] ?? 0),sum);
        assert.equal((result.rawValueMatrix[prefix+'count'] ?? 0),finite.length);
        assert.equal((result.rawValueMatrix[prefix+'avg'] ?? 0),avg);
        assert.equal((result.rawValueMatrix[prefix+'distinct'] ?? 0),new Set(matching.map(r=>r.user)).size);
        assert.equal((result.cellRecordsMap.get(region+'@@'+year)||[]).length,matching.length);
      }
    }
    const finite=expectedRows.filter(r=>r.amount !== null);
    assert.equal(result.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@sum'],finite.reduce((a,r)=>a+r.amount,0));
    const transferred=structuredClone(result);
    assert.ok(transferred.cellRecordsMap instanceof Map);
    assert.equal(transferred.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@sum'],result.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@sum']);
  }
});

test('histogram excludes missing and invalid values without changing other chart results',()=>{
  const ds={
    fields:[{name:'region',type:'text'},{name:'amount',type:'number'}],
    rows:[{region:'A',amount:null},{region:'A',amount:''},{region:'A',amount:10},
          {region:'B',amount:20},{region:'B',amount:'invalid'}]
  };
  const cfg={rows:[{field:'region'}],columns:[],values:[{id:'v1',field:'amount',agg:'sum'}],filters:[]};
  const pivot=calculatePivot(ds,cfg);
  const histogram=buildUnifiedChartSpec(ds,pivot,'histogram',{histogramBins:4});
  const normal=buildUnifiedChartSpec(ds,pivot,'bar',{});
  assert.equal(histogram.histogramItems.reduce((sum,bin)=>sum+bin.count,0),2);
  assert.equal(histogram.histogramItems.reduce((sum,bin)=>sum+bin.matchedRows.length,0),2);
  assert.equal(normal.histogramItems.length,0);
  assert.equal(normal.primaryStats.total,30);
});
