import { getDimDisplayLabel } from './formatters.js';

// Export from the full pivot result, never from virtualized DOM table rows.
export function buildPivotWorkbookData(pivotResult) {
  const rowDims = pivotResult.rowConfigs.map(getDimDisplayLabel);
  const rowWidth = Math.max(1, rowDims.length);
  const colGroups = pivotResult.allColGroups;
  const values = pivotResult.valConfigs;
  const grouped = pivotResult.colConfigs.length > 0;
  const merges = [];
  const headers = [...(rowDims.length ? rowDims : ['分组'])];
  const details = Array(rowWidth).fill('');

  for (const cg of colGroups) {
    const label = cg.pathLabels?.join(' / ') || '总计';
    for (let i=0; i<values.length; i++) {
      headers.push(grouped ? (i === 0 ? label : '') : values[i].field + ' (' + values[i].agg + ')');
      details.push(values[i].field + ' (' + values[i].agg + ')');
    }
    if (grouped && values.length > 1) {
      const end = headers.length - 1;
      merges.push({s:{r:0,c:end-values.length+1},e:{r:0,c:end}});
    }
  }

  const rows = grouped ? [headers,details] : [headers];
  if (grouped) {
    for(let i=0; i<rowWidth; i++) merges.push({s:{r:0,c:i},e:{r:1,c:i}});
  }

  for (const row of pivotResult.tableRows) {
    let labels;
    if (row.isTotal) labels = ['总计'];
    else labels = String(row.rowKey).replace('__SUBTOTAL__','').split('||');
    const heading = [...labels.slice(0,rowWidth)];
    while (heading.length < rowWidth) heading.push('');
    const numbers = colGroups.flatMap(cg => values.map(vc => {
      const cell = pivotResult.displayMatrix[row.rowKey + '@@' + cg.key + '@@' + vc.id];
      return Number.isFinite(cell?.display) ? cell.display : null;
    }));
    rows.push([...heading,...numbers]);
  }

  return {rows,merges};
}
