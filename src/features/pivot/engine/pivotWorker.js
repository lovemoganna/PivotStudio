import { calculatePivot } from './calculatePivot.js';

// Transfer bucket row indices instead of re-cloning each full raw record.
// The main thread resolves indices against its original dataset only on demand.
self.onmessage = (event) => {
  try {
    const { dataset, config } = event.data || {};
    const result = calculatePivot(dataset, config);
    const rowIndexes = new Map(dataset.rows.map((row, index) => [row, index]));
    const compactBuckets = new Map();
    const transfer = [];
    for (const [key, rows] of result.cellRecordsMap) {
      const indices = new Uint32Array(rows.length);
      for (let i = 0; i < rows.length; i++) {
        const index = rowIndexes.get(rows[i]);
        if (index === undefined) throw new Error('未找到原始记录索引');
        indices[i] = index;
      }
      compactBuckets.set(key, indices);
      transfer.push(indices.buffer);
    }
    result.cellRecordsMap = compactBuckets;
    self.postMessage({ ok: true, result, encoding: 'row_indices_v1' }, transfer);
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || '透视计算失败' });
  }
};
