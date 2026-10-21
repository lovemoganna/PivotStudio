import { t } from '../../../../i18n.js';
import React, { useEffect, useState } from 'react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { Filter, X } from 'lucide-react';

export function FilterModal({
  requestProfile,
  activeHeaderFilterModal,
  pivotConfig,
  setPivotConfig,
  currentDataset,
  headerFilterSearch,
  setHeaderFilterSearch,
  onClose,
}) {
  const dialogRef = useDialogFocus(Boolean(activeHeaderFilterModal), onClose);
  const [allDistinctVals,setAllDistinctVals] = useState([]);
  const [profileError,setProfileError] = useState(null);
  const dim = activeHeaderFilterModal?.dim;
  const zone = activeHeaderFilterModal?.zone;
  const liveDim = (pivotConfig[zone] || []).find((item)=>item.id===dim?.id) || dim;
  const dimensionSignature=JSON.stringify(liveDim && {field:liveDim.field,dateGranularity:liveDim.dateGranularity,numberBin:liveDim.numberBin});
  useEffect(()=>{
    let active=true;setAllDistinctVals([]);setProfileError(null);
    if(liveDim) requestProfile?.(liveDim.field,zone==='filters'?undefined:liveDim).then((profile)=>{if(active && profile)setAllDistinctVals(profile.distinctValues);}).catch((error)=>{if(active && error.name!=='AbortError')setProfileError('筛选值读取失败，请关闭弹窗并重新计算后重试');});
    return ()=>{active=false;};
  },[requestProfile,dimensionSignature,zone]);
  if (!activeHeaderFilterModal) return null;

  const q = headerFilterSearch.trim().toLowerCase();
  const matchedValues = q ? allDistinctVals.filter((v) => v.toLowerCase().includes(q)) : allDistinctVals;
  const visibleVals = matchedValues.slice(0,200);

  const isValueChecked = (v) => {
    if (zone === 'filters') {
      const sel = liveDim.selectedValues || [];
      return sel.length === 0 || sel.includes(v);
    }
    const excl = liveDim.excludedValues || [];
    return !excl.includes(v);
  };

  const toggleVal = (v) => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) => {
        if (it.id !== liveDim.id) return it;
        if (zone === 'filters') {
          const curSel = it.selectedValues || [];
          const effectiveSel = curSel.length === 0 ? allDistinctVals : curSel;
          const nextSel = effectiveSel.includes(v)
            ? effectiveSel.filter((x) => x !== v)
            : [...effectiveSel, v];
          return { ...it, selectedValues: nextSel.length === allDistinctVals.length ? [] : nextSel };
        }
        const curExcl = it.excludedValues || [];
        const nextExcl = curExcl.includes(v) ? curExcl.filter((x) => x !== v) : [...curExcl, v];
        return { ...it, excludedValues: nextExcl };
      }),
    }));
  };

  const selectOnlyThis = (v) => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) => {
        if (it.id !== liveDim.id) return it;
        if (zone === 'filters') {
          return { ...it, selectedValues: [v] };
        }
        return { ...it, excludedValues: allDistinctVals.filter((x) => x !== v) };
      }),
    }));
  };

  const resetAll = () => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) =>
        it.id === liveDim.id ? { ...it, selectedValues: [], excludedValues: [] } : it
      ),
    }));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={t("字段筛选")} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-apple-modal"
      >
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between">
          <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-ink-green" />
            <span>{t("FILTER // 筛选「")}{liveDim.field}」({allDistinctVals.length}{t("项)")}</span>
          </h3>
          <button onClick={onClose} aria-label={t("关闭字段筛选")} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2">
          <input
            type="text"
            value={headerFilterSearch}
            onChange={(e) => setHeaderFilterSearch(e.target.value)}
            placeholder={t("搜索筛选项...")}
            className="flex-1 px-2.5 py-1 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-xs apple-font-mono focus:outline-none"
          />
          <button
            onClick={resetAll}
            className="px-2.5 py-1 rounded-lg bg-[#A6E22E]/20 text-ink-green text-[10px] font-bold apple-font-mono"
          >{' ' + t("全选重置") + ' '}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {profileError && <p role="alert">{profileError}</p>}
          {matchedValues.length > 200 && <p role="status">仅显示前 200 项，请搜索定位其他值；全选仍覆盖全部值。</p>}
          {visibleVals.map((val) => {
            const checked = isValueChecked(val);
            return (
              <div key={val} className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#EFECE1] dark:hover:bg-[#1E1F1C] text-xs apple-font-mono">
                <label className="flex items-center gap-2 cursor-pointer flex-1 truncate">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVal(val)}
                    className="rounded accent-[#F92672]"
                  />
                  <span className="truncate">{val || '(空)'}</span>
                </label>
                <button
                  onClick={() => selectOnlyThis(val)}
                  className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded bg-[#F92672]/15 text-ink-pink text-[9px] font-semibold transition"
                >{' ' + t("仅此项") + ' '}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
