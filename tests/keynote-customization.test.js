import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDynamicKeynoteShots, KEYNOTE_STORYBOARD_SHOTS } from '../src/constants/pivotConstants.js';
import { getMeasureDefaults, isIdentifierField } from '../src/utils/fieldSemantics.js';

test('Keynote dynamic generation adapts to datasets with rows and highlights real top category', () => {
  const datasetWithRows = {
    fields: [
      { name: 'City', type: 'text' },
      { name: 'Sales', type: 'number', currency: '¥' },
    ],
    rows: [
      { City: 'Shanghai', Sales: 500 },
      { City: 'Beijing', Sales: 300 },
      { City: 'Shanghai', Sales: 400 },
      { City: 'Guangzhou', Sales: 200 },
    ],
  };

  const shots = generateDynamicKeynoteShots(datasetWithRows);
  assert.equal(shots.length, 5);
  // Shot 1 should highlight 'Shanghai' as top frequency in rows
  assert.equal(shots[0].title, '按「City」对比Sales');
  assert.equal(shots[0].generated,true,'Preset prompts must be identified separately from user conclusions');
  assert.ok(!shots[0].subtitle.includes('出现较多'),'Preset generation must not assert a frequency finding from an unfiltered sample');
  assert.equal(shots[0].pivotOverride.rows[0].field, 'City');
  assert.equal(shots[0].pivotOverride.values[0].field, 'Sales');

  // Shot 2: Single dimension fallback should use donut chart, not empty stacked bar
  assert.equal(shots[1].chartType, 'donut');
  assert.equal(shots[1].shortLabel, 'City占比');

  // Shot 3: No date field fallback should use horizontal_bar, not misleading line/combo chart
  assert.equal(shots[2].chartType, 'horizontal_bar');
  assert.equal(shots[2].shortLabel, 'City排序');
  assert.equal(shots[2].pivotOverride.rows[0].sort, 'desc');
});

test('Identifier fields default to count_distinct rather than summing ID numbers', () => {
  const numericIdField = { name: 'CustomerID', type: 'number' };
  assert.equal(isIdentifierField(numericIdField.name), true);
  const defaults = getMeasureDefaults(numericIdField);
  assert.equal(defaults.agg, 'count_distinct', 'Numeric ID must default to count_distinct, not sum');

  // Explicit user override role=measure still respects numeric sum if user manually marks it
  const explicitMeasure = { name: 'CustomerID', type: 'number', role: 'measure' };
  const measureDefaults = getMeasureDefaults(explicitMeasure);
  assert.equal(measureDefaults.agg, 'sum');
});

test('Custom Storyboard shot model round trips custom user conclusions and view overrides', () => {
  const baseShots = generateDynamicKeynoteShots({
    fields: [{ name: 'Category', type: 'text' }, { name: 'Profit', type: 'number' }],
  });

  const customShot = {
    id: 'custom_shot_1',
    number: '06',
    title: '重点盈利品类深度下钻',
    shortLabel: '盈利品类',
    subtitle: '数码配件类目毛利率超过45%，成为第三季度最大经营亮点',
    cameraNote: 'Custom Analytical Lens · User Defined',
    viewMode: 'split',
    chartType: 'bar',
    pivotOverride: {
      rows: [{ id: 'r_1', field: 'Category', sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: [{ id: 'v_1', field: 'Profit', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } }],
    },
  };

  const combinedShots = [...baseShots, customShot];
  assert.equal(combinedShots.length, 6);
  assert.equal(combinedShots[5].title, '重点盈利品类深度下钻');
  assert.ok(combinedShots[5].subtitle.includes('数码配件类目'));
  assert.equal(combinedShots[5].number, '06');

  // Editing shot updates title and subtitle
  combinedShots[5] = {
    ...combinedShots[5],
    title: '调整后的汇报结论',
    subtitle: '经复核，配件利润率为48.2%',
  };
  assert.equal(combinedShots[5].title, '调整后的汇报结论');
  assert.equal(combinedShots[5].subtitle, '经复核，配件利润率为48.2%');

  // Deleting shot reindexes
  combinedShots.splice(0, 1);
  const reindexed = combinedShots.map((s, idx) => ({ ...s, number: String(idx + 1).padStart(2, '0') }));
  assert.equal(reindexed[0].number, '01');
  assert.equal(reindexed.length, 5);
});
