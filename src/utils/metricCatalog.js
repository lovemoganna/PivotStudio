import {validateMetricFormula,buildFormulaFromVisualSpec} from '../features/pivot/engine/formulaEngine.js';
import {projectView} from './viewConfig.js';

/** Validate the whole import before committing anything to the current catalog. */
export function normalizeMetricDefinitions(input, fields) {
  if (!Array.isArray(input)) throw new Error('需为指标数组 JSON');
  const ids = new Set(), names = new Set();
  return input.map((item, index) => {
    const fail = message => { throw new Error(`第 ${index + 1} 个指标：${message}`); };
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('需为指标对象');
    if (typeof item.field !== 'string' || !item.field.trim()) fail('名称不能为空，且必须是文本');
    for (const key of ['id','formula','description','operandA','operandB','operandAField','operandBField','operandAAgg','operandBAgg','op','category','builderMode','showAs']) {
      if (item[key] !== undefined && typeof item[key] !== 'string') fail(`${key} 必须是文本`);
    }
    if (item.constantValue !== undefined && !Number.isFinite(item.constantValue)) fail('折算常数必须是有限数值');
    if (item.format !== undefined) {
      if (!item.format || typeof item.format !== 'object' || Array.isArray(item.format)) fail('格式必须是对象');
      for (const key of ['currency','unit']) if (item.format[key] !== undefined && typeof item.format[key] !== 'string') fail(`${key} 必须是文本`);
      for (const key of ['isPercent','thousands']) if (item.format[key] !== undefined && typeof item.format[key] !== 'boolean') fail(`${key} 必须是布尔值`);
    }
    // Existing format-panel metrics store operand fields rather than an AST formula.
    const formula = !item.formula && !item.builderMode && item.operandAField && item.operandBField && ['+','-','*','/'].includes(item.op)
      ? buildFormulaFromVisualSpec(item)
      : item.formula;
    const name = item.field.trim();
    if (item.id && ids.has(item.id)) fail('指标编号重复，请为每个指标使用不同编号');
    if (names.has(name)) fail('指标名称重复，请为每个指标使用不同名称');
    if (item.id) ids.add(item.id);
    names.add(name);
    const validation = validateMetricFormula(formula, fields);
    if (!validation.valid) fail(validation.error);
    const metric = projectView({fullConfig:{values:[{...item,formula,field:item.field.trim(),isCalculated:true,agg:'calc'}]}}).fullConfig.values[0];
    return {...metric,id:metric.id || `v_calc_${Date.now()}_${index}_${Math.random().toString(36).slice(2,6)}`};
  });
}

/** File identity excludes row count/content, so refreshing a file keeps its definitions.
 * Sheet and calibrated schema isolate unrelated or incompatible datasets. */
export function getMetricCatalogKey(dataset) {
  const source = dataset?.metricCatalogSource;
  if (source) return JSON.stringify(['file', source.fileName, source.sheetName,
    (dataset.fields || []).map(({name, type, percentScale}) => ['fraction','whole'].includes(percentScale) ? [name, type, 'percent'] : [name, type])]);
  return dataset?.id || dataset?.name || 'default';
}

export function validateMetricCatalogMerge(existing, incoming) {
  for (const item of incoming) {
    const collision = existing.find(metric => metric.field === item.field && metric.id !== item.id);
    if (collision) throw new Error(`指标「${item.field}」已存在且编号不同，请修改名称或编辑原指标`);
  }
}
