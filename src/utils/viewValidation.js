/** Reject stale, malformed or cross-dataset workbench configurations before applying them. */
export function validateViewConfig(payload, dataset) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '视图配置不是有效对象';
  if (!dataset?.fields || !Array.isArray(dataset.fields)) return '当前数据集不可用';
  if (payload.datasetId && payload.datasetId !== dataset.id) return '分享配置来自其他数据集，请先导入并选择原始数据集';
  if (!payload.fullConfig || typeof payload.fullConfig !== 'object') return '分享配置缺少透视分析设置';
  const config = payload.fullConfig;
  const validFields = new Set(dataset.fields.map((f) => f.name));
  const axes = ['rows', 'columns', 'values', 'filters'];
  if (axes.some((axis) => !Array.isArray(config[axis]))) return '透视配置字段结构不完整';
  for (const axis of axes) {
    for (const item of config[axis]) {
      if (!item || typeof item.field !== 'string' || !validFields.has(item.field)) {
        return '配置引用了当前数据集中不存在的字段';
      }
    }
  }
  if (!['table','split','chart'].includes(payload.vm || 'split')) return '视图模式无效';
  return null;
}

export function validateWorkspaceSnapshot(snapshot, datasets) {
  if (!snapshot || typeof snapshot !== 'object') return '工作区快照无效';
  const dataset = datasets?.find((ds) => ds.id === snapshot.datasetId);
  if (!dataset) return '原始数据集未在当前浏览器加载，请先重新导入数据';
  return validateViewConfig({datasetId:snapshot.datasetId,fullConfig:snapshot.pivotConfig,vm:snapshot.viewMode},dataset);
}
