import test from 'node:test';
import assert from 'node:assert/strict';
import {UnifiedFormatter as formatter,metricUnitInput,withMetricUnit} from '../src/utils/formatters.js';
import {excelNumberFormat} from '../src/utils/exportMatrix.js';
import {encodeView,decodeView} from '../src/utils/viewConfig.js';
import {isIdentifierField,getMeasureDefaults} from '../src/utils/fieldSemantics.js';

test('count display units are editable, removable and separate from source units',()=>{
 const metric={id:'n',field:'Reading(kg)',agg:'count',format:{unit:'kg',currency:'$',decimals:2}};
 assert.equal(formatter.formatValue(4,metric),'4 笔'); // Legacy configurations keep their display.
 const custom=withMetricUnit(metric,'条');
 assert.equal(formatter.formatValue(4,custom),'4 条');
 assert.equal(formatter.formatValue(4,withMetricUnit(custom,'')),'4');
 assert.equal(formatter.formatValue(4,{...custom,agg:'sum'}),'$4.00');
 assert.match(excelNumberFormat(custom),/" 条"/);
 assert.equal(metricUnitInput(custom),'条');
 assert.equal(formatter.formatValue(25,{...custom,showAs:'pct_grand'}),'25.0%');
 assert.equal(formatter.formatValue(2,{...custom,agg:'count_distinct'}),'2 条');
 const restored=decodeView(encodeView({fullConfig:{rows:[],columns:[],values:[custom],filters:[]}}));
 assert.equal(restored.fullConfig.values[0].format.countUnit,'条');
});

test('unknown monetary units stay unknown; explicit display units and clearing agree with Excel',()=>{
 const metric={field:'总成交金额',agg:'sum',format:{decimals:2}};
 assert.equal(formatter.inferUnit(metric),'');
 const custom=withMetricUnit(metric,'报价单位');
 assert.equal(formatter.formatValue(12345.6789,custom),'12,345.68 报价单位');
 assert.match(excelNumberFormat(custom),/" 报价单位"/);
 const inferred={field:'Latency_ms',agg:'sum'};
 assert.equal(metricUnitInput(inferred),'ms');
 assert.equal(formatter.formatValue(12,withMetricUnit(inferred,'')),'12');
});

test('Chinese identifier names do not become quantities, but explicit measure choices remain possible',()=>{
 for(const name of ['用户主账户id','用户id','对手用户id','订单id']) {
   assert.equal(isIdentifierField(name),true);
   assert.equal(getMeasureDefaults({name,type:'number'}).agg,'count_distinct');
 }
 assert.equal(isIdentifierField('grid'),false);
 assert.equal(isIdentifierField('valid'),false);
 assert.equal(getMeasureDefaults({name:'用户id',type:'number',role:'measure'}).agg,'sum');
});
