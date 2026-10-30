import { collectFormulaFields, parseFormulaAST } from '../features/pivot/engine/formulaEngine.js';

export function datasetSchema(dataset, config) {
  const required = config ? referencedFields(config) : null;
  return (dataset?.fields || []).filter(f => !required || required.has(f.name)).map(f => {
    const percent = ['whole','fraction'].includes(f.percentScale);
    const unit = f.type === 'number' && !percent ? String(f.unit || f.currency || '').trim() : '';
    return {name:f.name,type:f.type,percent,...(unit ? {unit} : {})};
  });
}

function referencedFields(config, problems = []) {
  const required = new Set();
  for (const zone of ['rows','columns','filters','values']) for (const item of config[zone] || []) {
    if (!item.isCalculated) required.add(item.field);
    else {
      for (const key of ['operandAField','operandBField']) if (item[key]) required.add(item[key]);
      if (item.formula) {
        try { for (const field of collectFormulaFields(parseFormulaAST(item.formula))) required.add(field); }
        catch { problems.push(`公式无法解析：${item.field}`); }
      }
    }
  }
  required.delete('__COUNT__');
  return required;
}

export function viewCompatibility(config, schema, dataset) {
  const problems = [];
  const required = referencedFields(config,problems);
  const expected = new Map((schema || []).map(f => [f.name,f]));
  const actual = new Map(datasetSchema(dataset).map(f => [f.name,f]));
  for (const name of required) {
    const a = actual.get(name), e = expected.get(name);
    if (!a) problems.push(`缺少字段：${name}`);
    else if (e && (e.type !== a.type || Boolean(e.percent) !== Boolean(a.percent))) problems.push(`类型或数值尺度不匹配：${name}`);
    else if (e?.unit && e.unit !== a.unit) problems.push(`单位不匹配：${name}（配置要求 ${e.unit}，源数据为 ${a.unit || '未声明'}）；请在导入时核对源单位，不会自动换算`);
    else if (!e) {
      const numberRequired = (config.values || []).some(v => !v.isCalculated && v.field === name && !['count','count_distinct'].includes(v.agg || 'sum'));
      const dateRequired = [...(config.rows || []),...(config.columns || [])].some(v => v.field === name && v.dateGranularity && v.dateGranularity !== 'raw');
      if ((numberRequired && a.type !== 'number') || (dateRequired && a.type !== 'date')) problems.push(`字段类型不适合当前配置：${name}`);
    }
  }
  return problems;
}
