import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
import {buildChartAnalysis} from '../src/features/pivot/engine/chartAnalysis.js';
import {encodeView,decodeView} from '../src/utils/viewConfig.js';
import {createAnalysisFile,parseAnalysisFile} from '../src/utils/analysisFile.js';
import {viewCompatibility} from '../src/utils/viewCompatibility.js';

const dataset={name:'Arbitrary readings',fields:[{name:'Region',type:'text'},{name:'Counterparty',type:'text'},{name:'Revenue',type:'number'},{name:'Volume',type:'number'}],rows:[{Region:'A',Counterparty:'X',Revenue:10,Volume:1},{Region:'A',Counterparty:'Y',Revenue:20,Volume:2},{Region:'B',Counterparty:'X',Revenue:30,Volume:3}]};
const tableConfig={rows:[{field:'Region'}],columns:[],values:[{id:'revenue',field:'Revenue',agg:'sum'}],filters:[]};
const chartConfig={rows:[{field:'Counterparty'}],columns:[],values:[{id:'volume',field:'Volume',agg:'sum'}],filters:[{field:'Counterparty',selectedValues:['X']}]};
test('independent chart fields, measure and filter leave the complete table result unchanged',()=>{
  const table=calculatePivot(dataset,tableConfig),before=JSON.stringify(table);
  const {chartResult,spec}=buildChartAnalysis(dataset,table,'bar',{analysisConfig:chartConfig});
  assert.equal(JSON.stringify(table),before);
  assert.equal(table.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@revenue'].display,60);
  assert.equal(chartResult.displayMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@volume'].display,4);
  assert.equal(spec.items.length,1);assert.equal(spec.items[0].name,'X');
  assert.equal(chartResult.cellRecordsMap.get('X@@__GRAND_TOTAL_COL__')?.length,2);
  assert.equal(buildChartAnalysis(dataset,table,'bar',{}).chartResult,table);
});
test('saved files and share links preserve independent chart configuration and check its referenced fields',()=>{
  const view={fullConfig:tableConfig,csc:{analysisConfig:chartConfig}};
  const decoded=decodeView(encodeView(view));
  assert.deepEqual(decoded.csc.analysisConfig.values,chartConfig.values);
  const restored=parseAnalysisFile(JSON.stringify(createAnalysisFile(dataset,view)));
  assert.deepEqual(restored.view.csc.analysisConfig,decoded.csc.analysisConfig);
  const missing={...dataset,fields:dataset.fields.filter(field=>field.name!=='Volume')};
  assert.match(viewCompatibility(tableConfig,undefined,missing,{chartConfig}).join(),/图表：缺少字段：Volume/);
  assert.equal(decoded.fullConfig.rows[0].field,'Region');
});
