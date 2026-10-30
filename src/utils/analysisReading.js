import { t, getLocale } from '../i18n.js';
import { getDimDisplayLabel } from './formatters.js';

function joinLabels(labels) {
  return labels.join(getLocale() === 'en' ? ', ' : '、');
}

/** Explain totals using the same raw-record semantics as the calculation engine. */
export function buildTotalReading(values = []) {
  if (!values.length) return [];
  const notes = ['行总计、列总计和底部总计都按当前筛选范围内的原始记录重新计算。'];
  if (values.some(v=>!v.isCalculated && v.agg==='stddev')) notes.push('标准差采用样本口径（n−1）：衡量有效数值的离散程度，至少需要两个有效数值；空值不当作 0。');
  if (values.some(v=>!v.isCalculated && v.agg==='median')) notes.push('中位数取排序后的中间值；有效数值个数为偶数时，取中间两值的平均。');
  if (values.some(v=>!v.isCalculated && v.agg==='count_distinct' && v.field!=='__COUNT__')) notes.push('去重计数统计不同的非空值；重复值只计一次，不等于原始记录数。');
  if (values.some(v => !v.isCalculated && v.agg === 'avg' && v.field !== '__COUNT__')) {
    notes.push('平均值 = 有效数值之和 ÷ 有效数值个数。空值和无法转换为数字的内容不参与计算，0 会参与。');
    notes.push('总体平均值不是各组平均值的简单平均；各组有效数值个数不同时，结果可能不同。');
  }
  if (values.some(v => v.field === '__COUNT__')) {
    notes.push('记录数统计当前范围内的所有记录，包括字段为空的记录。');
  }
  if (values.some(v => !v.isCalculated && v.field !== '__COUNT__' && v.agg === 'count')) {
    notes.push('字段的有效值计数只统计非空值，包括非空文本；它可能小于记录数。');
  }
  if (values.some(v => v.showAs && v.showAs !== 'normal')) {
    notes.push('百分比、环比和累计等显示方式会在原始聚合值的基础上继续计算；显示值不一定能直接相加。');
  }
  return notes.map(t);
}

/** Preset prompts describe possible analyses; they are not findings about the
 * user's current configuration. Keep explicitly authored and legacy notes. */
export function resolveChartNote(shot, hasCustomShots, pivotConfig) {
  const authored = Boolean(hasCustomShots && shot?.generated !== true);
  return {authored,title:authored ? shot?.title || t('透视图分析笔记') : t('当前分析'),
    body:authored ? shot?.subtitle || '' : buildAnalysisReading(pivotConfig) || t('添加指标后查看当前分析配置。')};
}

/** Keep the question and status faithful to the selected statistical operation. */
export function describeAnalysisMeasure(value) {
  const field = value.field === '__COUNT__' ? t('记录数') : value.field;
  const aggregate = value.field === '__COUNT__' ? null : value.isCalculated ? '自定义公式' : ({sum:'求和',avg:'平均值',count:'有效值计数',count_distinct:'去重计数',median:'中位数',stddev:'标准差',min:'最小值',max:'最大值'}[value.agg || 'sum']);
  const display = {pct_grand:'占总计百分比',pct_row:'占行总计百分比',pct_col:'占列总计百分比',prev_diff:'较上一行差值',pct_prev_diff:'较上一行变化率',running_total:'累计值'}[value.showAs];
  const details = [aggregate, display].filter(Boolean).map(t);
  return details.length ? `${field}（${details.join(' · ')}）` : field;
}

/** Plain-language summary of the current pivot structure for status/result surfaces. */
export function buildAnalysisReading(pivotConfig) {
  if (!pivotConfig) return '';
  const rows = (pivotConfig.rows || []).map(getDimDisplayLabel).filter(Boolean);
  const cols = (pivotConfig.columns || []).map(getDimDisplayLabel).filter(Boolean);
  const vals = (pivotConfig.values || [])
    .map(describeAnalysisMeasure)
    .filter(Boolean);
  const filters = [...new Set([
    ...(pivotConfig.filters || []).filter(f => f.excludeAll || f.selectedValues?.length).map(f => f.field),
    ...[...(pivotConfig.rows || []), ...(pivotConfig.columns || [])].filter(f => f.excludedValues?.length).map(f => f.field),
  ])].filter(Boolean);
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
    .map(describeAnalysisMeasure)
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
