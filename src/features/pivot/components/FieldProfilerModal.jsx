import { t } from '../../../i18n.js';
import React, { useState, useEffect } from 'react';
import { useDialogFocus } from '../../../utils/useDialogFocus';
import { isIdentifierField, isMeasureField } from '../../../utils/fieldSemantics';
import { X, Hash, Type, Calendar, ToggleLeft, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Copy } from 'lucide-react';

export function FieldProfilerModal({
  requestProfile,
  field,
  currentDataset,
  onClose,
  addFieldToZone,
  soundEngine,
  isReadOnly,
}) {
  const dialogRef = useDialogFocus(Boolean(field), onClose);

  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setStats(null);
    setError(null);
    if (field) {
      requestProfile?.(field.name)
        .then((profile) => {
          if (active) setStats(profile);
        })
        .catch((err) => {
          if (active && err.name !== 'AbortError') setError('字段分析失败，请关闭后重试或减少数据量');
        });
    }
    return () => {
      active = false;
    };
  }, [field, currentDataset, requestProfile]);

  const dateRange = React.useMemo(() => {
    if (field?.type !== 'date' || !stats?.distinctValues || stats.distinctValues.length === 0) return null;
    return {
      earliest: stats.distinctValues[0],
      latest: stats.distinctValues[stats.distinctValues.length - 1],
    };
  }, [field?.type, stats?.distinctValues]);

  const cardinalityAssessment = React.useMemo(() => {
    if (!stats) return null;
    if (stats.distinctCount === 1) {
      return { label: '单一常量', badge: 'bg-[#75715E]/20 text-ink-muted border-[#75715E]/40', tip: '所有记录取值相同，无需作为分组维度' };
    }
    if (stats.distinctCount === stats.total && stats.total > 5) {
      return { label: '全唯一值 (ID/主键)', badge: 'bg-[#AE81FF]/20 text-ink-purple border-[#AE81FF]/40', tip: '每行均不相同，适合作去重计数 COUNTD，慎用作列维度' };
    }
    if (stats.distinctCount <= 15) {
      return { label: '优质低基数分类', badge: 'bg-[#A6E22E]/20 text-ink-green border-[#A6E22E]/40', tip: '取值集中适度，是构建【行维度】或【列交叉矩阵】的黄金维度' };
    }
    if (stats.distinctCount <= 60) {
      return { label: '中基数分类', badge: 'bg-[#66D9EF]/20 text-ink-cyan border-[#66D9EF]/40', tip: '适合用作【行维度】，配合树状折叠查看' };
    }
    return { label: '高基数离散分类', badge: 'bg-[#FD971F]/20 text-ink-orange border-[#FD971F]/40', tip: '取值较分散，慎用作【列维度】以免表格过宽，建议配合【筛选】使用' };
  }, [stats]);

  const handleAdd = (zone) => {
    if (isReadOnly || !field) return;
    soundEngine?.playClick?.(540);
    addFieldToZone?.(zone, field.name);
    onClose?.();
  };

  if (!field) return null;
  if (!stats) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-apple-fade-in">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('字段健康度与分布透视')} className="bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-6 rounded-2xl max-w-sm w-full text-center space-y-3 apple-font-mono animate-apple-modal">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#66D9EF] animate-spin mx-auto" />
          <p role="status" className="text-xs text-[#272822] dark:text-[#F8F8F2] font-semibold">{error || t('正在分析字段分布与数据健康度…')}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] hover:bg-black/5 dark:hover:bg-white/5 text-xs text-ink-muted transition"
          >
            {t('取消')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("字段健康度与分布透视")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-5 space-y-4 animate-apple-modal apple-font-sans"
      >
        <div className="flex items-center justify-between border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#66D9EF]" />
            <h3 className="min-w-0 font-bold text-sm text-[#272822] dark:text-[#F8F8F2] flex flex-wrap items-center gap-1.5 [overflow-wrap:anywhere]">
              <span>{t("字段质量透视:")}</span>
              <span className="block min-w-0 max-w-full break-all text-ink-pink">「{field.name}」</span>
            </h3>
            <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#66D9EF]/15 text-ink-cyan apple-font-mono uppercase">
              {field.type}
            </span>
          </div>
          <button
            type="button"
            aria-label={t("关闭字段质量透视弹窗")}
            onClick={onClose}
            className="p-1 shrink-0 rounded text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-ink-muted">{t('统计整个数据集，不受透视筛选影响。')}</p>

        {/* Date Range Banner for date fields */}
        {dateRange && (
          <div className="p-2.5 rounded-xl bg-[#66D9EF]/10 border border-[#66D9EF]/30 flex flex-wrap items-center justify-between text-xs apple-font-mono gap-1">
            <span className="text-ink-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-ink-cyan" />
              <span>{t("时间跨度区间:")}</span>
            </span>
            <span className="font-bold text-ink-cyan">{dateRange.earliest} 至 {dateRange.latest}</span>
          </div>
        )}

        {/* Intelligent Next-Step Analysis Recommendation */}
        <div className="p-3 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-1.5 apple-font-mono text-xs">
          <div className="flex items-center gap-1.5 font-bold text-ink-green text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-ink-yellow shrink-0" />
            <span>{t("智能分析建议 (推荐用法):")}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#272822] dark:text-[#F8F8F2]">
            {(() => {
              if (!isMeasureField(field) && isIdentifierField(field.name)) {
                return t("字段名提示这可能是编号。可用「去重计数 (DISTINCT)」统计不同编号数量；是否为主键，还需确认没有空值或重复编号。");
              }
              if (field.type === 'date') {
                return t("📅 日期时间字段。非常推荐放入「行维度」或「列维度」，并配合「按年/季/月」粒度观察业务的时序走势与环比增长。");
              }
              if (field.type === 'number') {
                return t("🔢 数值度量字段。非常推荐放入「数值指标」，支持求和 (SUM)、平均值 (AVG) 或分箱直方图分布分析。");
              }
              if (stats.distinctCount <= 20) {
                return t(`🏷️ 优质分类维度（共 ${stats.distinctCount} 种分类）。非常适合放入「行维度」进行分组对比，或放入「列维度」构建多维交叉透视矩阵。`);
              }
              return t(`📊 离散分类字段（共 ${stats.distinctCount} 种取值）。适合用于行分组或筛选条件。`);
            })()}
          </p>
        </div>
        {/* Completeness & Cardinality Grid */}
        <div className="grid grid-cols-3 gap-2.5 apple-font-mono text-center">
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-ink-muted">{t('非空比例')}</div>
            <div className="text-base font-bold text-ink-green mt-0.5">{stats.completenessPct}%</div>
            <div className="text-[9px] text-ink-muted mt-0.5">{stats.nonNullCount} / {stats.total}{' ' + t("行")}</div>
          </div>
                    <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-ink-muted">{t('不同值数量')}</div>
              <div className="text-base font-bold text-ink-cyan mt-0.5">{stats.distinctCount.toLocaleString()}</div>
            </div>
            {cardinalityAssessment && (
              <span className={`mt-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold border self-center ${cardinalityAssessment.badge}`} title={cardinalityAssessment.tip}>
                {cardinalityAssessment.label}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-ink-muted">{t("缺失值行数")}</div>
            <div className={`text-base font-bold mt-0.5 ${stats.nullCount > 0 ? 'text-ink-orange' : 'text-ink-muted'}`}>
              {stats.nullCount}
            </div>
            <div className="text-[9px] text-ink-muted mt-0.5">{stats.nullCount > 0 ? t("包含空值") : t("无缺失")}</div>
          </div>
        </div>

        {/* Numeric distribution statistics */}
        {field.type === 'number' && (
          <div className="p-3 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-2 apple-font-mono text-xs">
            <div className="text-[10.5px] font-bold text-ink-purple">{t("数值统计指标 (Summary Stats)")}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[9.5px] text-ink-muted">{t("最小值 (Min):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMin?.toLocaleString() ?? '-'}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-ink-muted">{t("平均值 (Mean):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numAvg?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '-'}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-ink-muted">{t("最大值 (Max):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMax?.toLocaleString() ?? '-'}</div>
              </div>
            </div>
          </div>
        )}

        {field.type === 'number' && <p data-testid="numeric-quality" className="text-xs leading-5 text-ink-muted">
          {t('有效数值：')}{stats.validNumericCount ?? 0} · {t('无法作为数值：')}{stats.invalidNumericCount ?? 0}
          {stats.invalidNumericCount > 0 && <span className="block text-ink-orange">{t('原始内容已保留。请核对源文件，或将该字段按文本分析。')}</span>}
        </p>}
        {/* Top frequent values preview */}
        <div className="space-y-1.5 apple-font-mono text-xs">
          <div className="text-[10.5px] font-bold text-ink-orange">{' ' + t("高频样本分布 (Top Distinct Samples)") + ' '}</div>
          <div tabIndex={0} role="region" aria-label={t('字段样本分布')} className="space-y-1 max-h-36 overflow-y-auto">
            {stats.topValues.map((tv, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#EFECE1]/30 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] group">
                <span className="truncate max-w-[220px] text-[#272822] dark:text-[#F8F8F2]">
                  {tv.val === '' ? t("<空字符串>") : tv.val}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                  <span>{tv.count}{' ' + t("次")}</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-semibold text-ink-cyan">
                    {tv.pct}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        navigator.clipboard?.writeText(String(tv.val));
                        soundEngine?.playClick?.(500);
                      } catch {}
                    }}
                    className="p-1 rounded opacity-40 group-hover:opacity-100 hover:text-ink-cyan transition"
                    title={t("复制此取值")}
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="pt-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">{t('将字段添加到：')}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('rows')}
              className="px-2.5 py-1 rounded-lg bg-[#AE81FF]/20 text-ink-purple hover:bg-[#AE81FF]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 行维度") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('columns')}
              className="px-2.5 py-1 rounded-lg bg-[#66D9EF]/20 text-ink-cyan hover:bg-[#66D9EF]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 列维度") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('values')}
              className="px-2.5 py-1 rounded-lg bg-[#A6E22E]/20 text-ink-green hover:bg-[#A6E22E]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 值指标") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('filters')}
              className="px-2.5 py-1 rounded-lg bg-[#F92672]/20 text-ink-pink hover:bg-[#F92672]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 筛选") + ' '}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
