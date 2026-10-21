import { t } from '../../../i18n.js';
import React, { useState, useEffect } from 'react';
import { useDialogFocus } from '../../../utils/useDialogFocus';
import { X, Hash, Type, Calendar, ToggleLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

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

  const [stats,setStats] = useState(null);
  const [error,setError] = useState(null);
  useEffect(()=>{
    let active=true;setStats(null);setError(null);
    if(field)requestProfile?.(field.name).then((profile)=>{if(active)setStats(profile);}).catch((error)=>{if(active && error.name!=='AbortError')setError('字段分析失败，请关闭后重试或减少数据量');});
    return ()=>{active=false;};
  },[field,currentDataset,requestProfile]);
  if (!field) return null;
  if (!stats) return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('字段健康度与分布透视')} className="bg-[#FFFDF7] dark:bg-[#272822] p-5 rounded-xl"><p role="status">{error || '正在分析字段，请稍候…'}</p><button onClick={onClose}>{t('取消')}</button></div></div>;

  const handleAdd = (zone) => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(540);
    addFieldToZone?.(zone, field.name);
    onClose();
  };

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
        className="w-full max-w-lg rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl p-5 space-y-4 animate-apple-modal apple-font-sans"
      >
        <div className="flex items-center justify-between border-b border-[#D6D4C8] dark:border-[#3E3D32] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#66D9EF]" />
            <h3 className="font-bold text-sm text-[#272822] dark:text-[#F8F8F2] flex items-center gap-1.5 apple-font-mono">
              <span>{t("字段质量透视:")}</span>
              <span className="text-ink-pink">「{field.name}」</span>
            </h3>
            <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#66D9EF]/15 text-ink-cyan apple-font-mono uppercase">
              {field.type}
            </span>
          </div>
          <button
            type="button"
            aria-label={t("关闭字段质量透视弹窗")}
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completeness & Cardinality Grid */}
        <div className="grid grid-cols-3 gap-2.5 apple-font-mono text-center">
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-ink-muted">{t("有效完整度")}</div>
            <div className="text-base font-bold text-ink-green mt-0.5">{stats.completenessPct}%</div>
            <div className="text-[9px] text-ink-muted mt-0.5">{stats.nonNullCount} / {stats.total}{' ' + t("行")}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-ink-muted">{t("去重基数 (Distinct)")}</div>
            <div className="text-base font-bold text-ink-cyan mt-0.5">{stats.distinctCount.toLocaleString()}</div>
            <div className="text-[9px] text-ink-muted mt-0.5">{t("唯一值数量")}</div>
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
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMin.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-ink-muted">{t("平均值 (Mean):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-ink-muted">{t("最大值 (Max):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMax.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Top frequent values preview */}
        <div className="space-y-1.5 apple-font-mono text-xs">
          <div className="text-[10.5px] font-bold text-ink-orange">{' ' + t("高频样本分布 (Top Distinct Samples)") + ' '}</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {stats.topValues.map((tv, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#EFECE1]/30 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
                <span className="truncate max-w-[220px] text-[#272822] dark:text-[#F8F8F2]">
                  {tv.val === '' ? t("<空字符串>") : tv.val}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                  <span>{tv.count}{' ' + t("次")}</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-semibold text-ink-cyan">
                    {tv.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="pt-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between gap-2 apple-font-mono">
          <span className="text-[10.5px] text-ink-muted">{t("快速注入到透视区域:")}</span>
          <div className="flex items-center gap-1.5">
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
