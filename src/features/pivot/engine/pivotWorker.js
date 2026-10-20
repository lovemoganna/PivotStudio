import { calculatePivot } from './calculatePivot.js';
import { buildUnifiedChartSpec } from './buildChartSpec.js';

let cachedDataset = null;
self.onmessage = (e) => {
  const { id, payload } = e.data || {};
  if (!payload) return;
  const { dataset, pivotConfig, chartType, chartSpecConfig } = payload;
  if (dataset !== undefined) cachedDataset = dataset;
  try {
    const pivotResult = calculatePivot(cachedDataset, pivotConfig, (progress) => self.postMessage({ id, progress }));
    const unifiedChartSpec = buildUnifiedChartSpec(cachedDataset, pivotResult, chartType, chartSpecConfig);
    // cellRecordsMap holds a reference to every raw record bucket and is large for big datasets.
    // Transferring it via postMessage (Structured Clone) dominates message cost for 100k+ rows.
    // Strip it here; the main thread rebuilds it lazily from the same dataset on drill-down.
    const { cellRecordsMap: _dropped, ...pivotResultTransferable } = pivotResult;
    self.postMessage({ id, success: true, pivotResult: pivotResultTransferable, unifiedChartSpec });
  } catch (err) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
