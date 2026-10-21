import { t } from '../../../i18n.js';
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
        <span className="inline-flex items-center gap-1 text-ink-pink font-bold shrink-0">
          <Crosshair className="w-3 h-3" />
          <span>{t("分析指标")}</span>
        </span>
        {hoveredCellTelemetry ? (
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-[#272822] dark:text-ink-yellow font-semibold truncate">
              [{hoveredCellTelemetry.rowLabel} × {hoveredCellTelemetry.colLabel}]
            </span>
            <span className="text-ink-cyan font-bold">
              {hoveredCellTelemetry.valLabel}: {hoveredCellTelemetry.formatted}
            </span>
            <span className="text-ink-muted hidden md:inline">{' ' + t("(占总计") + ' '}<strong className="text-ink-green">{hoveredCellTelemetry.pctGrand}%</strong>{' ' + t("· 占行") + ' '}<strong className="text-ink-purple">{hoveredCellTelemetry.pctRow}%</strong>{' ' + t("· 占列") + ' '}<strong className="text-ink-orange">{hoveredCellTelemetry.pctCol}%</strong>)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-ink-muted truncate">
            <span>{' ' + t("总和:") + ' '}<strong className="text-[#272822] dark:text-[#F8F8F2]">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span>{' ' + t("均值:") + ' '}<strong className="text-ink-orange">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span className="hidden sm:inline">{' ' + t("最大:") + ' '}<strong className="text-ink-green">{UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.max, unifiedChartSpec.primaryValCfg, { compact: true })}</strong>
            </span>
            <span className="hidden md:inline">{' ' + t("分栏:") + ' '}<strong className="text-ink-cyan">{splitRatioPct}:{100 - splitRatioPct}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isWorkerComputing && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66D9EF]/20 text-ink-cyan text-[9px] font-bold animate-pulse apple-font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#66D9EF] animate-ping" />
            <span>{t("Worker 异步计算中…")}</span>
          </span>
        )}
        {pivotResult.totalCount >= duckdbThreshold && (
          <span className="px-1.5 py-0.2 rounded bg-[#A6E22E]/20 text-ink-green font-bold">
            JS_LOCAL: {pivotResult.totalCount.toLocaleString()} ROWS
          </span>
        )}
        <span className="hidden lg:inline text-ink-muted">
          KEYS: <strong className="text-ink-pink">⌘K</strong>{' ' + t("指令 ·") + ' '}<strong className="text-ink-cyan">R</strong>{' ' + t("转置 ·") + ' '}<strong className="text-ink-green">T</strong>{' ' + t("剧院 ·") + ' '}<strong className="text-ink-yellow">[ / ]</strong>{' ' + t("切镜") + ' '}</span>
      </div>
    </footer>
  );
}
