import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFormulaAST,evaluateFormulaAST,buildFormulaFromVisualSpec,formatFormulaField} from '../src/features/pivot/engine/formulaEngine.js';
import {encodeView,decodeView} from '../src/utils/viewConfig.js';
import {normalizeMetricDefinitions} from '../src/utils/metricCatalog.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';

test('formula column named 记录数 is real data, while COUNT() remains virtual',()=>{
  const rows=[{记录数:10},{记录数:20},{记录数:null}];
  assert.equal(evaluateFormulaAST(parseFormulaAST('SUM([记录数])'),rows),30);
  assert.equal(evaluateFormulaAST(parseFormulaAST('COUNT([记录数])'),rows),2);
  assert.equal(evaluateFormulaAST(parseFormulaAST('COUNT()'),rows),3);
  assert.equal(buildFormulaFromVisualSpec({operandAField:'记录数',mode:'constant',op:'/',constantValue:10}),'SUM([记录数]) / 10');
});
test('formula field quoting round trips brackets, Unicode and operator characters',()=>{
  for(const field of ['收入[元]','Amount ]','部门/产品','a,b','A+B','[x]']){
    const formula=buildFormulaFromVisualSpec({operandAField:field,mode:'constant',op:'/',constantValue:2});
    assert.equal(evaluateFormulaAST(parseFormulaAST(formula),[{[field]:10}]),5,field);
    assert.equal(evaluateFormulaAST(parseFormulaAST(`SUM(${formatFormulaField(field)})`),[{[field]:10}]),10);
  }
});
test('calculated metric visual metadata survives saved/share projection without row data',()=>{
  const metric={field:'折算',id:'v',agg:'calc',isCalculated:true,formula:'SUM([Amount]) / 100',builderMode:'constant',constantValue:100,category:'scale',operandAField:'Amount',rows:[{secret:1}]};
  const result=decodeView(encodeView({fullConfig:{values:[metric]}})).fullConfig.values[0];
  assert.equal(result.builderMode,'constant');assert.equal(result.constantValue,100);assert.equal(result.category,'scale');assert.equal(result.rows,undefined);
  assert.throws(()=>encodeView({fullConfig:{values:[{...metric,builderMode:{rows:[1]}}]}}),/模式/);
});
test('metric JSON imports validate atomically, normalize valid definitions and reject bad formats',()=>{
  const fields=[{name:'Amount',type:'number'}],valid={id:'v',field:'合计',formula:'SUM([Amount])',format:{decimals:1}};
  const result=normalizeMetricDefinitions([valid],fields);assert.equal(result[0].agg,'calc');assert.equal(result[0].isCalculated,true);
  for(const bad of [{field:{}},{field:'bad',formula:'SUM([Missing])'},{...valid,format:{decimals:100}},{...valid,format:{currency:{}}},{...valid,operandA:{}}])assert.throws(()=>normalizeMetricDefinitions([valid,bad],fields));
  assert.deepEqual(valid,{id:'v',field:'合计',formula:'SUM([Amount])',format:{decimals:1}});
});
test('formula quoting preserves row and grand totals in actual pivot calculation',()=>{
  const ds={fields:[{name:'Group',type:'text'},{name:'记录数',type:'number'},{name:'收入[元]',type:'number'}],rows:[{Group:'A',记录数:10,'收入[元]':100},{Group:'B',记录数:20,'收入[元]':200}]};
  const formula=`SUM(${formatFormulaField('收入[元]')}) / SUM([记录数])`;
  const p=calculatePivot(ds,{rows:[{field:'Group'}],columns:[],filters:[],values:[{id:'v',field:'每单位收入',agg:'calc',isCalculated:true,formula}]});
  assert.equal(p.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'],10);
  for(const row of p.tableRows.filter(r=>!r.isTotal))assert.equal(p.rawValueMatrix[`${row.rowKey}@@__GRAND_TOTAL_COL__@@v`],10);
});
test('legacy virtual 记录数 alias remains valid when the dataset has no real column with that name',()=>{
  const formula='SUM([记录数])',cfg={rows:[],columns:[],filters:[],values:[{id:'v',field:'Count',isCalculated:true,formula}]};
  const virtual=calculatePivot({fields:[{name:'Amount',type:'number'}],rows:[{Amount:10},{Amount:20}]},cfg);
  assert.equal(virtual.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'],2);
  const emptyReal=calculatePivot({fields:[{name:'记录数',type:'number'}],rows:[{记录数:null}]},cfg);
  assert.equal(emptyReal.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v'],null);
});
test('metric catalog accepts valid format-panel legacy definitions without a formula string',()=>{
  const fields=[{name:'Amount',type:'number'},{name:'Units',type:'number'}];
  const legacy={id:'old',field:'单位收入',operandAField:'Amount',operandAAgg:'sum',op:'/',operandBField:'Units',operandBAgg:'sum'};
  const [normalized]=normalizeMetricDefinitions([legacy],fields);
  assert.equal(normalized.formula,'SUM([Amount]) / SUM([Units])');
  assert.equal(evaluateFormulaAST(parseFormulaAST(normalized.formula),[{Amount:100,Units:10}]),10);
  assert.equal(legacy.formula,undefined);
});
