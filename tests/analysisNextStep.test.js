import test from 'node:test';
import assert from 'node:assert/strict';
import {getAnalysisNextStep} from '../src/utils/analysisNextStep.js';
test('empty setup asks for one measure, not four mandatory configuration steps',()=>{
  assert.equal(getAnalysisNextStep({}).zone,'values');
  assert.equal(getAnalysisNextStep({columns:[{field:'Month'}],filters:[{field:'Region'}]}).zone,'values');
});
test('row-only setup requests a measure and summary-only setup offers optional groups',()=>{
  assert.equal(getAnalysisNextStep({rows:[{field:'Region'}]}).zone,'values');
  assert.equal(getAnalysisNextStep({values:[{field:'Amount'}]}).zone,'rows');
});
test('ready analysis does not require columns or filters',()=>{
  assert.equal(getAnalysisNextStep({rows:[{field:'Region'}],values:[{field:'Amount'}]}),null);
});
