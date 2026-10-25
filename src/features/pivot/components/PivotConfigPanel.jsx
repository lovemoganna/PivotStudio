import {t} from '../../../i18n.js';
import React, {useState} from 'react';
import {Info, RotateCcw, GripVertical, ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Sparkles, Trash2} from 'lucide-react';
import {AGG_METHODS, SHOW_AS_MODES, buildDefaultPivotConfig} from '../../../constants/pivotConstants';
import {getDimDisplayLabel} from '../../../utils/formatters';

/** Plain-language gloss for non-obvious aggregation / showAs modes. Null when defaults need no teaching. */
function getValueMeasureHint(item) {
  if (!item || item.isCalculated) return null;
  const parts = [];
  if (item.agg === 'avg') parts.push(t('均值是各记录的算术平均，不是加权业务比率'));
  else if (item.agg === 'median') parts.push(t('中位数取排序后的正中值'));
  else if (item.agg === 'count_distinct') parts.push(t('去重计数统计唯一值个数'));

  const showAs = item.showAs || 'normal';
  if (showAs === 'pct_grand') parts.push(t('显示为占全部总计的百分比'));
  else if (showAs === 'pct_row') parts.push(t('显示为占该行合计的百分比'));
  else if (showAs === 'pct_col') parts.push(t('显示为占该列合计的百分比'));
  else if (showAs === 'prev_diff') parts.push(t('显示为与上一行的差值'));
  else if (showAs === 'pct_prev_diff') parts.push(t('显示为相对上一行的变化率'));
  else if (showAs === 'running_total') parts.push(t('显示为沿行方向的累计求和'));

  return parts.length ? parts.join(' · ') : null;
}

// One analysis configuration surface, independent of table/chart display mode.
export function PivotConfigPanel({pivotConfig, setPivotConfig, currentDataset, isReadOnly, draggingPayload, setDraggingPayload, dragOverZone, setDragOverZone, addFieldToZone, removeZoneItem, moveZoneItem, toggleDimensionSort, setHeaderFilterSearch, setActiveHeaderFilterModal, setBinFormState, setActiveBinModal, transposeRowsAndColumns, onOpenMetricCenter, onEditCustomMetric, soundEngine, showToast}) {
  const [showMobileConfig,setShowMobileConfig]=useState(false);
  const [showHelpGuide,setShowHelpGuide]=useState(false);
  const zoneConfigs = [
    { key: 'filters', label: '筛选（限定范围）', badgeColor: 'text-ink-green', borderAccent: 'border-l-2 border-l-[#A6E22E]' },
    { key: 'columns', label: '列（横向对比）', badgeColor: 'text-ink-cyan', borderAccent: 'border-l-2 border-l-[#66D9EF]' },
    { key: 'rows', label: '行（纵向分组）', badgeColor: 'text-ink-pink', borderAccent: 'border-l-2 border-l-[#F92672]' },
    { key: 'values', label: '值（要算的数）', badgeColor: 'text-ink-orange', borderAccent: 'border-l-2 border-l-[#FD971F]' },
  ];
  return (
      /* Pivot Dropzones Config (透视结构放置区: 筛选 / 列 / 行 / 值) */
      <div className="flex flex-col flex-none md:flex-1 md:min-h-0 select-none apple-font-mono">
        {/* Mobile Accordion Toggle for Pivot Analysis Config */}
        <div className="md:hidden pb-1">
          <button
            type="button"
            aria-expanded={showMobileConfig}
            aria-controls="pivot-analysis-config"
            onClick={() => setShowMobileConfig((expanded) => !expanded)}
            className="w-full rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-2.5 py-1 text-left text-[11px] font-semibold flex items-center justify-between"
          >
            <span>{t("分析配置 · 行 / 列 / 值 / 筛选")}</span>
            <span className="text-ink-cyan">{showMobileConfig ? t("收起") : t("展开")}</span>
          </button>
        </div>

        <div
          id="pivot-analysis-config"
          className={`${showMobileConfig ? 'flex' : 'hidden'} md:flex flex-col flex-none md:flex-1 md:min-h-0 gap-1.5`}
        >
          {/* Header row: Title + Actions + Novice guide */}
          <div className="relative flex items-center justify-between gap-1.5 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2]">
                {t("透视结构放置区")}
              </span>
              <details
                open={showHelpGuide}
                onToggle={(e) => setShowHelpGuide(e.currentTarget.open)}
                className="text-[10px] text-ink-muted"
              >
                <summary
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowHelpGuide((p) => !p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowHelpGuide((p) => !p);
                    }
                  }}
                  className="cursor-pointer font-medium hover:text-[#272822] dark:hover:text-[#F8F8F2] flex items-center gap-1 select-none"
                >
                  <Info className="w-3 h-3 text-ink-cyan shrink-0" />
                  {t('如何选择行、列和值？')}
                </summary>
                {showHelpGuide && (
                  <div className="absolute left-0 top-full mt-1 z-40 p-2.5 rounded-lg bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] shadow-xl space-y-1 text-[#57584B] dark:text-[#C4C4B8] leading-4 w-full">
                    <p>{t('行：按类别分组，例如地区。列：并排比较，例如月份。值：要计算的金额、数量等。筛选：只分析选中的记录。')}</p>
                    <p>{t('点击字段旁的 +行、+列、+值、+筛即可添加，无需拖拽。平均值为记录的算术平均，不等于加权业务比率。')}</p>
                  </div>
                )}
              </details>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={transposeRowsAndColumns}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#FD971F] hover:text-[#FD971F] text-[9.5px] font-semibold transition disabled:opacity-40"
                title={t("一键互换行维度与列维度 (快捷键: R)")}
              >
                <RotateCcw className="w-2.5 h-2.5 text-ink-orange" />
                <span>{t("行列互换")}</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  soundEngine?.playClick?.(520);
                  setPivotConfig?.(buildDefaultPivotConfig(currentDataset));
                  showToast?.('已恢复默认推荐透视配置');
                }}
                className="px-1.5 py-0.5 min-h-[24px] inline-flex items-center rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-ink-muted hover:text-ink-cyan text-[9.5px] font-semibold transition disabled:opacity-40"
                title={t("根据当前数据集自动生成推荐行列与指标")}
              >
                <Sparkles className="w-2.5 h-2.5 text-ink-yellow" />
                <span>{t("恢复推荐")}</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly || (!pivotConfig.rows?.length && !pivotConfig.columns?.length && !pivotConfig.values?.length && !pivotConfig.filters?.length)}
                onClick={() => {
                  soundEngine?.playPop?.();
                  setPivotConfig({
                    filters: [],
                    rows: [],
                    columns: [],
                    values: [],
                    valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: '', direction: 'none' },
                    collapsedRowKeys: {},
                    collapsedColKeys: {},
                    showSubtotals: false,
                  });
                  showToast?.('已清空全部放置区配置，可按 ⌘Z / Ctrl+Z 随时撤销');
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#F92672] text-ink-muted hover:text-[#F92672] text-[9.5px] font-semibold transition disabled:opacity-40"
                title={t("一键清空行、列、值和筛选配置，重新搭架 (支持 ⌘Z 撤销)")}
              >
                <Trash2 className="w-2.5 h-2.5 text-ink-pink" />
                <span>{t("清空")}</span>
              </button>
            </div>
          </div>

          {/* Beginner Guided Quick Start when config is completely empty */}
          {(pivotConfig?.rows?.length || 0) === 0 && (pivotConfig?.values?.length || 0) === 0 && (
            <div className="p-2 rounded-lg border border-dashed border-[#66D9EF]/50 bg-[#66D9EF]/10 space-y-1 text-xs shrink-0 select-none">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-ink-cyan">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-ink-yellow" />
                  {t("快速开始")}
                </span>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    soundEngine?.playClick?.(520);
                    setPivotConfig?.(buildDefaultPivotConfig(currentDataset));
                    showToast?.('已应用推荐配置');
                  }}
                  className="px-1.5 py-0.2 rounded bg-[#66D9EF] text-[#1E1F1C] text-[9.5px] font-bold hover:opacity-90 transition"
                >
                  {t("⚡ 推荐配置")}
                </button>
              </div>
              <p className="text-[9.5px] text-ink-muted leading-relaxed">
                {t("点击字段旁的【+行】选分类（如地区），再点【+值】选数值（如销售额），即可生成透视表与图表。")}
              </p>
            </div>
          )}

          {/* 4 Dropzones Grid with Independent Scroll */}
          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 max-h-[280px] md:max-h-none md:flex-1 md:min-h-0 content-start items-start auto-rows-max">
            {zoneConfigs.map((z) => {
              const items = pivotConfig?.[z.key] || [];
              const isOver = dragOverZone === z.key;
              return (
                <div
                  key={z.key}
                  data-testid={`zone-${z.key}`}
                  role="group"
                  aria-label={t(z.label)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverZone?.(z.key); }}
                  onDragLeave={() => setDragOverZone?.(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverZone?.(null);
                    let payload = draggingPayload;
                    try {
                      const serialized = e.dataTransfer.getData('application/x-pivot-field');
                      if (serialized) payload = JSON.parse(serialized);
                    } catch { /* Ignore unrelated external drags. */ }
                    const isCustom = Boolean(payload?.isCalculated || payload?.source === 'customMetric');
                    if (!isCustom && !currentDataset?.fields?.some((field) => field.name === payload?.field)) return;
                    if (payload?.field) {
                      if (isCustom) {
                        if (z.key === 'values') {
                          const metricSpec = payload.metric || payload;
                          const currentVals = pivotConfig?.values || [];
                          const exists = currentVals.some((v) => v.id === metricSpec.id || (v.isCalculated && v.field === metricSpec.field));
                          if (exists) {
                            showToast?.(`数值指标已存在「${metricSpec.field}」`);
                          } else {
                            soundEngine?.playClick?.(560);
                            setPivotConfig?.((prev) => ({
                              ...prev,
                              values: [
                                ...(prev.values || []),
                                {
                                  ...metricSpec,
                                  id: metricSpec.id || `v_calc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                                  isCalculated: true,
                                  agg: 'calc',
                                  showAs: metricSpec.showAs || 'normal',
                                },
                              ],
                            }));
                            showToast?.(`已添加自定义指标「${metricSpec.field}」到数值指标`);
                          }
                        } else {
                          showToast?.('自定义计算指标仅支持放置于数值指标（值）区域', 'error');
                        }
                        setDraggingPayload?.(null);
                        return;
                      }
                      if (payload.source && payload.source !== 'fieldList' && payload.source !== z.key && payload.itemId) {
                        const targetList = pivotConfig?.[z.key] || [];
                        const fMeta = currentDataset?.fields?.find((f) => f.name === payload.field);
                        if (z.key !== 'values' && fMeta?.type !== 'date' && targetList.some((it) => it.field === payload.field)) {
                          showToast?.(`目标区域已存在「${payload.field}」`, 'error');
                          setDraggingPayload?.(null);
                          return;
                        }
                      }
                      if (payload.source !== z.key) {
                        addFieldToZone?.(z.key, payload.field, payload);
                      }
                    }
                    setDraggingPayload?.(null);
                  }}
                  className={`shrink-0 min-h-[56px] min-w-0 p-1.5 rounded-lg border ${z.borderAccent} apple-transition flex flex-col gap-1 ${
                    isOver
                      ? 'border-[#F92672] bg-[#F92672]/10 scale-[1.01]'
                      : 'border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7]/90 dark:bg-[#1E1F1C]/90'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold shrink-0 gap-1">
                    <span className={z.badgeColor}>{t(z.label)}</span>
                    <div className="flex items-center gap-1">
                      {z.key === 'values' && onOpenMetricCenter && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={onOpenMetricCenter}
                          className="inline-flex items-center justify-center px-1.5 py-0.5 min-h-[32px] md:min-h-[24px] min-w-[32px] md:min-w-[24px] rounded bg-[#AE81FF]/15 hover:bg-[#AE81FF]/30 text-ink-purple text-[9.5px] font-bold transition disabled:opacity-40"
                          title={t("打开指标中心，新建自定义计算指标")}
                        >
                          {t("+自定义")}
                        </button>
                      )}
                      <span className="text-ink-muted text-[10px]">[{items.length}]</span>
                    </div>
                  </div>

                                    <div className="min-w-0 space-y-1 flex-1">
                    {items.length === 0 ? (
                      <div className="py-1 px-1 border border-dashed border-[#D6D4C8]/70 dark:border-[#3E3D32]/70 rounded text-center select-none flex flex-col items-center justify-center gap-1">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-ink-muted font-semibold block">
                            {t({
                              filters: '拖入或点击 +筛',
                              columns: '拖入或点击 +列',
                              rows: '拖入或点击 +行',
                              values: '拖入或点击 +值',
                            }[z.key])}
                          </span>
                          <span className="text-[8.5px] text-ink-muted/65 block">
                            {t({
                              filters: '例如只看华东或线上渠道',
                              columns: '例如按年份或月份并排比较',
                              rows: '例如按地区或类别列出',
                              values: '例如销售额求和、记录数',
                            }[z.key])}
                          </span>
                        </div>
                        {z.key === 'values' && (pivotConfig?.rows?.length || 0) > 0 && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine?.playClick?.(540);
                              addFieldToZone?.('values', '__COUNT__');
                              showToast?.('已添加「记录数」到数值指标');
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#FD971F]/15 hover:bg-[#FD971F]/30 text-ink-orange text-[9px] font-bold apple-font-mono transition inline-flex items-center gap-0.5"
                            title={t("一键统计记录数")}
                          >
                            <span>{t("+ 统计记录数")}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      items.map((it, itemIdx) => {
                        const fMeta = currentDataset?.fields?.find((f) => f.name === it.field);
                        const isFiltered =
                          z.key === 'filters'
                            ? (it.excludeAll || (it.selectedValues && it.selectedValues.length > 0))
                            : (it.excludedValues && it.excludedValues.length > 0);
                        const valueHint = z.key === 'values' ? getValueMeasureHint(it) : null;
                        return (
                          <div
                            key={it.id}
                            draggable={!isReadOnly}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              const payload = { source: z.key, field: it.field, itemId: it.id, index: itemIdx };
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('application/x-pivot-field', JSON.stringify(payload));
                              e.dataTransfer.setData('text/plain', it.field);
                              setDraggingPayload?.(payload);
                            }}
                            onDragEnd={() => {
                              setDraggingPayload?.(null);
                              setDragOverZone?.(null);
                            }}
                            data-testid="configured-field"
                            className="min-w-0 flex flex-col gap-1 p-1.5 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs font-medium cursor-grab active:cursor-grabbing hover:border-[#F92672] transition"
                          >
                            <div className="flex items-start gap-1.5 min-w-0">
                              <GripVertical className="w-3 h-3 mt-0.5 text-ink-muted shrink-0" />
                              <span
                                data-testid="configured-field-name"
                                className="min-w-0 leading-5 break-words [overflow-wrap:anywhere] text-[#272822] dark:text-[#F8F8F2]"
                                title={z.key === 'rows' || z.key === 'columns' ? getDimDisplayLabel(it) : it.field}
                              >
                                {it.field === '__COUNT__' ? t('记录数') : z.key === 'rows' || z.key === 'columns' ? getDimDisplayLabel(it) : it.field}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1 min-w-0 whitespace-nowrap">
                              {/* Left Controls: Zone-specific configuration */}
                              <div className="flex items-center gap-1 min-w-0 shrink-0">
                                {z.key === 'filters' && (
                                  <button
                                    onClick={() => {
                                      setHeaderFilterSearch?.('');
                                      setActiveHeaderFilterModal?.({ zone: 'filters', dim: it });
                                    }}
                                    className={`px-1 py-0.2 rounded text-[11px] font-semibold apple-font-mono transition shrink-0 ${
                                      isFiltered
                                        ? 'bg-[#A6E22E]/20 text-ink-green border border-[#A6E22E]/30'
                                        : 'bg-black/[0.05] dark:bg-[#3E3D32] text-ink-muted hover:text-[#66D9EF]'
                                    }`}
                                    title={isFiltered ? `已选${it.excludeAll ? 0 : it.selectedValues.length}项` : '全部'}
                                  >
                                    {isFiltered ? `${it.excludeAll ? 0 : it.selectedValues.length}项` : t("全部")}
                                  </button>
                                )}

                                {z.key === 'values' && (
                                  <div className="flex items-center gap-1 min-w-0 shrink-0">
                                    {it.isCalculated ? (
                                      <button
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => onEditCustomMetric ? onEditCustomMetric(it.id) : onOpenMetricCenter?.()}
                                        className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#AE81FF]/20 hover:bg-[#AE81FF]/35 text-ink-purple text-[9.5px] font-bold apple-font-mono transition shrink-0"
                                        title={it.formula ? `${t("点击编辑公式:")} ${it.formula}` : t("点击在指标中心编辑该复合计算度量")}
                                      >
                                        FX 公式
                                      </button>
                                    ) : (
                                      <select
                                        disabled={isReadOnly || it.field === '__COUNT__'}
                                        value={it.agg}
                                        onChange={(e) => {
                                          const nextAgg = e.target.value;
                                          setPivotConfig?.((prev) => ({
                                            ...prev,
                                            values: prev.values.map((v) => (v.id === it.id ? { ...v, agg: nextAgg } : v)),
                                          }));
                                        }}
                                        className="bg-transparent text-ink-orange apple-font-mono font-bold focus:outline-none cursor-pointer disabled:opacity-40 text-[11px] shrink-0"
                                        title={
                                          it.agg === 'avg'
                                            ? t('均值是各记录的算术平均，不是加权业务比率')
                                            : t('切换聚合口径')
                                        }
                                        aria-label={t("切换聚合口径")}
                                      >
                                        {AGG_METHODS.filter((m) => {
                                          if (it.field === '__COUNT__') return m.value === 'count';
                                          const fMeta = currentDataset?.fields?.find((f) => f.name === it.field);
                                          const isNumeric = fMeta?.type === 'number';
                                          if (!isNumeric && ['sum', 'avg', 'median', 'stddev', 'max', 'min'].includes(m.value)) return false;
                                          return true;
                                        }).map((m) => (
                                          <option key={m.value} value={m.value} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t(m.short)}</option>
                                        ))}
                                      </select>
                                    )}
                                    <select
                                      disabled={isReadOnly}
                                      value={it.showAs || 'normal'}
                                      onChange={(e) => {
                                        const nextShowAs = e.target.value;
                                        setPivotConfig?.((prev) => ({
                                          ...prev,
                                          values: prev.values.map((v) => (v.id === it.id ? { ...v, showAs: nextShowAs } : v)),
                                        }));
                                      }}
                                      className={`text-[11px] rounded px-0.5 py-0.2 apple-font-mono font-semibold focus:outline-none cursor-pointer disabled:opacity-40 border transition shrink-0 ${
                                        it.showAs && it.showAs !== 'normal'
                                          ? 'bg-[#AE81FF]/20 text-ink-purple border-[#AE81FF]/40'
                                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-ink-muted border-transparent'
                                      }`}
                                      title={
                                        getValueMeasureHint({ ...it, agg: 'sum' }) ||
                                        t('快捷表计算 (普通值 / 占总计% / 占行% / 占列% / 环比差 / 环比增长率 / 累计求和)')
                                      }
                                      aria-label={t("快捷表计算")}
                                    >
                                      <option value="normal" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("普通")}</option>
                                      <option value="pct_grand" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%总计")}</option>
                                      <option value="pct_row" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%行")}</option>
                                      <option value="pct_col" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%列")}</option>
                                      <option value="prev_diff" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("环比差")}</option>
                                      <option value="pct_prev_diff" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("环比%")}</option>
                                      <option value="running_total" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("累计Σ")}</option>
                                    </select>
                                  </div>
                                )}

                                {(z.key === 'rows' || z.key === 'columns') && (fMeta?.type === 'date' || fMeta?.type === 'number') && (
                                  <button
                                    disabled={isReadOnly}
                                    onClick={() => {
                                      setBinFormState?.(it.numberBin || { start: 0, step: 50000 });
                                      setActiveBinModal?.({ zone: z.key, item: it, fieldType: fMeta.type });
                                    }}
                                    className="px-1 rounded bg-[#66D9EF]/15 text-ink-cyan text-[11px] hover:underline disabled:opacity-40 apple-font-mono shrink-0"
                                    title={t("分组设置")}
                                  >{' ' + t("组") + ' '}</button>
                                )}

                                {(z.key === 'rows' || z.key === 'columns') && (
                                  <button
                                    onClick={() => toggleDimensionSort?.(z.key, it.id)}
                                    className={`hover:text-[#F92672] transition shrink-0 ${it.sort && it.sort !== 'none' ? 'text-ink-pink' : 'text-ink-muted'}`}
                                    title={`维度分类排序: ${it.sort === 'asc' ? 'A-Z 升序' : it.sort === 'desc' ? 'Z-A 降序' : '默认顺序'} (点击切换)`}
                                    aria-label={t("排序")}
                                  >
                                    {it.sort === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : it.sort === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUpDown className="w-2.5 h-2.5" />}
                                  </button>
                                )}

                                {(z.key === 'rows' || z.key === 'columns' || z.key === 'filters') && (
                                  <div className="inline-flex items-center gap-0.5 shrink-0">
                                    <button
                                      onClick={() => {
                                        setHeaderFilterSearch?.('');
                                        setActiveHeaderFilterModal?.({ zone: z.key, dim: it });
                                      }}
                                      className={`hover:text-[#A6E22E] transition shrink-0 ${isFiltered ? 'text-ink-green' : 'text-ink-muted'}`}
                                      title={isFiltered ? t("已过滤: 仅包含部分项目 (点击修改)") : t("勾选筛选值")}
                                      aria-label={t("筛选值")}
                                    >
                                      <Filter className="w-2.5 h-2.5" />
                                    </button>
                                    {isFiltered && (
                                      <span className="px-0.5 py-0.2 rounded bg-[#A6E22E]/20 text-ink-green text-[8px] font-bold apple-font-mono">
                                        {t("已滤")}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Right Controls: Order & Removal */}
                              <div className="flex items-center gap-1 shrink-0 ml-auto">
                                {!isReadOnly && items.length > 1 && (
                                  <span className="inline-flex items-center text-[11px] text-ink-muted shrink-0">
                                    {itemIdx > 0 && (
                                      <button onClick={() => moveZoneItem?.(z.key, itemIdx, -1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2] px-0.5" title={t("前移")}>↑</button>
                                    )}
                                    {itemIdx < items.length - 1 && (
                                      <button onClick={() => moveZoneItem?.(z.key, itemIdx, 1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2] px-0.5" title={t("后移")}>↓</button>
                                    )}
                                  </span>
                                )}

                                {!isReadOnly && (
                                  <button
                                    onClick={() => removeZoneItem?.(z.key, it.id)}
                                    className="text-ink-muted hover:text-[#F92672] p-0.5 rounded transition shrink-0"
                                    title={t("移除字段")}
                                    aria-label={t("移除字段")}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {valueHint ? (
                              <p
                                data-testid="value-measure-hint"
                                className="pl-4 text-[8.5px] leading-snug text-ink-muted/80 whitespace-normal"
                              >
                                {valueHint}
                              </p>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}
