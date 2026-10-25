import { t } from '../../../i18n.js';
import React from 'react';
import {
  Sliders, Maximize2, Minimize2, X, BookOpen, Pencil, Copy, Download,
  ArrowUpDown, ArrowUp, ArrowDown, ArrowLeftRight,
  ChevronDown, Lightbulb
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
  CHART_METHOD_GUIDES,
} from '../../../constants/pivotConstants';
import {
  CV,
  chartInk,
  chartMuted,
  chartPaper,
  chartGridStroke,
  chartMargin,
  chartValueTick,
  chartLegendStyle,
  chartAvgLabel,
  chartDimOpacity,
  chartBarRadius,
  seriesColor,
} from '../../../constants/chartVisual';
import { UnifiedFormatter, formatAxisTickLabel, formatCellNumber } from '../../../utils/formatters';
import { isMeasureField, isIdentifierField, getMeasureDefaults } from '../../../utils/fieldSemantics';
import { buildResultQuestion } from '../../../utils/analysisReading.js';
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
  const chartTypeSelectRef = React.useRef(null);
  const restoreScopeFocusRef = React.useRef(false);
  React.useEffect(() => {
    if (!unifiedChartSpec.renderLimit && restoreScopeFocusRef.current) {
      // A completed scope action removes its button; keep keyboard navigation in the chart.
      if (document.activeElement === document.body) chartTypeSelectRef.current?.focus({ preventScroll: true });
      restoreScopeFocusRef.current = false;
    }
  }, [unifiedChartSpec]);
  // Keep the reading guide collapsed by default — chart first, notes on demand.
  const [guideCollapsedInChartMode, setGuideCollapsedInChartMode] = React.useState(true);
  const [showGuideInSplitMode, setShowGuideInSplitMode] = React.useState(false);
  // Split mode: sidebar shelves are primary; keep chart encoding collapsed unless needed.
  const [encodingExpanded, setEncodingExpanded] = React.useState(false);
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

  const mutedFill = chartMuted(darkMode);
  const inkFill = chartInk(darkMode);
  const paperFill = chartPaper(darkMode);
  const gridStroke = chartGridStroke(darkMode);
  const valueTick = chartValueTick(darkMode);
  const legendStyle = chartLegendStyle();
  const cartesianMargin = chartMargin({ rotate: shouldRotateTicks, compact: compactAxis });
  const dualMargin = chartMargin({ rotate: shouldRotateTicks, compact: compactAxis, dual: true });
  const hbarMargin = chartMargin({ horizontal: true });

  const renderCategoryAxisTick = React.useCallback((props) => {
    const { x, y, payload } = props;
    const fullText = String(payload?.value ?? '');
    const maxLen = compactAxis ? 12 : 22;
    const displayText = formatAxisTickLabel(fullText, maxLen);
    const tickSize = CV.typography.tickCategory;

    if (!shouldRotateTicks) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={14}
            textAnchor="middle"
            fontSize={tickSize}
            fill={mutedFill}
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
          fontSize={tickSize}
          fill={mutedFill}
          className="select-none"
        >
          <title>{fullText}</title>
          {displayText}
        </text>
      </g>
    );
  }, [compactAxis, mutedFill, shouldRotateTicks]);

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
    const hasColGroups = Boolean(
      unifiedChartSpec?.hasColGroups
      ?? (pivotResult?.leafColGroups && pivotResult.leafColGroups.length > 0)
    );
    const valCount = pivotResult?.valConfigs?.length || 0;
    const seriesCount = unifiedChartSpec?.seriesMetaList?.length || 0;

    // Column series → stacked comparison; time axis → trend; dual measures without columns → combo.
    if (isTemporal) return 'line';
    if (hasColGroups || seriesCount > 1) return 'stacked_bar';
    if (valCount >= 2) return 'combo';
    if (itemCount <= 6 && itemCount >= 2 && unifiedChartSpec?.isPrimaryAdditive) return 'donut';
    if (itemCount > 8) return 'horizontal_bar';
    return 'bar';
  }, [unifiedChartSpec, pivotResult?.valConfigs, pivotResult?.leafColGroups]);

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

  const hasValidMean = Number.isFinite(unifiedChartSpec.primaryStats?.mean) && (unifiedChartSpec.primaryStats?.validCount || 0) > 0;
  const insight = unifiedChartSpec.executiveInsight;

  const configRows = pivotConfig?.rows || [];
  const configCols = pivotConfig?.columns || pivotConfig?.cols || [];
  const configValues = pivotConfig?.values || [];
  const primaryRowField = configRows[0]?.field || '';
  const primaryColField = configCols[0]?.field || '';
  const primaryValueField = (() => {
    const byId = configValues.find((v) => v.id === chartSpecConfig.primaryValueId);
    return byId?.field || configValues[0]?.field || '';
  })();

  const preferCompactEncoding = viewMode === 'split';
  const encodingIncomplete = !primaryRowField || !primaryValueField;
  const showEncodingEditors = !preferCompactEncoding || encodingExpanded || encodingIncomplete;
  const encodingRecipe = [
    primaryRowField || t('选择字段'),
    primaryColField || t('无'),
    primaryValueField === '__COUNT__' ? t('记录数') : (primaryValueField || t('选择字段')),
  ].join(' → ');

  const fieldSelectClass =
    'appearance-none bg-[#FFFDF7] dark:bg-[#272822] border-0 text-[12px] font-medium text-[#272822] dark:text-[#F8F8F2] focus:outline-none cursor-pointer disabled:opacity-40 max-w-[7.5rem] truncate leading-none rounded-md px-1 [color-scheme:light] dark:[color-scheme:dark]';
  const optionClass = 'bg-[#FFFDF7] text-[#272822] dark:bg-[#272822] dark:text-[#F8F8F2]';
  const iconBtn = (active) =>
    `h-8 w-8 inline-flex items-center justify-center rounded-lg transition ${
      active
        ? 'text-ink-cyan bg-[#66D9EF]/12'
        : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
    }`;

  const makeDimItem = (fieldName) => {
    const fMeta = (currentDataset?.fields || []).find((f) => f.name === fieldName);
    return {
      id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      field: fieldName,
      sort: 'none',
      dateGranularity: fMeta?.type === 'date' ? 'year' : 'raw',
      excludedValues: [],
    };
  };

  const handleSetRowField = (fieldName) => {
    if (isReadOnly || !setPivotConfig || !fieldName) return;
    soundEngine?.playClick?.(520);
    setPivotConfig((prev) => {
      const prevRows = prev.rows || [];
      const restRows = prevRows.slice(1).filter((r) => r.field !== fieldName);
      return {
        ...prev,
        rows: [makeDimItem(fieldName), ...restRows],
        columns: (prev.columns || prev.cols || []).filter((c) => c.field !== fieldName),
        collapsedRowKeys: {},
        collapsedColKeys: {},
      };
    });
  };

  const handleSetColField = (fieldName) => {
    if (isReadOnly || !setPivotConfig) return;
    soundEngine?.playClick?.(520);
    setPivotConfig((prev) => {
      if (!fieldName) {
        return { ...prev, columns: [], collapsedColKeys: {} };
      }
      const prevCols = prev.columns || prev.cols || [];
      const restCols = prevCols.slice(1).filter((c) => c.field !== fieldName);
      return {
        ...prev,
        rows: (prev.rows || []).filter((r) => r.field !== fieldName),
        columns: [makeDimItem(fieldName), ...restCols],
        collapsedRowKeys: {},
        collapsedColKeys: {},
      };
    });
  };

  const handleSetValueField = (fieldName) => {
    if (isReadOnly || !fieldName) return;
    soundEngine?.playClick?.(520);
    const existing = configValues.find((v) => v.field === fieldName);
    if (existing) {
      setChartSpecConfig((p) => ({ ...p, primaryValueId: existing.id }));
      return;
    }
    if (!setPivotConfig) return;
    const fMeta = (currentDataset?.fields || []).find((f) => f.name === fieldName);
    const defaults = getMeasureDefaults(fMeta || { name: fieldName, type: 'number' });
    const newId = `v_${Date.now()}`;
    setPivotConfig((prev) => {
      const others = (prev.values || []).filter((v) => v.field !== fieldName);
      return {
        ...prev,
        values: [{ id: newId, field: fieldName, showAs: 'normal', ...defaults }, ...others],
      };
    });
    setChartSpecConfig((p) => ({ ...p, primaryValueId: newId }));
  };

  const handleSwapRowsCols = () => {
    if (isReadOnly || !setPivotConfig) return;
    soundEngine?.playClick?.(540);
    setPivotConfig((prev) => ({
      ...prev,
      rows: prev.columns || prev.cols || [],
      columns: prev.rows || [],
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
    showToast?.(t('已互换行与列'));
  };

  const handleExportFullReport = () => {
    soundEngine?.playClick?.(560);
    const configCols = pivotConfig?.columns || pivotConfig?.cols || [];
    const colSummary = configCols.map((c) => c.field || c).join(' / ');
    const reportLines = [
      "# " + (activeShot?.title || t("数据透视分析报告")),
      "> " + t("生成时间：") + new Date().toLocaleString() + " · " + t("数据集：") + (currentDataset?.name || t("当前工作表")),
      "",
      "## " + t("一、结论"),
      activeShot?.subtitle || t("基于当前行列与指标配置的透视结果。"),
      "",
      "## " + t("二、关键发现"),
      insight ? [
        "- **" + t("首位") + "**：「" + insight.topName + "」" + insight.topFormatted + (insight.topSharePct ? "（" + insight.topSharePct + "%）" : ""),
        insight.groupCount > 1 ? "- **" + t("末位") + "**：「" + insight.bottomName + "」" + insight.bottomFormatted : "",
        insight.top3SharePct && insight.groupCount >= 3 ? "- **CR3**：前 3 组合计 " + insight.top3SharePct + "%" : "",
        insight.groupCount > 1 ? "- **" + t("均值") + "**：" + insight.meanFormatted + "（" + t("高于均值") + " " + insight.aboveMeanCount + "/" + insight.groupCount + "）" : "",
      ].filter(Boolean).join("\n") : "- " + t("暂无统计发现"),
      "",
      "## " + t("三、透视配置"),
      "- **" + t("行") + "**: " + (unifiedChartSpec.xDimensionLabel || (pivotConfig?.rows?.map(r=>r.field||r).join(" / ")) || t("无")),
      "- **" + t("列") + "**: " + (colSummary || t("无")),
      "- **" + t("值") + "**: " + (pivotConfig?.values?.length > 0 ? pivotConfig.values.map((v) => v.field + " (" + t(v.agg || "sum") + ")").join(", ") : unifiedChartSpec.primarySeriesKey),
      "- **" + t("图表") + "**: " + t(VISUAL_CHART_TYPES.find((item) => item.value === chartType)?.label || chartType),
    ];
    copyTextToClipboard?.(reportLines.join("\n"), t("已复制分析报告 Markdown"));
  };

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

  const optSelectClass =
    'w-full px-2 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8]/80 dark:border-[#49483E] text-[11px] text-[#272822] dark:text-[#F8F8F2] focus:outline-none focus:border-[#66D9EF] [color-scheme:light] dark:[color-scheme:dark]';

  // Chart-only hides the table pane — keep the same plain-language framing in the chart surface.
  const chartResultQuestion =
    viewMode === 'chart' && (pivotConfig?.values?.length || 0) > 0
      ? buildResultQuestion(pivotConfig)
      : '';

  return (
    <div data-highlighted-row={highlightedRowKey || ''} className="flex-1 flex flex-col h-full min-h-0">
      {chartResultQuestion ? (
        <div
          data-testid="result-reading"
          className="shrink-0 mb-2.5 px-1 py-1 text-[11px] leading-5"
        >
          <p className="text-[#57584B] dark:text-[#C4C4B8] [overflow-wrap:anywhere]">
            <span className="font-semibold text-[#272822] dark:text-[#F8F8F2]">{t('这张图：')}</span>
            {chartResultQuestion}
          </p>
        </div>
      ) : null}
      {/* Encoding + type + tools — one quiet row (compact in split: shelves own the fields) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3.5 pb-3 border-b border-[#D6D4C8]/45 dark:border-[#3E3D32]/50">
        {showEncodingEditors ? (
          <div className="inline-flex flex-wrap items-center gap-x-1 gap-y-1 min-w-0 h-auto min-h-8 px-1.5 rounded-xl bg-[#EFECE1]/55 dark:bg-[#1E1F1C]/65 ring-1 ring-[#D6D4C8]/40 dark:ring-[#3E3D32]/50">
            <label className="inline-flex items-center gap-1 h-8 pl-2 pr-1.5 min-w-0">
              <span className="text-[10px] text-ink-muted shrink-0 select-none">{t('行')}</span>
              <select
                aria-label={t('行字段')}
                disabled={isReadOnly || !candidateDimensionFields.length}
                value={primaryRowField}
                onChange={(e) => handleSetRowField(e.target.value)}
                className={fieldSelectClass}
                title={primaryRowField || t('选择字段')}
              >
                {!primaryRowField && <option value="" className={optionClass}>{t('选择字段')}</option>}
                {candidateDimensionFields.map((f) => (
                  <option key={f.name} value={f.name} className={optionClass}>{f.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={handleSwapRowsCols}
              title={t('互换行与列')}
              aria-label={t('互换行与列')}
              className="h-7 w-6 inline-flex items-center justify-center rounded-md text-[#75715E] dark:text-[#908E80] hover:text-ink-cyan transition disabled:opacity-40"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <label className="inline-flex items-center gap-1 h-8 pl-1 pr-1.5 min-w-0">
              <span className="text-[10px] text-ink-muted shrink-0 select-none">{t('列')}</span>
              <select
                aria-label={t('列字段')}
                disabled={isReadOnly || !candidateDimensionFields.length}
                value={primaryColField}
                onChange={(e) => handleSetColField(e.target.value)}
                className={fieldSelectClass}
                title={primaryColField || t('无')}
              >
                <option value="" className={optionClass}>{t('无')}</option>
                {candidateDimensionFields.map((f) => (
                  <option key={f.name} value={f.name} className={optionClass}>{f.name}</option>
                ))}
              </select>
            </label>

            <span className="text-[#D6D4C8] dark:text-[#3E3D32] select-none text-[11px] px-0.5" aria-hidden>→</span>

            <label className="inline-flex items-center gap-1 h-8 pl-1 pr-2 min-w-0">
              <span className="text-[10px] text-ink-muted shrink-0 select-none">{t('值')}</span>
              <select
                aria-label={t('值字段')}
                disabled={isReadOnly}
                value={primaryValueField}
                onChange={(e) => handleSetValueField(e.target.value)}
                className={fieldSelectClass}
                title={primaryValueField || t('选择字段')}
              >
                {!primaryValueField && <option value="" className={optionClass}>{t('选择字段')}</option>}
                {candidateMeasureFields.map((f) => (
                  <option key={f.name} value={f.name} className={optionClass}>{f.name}</option>
                ))}
                {!candidateMeasureFields.some((f) => f.name === '__COUNT__') && (
                  <option value="__COUNT__" className={optionClass}>{t('记录数')}</option>
                )}
                {primaryValueField
                  && primaryValueField !== '__COUNT__'
                  && !candidateMeasureFields.some((f) => f.name === primaryValueField) && (
                  <option value={primaryValueField} className={optionClass}>{primaryValueField}</option>
                )}
              </select>
            </label>

            {preferCompactEncoding && !encodingIncomplete && (
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick?.(480);
                  setEncodingExpanded(false);
                }}
                className="h-7 px-1.5 mr-0.5 rounded-md text-[10px] text-ink-muted hover:text-ink-cyan transition"
                title={t('收起字段调整（也可在左侧拖放）')}
              >
                {t('收起')}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick?.(500);
              setEncodingExpanded(true);
            }}
            className="inline-flex items-center gap-1.5 h-8 max-w-full min-w-0 pl-2.5 pr-2 rounded-xl bg-[#EFECE1]/45 dark:bg-[#1E1F1C]/55 ring-1 ring-[#D6D4C8]/35 dark:ring-[#3E3D32]/45 text-left hover:ring-[#66D9EF]/50 transition"
            title={t('在此快速改字段，或继续用左侧拖放')}
            aria-label={`${t('调整图表字段')}: ${encodingRecipe}`}
          >
            <span className="text-[10px] text-ink-muted shrink-0 select-none">{t('字段')}</span>
            <span className="text-[12px] font-medium text-[#272822] dark:text-[#F8F8F2] truncate">{encodingRecipe}</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />
          </button>
        )}

        {highlightedRowKey && onClearHighlight && (
          <button
            type="button"
            onClick={() => onClearHighlight()}
            className="h-8 px-2 rounded-lg text-[11px] text-ink-orange hover:bg-[#FD971F]/12 transition"
            title={t('清除聚焦')}
          >
            {formatAxisTickLabel(highlightedRowKey.replace(/\|\|/g, '/'), 10)} ×
          </button>
        )}

        <div className="relative flex items-center gap-0.5 ml-auto shrink-0">
          <select
            ref={chartTypeSelectRef}
            aria-label={t('选择图表类型')}
            value={chartType}
            onChange={(e) => {
              soundEngine?.playClick?.(560);
              setChartType(e.target.value);
            }}
            className="h-8 max-w-[7.5rem] pl-2.5 pr-6 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] text-[12px] font-medium text-[#272822] dark:text-[#F8F8F2] focus:outline-none hover:brightness-[0.98] dark:hover:brightness-110 cursor-pointer appearance-none [color-scheme:light] dark:[color-scheme:dark]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2375715E' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.4rem center',
            }}
            title={
              chartType === recommendedChartType
                ? `${t(VISUAL_CHART_TYPES.find((ct) => ct.value === chartType)?.label || chartType)} (${t('最适推荐')})`
                : t(VISUAL_CHART_TYPES.find((ct) => ct.value === chartType)?.label || chartType)
            }
          >
            {VISUAL_CHART_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value} className={optionClass}>
                {t(ct.short)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick(520);
              const nextSort = chartSpecConfig.sortMode === 'none' ? 'desc' : chartSpecConfig.sortMode === 'desc' ? 'asc' : 'none';
              setChartSpecConfig((p) => ({ ...p, sortMode: nextSort }));
            }}
            title={t("按主指标排序：默认 → 降序 → 升序")}
            aria-label={t("图表排序")}
            className={iconBtn(chartSpecConfig.sortMode !== 'none')}
          >
            {chartSpecConfig.sortMode === 'desc' ? <ArrowDown className="w-4 h-4" /> : chartSpecConfig.sortMode === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
          </button>

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
            title={t("图表选项")}
            aria-label={t("图表选项")}
            className={iconBtn(showChartStudioPopover || (chartSpecConfig.topN || 0) > 0)}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-chart-fullscreen-toggle
            onClick={() => {
              soundEngine?.playClick(600);
              setIsChartFullscreen((prev) => !prev);
            }}
            className={iconBtn(isChartFullscreen)}
            title={t("全屏切换")}
            aria-label={isChartFullscreen ? "退出图表全屏" : "图表全屏"}
          >
            {isChartFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {showChartStudioPopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowChartStudioPopover(false)} />
              <div className={`absolute right-0 ${popoverPlacement === 'top' ? 'bottom-full mb-2' : 'top-10'} z-40 w-[min(17.5rem,calc(100vw-2rem))] max-h-[min(380px,calc(100vh-5rem))] overflow-y-auto p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] shadow-xl space-y-3 text-xs`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#272822] dark:text-[#F8F8F2]">{t("图表选项")}</span>
                  <button type="button" onClick={() => setShowChartStudioPopover(false)} aria-label={t("关闭图表选项")} className="p-1 rounded-md text-ink-muted hover:bg-black/5 dark:hover:bg-white/5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    { key: 'showDataLabels', label: t('标签'), on: chartSpecConfig.showDataLabels },
                    { key: 'showAvgReferenceLine', label: t('均值'), on: chartSpecConfig.showAvgReferenceLine },
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setChartSpecConfig((p) => ({ ...p, [chip.key]: !p[chip.key] }))}
                      className={`px-2 py-1 rounded-md text-[11px] transition ${chip.on ? 'bg-[#66D9EF]/15 text-ink-cyan' : 'text-ink-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'}`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={chartSpecConfig.clickLinkMode === 'filter'}
                    title={chartSpecConfig.clickLinkMode === 'filter' ? t('点击图表：筛选该分组') : t('点击图表：查看明细')}
                    onClick={() => setChartSpecConfig((p) => ({ ...p, clickLinkMode: p.clickLinkMode === 'filter' ? 'drill' : 'filter' }))}
                    className={`px-2 py-1 rounded-md text-[11px] transition ${chartSpecConfig.clickLinkMode === 'filter' ? 'bg-[#FD971F]/15 text-ink-orange' : 'text-ink-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'}`}
                  >
                    {chartSpecConfig.clickLinkMode === 'filter' ? t('筛选') : t('明细')}
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
                        className={optSelectClass}
                      >
                        {pivotResult.valConfigs.map((vc) => (
                          <option key={vc.id} value={vc.id} className={optionClass}>{vc.field} ({vc.agg})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1">{t("次轴/Y轴指标:")}</label>
                      <select
                        aria-label={t("次轴/Y轴指标:")}
                        value={chartSpecConfig.secondaryValueId || pivotResult.valConfigs[1]?.id || ''}
                        onChange={(e) => setChartSpecConfig((p) => ({ ...p, secondaryValueId: e.target.value }))}
                        className={optSelectClass}
                      >
                        {pivotResult.valConfigs.map((vc) => (
                          <option key={vc.id} value={vc.id} className={optionClass}>{vc.field} ({vc.agg})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-ink-muted mb-1">{t("只显示前 N 组:")}</label>
                  <select
                    aria-label={t("只显示前 N 组:")}
                    value={chartSpecConfig.topN}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, topN: Number(e.target.value) }))}
                    className={optSelectClass}
                  >
                    <option value={0} className={optionClass}>{t("显示全部")}</option>
                    <option value={3} className={optionClass}>Top 3</option>
                    <option value={5} className={optionClass}>Top 5</option>
                    <option value={8} className={optionClass}>Top 8</option>
                    <option value={10} className={optionClass}>Top 10</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("衍生线:")}</label>
                    <select
                      aria-label={t("衍生线:")}
                      value={chartSpecConfig.lineDerivedMetric}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, lineDerivedMetric: e.target.value }))}
                      className={optSelectClass}
                    >
                      <option value="none" className={optionClass}>{t("无衍生线")}</option>
                      <option value="cumulative" className={optionClass}>{t("累计运行总和")}</option>
                      <option value="ma3" className={optionClass}>{t("3期移动平均线")}</option>
                      <option value="mom_pct" className={optionClass}>{t("环比增长率(%)")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1">{t("缺失值:")}</label>
                    <select
                      aria-label={t("缺失值:")}
                      value={chartSpecConfig.missingValueMode}
                      onChange={(e) => setChartSpecConfig((p) => ({ ...p, missingValueMode: e.target.value }))}
                      className={optSelectClass}
                    >
                      <option value="zero" className={optionClass}>{t("按 0 补齐")}</option>
                      <option value="connect" className={optionClass}>{t("断开连线")}</option>
                      <option value="prev" className={optionClass}>{t("沿用前值")}</option>
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
                      className={optSelectClass}
                    >
                      <option value={0} className={optionClass}>{t("自动分箱 (Sturges公式)")}</option>
                      <option value={4} className={optionClass}>{t("4 个区间")}</option>
                      <option value={6} className={optionClass}>{t("6 个区间")}</option>
                      <option value={8} className={optionClass}>{t("8 个区间")}</option>
                      <option value={10} className={optionClass}>{t("10 个区间")}</option>
                    </select>
                  </div>
                )}

                {(onExportPNG || onExportSVG) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#D6D4C8]/60 dark:border-[#3E3D32]">
                    {onExportPNG && (
                      <button
                        type="button"
                        onClick={() => { soundEngine?.playClick(620); onExportPNG(); setShowChartStudioPopover(false); }}
                        className="px-2.5 py-1 rounded-md text-[11px] text-ink-muted hover:text-ink-cyan hover:bg-[#66D9EF]/10 transition"
                      >
                        PNG
                      </button>
                    )}
                    {onExportSVG && (
                      <button
                        type="button"
                        onClick={() => { soundEngine?.playClick(620); onExportSVG(); setShowChartStudioPopover(false); }}
                        className="px-2.5 py-1 rounded-md text-[11px] text-ink-muted hover:text-ink-cyan hover:bg-[#66D9EF]/10 transition"
                      >
                        SVG
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Disclaimers & Context Warnings */}
      {chartType === 'histogram' && unifiedChartSpec.histogramSummary && (
        <p data-testid="histogram-basis" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {unifiedChartSpec.histogramSummary.field} · {t('原始记录的数值分布')} · {t('有效样本：')}{unifiedChartSpec.histogramSummary.valid}/{unifiedChartSpec.histogramSummary.total} · {t('空值：')}{unifiedChartSpec.histogramSummary.missing} · {t('非数值：')}{unifiedChartSpec.histogramSummary.total - unifiedChartSpec.histogramSummary.valid - unifiedChartSpec.histogramSummary.missing}
        </p>
      )}
      {!['histogram', 'heatmap'].includes(chartType) && unifiedChartSpec.availableGroupCount > unifiedChartSpec.items.length && (
        <p role="status" data-testid="chart-scope" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {t('按当前排序展示')} {unifiedChartSpec.items.length}/{unifiedChartSpec.availableGroupCount} {t('个分组；占比以图中分组合计为分母。表格和总计仍包含全部筛选结果。')}
        </p>
      )}
      {chartType === 'funnel' && !unifiedChartSpec.chartIssue && (
        <p data-testid="funnel-basis" className="text-xs leading-5 mb-2 text-ink-muted [overflow-wrap:anywhere]">
          {t('按当前图表顺序比较各项数值。“相对上项”仅为数值之比，不能据此判断用户转化率。')}
        </p>
      )}
      {chartType === 'combo' && !unifiedChartSpec.hasDualAxis && (
        <div data-testid="combo-guidance" className="flex flex-wrap items-center gap-2 mb-2 text-[11px] text-ink-muted shrink-0">
          <span>{t("双轴图需要两个指标。当前仅有一个。")}</span>
          {onAddMeasure && (
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => {
                soundEngine?.playClick(560);
                onAddMeasure(unusedMeasureFields[0]?.name || '__COUNT__');
              }}
              className="px-2 py-0.5 rounded-md text-ink-cyan hover:bg-[#66D9EF]/12 transition"
            >
              + {unusedMeasureFields[0]?.name || t("记录数")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className="px-2 py-0.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition"
          >
            {t("切换普通柱图")}
          </button>
        </div>
      )}

      {/* Main Chart Canvas */}
      <div className="flex-1 w-full min-h-[280px] flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-transparent to-[#EFECE1]/25 dark:to-[#1E1F1C]/35">
        {unifiedChartSpec.renderLimit ? (
          <div role="status" className="p-6 max-w-lg text-center space-y-3">
            <h4 className="text-sm font-semibold">{t("图表分组过多")}</h4>
            <p className="text-xs text-ink-muted">{unifiedChartSpec.renderLimit.groupCount.toLocaleString()} {t("组超过上限")} {unifiedChartSpec.renderLimit.maximum.toLocaleString()}{t("。表格数据仍完整，可先筛选或只看 Top 10。")}</p>
            <button className="px-3 py-2 rounded-lg bg-action text-[#F8F8F2] text-xs" onClick={(event) => { restoreScopeFocusRef.current = document.activeElement === event.currentTarget; setChartSpecConfig((prev) => ({ ...prev, topN: 10, sortMode: 'desc' })); }}>{t("按主指标显示 Top 10")}</button>
          </div>
        ) : !unifiedChartSpec.hasValues ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-sm font-semibold text-[#272822] dark:text-[#F8F8F2] mb-1.5">{t("尚未添加数值指标")}</h3>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed mb-4">
              {viewMode === 'split'
                ? t("可先在上方表格区添加指标；图表会随之出现。")
                : t("请在左侧把金额、数量等字段加到「值」区域，图表才会出现。")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* In split view the table owns next-step CTAs; chart-only keeps measure shortcuts. */}
              {viewMode !== 'split' && typeof onAddRecordCount === 'function' && (
                <button type="button" disabled={isReadOnly} onClick={onAddRecordCount} className="px-3 py-1.5 rounded-lg bg-action text-white text-xs font-medium">
                  {t('统计记录数')}
                </button>
              )}
              {viewMode !== 'split' && onAddMeasure && candidateMeasureFields.slice(0, 3).map((mf) => (
                <button
                  key={mf.name}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onAddMeasure(mf.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-cyan hover:bg-[#66D9EF]/12 transition"
                >
                  + {mf.name}
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
        ) : unifiedChartSpec.items.length === 0 || (chartType === 'histogram' ? (!unifiedChartSpec.histogramItems.length || unifiedChartSpec.histogramSummary?.valid === 0) : unifiedChartSpec.primaryStats.validCount === 0) ? (
          <div className="text-center text-sm text-ink-muted py-12 px-4">{t('当前没有可展示的有效数值。请检查筛选条件、字段类型和计算依据。')}</div>
        ) : chartType === 'heatmap' ? (
          <div className="w-full h-full overflow-auto">
            {(() => {
              const rows = pivotResult.tableRows.filter((row) => !row.isTotal && !row.isSubtotal);
              const rowsByKey = new Map(rows.map((row) => [row.rowKey, row]));
              const shownRows = rows.length ? unifiedChartSpec.items.map((item) => rowsByKey.get(item.rowKey)).filter(Boolean) : pivotResult.tableRows;
              const allGroups = pivotResult.leafColGroups.length ? pivotResult.leafColGroups : pivotResult.allColGroups;
              const groupsByKey = new Map(allGroups.map((group) => [group.key, group]));
              const groups = !rows.length && pivotResult.leafColGroups.length ? unifiedChartSpec.items.map((item) => groupsByKey.get(item.rowKey)).filter(Boolean) : allGroups;
              const metric = unifiedChartSpec.primaryValCfg;
              const magnitude = Math.max(1, ...shownRows.flatMap((row) => groups.map((group) => Math.abs(pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`]?.display || 0))));
              return <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted mb-1.5 px-1 apple-font-mono">
                  <span>{t("色阶深浅代表数值绝对规模（蓝青=正值，粉红=负值）")}</span>
                  <span>{t("峰值基准：")}{UnifiedFormatter.formatValue(magnitude, metric, { compact: true })}</span>
                </div>
                {shownRows.length > 200 && <p className="text-xs text-ink-muted mb-1">{t("热力图展示前 200 个分组，请筛选或减少分组以查看其他数据。")}</p>}
                <svg data-chart-svg="true" role="group" aria-label={t("矩阵热力图")} width={Math.max(500, 160 + groups.length * 110)} height={Math.max(180, 60 + shownRows.length * 38)}>
                  {groups.map((group, index) => {
                    const colText = group.pathLabels?.join(' / ') || group.label || '总计';
                    return <text key={group.key} x={165 + index * 110} y={22} fill={inkFill} fontSize={CV.typography.tickHeat}>{formatAxisTickLabel(colText, 12)}</text>;
                  })}
                  {shownRows.map((row, r) => <g key={row.rowKey}>
                    <text x="4" y={58 + r * 38} fill={inkFill} fontSize={CV.typography.tickHeat}>{row.label.slice(0, 18)}</text>
                    {groups.map((group, c) => {
                      const cell = pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`];
                      const formatted = formatCellNumber(cell, metric);
                      return <g key={group.key} role="button" tabIndex={0} aria-label={`${row.label} / ${group.label}: ${formatted}`} data-highlighted={highlightedRowKey === row.rowKey}
                        onClick={() => handleChartPointClick({ rowKey: row.rowKey, colKey: group.key, name: (!rows.length && group.pathLabels?.join(' / ')) || group.label || row.label, formattedValue: formatted })}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleChartPointClick({ rowKey: row.rowKey, colKey: group.key, name: row.label, formattedValue: formatted }); } }}>
                        <rect x={160 + c * 110} y={34 + r * 38} width="106" height="34" rx={CV.heatmap.cellRx} fill={cell?.display < 0 ? CV.heatmap.neg : CV.heatmap.pos} fillOpacity={CV.heatmap.opacityMin + CV.heatmap.opacitySpan * Math.abs(cell?.display || 0) / magnitude} stroke={highlightedRowKey === row.rowKey ? CV.semantic.highlight : 'transparent'} strokeWidth={CV.stroke.highlight} />
                        <text x={168 + c * 110} y={56 + r * 38} fontSize={CV.typography.tickHeat} fill={inkFill}>{formatted}</text>
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
              role="group"
              aria-label={t("漏斗图")}
              width="800"
              height={Math.max(220, unifiedChartSpec.funnelItems.length * 54 + 24)}
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
                    <text x="8" y={y + 24} fontSize={CV.typography.tickFunnel} fill={inkFill}>{formatAxisTickLabel(item.name, 16)}</text>
                    {width > 0 && <polygon points={`${x},${y + 22} ${x + width},${y + 22} ${x + width - Math.min(8, width / 2)},${y + 42} ${x + Math.min(8, width / 2)},${y + 42}`} fill={item.fill} stroke={highlightedRowKey === item.rowKey ? CV.semantic.highlight : 'none'} strokeWidth={CV.stroke.highlight} />}
                    <text x="180" y={y + 14} fontSize={CV.typography.tickFunnel} fill={inkFill}>{item.formattedValue} · {item.conversionFormatted}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            {chartType === 'line' ? (
              <LineChart data={unifiedChartSpec.items} margin={cartesianMargin}>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis yAxisId="left" tick={valueTick} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                {(unifiedChartSpec.hasDualAxis || unifiedChartSpec.derivedSeriesKey) && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={valueTick}
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
                    stroke={CV.semantic.mean}
                    strokeDasharray={CV.refDash.avg}
                    label={chartAvgLabel(`AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`)}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => (
                  <Line isAnimationActive={false}
                    key={sm.key}
                    yAxisId={unifiedChartSpec.hasDualAxis ? (sm.yAxisId || 'left') : 'left'}
                    connectNulls={chartSpecConfig.missingValueMode !== 'connect'}
                    type="monotone"
                    dataKey={sm.key}
                    stroke={sm.color}
                    strokeWidth={CV.stroke.series}
                    dot={({ cx, cy, payload }) => <circle cx={cx} cy={cy} r={highlightedRowKey === payload?.rowKey ? CV.dot.highlight : CV.dot.base} fill={highlightedRowKey === payload?.rowKey ? CV.semantic.highlight : sm.color} data-highlighted={highlightedRowKey === payload?.rowKey} onClick={() => handleChartPointClick({ ...payload, colKey: sm.colKey })} />}
                    activeDot={{ r: CV.dot.active, onClick: (_, payload) => handleChartPointClick({ ...payload?.payload, colKey: sm.colKey }) }}
                  >
                    {chartSpecConfig.showDataLabels && idx === 0 && unifiedChartSpec.items.length <= 24 && (
                      <LabelList dataKey="_compactPrimaryLabel" position="top" style={{ fontSize: CV.typography.dataLabel, fontWeight: CV.typography.dataLabelWeight, fill: inkFill }} />
                    )}
                  </Line>
                ))}
                {unifiedChartSpec.derivedSeriesKey && (
                  <Line isAnimationActive={false}
                    yAxisId="right"
                    type="monotone"
                    dataKey={unifiedChartSpec.derivedSeriesKey}
                    stroke={CV.semantic.derived}
                    strokeWidth={CV.stroke.derived}
                    strokeDasharray={CV.refDash.derived}
                    dot={{ r: CV.dot.derived, fill: CV.semantic.derived }}
                  />
                )}
              </LineChart>
            ) : chartType === 'area' || chartType === 'stacked_area' || chartType === 'pct_area' ? (
              <AreaChart data={unifiedChartSpec.items} margin={cartesianMargin}>
                <defs>
                  {CHART_COLORS.map((c, idx) => (
                    <linearGradient key={`areaGrad_${idx}`} id={`appleAreaGrad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={CV.fill.areaGradFrom} />
                      <stop offset="95%" stopColor={c} stopOpacity={CV.fill.areaGradTo} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis
                  domain={chartType === 'pct_area' ? [0, 100] : zeroBaselineDomain} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)}
                  tick={valueTick}
                  tickFormatter={(v) => (chartType === 'pct_area' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                />
                {chartSpecConfig.showAvgReferenceLine && chartType === 'area' && hasValidMean && (
                  <ReferenceLine
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke={CV.semantic.mean}
                    strokeDasharray={CV.refDash.avg}
                    label={chartAvgLabel(`AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`)}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => (
                  <Area isAnimationActive={false}
                    key={sm.key}
                    type="monotone"
                    dataKey={sm.key}
                    stackId={chartType === 'area' || (!unifiedChartSpec.canStack && chartType !== 'pct_area') ? undefined : 'stack_1'}
                    stroke={sm.color}
                    strokeWidth={CV.stroke.series}
                    fill={`url(#appleAreaGrad_${idx % CHART_COLORS.length})`}
                    activeDot={{ r: CV.dot.areaActive, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                  />
                ))}
              </AreaChart>
            ) : chartType === 'combo' ? (
              <ComposedChart data={unifiedChartSpec.items} margin={dualMargin}>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  interval={generalTickInterval}
                  height={shouldRotateTicks ? (compactAxis ? 64 : 72) : 28}
                  tick={renderCategoryAxisTick}
                />
                <YAxis yAxisId="left" tick={valueTick} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                {unifiedChartSpec.hasDualAxis && (
                  <YAxis yAxisId="right" orientation="right" tick={valueTick} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })} />
                )}
                {chartSpecConfig.showAvgReferenceLine && hasValidMean && (
                  <ReferenceLine
                    yAxisId="left"
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke={CV.semantic.mean}
                    strokeDasharray={CV.refDash.avg}
                    label={chartAvgLabel(`AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`)}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
                <Bar isAnimationActive={false}
                  yAxisId="left"
                  dataKey={unifiedChartSpec.primarySeriesKey}
                  name={`${unifiedChartSpec.primarySeriesKey} [左轴]`}
                  fill={seriesColor(0)}
                  radius={CV.radius.bar}
                  cursor="pointer"
                  onClick={(d) => handleChartPointClick(d)}
                >
                  {unifiedChartSpec.items.map((item) => (
                    <Cell
                      key={item.rowKey}
                      data-highlighted={highlightedRowKey === item.rowKey || (highlightedRowKey && typeof highlightedRowKey === 'string' && highlightedRowKey.startsWith(item.rowKey + '||'))}
                      fill={seriesColor(0)}
                      stroke={highlightedRowKey === item.rowKey ? CV.semantic.highlight : 'none'}
                      strokeWidth={CV.stroke.highlight}
                      fillOpacity={chartDimOpacity(Boolean(highlightedRowKey && highlightedRowKey !== item.rowKey))}
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
                    stroke={seriesColor(1)}
                    strokeWidth={CV.stroke.series}
                    dot={{ r: CV.dot.base, fill: seriesColor(1), style: { pointerEvents: 'none' } }}
                    activeDot={{ r: CV.dot.active, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                  />
                )}
              </ComposedChart>
            ) : chartType === 'pie' || chartType === 'donut' ? (
              <PieChart>
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
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
                  {unifiedChartSpec.pieItems.map((entry, idx) => {
                    const isHi = Boolean(highlightedRowKey)
                      && (highlightedRowKey === entry.rowKey
                        || (typeof highlightedRowKey === 'string' && highlightedRowKey.startsWith(`${entry.rowKey}||`)));
                    return (
                    <Cell
                      key={`pie_c_${idx}`}
                      data-highlighted={isHi}
                      fill={entry.fill}
                      stroke={isHi ? CV.semantic.highlight : paperFill}
                      strokeWidth={isHi ? CV.stroke.highlight : CV.stroke.cell}
                      fillOpacity={chartDimOpacity(Boolean(highlightedRowKey && !isHi))}
                      cursor="pointer"
                    />
                    );
                  })}
                </Pie>
                {chartType === 'donut' && (() => {
                  const matchesHighlight = (rowKey) =>
                    Boolean(highlightedRowKey)
                    && (highlightedRowKey === rowKey
                      || (typeof highlightedRowKey === 'string' && highlightedRowKey.startsWith(`${rowKey}||`)));
                  const highlightedSlice = highlightedRowKey
                    ? unifiedChartSpec.pieItems.find((item) => matchesHighlight(item.rowKey))
                    : null;
                  const topLabel = highlightedSlice
                    ? formatAxisTickLabel(highlightedSlice.name, 10)
                    : t("图中合计");
                  const centerVal = highlightedSlice
                    ? UnifiedFormatter.formatValue(highlightedSlice.value, unifiedChartSpec.primaryValCfg, { compact: true })
                    : UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: true });
                  return (
                    <g>
                      <text x="50%" y="42%" textAnchor="middle" fill={mutedFill} fontSize={CV.typography.dataLabel + 0.5} className="apple-font-mono">
                        {topLabel}
                      </text>
                      <text x="50%" y="50%" textAnchor="middle" fill={inkFill} fontSize={CV.typography.tickFunnel + 0.5} fontWeight={700} className="apple-font-mono">
                        {centerVal}
                      </text>
                      {highlightedSlice && (
                        <text x="50%" y="57%" textAnchor="middle" fill={CV.semantic.highlight} fontSize={CV.typography.dataLabel} fontWeight={600} className="apple-font-mono">
                          {highlightedSlice.pct}%
                        </text>
                      )}
                    </g>
                  );
                })()}
              </PieChart>
            ) : chartType === 'waterfall' ? (
              <BarChart data={unifiedChartSpec.waterfallItems} margin={cartesianMargin}>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis dataKey="name" tick={valueTick} tickFormatter={(v) => formatAxisTickLabel(v, 10)} />
                <YAxis tick={valueTick} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                <ReferenceLine y={0} stroke={CV.semantic.zero} strokeWidth={CV.stroke.zero} />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Bar isAnimationActive={false} dataKey="range" name="增减桥接区间" radius={CV.radius.waterfall} cursor="pointer" onClick={(d) => handleChartPointClick(d)}>
                  {unifiedChartSpec.waterfallItems.map((entry, idx) => (
                    <Cell
                      key={`wf_${idx}`}
                      data-highlighted={highlightedRowKey === entry.rowKey}
                      fill={entry.fill}
                      stroke={highlightedRowKey === entry.rowKey ? CV.semantic.highlight : 'none'}
                      strokeWidth={highlightedRowKey === entry.rowKey ? CV.stroke.highlight : 0}
                      fillOpacity={chartDimOpacity(Boolean(highlightedRowKey && highlightedRowKey !== entry.rowKey))}
                    />
                  ))}
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="formattedDelta" position="top" style={{ fontSize: CV.typography.dataLabel, fontWeight: 700, fill: inkFill }} />
                  )}
                </Bar>
              </BarChart>
            ) : chartType === 'scatter' ? (
              <ScatterChart margin={cartesianMargin}>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={unifiedChartSpec.primarySeriesKey}
                  tick={valueTick}
                  allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={unifiedChartSpec.secondarySeriesKey}
                  tick={valueTick}
                  tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })}
                />
                <ZAxis type="number" dataKey="z" range={[70, 320]} />
                {Number.isFinite(unifiedChartSpec.scatterMeanX) && unifiedChartSpec.scatterPoints.length > 1 && (
                  <ReferenceLine x={unifiedChartSpec.scatterMeanX} stroke={CV.semantic.scatterMean} strokeDasharray={CV.refDash.mean} />
                )}
                {Number.isFinite(unifiedChartSpec.scatterMeanY) && unifiedChartSpec.scatterPoints.length > 1 && (
                  <ReferenceLine y={unifiedChartSpec.scatterMeanY} stroke={CV.semantic.scatterMean} strokeDasharray={CV.refDash.mean} />
                )}
                {unifiedChartSpec.scatterRegressionSegment && (
                  <ReferenceLine
                    segment={unifiedChartSpec.scatterRegressionSegment}
                    stroke={CV.semantic.ols}
                    strokeWidth={CV.stroke.series}
                    strokeDasharray={CV.refDash.ols}
                    label={{ value: 'OLS 拟合趋势线', position: 'insideTopLeft', fontSize: CV.typography.avgLabel, fill: CV.semantic.ols }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
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
                      stroke={highlightedRowKey === pt.rowKey ? CV.semantic.highlight : pt.isOutlier ? CV.semantic.negative : 'none'}
                      strokeWidth={highlightedRowKey === pt.rowKey ? CV.stroke.highlight : pt.isOutlier ? CV.stroke.series : 0}
                    />
                  ))}
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="name" position="top" style={{ fontSize: CV.typography.dataLabel, fontWeight: CV.typography.dataLabelWeight, fill: inkFill }} />
                  )}
                </Scatter>
              </ScatterChart>
            ) : chartType === 'histogram' ? (
              <BarChart data={unifiedChartSpec.histogramItems} margin={cartesianMargin}>
                <defs>
                  <linearGradient id="monokaiHistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CV.histogram.from} stopOpacity={CV.histogram.opacityFrom} />
                    <stop offset="100%" stopColor={CV.histogram.to} stopOpacity={CV.histogram.opacityTo} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                <XAxis dataKey="name" tick={{ fontSize: CV.typography.tickCategory, fill: mutedFill }} />
                <YAxis allowDecimals={false} tick={valueTick} />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
                <Bar isAnimationActive={false}
                  dataKey="count"
                  name={`${t('频数分布')} (${unifiedChartSpec.primaryValCfg.field} · ${t('点击柱体下钻明细')})`}
                  fill="url(#monokaiHistGrad)"
                  radius={CV.radius.bar}
                  cursor="pointer"
                  onClick={(d) => {
                    soundEngine?.playTransitionChord ? soundEngine.playTransitionChord() : soundEngine?.playClick(560);
                    const payload = d?.payload || d;
                    if (Number.isInteger(payload?.histogramBin)) handleChartPointClick(payload);
                  }}
                >
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="count" position="top" formatter={(v) => `${v}笔`} style={{ fontSize: CV.typography.dataLabel, fontWeight: 700, fill: inkFill }} />
                  )}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={unifiedChartSpec.items}
                layout={chartType === 'horizontal_bar' ? 'vertical' : 'horizontal'}
                margin={chartType === 'horizontal_bar' ? hbarMargin : cartesianMargin}
              >
                <defs>
                  {CHART_COLORS.map((c, idx) => (
                    <linearGradient key={`barGrad_${idx}`} id={`appleGrad_${idx}`} x1="0" y1="0" x2={chartType === 'horizontal_bar' ? '1' : '0'} y2={chartType === 'horizontal_bar' ? '0' : '1'}>
                      <stop offset="0%" stopColor={c} stopOpacity={CV.fill.barGradFrom} />
                      <stop offset="100%" stopColor={c} stopOpacity={CV.fill.barGradTo} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray={CV.grid.dash} stroke={gridStroke} />
                {chartType === 'horizontal_bar' ? (
                  <>
                    <XAxis type="number" domain={zeroBaselineDomain} tick={valueTick} allowDecimals={allowsMetricDecimals(unifiedChartSpec.primaryValCfg)} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      reversed={true}
                      width={compactAxis ? 96 : 130}
                      tick={{ fontSize: CV.typography.tickCategory, fill: inkFill }}
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
                      tick={valueTick}
                      tickFormatter={(v) => (chartType === 'pct_stacked_bar' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                    />
                  </>
                )}
                {chartType === 'horizontal_bar'
                  ? <ReferenceLine x={0} stroke={CV.semantic.zero} strokeWidth={CV.stroke.zero} />
                  : <ReferenceLine y={0} stroke={CV.semantic.zero} strokeWidth={CV.stroke.zero} />}
                {chartSpecConfig.showAvgReferenceLine && (chartType === 'bar' || chartType === 'horizontal_bar') && hasValidMean && (
                  chartType === 'horizontal_bar' ? (
                    <ReferenceLine
                      x={unifiedChartSpec.primaryStats.mean}
                      stroke={CV.semantic.mean}
                      strokeDasharray={CV.refDash.avg}
                      label={chartAvgLabel(`AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`)}
                    />
                  ) : (
                    <ReferenceLine
                      y={unifiedChartSpec.primaryStats.mean}
                      stroke={CV.semantic.mean}
                      strokeDasharray={CV.refDash.avg}
                      label={chartAvgLabel(`AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`)}
                    />
                  )
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} clickLinkMode={chartSpecConfig.clickLinkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={legendStyle} />
                {unifiedChartSpec.seriesMetaList.map((sm, idx) => {
                  const isStacked = (chartType === 'stacked_bar' || chartType === 'pct_stacked_bar') && (unifiedChartSpec.canStack || chartType === 'pct_stacked_bar');
                  return (
                    <Bar isAnimationActive={false}
                      key={sm.key}
                      dataKey={sm.key}
                      stackId={isStacked ? 'stack_bar' : undefined}
                      fill={`url(#${sm.gradId})`}
                      radius={isStacked ? CV.radius.stacked : chartBarRadius(chartType === 'stacked_bar' ? 'bar' : chartType)}
                      cursor="pointer"
                      onClick={(d) => {
                        const payload = d?.payload || d;
                        const targetRowKey = payload?._seriesRowKeys?.[sm.key] || payload?.rowKey || d?.rowKey;
                        handleChartPointClick({ ...d, rowKey: targetRowKey, colKey: sm.colKey, seriesKey: sm.key });
                      }}
                    >
                      {unifiedChartSpec.items.map((item) => <Cell key={item.rowKey} data-highlighted={highlightedRowKey === item.rowKey || (highlightedRowKey && typeof highlightedRowKey === 'string' && highlightedRowKey.startsWith(item.rowKey + '||'))} stroke={highlightedRowKey === item.rowKey ? CV.semantic.highlight : 'none'} strokeWidth={CV.stroke.highlight} fillOpacity={chartDimOpacity(Boolean(highlightedRowKey && highlightedRowKey !== item.rowKey))} />)}
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

      {/* Notes — quiet footer, no competing chrome */}
      <div className="mt-1.5 pt-1.5 flex flex-col gap-1.5 text-[10px] shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={isGuideOpen}
            aria-controls="pivot-chart-guide-note"
            onClick={toggleGuide}
            className={`px-2 py-1 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-medium transition ${isGuideOpen ? 'text-ink-purple bg-[#AE81FF]/10' : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t("阅读提示")}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isGuideOpen && (
          <div
            id="pivot-chart-guide-note"
            data-testid="chart-guide-note"
            className="flex flex-col gap-3 p-3 rounded-xl bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/70 text-[11px] leading-relaxed"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2 pr-0 md:pr-3 md:border-r border-[#D6D4C8]/50 dark:border-[#3E3D32]/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#272822] dark:text-[#F8F8F2]">
                    {t("我的结论")}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {onUpdateStoryShot && (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => {
                          soundEngine?.playClick?.(540);
                          setEditNoteForm({ title: activeShot?.title || '', subtitle: activeShot?.subtitle || '' });
                          setIsEditingNote(true);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] text-ink-muted hover:text-ink-cyan hover:bg-[#66D9EF]/10 inline-flex items-center gap-1 transition"
                        title={t("编辑结论")}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>{t("编辑")}</span>
                      </button>
                    )}
                    {copyTextToClipboard && (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyConclusion}
                          className="px-2 py-0.5 rounded-md text-[10px] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] inline-flex items-center gap-1 transition"
                          title={t("复制结论")}
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{t("复制")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportFullReport}
                          className="px-2 py-0.5 rounded-md text-[10px] text-ink-muted hover:text-ink-cyan hover:bg-[#66D9EF]/10 inline-flex items-center gap-1 transition"
                          title={t("导出 Markdown 报告")}
                        >
                          <Download className="w-2.5 h-2.5" />
                          <span>{t("导出")}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[#272822] dark:text-[#F8F8F2] leading-relaxed">
                  {activeShot?.subtitle || t("写下你从图中读到的结论，例如：谁最高、差多少、下一步查什么。")}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-[#272822] dark:text-[#F8F8F2] flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
                  {t("怎么读这张图")}
                </span>
                <p className="text-ink-muted leading-relaxed">{t(methodGuide?.purpose || '')}</p>
                <p className="text-ink-muted leading-relaxed">{t(methodGuide?.howToRead || '')}</p>
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
        currentInsight={insight}
        unifiedChartSpec={unifiedChartSpec}
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
