import { t } from '../../../i18n.js';
import React from 'react';
import { UnifiedFormatter } from '../../../utils/formatters';

export function UnifiedChartTooltip({ active, payload, label, chartSpec, darkMode, clickLinkMode = 'drill' }) {
  if (!active || !payload || payload.length === 0) return null;
  const primaryValCfg = chartSpec?.primaryValCfg;
  const secondaryValCfg = chartSpec?.secondaryValCfg || primaryValCfg;
  const rawPoint = payload[0]?.payload;
  const chartType = chartSpec?.chartType;
  const isGrandTotalNode = rawPoint?.rowKey === '__GRAND_TOTAL_ROW__';
  const actionBadgeText = chartType === 'histogram'
    ? t("区间分布")
    : (isGrandTotalNode && clickLinkMode === 'filter')
      ? t("点击看明细")
      : clickLinkMode === 'filter'
        ? t("点击筛选")
        : t("点击看明细");

  const primaryVal = rawPoint && chartSpec?.primarySeriesKey
    ? (rawPoint._rawSeriesValues?.[chartSpec.primarySeriesKey] ?? rawPoint[chartSpec.primarySeriesKey])
    : null;
  const primaryTotal = chartSpec?.primaryStats?.total || 0;
  const primaryMean = chartSpec?.primaryStats?.mean || 0;
  const showShareOfTotal = !chartSpec?.isPercentMode
    && chartSpec?.isPrimaryAdditive
    && primaryTotal > 0
    && typeof primaryVal === 'number'
    && primaryVal >= 0
    && (chartSpec?.primaryStats?.validCount || 0) > 1;
  const sharePctText = showShareOfTotal ? `${((primaryVal / primaryTotal) * 100).toFixed(1)}%` : null;

  const showMeanDiff = !chartSpec?.isPercentMode
    && typeof primaryVal === 'number'
    && Math.abs(primaryMean) > 1e-9
    && (chartSpec?.primaryStats?.validCount || 0) > 1;
  const meanDiffPct = showMeanDiff ? ((primaryVal - primaryMean) / Math.abs(primaryMean)) * 100 : 0;

  return (
    <div className={`p-3.5 rounded-xl shadow-2xl border text-xs max-w-xs transition-all ${darkMode ? 'bg-[#1E1F1C]/95 text-[#F8F8F2] border-[#49483E] shadow-[0_12px_32px_rgba(0,0,0,0.65)]' : 'bg-[#FFFDF7]/95 text-[#272822] border-[#D6D4C8] shadow-xl'} backdrop-blur-xl`}>
      <div className="font-semibold tracking-tight border-b border-[#49483E]/40 pb-1.5 mb-2 truncate flex items-center justify-between gap-3">
        <span className="truncate text-ink-yellow apple-font-mono">{rawPoint?.name || label}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F92672]/15 text-ink-pink border border-[#F92672]/30 apple-font-mono shrink-0">{actionBadgeText}</span>
      </div>

      {chartType === 'scatter' && rawPoint ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted truncate">{chartSpec?.primarySeriesKey} [X]:</span>
            <span className="apple-font-mono font-semibold text-ink-cyan">
              {UnifiedFormatter.formatValue(rawPoint.x, primaryValCfg, { compact: false })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted truncate">{chartSpec?.secondarySeriesKey} [Y]:</span>
            <span className="apple-font-mono font-semibold text-ink-green">
              {UnifiedFormatter.formatValue(rawPoint.y, secondaryValCfg, { compact: false })}
            </span>
          </div>
          {rawPoint.expectedY && (
            <div className="flex items-center justify-between gap-4 text-[11px] border-t border-[#49483E]/30 pt-1">
              <span className="text-ink-muted">{t("OLS 回归预期:")}</span>
              <span className="apple-font-mono text-ink-purple">
                {UnifiedFormatter.formatValue(Number(rawPoint.expectedY), secondaryValCfg, { compact: false })}
              </span>
            </div>
          )}
          {rawPoint.isOutlier && (
            <div className="mt-1 px-2 py-1 rounded bg-[#F92672]/15 text-ink-pink border border-[#F92672]/30 text-[10px] font-semibold apple-font-mono">{' ' + t("[异常点] Z-Score =") + ' '}{rawPoint.zScore}{' ' + t("(偏离拟合线)") + ' '}</div>
          )}
        </div>
      ) : chartType === 'waterfall' && rawPoint?.semanticType ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("节点类型:")}</span>
            <span className="font-medium text-ink-cyan">{rawPoint.semanticType}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("当期变化量:")}</span>
            <span className="apple-font-mono font-semibold text-ink-green">{rawPoint.formattedDelta}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("累计总额:")}</span>
            <span className="apple-font-mono font-bold text-ink-purple">{rawPoint.formattedCumulative}</span>
          </div>
        </div>
      ) : chartType === 'histogram' && rawPoint?.rangeFull ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("数值分箱区间:")}</span>
            <span className="apple-font-mono font-medium text-ink-cyan">{rawPoint.rangeFull}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("样本频数:")}</span>
            <span className="apple-font-mono font-semibold text-ink-green">{rawPoint.count}{' ' + t("笔")}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-muted">{t("占总样本比:")}</span>
            <span className="apple-font-mono font-bold text-ink-pink">{rawPoint.pct}%</span>
          </div>
        </div>
      ) : (chartType === 'pie' || chartType === 'donut') && payload[0] ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: payload[0].payload?.fill || payload[0].fill || '#F92672' }} />
              <span className="text-ink-muted truncate">{payload[0].name}:</span>
            </div>
            <span className="apple-font-mono font-semibold">
              {UnifiedFormatter.formatValue(payload[0].value, primaryValCfg, { compact: false })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[#49483E]/30 pt-1">
            <span className="text-ink-muted">{t("占图中分组合计:")}</span>
            <span className="apple-font-mono font-bold text-ink-green">
              {rawPoint?.pct || ((payload[0].value / (chartSpec?.primaryStats?.total || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {payload.map((item, idx) => {
            const val = item.value;
            const seriesKey = item.name || item.dataKey;
            const isDerivedMom = String(seriesKey || '').includes('环比(%)');
            const meta = chartSpec?.seriesMetaList?.find((sm) => sm.key === seriesKey || sm.key === item.dataKey);
            const targetValCfg = meta?.valCfg || primaryValCfg;

            let formatted = '-';
            if (typeof val === 'number') {
              if (chartSpec?.isPercentMode || isDerivedMom) {
                formatted = `${val.toFixed(1)}%`;
              } else {
                formatted = UnifiedFormatter.formatValue(val, targetValCfg, { compact: false });
              }
            } else if (Array.isArray(val)) {
              formatted = `${UnifiedFormatter.formatValue(val[1] - val[0], targetValCfg, { compact: false })}`;
            } else if (val !== null && val !== undefined) {
              formatted = String(val);
            }

            return (
              <div key={`tip_${idx}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color || item.fill || '#F92672' }} />
                  <span className="text-ink-muted truncate">{seriesKey}:</span>
                </div>
                <span className="apple-font-mono font-semibold">{formatted}</span>
              </div>
            );
          })}
          {rawPoint?._stackTotalFormatted && chartSpec?.canStack && chartSpec?.seriesMetaList?.length > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-[#49483E]/40 pt-1.5 mt-1.5 font-semibold">
              <span className="text-ink-muted">{t("合计总额:")}</span>
              <span className="apple-font-mono text-ink-green">{rawPoint._stackTotalFormatted}</span>
            </div>
          )}
          {(sharePctText || showMeanDiff) && (
            <div className="border-t border-[#49483E]/30 pt-1.5 mt-1.5 space-y-1 text-[11px]">
              {sharePctText && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink-muted">{t("占图中分组合计:")}</span>
                  <span className="apple-font-mono font-semibold text-ink-cyan">{sharePctText}</span>
                </div>
              )}
              {showMeanDiff && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ink-muted">{t("较图中均值:")}</span>
                  <span className={`apple-font-mono font-semibold ${meanDiffPct >= 0 ? 'text-ink-green' : 'text-ink-orange'}`}>
                    {meanDiffPct >= 0 ? '+' : ''}{meanDiffPct.toFixed(1)}% ({meanDiffPct >= 0 ? t("高于均值") : t("低于均值")})
                  </span>
                </div>
              )}
            </div>
          )}
          {rawPoint?.isOutlier && (
            <div className="mt-1 px-2 py-1 rounded bg-[#F92672]/15 text-ink-pink border border-[#F92672]/30 text-[10px] font-semibold apple-font-mono">{' ' + t("[异常点] Z-Score =") + ' '}{rawPoint.zScore}{' ' + t("(偏离均值)") + ' '}</div>
          )}
        </div>
      )}
    </div>
  );
}
