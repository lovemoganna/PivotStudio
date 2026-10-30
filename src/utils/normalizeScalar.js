export const isMissingValue = value => value === null || value === undefined || String(value).trim() === '';

export function isUnsafeInteger(value) {
  if (isMissingValue(value)) return false;
  const number = Number(String(value).trim().replace(/,/g,''));
  return Number.isFinite(number) && Number.isInteger(number) && !Number.isSafeInteger(number);
}

export function analyticNumber(value) {
  // Typed numbers may be approximate scientific measurements. Protect textual
  // integers before conversion without excluding that existing numeric domain.
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (isMissingValue(value) || isUnsafeInteger(value)) return null;
  const number = Number(String(value).trim().replace(/,/g,''));
  return Number.isFinite(number) ? number : null;
}

export function normalizeScalar(value, type) {
  if (isMissingValue(value)) return null;
  const text = String(value).trim();
  if (type === 'number') {
    if (isUnsafeInteger(value)) return String(value);
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
