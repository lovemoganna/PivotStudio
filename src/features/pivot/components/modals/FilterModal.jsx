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
  const [loading,setLoading] = useState(true);
  const dim = activeHeaderFilterModal?.dim;
  const zone = activeHeaderFilterModal?.zone;
  const liveDim = (pivotConfig[zone] || []).find((item)=>item.id===dim?.id) || dim;
  const dimensionSignature=JSON.stringify(liveDim && {field:liveDim.field,dateGranularity:liveDim.dateGranularity,numberBin:liveDim.numberBin});
  useEffect(()=>{
    let active=true;setAllDistinctVals([]);setProfileError(null);setLoading(true);
    if(liveDim) Promise.resolve().then(()=>requestProfile?.(liveDim.field,zone==='filters'?undefined:liveDim)).then((profile)=>{
      if (!profile) throw new Error('Field profile is unavailable');
      if(active)setAllDistinctVals(profile.distinctValues);
    }).catch((error)=>{if(active && error.name!=='AbortError')setProfileError(t('筛选值读取失败，请关闭弹窗并重新计算后重试'));}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[requestProfile,dimensionSignature,zone]);
  if (!activeHeaderFilterModal) return null;

  const q = headerFilterSearch.trim().toLowerCase();
  const matchedValues = q ? allDistinctVals.filter((v) => v.toLowerCase().includes(q)) : allDistinctVals;
  const visibleVals = matchedValues.slice(0,200);

  const isValueChecked = (v) => {
    if (zone === 'filters') {
      if (liveDim.excludeAll) return false;
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
          const effectiveSel = it.excludeAll ? [] : curSel.length === 0 ? allDistinctVals : curSel;
          const nextSel = effectiveSel.includes(v)
            ? effectiveSel.filter((x) => x !== v)
            : [...effectiveSel, v];
          return { ...it, excludeAll: nextSel.length === 0, selectedValues: nextSel.length === allDistinctVals.length ? [] : nextSel };
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
          return { ...it, excludeAll: false, selectedValues: [v] };
        }
        return { ...it, excludedValues: allDistinctVals.filter((x) => x !== v) };
      }),
    }));
  };

  const resetAll = () => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) =>
        it.id === liveDim.id ? { ...it, excludeAll: false, selectedValues: [], excludedValues: [] } : it
      ),
    }));
  };

  const deselectAll = () => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) => {
        if (it.id !== liveDim.id) return it;
        if (zone === 'filters') {
          return { ...it, excludeAll: true, selectedValues: [] };
        }
        return { ...it, excludedValues: [...allDistinctVals] };
      }),
    }));
  };

  const invertSelection = () => {
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].map((it) => {
        if (it.id !== liveDim.id) return it;
        if (zone === 'filters') {
          if (it.excludeAll) {
            return { ...it, excludeAll: false, selectedValues: [] };
          }
          const curSel = it.selectedValues || [];
          const effectiveSel = curSel.length === 0 ? allDistinctVals : curSel;
          const inverted = allDistinctVals.filter((v) => !effectiveSel.includes(v));
          return { ...it, excludeAll: inverted.length === 0, selectedValues: inverted };
        }
        const curExcl = it.excludedValues || [];
        const invertedExcl = allDistinctVals.filter((v) => !curExcl.includes(v));
        return { ...it, excludedValues: invertedExcl };
      }),
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
        <div className="shrink-0 px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-start gap-2">
            <Filter className="w-3.5 h-3.5 shrink-0 text-ink-green" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{t("FILTER // 筛选「")}{liveDim.field}」({allDistinctVals.length}{t("项)")}</span>
          </h3>
          <button onClick={onClose} aria-label={t("关闭字段筛选")} className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="shrink-0 p-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2">
          <input
            type="text"
            aria-label={t("搜索筛选项")}
            value={headerFilterSearch}
            onChange={(e) => setHeaderFilterSearch(e.target.value)}
            placeholder={t("搜索筛选项...")}
            className="flex-1 px-2.5 py-1 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-xs apple-font-mono focus:outline-none"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={resetAll}
              disabled={loading || Boolean(profileError)}
              className="px-2 py-1 rounded-lg bg-[#A6E22E]/20 text-ink-green text-[10px] font-bold apple-font-mono hover:bg-[#A6E22E]/30 transition"
              title={t("全部选中")}
            >{t("全选")}</button>
            <button
              type="button"
              onClick={deselectAll}
              disabled={loading || Boolean(profileError)}
              className="px-2 py-1 rounded-lg bg-[#F92672]/15 text-ink-pink text-[10px] font-bold apple-font-mono hover:bg-[#F92672]/25 transition"
              title={t("清除全部选中")}
            >{t("全不选")}</button>
            <button
              type="button"
              onClick={invertSelection}
              disabled={loading || Boolean(profileError)}
              className="px-2 py-1 rounded-lg bg-[#66D9EF]/15 text-ink-cyan text-[10px] font-bold apple-font-mono hover:bg-[#66D9EF]/25 transition"
              title={t("反选")}
            >{t("反选")}</button>
          </div>
        </div>
        <div aria-busy={loading} className="min-h-0 flex-1 overflow-y-auto p-3 space-y-1">
          {loading && <p role="status" className="text-xs text-ink-muted">{t('正在读取筛选项…')}</p>}
          {profileError && <p role="alert">{profileError}</p>}
          {!loading && !profileError && matchedValues.length === 0 && <p role="status" className="text-xs text-ink-muted">{t(q ? '没有匹配的筛选项，请修改搜索。' : '当前字段没有可用筛选项。')}</p>}
          {matchedValues.length > 200 && <p role="status" className="px-2.5 py-1.5 rounded-lg bg-[#FD971F]/15 border border-[#FD971F]/30 text-ink-orange text-[10px] leading-relaxed">{t("仅显示前 200 项，请搜索定位其他值；全选仍覆盖全部值。")}</p>}
          {visibleVals.map((val) => {
            const checked = isValueChecked(val);
            return (
              <div key={val} className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#EFECE1] dark:hover:bg-[#1E1F1C] text-xs apple-font-mono">
                <label className="min-w-0 flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVal(val)}
                    className="rounded accent-[#F92672]"
                  />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{val || t('(空)')}</span>
                </label>
                <button
                  onClick={() => selectOnlyThis(val)}
                  className="shrink-0 ml-2 px-1.5 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] text-ink-pink text-[11px] font-semibold transition"
                >{' ' + t("仅此项") + ' '}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
