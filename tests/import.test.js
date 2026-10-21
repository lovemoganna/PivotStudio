import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSVTextToSheet, decodeCSVBuffer } from '../src/utils/csvParser.js';

test('detects comma, tab, semicolon and pipe without splitting quoted separators',()=>{
  for(const delimiter of [',','\t',';','|']) {
    const result=parseCSVTextToSheet(`姓名${delimiter}金额\n"张,三"${delimiter}12\n李四${delimiter}18`);
    assert.equal(result.importMeta.delimiter,delimiter);
    assert.equal(result.rows[0]['姓名'],'张,三');
    assert.equal(result.fields[1].type,'number');
  }
});
test('detects headerless numeric rows; explicit override preserves ambiguous text data',()=>{
  const result=parseCSVTextToSheet('张三,12\n李四,18');
  assert.equal(result.importMeta.hasHeader,false);
  assert.equal(result.rows.length,2);
  assert.equal(parseCSVTextToSheet('张三,北京\n李四,上海','text',{header:'no'}).rows.length,2);
  assert.equal(parseCSVTextToSheet('001,2024-10-01,12.5\n002,2024-10-02,15','data',{header:'no'}).fields[0].type,'text');
});
test('UTF-8 and GBK Chinese round trip and encoding detection',()=>{
  assert.equal(decodeCSVBuffer(new TextEncoder().encode('姓名,金额\n张三,12')).encoding,'utf-8');
  const gbk=Uint8Array.from([0xd0,0xd5,0xc3,0xfb,0x2c,0xbd,0xf0,0xb6,0xee,0x0a,0xd5,0xc5,0xc8,0xfd,0x2c,0x31,0x32]);
  const decoded=decodeCSVBuffer(gbk);
  assert.equal(decoded.encoding,'gbk');
  assert.equal(parseCSVTextToSheet(decoded.text).rows[0]['姓名'],'张三');
});

test('invalid quote tails, binary and HTML inputs give explicit actionable failures',()=>{
  assert.throws(()=>parseCSVTextToSheet('name,value\n"a"x,1'),/引号/);
  assert.throws(()=>parseCSVTextToSheet('name,value\na"b,1'),/引号/);
  assert.throws(()=>parseCSVTextToSheet('<!DOCTYPE html><html>Access denied</html>'),/HTML/);
  assert.throws(()=>parseCSVTextToSheet('name,value\na\0,1'),/二进制/);
  const result=parseCSVTextToSheet('name,value\na');
  assert.equal(result.rows[0].value,'');
  assert.match(result.importMeta.warnings,/缺少字段/);
});

test('identifier columns remain text even when the first sample is mostly numeric',()=>{
  const csv='InvoiceNo,StockCode,CustomerID,Quantity,UnitPrice\n'+Array.from({length:100},(_,i)=>`${536365+i},${i<95?85123+i:'85123A'},17850,6,2.55`).join('\n');
  const sheet=parseCSVTextToSheet(csv);
  assert.deepEqual(sheet.fields.map(f=>f.type),['text','text','text','number','number']);
  assert.equal(sheet.rows[99].StockCode,'85123A');
});
