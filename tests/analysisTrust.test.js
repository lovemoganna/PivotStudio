import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {periodIndex} from '../src/utils/temporalAnalysis.js';
import {getMeasureDefaults} from '../src/utils/fieldSemantics.js';
import {normalizeImportedValue,hasPercentageFormat} from '../src/utils/percentScale.js';
import {datasetSchema,viewCompatibility} from '../src/utils/viewCompatibility.js';
import {UnifiedFormatter} from '../src/utils/formatters.js';
import {buildPivotExportRows,excelNumberFormat} from '../src/utils/exportMatrix.js';
import {decodeView,encodeView} from '../src/utils/viewConfig.js';
import XLSX from 'xlsx';

function chart(dates, values, granularity='month',options={}) {
 const dataset={fields:[{name:'t',type:'date'},{name:'x',type:'number'}],rows:dates.map((t,i)=>({t,x:values[i]}))};
 const pivot=calculatePivot(dataset,{rows:[{field:'t',dateGranularity:granularity,sort:'desc'}],values:[{id:'x',field:'x',agg:'sum'}]});
 return buildUnifiedChartSpec(dataset,pivot,'line',{lineDerivedMetric:'mom_pct',...options});
}
const derived=c=>c.items.map(i=>i[c.derivedSeriesKey]);
test('time calculations use calendar order and do not bridge a missing period',()=>{
 const c=chart(['2026-04-01','2026-01-01','2026-02-01'],[200,100,150]);
 assert.deepEqual(c.items.map(i=>i.name),['2026-01','2026-02','2026-04']);
 assert.deepEqual(derived(c),[null,50,null]);assert.equal(c.hasPeriodGaps,true);
 assert.match(chart(['2026-01-01','2026-02-01'],[100,50],'month',{sortMode:'desc'}).derivedIssue,/排序/);
});
test('non-date, multi-dimension and unbucketed axes cannot claim period growth',()=>{
 for(const field of [{name:'k',type:'text'},{name:'k',type:'number'}]){
  const ds={fields:[field,{name:'v',type:'number'}],rows:[{k:1,v:10},{k:2,v:20}]};
  const c=buildUnifiedChartSpec(ds,calculatePivot(ds,{rows:[{field:'k'}],values:[{field:'v',id:'v',agg:'sum'}]}),'line',{lineDerivedMetric:'mom_pct'});
  assert.equal(c.derivedSeriesKey,null);assert.match(c.derivedIssue,/日期/);
 }
 assert.ok(chart(['2026-01-01'],[1],'raw').derivedIssue);
 assert.ok(chart(['2026-01-01'],[1],'day_of_week').derivedIssue);
});
test('calendar indexes preserve year transitions, leap days and wall-clock hours',()=>{
 for(const [a,b,g] of [['2025年','2026年','year'],['2025-Q4','2026-Q1','quarter'],['2025-12','2026-01','month'],['2024-02-28','2024-02-29','day'],['2026-03-08 01:00','2026-03-08 02:00','hour'],['2026-12-31 23:59','2027-01-01 00:00','minute']]) assert.equal(periodIndex(b,g)-periodIndex(a,g),1);
 assert.equal(periodIndex('2026-02-30','day'),null);
});
test('moving mean needs three continuous periods; missing samples and zero bases stay unavailable',()=>{
 assert.deepEqual(derived(chart(['2026-01-01','2026-02-01','2026-03-01','2026-05-01'],[3,6,9,12],'month',{lineDerivedMetric:'ma3'})),[null,null,6,null]);
 assert.deepEqual(derived(chart(['2026-01-01','2026-02-01','2026-03-01'],[0,10,null])),[null,null,null]);
 assert.deepEqual(derived(chart(['2026-01-01','2026-02-01'],[-100,-50])),[null,50]);
});
test('date on columns obeys the same calculation contract',()=>{
 const ds={fields:[{name:'when',type:'date'},{name:'load',type:'number'}],rows:[{when:'2026-02-01',load:20},{when:'2026-01-01',load:10}]};
 const p=calculatePivot(ds,{columns:[{field:'when',dateGranularity:'month'}],values:[{id:'v',field:'load',agg:'sum'}]});
 assert.deepEqual(derived(buildUnifiedChartSpec(ds,p,'line',{lineDerivedMetric:'mom_pct'})),[null,100]);
});
test('field spelling cannot choose percentage magnitude; explicit scales share canonical values',()=>{
 for(const name of ['转化率','ResponseRate','温度','Any measurement']){
  const plain={name,type:'number'};
  assert.equal(getMeasureDefaults(plain).format.isPercent,false);
  for(const [percentScale,source] of [['whole',35],['fraction',.35]]){
   const field={...plain,percentScale};const value=normalizeImportedValue(source,field);
   assert.equal(value,.35);assert.equal(UnifiedFormatter.formatValue(value,{field:name,...getMeasureDefaults(field)}),'35.0%');
  }
 }
 for(const v of [null,'','oops']) assert.equal(normalizeImportedValue(v,{type:'number',percentScale:'whole'}),v === 'oops' ? v : null);
 assert.equal(normalizeImportedValue(150,{type:'number',percentScale:'whole'}),1.5);
 assert.equal(hasPercentageFormat('0.0%'),true);assert.equal(hasPercentageFormat('0.0"%"'),false);assert.equal(hasPercentageFormat('0.0\\%'),false);
});
test('canonical percentage average agrees in table display, numeric export and Excel formatting',()=>{
 const field={name:'utilization',type:'number',percentScale:'whole'};
 const ds={fields:[field],rows:[20,40].map(v=>({utilization:normalizeImportedValue(v,field)}))};
 const metric={id:'u',field:field.name,...getMeasureDefaults(field)};
 const p=calculatePivot(ds,{values:[metric]});const value=buildPivotExportRows(p).at(-1).at(-1);
 assert.ok(Math.abs(value-.3)<1e-12);
 assert.equal(UnifiedFormatter.formatValue(value,metric),'30.0%');
 assert.equal(XLSX.SSF.format(excelNumberFormat(metric),value),'30.0%');
});
test('restoration validates referenced fields and types, tolerates unrelated columns and reordered schemas',()=>{
 const ds={fields:[{name:'g',type:'text'},{name:'n',type:'number'}]};
 const config={rows:[{field:'g'}],values:[{field:'n',agg:'avg'}]};const schema=datasetSchema(ds);
 assert.deepEqual(viewCompatibility(config,schema,{fields:[...ds.fields].reverse().concat({name:'extra',type:'date'})}),[]);
 assert.match(viewCompatibility(config,schema,{fields:[ds.fields[0]]}).join(),/缺少字段/);
 assert.match(viewCompatibility(config,schema,{fields:[ds.fields[0],{name:'n',type:'text'}]}).join(),/类型/);
 assert.match(viewCompatibility(config,schema,{fields:[ds.fields[0],{name:'n',type:'number',percentScale:'whole'}]}).join(),/尺度/);
 assert.deepEqual(viewCompatibility({values:[{field:'__COUNT__',agg:'count'}]},schema,{fields:[]}),[]);
});
test('calculated metric dependencies and legacy configurations are checked before applying',()=>{
 const ds={fields:[{name:'a',type:'number'},{name:'b',type:'number'}]};
 const config={values:[{field:'ratio',isCalculated:true,formula:'SUM([a])/SUM([b])'}]};
 assert.match(viewCompatibility(config,datasetSchema(ds),{fields:[ds.fields[0]]}).join(),/b/);
 assert.match(viewCompatibility({values:[{field:'a',agg:'sum'}]},undefined,{fields:[{name:'a',type:'text'}]}).join(),/类型/);
});
test('shared schema projects only structural metadata and cannot carry data samples',()=>{
 const c=decodeView(encodeView({fullConfig:{values:[]},schema:[{name:'n',type:'number',percent:true,rows:['secret']}]}));
 assert.deepEqual(c.schema,[{name:'n',type:'number',percent:true}]);assert.equal(JSON.stringify(c).includes('secret'),false);
 assert.deepEqual(datasetSchema({fields:[{name:'n',type:'number'},{name:'private-unused-name',type:'text'}]},{values:[{field:'n'}]}),[{name:'n',type:'number',percent:false}]);
});
test('time derivatives never treat display imputation as an observed value',()=>{
 const ds={fields:[{name:'t',type:'date'},{name:'segment',type:'text'},{name:'x',type:'number'}],rows:[{t:'2026-01-01',segment:'A',x:10},{t:'2026-02-01',segment:'B',x:20},{t:'2026-03-01',segment:'A',x:30}]};
 const p=calculatePivot(ds,{rows:[{field:'t',dateGranularity:'month'}],columns:[{field:'segment'}],values:[{id:'x',field:'x',agg:'sum'}]});
 for(const missingValueMode of ['zero','prev','connect']) {
  const c=buildUnifiedChartSpec(ds,p,'line',{lineDerivedMetric:'mom_pct',missingValueMode});
  assert.deepEqual(derived(c),[null,null,null]);
 }
});
