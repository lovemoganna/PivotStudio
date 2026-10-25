import { t } from '../../../../i18n.js';
import React from 'react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { X } from 'lucide-react';
import { DATE_GRANULARITIES } from '../../../../constants/pivotConstants';

export function BinModal({
  activeBinModal,
  binFormState,
  setBinFormState,
  setPivotConfig,
  onClose,
  soundEngine,
  showToast,
}) {
  const dialogRef = useDialogFocus(Boolean(activeBinModal), onClose);
  if (!activeBinModal) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={t("字段分组设置")} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85dvh] rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-y-auto animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-start justify-between gap-2">
          <h3 className="min-w-0 [overflow-wrap:anywhere] text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2]">{' ' + t("GROUPING // 字段分组设置 (")}{activeBinModal.item.field})
          </h3>
          <button onClick={onClose} aria-label={t("关闭字段分组设置")} className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          {activeBinModal.fieldType === 'date' ? (
            <div className="space-y-2">
              <label className="block text-[11px] text-ink-muted apple-font-mono">{t("选择日期聚合粒度:")}</label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_GRANULARITIES.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => {
                      soundEngine?.playClick(580);
                      setPivotConfig((prev) => ({
                        ...prev,
                        [activeBinModal.zone]: prev[activeBinModal.zone].map((it) =>
                          it.id === activeBinModal.item.id ? { ...it, dateGranularity: g.value, excludedValues: [] } : it
                        ),
                        collapsedRowKeys: {},
                        collapsedColKeys: {},
                      }));
                      onClose();
                      showToast?.(`已将「${activeBinModal.item.field}」设为 ${g.label}`);
                    }}
                    className={`px-3 py-2 rounded-lg border text-left apple-font-mono text-[11px] font-semibold transition ${activeBinModal.item.dateGranularity === g.value ? 'bg-[#66D9EF]/20 border-[#66D9EF] text-ink-cyan' : 'bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32]'}`}
                  >
                    {t(g.label)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-ink-muted font-medium">{t("常用步长:")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 50, 100, 500, 1000].map((stepVal) => (
                    <button
                      key={stepVal}
                      type="button"
                      onClick={() => {
                        soundEngine?.playClick?.(500);
                        setBinFormState((p) => ({ ...p, start: p.start || '0', step: String(stepVal) }));
                      }}
                      className={"px-2 py-0.5 rounded-md border text-[10px] font-semibold transition " + (binFormState.step === String(stepVal) ? "bg-[#66D9EF]/20 border-[#66D9EF] text-ink-cyan font-bold" : "bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:border-[#66D9EF]")}
                    >
                      +{stepVal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="bin-start" className="block text-[11px] text-ink-muted mb-1 apple-font-mono">{t("起始值 (Start):")}</label>
                <input
                  type="number"
                  id="bin-start"
                  value={binFormState.start}
                  onChange={(e) => setBinFormState((p) => ({ ...p, start: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono"
                />
              </div>
              <div>
                <label htmlFor="bin-step" className="block text-[11px] text-ink-muted mb-1 apple-font-mono">{t("区间步长 (Step > 0):")}</label>
                <input
                  type="number"
                  id="bin-step"
                  value={binFormState.step}
                  onChange={(e) => setBinFormState((p) => ({ ...p, step: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setPivotConfig((prev) => ({
                      ...prev,
                      [activeBinModal.zone]: prev[activeBinModal.zone].map((it) =>
                        it.id === activeBinModal.item.id ? { ...it, numberBin: null, excludedValues: [] } : it
                      ),
                    }));
                    onClose();
                    showToast?.('已清除数值区间分箱');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] text-[11px] apple-font-mono"
                >{' ' + t("清除分箱") + ' '}</button>
                <button
                  onClick={() => {
                    const stepNum = Number(binFormState.step);
                    if (!stepNum || stepNum <= 0) {
                      showToast?.('区间步长必须大于 0', 'error');
                      return;
                    }
                    setPivotConfig((prev) => ({
                      ...prev,
                      [activeBinModal.zone]: prev[activeBinModal.zone].map((it) =>
                        it.id === activeBinModal.item.id
                          ? { ...it, numberBin: { start: Number(binFormState.start || 0), step: stepNum }, excludedValues: [] }
                          : it
                      ),
                    }));
                    onClose();
                    showToast?.(`已启用步长 ${stepNum} 的数值区间分组`);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-action text-[#F8F8F2] font-bold text-[11px] apple-font-mono"
                >{' ' + t("应用区间分组") + ' '}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
