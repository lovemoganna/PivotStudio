import test from 'node:test';
import assert from 'node:assert/strict';
import { RETAIL_TEST_DATASET, buildDefaultPivotConfig } from '../src/constants/pivotConstants.js';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';
import { buildUnifiedChartSpec } from '../src/features/pivot/engine/buildChartSpec.js';

test('default retail chart uses the same values as the pivot cells', () => {
  const dataset = RETAIL_TEST_DATASET;
  const config = buildDefaultPivotConfig(dataset);
  const matrix = calculatePivot(dataset, config);
  const spec = buildUnifiedChartSpec(dataset, matrix, 'bar', {
    missingValueMode: 'zero', sortMode: 'none', topN: 0,
    lineDerivedMetric: 'none', showAvgReferenceLine: false
  });
  assert.ok(spec.hasValues);
  assert.ok(spec.items.length > 0);
  assert.ok(spec.seriesMetaList.length > 0);
  let nonzero = 0;
  for (const item of spec.items) {
    for (const sm of spec.seriesMetaList) {
      const expected = matrix.displayMatrix[
        item.rowKey + '@@' + sm.colKey + '@@' + sm.valCfg.id
      ]?.display ?? 0;
      assert.equal(item[sm.key], expected, item.name + ' / ' + sm.key);
      if (Number(item[sm.key]) > 0) nonzero++;
    }
  }
  assert.ok(nonzero > 0, 'chart series must include visible non-zero bars');
});

test('KPI totals do not invent growth trends from unordered category rows', () => {
  const ds = RETAIL_TEST_DATASET;
  const pivot = calculatePivot(ds, buildDefaultPivotConfig(ds));
  const spec = buildUnifiedChartSpec(ds, pivot, 'bar', {sortMode:'none', topN:0});
  assert.ok(spec.kpiCards.length > 0);
  for (const card of spec.kpiCards) {
    assert.equal(card.comparison, null);
    assert.equal(card.sparkValues.length, 0);
    const config = pivot.valConfigs.find(v => v.id === card.id);
    assert.ok(config, 'KPI must bind to an actual value configuration');
  }
});
