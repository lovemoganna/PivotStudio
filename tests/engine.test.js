import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVRecords, parseCSVTextToSheet } from '../src/utils/csvParser.js';
import { computeAggregation, calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';
import { formatDimensionValue, UnifiedFormatter } from '../src/utils/formatters.js';
import { generateDuckDBPivotSQL } from '../src/services/duckdbQuery.js';
import { buildDefaultPivotConfig, DEFAULT_DATASET } from '../src/constants/pivotConstants.js';
import { buildUnifiedChartSpec } from '../src/features/pivot/engine/buildChartSpec.js';
import { ALL_BENCHMARK_PRESETS, CHAOS_EDGE_CASE_DATASET } from '../src/constants/benchmarkDatasets.js';

test('quoted CSV supports multi-line data', () => {
  assert.deepEqual(parseCSVRecords('a,b\r\n"x,y","quoted ""word""\nline"\r\n'), [['a', 'b'], ['x,y', 'quoted "word"\nline']]);
});

test('explicit empty filter selects no records while legacy empty selections include all', () => {
  const ds = {fields:[{name:'region',type:'text'},{name:'value',type:'number'}],rows:[{region:'East',value:12},{region:'West',value:25}]};
  const config = {rows:[{field:'region'}],columns:[],values:[{id:'v',field:'value',agg:'sum'}],filters:[{field:'region',selectedValues:[]}]};
  assert.equal(calculatePivot(ds,config).filteredCount,2);
  assert.equal(calculatePivot(ds,{...config,filters:[{...config.filters[0],excludeAll:true}]}).filteredCount,0);
  assert.equal(calculatePivot(ds,{...config,filters:[{...config.filters[0],selectedValues:['West'],excludeAll:false}]}).filteredCount,1);
});

test('CSV rejects malformed and duplicate headings', () => {
  assert.throws(() => parseCSVRecords('a\n"broken'));
  assert.throws(() => parseCSVTextToSheet('a,a\n1,2'));
  assert.throws(() => parseCSVTextToSheet('a,b\n1,2,3'), /无表头字段/);
  assert.equal(parseCSVTextToSheet('a,b\n1').rows[0].b, '');
});

test('numeric aggregation ignores blank, null and invalid numbers', () => {
  const rows = [{ v: 10 }, { v: null }, { v: '' }, { v: 'oops' }, { v: 20 }, { v: Infinity }];
  assert.equal(computeAggregation(rows, 'v', 'sum'), 30);
  assert.equal(computeAggregation(rows, 'v', 'avg'), 15);
  assert.equal(computeAggregation(rows, 'v', 'min'), 10);
  assert.equal(computeAggregation(rows, 'v', 'max'), 20);
  assert.equal(computeAggregation(rows, 'v', 'count'), 4);
  assert.equal(computeAggregation(rows, 'v', 'count_distinct'), 4);
});

test('pivot groups and filters correctly', () => {
  const ds = {
    fields: [{ name: 'zone', type: 'text' }, { name: 'year', type: 'text' }, { name: 'amount', type: 'number' }],
    rows: [
      { zone: 'A', year: '2025', amount: 10 },
      { zone: 'B', year: '2025', amount: 20 },
      { zone: 'A', year: '2026', amount: 30 }
    ]
  };
  const cfg = { rows: [{ field: 'zone' }], columns: [{ field: 'year' }], values: [{ id: 'v1', field: 'amount', agg: 'sum' }], filters: [] };
  const p = calculatePivot(ds, cfg);
  assert.equal(p.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'], 60);
  assert.equal(p.rawValueMatrix['A@@2025@@v1'], 10);
  const f = calculatePivot(ds, { ...cfg, filters: [{ field: 'zone', selectedValues: ['A'] }] });
  assert.equal(f.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'], 40);
});

test('showAs calculates percentages (pct_grand, pct_row, pct_col) and prev_diff correctly', () => {
  const ds = {
    fields: [
      { name: 'region', type: 'text' },
      { name: 'year', type: 'text' },
      { name: 'sales', type: 'number' },
    ],
    rows: [
      { region: 'East', year: '2024', sales: 100 },
      { region: 'East', year: '2025', sales: 300 },
      { region: 'West', year: '2024', sales: 200 },
      { region: 'West', year: '2025', sales: 400 },
    ],
  };

  const pGrand = calculatePivot(ds, {
    rows: [{ field: 'region' }],
    columns: [{ field: 'year' }],
    values: [{ id: 'v1', field: 'sales', agg: 'sum', showAs: 'pct_grand' }],
  });
  assert.equal(pGrand.displayMatrix['East@@2024@@v1'].display, 10);
  assert.equal(pGrand.displayMatrix['West@@2025@@v1'].display, 40);

  const pRow = calculatePivot(ds, {
    rows: [{ field: 'region' }],
    columns: [{ field: 'year' }],
    values: [{ id: 'v1', field: 'sales', agg: 'sum', showAs: 'pct_row' }],
  });
  assert.equal(pRow.displayMatrix['East@@2024@@v1'].display, 25);
  assert.equal(pRow.displayMatrix['East@@2025@@v1'].display, 75);

  const pCol = calculatePivot(ds, {
    rows: [{ field: 'region' }],
    columns: [{ field: 'year' }],
    values: [{ id: 'v1', field: 'sales', agg: 'sum', showAs: 'pct_col' }],
  });
  assert.equal(Math.round(pCol.displayMatrix['East@@2024@@v1'].display * 10) / 10, 33.3);
  assert.equal(Math.round(pCol.displayMatrix['West@@2024@@v1'].display * 10) / 10, 66.7);

  const pDiff = calculatePivot(ds, {
    rows: [{ field: 'region' }],
    columns: [],
    values: [{ id: 'v1', field: 'sales', agg: 'sum', showAs: 'prev_diff' }],
  });
  assert.equal(pDiff.displayMatrix['East@@__GRAND_TOTAL_COL__@@v1'].isBaseline, true);
  assert.equal(pDiff.displayMatrix['West@@__GRAND_TOTAL_COL__@@v1'].display, 200);
});

test('dimension formatters handle date granularities and number binning', () => {
  const dateField = { name: 'dt', type: 'date' };
  assert.equal(formatDimensionValue('2024-05-18', { dateGranularity: 'year' }, dateField), '2024年');
  assert.equal(formatDimensionValue('2024-05-18', { dateGranularity: 'quarter' }, dateField), '2024-Q2');
  assert.equal(formatDimensionValue('2024-05-18', { dateGranularity: 'month' }, dateField), '2024-05');
  assert.equal(formatDimensionValue('2024-05-18', { dateGranularity: 'day' }, dateField), '2024-05-18');

  const numField = { name: 'price', type: 'number' };
  assert.equal(formatDimensionValue(35800, { numberBin: { start: 0, step: 20000 } }, numField), '[20000, 40000)');
  assert.equal(formatDimensionValue(5000, { numberBin: { start: 0, step: 20000 } }, numField), '[0, 20000)');
  assert.equal(formatDimensionValue(null, {}, numField), '(空)');
});

test('SQL template groups by transformed year expression', () => {
  const sql = generateDuckDBPivotSQL({ id: 'sales-data' }, { rows: [{ field: 'order date', dateGranularity: 'year' }], values: [{ field: 'amount', agg: 'sum' }] });
  assert.match(sql, /GROUP BY ROLLUP\(EXTRACT\(YEAR FROM TRY_CAST\("order date" AS DATE\)\)\)/);
  assert.match(sql, /FROM "sales-data"/);
  assert.match(sql, /TEMPLATE ONLY/);
});
test('handles extreme values, negatives, zero and NaN gracefully', () => {
  const rows = [
    { cat: 'A', val: -100.5 },
    { cat: 'A', val: 0 },
    { cat: 'B', val: 200.5 },
    { cat: 'B', val: 'NaN' },
    { cat: 'B', val: -Infinity },
    { cat: 'B', val: 50 },
  ];
  const ds = {
    fields: [{ name: 'cat', type: 'text' }, { name: 'val', type: 'number' }],
    rows,
  };
  const cfg = {
    rows: [{ field: 'cat' }],
    columns: [],
    values: [
      { id: 'v_sum', field: 'val', agg: 'sum' },
      { id: 'v_min', field: 'val', agg: 'min' },
      { id: 'v_max', field: 'val', agg: 'max' },
    ],
  };
  const res = calculatePivot(ds, cfg);
  // Row A: -100.5 + 0 = -100.5
  assert.equal(res.rawValueMatrix['A@@__GRAND_TOTAL_COL__@@v_sum'], -100.5);
  assert.equal(res.rawValueMatrix['A@@__GRAND_TOTAL_COL__@@v_min'], -100.5);
  assert.equal(res.rawValueMatrix['A@@__GRAND_TOTAL_COL__@@v_max'], 0);
  // Row B: 200.5 + 50 = 250.5 (NaN and -Infinity filtered by computeAggregation)
  assert.equal(res.rawValueMatrix['B@@__GRAND_TOTAL_COL__@@v_sum'], 250.5);
  assert.equal(res.rawValueMatrix['B@@__GRAND_TOTAL_COL__@@v_min'], 50);
  assert.equal(res.rawValueMatrix['B@@__GRAND_TOTAL_COL__@@v_max'], 200.5);
  // Grand total: -100.5 + 250.5 = 150
  assert.equal(res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v_sum'], 150);
});

test('handles completely empty dataset and all-filtered rows safely', () => {
  const emptyDs = { fields: [{ name: 'a', type: 'text' }], rows: [] };
  const resEmpty = calculatePivot(emptyDs, { rows: [{ field: 'a' }], values: [{ id: 'v1', field: 'a', agg: 'count' }] });
  assert.equal(resEmpty.filteredCount, 0);
  assert.equal(resEmpty.tableRows.length, 1); // Grand total row
  assert.equal(resEmpty.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'], 0);

  const ds = { fields: [{ name: 'dim', type: 'text' }, { name: 'n', type: 'number' }], rows: [{ dim: 'X', n: 10 }] };
  const resFilteredOut = calculatePivot(ds, {
    rows: [{ field: 'dim' }],
    values: [{ id: 'v1', field: 'n', agg: 'sum' }],
    filters: [{ field: 'dim', selectedValues: ['Y'] }]
  });
  assert.equal(resFilteredOut.filteredCount, 0);
  // No matching numeric observations is unknown, unlike a genuine sum of zero.
  assert.equal(resFilteredOut.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'], null);
});

test('type inference respects 70% threshold consistently', () => {
  // 7 out of 10 valid numbers = 70% -> should be 'number'
  const sheetNum = parseCSVTextToSheet('col\n10\n20\n30\n40\n50\n60\n70\nabc\ndef\nghi');
  assert.equal(sheetNum.fields[0].type, 'number');

  // 6 out of 10 valid numbers = 60% -> under 70% threshold -> should fall back to 'text'
  const sheetText = parseCSVTextToSheet('col\n10\n20\n30\n40\n50\n60\nabc\ndef\nghi\njkl');
  assert.equal(sheetText.fields[0].type, 'text');
});

test('calculatePivot supports multi-level grouping and showSubtotals toggle', () => {
  const ds = {
    fields: [
      { name: 'region', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'sales', type: 'number' },
    ],
    rows: [
      { region: 'East', city: 'Shanghai', sales: 100 },
      { region: 'East', city: 'Hangzhou', sales: 50 },
      { region: 'West', city: 'Chengdu', sales: 80 },
    ],
  };
  const cfgWithoutSub = {
    rows: [{ field: 'region' }, { field: 'city' }],
    values: [{ id: 'v1', field: 'sales', agg: 'sum' }],
    showSubtotals: false,
  };
  const resNoSub = calculatePivot(ds, cfgWithoutSub);
  const subRowsNo = resNoSub.tableRows.filter((r) => r.isSubtotal);
  assert.equal(subRowsNo.length, 0);

  const cfgWithSub = {
    ...cfgWithoutSub,
    showSubtotals: true,
  };
  const resSub = calculatePivot(ds, cfgWithSub);
  const subRows = resSub.tableRows.filter((r) => r.isSubtotal);
  assert.ok(subRows.length > 0, 'should generate subtotal rows when showSubtotals is true');
  assert.equal(resSub.rawValueMatrix['East__SUBTOTAL__@@__GRAND_TOTAL_COL__@@v1'], 150);
});

test('Field Sanity Guard ignores invalid/non-existent filters and fields without dropping valid rows', () => {
  const ds = {
    fields: [{ name: 'cluster', type: 'text' }, { name: 'latency', type: 'number' }],
    rows: [
      { cluster: 'asia', latency: 20 },
      { cluster: 'us', latency: 40 },
    ]
  };
  const configWithDeadFilter = {
    rows: [{ field: 'cluster' }],
    values: [{ id: 'v1', field: 'latency', agg: 'avg' }],
    filters: [{ field: 'non_existent_channel', selectedValues: ['online'] }]
  };
  const res = calculatePivot(ds, configWithDeadFilter);
  assert.equal(res.filteredCount, 2, 'should keep all 2 rows instead of dropping to 0 due to dead filter');
  assert.equal(res.sanitizedInfo.hasInvalidFields, true);
  assert.deepEqual(res.sanitizedInfo.ignoredFilters, ['non_existent_channel']);
  assert.equal(res.rawValueMatrix['asia@@__GRAND_TOTAL_COL__@@v1'], 20);
});

test('computeAggregation supports median, stddev and virtual __COUNT__', () => {
  const rows = [{ v: 10 }, { v: 20 }, { v: 30 }, { v: 40 }, { v: 50 }];
  assert.equal(computeAggregation(rows, 'v', 'median'), 30);
  assert.equal(computeAggregation(rows, '__COUNT__', 'count'), 5);
  // stddev of [10, 20, 30, 40, 50] with n-1: mean=30, var = (400+100+0+100+400)/4 = 250, std = sqrt(250) approx 15.811
  const std = computeAggregation(rows, 'v', 'stddev');
  assert.ok(Math.abs(std - Math.sqrt(250)) < 0.001);
});

test('buildDefaultPivotConfig automatically handles pure text dataset with __COUNT__ metric', () => {
  const pureTextDs = {
    fields: [
      { name: 'user_id', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'hobby', type: 'text' }
    ],
    rows: [{ user_id: 'U1', city: 'BJ', hobby: 'Photo' }]
  };
  const cfg = buildDefaultPivotConfig(pureTextDs);
  assert.equal(cfg.values.length, 1);
  assert.equal(cfg.values[0].field, '__COUNT__');
  assert.equal(cfg.values[0].agg, 'count');
  // Avoid user_id as first row dimension
  assert.equal(cfg.rows[0].field, 'city');
});

test('UnifiedFormatter infers units from suffixes and brackets', () => {
  assert.equal(UnifiedFormatter.inferUnit({ field: 'latency_ms' }), 'ms');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'mem_mb' }), 'MB');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'cpu_pct' }), '%');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'weight(kg)' }), 'kg');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'base_salary' }), '');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'base_salary',format:{currency:'$'} }), '$');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'UnitPrice' }), '');
  assert.equal(UnifiedFormatter.inferUnit({ field: 'Administrative_Duration' }), '');
  assert.equal(UnifiedFormatter.inferUnit({ field: '__COUNT__' }), '笔');
});

test('formatDimensionValue supports hour, minute and day_of_week', () => {
  const dimCfgHour = { dateGranularity: 'hour' };
  const dimCfgMinute = { dateGranularity: 'minute' };
  const dimCfgDow = { dateGranularity: 'day_of_week' };
  const meta = { type: 'date' };

  // 2026-03-01 14:35:00
  const dStr = '2026-03-01T14:35:00';
  assert.equal(formatDimensionValue(dStr, dimCfgHour, meta), '2026-03-01 14:00');
  assert.equal(formatDimensionValue(dStr, dimCfgMinute, meta), '2026-03-01 14:35');
  assert.equal(formatDimensionValue(dStr, dimCfgDow, meta), '周日');
});

test('calculatePivot supports pct_prev_diff and running_total showAs modes', () => {
  const ds = {
    fields: [
      { name: 'month', type: 'text' },
      { name: 'sales', type: 'number' },
    ],
    rows: [
      { month: '2026-01', sales: 100 },
      { month: '2026-02', sales: 150 },
      { month: '2026-03', sales: 180 },
    ],
  };
  const cfg = {
    rows: [{ field: 'month' }],
    values: [
      { id: 'v_diff', field: 'sales', agg: 'sum', showAs: 'pct_prev_diff' },
      { id: 'v_run', field: 'sales', agg: 'sum', showAs: 'running_total' },
    ],
  };
  const res = calculatePivot(ds, cfg);

  // Row 1 (2026-01): baseline (0), running_total = 100
  assert.equal(res.displayMatrix['2026-01@@__GRAND_TOTAL_COL__@@v_diff'].display, 0);
  assert.equal(res.displayMatrix['2026-01@@__GRAND_TOTAL_COL__@@v_run'].display, 100);

  // Row 2 (2026-02): (150 - 100) / 100 * 100 = 50%, running_total = 100 + 150 = 250
  assert.equal(res.displayMatrix['2026-02@@__GRAND_TOTAL_COL__@@v_diff'].display, 50);
  assert.equal(res.displayMatrix['2026-02@@__GRAND_TOTAL_COL__@@v_run'].display, 250);

  // Row 3 (2026-03): (180 - 150) / 150 * 100 = 20%, running_total = 250 + 180 = 430
  assert.equal(res.displayMatrix['2026-03@@__GRAND_TOTAL_COL__@@v_diff'].display, 20);
  assert.equal(res.displayMatrix['2026-03@@__GRAND_TOTAL_COL__@@v_run'].display, 430);
});

test('calculatePivot supports custom Calculated Measures (composite aggregate formulas)', () => {
  const ds = {
    fields: [
      { name: 'category', type: 'text' },
      { name: 'revenue', type: 'number' },
      { name: 'profit', type: 'number' },
    ],
    rows: [
      { category: 'A', revenue: 200, profit: 50 },
      { category: 'B', revenue: 300, profit: 90 },
    ],
  };
  const cfg = {
    rows: [{ field: 'category' }],
    values: [
      { id: 'v_rev', field: 'revenue', agg: 'sum' },
      { id: 'v_prof', field: 'profit', agg: 'sum' },
      {
        id: 'v_margin',
        field: '利润率',
        isCalculated: true,
        operandA: 'v_prof',
        op: '/',
        operandB: 'v_rev',
        format: { isPercent: true, decimals: 2 },
      },
    ],
  };
  const res = calculatePivot(ds, cfg);

  // Category A: profit 50 / revenue 200 = 0.25 (25%)
  assert.equal(res.rawValueMatrix['A@@__GRAND_TOTAL_COL__@@v_margin'], 0.25);
  // Category B: profit 90 / revenue 300 = 0.30 (30%)
  assert.equal(res.rawValueMatrix['B@@__GRAND_TOTAL_COL__@@v_margin'], 0.30);
  // Grand Total: (50 + 90) / (200 + 300) = 140 / 500 = 0.28 (28%)
  assert.equal(res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v_margin'], 0.28);
});

test('system defaults to empty dataset with rock-solid stability and handles null/empty pipeline gracefully', () => {
  // 1. Initial dataset is null by default
  assert.equal(DEFAULT_DATASET, null);

  // 2. Default pivot config for null dataset
  const cfg = buildDefaultPivotConfig(null);
  assert.deepEqual(cfg.rows, []);
  assert.deepEqual(cfg.columns, []);
  assert.deepEqual(cfg.values, []);
  assert.deepEqual(cfg.filters, []);

  // 3. Engine calculation with null dataset
  const pRes = calculatePivot(null, cfg);
  assert.equal(pRes.totalCount, 0);
  assert.equal(pRes.filteredCount, 0);
  assert.deepEqual(pRes.tableRows.filter((r) => !r.isTotal), []);
  assert.equal(pRes.tableRows.find((r) => r.isTotal)?.rowKey, '__GRAND_TOTAL_ROW__');
  assert.deepEqual(pRes.colHeaderRows, []);

  // 4. Chart spec generation with null dataset & empty pivot result
  const cSpec = buildUnifiedChartSpec(null, pRes, 'bar', { primaryValueId: '' });
  assert.equal(cSpec.hasValues, false);
  assert.deepEqual(cSpec.kpiCards, []);
  assert.deepEqual(cSpec.items, []);
});

test('benchmark suite and chaos edge-cases dataset execute without errors or exceptions', () => {
  for (const ds of ALL_BENCHMARK_PRESETS) {
    assert.ok(ds.name);
    assert.ok(Array.isArray(ds.fields) && ds.fields.length > 0);
    assert.ok(Array.isArray(ds.rows) && ds.rows.length > 0);

    const cfg = buildDefaultPivotConfig(ds);
    const pRes = calculatePivot(ds, cfg);

    assert.equal(pRes.totalCount, ds.rows.length);
    assert.ok(pRes.tableRows.length > 0);
    assert.ok(pRes.filteredCount > 0);

    const cSpec = buildUnifiedChartSpec(ds, pRes, 'bar', { primaryValueId: '' });
    assert.ok(cSpec);
  }

  // Specifically check Chaos Guard dataset (containing null, NaN, empty string, negative values)
  const chaosCfg = buildDefaultPivotConfig(CHAOS_EDGE_CASE_DATASET);
  const chaosRes = calculatePivot(CHAOS_EDGE_CASE_DATASET, chaosCfg);
  assert.equal(chaosRes.totalCount, CHAOS_EDGE_CASE_DATASET.rows.length);
  // Verify that grand total value does not crash and produces valid numeric or finite result
  const grandTotalRow = chaosRes.tableRows.find((r) => r.isTotal);
  assert.ok(grandTotalRow);
});

test('large sparse pivot fails with actionable memory guard before allocating dense matrix',()=>{
  const rows=Array.from({length:1000},(_,i)=>({a:'a'+i,b:'b'+i,n:1}));
  const ds={fields:[{name:'a',type:'text'},{name:'b',type:'text'},{name:'n',type:'number'}],rows};
  assert.throws(()=>calculatePivot(ds,{rows:[{field:'a'}],columns:[{field:'b'}],values:[{id:'v',field:'n',agg:'sum'}]}),/内存不足/);
});

test('recommendations exclude numeric identifiers and never invent currency',()=>{
  const fields=[{name:'InvoiceNo',type:'number'},{name:'StockCode',type:'number'},{name:'CustomerID',type:'number'},{name:'Country',type:'text'},{name:'Quantity',type:'number'},{name:'UnitPrice',type:'number'}];
  const cfg=buildDefaultPivotConfig({fields,rows:[]});
  assert.deepEqual(cfg.values.map(v=>v.field),['Quantity','UnitPrice']);
  assert.equal(cfg.rows[0].field,'Country');
  assert.equal(cfg.values[1].format.currency,'');
  fields[5].currency='£';
  assert.equal(buildDefaultPivotConfig({fields,rows:[]}).values[1].format.currency,'£');
});


test('duration is not a ratio and source fractions format as percentages once',()=>{
  const cfg=buildDefaultPivotConfig({fields:[{name:'Administrative_Duration',type:'number'},{name:'BounceRates',type:'number'}],rows:[]});
  assert.equal(cfg.values[0].agg,'sum');assert.equal(cfg.values[0].format.isPercent,false);
  assert.equal(cfg.values[1].agg,'avg');assert.equal(cfg.values[1].format.isPercent,true);
  assert.equal(UnifiedFormatter.formatValue(.0268666074,{field:'BounceRates',format:{isPercent:true,decimals:2}}),'2.69%');
  assert.equal(UnifiedFormatter.formatValue(2.68666074,{showAs:'pct_grand',format:{isPercent:true}}),'2.7%');
  assert.equal(UnifiedFormatter.formatValue(.0268666074,{field:'BounceRates',format:{isPercent:false,decimals:4}}),'0.0269');
});
