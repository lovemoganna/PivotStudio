import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {buildPivotExportRows} from '../src/utils/exportMatrix.js';

const dataset={fields:[{name:'Counterparty',type:'text'},{name:'Amount',type:'number'}],rows:[
  {Counterparty:'A',Amount:100},{Counterparty:'B',Amount:200},
  {Counterparty:'B',Amount:400},{Counterparty:'B',Amount:300},
]};
const config={rows:[{field:'Counterparty'}],values:[
  {id:'count',field:'Amount',agg:'count'},
  {id:'sum',field:'Amount',agg:'sum'},
  {id:'share',field:'Amount',agg:'sum',showAs:'pct_grand'},
]};
const pivot=calculatePivot(dataset,config);

test('selected amount is the only metric in ordinary charts; share and count cannot overwrite it',()=>{
  for(const type of ['bar','horizontal_bar','line','area','pie','donut','waterfall','funnel']) {
    const chart=buildUnifiedChartSpec(dataset,pivot,type,{primaryValueId:'sum'});
    assert.deepEqual(chart.seriesMetaList.map(s=>s.valCfg.id),['sum'],type);
    assert.deepEqual(chart.items.map(i=>i[chart.primarySeriesKey]),[100,900],type);
    assert.equal(chart.primaryStats.mean,500,type);
    const share=buildUnifiedChartSpec(dataset,pivot,type,{primaryValueId:'share'});
    assert.deepEqual(share.items.map(i=>i[share.primarySeriesKey]),[10,90],type);
  }
});

test('multi-metric series use metric identity even when field and aggregation labels coincide',()=>{
  for(const type of ['stacked_bar','stacked_area']) {
  const chart=buildUnifiedChartSpec(dataset,pivot,type,{primaryValueId:'sum'});
  assert.equal(new Set(chart.seriesMetaList.map(s=>s.key)).size,3);
  for(const series of chart.seriesMetaList) {
    const expected={sum:[100,900],share:[10,90],count:[1,3]}[series.valCfg.id];
    assert.deepEqual(chart.items.map(i=>i[series.key]),expected,series.valCfg.id);
  }
  assert.equal(chart.seriesMetaList[0].valCfg.id,'sum');
  assert.equal(chart.primaryStats.mean,500);
  }
});

test('combo bindings follow selected definitions, including two show-as modes of the same field',()=>{
  const chart=buildUnifiedChartSpec(dataset,pivot,'combo',{primaryValueId:'sum',secondaryValueId:'share'});
  assert.deepEqual(chart.items.map(i=>i[chart.primarySeriesKey]),[100,900]);
  assert.deepEqual(chart.items.map(i=>i[chart.secondarySeriesKey]),[10,90]);
  assert.notEqual(chart.primarySeriesKey,chart.secondarySeriesKey);
  assert.equal(chart.secondaryValCfg.id,'share');
});

test('export headers distinguish amount from percentage without altering numeric values',()=>{
  const rows=buildPivotExportRows(pivot);
  assert.notEqual(rows[0][2],rows[0][3]);
  assert.match(rows[0][3],/占总计百分比/);
  assert.deepEqual(rows.slice(1,-1).map(row=>row.slice(1)),[[1,100,10],[3,900,90]]);
});

test('sorting and Top N use the selected amount rather than the first configured count',()=>{
  const ds={...dataset,rows:[{Counterparty:'A',Amount:1000},
    {Counterparty:'B',Amount:100},{Counterparty:'B',Amount:100},{Counterparty:'B',Amount:100}]};
  const chart=buildUnifiedChartSpec(ds,calculatePivot(ds,config),'bar',{primaryValueId:'sum',sortMode:'desc',topN:1});
  assert.deepEqual(chart.items.map(item=>item.name),['A']);
  assert.equal(chart.items[0][chart.primarySeriesKey],1000);
  assert.equal(chart.primaryStats.mean,1000);
});
