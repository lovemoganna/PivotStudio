import { t } from '../../../i18n.js';
import React from 'react';
import { Crosshair } from 'lucide-react';
import { buildAnalysisReading } from '../../../utils/analysisReading.js';

export function StatusBar({
  hoveredCellTelemetry,
  unifiedChartSpec,
  pivotConfig,
  pivotResult,
  duckdbThreshold,
  isWorkerComputing,
}) {
  const rowCount = pivotResult?.totalCount || 0;
  const showRowBadge = rowCount >= duckdbThreshold;
  const analysisReading = buildAnalysisReading(pivotConfig);

  return (
    <footer className="min-h-7 h-auto bg-[#EFECE1] dark:bg-[#191A17] border-t border-[#D6D4C8] dark:border-[#3E3D32] px-3 sm:px-4 py-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] shrink-0 print:hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 basis-[min(100%,18rem)]">
        <span className="inline-flex items-center gap-1 text-ink-pink font-bold shrink-0">
          <Crosshair className="w-3 h-3" />
          <span className="hidden xs:inline sm:inline">{t("当前焦点")}</span>
        </span>
        {hoveredCellTelemetry ? (
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <span className="text-[#272822] dark:text-ink-yellow font-semibold truncate">
              [{hoveredCellTelemetry.rowLabel} × {hoveredCellTelemetry.colLabel}]
            </span>
            <span className="text-ink-cyan font-bold shrink-0">
              {hoveredCellTelemetry.valLabel}: {hoveredCellTelemetry.formatted}
            </span>
            {hoveredCellTelemetry.hasAdditiveShares && (
              <span className="text-ink-muted hidden md:inline">
                {' ' + t("(占总计") + ' '}
                <strong className="text-ink-green">{hoveredCellTelemetry.pctGrand}%</strong>
                {' ' + t("· 占行") + ' '}
                <strong className="text-ink-purple">{hoveredCellTelemetry.pctRow}%</strong>
                {' ' + t("· 占列") + ' '}
                <strong className="text-ink-orange">{hoveredCellTelemetry.pctCol}%</strong>)
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-ink-muted min-w-0 flex-1">
            <span className="truncate" data-testid="overall-summary">
              {unifiedChartSpec.kpiCards?.[0] ? (
                <>
                  {t('总体结果：')}
                  {unifiedChartSpec.kpiCards[0].title}{' '}
                  <strong className="text-[#272822] dark:text-[#F8F8F2]">{unifiedChartSpec.kpiCards[0].formattedCurrent}</strong>
                </>
              ) : (
                t('添加指标后显示总体结果')
              )}
            </span>
            {analysisReading ? (
              <span
                className="truncate text-[9.5px] sm:text-[10px] text-[#57584B] dark:text-[#A8A89A] max-w-full sm:max-w-[42vw]"
                data-testid="analysis-reading"
                title={analysisReading}
              >
                {analysisReading}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isWorkerComputing && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66D9EF]/20 text-ink-cyan text-[9px] font-bold animate-pulse">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#66D9EF] animate-ping" />
            <span>{t("计算中…")}</span>
          </span>
        )}
        {showRowBadge && (
          <span className="px-1.5 py-0.2 rounded bg-[#A6E22E]/20 text-ink-green font-bold tabular-nums">
            {rowCount.toLocaleString()} {t("行")}
          </span>
        )}
        <span className="hidden lg:inline text-ink-muted">
          {t("快捷键")} <strong className="text-ink-pink">?</strong>
          {' · '}
          <strong className="text-ink-cyan">⌘K</strong> {t("指令")}
          {' · '}
          <strong className="text-ink-green">R</strong> {t("转置")}
        </span>
      </div>
    </footer>
  );
}
