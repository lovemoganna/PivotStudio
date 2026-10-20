import { getDimDisplayLabel } from './formatters.js';

/** All export rows originate from the complete pivot result, not the virtualized DOM. */
export function buildPivotExportRows(pivotResult) {
  const rowDims = pivotResult.rowConfigs || [];
  const groups = pivotResult.allColGroups || [];
  const metrics = pivotResult.valConfigs || [];
  const dimensionHeaders = rowDims.length ? rowDims.map(getDimDisplayLabel) : ['汇总维度'];
  const headers = [
    ...dimensionHeaders,
    ...groups.flatMap((group) => metrics.map((metric) => {
      const path = group.pathLabels?.length ? group.pathLabels.join(' / ') + ' · ' : '';
      const percent = metric.showAs?.startsWith('pct_') || metric.format?.isPercent ? ' [%]' : '';
      return path + metric.field + ' (' + metric.agg + ')' + percent;
    }))
  ];

  const rows = (pivotResult.tableRows || []).map((row) => {
    let labels;
    if (row.isTotal) labels = ['总计'];
    else labels = String(row.rowKey ?? '').replace('__SUBTOTAL__','').split('||');
    while (labels.length < dimensionHeaders.length) labels.push('');
    labels = labels.slice(0,dimensionHeaders.length);
    const values = groups.flatMap((group) => metrics.map((metric) => {
      const key = row.rowKey + '@@' + group.key + '@@' + metric.id;
      const value = pivotResult.displayMatrix?.[key]?.display;
      return typeof value === 'number' && Number.isFinite(value) ? value : value ?? '';
    }));
    return [...labels,...values];
  });
  return [headers,...rows];
}

/** Defend spreadsheet users from untrusted leading-formula strings. */
export function encodeCsvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = typeof value === 'string' && /^\s*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}
