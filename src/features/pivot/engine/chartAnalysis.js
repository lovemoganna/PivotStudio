import {calculatePivot} from './calculatePivot.js';
import {buildUnifiedChartSpec} from './buildChartSpec.js';

// Chart edits have their own analysis configuration; the table result is immutable input.
export function buildChartAnalysis(dataset, tableResult, chartType, settings = {}) {
  const chartResult = settings.analysisConfig
    ? calculatePivot(dataset, settings.analysisConfig)
    : tableResult;
  return {chartResult, spec: buildUnifiedChartSpec(dataset, chartResult, chartType, settings)};
}
