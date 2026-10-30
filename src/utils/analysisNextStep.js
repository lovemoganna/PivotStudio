/** One optional next step; columns and filters are never prerequisites for an analysis. */
export function getAnalysisNextStep(config) {
  if (!(config?.values?.length)) return {
    zone:'values',
    message:config?.rows?.length ? '已选择分组，添加指标即可查看各组结果。' : '先选择要计算的指标，例如金额、数量或记录数。',
    action:'选择指标',
  };
  if (!(config?.rows?.length)) return {
    zone:'rows', message:'已有统计指标；如需比较不同分组，可继续添加行字段。', action:'选择分组',
  };
  return null;
}
