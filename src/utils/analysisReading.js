import { t, getLocale } from '../i18n.js';
import { getDimDisplayLabel } from './formatters.js';

function joinLabels(labels) {
  return labels.join(getLocale() === 'en' ? ', ' : '、');
}

/** Plain-language summary of the current pivot structure for status/result surfaces. */
export function buildAnalysisReading(pivotConfig) {
  if (!pivotConfig) return '';
  const rows = (pivotConfig.rows || []).map(getDimDisplayLabel).filter(Boolean);
  const cols = (pivotConfig.columns || []).map(getDimDisplayLabel).filter(Boolean);
  const vals = (pivotConfig.values || [])
    .map((v) => (v.field === '__COUNT__' ? t('记录数') : v.field))
    .filter(Boolean);
  const filters = (pivotConfig.filters || []).map((f) => f.field).filter(Boolean);
  if (!rows.length && !cols.length && !vals.length) return '';

  const parts = [];
  if (rows.length) parts.push(t('按「{0}」分行').replace('{0}', rows.join(' / ')));
  if (cols.length) parts.push(t('按「{0}」分列').replace('{0}', cols.join(' / ')));
  if (vals.length) parts.push(t('汇总「{0}」').replace('{0}', joinLabels(vals)));
  if (filters.length) parts.push(t('已筛选「{0}」').replace('{0}', joinLabels(filters)));
  return parts.join(' · ');
}

/** One-sentence framing for the result pane (what question this view answers). */
export function buildResultQuestion(pivotConfig) {
  if (!pivotConfig) return '';
  const rows = (pivotConfig.rows || []).map(getDimDisplayLabel).filter(Boolean);
  const cols = (pivotConfig.columns || []).map(getDimDisplayLabel).filter(Boolean);
  const vals = (pivotConfig.values || [])
    .map((v) => (v.field === '__COUNT__' ? t('记录数') : v.field))
    .filter(Boolean);
  if (!vals.length) return '';

  const measure = joinLabels(vals);
  if (rows.length && cols.length) {
    return t('比较不同「{0}」在各「{1}」下的「{2}」')
      .replace('{0}', rows.join(' / '))
      .replace('{1}', cols.join(' / '))
      .replace('{2}', measure);
  }
  if (rows.length) {
    return t('查看各「{0}」的「{1}」')
      .replace('{0}', rows.join(' / '))
      .replace('{1}', measure);
  }
  if (cols.length) {
    return t('并排比较各「{0}」的「{1}」')
      .replace('{0}', cols.join(' / '))
      .replace('{1}', measure);
  }
  return t('汇总全部记录的「{0}」').replace('{0}', measure);
}
