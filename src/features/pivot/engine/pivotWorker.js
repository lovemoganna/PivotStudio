import { calculatePivot } from './calculatePivot.js';
import { buildUnifiedChartSpec } from './buildChartSpec.js';

self.onmessage = (e) => {
  const { id, payload } = e.data || {};
  if (!payload) return;
  const { dataset, pivotConfig, chartType, chartSpecConfig } = payload;
  try {
    const pivotResult = calculatePivot(dataset, pivotConfig);
    const unifiedChartSpec = buildUnifiedChartSpec(dataset, pivotResult, chartType, chartSpecConfig);
    self.postMessage({ id, success: true, pivotResult, unifiedChartSpec });
  } catch (err) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
