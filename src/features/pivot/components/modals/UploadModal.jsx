import { t } from '../../../../i18n.js';
import React from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function UploadModal({
  uploadPreviewModal,
  setUploadPreviewModal,
  confirmUploadDataset,
  onClose,
  onReparse,
  isImporting,
}) {
  const dialogRef = useDialogFocus(Boolean(uploadPreviewModal), onClose);
  if (!uploadPreviewModal) return null;

  const activeSheetIdx = uploadPreviewModal.activeSheetIdx ?? 0;
  const activeSheet = uploadPreviewModal.sheets[activeSheetIdx] || uploadPreviewModal.sheets[0];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={t("文件数据预览与类型校准")} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold break-all apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-ink-green" />
              <span>{t("文件解析预览与字段类型校准 (")}{uploadPreviewModal.fileName})</span>
            </h3>
            <p className="text-[10px] text-ink-muted apple-font-mono mt-0.5">{' ' + t("当前工作表共") + ' '}{activeSheet.rows.length}{' ' + t("行数据 ·") + ' '}{activeSheet.fields.length}{' ' + t("个字段（支持手动校准字段类型，展示前 20 行抽样）") + ' '}</p>
          </div>
          <button onClick={onClose} aria-label={t("关闭文件预览")} className="p-1 shrink-0 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {uploadPreviewModal.sheets.length > 1 && (
          <div className="px-5 pt-2.5 flex items-center gap-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/50 overflow-x-auto">
            <span className="text-[10px] text-ink-muted font-semibold apple-font-mono shrink-0 mr-1">{t("选择工作表:")}</span>
            {uploadPreviewModal.sheets.map((sh, sIdx) => (
              <button
                key={sh.name || sIdx}
                type="button"
                onClick={() => setUploadPreviewModal((prev) => ({ ...prev, activeSheetIdx: sIdx }))}
                className={`px-3 py-1.5 rounded-t-lg border-t border-x text-xs font-semibold apple-font-mono transition ${
                  activeSheetIdx === sIdx
                    ? 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#49483E] text-ink-pink shadow-sm'
                    : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
              >
                <span>{sh.name || `Sheet ${sIdx + 1}`}</span>
                <span className="ml-1.5 text-[9px] text-ink-muted">({sh.rows.length}{t("行)")}</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {activeSheet.importMeta?.warnings && <p role="alert" className="text-ink-pink">{activeSheet.importMeta.warnings}</p>}
          {activeSheet.importMeta && !/\.(xlsx|xls)$/i.test(uploadPreviewModal.fileName) && (
            <div className="flex flex-wrap gap-3 items-center">
              <span>{t("自动识别：")}{activeSheet.importMeta.encoding.toUpperCase()} · {activeSheet.importMeta.hasHeader ? t("有表头") : t("无表头")}{t("（识别有误可修改）")}</span>
              {[
                ['encoding', '编码', [['auto','自动'],['utf-8','UTF-8'],['gbk','GBK']]],
                ['delimiter', '分隔符', [['auto','自动'],[',','逗号'],[';','分号'],['\t','制表符'],['|','竖线']]],
                ['header', '表头', [['auto','自动'],['yes','有表头'],['no','无表头']]],
              ].map(([key,label,choices]) => (
                <label key={key}>{t(label)} <select aria-label={t(label)} disabled={isImporting} value={uploadPreviewModal.options?.[key] || 'auto'}
                  onChange={(event) => onReparse?.({ ...uploadPreviewModal.options, [key]: event.target.value })}
                  className="bg-[#FFFDF7] dark:bg-[#272822] border rounded p-1">
                  {choices.map(([value,text]) => <option key={value} value={value}>{t(text)}</option>)}
                </select></label>
              ))}
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold apple-font-mono mb-2 text-ink-cyan">{t("1. 字段类型自动推断与手动校准")}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeSheet.fields.map((f, fIdx) => (
                <div key={f.name} className="p-2 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex flex-wrap items-center justify-between gap-2">
                  <span title={f.name} className="text-xs font-semibold break-words min-w-0">{f.name}</span>
                  <select
                    aria-label={`${f.name} · ${t('字段类型')}`}
                    value={f.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setUploadPreviewModal((prev) => {
                        const nextSheets = prev.sheets.map((sh, sIdx) => {
                          if (sIdx !== activeSheetIdx) return sh;
                          const nextFields = sh.fields.map((fld, idx) => (idx === fIdx ? { ...fld, type: nextType } : fld));
                          return { ...sh, fields: nextFields };
                        });
                        return { ...prev, sheets: nextSheets };
                      });
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] apple-font-mono text-ink-pink font-semibold"
                  >
                    <option value="text">{t("文本 (text)")}</option>
                    <option value="number">{t("数字 (number)")}</option>
                    <option value="date">{t("日期 (date)")}</option>
                    <option value="boolean">{t("布尔值 (boolean)")}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold apple-font-mono mb-2 text-ink-yellow">{t("2. 前 20 行数据抽样预览")}</div>
            <div className="overflow-x-auto rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32]">
              <table className="w-full border-collapse text-[11px] apple-font-mono">
                <thead className="bg-[#EFECE1] dark:bg-[#1E1F1C]">
                  <tr>
                    {activeSheet.fields.map((f) => (
                      <th key={f.name} className="border-b border-r border-[#D6D4C8] dark:border-[#3E3D32] px-2.5 py-1.5 text-left">
                        {f.name} <span className="text-[9px] text-ink-muted">({f.type})</span>
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
            disabled={isImporting}
            onClick={() => confirmUploadDataset(false)}
            className="px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold apple-font-mono hover:border-[#66D9EF] transition"
          >{' ' + t("仅导入数据（清空当前透视）") + ' '}</button>
          <button
            disabled={isImporting}
            onClick={() => confirmUploadDataset(true)}
            className="px-4 py-1.5 rounded-lg bg-action text-[#F8F8F2] text-xs font-bold apple-font-mono hover:bg-[#FF3B85] transition"
          >{' ' + t("确认导入并自动构建推荐透视") + ' '}</button>
        </div>
      </div>
    </div>
  );
}
