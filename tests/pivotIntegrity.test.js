import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot,computeAggregation} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {parseCSVTextToSheet} from '../src/utils/csvParser.js';
import {normalizeScalar,analyticNumber} from '../src/utils/normalizeScalar.js';
import {buildPivotExportRows} from '../src/utils/exportMatrix.js';
import {cellEvidence} from '../src/utils/resultEvidence.js';
const ds={fields:[{name:'Parent',type:'text'},{name:'Child',type:'text'},{name:'Series',type:'text'},{name:'X',type:'number'},{name:'Y',type:'number'}],rows:[['A',10,10],['A',30,10],['B',30,10],['B',90,30]].map(([Child,X,Y])=>({Parent:'P',Child,Series:'S',X,Y}))};
const cfg=(agg='avg')=>({rows:[{field:'Parent'},{field:'Child'}],columns:[{field:'Series'}],values:[{field:'X',id:'x',agg}]});
const total=(p,id='x')=>p.displayMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${id}`];
const chartValue=c=>c.items[0][c.primarySeriesKey];
test('chart parent aggregates use source records for every aggregation, independent of row folding',()=>{
 for(const agg of ['sum','avg','count','count_distinct','min','max','median','stddev']){
  const config=cfg(agg);const p=calculatePivot(ds,config);const key=p.tableRows[0].headerCells[0].key;
  const expected=computeAggregation(ds.rows,'X',agg);
  for(const collapsedRowKeys of [{},{[key]:true}]){
   const result=calculatePivot(ds,{...config,collapsedRowKeys});
   const c=buildUnifiedChartSpec(ds,result,'bar',{});
   assert.equal(chartValue(c),expected,agg);assert.equal(total(result).display,expected);
   assert.equal(c.items[0]._seriesEvidence[c.primarySeriesKey].samples.total,4);
   assert.equal(buildPivotExportRows(result).at(-1).at(-1),expected);
  }
 }
 const unequal={...ds,rows:[ds.rows[0],ds.rows[1],ds.rows[3]]};
 assert.equal(chartValue(buildUnifiedChartSpec(unequal,calculatePivot(unequal,cfg()),'bar',{})),130/3);
});
test('chart formula rollup recomputes ratio rather than adding subgroup ratios',()=>{
 const config=cfg();config.values=[{field:'ratio',id:'x',isCalculated:true,agg:'calc',formula:'SUM([X])/SUM([Y])'}];
 const p=calculatePivot(ds,config),c=buildUnifiedChartSpec(ds,p,'bar',{});
 assert.equal(chartValue(c),160/60);assert.equal(chartValue(c),total(p).display);
});
test('show-as values are computed at chart grain with filters preserved',()=>{
 for(const showAs of ['pct_row','pct_col','pct_grand','running_total','prev_diff','pct_prev_diff']){
  const config=cfg();config.values[0].showAs=showAs;config.rows[1].excludedValues=['A'];
  const p=calculatePivot(ds,config),c=buildUnifiedChartSpec(ds,p,'bar',{});
  const expected=calculatePivot({...ds,rows:ds.rows.filter(r=>r.Child==='B')},{...config,rows:[config.rows[0]]});
  const cell=expected.displayMatrix[`P@@${expected.leafColGroups[0].key}@@x`];
  assert.equal(chartValue(c),cell.display,showAs);
 }
});
test('row and column folding leave detailed chart data invariant',()=>{
 const config={...cfg(),columns:[{field:'Series'},{field:'Child'}]};
 const base=calculatePivot(ds,config);const keys={rows:base.tableRows[0].headerCells[0].key,cols:base.colHeaderRows[0][0].key};
 for(const options of [{collapsedRowKeys:{[keys.rows]:true}},{collapsedColKeys:{[keys.cols]:true}}]){
  for(const groupingMode of ['grouped','detailed']){
   const chart=p=>buildUnifiedChartSpec(ds,p,'bar',{groupingMode});
   const normal=chart(base),folded=chart(calculatePivot(ds,{...config,...options}));
   assert.deepEqual(folded.items.map(i=>i._rawSeriesValues),normal.items.map(i=>i._rawSeriesValues));
  }
 }
});
test('unsafe integers remain distinct text regardless of field spelling or late position',()=>{
 for(const field of ['标识','arbitrary field','測定対象']){
  const values=[...Array.from({length:110},(_,i)=>String(i+1)),'9007199254740992','9007199254740993'];
  const sheet=parseCSVTextToSheet(`${field},X\n`+values.map(v=>`${v},1`).join('\n'));
  assert.equal(sheet.fields[0].type,'text');assert.equal(sheet.fields[0].precisionProtected,true);
  assert.match(sheet.importMeta.warnings,/安全整数/);
  const rows=sheet.rows.map(r=>({...r,[field]:normalizeScalar(r[field],sheet.fields[0].type)}));
  assert.equal(computeAggregation(rows,field,'count_distinct'),112);
 }
 assert.equal(normalizeScalar('9007199254740993','number'),'9007199254740993');
 assert.equal(analyticNumber('9007199254740993'),null);
 assert.equal(analyticNumber('9007199254740991'),Number.MAX_SAFE_INTEGER);
 assert.equal(analyticNumber(1e308),1e308);
});
test('sample evidence follows filtering and distinguishes invalid, missing, genuine zero and small samples',()=>{
 const dataset={fields:[{name:'G',type:'text'},{name:'X',type:'number'}],rows:[{G:'A',X:10},{G:'A',X:'bad'},{G:'A',X:null},{G:'B',X:0}]};
 const config={rows:[{field:'G'}],filters:[{field:'G',selectedValues:['A']}],values:[{field:'X',id:'x',agg:'avg'}]};
 const p=calculatePivot(dataset,config);assert.deepEqual(p.sampleStatsByValId.x,{value:10,total:3,valid:1,missing:1,invalid:1});
 assert.match(cellEvidence(total(p)),/记录总数 3.*有效记录 1.*空值排除 1.*无效数值排除 1/);
 const lone=calculatePivot({...dataset,rows:[{G:'B',X:0}]},{values:[{field:'X',id:'x',agg:'stddev'}]});
 assert.equal(total(lone).reason,'insufficient_samples');
 assert.equal(total(calculatePivot({...dataset,rows:[{G:'B',X:0}]},{values:[{field:'X',id:'x',agg:'sum'}]})).reason,null);
});
test('unavailable cells expose truthful reasons without changing export placeholders',()=>{
 const config={rows:[{field:'Parent'}],values:[{field:'quotient',id:'q',isCalculated:true,agg:'calc',formula:'SUM([X])/SUM([Y])'}]};
 const p=calculatePivot({...ds,rows:[{Parent:'P',X:10,Y:0}]},config);
 assert.equal(total(p,'q').display,null);assert.equal(total(p,'q').reason,'zero_denominator');
 assert.equal(buildPivotExportRows(p).at(-1).at(-1),'-');
 assert.equal(total(calculatePivot({...ds,rows:[]},cfg())).reason,'no_records');
 assert.equal(total(calculatePivot({...ds,rows:[{X:'bad'}]},{values:[{field:'X',id:'x',agg:'avg'}]})).reason,'no_valid_numbers');
});
