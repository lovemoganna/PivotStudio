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
  assert.equal(encodeCsvCell('-',true),'"-"');
});

test('formatted export matches table decimals currency percentages and baseline',async()=>{
  const {formatCellNumber}=await import('../src/utils/formatters.js');
  const {excelNumberFormat}=await import('../src/utils/exportMatrix.js');
  const XLSX=await import('xlsx');
  for(const metric of [
    {id:'v',field:'amount',agg:'sum',format:{decimals:2,currency:'¥',thousands:true}},
    {id:'v',field:'amount',agg:'sum',showAs:'pct_grand',format:{}},
    {id:'v',field:'BounceRates',agg:'avg',format:{isPercent:true,decimals:2}},
    {id:'v',field:'latency_ms',agg:'avg',format:{decimals:1}},
  ]) {
    for(const value of [1234.56,-1234.56,0]) {
      const display=formatCellNumber({display:value},metric);
      const cell={t:'n',v:value,z:excelNumberFormat(metric)};
      assert.equal(XLSX.utils.format_cell(cell),display);
    }
  }
});
