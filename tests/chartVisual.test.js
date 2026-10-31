import test from 'node:test';
import assert from 'node:assert/strict';
import { CHART_COLORS } from '../src/constants/pivotConstants.js';
import { CV, chartLabelInk, chartPaper } from '../src/constants/chartVisual.js';

function luminance(hex) {
  return hex.slice(1).match(/../g).map(v => parseInt(v,16)/255)
    .map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4)
    .reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
}
function contrast(a,b) {
  const x=luminance(a), y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test('chart marks contrast with both papers and interior labels meet 4.5:1',()=>{
  for (const color of [...CHART_COLORS,CV.semantic.positive,CV.semantic.negative]) {
    for (const dark of [false,true]) assert.ok(contrast(color,chartPaper(dark)) >= 3, color);
    assert.ok(contrast(color,chartLabelInk(color)) >= 4.5,color);
  }
  assert.equal(CV.fill.barGradFrom,1);
  assert.equal(CV.fill.barGradTo,1);
});
test('heat-cell labels contrast with the composited fill across both themes',()=>{
  for (const dark of [false,true]) for (const color of [CV.heatmap.pos,CV.heatmap.neg]) {
    for (const alpha of [.22,.4,.6,.8,1]) {
      const channels=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
      const paper=channels(chartPaper(dark));
      const composite='#'+channels(color).map((v,i)=>Math.round(v*alpha+paper[i]*(1-alpha)).toString(16).padStart(2,'0')).join('');
      assert.ok(contrast(composite,chartLabelInk(color,alpha,dark)) >= 4.5,`${color} ${alpha} ${dark}`);
    }
  }
});
