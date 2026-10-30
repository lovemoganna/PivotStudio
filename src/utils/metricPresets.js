import {isMeasureField, isIdentifierField, isRateField, getMeasureDefaults} from './fieldSemantics.js';

// Suggestions describe arithmetic, never infer business definitions or currency.
export function buildMetricPresets(fields = []) {
  const presets = [];
  // Presets aggregate quantities only. IDs, rates and fields whose usual
  // aggregation is an average remain available in the manual editor.
  const measures = fields.filter(f => f.type === 'number' && isMeasureField(f)
    && !isIdentifierField(f.name) && !isRateField(f.name) && getMeasureDefaults(f).agg === 'sum');
  const dimensions = fields.filter(f => !isMeasureField(f));
  const m0 = measures[0]?.name;
  const m1 = measures[1]?.name;
  const d0 = dimensions[0]?.name;

  // A name is a candidate, not proof of a business metric. Ambiguous
  // matches get no suggested pair; users can still choose any fields.
  const uniqueMeasure = regex => {
    const matches = measures.filter(f => regex.test(f.name.trim()));
    return matches.length === 1 ? matches[0].name : null;
  };
  const salesField = uniqueMeasure(/^(?:销售额|销售收入|营业收入|营收|收入|revenue|sales|sales[ _]?(?:amount|revenue))(?:\s*[（(][^）)]*[）)])?$/i);
  const costField = uniqueMeasure(/^(?:成本|销售成本|营业成本|cost|cost[ _]?of[ _]?sales|cogs)(?:\s*[（(][^）)]*[）)])?$/i);

  if (salesField && costField) {
    presets.push({
      id: 'preset_gross_margin',
      label: `(${salesField}−${costField})÷${salesField} 差额比`,
      badge: '差额比',
      category: 'profit',
      mode: 'margin',
      spec: {
        name: `${salesField}与${costField}差额比`,
        description: `先分别求和，再计算 (${salesField} - ${costField}) / ${salesField}；请确认两项单位与统计范围一致。`,
        operandAField: salesField,
        operandAAgg: 'sum',
        op: '/',
        operandBField: costField,
        operandBAgg: 'sum',
        formatPreset: 'percent',
        decimals: 1,
      },
    });
  }
  if (m0 && m1) {
    presets.push({
      id: 'preset_ratio',
      label: `${m1}÷${m0} 比值 (%)`,
      badge: '比率',
      category: 'ratio',
      mode: 'binary',
      spec: {
        name: `${m1}/${m0}比值`,
        description: `SUM([${m1}]) / SUM([${m0}])；比值不一定代表占比或转化率。`,
        operandAField: m1,
        operandAAgg: 'sum',
        op: '/',
        operandBField: m0,
        operandBAgg: 'sum',
        formatPreset: 'percent',
        decimals: 1,
      },
    });
    if (!(m0 === salesField && m1 === costField)) presets.push({
      id: 'preset_margin',
      label: `(${m0}−${m1})÷${m0} 差额比`,
      badge: '差额比',
      category: 'profit',
      mode: 'margin',
      spec: {
        name: `${m0}与${m1}差额比`,
        description: `先分别求和，再计算 (${m0} - ${m1}) / ${m0}；请确认两项单位与统计范围一致。`,
        operandAField: m0,
        operandAAgg: 'sum',
        op: '/',
        operandBField: m1,
        operandBAgg: 'sum',
        formatPreset: 'percent',
        decimals: 1,
      },
    });
    presets.push({
      id: 'preset_diff',
      label: `${m0}−${m1} 差值`,
      badge: '差额',
      category: 'profit',
      mode: 'binary',
      spec: {
        name: `${m0}-${m1}差值`,
        description: `${m0} 与 ${m1} 的求和差值；请确认两项单位与统计范围一致。`,
        operandAField: m0,
        operandAAgg: 'sum',
        op: '-',
        operandBField: m1,
        operandBAgg: 'sum',
        formatPreset: 'number',
        decimals: 0,
      },
    });
  }
  if (m0) {
    presets.push({
      id: 'preset_aov',
      label: `每条记录分摊${m0} (÷记录数)`,
      badge: '单均',
      category: 'average',
      mode: 'binary',
      spec: {
        name: `每条记录分摊${m0}`,
        description: `SUM([${m0}]) / COUNT()；分母含空值记录，不等同于订单均价或非空值均值。`,
        operandAField: m0,
        operandAAgg: 'sum',
        op: '/',
        operandBField: '__COUNT__',
        operandBAgg: 'count',
        formatPreset: 'number',
        decimals: 1,
      },
    });
    if (d0) {
      presets.push({
        id: 'preset_per_dim',
        label: `每个${d0}分摊${m0}`,
        badge: '去重均产出',
        category: 'average',
        mode: 'binary',
        spec: {
          name: `每个${d0}分摊${m0}`,
          description: `SUM([${m0}]) / COUNTD([${d0}])；分母为该字段非空唯一值个数，不推断客户数或订单数。`,
          operandAField: m0,
          operandAAgg: 'sum',
          op: '/',
          operandBField: d0,
          operandBAgg: 'count_distinct',
          formatPreset: 'number',
          decimals: 1,
        },
      });
    }
    presets.push({
      id: 'preset_wan',
      label: `${m0} ÷ 10000`,
      badge: '折算',
      category: 'scale',
      mode: 'constant',
      spec: {
        name: `${m0}(÷10000)`,
        description: `将 ${m0} 的合计除以 10,000，以万为数量级；保留原字段的业务单位。`,
        operandAField: m0,
        operandAAgg: 'sum',
        op: '/',
        constantValue: 10000,
        formatPreset: 'number',
        decimals: 2,
        unit: '万',
      },
    });
  }
  return presets;
}
