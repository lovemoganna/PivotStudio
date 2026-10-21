import { getDimDisplayLabel, formatCellNumber, UnifiedFormatter } from './formatters.js';

/** All export rows originate from the complete pivot result, not the virtualized DOM. */
export function buildPivotExportRows(pivotResult, { formatted = false } = {}) {
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
      const cell = pivotResult.displayMatrix?.[key];
      if (formatted) return formatCellNumber(cell,metric);
      if (cell?.isBaseline) return '-';
      const value = cell?.display;
      return typeof value === 'number' && Number.isFinite(value) ? value : value ?? '';
    }));
    return [...labels,...values];
  });
  return [headers,...rows];
}

/** Defend spreadsheet users from untrusted leading-formula strings. */
export function encodeCsvCell(value, numericDisplay = false) {
  const raw = value === null || value === undefined ? '' : String(value);
  const safeNumeric = numericDisplay && (raw === '-' || /^[-+]?(?:[¥$€£元])?\d[\d,]*(?:\.\d+)?(?:%| [A-Za-z%°\u4e00-\u9fff]+)?$/.test(raw));
  const safe = !safeNumeric && typeof value === 'string' && /^\s*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function excelNumberFormat(metric) {
  const percent = metric.showAs?.startsWith('pct_') || metric.format?.isPercent;
  const decimals = metric.showAs?.startsWith('pct_') ? 1 : Math.max(0,Math.min(12,metric.format?.decimals ?? 0));
  const unit = UnifiedFormatter.inferUnit(metric);
  const currency = !percent && /^[\$¥€£元]/.test(unit) ? unit : '';
  const suffix = percent ? '%' : currency ? '' : unit ? ` ${unit}` : '';
  const literal = (text) => text ? '"' + text.replace(/"/g,'""') + '"' : '';
  // Source ratios remain fractions; show-as percentages are already multiplied by 100.
  const suffixFormat = percent && !metric.showAs?.startsWith('pct_') ? '%' : literal(suffix);
  const digits = (percent || metric.format?.thousands === false ? '0' : '#,##0') + (decimals ? '.'+'0'.repeat(decimals) : '');
  const positive = (metric.showAs === 'prev_diff' || metric.showAs === 'pct_prev_diff' ? '+' : '') + literal(currency) + digits + suffixFormat;
  const normal = literal(currency) + digits + suffixFormat;
  return `${positive};-${normal};${normal}`;
}
