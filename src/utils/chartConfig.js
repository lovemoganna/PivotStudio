// Analysis filters define the shared record scope. Only chart-local filters
// belong to an independent chart configuration.
export function resolveChartConfig(tableConfig, settings = {}) {
  const independent = settings.analysisConfig;
  if (!independent) return tableConfig;
  if (typeof independent !== 'object' || Array.isArray(independent)) throw new Error('图表配置必须是对象');
  const sharedFields = new Set((tableConfig.filters || []).map(filter => filter.field));
  const dimensions = items => (items || []).map(({excludedValues,selectedValues,excludeAll,...item}) => item);
  return {
    ...independent,
    rows: dimensions(independent.rows),
    columns: dimensions(independent.columns),
    // Older files copied the table's filters into this object. Do not replay
    // those snapshots over the current shared scope when opening such files.
    filters: (independent.filters || []).filter(filter => settings.filterScope === 'local' || !sharedFields.has(filter.field)),
  };
}
