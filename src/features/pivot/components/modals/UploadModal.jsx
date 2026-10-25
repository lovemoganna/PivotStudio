import { t } from '../../../../i18n.js';
import React from 'react';
import { FileSpreadsheet, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';

export function UploadModal({ uploadPreviewModal, setUploadPreviewModal, confirmUploadDataset, onClose, onReparse, isImporting }) {
  const dialogRef = useDialogFocus(Boolean(uploadPreviewModal), onClose);
  if (!uploadPreviewModal) return null;
  const activeSheetIdx = uploadPreviewModal.activeSheetIdx ?? 0;
  const activeSheet = uploadPreviewModal.sheets[activeSheetIdx] || uploadPreviewModal.sheets[0];
  const isExcel = /\.(xlsx|xls)$/i.test(uploadPreviewModal.fileName);
  const sheetName = activeSheet.name || `Sheet ${activeSheetIdx + 1}`;
  const changeType = (fieldIndex, type) => setUploadPreviewModal(prev => ({
    ...prev, sheets: prev.sheets.map((sheet, index) => index === activeSheetIdx ? {
      ...sheet, fields: sheet.fields.map((field, index) => index === fieldIndex ? { ...field, type } : field),
    } : sheet),
  }));

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('文件数据预览与类型校准')} tabIndex={-1} onClick={e => e.stopPropagation()}
        className="w-full max-w-6xl min-w-0 max-h-[calc(100dvh-2rem)] rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl flex flex-col overflow-hidden animate-apple-modal">
        {/* Header */}
        <header className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-start gap-3">
          <FileSpreadsheet aria-hidden="true" className="w-5 h-5 mt-0.5 shrink-0 text-ink-green" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
              <span>{t('导入数据')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#A6E22E]/15 text-ink-green font-normal">
                {activeSheet.rows.length} {t('行数据')} · {activeSheet.fields.length} {t('个字段')}
              </span>
            </h2>
            <p data-testid="import-file-name" className="mt-0.5 text-xs text-ink-muted leading-5 [overflow-wrap:anywhere] apple-font-mono">
              {uploadPreviewModal.fileName}
            </p>
          </div>
          <button onClick={onClose} aria-label={t('关闭文件预览')} className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 text-xs">
          {/* Worksheet Selection for Excel */}
          {isExcel && (
            <section className="space-y-2">
              <label className="block text-xs font-semibold apple-font-mono">
                {t('工作表')}
                <select aria-label={t('工作表')} disabled={isImporting} value={activeSheetIdx}
                  onChange={e => setUploadPreviewModal(prev => ({ ...prev, activeSheetIdx: Number(e.target.value) }))}
                  className="block mt-1 w-full min-w-0 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] px-3 py-1.5 text-xs apple-font-mono">
                  {uploadPreviewModal.sheets.map((sheet, index) => (
                    <option key={index} value={index}>{sheet.name || `Sheet ${index + 1}`}</option>
                  ))}
                </select>
              </label>
              <h3 data-testid="import-sheet-name" className="text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{sheetName}</h3>
              <p className="text-xs text-ink-muted">{activeSheet.rows.length}{' ' + t('行数据 ·') + ' '}{activeSheet.fields.length}{' ' + t('个字段') + ' · '}{t('预览前 20 行')}</p>
            </section>
          )}

          {activeSheet.importMeta?.warnings && (
            <p role="alert" className="text-sm text-ink-pink [overflow-wrap:anywhere] p-2.5 rounded-lg bg-[#F92672]/10 border border-[#F92672]/30 font-semibold">
              {activeSheet.importMeta.warnings}
            </p>
          )}

          {/* File Parsing Options for CSV */}
          {activeSheet.importMeta && !isExcel && (
            <section className="space-y-2 p-3 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 border border-[#D6D4C8] dark:border-[#3E3D32]" aria-label={t('文件解析设置')}>
              <div className="flex items-center justify-between">
                <span className="font-semibold apple-font-mono">{t("文件解析选项")}</span>
                <span className="text-xs text-ink-muted apple-font-mono">{t('自动识别：')}{activeSheet.importMeta.encoding.toUpperCase()} · {activeSheet.importMeta.hasHeader ? t('有表头') : t('无表头')}</span>
              </div>
              <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-2">
                {[
                  ['encoding', '编码', [['auto','自动'],['utf-8','UTF-8'],['gbk','GBK']]],
                  ['delimiter', '分隔符', [['auto','自动'],[',','逗号'],[';','分号'],['\t','制表符'],['|','竖线']]],
                  ['header', '表头', [['auto','自动'],['yes','有表头'],['no','无表头']]],
                ].map(([key,label,choices]) => (
                  <label key={key} className="flex items-center gap-2 text-xs apple-font-mono">
                    <span className="shrink-0 text-ink-muted">{t(label)}</span>
                    <select aria-label={t(label)} disabled={isImporting} value={uploadPreviewModal.options?.[key] || 'auto'}
                      onChange={e => onReparse?.({ ...uploadPreviewModal.options, [key]: e.target.value })}
                      className="flex-1 min-w-0 bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] rounded-md px-2 py-1 text-xs">
                      {choices.map(([value,text]) => <option key={value} value={value}>{t(text)}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Data Preview Table */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-1.5">
                <span>{t('数据预览')}</span>
                <span className="text-[10px] text-ink-muted font-normal">({t('预览前 20 行')})</span>
              </h3>
              <p className="text-[11px] text-ink-muted">{t('在列名下方校准字段类型')}</p>
            </div>
            <p className="text-[10.5px] text-ink-muted">{t('空值保持为空；无法转换的内容会保留原值，不会当作 0 或“否”。')}</p>
            {activeSheet.fields.length > 2 && <p className="text-[10px] text-ink-cyan apple-font-mono">{t('左右滚动查看其余列')}</p>}
            <div data-testid="import-table-scroll" tabIndex={0} role="region" aria-label={t('数据预览，可横向滚动')}
              className="max-h-[45dvh] overflow-auto rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32]">
              <table className="w-max min-w-full border-collapse text-xs apple-font-mono">
                <thead className="sticky top-0 z-10 bg-[#EFECE1] dark:bg-[#1E1F1C]">
                  <tr>
                    {activeSheet.fields.map((field, index) => (
                      <th scope="col" key={field.name} className="w-48 min-w-40 max-w-64 border-b border-r border-[#D6D4C8] dark:border-[#3E3D32] p-2.5 text-left align-top">
                        <div className="font-semibold leading-5 [overflow-wrap:anywhere] text-[#272822] dark:text-[#F8F8F2]">{field.name}</div>
                        <select aria-label={`${field.name} · ${t('字段类型')}`} disabled={isImporting} value={field.type} onChange={e => changeType(index, e.target.value)}
                          className="block mt-2 w-full rounded-md bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] px-2 py-1 text-xs font-normal text-ink-pink focus:outline-none focus:border-[#66D9EF]">
                          <option value="text">{t('文本 (text)')}</option>
                          <option value="number">{t('数字 (number)')}</option>
                          <option value="date">{t('日期 (date)')}</option>
                          <option value="boolean">{t('布尔值 (boolean)')}</option>
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSheet.rows.slice(0, 20).map((row, index) => (
                    <tr key={index} className="even:bg-[#EFECE1]/40 dark:even:bg-[#1E1F1C]/40 hover:bg-[#A6E22E]/5 transition">
                      {activeSheet.fields.map(field => (
                        <td key={field.name} className="max-w-64 border-b border-r border-[#D6D4C8]/60 dark:border-[#3E3D32] px-3 py-1.5 align-top leading-5 [overflow-wrap:anywhere] text-ink-muted">
                          {String(row[field.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <footer className="shrink-0 px-4 sm:px-6 py-3 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 bg-[#FFFDF7] dark:bg-[#272822]">
          <button disabled={isImporting} onClick={() => confirmUploadDataset(false)}
            className="px-3.5 py-2 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 apple-font-mono transition">
            {t('仅导入数据（清空当前透视）')}
          </button>
          <button disabled={isImporting} onClick={() => confirmUploadDataset(true)}
            className="px-4 py-2 rounded-lg bg-action text-[#F8F8F2] text-xs font-semibold shadow-xs hover:opacity-90 apple-font-mono transition flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('确认导入并自动构建推荐透视')}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
