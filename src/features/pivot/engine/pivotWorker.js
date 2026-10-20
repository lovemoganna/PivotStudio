import { calculatePivot } from './calculatePivot.js';

self.onmessage = (event) => {
  try {
    const { dataset, config } = event.data || {};
    const result = calculatePivot(dataset, config);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || '透视计算失败' });
  }
};
