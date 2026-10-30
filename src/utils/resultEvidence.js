import { t } from '../i18n.js';

export function resultReason(reason) {
  return t({no_records:'该分组没有匹配记录',no_valid_numbers:'没有可参与计算的有效数值',insufficient_samples:'标准差至少需要两个有效数值',previous_unavailable:'前项没有有效数值，无法比较',zero_denominator:'分母为 0，无法计算',baseline:'首项或汇总项没有可比较的前项',invalid_formula:'公式无法解析',formula_unavailable:'公式输入缺失、无效或运算不可用',numeric_overflow:'结果超出可表示的数值范围'}[reason] || '');
}

export function sampleEvidence(samples) {
  if (!samples) return '';
  return `${t('记录总数')} ${samples.total} · ${t('有效记录')} ${samples.valid} · ${t('空值排除')} ${samples.missing} · ${t('无效数值排除')} ${samples.invalid}`;
}

export function cellEvidence(cell) {
  return [resultReason(cell?.reason),sampleEvidence(cell?.samples)].filter(Boolean).join('；');
}
