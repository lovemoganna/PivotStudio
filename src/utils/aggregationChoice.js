import {t} from '../i18n.js';

// Choice-time wording distinguishes COUNT(field) from counting all records.
export function aggregationChoiceLabel(agg, field) {
  if (field === '__COUNT__') return t('记录数');
  if (agg === 'count') return t('有效值计数');
  if (agg === 'count_distinct') return t('去重计数');
  return null;
}

export function aggregationChoiceDescription(agg, field) {
  if (field === '__COUNT__') return t('统计全部记录，字段为空也计入。');
  const text = {
    count: '只统计此字段的非空值；0、否和非空文本也计入。',
    count_distinct: '统计此字段不同的非空值；重复值只计一次。',
    sum: '将有效数值相加；空值和无效数值不参与。',
    avg: '有效数值之和 ÷ 有效数值个数；0 参与，空值不参与。',
    median: '取有效数值排序后的中间值；偶数项取中间两项的平均值。',
    stddev: '衡量有效数值的离散程度；采用样本标准差（n−1），至少需要 2 个有效值。',
    max: '取最大的有效数值；空值和无效数值不参与。',
    min: '取最小的有效数值；空值和无效数值不参与。',
  }[agg];
  return text ? t(text) : null;
}
