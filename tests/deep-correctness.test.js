import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot,computeAggregation,aggregateWithSamples} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {normalizeScalar} from '../src/utils/normalizeScalar.js';
import {formatDimensionValue,formatCellNumber} from '../src/utils/formatters.js';
import {encodeGroupSegment,decodeGroupPath} from '../src/utils/groupKeys.js';
import {buildPivotExportRows} from '../src/utils/exportMatrix.js';
import {generateDynamicKeynoteShots, KEYNOTE_STORYBOARD_SHOTS} from '../src/constants/pivotConstants.js';

const fields=[{name:'Group',type:'text'},{name:'Detail',type:'text'},{name:'Value',type:'number'}];
const cfg={rows:[{field:'Group'},{field:'Detail'}],columns:[],values:[{id:'v',field:'Value',agg:'sum'}],filters:[]};
test('path and cell separators in source labels cannot merge buckets or totals',()=>{
  const rows=[{Group:'A||B',Detail:'C',Value:10},{Group:'A',Detail:'B||C',Value:20},{Group:'__GRAND_TOTAL_ROW__',Detail:'__SUBTOTAL__',Value:5},{Group:'A@@B',Detail:'C%20',Value:7}];
  const p=calculatePivot({fields,rows},cfg);const leaves=p.tableRows.filter(r=>!r.isTotal);
  assert.equal(new Set(leaves.map(r=>r.rowKey)).size,4);
  assert.deepEqual(leaves.map(r=>p.rawValueMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@v`]),[10,20,5,7]);
  assert.deepEqual(buildPivotExportRows(p).slice(1,-1).map(r=>r.slice(0,2)),rows.map(r=>[r.Group,r.Detail]));
  for(const row of leaves)assert.equal(p.cellRecordsMap.get(`${row.rowKey}@@__GRAND_TOTAL_COL__`).length,1);
  const cross=calculatePivot({fields,rows:[{Group:'X@@Y',Detail:'Z',Value:10},{Group:'X',Detail:'Y@@Z',Value:20}]},{...cfg,rows:[{field:'Group'}],columns:[{field:'Detail'}]});
  assert.equal(cross.cellRecordsMap.get(`${encodeGroupSegment('X@@Y')}@@Z`)[0].Value,10);
  assert.equal(cross.cellRecordsMap.get(`X@@${encodeGroupSegment('Y@@Z')}`)[0].Value,20);
});
test('group keys round trip Unicode, percent signs and reserved subtotal markers',()=>{
  const path=['100%','北区||零售','@home','__SUBTOTAL__','😀'];
  assert.deepEqual(decodeGroupPath(path.map(encodeGroupSegment).join('||')+'__SUBTOTAL__'),path);
});
test('normalization preserves missing booleans and unparseable original values',()=>{
  for(const value of ['',null,undefined,'  '])assert.equal(normalizeScalar(value,'boolean'),null);
  for(const value of ['false','0','no','否'])assert.equal(normalizeScalar(value,'boolean'),false);
  for(const value of ['true','1','yes','是'])assert.equal(normalizeScalar(value,'boolean'),true);
  assert.equal(normalizeScalar('unknown','boolean'),'unknown');assert.equal(normalizeScalar('error','number'),'error');
  assert.equal(formatDimensionValue('unknown',{}, {type:'boolean'}),'unknown');
});
test('numeric absence is distinct from zero and valid-sample denominator is explicit',()=>{
  assert.deepEqual(aggregateWithSamples([{v:0},{v:''},{v:'error'}],'v','avg'),{value:0,total:3,valid:1,missing:1,invalid:1});
  for(const agg of ['sum','avg','min','max','median','stddev'])assert.equal(computeAggregation([{v:''},{v:'error'}],'v',agg),null);
  assert.equal(computeAggregation([{v:1}],'v','stddev'),null);
  assert.equal(computeAggregation([],'__COUNT__','count'),0);
  assert.equal(computeAggregation(null,'__COUNT__','count'),0);
  assert.equal(computeAggregation(null,'v','avg'),null);
});
test('undefined calculations and change over zero remain unavailable, not zero percent',()=>{
  const ds={fields,rows:[{Group:'A',Value:0},{Group:'B',Value:10},{Group:'C',Value:''}]};
  const p=calculatePivot(ds,{...cfg,rows:[{field:'Group'}],values:[{id:'v',field:'Value',agg:'sum',showAs:'pct_prev_diff'}]});
  assert.equal(p.displayMatrix['B@@__GRAND_TOTAL_COL__@@v'].display,null);
  assert.equal(formatCellNumber(p.displayMatrix['B@@__GRAND_TOTAL_COL__@@v'],p.valConfigs[0]),'-');
  const c=calculatePivot(ds,{...cfg,rows:[{field:'Group'}],values:[{id:'v',field:'Value',agg:'sum'},{id:'ratio',field:'ratio',isCalculated:true,operandA:'v',operandB:'v',op:'/'}]});
  assert.equal(c.rawValueMatrix['A@@__GRAND_TOTAL_COL__@@ratio'],null);
  assert.equal(c.rawValueMatrix['B@@__GRAND_TOTAL_COL__@@ratio'],1);
});
test('full filtered histogram counts all 100k records and excludes blanks and invalid numbers',()=>{
  const rows=Array.from({length:100000},(_,i)=>({Group:'all',Value:i}));rows.push({Group:'all',Value:null},{Group:'all',Value:'invalid'});
  const ds={fields,rows},p=calculatePivot(ds,{...cfg,rows:[{field:'Group'}]});
  const chart=buildUnifiedChartSpec(ds,p,'histogram',{});
  assert.equal(chart.histogramItems.reduce((sum,item)=>sum+item.count,0),100000);
  assert.equal(chart.histogramSummary.valid,100000);assert.equal(chart.histogramSummary.missing,1);
  assert.ok(chart.histogramItems.at(-1).histogramRange.high>=99999);
});
test('small fractions remain distinct histogram intervals; constants use a single interval',()=>{
  for(const values of [[.1,.2,.3,.4,.5],[5,5,5]]){
    const ds={fields,rows:values.map(Value=>({Group:'all',Value}))};const p=calculatePivot(ds,{...cfg,rows:[{field:'Group'}]});
    const h=buildUnifiedChartSpec(ds,p,'histogram',{}).histogramItems;
    assert.equal(h.reduce((s,b)=>s+b.count,0),values.length);assert.equal(new Set(h.map(b=>b.name)).size,h.length);
    if(values[0]===5)assert.equal(h.length,1);
  }
});
test('missing numeric observations stay null in table, charts, KPI and exports',()=>{
  const ds={fields,rows:[{Group:'zero',Value:0},{Group:'missing',Value:null},{Group:'invalid',Value:'error'}]};
  const p=calculatePivot(ds,{...cfg,rows:[{field:'Group'}]});const chart=buildUnifiedChartSpec(ds,p,'line',{});
  assert.deepEqual(chart.items.map(item=>item[chart.primarySeriesKey]),[0,null,null]);
  assert.equal(chart.primaryStats.validCount,1);assert.equal(chart.primaryStats.mean,0);
  assert.deepEqual(buildPivotExportRows(p).slice(1,-1).map(r=>r[1]),[0,'-','-']);
  const none={...ds,rows:ds.rows.slice(1)},noneChart=buildUnifiedChartSpec(none,calculatePivot(none,{...cfg,rows:[{field:'Group'}]}),'bar',{});
  assert.equal(noneChart.kpiCards[0].formattedCurrent,'-');assert.equal(noneChart.executiveInsight,null);
});

test('automatic scatter Y uses the entire bucket with its own label and semantic aggregation',()=>{
  const ds={fields:[{name:'Group',type:'text'},{name:'X',type:'number'},{name:'Y',type:'number'}],rows:Array.from({length:120},()=>({Group:'All',X:1,Y:2}))};
  const p=calculatePivot(ds,{rows:[{field:'Group'}],values:[{id:'x',field:'X',agg:'sum'}]});
  const chart=buildUnifiedChartSpec(ds,p,'scatter',{});
  assert.deepEqual(chart.scatterPoints.map(({x,y})=>({x,y})),[{x:120,y:240}]);
  assert.equal(chart.secondarySeriesKey,'Y(求和)');
});

test('calculated measures sort correctly and work even when constituent operands are not in active values', () => {
  const ds = {
    fields: [
      { name: 'City', type: 'text' },
      { name: 'Profit', type: 'number' },
      { name: 'Revenue', type: 'number' },
    ],
    rows: [
      { City: 'Shanghai', Profit: 30, Revenue: 100 }, // Margin = 0.3
      { City: 'Beijing', Profit: 50, Revenue: 100 },  // Margin = 0.5
      { City: 'Guangzhou', Profit: 10, Revenue: 100 },// Margin = 0.1
      { City: 'Wuhan', Profit: 0, Revenue: 0 },       // Margin = null (div by 0)
    ],
  };

  // Case 1: Sort descending by calculated measure (Margin)
  const pDesc = calculatePivot(ds, {
    rows: [{ field: 'City' }],
    columns: [],
    values: [
      { id: 'v_profit', field: 'Profit', agg: 'sum' },
      { id: 'v_rev', field: 'Revenue', agg: 'sum' },
      { id: 'v_margin', field: 'Margin', isCalculated: true, operandA: 'v_profit', operandB: 'v_rev', op: '/' },
    ],
    valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: 'v_margin', direction: 'desc' },
  });
  const sortedDescCities = pDesc.tableRows.filter((r) => !r.isTotal).map((r) => r.label);
  // Beijing (0.5) > Shanghai (0.3) > Guangzhou (0.1) > Wuhan (null sorted to bottom)
  assert.deepEqual(sortedDescCities, ['Beijing', 'Shanghai', 'Guangzhou', 'Wuhan']);

  // Case 2: Sort ascending by calculated measure (nulls still at bottom)
  const pAsc = calculatePivot(ds, {
    rows: [{ field: 'City' }],
    columns: [],
    values: [
      { id: 'v_profit', field: 'Profit', agg: 'sum' },
      { id: 'v_rev', field: 'Revenue', agg: 'sum' },
      { id: 'v_margin', field: 'Margin', isCalculated: true, operandA: 'v_profit', operandB: 'v_rev', op: '/' },
    ],
    valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: 'v_margin', direction: 'asc' },
  });
  const sortedAscCities = pAsc.tableRows.filter((r) => !r.isTotal).map((r) => r.label);
  // Guangzhou (0.1) < Shanghai (0.3) < Beijing (0.5) < Wuhan (null at bottom)
  assert.deepEqual(sortedAscCities, ['Guangzhou', 'Shanghai', 'Beijing', 'Wuhan']);

  // Case 3: Margin calculated measure works even when Revenue and Profit are NOT in values shelf
  const pStandaloneMargin = calculatePivot(ds, {
    rows: [{ field: 'City' }],
    columns: [],
    values: [
      {
        id: 'v_margin',
        field: 'Margin',
        isCalculated: true,
        operandA: 'v_profit',
        operandAField: 'Profit',
        operandAAgg: 'sum',
        op: '/',
        operandB: 'v_rev',
        operandBField: 'Revenue',
        operandBAgg: 'sum',
      },
    ],
  });
  assert.equal(pStandaloneMargin.rawValueMatrix['Shanghai@@__GRAND_TOTAL_COL__@@v_margin'], 0.3);
  assert.equal(pStandaloneMargin.rawValueMatrix['Beijing@@__GRAND_TOTAL_COL__@@v_margin'], 0.5);
  assert.equal(pStandaloneMargin.rawValueMatrix['Wuhan@@__GRAND_TOTAL_COL__@@v_margin'], null);
});

test('generateDynamicKeynoteShots adapts analysis presets dynamically to dataset fields', () => {
  assert.equal(generateDynamicKeynoteShots(null), KEYNOTE_STORYBOARD_SHOTS);
  assert.equal(generateDynamicKeynoteShots({ fields: [] }), KEYNOTE_STORYBOARD_SHOTS);

  // HR Dataset with dates, multiple measures, and employee ID
  const hrDataset = {
    fields: [
      { name: '员工工号', type: 'number' },
      { name: '部门', type: 'text' },
      { name: '职级', type: 'text' },
      { name: '入职日期', type: 'date' },
      { name: '月薪', type: 'number', currency: '¥' },
      { name: '绩效得分', type: 'number' },
    ],
  };

  const hrShots = generateDynamicKeynoteShots(hrDataset);
  assert.equal(hrShots.length, 5);

  // Shot 1: Dim1 (部门) vs Num1 (月薪) & Num2 (绩效得分), ID ignored
  assert.equal(hrShots[0].shortLabel, '部门对比');
  assert.equal(hrShots[0].title, '按「部门」对比月薪与绩效得分');
  assert.equal(hrShots[0].pivotOverride.rows[0].field, '部门');
  assert.equal(hrShots[0].pivotOverride.values[0].field, '月薪');
  assert.equal(hrShots[0].pivotOverride.values[0].format.currency, '¥');
  assert.equal(hrShots[0].pivotOverride.values[1].field, '绩效得分');

  // Shot 2: Cross tab with Date
  assert.equal(hrShots[1].shortLabel, '部门×入职日期');
  assert.equal(hrShots[1].pivotOverride.rows[0].field, '部门');
  assert.equal(hrShots[1].pivotOverride.columns[0].field, '入职日期');

  // Shot 3: Temporal trend
  assert.equal(hrShots[2].shortLabel, '入职日期趋势');
  assert.equal(hrShots[2].pivotOverride.rows[0].field, '入职日期');

  // Shot 4: Waterfall
  assert.equal(hrShots[3].shortLabel, '部门贡献');
  assert.equal(hrShots[3].chartType, 'waterfall');

  // Shot 5: Dual measure scatter
  assert.equal(hrShots[4].shortLabel, '双指标相关');
  assert.equal(hrShots[4].chartType, 'scatter');
  assert.equal(hrShots[4].pivotOverride.values.length, 2);

  // Pure categorical / survey dataset
  const surveyDataset = {
    fields: [
      { name: '城市', type: 'text' },
      { name: '渠道', type: 'text' },
      { name: '满意度评价', type: 'text' },
    ],
  };

  const surveyShots = generateDynamicKeynoteShots(surveyDataset);
  assert.equal(surveyShots.length, 5);
  assert.equal(surveyShots[0].shortLabel, '城市对比');
  assert.equal(surveyShots[0].pivotOverride.values[0].field, '__COUNT__');
  assert.equal(surveyShots[0].pivotOverride.values[0].agg, 'count');
  assert.equal(surveyShots[4].shortLabel, '__COUNT__分布');
  assert.equal(surveyShots[4].chartType, 'histogram');
});
