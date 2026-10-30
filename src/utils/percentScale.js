import { normalizeScalar } from './normalizeScalar.js';

export function normalizeImportedValue(value, field) {
  const normalized = normalizeScalar(value,field.type);
  // Canonical percentage storage is a fraction, chosen explicitly by the importer.
  return field.type === 'number' && field.percentScale === 'whole' && typeof normalized === 'number' ? normalized / 100 : normalized;
}

export function hasPercentageFormat(format) {
  return /%/.test(String(format || '').replace(/"[^"]*"|\\./g,''));
}
