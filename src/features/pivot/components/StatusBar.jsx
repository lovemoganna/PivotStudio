import React from 'react';
import { Crosshair } from 'lucide-react';
import { UnifiedFormatter } from '../../../utils/formatters';

export function StatusBar({
  hoveredCellTelemetry,
  unifiedChartSpec,
  splitRatioPct,
  pivotResult,
  duckdbThreshold,
  isWorkerComputing,
}) {
  return (
    <footer className="h-7 bg-[#EFECE1] dark:bg-[#191A17] border-t border-[#D6D4C8] dark:border-[#3E3D32] px-4 flex items-center justify-between gap-4 text-[10px] apple-font-mono shrink-0 print:hidden">
      <div className="flex items-center gap-3 min-w-0 truncate">
        <span className="inline-flex items-center gap-1 text-[#F92672] font-bold shrink-0">
          <Crosshair className="w-3 h-3" />
          <span>分析指标</span>
        </span>
        {hoveredCellTelemetry ? (
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-[#272822] dark:text-[#E6DB74] font-semibold truncate">
              [{hoveredCellTelemetry.rowLabel} × {hoveredCellTelemetry.colLabel}]
            </span>
            <span className="text-[#0088A3] dark:text-[#66D9EF] font-bold">
              {hoveredCellTelemetry.valLabel}: {hoveredCellTelemetry.formatted}
            </span>
            <span className="text-[#75715E] dark:text-[#908E80] hidden md:inline">
              (占总计 <strong className="text-[#4A7500] dark:text-[#A6E22E]">{hoveredCellTelemetry.pctGrand}%</strong> · 占行 <strong className="text-[#6B38FB] dark:text-[#AE81FF]">{hoveredCellTelemetry.pctRow}%</strong> · 占列 <strong className="text-[#C86400] dark:text-[#FD971F]">{hoveredCellTelemetry.pctCol}%</strong>)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[#75715E] dark:text-[#908E80] truncate">
            <span>
              总和: <strong className="text-[#272822] dark:text-[#F8F8F2]">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span>
              均值: <strong className="text-[#C86400] dark:text-[#FD971F]">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span className="hidden sm:inline">
              最大: <strong className="text-[#4A7500] dark:text-[#A6E22E]">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.max, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span className="hidden md:inline">
              分栏: <strong className="text-[#0088A3] dark:text-[#66D9EF]">{splitRatioPct}:{100 - splitRatioPct}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isWorkerComputing && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF] text-[9px] font-bold animate-pulse apple-font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#66D9EF] animate-ping" />
            <span>Worker 异步计算中…</span>
          </span>
        )}
        {pivotResult.totalCount >= duckdbThreshold && (
          <span className="px-1.5 py-0.2 rounded bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E] font-bold">
            JS_LOCAL: {pivotResult.totalCount.toLocaleString()} ROWS
          </span>
        )}
        <span className="hidden lg:inline text-[#75715E] dark:text-[#908E80]">
          KEYS: <strong className="text-[#F92672]">⌘K</strong> 指令 · <strong className="text-[#66D9EF]">R</strong> 转置 · <strong className="text-[#A6E22E]">T</strong> 剧院 · <strong className="text-[#E6DB74]">[ / ]</strong> 切镜
        </span>
      </div>
    </footer>
  );
}
