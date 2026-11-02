import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDefaultPivotConfig,DATE_GRANULARITIES} from '../src/constants/pivotConstants.js';
import {formatDimensionValue,getDimDisplayLabel} from '../src/utils/formatters.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {periodIndex} from '../src/utils/temporalAnalysis.js';
import {encodeView,decodeView} from '../src/utils/viewConfig.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';

const ds={fields:[{name:'Team',type:'text'},{name:'RecordedAt',type:'date'},{name:'Reading',type:'number'}],rows:[
  {Team:'A',RecordedAt:'2027-02-03 10:20:30.125',Reading:10},
  {Team:'A',RecordedAt:'2027-02-03 10:20:30.875',Reading:20},
  {Team:'A',RecordedAt:'2027-02-03 10:20:31.000',Reading:40},
]};
test('initial date dimension preserves original timestamps and precision',()=>{
  const config=buildDefaultPivotConfig(ds);
  assert.equal(config.columns[0].dateGranularity,'raw');
  const pivot=calculatePivot(ds,config);
  assert.deepEqual(pivot.leafColGroups.map(g=>g.label),ds.rows.map(r=>r.RecordedAt));
  assert.equal(formatDimensionValue('2027/02/03 10:20:30.125',{dateGranularity:'raw'},{type:'date'}),'2027/02/03 10:20:30.125');
});
test('second grouping is explicit, keeps full date, and preserves aggregation and saved configuration',()=>{
  assert.ok(DATE_GRANULARITIES.some(g=>g.value==='second'));
  const cfg={rows:[{id:'r',field:'RecordedAt',dateGranularity:'second'}],values:[{id:'v',field:'Reading',agg:'sum'}]};
  const pivot=calculatePivot(ds,cfg);
  const rows=pivot.tableRows.filter(r=>!r.isTotal&&!r.isSubtotal);
  assert.deepEqual(rows.map(r=>r.label),['2027-02-03 10:20:30','2027-02-03 10:20:31']);
  assert.deepEqual(rows.map(r=>pivot.displayMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@v`].display),[30,40]);
  assert.equal(getDimDisplayLabel(cfg.rows[0]),'RecordedAt (秒)');
  assert.equal(periodIndex(rows[1].label,'second')-periodIndex(rows[0].label,'second'),1);
  assert.equal(periodIndex('2028-01-01 00:00:00','second')-periodIndex('2027-12-31 23:59:59','second'),1);
  assert.equal(periodIndex('2027-02-03 10:20:60','second'),null);
  assert.equal(decodeView(encodeView({fullConfig:cfg})).fullConfig.rows[0].dateGranularity,'second');
});

test('explicitly saved year grouping remains unchanged when defaults change',()=>{
  const config={rows:[{id:'r',field:'RecordedAt',dateGranularity:'year'}],values:[{id:'v',field:'Reading',agg:'sum'}]};
  const restored=decodeView(encodeView({fullConfig:config})).fullConfig;
  assert.equal(restored.rows[0].dateGranularity,'year');
  const pivot=calculatePivot(ds,restored);
  assert.deepEqual(pivot.tableRows.filter(r=>!r.isTotal).map(r=>r.label),['2027年']);
  assert.equal(pivot.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'].display,70);
});

test('single-series charts include every raw timestamp column, not just the first date',()=>{
  const data={...ds,rows:ds.rows.map((r,i)=>({...r,Team:i===2?'B':'A'}))};
  const cfg={rows:[{field:'Team'}],columns:[{field:'RecordedAt',dateGranularity:'raw'}],values:[{id:'v',field:'Reading',agg:'sum'}]};
  const pivot=calculatePivot(data,cfg);
  for(const type of ['pie','donut','funnel','waterfall']) {
    const chart=buildUnifiedChartSpec(data,pivot,type,{});
    assert.deepEqual(chart.items.map(item=>item[chart.primarySeriesKey]),[30,40],type);
    assert.equal(chart.primaryStats.total,70,type);
    assert.equal(chart.mergedColumnGroups,true,type);
  }
  assert.equal(pivot.leafColGroups.length,3);
  const columnsOnly=calculatePivot(data,{...cfg,rows:[]});
  const chart=buildUnifiedChartSpec(data,columnsOnly,'pie',{});
  assert.deepEqual(chart.pieItems.map(item=>item.value),[10,20,40]);
  assert.equal(chart.mergedColumnGroups,false);
});
