import test from 'node:test';
import assert from 'node:assert/strict';
import {computeAggregation} from '../src/features/pivot/engine/calculatePivot.js';
import {buildTotalReading} from '../src/utils/analysisReading.js';

test('unequal valid samples explain why total average differs from group averages', () => {
  const east = [100,300,500].map(Amount => ({Amount}));
  const west = [900,null,0].map(Amount => ({Amount}));
  assert.equal(computeAggregation([...east,...west],'Amount','avg'),360);
  assert.equal((computeAggregation(east,'Amount','avg')+computeAggregation(west,'Amount','avg'))/2,375);
  const reading = buildTotalReading([{field:'Amount',agg:'avg'}]).join(' ');
  assert.match(reading,/原始记录重新计算/);
  assert.match(reading,/0 会参与/);
  assert.match(reading,/不是各组平均值的简单平均/);
});

test('record count, nonempty count and numeric average have different inclusion rules', () => {
  const rows = [null,'',0,'bad',10].map(Amount => ({Amount}));
  assert.equal(computeAggregation(rows,'__COUNT__','count'),5);
  assert.equal(computeAggregation(rows,'Amount','count'),3);
  assert.equal(computeAggregation(rows,'Amount','avg'),5);
  const reading = buildTotalReading([{field:'__COUNT__',agg:'count'},{field:'Amount',agg:'count'}]).join(' ');
  assert.match(reading,/包括字段为空的记录/);
  assert.match(reading,/包括非空文本/);
});

test('calculated measures do not inherit average advice and transformed values name the extra calculation', () => {
  assert.deepEqual(buildTotalReading([]),[]);
  const calculated=buildTotalReading([{field:'Ratio',isCalculated:true,agg:'avg'}]).join(' ');
  assert.doesNotMatch(calculated,/平均值 =/);
  assert.match(buildTotalReading([{field:'Amount',agg:'avg',showAs:'pct_grand'}]).join(' '),/显示值不一定能直接相加/);
});
