import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';
import { buildPivotWorkbookData } from '../src/utils/pivotExportRows.js';

test('XLSX export source includes all rows beyond the virtualized viewport', () => {
  const dataset = {
    fields:[{name:'id',type:'text'},{name:'amount',type:'number'}],
    rows:Array.from({length:121},(_,i)=>({id:'row_'+String(i+1).padStart(3,'0'),amount:i+1}))
  };
  const cfg = {
    rows:[{field:'id',id:'r1'}],columns:[],
    values:[{id:'v1',field:'amount',agg:'sum',showAs:'normal'}],
    filters:[],showSubtotals:false
  };
  const p = calculatePivot(dataset,cfg);
  assert.ok(p.tableRows.length > 80);
  const output = buildPivotWorkbookData(p);
  assert.equal(output.rows.length,p.tableRows.length+1);
  const exportedData = output.rows.slice(1);
  assert.ok(exportedData.some(row=>row[0]==='row_121' && row[1]===121));
  assert.ok(exportedData.some(row=>row[0]==='总计' && row[1]===7381));
});
test('grouped headers retain spreadsheet merge information',()=>{
  const ds = {fields:[{name:'team',type:'text'},{name:'year',type:'text'},{name:'amount',type:'number'},{name:'units',type:'number'}],
    rows:[{team:'A',year:'2025',amount:12,units:3},{team:'B',year:'2026',amount:8,units:2}]};
  const p=calculatePivot(ds,{
    rows:[{field:'team'}],columns:[{field:'year'}],
    values:[{id:'v1',field:'amount',agg:'sum'},{id:'v2',field:'units',agg:'sum'}],filters:[]
  });
  const o=buildPivotWorkbookData(p);
  assert.ok(o.merges.some(m=>m.s.r===0 && m.e.c>m.s.c));
  assert.equal(o.rows.length,p.tableRows.length+2);
});
