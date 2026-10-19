import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { RETAIL_TEST_DATASET } from '../../../../constants/pivotConstants';

export function TestSuiteModal({
  isOpen,
  onClose,
  liveEngineTestResults,
  isReadOnly,
  setActiveDatasetId,
  setPivotConfig,
  soundEngine,
  showToast,
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A6E22E]" />
            <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
              内置演示数据计算校验（不替代自动化回归） ({liveEngineTestResults.filter((t) => t.passed).length}/5 通过)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#75715E] hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto text-xs apple-font-mono">
          {liveEngineTestResults.map((t) => (
            <div key={t.id} className="p-3.5 rounded-xl bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.passed ? 'bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E]' : 'bg-[#F92672]/20 text-[#F92672]'}`}>
                    {t.passed ? 'PASS ✓' : 'FAIL'}
                  </span>
                  <span className="font-bold text-[#272822] dark:text-[#F8F8F2]">{t.name}</span>
                </div>
                <div className="text-[10px] text-[#75715E] dark:text-[#908E80]">预期结果: {t.expectedSummary}</div>
                <div className="text-[10px] text-[#0088A3] dark:text-[#66D9EF]">实测输出: {t.actualSummary}</div>
              </div>
              <button
                disabled={isReadOnly}
                onClick={() => {
                  setActiveDatasetId(RETAIL_TEST_DATASET.id);
                  setPivotConfig((prev) => ({
                    ...prev,
                    ...t.cfg,
                    collapsedRowKeys: {},
                    collapsedColKeys: {},
                  }));
                  onClose();
                  soundEngine?.playTransitionChord();
                  showToast?.(`已将「${t.name}」载入主工作台`);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#F92672] text-[#F8F8F2] text-[10px] font-bold shrink-0 disabled:opacity-40"
              >
                载入到透视表查看
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
