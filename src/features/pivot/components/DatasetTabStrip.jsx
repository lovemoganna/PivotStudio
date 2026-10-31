import { t } from '../../../i18n.js';
import React from 'react';
import { Database, Plus, X } from 'lucide-react';
import { ALL_BENCHMARK_PRESETS } from '../../../constants/benchmarkDatasets.js';

export function DatasetTabStrip({
  datasets,
  activeDatasetId,
  currentDataset,
  switchDataset,
  unloadDataset,
  onOpenIntro,
  pivotResult,
  isWorkerComputing,
  soundEngine,
}) {
  if (!datasets || datasets.length === 0) return null;

  const sourceLabel = !currentDataset
    ? t("未载入数据集")
    : ALL_BENCHMARK_PRESETS.some(preset => preset.id === currentDataset.id)
    ? t("内置演示数据")
    : currentDataset.id?.startsWith('ds_100k_')
    ? t("本地合成压测数据")
    : currentDataset.id?.startsWith('ds_google_')
    ? t("Google Sheets 公开数据")
    : t("本地导入文件");

  const filteredCount = (pivotResult?.filteredCount || 0).toLocaleString();
  const totalCount = (pivotResult?.totalCount || 0).toLocaleString();

  return (
    <nav aria-label={t("工作区数据集与状态")} className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/90 text-[11px] select-none">
      {/* Left Tabs Area */}
      <div data-testid="dataset-tabs" role="group" aria-label={t("工作区数据集:")} tabIndex={0} className="flex flex-1 items-center gap-1.5 min-w-0 overflow-x-auto py-0.5">
        <div className="flex items-center gap-1 text-[10px] text-ink-muted font-bold uppercase tracking-wider shrink-0 mr-1">
          <Database className="w-3.5 h-3.5 text-ink-cyan" />
          <span className="sr-only">{t("工作区数据集:")}</span>
        </div>

        {datasets.map((ds) => {
          const isActive = ds.id === activeDatasetId;
          return (
            <div
              key={ds.id}
              className={`group flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 border ${
                isActive
                  ? 'bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2] border-[#D6D4C8] dark:border-[#49483E]'
                  : 'border-transparent text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={`${t('打开数据集：')}${ds.name}`}
                className="truncate max-w-[140px] sm:max-w-[280px] lg:max-w-[360px] text-left rounded focus-visible:outline focus-visible:outline-2"
                title={ds.name}
                onClick={() => {
                  if (!isActive) {
                    soundEngine?.playClick?.(540);
                    switchDataset(ds.id, ds);
                  }
                }}
              >
                {ds.name}
              </button>
              <button
                type="button"
                aria-label={t("卸载该数据集")}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine?.playClick?.(480);
                  unloadDataset(ds.id);
                }}
                className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition"
                title={t("卸载该数据集")}
              >
                <X className="w-3 h-3 text-ink-muted hover:text-[#F92672]" />
              </button>
            </div>
          );
        })}

        {/* Return to Intro / Add Dataset */}
        <button
          type="button"
          aria-label={t("添加数据集或打开介绍主页")}
          onClick={() => {
            soundEngine?.playClick?.(520);
            onOpenIntro();
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-transparent hover:border-[#ACA99A] dark:border-[#49483E] text-ink-muted hover:text-ink-cyan hover:border-[#66D9EF] text-[10.5px] font-medium transition shrink-0 ml-1"
          title={t("切换至系统介绍主页，选择更多测试预设或上传文件")}
        >
          <Plus className="w-3.5 h-3.5 text-ink-cyan" />
          <span className="hidden sm:inline">{t("添加数据集")}</span>
          <span className="sm:hidden">{t("添加")}</span>
        </button>
      </div>

      {/* Source identity and filter scope; runtime timing belongs in diagnostics. */}
      <div data-testid="dataset-telemetry" className="flex items-center gap-2.5 shrink-0">
        <div
          role="status"
          className="flex items-center gap-1.5 text-[10px] text-ink-muted dark:text-[#B8B5A8] apple-font-mono"
        >
          <span className="hidden md:inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#66D9EF]" />
            <span className="truncate max-w-[160px] lg:max-w-[240px]" title={sourceLabel}>
              {sourceLabel} ·
            </span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-semibold text-ink-cyan border border-[#D6D4C8]/60 dark:border-[#3E3D32]">
            {filteredCount} / {totalCount} 行
          </span>
        </div>

        {isWorkerComputing && <span className="text-ink-cyan text-[10px]">{t("计算中…")}</span>}
      </div>
    </nav>
  );
}
