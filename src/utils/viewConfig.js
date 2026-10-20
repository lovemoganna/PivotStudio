// Explicit configuration projection prevents rows, sample records or arbitrary objects entering URLs.
const pick = (source, keys) => Object.fromEntries(keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));
const dimensionKeys = ['id','field','sort','dateGranularity','numberBin','excludedValues','selectedValues'];
export function projectView(source) {
  const config = source?.fullConfig || {};
  const fullConfig = pick(config,['showSubtotals','collapsedRowKeys','collapsedColKeys','valueSort']);
  for (const zone of ['rows','columns','values','filters']) {
    if (config[zone] !== undefined && !Array.isArray(config[zone])) throw new Error('配置区域格式错误');
    fullConfig[zone] = (config[zone] || []).map((item) => {
      if (!item || typeof item.field !== 'string') throw new Error('配置缺少字段名称');
      return pick(item,zone === 'values' ? ['id','field','agg','showAs','format','isCalculated','operandA','op','operandB'] : dimensionKeys);
    });
  }
  return {
    version: 1, fullConfig,
    vm: ['split','chart','table'].includes(source?.vm) ? source.vm : 'split',
    ct: source?.ct || 'bar',
    cf: pick(source?.cf,['colorScale','showDataBar','customRuleEnabled','customRuleOp','customRuleValue','customRuleColor']),
    csc: pick(source?.csc,['primaryValueId','secondaryValueId','sortMode','topN','missingValueMode','lineDerivedMetric','showDataLabels','showAvgReferenceLine','clickLinkMode','histogramBins','stickyRowHeaders']),
    ts: pick(source?.ts,['density','dataAlignment','showZebra','wrapText','showExtremes','customColWidths']),
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
