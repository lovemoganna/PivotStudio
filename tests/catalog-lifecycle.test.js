import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMetricDefinitions,getMetricCatalogKey,validateMetricCatalogMerge} from '../src/utils/metricCatalog.js';
const fields=[{name:'Amount',type:'number'}];
const metric={id:'a',field:'合计',formula:'SUM([Amount])'};
test('catalog rejects duplicate ids and trimmed names atomically',()=>{
 assert.throws(()=>normalizeMetricDefinitions([metric,{...metric,field:'另一指标'}],fields),/编号重复/);
 assert.throws(()=>normalizeMetricDefinitions([metric,{...metric,id:'b',field:' 合计 '}],fields),/名称重复/);
});
test('catalog merge permits an identity update but rejects ambiguous names',()=>{
 assert.doesNotThrow(()=>validateMetricCatalogMerge([metric],[{...metric,formula:'SUM([Amount])*2'}]));
 assert.throws(()=>validateMetricCatalogMerge([metric],[{...metric,id:'b'}]),/编号不同/);
});
test('file catalogs survive new session ids and updated row counts',()=>{
 const dataset={id:'session1',fields,metricCatalogSource:{fileName:'sales.csv',sheetName:'Sheet1'},rows:[{Amount:1}]};
 assert.equal(getMetricCatalogKey(dataset),getMetricCatalogKey({...dataset,id:'session2',rows:[{Amount:2},{Amount:3}]}));
 for(const other of [{fileName:'other.csv',sheetName:'Sheet1'},{fileName:'sales.csv',sheetName:'Sheet2'}])assert.notEqual(getMetricCatalogKey(dataset),getMetricCatalogKey({...dataset,metricCatalogSource:other}));
 assert.notEqual(getMetricCatalogKey(dataset),getMetricCatalogKey({...dataset,fields:[{name:'Amount',type:'string'}]}));
 assert.equal(getMetricCatalogKey({id:'retail'}),'retail');
});
