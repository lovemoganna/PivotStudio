import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateVisualTextWidth, calculateAutoFitColumnWidths, calculateSingleColumnAutoFit } from '../src/utils/tableAutoFit.js';

test('estimateVisualTextWidth gives proportional widths for CJK and ASCII characters', () => {
  const asciiWidth = estimateVisualTextWidth('Hello 123'); // 9 chars * 7.5 = 67.5
  const cjkWidth = estimateVisualTextWidth('华东地区销售额'); // 7 CJK chars * 13.5 = 94.5
  assert.ok(cjkWidth > asciiWidth);
  assert.strictEqual(estimateVisualTextWidth(''), 0);
});

test('calculateAutoFitColumnWidths computes reasonable bounds for row and value columns', () => {
  const dummyPivotResult = {
    rowConfigs: [
      { id: 'r1', field: '销售大区' },
      { id: 'r2', field: '超长商品细分品类类别名称' },
    ],
    allColGroups: [
      { key: '2024', pathLabels: ['2024年'] },
      { key: '2025', pathLabels: ['2025年'] },
    ],
    valConfigs: [
      { id: 'v1', field: '销售额', agg: 'sum', format: { currency: '¥', decimals: 0, thousands: true } },
    ],
    tableRows: [
      { rowKey: '华东||计算机高端数码设备', label: '计算机高端数码设备' },
      { rowKey: '华北||日用百货', label: '日用百货' },
      { isTotal: true, rowKey: '__GRAND_TOTAL__', label: '总计' },
    ],
    displayMatrix: {
      '华东||计算机高端数码设备@@2024@@v1': { display: 1250000 },
      '华北||日用百货@@2024@@v1': { display: 3500 },
    },
  };

  const widths = calculateAutoFitColumnWidths(dummyPivotResult);
  assert.ok(widths['row_r1'] >= 96 && widths['row_r1'] <= 340);
  assert.ok(widths['row_r2'] >= 96 && widths['row_r2'] <= 340);
  assert.ok(widths['2024_v1'] >= 88 && widths['2024_v1'] <= 280);
  assert.ok(widths['2025_v1'] >= 88 && widths['2025_v1'] <= 280);

  // Single column auto fit
  const single = calculateSingleColumnAutoFit('row_r2', dummyPivotResult);
  assert.strictEqual(single, widths['row_r2']);
});
