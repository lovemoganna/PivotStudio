import { t, getLocale } from '../../../i18n.js';
import React from 'react';
import { Crosshair } from 'lucide-react';
import { getDimDisplayLabel } from '../../../utils/formatters';

function joinLabels(labels) {
  return labels.join(getLocale() === 'en' ? ', ' : '、');
}

function buildAnalysisReading(pivotConfig) {
  if (!pivotConfig) return '';
  const rows = (pivotConfig.rows || []).map(getDimDisplayLabel).filter(Boolean);
  const cols = (pivotConfig.columns || []).map(getDimDisplayLabel).filter(Boolean);
  const vals = (pivotConfig.values || [])
    .map((v) => (v.field === '__COUNT__' ? t('记录数') : v.field))
    .filter(Boolean);
  const filters = (pivotConfig.filters || []).map((f) => f.field).filter(Boolean);
  if (!rows.length && !cols.length && !vals.length) return '';

  const parts = [];
  if (rows.length) parts.push(t('按「{0}」分行').replace('{0}', rows.join(' / ')));
  if (cols.length) parts.push(t('按「{0}」分列').replace('{0}', cols.join(' / ')));
  if (vals.length) parts.push(t('汇总「{0}」').replace('{0}', joinLabels(vals)));
  if (filters.length) parts.push(t('已筛选「{0}」').replace('{0}', joinLabels(filters)));
  return parts.join(' · ');
}

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
    <footer className="h-7 bg-[#EFECE1] dark:bg-[#191A17] border-t border-[#D6D4C8] dark:border-[#3E3D32] px-4 flex items-center justify-between gap-4 text-[10px] shrink-0 print:hidden">
      <div className="flex items-center gap-3 min-w-0 truncate">
        <span className="inline-flex items-center gap-1 text-ink-pink font-bold shrink-0">
          <Crosshair className="w-3 h-3" />
          <span>{t("当前焦点")}</span>
        </span>
        {hoveredCellTelemetry ? (
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-[#272822] dark:text-ink-yellow font-semibold truncate">
              [{hoveredCellTelemetry.rowLabel} × {hoveredCellTelemetry.colLabel}]
            </span>
            <span className="text-ink-cyan font-bold">
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
          <div className="flex items-center gap-3 text-ink-muted truncate min-w-0">
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
                className="hidden md:inline truncate max-w-[42vw]"
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
