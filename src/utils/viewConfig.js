// Explicit configuration projection prevents rows, sample records or arbitrary objects entering URLs.
const pick = (source, keys) => Object.fromEntries(keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));
const dimensionKeys = ['id','field','sort','dateGranularity','numberBin','excludedValues','selectedValues','excludeAll'];
export function projectView(source) {
  const config = source?.fullConfig || {};
  if (typeof config !== 'object' || Array.isArray(config)) throw new Error('透视配置必须是对象');
  const fullConfig = pick(config,['showSubtotals','collapsedRowKeys','collapsedColKeys','valueSort']);
  for (const zone of ['rows','columns','values','filters']) {
    if (config[zone] !== undefined && !Array.isArray(config[zone])) throw new Error('配置区域格式错误');
    fullConfig[zone] = (config[zone] || []).map((item) => {
      if (!item || typeof item.field !== 'string') throw new Error('配置缺少字段名称');
      const projected = pick(item,zone === 'values' ? ['id','field','agg','showAs','format','isCalculated','operandA','op','operandB','operandAField','operandAAgg','operandBField','operandBAgg','formula','description','builderMode','constantValue','category'] : dimensionKeys);
      if (projected.format) projected.format = pick(projected.format,['thousands','decimals','currency','unit','isPercent']);
      if (projected.builderMode !== undefined && !['binary','margin','constant','expression'].includes(projected.builderMode)) throw new Error('指标构建模式无效');
      if (projected.constantValue !== undefined && !Number.isFinite(projected.constantValue)) throw new Error('指标折算常数必须为有限数值');
      if (projected.category !== undefined && typeof projected.category !== 'string') throw new Error('指标分类必须是文本');
      if (projected.format?.decimals !== undefined && (!Number.isInteger(projected.format.decimals) || projected.format.decimals < 0 || projected.format.decimals > 12)) throw new Error('小数位必须为 0 至 12 的整数');
      if (projected.numberBin) projected.numberBin = pick(projected.numberBin,['start','step']);
      if (projected.excludeAll !== undefined && typeof projected.excludeAll !== 'boolean') throw new Error('excludeAll must be a boolean');
      for (const key of ['selectedValues','excludedValues']) if (projected[key] !== undefined && (!Array.isArray(projected[key]) || !projected[key].every((value)=>['string','number','boolean'].includes(typeof value)))) throw new Error('筛选值必须是文本或数值列表');
      return projected;
    });
  }
  if (fullConfig.valueSort) fullConfig.valueSort = pick(fullConfig.valueSort,['colKey','valueId','direction']);
  return {
    version: 1, fullConfig,
    vm: ['split','chart','table'].includes(source?.vm) ? source.vm : 'split',
    ct: source?.ct || 'bar',
    cf: pick(source?.cf,['colorScale','showDataBar','customRuleEnabled','customRuleOp','customRuleValue','customRuleColor']),
    csc: pick(source?.csc,['primaryValueId','secondaryValueId','sortMode','topN','missingValueMode','lineDerivedMetric','showDataLabels','showAvgReferenceLine','clickLinkMode','histogramBins','stickyRowHeaders']),
    ts: pick(source?.ts,['density','colWidthMode','dataAlignment','showZebra','wrapText','showExtremes','customColWidths']),
  };
}
export function encodeView(source) {
  const json = JSON.stringify(projectView(source));
  if (json.length > 60000) throw new Error('配置过大，请减少筛选值后再分享');
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodeView(input) {
  let token = input.trim();
  if (token.includes('share_token=')) token = token.split('share_token=')[1].split('&')[0];
  if (token.length > 180000) throw new Error('分享配置过大，请使用更少筛选值');
  const json = new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(decodeURIComponent(token)),(char) => char.charCodeAt(0)));
  const source = JSON.parse(json);
  if (!source.fullConfig || typeof source.fullConfig !== 'object') throw new Error('分享配置缺少透视字段');
  return projectView(source);
}
export function createShareLink(source, location) {
  return `${location.origin}${location.pathname}#share_token=${encodeURIComponent(encodeView(source))}`;
}
