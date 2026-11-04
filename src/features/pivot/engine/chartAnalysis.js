import {calculatePivot} from './calculatePivot.js';
import {buildUnifiedChartSpec} from './buildChartSpec.js';
import {resolveChartConfig} from '../../../utils/chartConfig.js';

// Chart edits have their own analysis configuration; the table result is immutable input.
export function buildChartAnalysis(dataset, tableResult, chartType, settings = {}) {
  let chartResult = tableResult;
  if (settings.analysisConfig) {
    const records = tableResult.filteredCount === 0 ? [] : tableResult.cellRecordsMap?.get('__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__');
    if (!records) throw new Error('无法取得当前分析筛选范围');
    const config = resolveChartConfig(tableResult.analysisConfig || {filters:[]},settings);
    chartResult = calculatePivot({...dataset,rows:records},config);
  }
  return {chartResult, spec: buildUnifiedChartSpec(dataset, chartResult, chartType, settings)};
}
