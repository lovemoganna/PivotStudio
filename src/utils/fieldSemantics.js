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
