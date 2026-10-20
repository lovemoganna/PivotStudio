import { calculatePivot } from './calculatePivot.js';
import { buildUnifiedChartSpec } from './buildChartSpec.js';

let cachedDataset = null;
let cachedPivot = null;
let resultId = null;
self.onmessage = (e) => {
  const { id, payload } = e.data || {};
  if (e.data?.kind === 'drill') {
    const { rowKey, colKey, generation, metadata } = e.data;
    if (generation !== resultId) return;
    const records = cachedPivot?.cellRecordsMap.get(`${rowKey}@@${colKey}`) || [];
    self.postMessage({ kind: 'drill', generation, metadata, records });
    return;
  }
  if (!payload) return;
  const { dataset, pivotConfig, chartType, chartSpecConfig } = payload;
  if (dataset !== undefined) cachedDataset = dataset;
  try {
    const pivotResult = calculatePivot(cachedDataset, pivotConfig, (progress) => self.postMessage({ id, progress }));
    cachedPivot = pivotResult; resultId = id;
    const unifiedChartSpec = buildUnifiedChartSpec(cachedDataset, pivotResult, chartType, chartSpecConfig);
    // cellRecordsMap holds a reference to every raw record bucket and is large for big datasets.
    // Transferring it via postMessage (Structured Clone) dominates message cost for 100k+ rows.
    // Strip it here; the worker retains buckets and returns requested details on demand.
    const { cellRecordsMap: _dropped, ...pivotResultTransferable } = pivotResult;
    self.postMessage({ id, success: true, pivotResult: pivotResultTransferable, unifiedChartSpec });
  } catch (err) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
