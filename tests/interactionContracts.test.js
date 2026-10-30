import test from 'node:test';
import assert from 'node:assert/strict';
import {datasetSchema,viewCompatibility} from '../src/utils/viewCompatibility.js';
import {encodeView,decodeView} from '../src/utils/viewConfig.js';
import {getMeasureDefaults} from '../src/utils/fieldSemantics.js';
import {UnifiedFormatter} from '../src/utils/formatters.js';
import {excelNumberFormat} from '../src/utils/exportMatrix.js';
import XLSX from 'xlsx';
import {updateConfigHistory} from '../src/utils/configHistory.js';

test('editing after undo branches from the current snapshot and repeated evaluation is pure',()=>{
 const initial={history:[{filters:[]}],index:0};
 const selected=updateConfigHistory(initial,p=>({...p,filters:[{field:'g',selectedValues:['A']}]}));
 const undone={...selected,index:0};
 const edit=p=>({...p,filters:[...(p.filters || []),{field:'g',selectedValues:['']} ]});
 const expected={history:[{filters:[]},{filters:[{field:'g',selectedValues:['']}]}],index:1};
 assert.deepEqual(updateConfigHistory(undone,edit),expected);
 assert.deepEqual(updateConfigHistory(undone,edit),expected);
 assert.equal(undone.index,0);
 assert.equal(updateConfigHistory(initial,p=>p),initial);
 let capped=initial;for(let i=0;i<35;i++)capped=updateConfigHistory(capped,{n:i});
 assert.equal(capped.history.length,30);assert.equal(capped.index,29);
});

test('declared source units survive sharing and block changed or missing units, including formula dependencies',()=>{
 for (const name of ['Quantity','流量','測定値']) {
  const config={values:[{field:'Derived',isCalculated:true,formula:`SUM([${name}])/2`}]};
  const source={fields:[{name,type:'number',unit:' kg '}]};
  const schema=decodeView(encodeView({fullConfig:config,schema:datasetSchema(source,config)})).schema;
  assert.equal(schema[0].unit,'kg');
  assert.deepEqual(viewCompatibility(config,schema,{fields:[{name,type:'number',unit:'kg'}]}),[]);
  for(const unit of ['g','']) assert.match(viewCompatibility(config,schema,{fields:[{name,type:'number',unit}]}).join(),/单位不匹配/);
 }
});
test('units describe source values without rescaling; table and Excel inherit the same label',()=>{
 const field={name:'Measurement',type:'number',unit:'ms'};
 const metric={field:field.name,...getMeasureDefaults(field)};
 assert.equal(UnifiedFormatter.formatValue(123,metric),'123 ms');
 assert.equal(XLSX.SSF.format(excelNumberFormat(metric),123),'123 ms');
 assert.equal(datasetSchema({fields:[{...field,percentScale:'whole'}]})[0].unit,undefined);
 assert.equal(getMeasureDefaults({...field,percentScale:'whole'}).format.unit,undefined);
 assert.throws(()=>decodeView(encodeView({fullConfig:{},schema:[{name:'x',type:'number',unit:{bad:true}}]})),/单位/);
});
test('legacy schemas remain usable without claiming to establish source units',()=>{
 const config={values:[{field:'x',agg:'sum'}]};
 assert.deepEqual(viewCompatibility(config,[{name:'x',type:'number',percent:false}],{fields:[{name:'x',type:'number',unit:'kg'}]}),[]);
 assert.deepEqual(datasetSchema({fields:[{name:'x',type:'number',currency:'EUR'}]}),[{name:'x',type:'number',percent:false,unit:'EUR'}]);
});
