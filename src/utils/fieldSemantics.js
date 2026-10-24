// Identifiers may contain mostly digits without being quantities to aggregate.
export function isIdentifierField(name) {
  return /(?:^|[_\s-])(?:id|uuid|guid|code|no|number)$/i.test(name)
    || /(?:ID|Id|Code|No|Number)$/.test(name)
    || /(?:customer|invoice|order|stock|product|transaction|account)(?:id|no|code|number)$/i.test(name)
    || /编号|代码|工号|序号/.test(name);
}

export function isRateField(name) {
  const words = String(name).replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^a-z]+/i);
  return words.some((word) => /^(rates?|ratios?|pct|percent|percentages?)$/i.test(word)) || /率|比/.test(name);
}

export function isMeasureField(field) {
  return field.role ? field.role === 'measure' : field.type === 'number' && !isIdentifierField(field.name);
}

// Use the same starting calculation for imports, clicks and drag-and-drop.
// An average is unweighted; a field name cannot establish a business denominator.
export function getMeasureDefaults(field) {
  const isId = isIdentifierField(field?.name || '');
  const isExplicitMeasure = field?.role === 'measure';
  const numeric = field?.type === 'number' && (!isId || isExplicitMeasure);
  const average = numeric && (isRateField(field.name) || /^(score|age|temp|temperature|latency|cpu)$|率|比|分|度|龄|均/i.test(field.name));
  return {
    agg: numeric ? (average ? 'avg' : 'sum') : (isId ? 'count_distinct' : 'count'),
    format: {
      thousands: true,
      decimals: average ? 1 : 0,
      currency: numeric ? field.currency || '' : '',
      isPercent: numeric && isRateField(field.name),
    },
  };
}
