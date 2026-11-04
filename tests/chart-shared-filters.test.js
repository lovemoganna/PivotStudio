import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildChartAnalysis} from '../src/features/pivot/engine/chartAnalysis.js';
import {projectView,encodeView,decodeView} from '../src/utils/viewConfig.js';

const ds={name:'Generic scope',fields:['Region','Party','Period'].map(name=>({name,type:'text'})).concat({name:'Amount',type:'number'}),rows:[
  {Region:'A',Party:'X',Period:'P1',Amount:10},{Region:'A',Party:'Y',Period:'P1',Amount:20},
  {Region:'B',Party:'X',Period:'P2',Amount:30},{Region:'B',Party:'Y',Period:'P2',Amount:40},
  {Region:'A',Party:'X',Period:'P2',Amount:50},{Region:'B',Party:'Z',Period:'P1',Amount:60},
]};
const table={rows:[{field:'Region'}],columns:[{field:'Period'}],values:[{id:'amount',field:'Amount',agg:'sum'}],filters:[]};
const chart={rows:[{field:'Party'}],columns:[],values:table.values,filters:[]};
const total=result=>result.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@amount'].display;
const run=(config,settings={analysisConfig:chart,filterScope:'local'},type='bar')=>buildChartAnalysis(ds,calculatePivot(ds,config),type,settings);

test('independent chart always uses the live shared filtered records, including change, removal and select-none',()=>{
  for(const [filters,expected,count] of [
    [[{field:'Region',selectedValues:['A']}],80,3],
    [[{field:'Region',selectedValues:['B']}],130,3],
    [[],210,6],
    [[{field:'Region',selectedValues:[],excludeAll:true}],null,0],
  ]) {
    const {chartResult}=run({...table,filters});
    assert.equal(total(chartResult),expected);
    assert.equal(chartResult.filteredCount,count);
  }
});
test('shared row/column exclusions apply even when the chart groups by different fields',()=>{
  assert.equal(total(run({...table,rows:[{field:'Region',excludedValues:['A']}]}).chartResult),130);
  assert.equal(total(run({...table,columns:[{field:'Period',excludedValues:['P2']}]}).chartResult),90);
  assert.equal(total(run(table,{analysisConfig:{...chart,rows:[{field:'Region',excludedValues:['A']}]}}).chartResult),210);
});
test('chart-local filters intersect shared scope, cannot broaden it, and retain the correct percentage denominator and histogram population',()=>{
  const global={...table,filters:[{field:'Region',selectedValues:['A']}]};
  const settings={analysisConfig:{...chart,filters:[{field:'Party',selectedValues:['X']}]},filterScope:'local'};
  assert.equal(total(run(global,settings).chartResult),60);
  assert.equal(total(run({...global,filters:[{field:'Region',selectedValues:['B']}]},settings).chartResult),30);
  assert.equal(total(run(global,{...settings,analysisConfig:{...chart,filters:[{field:'Region',selectedValues:['B']}]}}).chartResult),null);
  assert.equal(total(run(global).chartResult),80);
  const percent=run(global,{analysisConfig:{...chart,values:[{...chart.values[0],showAs:'pct_grand'}]},filterScope:'local'}).chartResult;
  assert.equal(percent.displayMatrix['X@@__GRAND_TOTAL_COL__@@amount'].display,75);
  assert.equal(run(global,undefined,'histogram').spec.histogramSummary.total,3);
});
test('legacy chart snapshots migrate away from duplicated shared filters; explicit same-field local filters survive save/share',()=>{
  const global={...table,filters:[{field:'Region',selectedValues:['A']}]};
  const legacy={fullConfig:global,csc:{analysisConfig:{...chart,filters:[...global.filters,{field:'Party',selectedValues:['X']}]}}};
  const migrated=projectView(legacy);
  assert.deepEqual(migrated.csc.analysisConfig.filters,[{field:'Party',selectedValues:['X']}]);
  assert.equal(migrated.csc.filterScope,'local');
  assert.equal(total(run({...table,filters:[{field:'Region',selectedValues:['B']}]},migrated.csc).chartResult),30);
  assert.equal(total(run(table,migrated.csc).chartResult),90);
  const local={...migrated,csc:{analysisConfig:{...chart,filters:[{field:'Region',selectedValues:['B']}]},filterScope:'local'}};
  assert.deepEqual(decodeView(encodeView(local)).csc.analysisConfig.filters,local.csc.analysisConfig.filters);
});
