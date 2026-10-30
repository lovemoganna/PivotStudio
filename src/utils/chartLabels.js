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
