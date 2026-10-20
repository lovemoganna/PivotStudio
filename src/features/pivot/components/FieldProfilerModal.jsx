import { t } from '../../../i18n.js';
import React, { useMemo } from 'react';
import { useDialogFocus } from '../../../utils/useDialogFocus';
import { X, Hash, Type, Calendar, ToggleLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export function FieldProfilerModal({
  field,
  currentDataset,
  onClose,
  addFieldToZone,
  soundEngine,
  isReadOnly,
}) {
  const dialogRef = useDialogFocus(Boolean(field), onClose);

  const stats = useMemo(() => {
    if (!field || !currentDataset?.rows) return null;
    const rows = currentDataset.rows;
    const total = rows.length;
    let nonNullCount = 0;
    const valueMap = new Map();
    let numSum = 0;
    let numMin = Infinity;
    let numMax = -Infinity;
    let numValidCount = 0;

    for (let i = 0; i < total; i++) {
      const raw = rows[i][field.name];
      if (raw !== null && raw !== undefined && !(typeof raw === 'string' && raw.trim() === '')) {
        nonNullCount++;
        const sVal = String(raw);
        valueMap.set(sVal, (valueMap.get(sVal) || 0) + 1);

        if (field.type === 'number') {
          const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''));
          if (Number.isFinite(num)) {
            numValidCount++;
            numSum += num;
            if (num < numMin) numMin = num;
            if (num > numMax) numMax = num;
          }
        }
      }
    }

    const distinctCount = valueMap.size;
    const completenessPct = total > 0 ? ((nonNullCount / total) * 100).toFixed(1) : '0';
    const topValues = Array.from(valueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([val, count]) => ({
        val,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
      }));

    return {
      total,
      nonNullCount,
      nullCount: total - nonNullCount,
      completenessPct,
      distinctCount,
      numMin: Number.isFinite(numMin) ? numMin : 0,
      numMax: Number.isFinite(numMax) ? numMax : 0,
      numAvg: numValidCount > 0 ? numSum / numValidCount : 0,
      topValues,
    };
  }, [field, currentDataset]);

  if (!field || !stats) return null;

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
              <span className="text-[#F92672]">「{field.name}」</span>
            </h3>
            <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#66D9EF]/15 text-[#0088A3] dark:text-[#66D9EF] apple-font-mono uppercase">
              {field.type}
            </span>
          </div>
          <button
            type="button"
            aria-label={t("关闭字段质量透视弹窗")}
            onClick={onClose}
            className="p-1 rounded text-[#75715E] hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completeness & Cardinality Grid */}
        <div className="grid grid-cols-3 gap-2.5 apple-font-mono text-center">
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-[#75715E] dark:text-[#908E80]">{t("有效完整度")}</div>
            <div className="text-base font-bold text-[#A6E22E] mt-0.5">{stats.completenessPct}%</div>
            <div className="text-[9px] text-[#75715E] mt-0.5">{stats.nonNullCount} / {stats.total}{' ' + t("行")}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-[#75715E] dark:text-[#908E80]">{t("去重基数 (Distinct)")}</div>
            <div className="text-base font-bold text-[#66D9EF] mt-0.5">{stats.distinctCount.toLocaleString()}</div>
            <div className="text-[9px] text-[#75715E] mt-0.5">{t("唯一值数量")}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
            <div className="text-[10px] text-[#75715E] dark:text-[#908E80]">{t("缺失值行数")}</div>
            <div className={`text-base font-bold mt-0.5 ${stats.nullCount > 0 ? 'text-[#FD971F]' : 'text-[#75715E]'}`}>
              {stats.nullCount}
            </div>
            <div className="text-[9px] text-[#75715E] mt-0.5">{stats.nullCount > 0 ? t("包含空值") : t("无缺失")}</div>
          </div>
        </div>

        {/* Numeric distribution statistics */}
        {field.type === 'number' && (
          <div className="p-3 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] space-y-2 apple-font-mono text-xs">
            <div className="text-[10.5px] font-bold text-[#6B38FB] dark:text-[#AE81FF]">{t("数值统计指标 (Summary Stats)")}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[9.5px] text-[#75715E]">{t("最小值 (Min):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMin.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-[#75715E]">{t("平均值 (Mean):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <span className="text-[9.5px] text-[#75715E]">{t("最大值 (Max):")}</span>
                <div className="font-bold text-[#272822] dark:text-[#F8F8F2]">{stats.numMax.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Top frequent values preview */}
        <div className="space-y-1.5 apple-font-mono text-xs">
          <div className="text-[10.5px] font-bold text-[#FD971F]">{' ' + t("高频样本分布 (Top Distinct Samples)") + ' '}</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {stats.topValues.map((tv, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#EFECE1]/30 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
                <span className="truncate max-w-[220px] text-[#272822] dark:text-[#F8F8F2]">
                  {tv.val === '' ? t("<空字符串>") : tv.val}
                </span>
                <div className="flex items-center gap-2 text-[10px] text-[#75715E]">
                  <span>{tv.count}{' ' + t("次")}</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-semibold text-[#0088A3] dark:text-[#66D9EF]">
                    {tv.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="pt-2 border-t border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between gap-2 apple-font-mono">
          <span className="text-[10.5px] text-[#75715E]">{t("快速注入到透视区域:")}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('rows')}
              className="px-2.5 py-1 rounded-lg bg-[#AE81FF]/20 text-[#6B38FB] dark:text-[#AE81FF] hover:bg-[#AE81FF]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 行维度") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('columns')}
              className="px-2.5 py-1 rounded-lg bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF] hover:bg-[#66D9EF]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 列维度") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('values')}
              className="px-2.5 py-1 rounded-lg bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E] hover:bg-[#A6E22E]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 值指标") + ' '}</button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleAdd('filters')}
              className="px-2.5 py-1 rounded-lg bg-[#F92672]/20 text-[#F92672] hover:bg-[#F92672]/30 text-[10px] font-bold transition disabled:opacity-40"
            >{' ' + t("+ 筛选") + ' '}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
