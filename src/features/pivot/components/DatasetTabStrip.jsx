import { t } from '../../../i18n.js';
import React from 'react';
import { Database, Plus, X, Zap, Activity } from 'lucide-react';

export function DatasetTabStrip({
  datasets,
  activeDatasetId,
  switchDataset,
  unloadDataset,
  onOpenIntro,
  pivotResult,
  isWorkerComputing,
  soundEngine,
}) {
  if (!datasets || datasets.length === 0) return null;

  const elapsed = pivotResult?.elapsedMs || 1;
  const isUltraFast = elapsed < 30;
  const isHealthy = elapsed < 150;

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/90 text-[11px] apple-font-mono select-none overflow-x-auto scrollbar-none">
      {/* Left Tabs Area */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-1 text-[10px] text-[#75715E] dark:text-[#908E80] font-bold uppercase tracking-wider shrink-0 mr-1">
          <Database className="w-3.5 h-3.5 text-[#66D9EF]" />
          <span className="hidden sm:inline">{t("工作区数据集:")}</span>
        </div>

        {datasets.map((ds) => {
          const isActive = ds.id === activeDatasetId;
          return (
            <div
              key={ds.id}
              onClick={() => {
                if (!isActive) {
                  soundEngine?.playClick?.(540);
                  switchDataset(ds.id, ds);
                }
              }}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition shrink-0 ${
                isActive
                  ? 'bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2] border border-[#D6D4C8] dark:border-[#49483E] shadow-xs'
                  : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#A6E22E]' : 'bg-[#75715E]/50'}`} />
              <span className="truncate max-w-[160px] sm:max-w-[220px]" title={ds.name}>
                {ds.name}
              </span>
              <span className="text-[9.5px] opacity-60">
                ({(ds.rows?.length || 0).toLocaleString()}{t("行)") + ' '}</span>

              <button
                type="button"
                aria-label={t("卸载该数据集")}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine?.playClick?.(480);
                  unloadDataset(ds.id);
                }}
                className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-40 group-hover:opacity-100 transition"
                title={t("卸载该数据集")}
              >
                <X className="w-3 h-3 text-[#75715E] hover:text-[#F92672]" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          aria-label={t("添加数据集或打开介绍主页")}
          onClick={() => {
            soundEngine?.playClick?.(520);
            onOpenIntro();
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-[#ACA99A] dark:border-[#49483E] text-[#66D9EF] hover:border-[#66D9EF] text-[10.5px] font-medium transition shrink-0"
          title={t("切换至系统介绍主页，选择更多测试预设或上传文件")}
        >
          <Plus className="w-3 h-3" />
          <span>{t("添加 / 介绍主页")}</span>
        </button>
      </div>

      {/* Right Performance Telemetry Pill */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] apple-font-mono ${
            isWorkerComputing
              ? 'bg-[#66D9EF]/15 border-[#66D9EF]/40 text-[#0088A3] dark:text-[#66D9EF] animate-pulse'
              : isUltraFast
              ? 'bg-[#A6E22E]/10 border-[#A6E22E]/30 text-[#4A7500] dark:text-[#A6E22E]'
              : isHealthy
              ? 'bg-[#E6DB74]/15 border-[#E6DB74]/40 text-[#948400] dark:text-[#E6DB74]'
              : 'bg-[#FD971F]/15 border-[#FD971F]/40 text-[#C86400] dark:text-[#FD971F]'
          }`}
          title={t("透视计算管线实时性能遥测")}
        >
          <Zap className="w-3 h-3" />
          <span>
            {isWorkerComputing
              ? t("Worker 异步聚合中...")
              : `${elapsed}ms`}
          </span>
          <span className="text-[#D6D4C8] dark:text-[#49483E]">|</span>
          <span>{pivotResult?.filteredCount?.toLocaleString() || 0}{' ' + t("行就绪")}</span>
        </div>
      </div>
    </div>
  );
}
