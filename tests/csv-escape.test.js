import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvField } from '../src/utils/safeCsv.js';

test('CSV fields preserve commas, quotes and record boundaries', () => {
  assert.equal(escapeCsvField('East, "West"'), '"East, ""West"""');
});
test('untrusted text never starts a spreadsheet formula', () => {
  for (const text of ['=HYPERLINK("x")', '+SUM(1,2)', '-cmd', '@SUM(A1)', ' \t=1+1']) {
    assert.equal(escapeCsvField(text)[1], "'");
  }
});
test('calculated negative amounts remain numeric when reimported', () => {
  assert.equal(escapeCsvField('-12.50', { untrusted: false }), '"-12.50"');
});
