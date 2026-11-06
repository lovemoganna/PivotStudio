import test from 'node:test';import assert from 'node:assert/strict';
import {autoBarLabelLayout} from '../src/utils/chartLabels.js';
test('automatic bar labels retain narrow values, true zero and short negatives',()=>{
 for(const [value,rawValue,height]of [['84.5K',84500,90],['0',0,0],['-5',-5,-2]]){
  const point=autoBarLabelLayout({x:40,y:110,width:6,height,value,rawValue});
  assert.ok(point);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
 }
 assert.equal(autoBarLabelLayout({x:40,y:110,width:6,height:0,value:null}),null);
 assert.equal(autoBarLabelLayout({x:NaN,y:110,width:6,height:0,value:'1'}),null);
});
test('crowded equal-height series use separated label lanes and horizontal values remain visible',()=>{
 const positions=[0,1,2].map(labelRank=>autoBarLabelLayout({x:40+labelRank*10,y:100,width:6,height:5,value:'12.3K',labelRank}));
 assert.equal(new Set(positions.map(point=>point.y)).size,3);
 assert.ok(autoBarLabelLayout({x:40,y:100,width:8,height:4,value:'10'},true));
 assert.ok(autoBarLabelLayout({x:40,y:24,width:6,height:100,value:'12.3K',labelRank:3}).y>=12);
});
