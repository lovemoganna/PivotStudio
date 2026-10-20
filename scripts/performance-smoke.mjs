import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';

const count = 100_000;
const rows = Array.from({ length: count }, (_, i) => ({
  region: ['North', 'South', 'East', 'West'][i % 4],
  year: String(2024 + (i % 3)),
  amount: i + 1,
}));
const dataset = {
  id: 'synthetic-perf-100k',
  fields: [{name:'region',type:'text'},{name:'year',type:'text'},{name:'amount',type:'number'}],
  rows,
};
const config = {
  rows: [{id:'r1',field:'region',sort:'none'}],
  columns: [{id:'c1',field:'year',sort:'none'}],
  values: [{id:'v1',field:'amount',agg:'sum',showAs:'normal'}],
  filters: [], showSubtotals: false, collapsedRowKeys: {}, collapsedColKeys: {},
};
const heapBefore=process.memoryUsage().heapUsed;
const started=performance.now();
const result=calculatePivot(dataset,config);
const elapsedMs=Math.round(performance.now()-started);
const heapAfter=process.memoryUsage().heapUsed;
const total=result.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'];
assert.equal(result.filteredCount,count);
assert.equal(total,5000050000,'100K numeric grand total must match independent arithmetic');
const report={
  workload:'synthetic_100k_4regions_3years_sum',
  rowCount:count,
  groupCount:result.tableRows.length,
  elapsedMs,
  heapDeltaMiB:Math.round((heapAfter-heapBefore)/1048576*10)/10,
  heapUsedMiB:Math.round(heapAfter/1048576*10)/10,
  grandTotal:total,
  runner:'Node CI only; does not measure browser main-thread responsiveness'
};
console.log('PERFORMANCE_BASELINE',JSON.stringify(report));
