import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPivotExportRows, encodeCsvCell } from '../src/utils/exportMatrix.js';

test('exports all pivot rows independent of virtualized DOM window', () => {
  const tableRows = Array.from({length:120},(_,i)=>({rowKey:'zone'+i,isTotal:false}));
  tableRows.push({rowKey:'__GRAND_TOTAL_ROW__',isTotal:true});
  const result = {
    rowConfigs:[{field:'zone'}],
    allColGroups:[{key:'all',pathLabels:['总计']}],
    valConfigs:[{id:'v',field:'amount',agg:'sum'}],
    tableRows,
    displayMatrix:Object.fromEntries(tableRows.map((row,i)=>[row.rowKey+'@@all@@v',{display:i<120?i:7140}]))
  };
  const rows=buildPivotExportRows(result);
  assert.equal(rows.length,122);
  assert.equal(rows[119][1],118);
  assert.equal(rows.at(-1)[0],'总计');
  assert.equal(rows.at(-1)[1],7140);
});
test('CSV protects untrusted formula strings and preserves numbers',()=>{
  assert.equal(encodeCsvCell('=HYPERLINK("https://example.org")'),'"\'=HYPERLINK(""https://example.org"")"');
  assert.equal(encodeCsvCell('-4'),'"\'-4"');
  assert.equal(encodeCsvCell(-4),'"-4"');
  assert.equal(encodeCsvCell('a,b'),'"a,b"');
});
