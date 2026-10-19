export function generateDuckDBPivotSQL(dataset, pivotConfig) {
  const tbl = dataset?.id || 'fact_sales_orders';
  const rowDims = (pivotConfig?.rows || []).map((r) => {
    if (r.dateGranularity === 'year') return `EXTRACT(YEAR FROM CAST("${r.field}" AS DATE)) AS "${r.field}_year"`;
    if (r.dateGranularity === 'quarter') return `CONCAT(EXTRACT(YEAR FROM CAST("${r.field}" AS DATE)), '-Q', EXTRACT(QUARTER FROM CAST("${r.field}" AS DATE))) AS "${r.field}_quarter"`;
    if (r.dateGranularity === 'month') return `STRFTIME(CAST("${r.field}" AS DATE), '%Y-%m') AS "${r.field}_month"`;
    if (r.numberBin && r.numberBin.step > 0) return `FLOOR(("${r.field}" - ${r.numberBin.start || 0}) / ${r.numberBin.step}) * ${r.numberBin.step} AS "${r.field}_bin"`;
    return `"${r.field}"`;
  });

  const colDims = (pivotConfig?.columns || []).map((c) => {
    if (c.dateGranularity === 'year') return `EXTRACT(YEAR FROM CAST("${c.field}" AS DATE)) AS "${c.field}_year"`;
    if (c.dateGranularity === 'quarter') return `CONCAT(EXTRACT(YEAR FROM CAST("${c.field}" AS DATE)), '-Q', EXTRACT(QUARTER FROM CAST("${c.field}" AS DATE))) AS "${c.field}_quarter"`;
    if (c.dateGranularity === 'month') return `STRFTIME(CAST("${c.field}" AS DATE), '%Y-%m') AS "${c.field}_month"`;
    if (c.numberBin && c.numberBin.step > 0) return `FLOOR(("${c.field}" - ${c.numberBin.start || 0}) / ${c.numberBin.step}) * ${c.numberBin.step} AS "${c.field}_bin"`;
    return `"${c.field}"`;
  });

  const groupCols = [...(pivotConfig?.rows || []).map((r) => `"${r.field}"`), ...(pivotConfig?.columns || []).map((c) => `"${c.field}"`)];
  const aggExprs = (pivotConfig?.values || []).map((v) => {
    if (v.agg === 'count') return `COUNT("${v.field}") AS "${v.field}_count"`;
    if (v.agg === 'count_distinct') return `COUNT(DISTINCT "${v.field}") AS "${v.field}_distinct"`;
    return `${v.agg.toUpperCase()}("${v.field}") AS "${v.field}_${v.agg}"`;
  });

  const selectList = [...rowDims, ...colDims, ...(aggExprs.length > 0 ? aggExprs : ['COUNT(*) AS "total_count"'])];
  const groupByClause = groupCols.length > 0 ? `\nGROUP BY ROLLUP(${groupCols.join(', ')})` : '';
  return `-- DuckDB In-Memory Analytical Push-down Query\nSELECT\n  ${selectList.join(',\n  ')}\nFROM ${tbl}${groupByClause}\nORDER BY 1 ASC;`;
}
