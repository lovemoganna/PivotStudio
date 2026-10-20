import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { calculatePivot } from '../src/features/pivot/engine/calculatePivot.js';

const COUNT = 100000;
const regions = ['华东','华南','华北','西南','华中','西北'];
const categories = ['数码','服装','办公','食品'];
const rows = Array.from({length:COUNT},(_,i)=>({
  大区:regions[i%regions.length],
  品类:categories[Math.floor(i/regions.length)%categories.length],
  年份:String(2024+(Math.floor(i/24)%2)),
  销售额:(i%1000)+1
}));
const expected=rows.reduce((s,r)=>s+r.销售额,0);
const ds={fields:[{name:'大区',type:'text'},{name:'品类',type:'text'},{name:'年份',type:'text'},{name:'销售额',type:'number'}],rows};
const cfg={
  rows:[{id:'region',field:'大区'},{id:'category',field:'品类'}],
  columns:[{id:'year',field:'年份'}],
  values:[{id:'amount',field:'销售额',agg:'sum'}],
  filters:[],
  showSubtotals:false
};
const before=performance.now();
const result=calculatePivot(ds,cfg);
const elapsedMs=Math.round(performance.now()-before);
const used=process.memoryUsage();
assert.equal(result.filteredCount,COUNT);
assert.equal(result.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@amount'],expected);
console.log('PIVOT_100K_MEASUREMENT',JSON.stringify({
  rows:COUNT,elapsedMs,
  heapUsedMb:Math.round(used.heapUsed/1048576),
  rssMb:Math.round(used.rss/1048576),
  groups:result.tableRows.length,
  expectedTotal:expected,
  measuredTotal:result.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@amount'],
  note:'Node CI benchmark only; not a browser-main-thread or production SLA guarantee'
}));
