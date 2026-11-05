import test from 'node:test';import assert from 'node:assert/strict';
import {categoryPage,categoryValueDomain} from '../src/utils/chartPagination.js';
test('dense categorical pages cover every original group once, without reordering or changing values',()=>{
 const items=Array.from({length:87},(_,i)=>({rowKey:String(i),name:'identifier-'+i,value:i-40}));const before=JSON.stringify(items);
 for(const width of [280,680,960]){
  const first=categoryPage(items,5,width);assert.ok(first.paged);const all=[];
  for(let i=0;i<first.pages;i++)all.push(...categoryPage(items,5,width,i).items);
  assert.deepEqual(all,items);assert.equal(categoryPage(items,5,width,999).end,items.length);
 }
 assert.equal(JSON.stringify(items),before);
});
test('page scales use the entire result and stack positive and negative values separately',()=>{
 const items=[{a:2,b:-3},{a:50,b:70},{a:null,b:-20}];
 assert.deepEqual(categoryValueDomain(items,['a','b']),[-20,70]);
 assert.deepEqual(categoryValueDomain(items,['a','b'],true),[-20,120]);
 assert.deepEqual(categoryValueDomain([],['a']),[0,1]);
});
test('small charts and continuous time plots remain complete; changed widths clamp pages safely',()=>{
 const items=Array.from({length:365},(_,i)=>({rowKey:String(i),name:'2026-day-'+i}));
 assert.equal(categoryPage(items,1,280,0,'line').items,items);
 const small=items.slice(0,10);assert.equal(categoryPage(small,2,280).items,small);
 assert.equal(categoryPage(items,1,1200,-1).index,0);
 assert.equal(categoryPage([],1,280).paged,false);
});
