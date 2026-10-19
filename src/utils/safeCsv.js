// Prevent untrusted CSV values from being executed as spreadsheet formulas.
export function escapeCsvField(value, { untrusted = true } = {}) {
  let text = String(value ?? '');
  if (untrusted && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
