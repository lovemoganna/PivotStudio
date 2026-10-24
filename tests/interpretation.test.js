import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildUnifiedChartSpec} from '../src/features/pivot/engine/buildChartSpec.js';
import {formatDimensionValue} from '../src/utils/formatters.js';
import {VISUAL_CHART_TYPES,CHART_INTENT_GROUPS,CHART_METHOD_GUIDES} from '../src/constants/pivotConstants.js';
const make=(rows,agg='sum',options={})=>{
 const ds={fields:[{name:'Group',type:'text'},{name:'Amount',type:'number'}],rows};
 const p=calculatePivot(ds,{rows:[{field:'Group'}],values:[{id:'v',field:'Amount',agg,...options}]});
 return (type,config={})=>buildUnifiedChartSpec(ds,p,type,config);
};
test('negative values cannot become positive composition; ordinary bars retain signed values',()=>{
 const build=make([{Group:'Income',Amount:100},{Group:'Refund',Amount:-40}]);
 for(const type of ['pie','donut','funnel','pct_stacked_bar','pct_area'])assert.match(build(type).chartIssue,/负数/);
 const bar=build('bar');assert.equal(bar.chartIssue,null);assert.deepEqual(bar.items.map(i=>i[bar.primarySeriesKey]),[100,-40]);assert.equal(bar.executiveInsight.sharePct,null);
});
test('nonadditive metrics and zero denominators do not produce composition claims',()=>{
 for(const agg of ['avg','min','max','median','stddev','count_distinct']){
  const chart=make([{Group:'A',Amount:1},{Group:'B',Amount:2}],agg)('pie');
  assert.ok(chart.chartIssue);assert.equal(chart.executiveInsight?.sharePct ?? null,null);assert.deepEqual(chart.pieItems,[]);
 }
 assert.ok(make([{Group:'A',Amount:0}])('pie').chartIssue);
 assert.ok(make([{Group:'A',Amount:.2}],'sum',{format:{isPercent:true}})('pie').chartIssue);
});
test('Top N exposes visible denominator separately from full aggregate',()=>{
 const chart=make([{Group:'A',Amount:60},{Group:'B',Amount:30},{Group:'C',Amount:10}])('pie',{topN:2});
 assert.equal(chart.availableGroupCount,3);assert.equal(chart.items.length,2);
 assert.deepEqual(chart.pieItems.map(p=>p.pct),['66.7','33.3']);assert.equal(chart.kpiCards[0].formattedCurrent,'100');
});
test('funnel preserves configured order, supports growth and handles a zero previous value',()=>{
 const chart=make([{Group:'Visit',Amount:100},{Group:'Pay',Amount:0},{Group:'Retry',Amount:50}])('funnel');
 assert.deepEqual(chart.funnelItems.map(i=>i.name),['Visit','Pay','Retry']);
 assert.deepEqual(chart.funnelItems.map(i=>i.widthPct),[100,0,50]);
 assert.match(chart.funnelItems[2].conversionFormatted,/无法比较/);
 const growth=make([{Group:'A',Amount:20},{Group:'B',Amount:50}])('funnel');assert.equal(growth.funnelItems[1].conversionFormatted,'相对上项 250.0%');
 const average=make([{Group:'A',Amount:10},{Group:'B',Amount:20}],'avg')('funnel');assert.equal(average.chartIssue,null);assert.equal(average.funnelItems[1].conversionFormatted,'相对上项 200.0%');
});
test('scatter requires distinct metrics rather than manufacturing self correlation',()=>{
 assert.match(make([{Group:'A',Amount:1},{Group:'B',Amount:2}])('scatter').chartIssue,/两个不同/);
});
test('hour and minute buckets retain full date; invalid calendar dates are not silently rolled over',()=>{
 const field={type:'date'};
 for(const granularity of ['hour','minute']){
  const dates=['2025-01-01T09:30:00','2026-01-01T09:30:00','2026-01-02T09:30:00'];
  assert.equal(new Set(dates.map(d=>formatDimensionValue(d,{dateGranularity:granularity},field))).size,3);
 }
 assert.equal(formatDimensionValue('2026-02-30',{dateGranularity:'month'},field),'2026-02-30');
 assert.equal(formatDimensionValue('2024-02-29',{dateGranularity:'month'},field),'2024-02');
 const ds={fields:[{name:'Date',type:'date'},{name:'Value',type:'number'}],rows:[{Date:'2025-01-01T09:30:00',Value:10},{Date:'2026-01-01T09:30:00',Value:20}]};
 const p=calculatePivot(ds,{rows:[{field:'Date',dateGranularity:'minute'}],values:[{id:'v',field:'Value',agg:'sum'}]});
 assert.equal(p.tableRows.filter(r=>!r.isTotal).length,2);
});
test('percentage normalization works without row groups and leaves zero denominators unavailable',()=>{
 const ds={fields:[{name:'Amount',type:'number'},{name:'Cost',type:'number'}],rows:[{Amount:30,Cost:70}]};
 const p=calculatePivot(ds,{values:[{id:'a',field:'Amount',agg:'sum'},{id:'c',field:'Cost',agg:'sum'}]});
 const chart=buildUnifiedChartSpec(ds,p,'pct_stacked_bar',{});
 assert.equal(chart.chartIssue,null);assert.deepEqual(chart.seriesMetaList.map(sm=>chart.items[0][sm.key]),[30,70]);
 const zero=make([{Group:'A',Amount:0}])('pct_stacked_bar');assert.equal(zero.items[0][zero.primarySeriesKey],null);
 const missing=make([{Group:'A',Amount:null}])('pct_stacked_bar');assert.equal(missing.chartIssue,null);assert.equal(missing.primaryStats.validCount,0);
 const mixed=calculatePivot(ds,{values:[{id:'a',field:'Amount',agg:'sum',format:{currency:'¥'}},{id:'c',field:'Cost',agg:'sum'}]});
 assert.match(buildUnifiedChartSpec(ds,mixed,'pct_stacked_bar',{}).chartIssue,/单位不同/);
});
test('all 16 chart types are MECE-partitioned into intent groups and provide beginner reading guides',()=>{
 const allTypes=VISUAL_CHART_TYPES.map(t=>t.value);
 const groupedTypes=CHART_INTENT_GROUPS.flatMap(g=>g.types);
 assert.deepEqual([...groupedTypes].sort(),[...allTypes].sort());
 for(const type of allTypes){
  const guide=CHART_METHOD_GUIDES[type];
  assert.ok(guide,`missing guide for ${type}`);
  assert.ok(guide.intent && guide.purpose && guide.howToRead && guide.actionTip,`incomplete guide for ${type}`);
 }
});
