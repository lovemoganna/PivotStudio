import { t } from '../../../i18n.js';
import React, { useState, useRef } from 'react';
import { useDialogFocus } from '../../../utils/useDialogFocus';
import {
  Upload,
  FileSpreadsheet,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  ClipboardPaste,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  FlaskConical,
  X,
  TrendingUp,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import { ALL_BENCHMARK_PRESETS } from '../../../constants/benchmarkDatasets.js';

export function IntroScreen({
  onUploadFile,
  onLoadPresetDataset,
  onLoadRetailDataset,
  onGenerate100kDataset,
  onOpenTestSuite,
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
  const [isGenerating, setIsGenerating] = useState(false);
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

  const getPresetIcon = (id) => {
    if (id.includes('retail')) return <FileSpreadsheet className="w-4 h-4" />;
    if (id.includes('saas')) return <Briefcase className="w-4 h-4" />;
    if (id.includes('financial')) return <TrendingUp className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getPresetColor = (id) => {
    if (id.includes('retail')) return 'text-ink-cyan bg-[#66D9EF]/15 border-[#66D9EF]/30 hover:border-[#66D9EF]';
    if (id.includes('saas')) return 'text-ink-green bg-[#A6E22E]/15 border-[#A6E22E]/30 hover:border-[#A6E22E]';
    if (id.includes('financial')) return 'text-ink-orange bg-[#FD971F]/15 border-[#FD971F]/30 hover:border-[#FD971F]';
    return 'text-ink-purple bg-[#AE81FF]/15 border-[#AE81FF]/30 hover:border-[#AE81FF]';
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:py-10 max-w-6xl mx-auto w-full space-y-8 animate-apple-stage apple-font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.xls,.xlsx"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            soundEngine?.playClick?.(580);
            onUploadFile(e);
          }
        }}
        className="hidden"
        disabled={isReadOnly}
      />

      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] text-ink-muted dark:text-ink-yellow apple-font-mono shadow-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-[#66D9EF] animate-pulse" />
          <span>SYSTEM READY</span>
          <span className="text-[#D6D4C8] dark:text-[#49483E]">|</span>
          <span className="text-ink-green">{t("纯前端本地沙箱引擎")}</span>
          <span className="text-[#D6D4C8] dark:text-[#49483E]">|</span>
          <span>{t("零数据上报")}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#272822] dark:text-[#F8F8F2] apple-font-mono">
          PivotEngine <span className="text-ink-pink">Studio</span>
        </h1>

        <p className="text-xs sm:text-sm text-ink-muted dark:text-[#B8B5A8] leading-relaxed">{' ' + t("现代化全功能前端数据透视工作台 · 专为海量数据探索、多维度交叉汇总、动态层级折叠与交互可视化看板而生。") + ' '}<br className="hidden sm:inline" />{' ' + t("当前系统处于")}<span className="font-semibold text-ink-cyan">{t("「空白就绪状态」")}</span>{t("，您可以载入多样化测试场景或导入业务文件全面检验系统稳定性。") + ' '}</p>
      </div>

      {/* Main Drag-and-Drop Zone & Quick Gateway */}
      <button type="button" onClick={() => onLoadRetailDataset?.()} className="px-4 py-2 rounded-lg bg-[#A6E22E] text-[#1E1F1C] font-semibold mb-3">{t('加载示例数据')}</button>
        <div
        role="button"
        tabIndex={isReadOnly ? -1 : 0}
        aria-disabled={isReadOnly}
        aria-label={t("选择本地文件")}
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
        className={`group relative p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center apple-specular-card ${
          isDragOver
            ? 'border-[#F92672] bg-[#F92672]/10 scale-[1.008]'
            : 'border-[#ACA99A] dark:border-[#49483E] bg-[#FFFDF7]/85 dark:bg-[#272822]/85 hover:border-[#66D9EF] dark:hover:border-[#66D9EF]'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-center text-ink-pink group-hover:scale-110 group-hover:text-[#66D9EF] transition">
            <Upload className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="text-base font-bold text-[#272822] dark:text-[#F8F8F2] flex items-center justify-center gap-2">
              <span>{t("点击选择文件 或 将表格文件拖拽至此处")}</span>
              <ArrowRight className="w-4 h-4 text-ink-muted group-hover:translate-x-1 transition" />
            </div>
            <p className="text-xs text-ink-muted apple-font-mono">{' ' + t("支持 .xlsx、.xls (多 Sheet 智能识别) · .csv、.txt (逗号/分号/Tab 制表符自适应)") + ' '}</p>
          </div>

          <div className="inline-flex items-center gap-2 text-[10px] text-ink-green bg-[#A6E22E]/10 border border-[#A6E22E]/30 px-3 py-1 rounded-full apple-font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("文件解析与计算均在浏览器本地执行，原始数据不上传服务器。")}</span>
          </div>

          {uploadProgress && (
            <div className="ps-dark-surface w-full max-w-sm mt-3 p-2.5 rounded-xl bg-[#1E1F1C] border border-[#3E3D32] space-y-1.5 apple-font-mono text-left">
              <div className="flex justify-between text-[10px] text-ink-cyan">
                <span>{t("正在流式切片解析:") + ' '}{uploadProgress.fileName}</span>
                <span>{uploadProgress.pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#272822] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#A6E22E] transition-all"
                  style={{ width: `${uploadProgress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-scenario Benchmark Matrix (举一反三多维测试集矩阵) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs apple-font-mono">
          <span className="font-bold text-ink-cyan flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-ink-yellow" />{' ' + t("内置演示数据集 (Benchmark Suite)") + ' '}</span>
          <span className="text-ink-muted">{t("点击任意场景即刻载入，验证多维度交叉与边界容错")}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALL_BENCHMARK_PRESETS.map((preset) => {
            const colorCls = getPresetColor(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  soundEngine?.playClick?.(540);
                  if (onLoadPresetDataset) {
                    onLoadPresetDataset(preset);
                  } else if (onLoadRetailDataset) {
                    onLoadRetailDataset();
                  }
                }}
                className={`p-4 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] text-left space-y-2.5 apple-specular-card apple-transition group disabled:opacity-50 hover:border-current ${colorCls}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    {getPresetIcon(preset.id)}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-bold apple-font-mono">
                    {preset.tag || `${preset.rows.length}行`}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#272822] dark:text-[#F8F8F2] group-hover:text-inherit transition">
                    {preset.name.replace(/^[\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27FF\uFE00-\uFE0F]\s*/, '')}
                  </div>
                  <p className="text-[10.5px] text-ink-muted mt-1 leading-snug">
                    {preset.description || '多维业务数据，即刻验证行/列交叉折叠与小计。'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extreme Stress & Advanced Tools Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs apple-font-mono">
          <span className="font-bold text-ink-green flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-ink-green" />{' ' + t("极限负载与外部数据输入工具") + ' '}</span>
          <span className="text-ink-muted">{t("压测虚拟滚动、Worker 线程与剪贴板")}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: 100k Rows Stress Test */}
          <button
            type="button"
            disabled={isReadOnly || isGenerating}
            onClick={() => {
              setIsGenerating(true);
              soundEngine?.playClick?.(580);
              setTimeout(() => {
                onGenerate100kDataset(100000);
                setIsGenerating(false);
              }, 60);
            }}
            className="p-4 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#A6E22E] text-left space-y-2 apple-specular-card apple-transition group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#A6E22E]/15 border border-[#A6E22E]/30 text-ink-green flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#A6E22E]/15 text-ink-green apple-font-mono">{' ' + t("100,000 Rows 压测") + ' '}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#272822] dark:text-[#F8F8F2] group-hover:text-[#A6E22E] transition">{' ' + t("生成 10万行极限压测数据") + ' '}</div>
              <p className="text-[10.5px] text-ink-muted mt-1 leading-snug">{' ' + t("验证大规模并发计算下 Web Worker 异步管线、虚拟滚动 60fps 帧率与内存稳定性。") + ' '}</p>
            </div>
          </button>

          {/* Card 2: Clipboard Paste */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={handleClipboardRead}
            className="p-4 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#FD971F] text-left space-y-2 apple-specular-card apple-transition group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#FD971F]/15 border border-[#FD971F]/30 text-ink-orange flex items-center justify-center">
                <ClipboardPaste className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#FD971F]/15 text-ink-orange apple-font-mono">{' ' + t("剪贴板直接读入") + ' '}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#272822] dark:text-[#F8F8F2] group-hover:text-[#FD971F] transition">{' ' + t("粘贴剪贴板数据 (TSV / CSV)") + ' '}</div>
              <p className="text-[10.5px] text-ink-muted mt-1 leading-snug">{' ' + t("直接从 Excel 或网页复制任意表格单元格并粘贴，系统自动识别表头与数据类型。") + ' '}</p>
            </div>
          </button>

          {/* Card 3: Run In-App Test Suite */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick?.(500);
              onOpenTestSuite();
            }}
            className="p-4 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#AE81FF] text-left space-y-2 apple-specular-card apple-transition group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#AE81FF]/15 border border-[#AE81FF]/30 text-ink-purple flex items-center justify-center">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#AE81FF]/15 text-ink-purple apple-font-mono">{' ' + t("5 组示例校验") + ' '}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#272822] dark:text-[#F8F8F2] group-hover:text-[#AE81FF] transition">{' ' + t("系统内核算法自检") + ' '}</div>
              <p className="text-[10.5px] text-ink-muted mt-1 leading-snug">{' ' + t("查看 5 组内置示例的计算校验结果；完整验收请运行自动化测试。") + ' '}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Stability Architecture & Guarantees Showcase */}
      <div className="p-6 rounded-2xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7]/60 dark:bg-[#272822]/60 space-y-4 apple-specular-card">
        <div className="flex items-center justify-between border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-ink-green" />
            <span className="font-bold text-xs apple-font-mono text-[#272822] dark:text-[#F8F8F2]">{' ' + t("本地处理与异常恢复") + ' '}</span>
          </div>
          <span className="text-[10px] text-ink-muted apple-font-mono">Zero Crash Architecture</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <div className="font-bold text-ink-cyan flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("内存与垃圾回收优化")}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{' ' + t("按分组建立内存索引；数据量与分组基数共同决定内存占用，超出保护限额时会提示。") + ' '}</p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-ink-green flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("字段失效自愈守卫")}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{' ' + t("字段缺失时会提示并跳过失效字段；请核对数据结构，必要时重置透视配置。") + ' '}</p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-ink-orange flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("Web Worker 异步解耦")}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{' ' + t("文件解析、透视聚合和字段统计在 Web Worker 运行；导入与计算显示进度，并可取消。") + ' '}</p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-ink-purple flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t("Excel / CSV 全量结果导出")}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{' ' + t("导出完整筛选、排序后的结果并保留数字格式；Excel 使用平铺表头。") + ' '}</p>
          </div>
        </div>
      </div>

      {/* Diagnostics Status Footer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px] text-ink-muted dark:text-[#B8B5A8] apple-font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A6E22E]" />{' ' + t("Web Worker: 就绪") + ' '}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A6E22E]" />{' ' + t("虚拟滚动: 激活") + ' '}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A6E22E]" />{' ' + t("自愈守卫: 运行中") + ' '}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#66D9EF]" />{' ' + t("原始数据在本机处理，不上传服务器") + ' '}</span>
        </div>
        <div>
          <span>PivotWorkbench v1.0 · Monokai Pro Edition</span>
        </div>
      </div>

      {/* Quick Paste Modal */}
      {showPasteModal && (
        <div
          role="presentation"
          onClick={() => setShowPasteModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-apple-fade-in"
        >
          <div
            ref={pasteDialogRef} tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t("快速粘贴表格数据")}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-apple-modal apple-font-sans"
          >
            <div className="flex items-center justify-between border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-ink-orange" />
                <span className="font-bold text-sm text-[#272822] dark:text-[#F8F8F2]">{' ' + t("快速粘贴表格文本 (TSV / CSV)") + ' '}</span>
              </div>
              <button
                type="button"
                aria-label={t("关闭粘贴弹窗")}
                onClick={() => setShowPasteModal(false)}
                className="p-1 rounded text-ink-muted hover:text-[#F92672] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-ink-muted">{' ' + t("请将从 Excel、Google Sheets 或文本文件中复制的表格文本粘贴到下方文本框中：") + ' '}</label>
              <textarea
                aria-label={t("粘贴的表格文本")}
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
                placeholder={t("订单日期\t销售大区\t商品类别\t销售额\n2025-01-01\t华东\t智能数码\t35800")}
                rows={8}
                className="w-full p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-xs apple-font-mono focus:outline-none focus:border-[#66D9EF]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition"
              >{' ' + t("取消") + ' '}</button>
              <button
                type="button"
                disabled={!pasteInputText.trim()}
                onClick={handleQuickPasteSubmit}
                className="px-4 py-2 rounded-xl bg-[#A6E22E] hover:bg-[#B8F03E] text-[#1E1F1C] text-xs font-bold transition disabled:opacity-40"
              >{' ' + t("解析并导入为数据集") + ' '}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
