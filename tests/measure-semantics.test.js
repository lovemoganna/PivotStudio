import test from 'node:test';
import assert from 'node:assert/strict';
import {getMeasureDefaults, isMeasureField} from '../src/utils/fieldSemantics.js';
import {buildDefaultPivotConfig} from '../src/constants/pivotConstants.js';
import {UnifiedFormatter} from '../src/utils/formatters.js';
import {excelNumberFormat} from '../src/utils/exportMatrix.js';
import XLSX from 'xlsx';

test('manual and recommended measures share rate, quantity and nonnumeric defaults',()=>{
  for(const field of [{name:'转化率',type:'number'},{name:'Age',type:'number'},{name:'Amount',type:'number',currency:'¥'},{name:'Category',type:'text'}]){
    const defaults=getMeasureDefaults(field);
    if(field.type==='number'){
      const config=buildDefaultPivotConfig({fields:[field],rows:[]}).values[0];
      assert.equal(config.agg,defaults.agg);assert.deepEqual(config.format,defaults.format);
    }else assert.equal(defaults.agg,'count');
  }
  assert.equal(getMeasureDefaults({name:'转化率',type:'number'}).agg,'avg');
  assert.equal(getMeasureDefaults({name:'Duration',type:'number'}).format.isPercent,false);
  assert.equal(isMeasureField({name:'CustomerID',type:'number'}),false);
  assert.equal(isMeasureField({name:'CustomerID',type:'number',role:'measure'}),true);
});

test('counts never inherit rate, currency or source units; share-of-count remains a percentage',()=>{
  for(const agg of ['count','count_distinct']){
    for(const config of [{field:'转化率',format:{isPercent:true,decimals:1}},{field:'金额(元)',format:{currency:'¥',decimals:2}},{field:'Latency_ms'}]){
      assert.equal(UnifiedFormatter.formatValue(3,{...config,agg}),'3 笔');
      assert.equal(XLSX.SSF.format(excelNumberFormat({...config,agg}),3),'3 笔');
      assert.equal(UnifiedFormatter.formatValue(25,{...config,agg,showAs:'pct_grand'}),'25.0%');
      assert.equal(XLSX.SSF.format(excelNumberFormat({...config,agg,showAs:'pct_grand'}),25),'25.0%');
    }
  }
});
