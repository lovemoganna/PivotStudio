import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import {buildPivotClipboard,writePivotClipboard} from '../src/utils/pivotClipboard.js';
import {calculatePivot} from '../src/features/pivot/engine/calculatePivot.js';
test('complete clipboard table includes headers, every result row and numeric grand total',()=>{
  const ds={fields:[{name:'RecordId',type:'text'},{name:'Reading',type:'number'}],rows:Array.from({length:240},(_,i)=>({RecordId:String(9000000000000000000n+BigInt(i)),Reading:1.2345}))};
  const pivot=calculatePivot(ds,{rows:[{field:'RecordId'}],values:[{id:'v',field:'Reading',agg:'sum',format:{decimals:2,unit:'ms'}}]});
  const copy=buildPivotClipboard(pivot);
  assert.equal(copy.rowCount,241);assert.equal(copy.columnCount,2);
  assert.equal(copy.text.split('\r\n').length,242);
  assert.match(copy.text,/9000000000000000239/);
  const book=XLSX.read(copy.html,{type:'string'}),sheet=book.Sheets[book.SheetNames[0]];
  assert.equal(sheet.A2.v,'9000000000000000000');assert.equal(sheet.A2.t,'s');
  assert.equal(sheet.B2.v,1.2345);assert.equal(sheet.B2.t,'n');
  assert.ok(Math.abs(sheet.B242.v-240*1.2345)<1e-9);
});

test('plain-text fallback writes the entire payload; denied permission is never reported as success',async()=>{
  const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const originalItem=Object.getOwnPropertyDescriptor(globalThis,'ClipboardItem');
  try {
    let copied;
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{copied=text;}}}});
    Object.defineProperty(globalThis,'ClipboardItem',{configurable:true,value:undefined});
    assert.equal(await writePivotClipboard({text:'all\trows\r\n1\t2'}),'text');
    assert.equal(copied,'all\trows\r\n1\t2');
    Object.defineProperty(globalThis,'ClipboardItem',{configurable:true,value:class {}});
    const denied=Object.assign(new Error('denied'),{name:'NotAllowedError'});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{write:async()=>{throw denied;},writeText:async()=>{throw new Error('unexpected fallback');}}}});
    await assert.rejects(()=>writePivotClipboard({html:'<table></table>',text:'x'}),{name:'NotAllowedError'});
  }finally {
    if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
    if(originalItem)Object.defineProperty(globalThis,'ClipboardItem',originalItem);else delete globalThis.ClipboardItem;
  }
});
test('clipboard escapes markup and formulas and retains embedded tabs and line breaks',()=>{
  const ds={fields:[{name:'Label',type:'text'},{name:'Amount',type:'number'}],rows:[{Label:'<script>bad</script>\tLine\nTwo',Amount:12},{Label:'=1+1',Amount:0}]};
  const copy=buildPivotClipboard(calculatePivot(ds,{rows:[{field:'Label'}],values:[{id:'v',field:'Amount',agg:'sum'}]}));
  assert.ok(!copy.html.includes('<script>'));
  assert.match(copy.html,/&#39;=1\+1/);assert.match(copy.text,/'=1\+1/);
  assert.ok(copy.text.includes('"<script>bad</script>\tLine\nTwo"'));
});
