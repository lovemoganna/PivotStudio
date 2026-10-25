import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysisReading, buildResultQuestion } from '../src/utils/analysisReading.js';

test('analysis reading lists rows, columns, measures and filters', () => {
  const text = buildAnalysisReading({
    rows: [{ field: '区域' }],
    columns: [{ field: '月份' }],
    values: [{ field: '销售额' }, { field: '__COUNT__' }],
    filters: [{ field: '渠道' }],
  });
  assert.match(text, /区域/);
  assert.match(text, /月份/);
  assert.match(text, /销售额/);
  assert.match(text, /记录数/);
  assert.match(text, /渠道/);
});

test('result question frames a row×column comparison in plain language', () => {
  const text = buildResultQuestion({
    rows: [{ field: '销售大区' }],
    columns: [{ field: '订单日期', dateGranularity: 'year' }],
    values: [{ field: '销售额' }, { field: '销量' }],
    filters: [],
  });
  assert.match(text, /销售大区/);
  assert.match(text, /销售额/);
  assert.match(text, /销量/);
  assert.equal(buildResultQuestion({ rows: [], columns: [], values: [] }), '');
});
