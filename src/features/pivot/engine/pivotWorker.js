import { profileField } from './profileField.js';
import { calculatePivot } from './calculatePivot.js';
import { buildChartAnalysis } from './chartAnalysis.js';
import { isMissingValue } from '../../../utils/normalizeScalar.js';
import { matchesHistogramBin } from './histogram.js';
let cachedDataset = null;
let cachedPivot = null;
let cachedChartPivot = null;
let cachedConfigKey = null;
let cachedChartSpec = null;
let resultId = null;
self.onmessage = (e) => {
  const { id, payload } = e.data || {};
  if (e.data?.kind === 'drill') {
    const { rowKey, colKey, generation, metadata } = e.data;
    if (generation !== resultId) return;
    const bin = Number.isInteger(e.data.histogramBin)
      ? cachedChartSpec?.histogramItems?.[e.data.histogramBin]
      : (metadata?.histogramBin !== undefined ? cachedChartSpec?.histogramItems?.[metadata.histogramBin] : null);
    const source = e.data.scope === 'chart' ? cachedChartPivot : cachedPivot;
    let records = bin
      ? (source?.cellRecordsMap.get('__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__') || []).filter((record) => matchesHistogramBin(record, bin))
      : source?.cellRecordsMap.get(`${rowKey}@@${colKey}`) || [];
    const range = metadata?.histogramRange;
    if (!bin && range) {
      records = records.filter(record => {
        if (isMissingValue(record[range.field])) return false;
        const value = Number(record[range.field]);
        return Number.isFinite(value) && value >= range.low && (range.includeHigh ? value <= range.high : value < range.high);
      });
    }
    self.postMessage({ kind: 'drill', generation, metadata, records });
    return;
  }
  if (e.data?.kind === 'profile') {
    try { self.postMessage({ kind:'profile', profileId:e.data.profileId, result:profileField(cachedDataset,e.data.field,e.data.dimension,e.data.matchLabel) }); }
    catch(error) {self.postMessage({kind:'profile',profileId:e.data.profileId,error:error.message});}
    return;
  }
  if (!payload) return;
  const { dataset, pivotConfig, chartType, chartSpecConfig } = payload;
  if (dataset !== undefined) {cachedDataset = dataset; cachedPivot = null;}
  try {
    const configKey = JSON.stringify(pivotConfig);
    const pivotResult = cachedPivot && cachedConfigKey === configKey ? cachedPivot : calculatePivot(cachedDataset, pivotConfig, (progress) => self.postMessage({ id, progress }));
    cachedConfigKey = configKey;
    cachedPivot = pivotResult; resultId = id;
    const {chartResult, spec:unifiedChartSpec} = buildChartAnalysis(cachedDataset, pivotResult, chartType, chartSpecConfig);
    cachedChartPivot = chartResult;
    cachedChartSpec = unifiedChartSpec;
    // cellRecordsMap holds a reference to every raw record bucket and is large for big datasets.
    // Transferring it via postMessage (Structured Clone) dominates message cost for 100k+ rows.
    // Strip it here; the worker retains buckets and returns requested details on demand.
    const { cellRecordsMap: _dropped, analysisConfig: _config, ...pivotResultTransferable } = pivotResult;
    // Raw samples in chart points duplicate the dataset during structured cloning.
    // Chart clicks request complete matching records from this worker instead.
    const chartTransferable = { ...unifiedChartSpec };
    for (const key of ['items', 'waterfallItems', 'funnelItems', 'scatterPoints', 'histogramItems']) {
      chartTransferable[key] = (unifiedChartSpec[key] || []).map(({ matchedRows: _records, ...point }) => point);
    }
    const {cellRecordsMap:_chartRecords, analysisConfig:_chartConfig, ...chartPivotResult} = chartResult;
    self.postMessage({ id, success: true, pivotResult: pivotResultTransferable, chartPivotResult:chartResult === pivotResult ? undefined : chartPivotResult, unifiedChartSpec: chartTransferable });
  } catch (err) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};
