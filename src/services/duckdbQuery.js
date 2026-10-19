// This module exports a SQL template; it does NOT execute DuckDB.
const identifier = (x) => '"' + String(x).replace(/"/g,'""') + '"';
export function generateDuckDBPivotSQL(dataset,pivotConfig) {
  const dims=[...(pivotConfig?.rows || []),...(pivotConfig?.columns || [])];
  const expression=(dim)=>{
    const field=identifier(dim.field);
    if (dim.dateGranularity==='year') return `EXTRACT(YEAR FROM TRY_CAST(${field} AS DATE))`;
    if (['quarter','month','week'].includes(dim.dateGranularity)) return `DATE_TRUNC('${dim.dateGranularity}', TRY_CAST(${field} AS DATE))`;
    if (dim.dateGranularity==='day') return `TRY_CAST(${field} AS DATE)`;
    if (dim.numberBin?.step>0) {
      const start=Number(dim.numberBin.start)||0, step=Number(dim.numberBin.step);
      return `FLOOR((${field} - ${start}) / ${step}) * ${step} + ${start}`;
    }
    return field;
  };
  const groups=dims.map(expression);
  const selects=groups.map((exp,i)=>`${exp} AS ${identifier('dim_'+(i+1))}`);
  const aggs=(pivotConfig?.values || []).map((v,i)=>{
    const fn=({sum:'SUM',count:'COUNT',count_distinct:'COUNT',avg:'AVG',min:'MIN',max:'MAX'})[v.agg]||'SUM';
    const field=identifier(v.field);
    return `${fn}(${v.agg==='count_distinct'?'DISTINCT ':''}${field}) AS ${identifier('measure_'+(i+1))}`;
  });
  return [
    '-- SQL TEMPLATE ONLY. No DuckDB runtime is connected in this app.',
    '-- Import the dataset under the named table before running this SQL.',
    'SELECT '+[...selects,...(aggs.length?aggs:['COUNT(*) AS "total_count"'])].join(',\n       '),
    'FROM '+identifier(dataset?.id||'imported_dataset'),
    ...(groups.length?['GROUP BY ROLLUP('+groups.join(', ')+')']:[]),
    'ORDER BY 1 ASC;'
  ].join('\n');
}
