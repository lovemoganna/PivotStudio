import React, {useLayoutEffect, useRef, useState} from 'react';
import {Search, X} from 'lucide-react';
import {t} from '../../../i18n.js';
import {useDialogFocus} from '../../../utils/useDialogFocus';
import {getMeasureDefaults} from '../../../utils/fieldSemantics.js';
import {AGG_METHODS} from '../../../constants/pivotConstants';
import {aggregationChoiceLabel, aggregationChoiceDescription} from '../../../utils/aggregationChoice.js';

/** A destination-first alternative to switching palettes or dragging a field. */
export function FieldPickerDialog({zone, label, fields, items, customMetrics = [], onAdd, onAddCustom, onClose}) {
  const [aggregations, setAggregations] = useState({});
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const dialogRef = useDialogFocus(true, onClose);
  useLayoutEffect(() => { searchRef.current?.focus(); }, []);
  const q = query.trim().toLocaleLowerCase();
  const candidates = [
    ...(zone === 'values' ? [{key:'record-count', name:t('记录数'), field:'__COUNT__', kind:t('统计全部记录')}] : []),
    ...(fields || []).map(field => {
      const used = items.filter(item => item.field === field.name);
      const isDateGroup = field.type === 'date' && ['rows','columns'].includes(zone);
      const disabled = zone !== 'values' && (isDateGroup ? ['year','quarter','month','day','raw'].every(gran=>used.some(item=>item.dateGranularity===gran)) : used.length > 0);
      return {key:`field:${field.name}`, name:field.name, field:field.name, disabled, meta:field,
        kind:zone === 'values' ? t(AGG_METHODS.find(method=>method.value===getMeasureDefaults(field).agg)?.short || '计数') : t(field.type === 'date' ? '日期' : field.type === 'number' ? '数值' : '文本')};
    }),
    ...(zone === 'values' ? customMetrics.map(metric => ({key:`custom:${metric.id || metric.field}`, name:metric.field, metric, kind:t('自定义指标'), disabled:items.some(item=>item.id===metric.id || (item.isCalculated && item.field===metric.field))})) : []),
  ].filter(item=>item.name.toLocaleLowerCase().includes(q));
  const add = item => {
    if (!item || item.disabled) return;
    if (item.metric) onAddCustom?.(item.metric);
    else onAdd?.(zone, item.field, zone === 'values' && item.meta ? {aggregation:aggregations[item.key] || getMeasureDefaults(item.meta).agg} : undefined);
    onClose();
    // A completed next-step action can remove its opener. Keep focus on the result.
    requestAnimationFrame(()=>{
      if (document.activeElement !== document.body) return;
      const field = item.metric?.field || item.field;
      const target = Array.from(document.querySelectorAll('[data-configured-field]')).filter(el=>el.dataset.zone === zone && el.dataset.configuredField === field).at(-1);
      target?.scrollIntoView({block:'nearest',inline:'nearest'});
      target?.focus({preventScroll:true});
    });
  };
  const focusResult = direction => {
    const buttons = Array.from(listRef.current?.querySelectorAll('button:not(:disabled)') || []);
    const index = buttons.indexOf(document.activeElement);
    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={event=>{if(event.target===event.currentTarget) onClose();}}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${t('添加字段到')}${t(label)}`}
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col min-h-0 rounded-xl border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] shadow-xl p-3 gap-3 text-[#272822] dark:text-[#F8F8F2]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('添加字段到')}{t(label)}</h2>
          <button type="button" onClick={onClose} aria-label={t('关闭字段选择')} className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-3 w-4 h-4 text-ink-muted pointer-events-none" />
          <input ref={searchRef} type="search" aria-label={t('搜索要添加的字段')} placeholder={t('输入字段名称搜索')} value={query}
            onChange={event=>setQuery(event.target.value)}
            onKeyDown={event=>{
              if (event.key==='Enter') {event.preventDefault();add(candidates.find(item=>!item.disabled));}
              if (event.key==='ArrowDown') {event.preventDefault();focusResult(1);}
            }}
            className="w-full min-w-0 pl-8 pr-3 py-2.5 text-xs rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-transparent" />
        </div>
        {zone === 'values' && <p className="text-[11px] text-ink-muted">{t('先选计算方式，再点字段名称添加；不修改则使用所示默认口径。')}</p>}
        <p role="status" className="text-[11px] text-ink-muted">{t('匹配字段：')}{candidates.length}</p>
        <div ref={listRef} className="overflow-y-auto min-h-0 max-h-[50dvh] space-y-1 overscroll-contain"
          onKeyDown={event=>{
            if (event.target.tagName === 'SELECT') return;
            if (event.key==='ArrowDown' || event.key==='ArrowUp') {event.preventDefault();focusResult(event.key==='ArrowDown'?1:-1);}
          }}>
          {candidates.map((item,index)=>{
          const agg=aggregations[item.key] || (item.meta ? getMeasureDefaults(item.meta).agg : 'count');
          const description=zone === 'values' && !item.metric ? aggregationChoiceDescription(agg,item.field) : null;
          const descriptionId=`field-choice-${index}`;
          return <div key={item.key} className="flex flex-wrap items-center gap-1 rounded-lg border border-[#D6D4C8]/50 dark:border-[#49483E]">
          <button key={item.key} type="button" disabled={item.disabled} onClick={()=>add(item)}
            aria-describedby={description ? descriptionId : undefined}
            data-testid="field-picker-option" data-field-name={item.name}
            className="flex-1 min-w-[120px] text-left flex items-start justify-between gap-3 px-2.5 py-2.5 rounded-lg border border-transparent hover:border-[#66D9EF] hover:bg-[#66D9EF]/10 focus-visible:border-[#66D9EF] text-xs disabled:opacity-50 disabled:cursor-default">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item.name}</span>
            {!(item.meta && zone === 'values') && <span className="shrink-0 text-[10px] text-ink-muted">{item.disabled ? t('已在此区域') : item.kind}</span>}
          </button>
          {zone === 'values' && item.meta && <select aria-label={`${item.name} · ${t('添加前计算方式')}`}
            aria-describedby={descriptionId}
            value={aggregations[item.key] || getMeasureDefaults(item.meta).agg}
            onChange={event=>setAggregations(previous=>({...previous,[item.key]:event.target.value}))}
            className="max-w-[9rem] min-w-0 mx-2 my-1 px-1 py-2 rounded border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] text-xs">
            {AGG_METHODS.filter(method=>item.meta.type === 'number' || ['count','count_distinct'].includes(method.value)).map(method=><option key={method.value} value={method.value}>{aggregationChoiceLabel(method.value,item.field) || t(method.label)}</option>)}
          </select>}
          {description && <p id={descriptionId} data-testid="aggregation-choice-description" className="w-full px-2.5 pb-2 text-[11px] leading-relaxed text-ink-muted [overflow-wrap:anywhere]">{description}</p>}
          </div>})}
          {!candidates.length && <div className="py-6 text-center text-xs text-ink-muted space-y-3">
            <p>{t('无匹配字段')}</p>
            <button type="button" onClick={()=>{setQuery('');searchRef.current?.focus();}} className="text-ink-cyan underline">{t('清空搜索条件')}</button>
          </div>}
        </div>
      </section>
    </div>
  );
}
