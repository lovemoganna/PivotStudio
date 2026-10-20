import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVRecords, parseCSVTextToSheet } from '../src/utils/csvParser.js';
import { computeAggregation, calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';
import { formatDimensionValue } from '../src/utils/formatters.js';
import { generateDuckDBPivotSQL } from '../src/services/duckdbQuery.js';

test('quoted CSV supports multi-line data', () => {
  assert.deepEqual(parseCSVRecords('a,b\r\n"x,y","quoted ""word""\nline"\r\n'), [['a', 'b'], ['x,y', 'quoted "word"\nline']]);
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
