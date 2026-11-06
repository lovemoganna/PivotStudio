const auto = ['auto', '自动位置'];
const inside = ['inside', '内部居中'];
const top = ['top', '外部顶部'];
const bottom = ['bottom', '外部底部'];
const insideTop = ['insideTop', '内部顶部'];
const insideBottom = ['insideBottom', '内部底部'];
const left = ['left', '外部左侧'];
const right = ['right', '外部右侧'];

export function getLabelPositions(chartType) {
  if (['pie', 'donut'].includes(chartType)) return [auto, ['inside', '扇区内部'], ['outside', '扇区外部']];
  if (chartType === 'heatmap') return [auto, inside, insideTop, insideBottom];
  if (chartType === 'funnel') return [auto, inside, top, bottom];
  if (['line', 'area', 'stacked_area', 'pct_area', 'scatter'].includes(chartType)) return [auto, top, bottom, left, right];
  return [auto, inside, top, bottom, insideTop, insideBottom, left, right, ['insideLeft', '内部左侧'], ['insideRight', '内部右侧']];
}

// Keep old saved views compatible and never pass an unsupported position to a chart.
export function resolveLabelPosition(chartType, position) {
  return getLabelPositions(chartType).some(([value]) => value === position) ? position : 'auto';
}

// A narrow mark can still have ample empty space around it. Never suppress a
// real value solely because its rectangle is narrow; stagger crowded series.
export function autoBarLabelLayout({x,y,width,height,value,rawValue,labelRank=0,stacked=false}, horizontal=false) {
  if(value === null || value === undefined || value === '' || ![x,y,width,height].every(Number.isFinite)) return null;
  const fontSize=10, textWidth=String(value).length*6+6;
  const left=Math.min(x,x+width),right=Math.max(x,x+width),top=Math.min(y,y+height),bottom=Math.max(y,y+height);
  const negative=typeof rawValue==='number' ? rawValue<0 : String(value).startsWith('-');
  let tx=(left+right)/2,ty=(top+bottom)/2,anchor='middle';
  const fits=right-left>=textWidth+8 && bottom-top>=fontSize+6;
  if(horizontal){
    const lanes=Math.max(1,Math.ceil(14/(Math.abs(height)+4)));
    const offset=8+(labelRank%lanes)*(textWidth+8);
    tx=negative ? left-offset : right+offset;anchor=negative?'end':'start';
    if(fits){tx=negative?left+6:right-6;anchor=negative?'start':'end';}
  }else{
    const lanes=Math.max(1,Math.ceil(textWidth/(Math.abs(width)+4)));
    const offset=8+(labelRank%lanes)*13;
    ty=negative ? bottom+offset : top-offset;
    if(stacked && fits)ty=(top+bottom)/2;
    else if(negative && bottom-top>=fontSize+6)ty=Math.max(top+8,bottom-offset);
    else if(ty<fontSize+2)ty=Math.min(bottom-8,top+offset);
    ty=Math.max(fontSize+2,ty);
  }
  return {x:tx,y:ty,anchor,fontSize,inside:fits&&tx>left&&tx<right&&ty>top&&ty<bottom};
}
