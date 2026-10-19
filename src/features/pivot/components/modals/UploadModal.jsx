import React from 'react';
import { FileSpreadsheet, X } from 'lucide-react';

export function UploadModal({
  uploadPreviewModal,
  setUploadPreviewModal,
  confirmUploadDataset,
  onClose,
}) {
  if (!uploadPreviewModal) return null;

  const activeSheet = uploadPreviewModal.sheets[uploadPreviewModal.activeSheetIdx] || uploadPreviewModal.sheets[0];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#A6E22E]" />
              <span>SCHEMA_INFERENCE // 文件解析预览与字段类型校准 ({uploadPreviewModal.fileName})</span>
            </h3>
            <p className="text-[10px] text-[#75715E] dark:text-[#908E80] apple-font-mono mt-0.5">
              共解析 {activeSheet.rows.length} 行数据 · {activeSheet.fields.length} 个字段（支持手动修正字段类型，展示前 20 行预览）
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <div className="text-[11px] font-bold apple-font-mono mb-2 text-[#66D9EF]">1. 字段类型自动推断与手动修正</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeSheet.fields.map((f, fIdx) => (
                <div key={f.name} className="p-2 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{f.name}</span>
                  <select
                    value={f.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setUploadPreviewModal((prev) => {
                        const nextSheets = prev.sheets.map((sh, sIdx) => {
                          if (sIdx !== prev.activeSheetIdx) return sh;
                          const nextFields = sh.fields.map((fld, idx) => (idx === fIdx ? { ...fld, type: nextType } : fld));
                          return { ...sh, fields: nextFields };
                        });
                        return { ...prev, sheets: nextSheets };
                      });
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] apple-font-mono text-[#F92672] font-semibold"
                  >
                    <option value="text">文本 (text)</option>
                    <option value="number">数字 (number)</option>
                    <option value="date">日期 (date)</option>
                    <option value="boolean">布尔值 (boolean)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold apple-font-mono mb-2 text-[#E6DB74]">2. 前 20 行数据抽样预览</div>
            <div className="overflow-x-auto rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32]">
              <table className="w-full border-collapse text-[11px] apple-font-mono">
                <thead className="bg-[#EFECE1] dark:bg-[#1E1F1C]">
                  <tr>
                    {activeSheet.fields.map((f) => (
                      <th key={f.name} className="border-b border-r border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1.5 text-left">
                        {f.name} <span className="text-[9px] text-[#75715E]">({f.type})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSheet.rows.slice(0, 20).map((r, rIdx) => (
                    <tr key={rIdx} className="border-b border-[#D6D4C8]/50 dark:border-[#3E3D32]/50">
                      {activeSheet.fields.map((f) => (
                        <td key={f.name} className="border-r border-[#D6D4C8]/50 dark:border-[#3E3D32]/50 px-2.5 py-1">
                          {String(r[f.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => confirmUploadDataset(false)}
            className="px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold apple-font-mono hover:border-[#66D9EF] transition"
          >
            导入并清空旧透视配置 (步骤5标准)
          </button>
          <button
            onClick={() => confirmUploadDataset(true)}
            className="px-4 py-1.5 rounded-lg bg-[#F92672] text-[#F8F8F2] text-xs font-bold apple-font-mono hover:bg-[#FF3B85] transition"
          >
            确认导入并自动初始化透视
          </button>
        </div>
      </div>
    </div>
  );
}
