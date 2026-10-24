import { t } from '../../../i18n.js';
import React from 'react';
import {
  BarChart3, Sliders, Maximize2, Minimize2, X, BookOpen, Sparkles, Pencil, Plus, Copy,
  Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, RotateCcw, Trash2,
  Filter, Search, Layers, TrendingUp, Tag, ChevronDown, Check, Lightbulb, Compass
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine,
  LabelList, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import {
  CHART_COLORS,
  VISUAL_CHART_TYPES,
  KEYNOTE_STORYBOARD_SHOTS,
  CHART_INTENT_GROUPS,
  CHART_METHOD_GUIDES,
  AGG_METHODS,
} from '../../../constants/pivotConstants';
import { UnifiedFormatter, formatAxisTickLabel, formatCellNumber } from '../../../utils/formatters';
import { isMeasureField, isIdentifierField, getMeasureDefaults } from '../../../utils/fieldSemantics';
import { UnifiedChartTooltip } from './UnifiedChartTooltip';
import { renderSmartPieLabel, renderSmartBarLabel } from './SmartChartLabels';
import { StoryShotDialog } from './modals/StoryShotDialog';

export function ChartStudio({
  chartType,
  setChartType,
  unifiedChartSpec,
  pivotResult,
  chartSpecConfig,
  setChartSpecConfig,
  darkMode,
  isChartFullscreen,
  setIsChartFullscreen,
  showChartStudioPopover,
  setShowChartStudioPopover,
  highlightedRowKey,
  onClearHighlight,
  handleChartPointClick,
  setDrillDownModal,
  setDrillSearch,
  setDrillPage,
  applyKeynoteShot,
  keynoteShotIdx,
  soundEngine,
  requestDrillDown,
  storyShots,
  onSaveCurrentViewAsShot,
  onUpdateStoryShot,
  onDeleteStoryShot,
  onResetStoryShots,
  hasCustomStoryShots = false,
  pivotConfig,
  setPivotConfig,
  addFieldToZone,
  removeZoneItem,
  onAddRecordCount,
  onAddMeasure,
  currentDataset,
  showToast,
  copyTextToClipboard,
  isReadOnly = false,
  viewMode,
  onExportPNG,
  onExportSVG,
}) {
  const [showChartTypes, setShowChartTypes] = React.useState(false);
  const [showLensPresets, setShowLensPresets] = React.useState(false);
  const [guideCollapsedInChartMode, setGuideCollapsedInChartMode] = React.useState(false);
  const [showGuideInSplitMode, setShowGuideInSplitMode] = React.useState(false);
  const [activeRecipePopover, setActiveRecipePopover] = React.useState(null); // 'row' | 'col' | 'val' | null
  const [isEditingNote, setIsEditingNote] = React.useState(false);
  const [editNoteForm, setEditNoteForm] = React.useState({ title: '', subtitle: '' });
  const [isSavingNewNote, setIsSavingNewNote] = React.useState(false);
  const [newNoteForm, setNewNoteForm] = React.useState({ title: '', subtitle: '' });
  const [compactAxis, setCompactAxis] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [popoverPlacement, setPopoverPlacement] = React.useState('bottom');

  React.useEffect(() => {
    const measure = () => setCompactAxis(window.innerWidth < 640);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Display categorical axis ticks with complete visibility and adaptive rotation.
  const shouldRotateTicks = React.useMemo(() => {
    const items = unifiedChartSpec.items || [];
    if (items.length > 4) return true;
    return items.some((it) => String(it?.name || '').length > 6);
  }, [unifiedChartSpec.items]);

  const barAxisMaxLabels = compactAxis ? 12 : 25;
  const barTickInterval = (unifiedChartSpec.items?.length || 0) <= barAxisMaxLabels
    ? 0
    : Math.max(0, Math.ceil((unifiedChartSpec.items?.length || 0) / barAxisMaxLabels) - 1);

  const generalAxisMaxLabels = compactAxis ? 8 : 18;
  const generalTickInterval = (unifiedChartSpec.items?.length || 0) <= generalAxisMaxLabels
    ? 0
    : Math.max(0, Math.ceil((unifiedChartSpec.items?.length || 0) / generalAxisMaxLabels) - 1);

  const renderCategoryAxisTick = React.useCallback((props) => {
    const { x, y, payload } = props;
    const fullText = String(payload?.value ?? '');
    const maxLen = compactAxis ? 12 : 22;
    const displayText = formatAxisTickLabel(fullText, maxLen);

    if (!shouldRotateTicks) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={14}
            textAnchor="middle"
            fontSize={compactAxis ? 9 : 9.5}
            fill={darkMode ? '#908E80' : '#75715E'}
            className="select-none"
          >
            <title>{fullText}</title>
            {displayText}
          </text>
        </g>
      );
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dx={-4}
          dy={10}
          textAnchor="end"
          transform="rotate(-35)"
          fontSize={compactAxis ? 9 : 9.5}
          fill={darkMode ? '#908E80' : '#75715E'}
          className="select-none"
        >
          <title>{fullText}</title>
          {displayText}
        </text>
      </g>
    );
  }, [compactAxis, darkMode, shouldRotateTicks]);

  const allowsMetricDecimals = (metric) =>
    chartType.startsWith('pct_') || metric?.showAs?.startsWith('pct_') || !['count', 'count_distinct'].includes(metric?.agg);
  const zeroBaselineDomain = [(min) => Math.min(0, min), (max) => Math.max(0, max)];
  const analysisShots = (storyShots && storyShots.length > 0) ? storyShots : KEYNOTE_STORYBOARD_SHOTS;
  const activeShot = analysisShots[keynoteShotIdx] || analysisShots[0] || KEYNOTE_STORYBOARD_SHOTS[0];
  const methodGuide = CHART_METHOD_GUIDES[chartType] || CHART_METHOD_GUIDES.bar;
  const isGuideOpen = viewMode === 'chart' && !isChartFullscreen ? !guideCollapsedInChartMode : showGuideInSplitMode;

  const recommendedChartType = React.useMemo(() => {
    const xLabel = (unifiedChartSpec?.xDimensionLabel || '').toLowerCase();
    const isTemporal = /date|time|year|month|day|quarter|年|月|日|季|期/.test(xLabel);
    const itemCount = unifiedChartSpec?.items?.length || 0;
    const hasColGroups = unifiedChartSpec?.hasColGroups;
    const valCount = pivotResult?.valConfigs?.length || 0;

    if (isTemporal) return 'line';
    if (hasColGroups) return 'stacked_bar';
    if (valCount >= 2 && !hasColGroups) return 'scatter';
    if (itemCount <= 6 && itemCount >= 2 && unifiedChartSpec?.isPrimaryAdditive) return 'pie';
    return 'bar';
  }, [unifiedChartSpec, pivotResult?.valConfigs]);

  const isModifiedFromShot = React.useMemo(() => {
    if (!activeShot?.pivotOverride) return false;
    const po = activeShot.pivotOverride;
    if (po.chartType && po.chartType !== chartType) return true;
    if (po.rows && JSON.stringify(po.rows) !== JSON.stringify(pivotConfig?.rows || [])) return true;
    const shotCols = po.columns || po.cols || [];
    const configCols = pivotConfig?.columns || pivotConfig?.cols || [];
    if (JSON.stringify(shotCols) !== JSON.stringify(configCols)) return true;
    if (po.values) {
      const curValSummary = (pivotConfig?.values || []).map((v) => `${v.field}:${v.agg}`).join(',');
      const shotValSummary = (po.values || []).map((v) => `${v.field}:${v.agg}`).join(',');
      if (curValSummary !== shotValSummary) return true;
    }
    return false;
  }, [activeShot, chartType, pivotConfig]);

  const toggleGuide = () => {
    soundEngine?.playClick?.(530);
    if (viewMode === 'chart' && !isChartFullscreen) {
      setGuideCollapsedInChartMode((prev) => !prev);
    } else {
      setShowGuideInSplitMode((prev) => !prev);
    }
  };

  const candidateMeasureFields = React.useMemo(
    () => (currentDataset?.fields || []).filter((f) => isMeasureField(f) && !isIdentifierField(f.name)),
    [currentDataset]
  );
  const unusedMeasureFields = React.useMemo(() => {
    const usedNames = new Set((pivotResult?.valConfigs || []).map((vc) => vc.field));
    return candidateMeasureFields.filter((f) => !usedNames.has(f.name));
  }, [candidateMeasureFields, pivotResult?.valConfigs]);

  const candidateDimensionFields = React.useMemo(
    () => (currentDataset?.fields || []).filter((f) => f.role === 'dimension' || (!isMeasureField(f) && f.name !== '__COUNT__')),
    [currentDataset]
  );

  const showSecondaryMetricInSubtitle =
    (chartType === 'scatter' || chartType === 'combo' || unifiedChartSpec.hasDualAxis) &&
    unifiedChartSpec.secondarySeriesKey &&
    unifiedChartSpec.secondarySeriesKey !== unifiedChartSpec.primarySeriesKey;
  const hasValidMean = Number.isFinite(unifiedChartSpec.primaryStats?.mean) && (unifiedChartSpec.primaryStats?.validCount || 0) > 0;
  const insight = unifiedChartSpec.executiveInsight;

  const handleCopyConclusion = () => {
    soundEngine?.playClick?.(560);
    const configCols = pivotConfig?.columns || pivotConfig?.cols || [];
    const colSummary = configCols.map((c) => c.field || c).join(' / ');
    const lines = [
      `【${activeShot?.title || t('透视图分析笔记')}】`,
      activeShot?.subtitle ? `${t('核心结论：')}${activeShot.subtitle}` : '',
      insight
        ? `${t('数据摘要：')}${t('首位')}「${insight.topName}」(${insight.topFormatted}${insight.topSharePct ? `，${t('占')} ${insight.topSharePct}%` : ''})${insight.groupCount > 1 ? `；${t('末位')}「${insight.bottomName}」(${insight.bottomFormatted})；${t('均值')} ${insight.meanFormatted}（${t('高于均值')} ${insight.aboveMeanCount}/${insight.groupCount} ${t('组')}）` : ''}`
        : '',
      `透视配方：行/轴 [${unifiedChartSpec.xDimensionLabel || (pivotConfig?.rows?.map(r=>r.field||r).join(' / ')) || t('无')}] · 列/组 [${colSummary || t('无')}] · 度量 [${pivotConfig?.values?.length > 0 ? pivotConfig.values.map((v) => `${v.field}(${t(v.agg || 'sum')})`).join(', ') : unifiedChartSpec.primarySeriesKey}] · 图表 [${t(VISUAL_CHART_TYPES.find((item) => item.value === chartType)?.label || chartType)}]`,
    ].filter(Boolean);
    copyTextToClipboard?.(lines.join('\n'), t('已复制当前透视图分析笔记与结论摘要'));
  };

  const handleDrillTopLeader = () => {
    if (!insight?.topRowKey) return;
    soundEngine?.playTransitionChord ? soundEngine.playTransitionChord() : soundEngine?.playClick(560);
    const topItem = unifiedChartSpec.items?.find((it) => it.rowKey === insight.topRowKey);
    if (topItem) {
      handleChartPointClick(topItem);
    }
  };

  const handleSwapRowDimension = (newFieldName) => {
    if (isReadOnly || !setPivotConfig) return;
    soundEngine?.playClick?.(540);
    const fMeta = (currentDataset?.fields || []).find((f) => f.name === newFieldName);
    setPivotConfig((prev) => ({
      ...prev,
      rows: [{
        id: `r_${Date.now()}`,
        field: newFieldName,
        sort: 'none',
        dateGranularity: fMeta?.type === 'date' ? 'year' : 'raw',
        excludedValues: [],
      }],
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
    setActiveRecipePopover(null);
    showToast?.(`已将主分析维度切换为「${newFieldName}」`);
  };

  const handleSwapPrimaryMeasure = (newFieldName) => {
    if (isReadOnly || !setPivotConfig) return;
    soundEngine?.playClick?.(540);
    const fMeta = (currentDataset?.fields || []).find((f) => f.name === newFieldName);
    const defaults = getMeasureDefaults(fMeta);
    setPivotConfig((prev) => {
      const existing = (prev.values || []).filter((v) => v.field !== newFieldName);
      return {
        ...prev,
        values: [
          {
            id: `v_${Date.now()}`,
            field: newFieldName,
            showAs: 'normal',
            ...defaults,
          },
          ...existing,
        ],
      };
    });
    setActiveRecipePopover(null);
    showToast?.(`已将主度量指标切换为「${newFieldName}」`);
  };

  const handleAddColGroup = (newFieldName) => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(540);
    addFieldToZone?.('columns', newFieldName);
    setActiveRecipePopover(null);
    showToast?.(`已添加「${newFieldName}」为对比图例分组`);
  };

  const handleRemoveColGroup = (fieldOrId) => {
    if (isReadOnly || !setPivotConfig) return;
    soundEngine?.playClick?.(440);
    setPivotConfig((prev) => ({
      ...prev,
      columns: (prev.columns || []).filter((c) => c.id !== fieldOrId && c.field !== fieldOrId),
      collapsedColKeys: {},
    }));
    setActiveRecipePopover(null);
    showToast?.(`已移除列对比分组`);
  };

  // Smart Context-Aware Next-Step Analytical Recommendations
  const smartSuggestions = React.useMemo(() => {
    const suggestions = [];
    if (insight?.topName && insight?.topRowKey) {
      suggestions.push({
        id: 'drill_leader',
        icon: Search,
        label: `${t("穿透明细:")}「${insight.topName}」`,
        title: t("一键穿透查看领跑项底层原始订单明细"),
        action: handleDrillTopLeader,
      });
    }
    if (chartSpecConfig.sortMode === 'none' && (unifiedChartSpec.items?.length || 0) > 2) {
      suggestions.push({
        id: 'sort_desc',
        icon: ArrowDown,
        label: t("一键帕累托降序"),
        title: t("按主指标从高到低排列，快速识别头部高价值分组"),
        action: () => {
          soundEngine?.playClick?.(520);
          setChartSpecConfig((p) => ({ ...p, sortMode: 'desc' }));
          showToast?.(t("已按主指标降序排列图表"));
        },
      });
    }
    if ((unifiedChartSpec?.availableGroupCount || 0) > 5 && !chartSpecConfig.topN) {
      suggestions.push({
        id: 'focus_top5',
        icon: Sparkles,
        label: t("聚焦 Top 5 核心分组"),
        title: t("截断长尾分组，聚焦展示排名前 5 的核心主体"),
        action: () => {
          soundEngine?.playClick?.(500);
          setChartSpecConfig((p) => ({ ...p, topN: 5 }));
          showToast?.(t("已聚焦展示 Top 5 核心分组"));
        },
      });
    }
    const xLabel = (unifiedChartSpec?.xDimensionLabel || '').toLowerCase();
    const isTemporal = /date|time|year|month|day|quarter|年|月|日|季|期/.test(xLabel);
    if (isTemporal && chartType !== 'line') {
      suggestions.push({
        id: 'switch_line',
        icon: TrendingUp,
        label: t("切换时序趋势折线图"),
        title: t("当前维度为时间序列，折线图更能直观呈现增速与拐点"),
        action: () => {
          soundEngine?.playClick?.(540);
          setChartType('line');
          showToast?.(t("已切换为趋势折线图"));
        },
      });
    }
    if (unusedMeasureFields.length > 0 && chartType !== 'combo' && chartType !== 'scatter') {
      const candidate = unusedMeasureFields[0];
      suggestions.push({
        id: 'add_measure',
        icon: Plus,
        label: `${t("对比指标:")}「${candidate.name}」`,
        title: `${t("添加指标")}「${candidate.name}」${t("形成多指标同屏对比")}`,
        action: () => {
          if (onAddMeasure) onAddMeasure(candidate.name);
        },
      });
    }
    if (!chartSpecConfig.showAvgReferenceLine && hasValidMean) {
      suggestions.push({
        id: 'show_avg',
        icon: TrendingUp,
        label: t("开启全图均值基准线"),
        title: t("在图表中添加一条橙色均值虚线，直观衡量哪些分组高于或低于均值"),
        action: () => {
          soundEngine?.playClick?.(520);
          setChartSpecConfig((p) => ({ ...p, showAvgReferenceLine: true }));
          showToast?.(t("已开启均值基准线"));
        },
      });
    }
    return suggestions.slice(0, 4);
  }, [insight, chartSpecConfig, unifiedChartSpec, chartType, unusedMeasureFields, hasValidMean, onAddMeasure, setChartType, setChartSpecConfig, showToast, soundEngine, handleDrillTopLeader]);

  const configRows = pivotConfig?.rows || [];
  const configCols = pivotConfig?.columns || pivotConfig?.cols || [];
  const configValues = pivotConfig?.values || [];
  const rowSummary = unifiedChartSpec.xDimensionLabel || configRows.map((r) => r.field || r).join(' / ') || t('无');
  const colSummary = configCols.map((c) => c.field || c).join(' / ');
  const valSummary = configValues.length > 0
    ? configValues.map((v) => `${v.field === '__COUNT__' ? t('记录数') : v.field}(${t(v.agg || 'sum')})`).join(', ')
    : unifiedChartSpec.primarySeriesKey;

  return (
    <div data-highlighted-row={highlightedRowKey || ''} className="flex-1 flex flex-col h-full min-h-0">
      {/* Chart Subpage Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <h2 className="text-xs font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2] flex flex-wrap items-center gap-2 apple-font-mono">
            <BarChart3 className="w-4 h-4 text-ink-pink" />
            <span>{t(VISUAL_CHART_TYPES.find((type) => type.value === chartType)?.label || chartType)}</span>
            {chartType === recommendedChartType ? (
              <span className="px-1.5 py-0.5 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/30 text-[9px] font-semibold" title={t("根据当前维度与度量特征推荐的最佳图表类型")}>
                ★ {t("最适图表")}
              </span>
            ) : methodGuide?.intent ? (
              <span className="px-1.5 py-0.5 rounded bg-[#66D9EF]/15 text-ink-cyan border border-[#66D9EF]/30 text-[9px] font-semibold">
                {t(methodGuide.intent)}
              </span>
            ) : null}
            {chartType !== recommendedChartType && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick?.(540);
                  setChartType(recommendedChartType);
                  showToast?.(`已切换为最适图表「${t(VISUAL_CHART_TYPES.find((item) => item.value === recommendedChartType)?.label || recommendedChartType)}」`);
                }}
                className="px-1.5 py-0.5 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/35 text-[9px] font-semibold hover:bg-[#A6E22E]/25 transition flex items-center gap-1 cursor-pointer"
                title={t("一键切换为根据当前字段特征推荐的最适图表类型")}
              >
                <span>💡 {t("推荐:")} {t(VISUAL_CHART_TYPES.find((item) => item.value === recommendedChartType)?.short || recommendedChartType)}</span>
              </button>
            )}
            {unifiedChartSpec.derivedSeriesKey && (
              chartType === 'line' ? (
                <span className="px-1.5 py-0.5 rounded bg-[#AE81FF]/20 text-ink-purple text-[9px]">
                  +{unifiedChartSpec.derivedSeriesKey}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  title={t("衍生分析序列仅在趋势折线图中绘制，点击切换至折线图")}
                  className="px-1.5 py-0.5 rounded bg-[#AE81FF]/15 text-ink-purple border border-[#AE81FF]/35 text-[9px] hover:border-[#AE81FF]"
                >
                  +{unifiedChartSpec.derivedSeriesKey} ({t("切至折线图生效")})
                </button>
              )
            )}
          </h2>
          <p className="text-[10px] text-ink-muted mt-0.5 apple-font-mono flex flex-wrap items-center gap-2">
            <span>
              {t("维度：")}{unifiedChartSpec.xDimensionLabel}
              {' ' + t("· 指标：")}{unifiedChartSpec.primarySeriesKey}
              {showSecondaryMetricInSubtitle ? ` × ${unifiedChartSpec.secondarySeriesKey}` : ''}
            </span>
            {chartSpecConfig.sortMode !== 'none' && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick(500);
                  setChartSpecConfig((p) => ({ ...p, sortMode: 'none' }));
                }}
                className="px-1.5 py-0.2 rounded bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/30 text-[9px] font-semibold hover:bg-[#A6E22E]/25 inline-flex items-center gap-0.5 cursor-pointer"
                title={t("点击清除排序并恢复默认透视表顺序")}
              >
                <span>{chartSpecConfig.sortMode === 'desc' ? t('降序') : t('升序')}</span>
                <span className="text-[8px] opacity-70">✕</span>
              </button>
            )}
            {(chartSpecConfig.topN || 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick(500);
                  setChartSpecConfig((p) => ({ ...p, topN: 0 }));
                }}
                className="px-1.5 py-0.2 rounded bg-action/15 text-action border border-action/30 text-[9px] font-semibold hover:bg-action/25 inline-flex items-center gap-0.5 cursor-pointer"
                title={t("点击取消 TopN 限制并显示全部分组")}
              >
                <span>Top {chartSpecConfig.topN}</span>
                <span className="text-[8px] opacity-70">✕</span>
              </button>
            )}
            {chartSpecConfig.derivedSeries && chartSpecConfig.derivedSeries !== 'none' && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick(500);
                  setChartSpecConfig((p) => ({ ...p, derivedSeries: 'none' }));
                }}
                className="px-1.5 py-0.2 rounded bg-[#AE81FF]/15 text-ink-purple border border-[#AE81FF]/30 text-[9px] font-semibold hover:bg-[#AE81FF]/25 inline-flex items-center gap-0.5 cursor-pointer"
                title={t("点击取消衍生分析序列")}
              >
                <span>+{chartSpecConfig.derivedSeries}</span>
                <span className="text-[8px] opacity-70">✕</span>
              </button>
            )}
            {!unifiedChartSpec.canStack && (chartType === 'stacked_bar' || chartType === 'stacked_area') && (
              <span className="px-1.5 py-0.2 rounded bg-[#FD971F]/15 text-ink-orange border border-[#FD971F]/30 text-[9px]">{' ' + t("量纲不同已自动按分组呈现") + ' '}</span>
            )}
            {highlightedRowKey && onClearHighlight && (
              <button
                type="button"
                onClick={() => onClearHighlight()}
                className="px-1.5 py-0.5 rounded bg-[#FD971F]/15 text-ink-orange border border-[#FD971F]/40 text-[9px] font-semibold hover:bg-[#FD971F]/25"
              >
                {t("已聚焦:")} {formatAxisTickLabel(highlightedRowKey.replace(/\|\|/g, '/'), 12)} ×
              </button>
            )}
          </p>
        </div>

        {/* Action Controls Cluster */}
        <div className="flex flex-wrap items-center gap-1.5 relative apple-font-mono">
          {/* Quick Sort Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick(520);
              const nextSort = chartSpecConfig.sortMode === 'none' ? 'desc' : chartSpecConfig.sortMode === 'desc' ? 'asc' : 'none';
              setChartSpecConfig((p) => ({ ...p, sortMode: nextSort }));
              showToast?.(nextSort === 'desc' ? t('已按主指标降序排列图表') : nextSort === 'asc' ? t('已按主指标升序排列图表') : t('图表已恢复默认顺序'));
            }}
            title={t("一键切换图表内主指标排序（默认 / 降序 / 升序）")}
            aria-label={t("图表排序")}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 transition ${
              chartSpecConfig.sortMode !== 'none'
                ? 'bg-[#A6E22E]/15 text-ink-green border-[#A6E22E]/40'
                : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]'
            }`}
          >
            {chartSpecConfig.sortMode === 'desc' ? (
              <>
                <ArrowDown className="w-3 h-3 text-ink-pink" />
                <span>{t("降序")}</span>
              </>
            ) : chartSpecConfig.sortMode === 'asc' ? (
              <>
                <ArrowUp className="w-3 h-3 text-ink-green" />
                <span>{t("升序")}</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3 h-3 opacity-60" />
                <span>{t("排序")}</span>
              </>
            )}
          </button>

          {/* Quick TopN focus chip (when group count > 5) */}
          {(unifiedChartSpec?.availableGroupCount || 0) > 5 && (
            <div className="hidden sm:inline-flex items-center rounded-md p-0.5 bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9.5px]">
              {[
                { n: 0, label: '全部' },
                { n: 5, label: 'Top5' },
                { n: 10, label: 'Top10' },
              ].map((item) => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick(500);
                    setChartSpecConfig((p) => ({ ...p, topN: item.n }));
                    showToast?.(item.n ? `图表已聚焦展示 ${item.label}` : '图表已展示全部分组');
                  }}
                  aria-pressed={(chartSpecConfig.topN || 0) === item.n}
                  className={`px-1.5 py-0.5 rounded font-semibold transition ${
                    (chartSpecConfig.topN || 0) === item.n
                      ? 'bg-action text-[#F8F8F2] shadow-2xs'
                      : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
          )}

          {/* Quick Data Labels Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick?.(520);
              setChartSpecConfig((p) => ({ ...p, showDataLabels: !p.showDataLabels }));
              showToast?.(chartSpecConfig.showDataLabels ? t('已隐藏数值标签') : t('已显示数值标签'));
            }}
            title={t("一键开启/隐藏图表柱体与节点上的数值标签")}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 transition ${
              chartSpecConfig.showDataLabels
                ? 'bg-[#66D9EF]/15 text-ink-cyan border-[#66D9EF]/45'
                : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>{chartSpecConfig.showDataLabels ? t("数值开") : t("数值")}</span>
          </button>

          {/* Quick Avg Reference Line Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick?.(520);
              setChartSpecConfig((p) => ({ ...p, showAvgReferenceLine: !p.showAvgReferenceLine }));
              showToast?.(chartSpecConfig.showAvgReferenceLine ? t('已隐藏均值参考线') : t('已显示均值参考线'));
            }}
            title={t("一键开启/隐藏图中全局均值参考基准线 (AVG)")}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 transition ${
              chartSpecConfig.showAvgReferenceLine
                ? 'bg-[#FD971F]/15 text-ink-orange border-[#FD971F]/45'
                : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#FD971F]'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>{chartSpecConfig.showAvgReferenceLine ? t("均值开") : t("均值线")}</span>
          </button>

          {/* Chart Types Drawer Toggle */}
          <button
            type="button"
            aria-controls="pivot-chart-types"
            aria-expanded={showChartTypes}
            onClick={() => setShowChartTypes((open) => !open)}
            className={`px-2.5 py-1 rounded-md border text-[10.5px] font-semibold transition flex items-center gap-1 ${
              showChartTypes
                ? 'bg-action text-[#F8F8F2] border-action'
                : 'bg-[#EFECE1] dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]'
            }`}
          >
            <span>{t("图表类型")}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showChartTypes ? 'rotate-180' : ''}`} />
          </button>

          {/* Click Link Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick(560);
              setChartSpecConfig((p) => ({ ...p, clickLinkMode: p.clickLinkMode === 'filter' ? 'drill' : 'filter' }));
              showToast?.(chartSpecConfig.clickLinkMode === 'filter' ? t('图表点击已切换为穿透查看明细') : t('图表点击已切换为全局联动筛选'));
            }}
            title={chartSpecConfig.clickLinkMode === 'filter' ? t("当前模式：点击柱体将触发全局筛选；点击可切换为穿透查看明细") : t("当前模式：点击柱体将穿透查看底层明细；点击可切换为全局联动筛选")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border flex items-center gap-1 transition ${
              chartSpecConfig.clickLinkMode === 'filter'
                ? 'bg-[#FD971F]/15 text-ink-orange border-[#FD971F]/40'
                : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]'
            }`}
          >
            {chartSpecConfig.clickLinkMode === 'filter' ? <Filter className="w-3 h-3 text-ink-orange" /> : <Search className="w-3 h-3 text-ink-cyan" />}
            <span>{chartSpecConfig.clickLinkMode === 'filter' ? t("联动:筛选") : t("联动:下钻")}</span>
          </button>

          {/* Chart Specification Tuning Popover Button */}
          <button
            type="button"
            onClick={(e) => {
              soundEngine?.playClick(580);
              const rect = e.currentTarget.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              const spaceAbove = rect.top;
              setPopoverPlacement(spaceBelow < 340 && spaceAbove > spaceBelow ? 'top' : 'bottom');
              setShowChartStudioPopover((p) => !p);
            }}
            className="px-2.5 py-1 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[10px] font-semibold flex items-center gap-1 transition"
            title={t("图表规格微调 (TopN / 衍生序列 / 缺失值 / 标签)")}
          >
            <Sliders className="w-3 h-3 text-ink-cyan" />
            <span>{t("规格")}</span>
          </button>

          {/* Direct Image Export */}
          {(onExportPNG || onExportSVG) && (
            <div className="flex items-center rounded-md p-0.5 bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]">
              {onExportPNG && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick(620);
                    onExportPNG();
                  }}
                  title={t("直接导出当前高清图表为 PNG 图片")}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-ink-muted hover:text-ink-pink hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-0.5"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>PNG</span>
                </button>
              )}
              {onExportSVG && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick(620);
                    onExportSVG();
                  }}
                  title={t("直接导出当前矢量图表为 SVG 文件")}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-ink-muted hover:text-ink-green hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-0.5"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>SVG</span>
                </button>
              )}
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            data-chart-fullscreen-toggle
            onClick={() => {
              soundEngine?.playClick(600);
              setIsChartFullscreen((prev) => !prev);
            }}
            className="p-1.5 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:text-[#F92672] text-ink-muted"
            title={t("全屏切换")}
            aria-label={isChartFullscreen ? "退出图表全屏" : "图表全屏"}
          >
            {isChartFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Chart Specification Tuning Popover Content */}
          {showChartStudioPopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowChartStudioPopover(false)} />
              <div className={`absolute right-0 ${popoverPlacement === 'top' ? 'bottom-full mb-2' : 'top-9'} z-40 w-[min(21rem,calc(100vw-2rem))] max-h-[min(400px,calc(100vh-5rem))] overflow-y-auto p-4 rounded-xl bg-[#FFFDF7]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-2xl border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl space-y-3 text-xs animate-apple-modal`}>
                <div className="flex items-center justify-between border-b border-[#3E3D32]/50 pb-2">
                  <span className="font-bold text-[11px] text-ink-pink flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-ink-pink" />
                    <span>{t("图表规格与高级衍生分析")}</span>
                  </span>
                  <button onClick={() => setShowChartStudioPopover(false)} aria-label={t("关闭图表规格面板")} className="p-1 rounded hover:bg-white/10 text-ink-muted">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {pivotResult.valConfigs.length > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1">{t("主指标绑定:")}</label>
                      <select
                        aria-label={t("主指标绑定:")}
                        value={chartSpecConfig.primaryValueId || pivotResult.valConfigs[0]?.id || ''}
                        onChange={(e) => setChartSpecConfig((p) => ({ ...p, primaryValueId: e.target.value }))}
                        className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                      >
                        {pivotResult.valConfigs.map((vc) => (
                          <option key={vc.id} value={vc.id}>{vc.field} ({vc.agg})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1">{t("次轴/Y轴指标:")}</label>
                      <select
                        aria-label={t("次轴/Y轴指标:")}
                        value={chartSpecConfig.secondaryValueId || pivotResult.valConfigs[1]?.id || ''}
                        onChange={(e) => setChartSpecConfig((p) => ({ ...p, secondaryValueId: e.target.value }))}
                        className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                      >
                        {pivotResult.valConfigs.map((vc) => (
                          <option key={vc.id} value={vc.id}>{vc.field} ({vc.agg})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("图表内排序:")}</label>
                    <select
                      aria-label={t("图表内排序:")}
                      value={chartSpecConfig.sortMode}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, sortMode: e.target.value }))}
                      className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                    >
                      <option value="none">{t("保持透视表顺序")}</option>
                      <option value="desc">{t("按主指标降序")}</option>
                      <option value="asc">{t("按主指标升序")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("TopN 焦点截断:")}</label>
                    <select
                      aria-label={t("TopN 焦点截断:")}
                      value={chartSpecConfig.topN}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, topN: Number(e.target.value) }))}
                      className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                    >
                      <option value={0}>{t("显示全部")}</option>
                      <option value={3}>Top 3</option>
                      <option value={5}>Top 5</option>
                      <option value={8}>Top 8</option>
                      <option value={10}>Top 10</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("衍生分析序列:")}</label>
                    <select
                      aria-label={t("衍生分析序列:")}
                      value={chartSpecConfig.lineDerivedMetric}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, lineDerivedMetric: e.target.value }))}
                      className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                    >
                      <option value="none">{t("无衍生线")}</option>
                      <option value="cumulative">{t("累计运行总和")}</option>
                      <option value="ma3">{t("3期移动平均线")}</option>
                      <option value="mom_pct">{t("环比增长率(%)")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("缺失值处理策略:")}</label>
                    <select
                      aria-label={t("缺失值处理策略:")}
                      value={chartSpecConfig.missingValueMode}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, missingValueMode: e.target.value }))}
                      className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                    >
                      <option value="zero">{t("按 0 补齐 (Zero)")}</option>
                      <option value="connect">{t("断开连线 (Null)")}</option>
                      <option value="prev">{t("前值填充 (Prev)")}</option>
                    </select>
                  </div>
                </div>

                {chartType === 'histogram' && (
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("直方图分箱数量 (Bins):")}</label>
                    <select
                      aria-label={t("直方图分箱数量 (Bins):")}
                      value={chartSpecConfig.histogramBins}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, histogramBins: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                    >
                      <option value={0}>{t("自动分箱 (Sturges公式)")}</option>
                      <option value={4}>{t("4 个区间")}</option>
                      <option value={6}>{t("6 个区间")}</option>
                      <option value={8}>{t("8 个区间")}</option>
                      <option value={10}>{t("10 个区间")}</option>
                    </select>
                  </div>
                )}

                <label className="flex items-center justify-between pt-1 cursor-pointer text-[11px]">
                  <span className="text-ink-muted">{t("显示柱体/节点数值标签")}</span>
                  <input
                    type="checkbox"
                    checked={chartSpecConfig.showDataLabels}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, showDataLabels: e.target.checked }))}
                    className="rounded accent-[#F92672]"
                  />
                </label>

                <label className="flex items-center justify-between pt-1 cursor-pointer text-[11px]">
                  <span className="text-ink-muted">{t("显示全局均值参考线 (Avg)")}</span>
                  <input
                    type="checkbox"
                    checked={chartSpecConfig.showAvgReferenceLine}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, showAvgReferenceLine: e.target.checked }))}
                    className="rounded accent-[#F92672]"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Categorized Intent-Driven Chart Switcher Strip */}
      {showChartTypes && (
        <div
          id="pivot-chart-types"
          className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2 mb-2 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/70 apple-font-mono shrink-0 animate-fadeIn"
        >
          {CHART_INTENT_GROUPS.map((group) => (
            <div key={group.id} className="inline-flex items-center gap-1 bg-[#EFECE1]/45 dark:bg-[#1E1F1C]/60 px-1.5 py-0.5 rounded-lg border border-[#D6D4C8]/70 dark:border-[#3E3D32]">
              <span className="text-[9px] font-bold text-ink-cyan px-1 select-none" title={t(group.desc)}>
                {t(group.label)}:
              </span>
              {group.types.map((typeVal) => {
                const ct = VISUAL_CHART_TYPES.find((item) => item.value === typeVal);
                if (!ct) return null;
                const isRecommended = typeVal === recommendedChartType;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => {
                      soundEngine?.playWhoosh ? soundEngine.playWhoosh() : soundEngine?.playClick(540);
                      setChartType(ct.value);
                    }}
                    title={`${t(ct.label)} — ${t(CHART_METHOD_GUIDES[ct.value]?.purpose || '')}${isRecommended ? ` (${t("最适推荐")})` : ''}`}
                    className={`tactile-btn px-2 py-0.5 rounded text-[9.5px] font-semibold whitespace-nowrap transition inline-flex items-center gap-1 ${
                      chartType === ct.value
                        ? 'bg-action text-[#F8F8F2]'
                        : isRecommended
                        ? 'bg-[#A6E22E]/15 text-ink-green border border-[#A6E22E]/40 hover:bg-[#A6E22E]/25'
                        : 'bg-[#FFFDF7] dark:bg-[#272822] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                    }`}
                  >
                    <span>{t(ct.short)}</span>
                    {isRecommended && chartType !== ct.value && (
                      <span className="text-[8px] font-bold text-ink-green">★</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Disclaimers & Context Warnings */}
      {chartType === 'histogram' && unifiedChartSpec.histogramSummary && (
        <p data-testid="histogram-basis" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {unifiedChartSpec.histogramSummary.field} · {t('原始记录的数值分布')} · {t('有效样本：')}{unifiedChartSpec.histogramSummary.valid}/{unifiedChartSpec.histogramSummary.total} · {t('空值：')}{unifiedChartSpec.histogramSummary.missing} · {t('非数值：')}{unifiedChartSpec.histogramSummary.total - unifiedChartSpec.histogramSummary.valid - unifiedChartSpec.histogramSummary.missing}
        </p>
      )}
      {!['histogram', 'heatmap'].includes(chartType) && unifiedChartSpec.availableGroupCount > unifiedChartSpec.items.length && (
        <p data-testid="chart-scope" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {t('按当前排序展示')} {unifiedChartSpec.items.length}/{unifiedChartSpec.availableGroupCount} {t('个分组；占比以图中分组合计为分母。表格和总计仍包含全部筛选结果。')}
        </p>
      )}
      {chartType === 'funnel' && !unifiedChartSpec.chartIssue && (
        <p data-testid="funnel-basis" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {t('按当前图表顺序比较各项数值。“相对上项”仅为数值之比，不能据此判断用户转化率。')}
        </p>
      )}
      {chartType === 'combo' && !unifiedChartSpec.hasDualAxis && (
        <div data-testid="combo-guidance" className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-lg bg-[#A6E22E]/10 border border-[#A6E22E]/30 text-[10.5px] text-ink-green apple-font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-ink-orange shrink-0" />
            <span>{t("双轴复合图需两个指标形成对比（左轴看柱体，右轴看折线）。当前仅绑定 1 个主指标。")}</span>
          </span>
          <div className="flex items-center gap-2">
            {onAddMeasure && (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  soundEngine?.playClick(560);
                  onAddMeasure(unusedMeasureFields[0]?.name || '__COUNT__');
                }}
                className="px-2 py-0.5 rounded bg-[#A6E22E] text-[#1E1F1C] font-bold text-[9.5px] hover:opacity-90 transition"
              >
                + {t("补充右轴指标")}「{unusedMeasureFields[0]?.name || t("记录数")}」
              </button>
            )}
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className="px-2 py-0.5 rounded border border-[#A6E22E]/50 text-ink-green text-[9.5px] hover:bg-[#A6E22E]/20 transition"
            >
              {t("切换普通柱图")}
            </button>
          </div>
        </div>
      )}

      {/* Executive KPI Summary Strip (Cockpit Top-Line Metrics in Chart Mode / Fullscreen) */}
      {(viewMode === 'chart' || isChartFullscreen) && unifiedChartSpec.hasValues && unifiedChartSpec.items.length > 0 && !unifiedChartSpec.chartIssue && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 apple-font-mono shrink-0">
          {/* Card 1: Primary Grand Total */}
          <div
            className="px-2.5 py-1 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/80 border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-2 text-[10px] shadow-2xs"
            title={t("当前图表主指标汇总总额")}
          >
            <span className="w-2 h-2 rounded-full bg-ink-pink shrink-0" />
            <span className="text-ink-muted">{unifiedChartSpec.primarySeriesKey}:</span>
            <strong className="text-[#272822] dark:text-[#F8F8F2] font-mono">
              {UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: false })}
            </strong>
          </div>

          {/* Secondary Metric Cards (if multiple) */}
          {pivotResult.valConfigs.length > 1 &&
            pivotResult.valConfigs
              .filter((vc) => vc.id !== (chartSpecConfig.primaryValueId || pivotResult.valConfigs[0]?.id))
              .slice(0, 2)
              .map((vc) => {
                const grandVal = pivotResult.displayMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? null;
                const aggLabel = vc.isCalculated ? t('公式') : (AGG_METHODS.find((m) => m.value === vc.agg)?.short || vc.agg);
                return (
                  <button
                    key={vc.id}
                    type="button"
                    onClick={() => {
                      soundEngine?.playClick?.(540);
                      setChartSpecConfig((p) => ({ ...p, primaryValueId: vc.id }));
                      showToast?.(`已将主图指标切换为「${vc.field}」`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 hover:bg-[#EFECE1] dark:hover:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-cyan flex items-center gap-1.5 text-[10px] transition cursor-pointer shadow-2xs"
                    title={`${t("点击将主图切换为展示此指标：")}${vc.field}`}
                  >
                    <span className="text-ink-muted">{vc.field} ({aggLabel}):</span>
                    <strong className="text-ink-cyan font-mono">
                      {UnifiedFormatter.formatValue(grandVal, vc, { compact: false })}
                    </strong>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-ink-cyan/15 text-ink-cyan font-bold">{t("切为主图")}</span>
                  </button>
                );
              })}

          {/* Leader Card (if insight exists) */}
          {insight?.topName && (
            <button
              type="button"
              onClick={handleDrillTopLeader}
              className="px-2.5 py-1 rounded-lg bg-[#A6E22E]/10 hover:bg-[#A6E22E]/20 border border-[#A6E22E]/35 flex items-center gap-1.5 text-[10px] transition cursor-pointer shadow-2xs"
              title={t("领跑分组 · 点击直接穿透查看原始订单明细")}
            >
              <Sparkles className="w-3 h-3 text-ink-green shrink-0" />
              <span className="text-ink-muted">{t("首位领跑:")}</span>
              <strong className="text-ink-green">{insight.topName}</strong>
              <span className="text-ink-muted font-mono">
                ({insight.topFormatted}{insight.topSharePct ? ` · ${insight.topSharePct}%` : ''})
              </span>
              <Search className="w-2.5 h-2.5 text-ink-green opacity-70" />
            </button>
          )}

          {/* Benchmark Average Card */}
          {hasValidMean && (
            <div
              className="px-2.5 py-1 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/80 border border-[#D6D4C8] dark:border-[#3E3D32] flex items-center gap-1.5 text-[10px] shadow-2xs"
              title={t("全部分组计算的算术平均值基准")}
            >
              <TrendingUp className="w-3 h-3 text-ink-orange shrink-0" />
              <span className="text-ink-muted">{t("组均值:")}</span>
              <strong className="text-ink-orange font-mono">
                {insight?.meanFormatted || UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: false })}
              </strong>
              {insight?.aboveMeanCount !== undefined && (
                <span className="text-ink-muted">({insight.aboveMeanCount}/{insight.groupCount || unifiedChartSpec.items.length} {t("组高于均值")})</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Chart Canvas */}
      <div className="flex-1 w-full min-h-[260px] flex items-center justify-center overflow-hidden">
        {!unifiedChartSpec.hasValues ? (
          <div className="flex flex-col items-center justify-center p-8 text-center apple-font-mono animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-[#FD971F]/10 border border-[#FD971F]/30 flex items-center justify-center mb-3 text-ink-orange shadow-sm">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#272822] dark:text-[#F8F8F2] mb-1.5">{' ' + t("未配置度量指标 (Values)") + ' '}</h3>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed mb-4">{' ' + t("当前透视配置中缺少度量值。请在左侧字段架中点击或拖拽数值字段至【指标 / 值 (Values)】区域以生成图表。") + ' '}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {viewMode === 'chart' && (
                <button type="button" disabled={isReadOnly} onClick={onAddRecordCount} className="px-3 py-2 rounded-md bg-action text-white text-xs font-semibold">
                  {t('统计记录数')}
                </button>
              )}
              {onAddMeasure && candidateMeasureFields.slice(0, 3).map((mf) => (
                <button
                  key={mf.name}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onAddMeasure(mf.name)}
                  className="px-3 py-2 rounded-md border border-[#66D9EF]/50 bg-[#66D9EF]/10 text-ink-cyan text-xs font-semibold hover:bg-[#66D9EF]/20"
                >
                  + {t('添加')}「{mf.name}」
                </button>
              ))}
            </div>
          </div>
        ) : unifiedChartSpec.chartIssue ? (
          <div data-testid="chart-issue" className="text-center text-sm text-ink-muted py-8 px-4 max-w-lg">
            <p className="leading-6">{t(unifiedChartSpec.chartIssue)}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => setChartType('bar')} className="px-3 py-2 rounded-md border border-[#66D9EF] text-ink-cyan font-semibold">
                {t('切换柱图查看数值')}
              </button>
              {chartType === 'scatter' && onAddMeasure && unusedMeasureFields[0] && (
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onAddMeasure(unusedMeasureFields[0].name)}
                  className="px-3 py-2 rounded-md bg-action text-white text-xs font-semibold"
                >
                  + {t('补充指标')}「{unusedMeasureFields[0].name}」
                </button>
              )}
            </div>
          </div>
        ) : unifiedChartSpec.items.length === 0 || (chartType === 'histogram' ? unifiedChartSpec.histogramSummary?.valid === 0 : unifiedChartSpec.primaryStats.validCount === 0) ? (
          <div className="text-center text-sm text-ink-muted py-12 px-4">{t('当前没有可展示的有效数值。请检查筛选条件、字段类型和计算依据。')}</div>
        ) : chartType === 'heatmap' ? (
          <div className="w-full h-full overflow-auto">
            {(() => {
              const baseRows = pivotResult.tableRows.filter((row) => !row.isTotal && !row.isSubtotal);
              let orderedRows = baseRows;
              if (baseRows.length > 0 && (chartSpecConfig.sortMode !== 'none' || chartSpecConfig.topN > 0)) {
                const rowMap = new Map(baseRows.map((r) => [r.rowKey, r]));
                const matched = unifiedChartSpec.items.map((item) => rowMap.get(item.rowKey)).filter(Boolean);
                if (matched.length > 0) orderedRows = matched;
              }
              const shownRows = orderedRows.length ? orderedRows.slice(0, 200) : pivotResult.tableRows;
              const groups = pivotResult.leafColGroups.length ? pivotResult.leafColGroups : pivotResult.allColGroups;
              const metric = unifiedChartSpec.primaryValCfg;
              const magnitude = Math.max(1, ...shownRows.flatMap((row) => groups.map((group) => Math.abs(pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`]?.display || 0))));
              return <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted mb-1.5 px-1 apple-font-mono">
                  <span>{t("色阶深浅代表数值绝对规模（蓝青=正值，粉红=负值）")}</span>
                  <span>{t("峰值基准：")}{UnifiedFormatter.formatValue(magnitude, metric, { compact: true })}</span>
                </div>
                {orderedRows.length > 200 && <p className="text-xs text-ink-muted mb-1">{t("热力图展示前 200 个分组，请筛选或减少分组以查看其他数据。")}</p>}
                <svg data-chart-svg="true" role="img" aria-label={t("矩阵热力图")} width={Math.max(500, 160 + groups.length * 110)} height={Math.max(180, 60 + shownRows.length * 38)}>
                  {groups.map((group, index) => {
                    const colText = group.pathLabels?.join(' / ') || '总计';
                    return <text key={group.key} x={165 + index * 110} y={22} fill={darkMode ? '#F8F8F2' : '#272822'} fontSize="11">{formatAxisTickLabel(colText, 12)}</text>;
                  })}
                  {shownRows.map((row, r) => <g key={row.rowKey}>
                    <text x="4" y={58 + r * 38} fill={darkMode ? '#F8F8F2' : '#272822'} fontSize="11">{row.label.slice(0, 18)}</text>
                    {groups.map((group, c) => {
                      const cell = pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`];
                      const formatted = formatCellNumber(cell, metric);
                      return <g key={group.key} role="button" tabIndex={0} aria-label={`${row.label} / ${group.label}: ${formatted}`} data-highlighted={highlightedRowKey === row.rowKey}
                        onClick={() => handleChartPointClick({ rowKey: row.rowKey, colKey: group.key, name: row.label, formattedValue: formatted })}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleChartPointClick({ rowKey: row.rowKey, colKey: group.key, name: row.label, formattedValue: formatted }); } }}>
                        <rect x={160 + c * 110} y={34 + r * 38} width="106" height="34" rx="3" fill={cell?.display < 0 ? '#F92672' : '#66D9EF'} fillOpacity={0.2 + 0.8 * Math.abs(cell?.display || 0) / magnitude} stroke={highlightedRowKey === row.rowKey ? '#FD971F' : 'transparent'} strokeWidth="3" />
                        <text x={168 + c * 110} y={56 + r * 38} fontSize="11" fill={darkMode ? '#F8F8F2' : '#272822'}>{formatted}</text>
                      </g>;
                    })}
                  </g>)}
                </svg>
              </>;
            })()}
          </div>
        ) : chartType === 'funnel' ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
            <svg
              data-chart-svg="true"
              role="img"
              aria-label={t("漏斗图")}
              viewBox={`0 0 800 ${Math.max(220, unifiedChartSpec.funnelItems.length * 54 + 24)}`}
              className="w-full max-w-3xl mx-auto h-auto max-h-full"
            >
              {unifiedChartSpec.funnelItems.map((item, index) => {
                const width = item.widthPct * 5.5, x = 180 + (550 - width) / 2, y = 12 + index * 54;
                return (
                  <g
                    key={item.rowKey}
                    onClick={() => handleChartPointClick(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleChartPointClick(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.name}: ${item.formattedValue}`}
                  >
                    <text x="8" y={y + 24} fontSize="12" fill={darkMode ? '#F8F8F2' : '#272822'}>{formatAxisTickLabel(item.name, 16)}</text>
                    {width > 0 && <polygon points={`${x},${y + 22} ${x + width},${y + 22} ${x + width - Math.min(8, width / 2)},${y + 42} ${x + Math.min(8, width / 2)},${y + 42}`} fill={item.fill} stroke={highlightedRowKey === item.rowKey ? '#FD971F' : 'none'} strokeWidth="3" />}
                    <text x="180" y={y + 14} fontSize="12" fill={darkMode ? '#F8F8F2' : '#272822'}>{item.formattedValue} · {item.conversionFormatted}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            {chartType === 'line' ? (
              <LineChart data={unifiedChartSpec.items} margin={{ top: 24, right: 24, left: 10, bottom: shouldRotateTicks ? (compactAxis ? 52 : 58) : 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                {(unifiedChartSpec.hasDualAxis || unifiedChartSpec.derivedSeriesKey) && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#A6E22E' }}
                    tickFormatter={(v) => {
                      if (unifiedChartSpec.hasDualAxis) {
                        return UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true });
                      }
                      if (chartSpecConfig.lineDerivedMetric === 'mom_pct') {
                        return `${Number(v).toFixed(0)}%`;
                      }
                      return UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true });
                    }}
                  />
                )}
                {chartSpecConfig.showAvgReferenceLine && hasValidMean && (
                  <ReferenceLine
                    yAxisId="left"
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke="#FD971F"
                    strokeDasharray="4 4"
                    label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => (
                  <Line isAnimationActive={false}
                    key={sm.key}
                    yAxisId={unifiedChartSpec.hasDualAxis ? (sm.yAxisId || 'left') : 'left'}
                    connectNulls={chartSpecConfig.missingValueMode !== 'connect'}
                    type="monotone"
                    dataKey={sm.key}
                    stroke={sm.color}
                    strokeWidth={2.6}
                    dot={({ cx, cy, payload }) => <circle cx={cx} cy={cy} r={highlightedRowKey === payload?.rowKey ? 7 : 4} fill={highlightedRowKey === payload?.rowKey ? '#FD971F' : sm.color} data-highlighted={highlightedRowKey === payload?.rowKey} onClick={() => handleChartPointClick({ ...payload, colKey: sm.colKey })} />}
                    activeDot={{ r: 6, onClick: (_, payload) => handleChartPointClick({ ...payload?.payload, colKey: sm.colKey }) }}
                  >
                    {chartSpecConfig.showDataLabels && idx === 0 && unifiedChartSpec.items.length <= 24 && (
                      <LabelList dataKey="_compactPrimaryLabel" position="top" style={{ fontSize: 9, fontWeight: 600, fill: darkMode ? '#F8F8F2' : '#272822' }} />
                    )}
                  </Line>
                ))}
                {unifiedChartSpec.derivedSeriesKey && (
                  <Line isAnimationActive={false}
                    yAxisId="right"
                    type="monotone"
                    dataKey={unifiedChartSpec.derivedSeriesKey}
                    stroke="#E6DB74"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3, fill: '#E6DB74' }}
                  />
                )}
              </LineChart>
            ) : chartType === 'area' || chartType === 'stacked_area' || chartType === 'pct_area' ? (
              <AreaChart data={unifiedChartSpec.items} margin={{ top: 24, right: 24, left: 10, bottom: shouldRotateTicks ? (compactAxis ? 52 : 58) : 24 }}>
                <defs>
                  {CHART_COLORS.map((c, idx) => (
                    <linearGradient key={`areaGrad_${idx}`} id={`appleAreaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={c} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis
                  domain={chartType === 'pct_area' ? [0, 100] : zeroBaselineDomain} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)}
                  tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => (chartType === 'pct_area' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                />
                {chartSpecConfig.showAvgReferenceLine && chartType === 'area' && hasValidMean && (
                  <ReferenceLine
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke="#FD971F"
                    strokeDasharray="4 4"
                    label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => (
                  <Area isAnimationActive={false}
                    key={sm.key}
                    type="monotone"
                    dataKey={sm.key}
                    stackId={chartType === 'area' || (!unifiedChartSpec.canStack && chartType !== 'pct_area') ? undefined : 'stack_1'}
                    stroke={sm.color}
                    strokeWidth={2}
                    fill={`url(#appleAreaGrad_${idx % CHART_COLORS.length})`}
                    activeDot={{ r: 5, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                  />
                ))}
              </AreaChart>
            ) : chartType === 'combo' ? (
              <ComposedChart data={unifiedChartSpec.items} margin={{ top: 24, right: 28, left: 10, bottom: shouldRotateTicks ? (compactAxis ? 52 : 58) : 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#F92672' }} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                {unifiedChartSpec.hasDualAxis && (
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#A6E22E' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })} />
                )}
                {chartSpecConfig.showAvgReferenceLine && hasValidMean && (
                  <ReferenceLine
                    yAxisId="left"
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke="#FD971F"
                    strokeDasharray="4 4"
                    label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar isAnimationActive={false}
                  yAxisId="left"
                  dataKey={unifiedChartSpec.primarySeriesKey}
                  name={`${unifiedChartSpec.primarySeriesKey} [左轴]`}
                  fill="#F92672"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => handleChartPointClick(d)}
                >
                  {unifiedChartSpec.items.map((item) => (
                    <Cell
                      key={item.rowKey}
                      data-highlighted={highlightedRowKey === item.rowKey}
                      fill="#F92672"
                      stroke={highlightedRowKey === item.rowKey ? '#FD971F' : 'none'}
                      strokeWidth={3}
                      fillOpacity={highlightedRowKey && highlightedRowKey !== item.rowKey ? 0.35 : 1}
                    />
                  ))}
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="_compactPrimaryLabel" content={(p) => renderSmartBarLabel(p, darkMode, false)} />
                  )}
                </Bar>
                {unifiedChartSpec.hasDualAxis && unifiedChartSpec.secondarySeriesKey && (
                  <Line isAnimationActive={false}
                    yAxisId="right"
                    type="monotone"
                    dataKey={unifiedChartSpec.secondarySeriesKey}
                    name={`${unifiedChartSpec.secondarySeriesKey} [右轴]`}
                    stroke="#A6E22E"
                    strokeWidth={2.8}
                    dot={{ r: 4, fill: '#A6E22E', style: { pointerEvents: 'none' } }}
                    activeDot={{ r: 6, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                  />
                )}
              </ComposedChart>
            ) : chartType === 'pie' || chartType === 'donut' ? (
              <PieChart>
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Pie isAnimationActive={false}
                  data={unifiedChartSpec.pieItems}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="47%"
                  innerRadius={chartType === 'donut' ? (isChartFullscreen ? 80 : (compactAxis ? 48 : 56)) : 0}
                  outerRadius={isChartFullscreen ? 140 : (compactAxis ? 86 : 98)}
                  paddingAngle={chartType === 'donut' ? 3 : 1}
                  label={(p) => renderSmartPieLabel(p, unifiedChartSpec.primaryValCfg, darkMode)}
                  labelLine={false}
                  onClick={(d) => handleChartPointClick(d)}
                >
                  {unifiedChartSpec.pieItems.map((entry, idx) => (
                    <Cell
                      key={`pie_c_${idx}`}
                      data-highlighted={highlightedRowKey === entry.rowKey}
                      fill={entry.fill}
                      stroke={highlightedRowKey === entry.rowKey ? '#FD971F' : (darkMode ? '#272822' : '#FFFDF7')}
                      strokeWidth={highlightedRowKey === entry.rowKey ? 3 : 1}
                      fillOpacity={highlightedRowKey && highlightedRowKey !== entry.rowKey ? 0.38 : 1}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                {chartType === 'donut' && (() => {
                  const highlightedSlice = highlightedRowKey
                    ? unifiedChartSpec.pieItems.find((item) => item.rowKey === highlightedRowKey)
                    : null;
                  const topLabel = highlightedSlice
                    ? formatAxisTickLabel(highlightedSlice.name, 10)
                    : t("图中合计");
                  const centerVal = highlightedSlice
                    ? UnifiedFormatter.formatValue(highlightedSlice.value, unifiedChartSpec.primaryValCfg, { compact: true })
                    : UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: true });
                  return (
                    <g>
                      <text x="50%" y="42%" textAnchor="middle" fill={darkMode ? '#908E80' : '#75715E'} fontSize={9.5} className="apple-font-mono">
                        {topLabel}
                      </text>
                      <text x="50%" y="50%" textAnchor="middle" fill={darkMode ? '#E6DB74' : '#272822'} fontSize={12} fontWeight={700} className="apple-font-mono">
                        {centerVal}
                      </text>
                      {highlightedSlice && (
                        <text x="50%" y="57%" textAnchor="middle" fill="#FD971F" fontSize={9} fontWeight={600} className="apple-font-mono">
                          {highlightedSlice.pct}%
                        </text>
                      )}
                    </g>
                  );
                })()}
              </PieChart>
            ) : chartType === 'waterfall' ? (
              <BarChart data={unifiedChartSpec.waterfallItems} margin={{ top: 24, right: 20, left: 10, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} tickFormatter={(v) => formatAxisTickLabel(v, 10)} />
                <YAxis tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                <ReferenceLine y={0} stroke="#75715E" />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Bar isAnimationActive={false} dataKey="range" name="增减桥接区间" radius={[4, 4, 4, 4]} cursor="pointer" onClick={(d) => handleChartPointClick(d)}>
                  {unifiedChartSpec.waterfallItems.map((entry, idx) => (
                    <Cell
                      key={`wf_${idx}`}
                      data-highlighted={highlightedRowKey === entry.rowKey}
                      fill={entry.fill}
                      stroke={highlightedRowKey === entry.rowKey ? '#FD971F' : 'none'}
                      strokeWidth={highlightedRowKey === entry.rowKey ? 3 : 0}
                      fillOpacity={highlightedRowKey && highlightedRowKey !== entry.rowKey ? 0.4 : 1}
                    />
                  ))}
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="formattedDelta" position="top" style={{ fontSize: 9, fontWeight: 700, fill: darkMode ? '#F8F8F2' : '#272822' }} />
                  )}
                </Bar>
              </BarChart>
            ) : chartType === 'scatter' ? (
              <ScatterChart margin={{ top: 24, right: 24, left: 10, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={unifiedChartSpec.primarySeriesKey}
                  tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                  allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={unifiedChartSpec.secondarySeriesKey}
                  tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })}
                />
                <ZAxis type="number" dataKey="z" range={[70, 320]} />
                {Number.isFinite(unifiedChartSpec.scatterMeanX) && unifiedChartSpec.scatterPoints.length > 1 && (
                  <ReferenceLine x={unifiedChartSpec.scatterMeanX} stroke="#66D9EF" strokeDasharray="3 3" />
                )}
                {Number.isFinite(unifiedChartSpec.scatterMeanY) && unifiedChartSpec.scatterPoints.length > 1 && (
                  <ReferenceLine y={unifiedChartSpec.scatterMeanY} stroke="#66D9EF" strokeDasharray="3 3" />
                )}
                {unifiedChartSpec.scatterRegressionSegment && (
                  <ReferenceLine
                    segment={unifiedChartSpec.scatterRegressionSegment}
                    stroke="#A6E22E"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: 'OLS 拟合趋势线', position: 'insideTopLeft', fontSize: 9, fill: '#A6E22E' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Scatter isAnimationActive={false}
                  name={`${unifiedChartSpec.primarySeriesKey} × ${unifiedChartSpec.secondarySeriesKey}`}
                  data={unifiedChartSpec.scatterPoints}
                  cursor="pointer"
                  onClick={(d) => handleChartPointClick(d)}
                >
                  {unifiedChartSpec.scatterPoints.map((pt, idx) => (
                    <Cell
                      key={`sc_${idx}`}
                      data-highlighted={highlightedRowKey === pt.rowKey}
                      fill={pt.fill}
                      stroke={highlightedRowKey === pt.rowKey ? '#FD971F' : pt.isOutlier ? '#F8F8F2' : 'none'}
                      strokeWidth={highlightedRowKey === pt.rowKey ? 3 : pt.isOutlier ? 2 : 0}
                    />
                  ))}
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="name" position="top" style={{ fontSize: 9, fontWeight: 600, fill: darkMode ? '#F8F8F2' : '#272822' }} />
                  )}
                </Scatter>
              </ScatterChart>
            ) : chartType === 'histogram' ? (
              <BarChart data={unifiedChartSpec.histogramItems} margin={{ top: 24, right: 20, left: 10, bottom: 24 }}>
                <defs>
                  <linearGradient id="monokaiHistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#66D9EF" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#AE81FF" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: darkMode ? '#908E80' : '#75715E' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar isAnimationActive={false}
                  dataKey="count"
                  name={`频数分布 (${unifiedChartSpec.primaryValCfg.field} · 单击柱体查看明细)`}
                  fill="url(#monokaiHistGrad)"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => {
                    soundEngine?.playTransitionChord ? soundEngine.playTransitionChord() : soundEngine?.playClick(560);
                    const payload = d?.payload || d;
                    if (payload?.matchedRows) {
                      setDrillSearch?.('');
                      setDrillPage?.(1);
                      requestDrillDown?.('__GRAND_TOTAL_ROW__', '__GRAND_TOTAL_COL__', {
                        rowLabel: `区间 ${payload.rangeFull}`,
                        colLabel: '直方图频数分箱',
                        valLabel: `${payload.count} 笔 (${payload.pct}%)`,
                        valueFormatted: `${payload.count} 笔`,
                        histogramRange: payload.histogramRange,
                      });
                    }
                  }}
                >
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="count" position="top" formatter={(v) => `${v}笔`} style={{ fontSize: 9, fontWeight: 700, fill: darkMode ? '#F8F8F2' : '#272822' }} />
                  )}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={unifiedChartSpec.items}
                layout={chartType === 'horizontal_bar' ? 'vertical' : 'horizontal'}
                margin={{
                  top: 24,
                  right: 28,
                  left: chartType === 'horizontal_bar' ? 36 : 10,
                  bottom: chartType === 'horizontal_bar' ? 24 : (shouldRotateTicks ? (compactAxis ? 52 : 58) : 24)
                }}
              >
                <defs>
                  {CHART_COLORS.map((c, idx) => (
                    <linearGradient key={`barGrad_${idx}`} id={`appleGrad_${idx}`} x1="0" y1="0" x2={chartType === 'horizontal_bar' ? '1' : '0'} y2={chartType === 'horizontal_bar' ? '0' : '1'}>
                      <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.68} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                {chartType === 'horizontal_bar' ? (
                  <>
                    <XAxis type="number" domain={zeroBaselineDomain} tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      reversed={true}
                      width={compactAxis ? 96 : 130}
                      tick={{ fontSize: 9.5, fill: darkMode ? '#F8F8F2' : '#272822' }}
                      tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 10 : 18)}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      interval={barTickInterval}
                      height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                      tick={renderCategoryAxisTick}
                    />
                    <YAxis
                      domain={chartType === 'pct_stacked_bar' ? [0, 100] : zeroBaselineDomain} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)}
                      tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                      tickFormatter={(v) => (chartType === 'pct_stacked_bar' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                    />
                  </>
                )}
                {chartType === 'horizontal_bar' ? <ReferenceLine x={0} stroke="#75715E" /> : <ReferenceLine y={0} stroke="#75715E" />}
                {chartSpecConfig.showAvgReferenceLine && (chartType === 'bar' || chartType === 'horizontal_bar') && hasValidMean && (
                  chartType === 'horizontal_bar' ? (
                    <ReferenceLine
                      x={unifiedChartSpec.primaryStats.mean}
                      stroke="#FD971F"
                      strokeDasharray="4 4"
                      label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                    />
                  ) : (
                    <ReferenceLine
                      y={unifiedChartSpec.primaryStats.mean}
                      stroke="#FD971F"
                      strokeDasharray="4 4"
                      label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                    />
                  )
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => {
                  const isStacked = (chartType === 'stacked_bar' || chartType === 'pct_stacked_bar') && (unifiedChartSpec.canStack || chartType === 'pct_stacked_bar');
                  return (
                    <Bar isAnimationActive={false}
                      key={sm.key}
                      dataKey={sm.key}
                      stackId={isStacked ? 'stack_bar' : undefined}
                      fill={`url(#${sm.gradId})`}
                      radius={isStacked ? [0, 0, 0, 0] : chartType === 'horizontal_bar' ? [0, 5, 5, 0] : [5, 5, 0, 0]}
                      cursor="pointer"
                      onClick={(d) => handleChartPointClick({ ...d, colKey: sm.colKey })}
                    >
                      {unifiedChartSpec.items.map((item) => <Cell key={item.rowKey} data-highlighted={highlightedRowKey === item.rowKey} stroke={highlightedRowKey === item.rowKey ? '#FD971F' : 'none'} strokeWidth={3} fillOpacity={highlightedRowKey && highlightedRowKey !== item.rowKey ? 0.35 : 1} />)}
                      {chartSpecConfig.showDataLabels && (idx === 0 || !isStacked) && unifiedChartSpec.seriesMetaList.length <= 3 && (
                        <LabelList
                          dataKey={idx === 0 && !isStacked ? '_compactPrimaryLabel' : sm.key}
                          content={(p) => renderSmartBarLabel(p, darkMode, chartType === 'horizontal_bar')}
                        />
                      )}
                    </Bar>
                  );
                })}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Analysis Presets Strip & Beginner Chart Reading / Note Workbench */}
      <div className="mt-2 pt-2 border-t border-[#D6D4C8]/60 dark:border-[#3E3D32]/70 flex flex-col gap-2 text-[10px] apple-font-mono shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-expanded={showLensPresets}
              aria-controls="pivot-lens-presets"
              onClick={() => setShowLensPresets((open) => !open)}
              className={`font-semibold px-2 py-1 rounded border transition ${showLensPresets ? 'bg-ink-cyan/15 text-ink-cyan border-ink-cyan/45' : 'text-ink-cyan border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]'}`}
            >
              {t("分析视角") + ' '}{showLensPresets ? t("收起") : t("展开")}
            </button>
            <button
              type="button"
              aria-expanded={isGuideOpen}
              aria-controls="pivot-chart-guide-note"
              onClick={toggleGuide}
              className={`font-semibold px-2 py-1 rounded border inline-flex items-center gap-1 transition ${isGuideOpen ? 'bg-[#AE81FF]/15 text-ink-purple border-[#AE81FF]/45' : 'text-ink-purple border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#AE81FF]'}`}
            >
              <BookOpen className="w-3 h-3" />
              <span>{t("读图指南与笔记") + ' '}{isGuideOpen ? t("收起") : t("展开")}</span>
            </button>
          </div>
          <span className="text-ink-muted dark:text-[#B8B5A8] hidden sm:inline">{' ' + t("单击图表查看明细；单击表格高亮，双击查看明细") + ' '}</span>
        </div>

        {/* Storyboard Preset Shots Bar */}
        {showLensPresets && (
          <div id="pivot-lens-presets" className="flex items-center gap-1.5 overflow-x-auto pb-1 animate-fadeIn">
            {analysisShots.map((shot, idx) => (
              <button
                key={shot.id}
                disabled={isReadOnly}
                onClick={() => applyKeynoteShot(idx)}
                className={`px-2 py-1 rounded border transition shrink-0 ${keynoteShotIdx === idx ? 'bg-[#A6E22E]/20 border-[#A6E22E]/50 text-ink-green font-bold' : 'bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
                title={shot.title}
              >
                {shot.number}·{shot.title}
              </button>
            ))}
          </div>
        )}

        {/* The Analytical Guide, Insights & Notes Center */}
        {isGuideOpen && (
          <div
            id="pivot-chart-guide-note"
            data-testid="chart-guide-note"
            className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#EFECE1]/55 dark:bg-[#1E1F1C]/85 border border-[#D6D4C8] dark:border-[#3E3D32] text-[11px] leading-relaxed shadow-xs"
          >
            {/* Exploration Status Bar: Shows when user alters view away from the active shot */}
            {isModifiedFromShot && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#FD971F]/10 border border-[#FD971F]/30 text-ink-orange text-[10.5px]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-ink-orange animate-pulse shrink-0" />
                  <span>{t("已在当前笔记基础上自由探索（图表类型或透视字段已变更）")}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine?.playClick?.(520);
                      applyKeynoteShot(keynoteShotIdx);
                    }}
                    className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#FD971F]/40 text-ink-orange text-[10px] font-semibold hover:border-[#FD971F] flex items-center gap-1 shadow-2xs"
                    title={t("一键还原回当前分析笔记预设的透视维度与图表")}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{t("还原笔记预设")}</span>
                  </button>
                  {onSaveCurrentViewAsShot && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine?.playClick?.(540);
                        setNewNoteForm({
                          title: `${unifiedChartSpec.xDimensionLabel || '自定义'} · ${unifiedChartSpec.primarySeriesKey || ''}`,
                          subtitle: insight
                            ? `首位「${insight.topName}」(${insight.topFormatted}${insight.topSharePct ? `，占 ${insight.topSharePct}%` : ''})，共 ${insight.groupCount} 个分组`
                            : '基于探索视图保存的分析笔记',
                        });
                        setIsSavingNewNote(true);
                      }}
                      className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#AE81FF]/45 text-ink-purple text-[10px] font-semibold hover:border-[#AE81FF] flex items-center gap-1 shadow-2xs"
                      title={t("将您当前探索的新视图保存为新的一则分析笔记")}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{t("存为新笔记")}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2-Column Responsive Analysis Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Left Column: Active Shot Note, Real-time Data Insights & Smart Action Steps */}
              <div className="flex flex-col justify-between gap-2.5 pr-0 lg:pr-3 lg:border-r border-[#D6D4C8]/70 dark:border-[#3E3D32]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-[#272822] dark:text-[#F8F8F2]">
                      <Sparkles className="w-3.5 h-3.5 text-ink-orange shrink-0" />
                      <span>[{t("笔记")} {activeShot?.number || '01'}] {activeShot?.title}</span>
                      <div className="inline-flex items-center gap-0.5 ml-1">
                        <button
                          type="button"
                          disabled={keynoteShotIdx <= 0}
                          onClick={() => {
                            soundEngine?.playClick?.(500);
                            applyKeynoteShot(Math.max(0, keynoteShotIdx - 1));
                          }}
                          className={`p-0.5 rounded border min-w-[20px] min-h-[20px] flex items-center justify-center transition ${
                            keynoteShotIdx <= 0
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                          }`}
                          title={t("上一则分析笔记")}
                          aria-label={t("上一则分析笔记")}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[9.5px] font-mono font-semibold px-1 text-ink-muted select-none">
                          {keynoteShotIdx + 1}/{analysisShots.length}
                        </span>
                        <button
                          type="button"
                          disabled={keynoteShotIdx >= analysisShots.length - 1}
                          onClick={() => {
                            soundEngine?.playClick?.(500);
                            applyKeynoteShot(Math.min(analysisShots.length - 1, keynoteShotIdx + 1));
                          }}
                          className={`p-0.5 rounded border min-w-[20px] min-h-[20px] flex items-center justify-center transition ${
                            keynoteShotIdx >= analysisShots.length - 1
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                          }`}
                          title={t("下一则分析笔记")}
                          aria-label={t("下一则分析笔记")}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {onUpdateStoryShot && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            soundEngine?.playClick?.(540);
                            setEditNoteForm({ title: activeShot?.title || '', subtitle: activeShot?.subtitle || '' });
                            setIsEditingNote(true);
                          }}
                          className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-cyan hover:border-[#66D9EF] inline-flex items-center gap-1 text-[10px] font-semibold"
                          title={t("修改当前分析笔记的标题与业务结论")}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          <span>{t("编辑笔记")}</span>
                        </button>
                      )}
                      {onSaveCurrentViewAsShot && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            soundEngine?.playClick?.(540);
                            setNewNoteForm({
                              title: `${unifiedChartSpec.xDimensionLabel} · ${unifiedChartSpec.primarySeriesKey}`,
                              subtitle: insight
                                ? `首位「${insight.topName}」(${insight.topFormatted}${insight.topSharePct ? `，占 ${insight.topSharePct}%` : ''})，共 ${insight.groupCount} 个分组参与对比`
                                : '自定义透视图分析笔记',
                            });
                            setIsSavingNewNote(true);
                          }}
                          className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#AE81FF]/45 text-ink-purple hover:border-[#AE81FF] inline-flex items-center gap-1 text-[10px] font-semibold"
                          title={t("将当前透视图配置与发现存为一条新的分析笔记")}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>{t("保存新笔记")}</span>
                        </button>
                      )}
                      {onDeleteStoryShot && analysisShots.length > 1 && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.confirm?.(`确定要删除分析笔记「${activeShot?.title || ''}」吗？`)) {
                              onDeleteStoryShot(keynoteShotIdx);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-ink-pink hover:border-ink-pink inline-flex items-center gap-1 text-[10px] font-semibold"
                          title={t("删除当前分析笔记")}
                          aria-label={t("删除当前分析笔记")}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>{t("删除笔记")}</span>
                        </button>
                      )}
                      {hasCustomStoryShots && onResetStoryShots && (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={onResetStoryShots}
                          className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-ink-cyan hover:border-ink-cyan inline-flex items-center gap-1 text-[10px] font-semibold"
                          title={t("恢复推荐笔记库")}
                          aria-label={t("恢复推荐笔记库")}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{t("重置笔记库")}</span>
                        </button>
                      )}
                      {copyTextToClipboard && (
                        <button
                          type="button"
                          onClick={handleCopyConclusion}
                          className="px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] inline-flex items-center gap-1 text-[10px] font-semibold"
                          title={t("一键复制分析笔记与数据结论到剪贴板")}
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{t("复制结论")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-ink-muted">
                    {activeShot?.subtitle || t("可点击上方「分析视角」切换预设分析思路，或编辑当前笔记记录您的业务发现。")}
                  </p>
                </div>

                {/* Live Real-time Executive Insights */}
                {insight && (
                  <div className="pt-2 border-t border-[#D6D4C8]/50 dark:border-[#3E3D32]/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
                    <span className="flex items-center gap-1">
                      <strong className="text-ink-green">{t("首位领跑:")}</strong>
                      <span>{insight.topName} ({insight.topFormatted}{insight.topSharePct ? ` · ${insight.topSharePct}%` : ''})</span>
                    </span>
                    {insight.groupCount > 1 && (
                      <span>
                        <strong className="text-ink-orange">{t("末位分组:")}</strong>{' '}
                        {insight.bottomName} ({insight.bottomFormatted})
                      </span>
                    )}
                    {insight.top3SharePct && insight.groupCount >= 3 && (
                      <span>
                        <strong className="text-ink-cyan">{t("CR3集中度:")}</strong>{' '}
                        Top3 {t("合计占")} {insight.top3SharePct}%
                      </span>
                    )}
                    {insight.groupCount > 1 && (
                      <span>
                        <strong className="text-ink-purple">{t("均值对比:")}</strong>{' '}
                        {t("均值")} {insight.meanFormatted} ({t("高于均值")} {insight.aboveMeanCount}/{insight.groupCount} {t("组")})
                      </span>
                    )}
                  </div>
                )}

                {/* Smart Actionable Analytical Recommendations */}
                {smartSuggestions.length > 0 && (
                  <div className="pt-2 border-t border-[#D6D4C8]/50 dark:border-[#3E3D32]/60 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-ink-yellow flex items-center gap-1 select-none">
                      <Lightbulb className="w-3 h-3 text-ink-yellow shrink-0" />
                      <span>{t("下一步行动建议:")}</span>
                    </span>
                    {smartSuggestions.map((sug) => {
                      const Icon = sug.icon;
                      return (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={sug.action}
                          title={sug.title}
                          className="px-2 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-yellow text-[#272822] dark:text-[#F8F8F2] hover:text-ink-yellow transition flex items-center gap-1 shadow-2xs cursor-pointer font-medium"
                        >
                          <Icon className="w-2.5 h-2.5 text-ink-yellow" />
                          <span>{sug.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Interactive Pivot Recipe: Direct Tuning from Chart */}
                <div className="pt-2 border-t border-[#D6D4C8]/50 dark:border-[#3E3D32]/60 flex flex-wrap items-center gap-2 text-[10px] relative">
                  <span className="font-bold text-ink-muted select-none flex items-center gap-1">
                    <Layers className="w-3 h-3 text-ink-purple" />
                    <span>{t("透视配方:")}</span>
                  </span>

                  {/* Row Dimension Badge with Quick Swap Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveRecipePopover((cur) => (cur === 'row' ? null : 'row'))}
                      className="px-2 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-cyan text-ink-cyan transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      title={t("分类主维度(X轴/行) · 点击快速切换维度")}
                    >
                      <strong>{t("行/轴")}:</strong>
                      <span>{rowSummary}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                    {activeRecipePopover === 'row' && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setActiveRecipePopover(null)} />
                        <div className="absolute left-0 bottom-full mb-1.5 z-40 w-52 p-2 rounded-xl bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] shadow-xl space-y-1 animate-apple-modal">
                          <div className="text-[10px] font-bold text-ink-cyan px-1.5 py-0.5 flex items-center justify-between">
                            <span>{t("切换主分类维度 (X轴)")}</span>
                            <X className="w-3 h-3 cursor-pointer text-ink-muted hover:text-ink-pink" onClick={() => setActiveRecipePopover(null)} />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {candidateDimensionFields.map((df) => {
                              const isCur = configRows.some((r) => r.field === df.name);
                              return (
                                <button
                                  key={df.name}
                                  type="button"
                                  onClick={() => handleSwapRowDimension(df.name)}
                                  className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between transition ${
                                    isCur
                                      ? 'bg-ink-cyan/15 text-ink-cyan font-bold'
                                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                                  }`}
                                >
                                  <span>{df.name}</span>
                                  {isCur && <Check className="w-3 h-3 text-ink-cyan" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Column Grouping Badge with Quick Add/Swap Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveRecipePopover((cur) => (cur === 'col' ? null : 'col'))}
                      className={`px-2 py-0.5 rounded-lg border transition flex items-center gap-1 shadow-2xs cursor-pointer ${
                        configCols.length > 0
                          ? 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-purple text-ink-purple'
                          : 'bg-[#FFFDF7]/60 dark:bg-[#272822]/60 border-dashed border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-purple text-ink-muted'
                      }`}
                      title={t("对比分组(图例/列) · 点击添加或切换交叉透视分组")}
                    >
                      <strong>{t("列/组")}:</strong>
                      <span>{configCols.length > 0 ? colSummary : t("无 (点击添加交叉分组)")}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                    {activeRecipePopover === 'col' && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setActiveRecipePopover(null)} />
                        <div className="absolute left-0 bottom-full mb-1.5 z-40 w-52 p-2 rounded-xl bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] shadow-xl space-y-1 animate-apple-modal">
                          <div className="text-[10px] font-bold text-ink-purple px-1.5 py-0.5 flex items-center justify-between">
                            <span>{t("交叉对比分组 (图例/列)")}</span>
                            <X className="w-3 h-3 cursor-pointer text-ink-muted hover:text-ink-pink" onClick={() => setActiveRecipePopover(null)} />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {configCols.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveColGroup(configCols[0]?.id || configCols[0]?.field)}
                                className="w-full text-left px-2 py-1 rounded text-[10px] text-ink-pink hover:bg-ink-pink/10 font-semibold mb-1 border-b border-[#D6D4C8]/40 dark:border-[#3E3D32]/50 flex items-center justify-between"
                              >
                                <span>{t("移除当前列分组")}</span>
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {candidateDimensionFields
                              .filter((df) => !configRows.some((r) => r.field === df.name))
                              .map((df) => {
                                const isCur = configCols.some((c) => c.field === df.name);
                                return (
                                  <button
                                    key={df.name}
                                    type="button"
                                    onClick={() => handleAddColGroup(df.name)}
                                    className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between transition ${
                                      isCur
                                        ? 'bg-ink-purple/15 text-ink-purple font-bold'
                                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                                    }`}
                                  >
                                    <span>{df.name}</span>
                                    {isCur && <Check className="w-3 h-3 text-ink-purple" />}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Metric Badge with Quick Swap Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveRecipePopover((cur) => (cur === 'val' ? null : 'val'))}
                      className="px-2 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-green text-ink-green transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      title={t("度量指标与聚合算法 · 点击快速切换主度量")}
                    >
                      <strong>{t("度量")}:</strong>
                      <span>{valSummary}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                    {activeRecipePopover === 'val' && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setActiveRecipePopover(null)} />
                        <div className="absolute left-0 bottom-full mb-1.5 z-40 w-52 p-2 rounded-xl bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] shadow-xl space-y-1 animate-apple-modal">
                          <div className="text-[10px] font-bold text-ink-green px-1.5 py-0.5 flex items-center justify-between">
                            <span>{t("切换主度量指标")}</span>
                            <X className="w-3 h-3 cursor-pointer text-ink-muted hover:text-ink-pink" onClick={() => setActiveRecipePopover(null)} />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {candidateMeasureFields.map((mf) => {
                              const isCur = configValues.some((v) => v.field === mf.name);
                              return (
                                <button
                                  key={mf.name}
                                  type="button"
                                  onClick={() => handleSwapPrimaryMeasure(mf.name)}
                                  className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between transition ${
                                    isCur
                                      ? 'bg-ink-green/15 text-ink-green font-bold'
                                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                                  }`}
                                >
                                  <span>{mf.name}</span>
                                  {isCur && <Check className="w-3 h-3 text-ink-green" />}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => handleSwapPrimaryMeasure('__COUNT__')}
                              className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center justify-between transition ${
                                configValues.some((v) => v.field === '__COUNT__')
                                  ? 'bg-ink-green/15 text-ink-green font-bold'
                                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                              }`}
                            >
                              <span>{t("记录数 (Count)")}</span>
                              {configValues.some((v) => v.field === '__COUNT__') && <Check className="w-3 h-3 text-ink-green" />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Chart Type Badge */}
                  <button
                    type="button"
                    onClick={() => setShowChartTypes((o) => !o)}
                    className="px-2 py-0.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-ink-orange text-ink-orange transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title={t("当前图表展现形式 · 点击展开图表选择面板")}
                  >
                    <strong>{t("图表")}:</strong>
                    <span>{t(VISUAL_CHART_TYPES.find((item) => item.value === chartType)?.label || chartType)}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </button>
                </div>
              </div>

              {/* Right Column: Beginner Chart Reading & Method Guide */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/70 pb-1.5">
                  <span className="font-bold text-ink-purple flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("零基础读图与分析方法指南")}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#66D9EF]/15 text-ink-cyan text-[9.5px] font-semibold">
                    {t("当前意图：")}{t(methodGuide?.intent || '对比排行')}
                  </span>
                </div>
                <p className="text-[#272822] dark:text-[#F8F8F2]">
                  <strong className="text-ink-cyan">{t("适用场景：")}</strong>
                  {t(methodGuide?.purpose || '')}
                </p>
                <p className="text-ink-muted">
                  <strong className="text-ink-green">{t("怎么看图：")}</strong>
                  {t(methodGuide?.howToRead || '')}
                </p>
                <p className="text-ink-muted">
                  <strong className="text-ink-orange">{t("下一步行动：")}</strong>
                  {t(methodGuide?.actionTip || '')}
                </p>
                {/* Method Legend Tip for zero-basis learners */}
                <div className="p-2 rounded-lg bg-[#EFECE1]/40 dark:bg-[#272822]/60 border border-[#D6D4C8]/50 dark:border-[#3E3D32]/60 flex items-center justify-between gap-2 text-[10px] text-ink-muted">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-ink-yellow" />
                    <span>{t("提示：悬停数据节点可查看明细占比；点击可直接穿透明细记录。")}</span>
                  </span>
                  {chartType !== recommendedChartType && (
                    <button
                      type="button"
                      onClick={() => setChartType(recommendedChartType)}
                      className="text-ink-green hover:underline font-semibold"
                    >
                      {t("换推荐图表")} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Story Shot / Save New Shot Dialog */}
      <StoryShotDialog
        mode={isEditingNote ? 'edit' : isSavingNewNote ? 'save' : null}
        number={activeShot?.number || '01'}
        form={isEditingNote ? editNoteForm : newNoteForm}
        setForm={isEditingNote ? setEditNoteForm : setNewNoteForm}
        onClose={() => { setIsEditingNote(false); setIsSavingNewNote(false); }}
        onSubmit={() => {
          if (isEditingNote) {
            onUpdateStoryShot?.(keynoteShotIdx, editNoteForm);
          } else {
            onSaveCurrentViewAsShot?.(newNoteForm.title, newNoteForm.subtitle);
          }
          setIsEditingNote(false);
          setIsSavingNewNote(false);
        }}
      />
    </div>
  );
}
