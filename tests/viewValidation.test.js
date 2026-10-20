import test from 'node:test';
import assert from 'node:assert/strict';
import {validateViewConfig,validateWorkspaceSnapshot} from '../src/utils/viewValidation.js';

const dataset={id:'sheet-A',fields:[{name:'region'},{name:'amount'}]};
const cfg={rows:[{field:'region'}],columns:[],values:[{field:'amount'}],filters:[]};
test('rejects cross-dataset view configuration without mutating current state',()=>{
  assert.match(validateViewConfig({datasetId:'sheet-B',fullConfig:cfg,vm:'split'},dataset),/其他数据集/);
});
test('rejects missing columns and stale fields',()=>{
  assert.match(validateViewConfig({datasetId:'sheet-A',fullConfig:{...cfg,columns:null}},dataset),/不完整/);
  assert.match(validateViewConfig({datasetId:'sheet-A',fullConfig:{...cfg,values:[{field:'absent'}]}},dataset),/不存在/);
});
test('accepts matching fields and rejects absent workspace dataset',()=>{
  assert.equal(validateViewConfig({datasetId:'sheet-A',fullConfig:cfg,vm:'split'},dataset),null);
  assert.match(validateWorkspaceSnapshot({datasetId:'gone',pivotConfig:cfg},[dataset]),/重新导入/);
  assert.equal(validateWorkspaceSnapshot({datasetId:'sheet-A',pivotConfig:cfg},[dataset]),null);
});
