import { t } from '../../../../i18n.js';
import React from 'react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { CheckCircle2, X } from 'lucide-react';
import { RETAIL_TEST_DATASET } from '../../../../constants/pivotConstants';

export function TestSuiteModal({
  isOpen,
  onClose,
  liveEngineTestResults,
  isReadOnly,
  setActiveDatasetId,
  setDatasets,
  setPivotConfig,
  soundEngine,
  showToast,
}) {
  const dialogRef = useDialogFocus(Boolean(isOpen), onClose);
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={t("内置校验结果")} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-ink-green" />
            <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2]">{' ' + t("内置演示数据计算校验（不替代自动化回归） (")}{liveEngineTestResults.filter((result) => result.passed).length}{t("/5 通过)") + ' '}</h3>
          </div>
          <button onClick={onClose} aria-label={t("关闭内置校验结果")} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto text-xs apple-font-mono">
          {liveEngineTestResults.map((result) => (
            <div key={result.id} className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${result.passed ? 'bg-[#A6E22E]/20 text-ink-green' : 'bg-[#F92672]/20 text-ink-pink'}`}>
                    {result.passed ? 'PASS ✓' : 'FAIL'}
                  </span>
                  <span className="font-bold text-[#272822] dark:text-[#F8F8F2]">{result.name}</span>
                </div>
                <div className="text-[10px] text-ink-muted">{t("预期结果:") + ' '}{result.expectedSummary}</div>
                <div className="text-[10px] text-ink-cyan">{t("实测输出:") + ' '}{result.actualSummary}</div>
              </div>
              <button
                disabled={isReadOnly}
                onClick={() => {
                  if (setDatasets) {
                    setDatasets((prev) => {
                      if (prev.some((d) => d.id === RETAIL_TEST_DATASET.id)) return prev;
                      return [RETAIL_TEST_DATASET, ...prev];
                    });
                  }
                  setActiveDatasetId(RETAIL_TEST_DATASET.id);
                  setPivotConfig((prev) => ({
                    ...prev,
                    ...result.cfg,
                    collapsedRowKeys: {},
                    collapsedColKeys: {},
                  }));
                  onClose();
                  soundEngine?.playTransitionChord();
                  showToast?.(`已将「${result.name}」载入主工作台`);
                }}
                className="px-3 py-1.5 rounded-lg bg-action text-[#F8F8F2] text-[10px] font-bold shrink-0 disabled:opacity-40"
              >{' ' + t("载入到透视表查看") + ' '}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
