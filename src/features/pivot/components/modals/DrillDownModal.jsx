import React from 'react';
import { Eye, X } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { encodeCsvCell } from '../../../../utils/exportMatrix';

export function DrillDownModal({
  modalData,
  currentDataset,
  drillSearch,
  setDrillSearch,
  drillPage,
  setDrillPage,
  onClose,
  showToast,
}) {
  const dialogRef = useDialogFocus(Boolean(modalData), onClose);
  if (!modalData) return null;

  const q = drillSearch.trim().toLowerCase();
  const filteredRecs = q
    ? modalData.records.filter((r) =>
        currentDataset.fields.some((f) => String(r[f.name] ?? '').toLowerCase().includes(q))
      )
    : modalData.records;
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredRecs.length / pageSize));
  const safePage = Math.min(drillPage, totalPages);
  const pagedRecs = filteredRecs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExportCSV = () => {
    const headers = currentDataset.fields.map((f) => f.name);
    const csvRows = [
      headers.map(encodeCsvCell).join(','),
      ...modalData.records.map((r) =>
        headers.map((h) => encodeCsvCell(r[h])).join(',')
      ),
    ];
    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `明细下钻_${modalData.rowLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast?.(`已导出该分组的 ${modalData.records.length} 条完整原始明细（与搜索筛选无关）`);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="原始数据明细下钻" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[84vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#66D9EF]" />
              <span>DRILL_DOWN // 原始明细数据下钻</span>
              <span className="px-2 py-0.5 rounded bg-[#F92672]/15 text-[#F92672] text-[10px]">
                {modalData.valueFormatted} ({modalData.records.length} 条记录)
              </span>
            </h3>
            <p className="text-[10px] text-[#75715E] dark:text-[#908E80] apple-font-mono mt-0.5">
              分组路径: {modalData.rowLabel} × {modalData.colLabel} · 指标: {modalData.valLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={drillSearch}
              onChange={(e) => { setDrillSearch(e.target.value); setDrillPage(1); }}
              aria-label="搜索原始明细记录"
              placeholder="搜索明细记录..."
              className="px-2.5 py-1 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] apple-font-mono focus:outline-none focus:border-[#66D9EF]"
            />
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-lg bg-[#A6E22E] text-[#1E1F1C] text-[10px] font-bold apple-font-mono hover:opacity-90 transition"
            >
              导出全部明细 CSV
            </button>
            <button onClick={onClose} aria-label="关闭原始明细" className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {pagedRecs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#75715E] apple-font-mono">/* 无匹配的原始明细记录 */</div>
          ) : (
            <table className="w-full border-collapse text-[11px] apple-font-mono">
              <thead className="sticky top-0 bg-[#EFECE1] dark:bg-[#1E1F1C]">
                <tr>
                  <th className="border border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1.5 text-left text-[#75715E]">#</th>
                  {currentDataset.fields.map((f) => (
                    <th key={f.name} className="border border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1.5 text-left text-[#66D9EF]">
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRecs.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-black/[0.03] dark:hover:bg-[#3E3D32]/40">
                    <td className="border border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1 text-[#75715E]">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    {currentDataset.fields.map((f) => (
                      <td key={f.name} className="border border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1">
                        {f.type === 'number' ? (rec[f.name] === null || rec[f.name] === undefined || rec[f.name] === '' ? '—' : Number(rec[f.name]).toLocaleString()) : String(rec[f.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between text-[11px] apple-font-mono">
          <span className="text-[#75715E]">
            显示 {filteredRecs.length > 0 ? (safePage - 1) * pageSize + 1 : 0} – {Math.min(safePage * pageSize, filteredRecs.length)} 条 / 共 {filteredRecs.length} 条
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage <= 1}
              onClick={() => setDrillPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] disabled:opacity-40"
            >
              上一页
            </button>
            <span>{safePage} / {totalPages}</span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setDrillPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
