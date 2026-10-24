function numericValue(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

export function matchesHistogramBin(record, bin) {
  const value = numericValue(record[bin.field]);
  return value !== null && value >= bin.low && (bin.includeMax ? value <= bin.high : value < bin.high);
}

// Count every valid filtered record; samples are never a frequency denominator.
export function buildHistogramBins(records, field, requestedBins = 0) {
  let min = Infinity, max = -Infinity, validCount = 0;
  for (const record of records) {
    const value = numericValue(record[field]);
    if (value === null) continue;
    min = Math.min(min, value); max = Math.max(max, value); validCount++;
  }
  if (!validCount) return [];
  const count = min === max ? 1 : Number.isInteger(requestedBins) && requestedBins > 0
    ? Math.min(100, requestedBins) : Math.max(4, Math.min(10, Math.ceil(1 + Math.log2(validCount))));
  // Interpolation avoids overflowing max - min for extreme finite inputs.
  const edges = Array.from({ length: count + 1 }, (_, i) => i === 0 ? min : i === count ? max : min * (1 - i / count) + max * (i / count));
  const bins = Array.from({ length: count }, (_, i) => ({ field, low: edges[i], high: edges[i + 1], includeMax: i === count - 1, histogramBin: i, count: 0 }));
  for (const record of records) {
    const value = numericValue(record[field]);
    if (value === null) continue;
    const bin = bins.find((item) => value >= item.low && (item.includeMax ? value <= item.high : value < item.high));
    if (bin) bin.count++;
  }
  return bins.map((bin) => ({ ...bin, pct: ((bin.count / validCount) * 100).toFixed(1) }));
}
