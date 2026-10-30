import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalysisReading, buildResultQuestion, describeAnalysisMeasure } from '../src/utils/analysisReading.js';

test('analysis reading lists rows, columns, measures and filters', () => {
  const text = buildAnalysisReading({
    rows: [{ field: '区域' }],
    columns: [{ field: '月份' }],
    values: [{ field: '销售额' }, { field: '__COUNT__' }],
    filters: [{ field: '渠道', selectedValues: ['线上'] }],
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


test('same field with different aggregates and transformations has distinct reading', () => {
  const config = {rows:[{field:'区域'}],values:[{field:'金额',agg:'sum'},{field:'金额',agg:'avg',showAs:'pct_grand'}]};
  for(const text of [buildAnalysisReading(config),buildResultQuestion(config)]) {
    assert.match(text,/金额（求和）/);
    assert.match(text,/金额（平均值 · 占总计百分比）/);
  }
  assert.equal(describeAnalysisMeasure({field:'__COUNT__',showAs:'pct_row'}),'记录数（占行总计百分比）');
  assert.equal(describeAnalysisMeasure({field:'利润率',isCalculated:true}),'利润率（自定义公式）');
});

test('reading only claims a filter when it restricts records, including dimension exclusions', () => {
  const config = {rows:[{field:'区域'}],values:[{field:'金额'}],filters:[{field:'渠道',selectedValues:[]}]};
  assert.doesNotMatch(buildAnalysisReading(config),/已筛选/);
  assert.match(buildAnalysisReading({...config,filters:[{field:'渠道',excludeAll:true}]}),/已筛选「渠道」/);
  assert.match(buildAnalysisReading({...config,rows:[{field:'区域',excludedValues:['A']}]}),/已筛选「区域」/);
});
