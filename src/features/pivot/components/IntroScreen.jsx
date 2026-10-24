import { t } from '../../../i18n.js';
import React, { useState, useRef } from 'react';
import { useDialogFocus } from '../../../utils/useDialogFocus';
import { Upload, ShieldCheck, ClipboardPaste, FileSpreadsheet, X, Sparkles, TrendingUp, Cpu, Flame, Layers } from 'lucide-react';
import { ALL_BENCHMARK_PRESETS } from '../../../constants/benchmarkDatasets.js';

export function IntroScreen({
  onUploadFile,
  onLoadPresetDataset,
  onLoadRetailDataset,
  onGenerate100kDataset,
  onPasteText,
  uploadProgress,
  soundEngine,
  showToast,
  isReadOnly,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const pasteDialogRef = useDialogFocus(showPasteModal, () => setShowPasteModal(false));
  const [pasteInputText, setPasteInputText] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isReadOnly) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      soundEngine?.playClick?.(580);
      onUploadFile(file);
    }
  };

  const handleQuickPasteSubmit = () => {
    if (!pasteInputText.trim()) {
      showToast?.('粘贴内容为空，请输入有效的 CSV 或 TSV 表格文本', 'error');
      return;
    }
    soundEngine?.playClick?.(540);
    onPasteText?.(pasteInputText);
    setShowPasteModal(false);
    setPasteInputText('');
  };

  const handleClipboardRead = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          soundEngine?.playClick?.(560);
          onPasteText?.(text);
          showToast?.('已成功从系统剪贴板读取并解析表格数据');
          return;
        }
      }
    } catch {
      // Clipboard read failed or permission denied, open paste modal fallback
    }
    setShowPasteModal(true);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:py-10 max-w-3xl mx-auto w-full space-y-6 apple-font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xls,.xlsx"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            soundEngine?.playClick?.(580);
            onUploadFile(e);
          }
        }}
        className="hidden"
        disabled={isReadOnly}
      />

      <section data-testid="start-page" className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2]">{t('开始透视分析')}</h2>
          <p className="text-sm text-ink-muted">{t('导入表格，选择行、列与指标，开始分析。')}</p>
        </header>

        {/* Hero Dropzone */}
        <div
          role="button"
          tabIndex={isReadOnly ? -1 : 0}
          aria-disabled={isReadOnly}
          aria-label={t('选择本地文件')}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              if (!isReadOnly) fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isReadOnly) fileInputRef.current?.click();
          }}
          className={`relative group px-6 py-8 sm:py-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all duration-300 ${
            isDragOver
              ? 'border-[#F92672] bg-[#F92672]/10 scale-[1.01] shadow-2xl shadow-pink-500/10'
              : 'border-[#ACA99A] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#66D9EF] hover:shadow-xl hover:shadow-cyan-500/5'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F92672]/20 to-[#66D9EF]/20 border border-white/20 dark:border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
            <Upload aria-hidden="true" className="w-6 h-6 text-ink-pink" />
          </div>
          <p className="text-base font-semibold text-[#272822] dark:text-[#F8F8F2]">{t('选择 CSV / Excel 文件')}</p>
          <p className="text-sm text-ink-muted mt-2">{t('或将文件拖到这里')}</p>
          <p className="text-xs text-ink-muted mt-3">CSV · TSV · TXT · XLSX · XLS</p>
          {uploadProgress && (
            <p role="status" className="text-sm text-ink-cyan mt-3 [overflow-wrap:anywhere] apple-font-mono font-medium">
              {uploadProgress.fileName} · {uploadProgress.pct}%
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={handleClipboardRead}
            className="tactile-btn flex items-center justify-center gap-2.5 rounded-xl border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-4 py-3 text-sm hover:border-[#FD971F] hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <ClipboardPaste aria-hidden="true" className="w-4 h-4 text-ink-orange" />
            <span>{t('粘贴剪贴板数据 (TSV / CSV)')}</span>
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => onLoadRetailDataset?.()}
            className="tactile-btn flex items-center justify-center gap-2.5 rounded-xl border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-4 py-3 text-sm hover:border-[#A6E22E] hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <FileSpreadsheet aria-hidden="true" className="w-4 h-4 text-ink-green" />
            <span>{t('加载示例数据')}</span>
          </button>
        </div>

        {/* Privacy & Engine Guarantee */}
        <p className="flex items-start gap-2 text-xs text-ink-muted leading-5">
          <ShieldCheck aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-ink-green" />
          <span>{t('文件解析与计算均在浏览器本地执行，原始数据不上传服务器。')}</span>
        </p>

        {/* Presets Gallery Accordion */}
        <details className="border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-3 text-sm">
          <summary className="cursor-pointer text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] transition">{t('更多示例')}</summary>
          <div className="mt-2 space-y-1">
            {ALL_BENCHMARK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  soundEngine?.playPop?.();
                  if (onLoadPresetDataset) onLoadPresetDataset(preset);
                  else onLoadRetailDataset?.();
                }}
                className="tactile-btn block w-full text-left rounded-md px-3 py-2 leading-5 hover:bg-black/5 dark:hover:bg-white/5 [overflow-wrap:anywhere]"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </details>
      </section>

      {/* Quick Paste Modal */}
      {showPasteModal && (
        <div
          role="presentation"
          onClick={() => setShowPasteModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-apple-fade-in"
        >
          <div
            ref={pasteDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t('快速粘贴表格数据')}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-apple-modal apple-font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-ink-orange" />
                <span className="font-bold text-sm text-[#272822] dark:text-[#F8F8F2]">{' ' + t('快速粘贴表格文本 (TSV / CSV)') + ' '}</span>
              </div>
              <button
                type="button"
                aria-label={t('关闭粘贴弹窗')}
                onClick={() => setShowPasteModal(false)}
                className="p-1 rounded text-ink-muted hover:text-[#F92672] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-ink-muted">{' ' + t('请将从 Excel、Google Sheets 或文本文件中复制的表格文本粘贴到下方文本框中：') + ' '}</label>
              <textarea
                aria-label={t('粘贴的表格文本')}
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
                placeholder={t('订单日期\t销售大区\t商品类别\t销售额\n2025-01-01\t华东\t智能数码\t35800')}
                rows={8}
                className="w-full p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-xs apple-font-mono focus:outline-none focus:border-[#66D9EF]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition"
              >
                {' ' + t('取消') + ' '}
              </button>
              <button
                type="button"
                disabled={!pasteInputText.trim()}
                onClick={handleQuickPasteSubmit}
                className="px-4 py-2 rounded-xl bg-[#A6E22E] hover:bg-[#B8F03E] text-[#1E1F1C] text-xs font-bold transition disabled:opacity-40"
              >
                {' ' + t('解析并导入为数据集') + ' '}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
