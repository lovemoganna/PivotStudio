export const isMissingValue = value => value === null || value === undefined || String(value).trim() === '';

export function normalizeScalar(value, type) {
  if (isMissingValue(value)) return null;
  const text = String(value).trim();
  if (type === 'number') {
    const number = Number(text.replace(/,/g, ''));
    // Retain unparseable source values so profiling and correction remain possible.
    return Number.isFinite(number) ? number : value;
  }
  if (type === 'boolean') {
    if (/^(true|1|是|yes)$/i.test(text)) return true;
    if (/^(false|0|否|no)$/i.test(text)) return false;
  }
  return value;
}
