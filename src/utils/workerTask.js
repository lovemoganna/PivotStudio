// Terminating a dedicated task also interrupts synchronous parser/aggregation work.
export function startImportTask(payload, onProgress) {
  const worker = new Worker(new URL('../features/pivot/engine/importWorker.js', import.meta.url), { type: 'module' });
  let rejectTask;
  const promise = new Promise((resolve, reject) => {
    rejectTask = reject;
    worker.onmessage = ({ data }) => {
      if (data.progress !== undefined) { onProgress?.(data.progress); return; }
      worker.terminate();
      if (data.error) reject(new Error(data.error)); else resolve(data.sheets);
    };
    worker.onmessageerror = () => { worker.terminate(); reject(new Error('解析结果无法读取，请减少文件字段或重新导出 CSV 后重试')); };
    worker.onerror = (event) => { event.preventDefault(); worker.terminate(); reject(new Error('本地解析进程失败，可能内存不足；请关闭其他标签页或拆分文件后重试')); };
    worker.postMessage(payload);
  });
  return { promise, cancel: () => { worker.terminate(); rejectTask(new DOMException('已取消', 'AbortError')); } };
}
