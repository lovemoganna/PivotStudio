import {getMetricCatalogKey} from '../../../utils/metricCatalog.js';
import { t } from '../../../i18n.js';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  GripVertical, ArrowUp, ArrowDown,
  ArrowUpDown, Filter, RotateCcw, X, ChevronDown,
  ChevronLeft, ChevronRight, Search, PanelLeft, Layers, Info, Calculator, Plus, Trash2, FunctionSquare, Edit3, Check
} from 'lucide-react';
import { FIELD_TYPES, AGG_METHODS, SHOW_AS_MODES, buildDefaultPivotConfig } from '../../../constants/pivotConstants';
import { getDimDisplayLabel } from '../../../utils/formatters';
import { isMeasureField } from '../../../utils/fieldSemantics.js';
import { FieldProfilerModal } from './FieldProfilerModal';
import { PivotConfigPanel } from './PivotConfigPanel';
import { SmartTemplatesBar } from './SmartTemplatesBar';
import { MetricCenterPanel } from './MetricCenterPanel';
import { hasOpenDialog } from '../../../utils/useDialogFocus';

const DEFAULT_SIDEBAR_WIDTH = 440;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 680;
// Retain the existing drag limit for every way of changing the sidebar.
const getSidebarMaxWidth = (containerWidth) => Math.max(MIN_SIDEBAR_WIDTH,
  Math.min(MAX_SIDEBAR_WIDTH, Math.floor(containerWidth * 0.55)));
const clampSidebarWidth = (width, maximum) => Math.max(MIN_SIDEBAR_WIDTH, Math.min(maximum, width));

export function FieldShelf({
  requestProfile,
  onPasteText,
  children,
  cinemaTheaterMode,
  isReadOnly,
  datasets,
  activeDatasetId,
  setActiveDatasetId,
  switchDataset,
  unloadCurrentDataset,
  currentDataset,
  setHighlightedRowKey,
  setHoveredCellTelemetry,
  setPivotConfig,
  handleFileUpload,
  uploadProgress,
  soundEngine,
  setActiveDataSourceModal,
  setUploadPreviewModal,
  draggingPayload,
  setDraggingPayload,
  dragOverZone,
  setDragOverZone,
  addFieldToZone,
  removeZoneItem,
  moveZoneItem,
  toggleDimensionSort,
  setHeaderFilterSearch,
  setActiveHeaderFilterModal,
  setBinFormState,
  setActiveBinModal,
  viewMode,
  setViewMode,
  chartType,
  setChartType,
  chartSpecConfig,
  setChartSpecConfig,
  pivotConfig,
  transposeRowsAndColumns,
  unifiedChartSpec,
  highlightedRowKey,
  pivotResult,
  showToast,
  toggleFieldRole,
  setCondFormat,
  isPrintingReport,
}) {
  const setupEmpty =
    (pivotConfig?.rows?.length || 0) === 0 && (pivotConfig?.values?.length || 0) === 0;
  // Narrow viewports hide the field list by default; open it when shelves are empty so +行/+值 stay reachable.
  const [showMobileSchema, setShowMobileSchema] = useState(setupEmpty);
  useEffect(() => {
    if (setupEmpty) setShowMobileSchema(true);
  }, [setupEmpty]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('split'); // 'split' | 'fields' | 'zones'
  const [showInsightsDeck, setShowInsightsDeck] = useState(false);
  const [locationRequest, setLocationRequest] = useState(null);
  const locateField = (zone, field) => {
    setSidebarMode('split');
    setLocationRequest({zone, field, request:Date.now()});
  };
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [fieldCategoryTab, setFieldCategoryTab] = useState('all'); // 'all' | 'dimension' | 'measure' | 'unused'
  const searchInputRef = useRef(null);
  const unusedTabRef = useRef(null);
  const [profilingField, setProfilingField] = useState(null);

  // Sidebar vertical split ratio between 可用字段 and 透视结构放置区 (default 50:50 equal split)
  const [sidebarSplitPct, setSidebarSplitPct] = useState(() => {
    try {
      const saved = localStorage.getItem('pivotstudio_sidebar_split_pct');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 20 && parsed <= 80) {

          return parsed;
        }
      }
    } catch {}
    return 50;
  });
  const [isResizingSidebarSplit, setIsResizingSidebarSplit] = useState(false);
  const sidebarSplitRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('pivotstudio_sidebar_split_pct', String(sidebarSplitPct));
    } catch {}
  }, [sidebarSplitPct]);

  useEffect(() => {
    if (!isResizingSidebarSplit) return;
    const originalUserSelect = document.body.style.userSelect;
    const originalCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    const handleMouseMove = (e) => {
      if (!sidebarSplitRef.current) return;
      const rect = sidebarSplitRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;
      const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(20, Math.min(80, Math.round(rawPct)));
      setSidebarSplitPct(clamped);
    };

    const handleMouseUp = () => {
      setIsResizingSidebarSplit(false);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };
  }, [isResizingSidebarSplit]);

  const resetSidebarSplitPct = useCallback(() => {
    setSidebarSplitPct(50);
    soundEngine?.playClick?.(480);
    showToast?.('已恢复可用字段与透视结构放置区默认均分高度 (50:50)');
  }, [soundEngine, showToast]);

  const handleSidebarSplitKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSidebarSplitPct((p) => Math.max(20, p - 5));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSidebarSplitPct((p) => Math.min(80, p + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarSplitPct(20);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarSplitPct(80);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resetSidebarSplitPct();
    }
  }, [resetSidebarSplitPct]);

  const isFieldMeasure = isMeasureField;
  const [metricCenterInitialTab, setMetricCenterInitialTab] = useState('studio');
  const [metricCenterRequest, setMetricCenterRequest] = useState(0);
  const [editingMetricId, setEditingMetricId] = useState(null);

  // Persistent Custom Metrics Catalog per dataset
  const [customMetricsByDataset, setCustomMetricsByDataset] = useState(() => {
    try {
      const saved = localStorage.getItem('pivotstudio_custom_metrics_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('pivotstudio_custom_metrics_v1', JSON.stringify(customMetricsByDataset));
    } catch {}
  }, [customMetricsByDataset]);

  const datasetCatalogKey = getMetricCatalogKey(currentDataset);

  const setCustomMetricsCatalog = useCallback((updater) => {
    setCustomMetricsByDataset((prev) => {
      const currentList = Array.isArray(prev[datasetCatalogKey]) ? prev[datasetCatalogKey] : [];
      const nextList = typeof updater === 'function' ? updater(currentList) : updater;
      return {
        ...prev,
        [datasetCatalogKey]: Array.isArray(nextList) ? nextList : [],
      };
    });
  }, [datasetCatalogKey]);

  // Combine persisted catalog metrics with any active calculated metrics in pivotConfig.values
  const customMetricsCatalog = useMemo(() => {
    const savedList = Array.isArray(customMetricsByDataset[datasetCatalogKey])
      ? customMetricsByDataset[datasetCatalogKey]
      : [];
    const activeCalcs = (pivotConfig?.values || []).filter((v) => v.isCalculated);
    const map = new Map();
    for (const item of savedList) {
      if (item && (item.id || item.field)) {
        map.set(item.id || item.field, item);
      }
    }
    for (const active of activeCalcs) {
      const key = active.id || active.field;
      const existing = map.get(key) || [...map.values()].find((m) => m.field === active.field);
      if (existing) {
        map.set(existing.id || existing.field, { ...existing, ...active });
      } else {
        map.set(key, active);
      }
    }
    return Array.from(map.values());
  }, [customMetricsByDataset, datasetCatalogKey, pivotConfig?.values]);

  const openMetricCenter = useCallback((tab = 'studio', editId = null) => {
    setMetricCenterRequest((request) => request + 1);
    setMetricCenterInitialTab(tab);
    setEditingMetricId(editId);
    setShowInsightsDeck(true);
  }, []);

  const addCustomMetricToPivot = useCallback((metricSpec) => {
    if (isReadOnly || !metricSpec) return;
    soundEngine?.playClick?.(560);
    setPivotConfig?.((prev) => {
      const exists = (prev.values || []).some(
        (v) => v.id === metricSpec.id || (v.isCalculated && v.field === metricSpec.field)
      );
      if (exists) {
        showToast?.(`自定义指标「${metricSpec.field}」已在透视表中`);
        return prev;
      }
      const nextVal = {
        ...metricSpec,
        id: metricSpec.id || `v_calc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        isCalculated: true,
        agg: 'calc',
        showAs: metricSpec.showAs || 'normal',
      };
      showToast?.(`已添加自定义指标「${metricSpec.field}」到数值指标`);
      return {
        ...prev,
        values: [...(prev.values || []), nextVal],
      };
    });
  }, [isReadOnly, setPivotConfig, showToast, soundEngine]);

  const getFieldUsagePlacements = useCallback((fieldName) => {
    const placements = [];
    if ((pivotConfig?.rows || []).some((r) => r.field === fieldName)) {
      placements.push({ zone: 'rows', label: '行', bg: 'bg-[#F92672]/20 text-ink-pink border-[#F92672]/40' });
    }
    if ((pivotConfig?.columns || []).some((c) => c.field === fieldName)) {
      placements.push({ zone: 'columns', label: '列', bg: 'bg-[#66D9EF]/20 text-ink-cyan border-[#66D9EF]/40' });
    }
    if ((pivotConfig?.values || []).some((v) => v.field === fieldName || v.id === fieldName)) {
      placements.push({ zone: 'values', label: '值', bg: 'bg-[#FD971F]/20 text-ink-orange border-[#FD971F]/40' });
    }
    if ((pivotConfig?.filters || []).some((f) => f.field === fieldName)) {
      placements.push({ zone: 'filters', label: '筛', bg: 'bg-[#A6E22E]/20 text-ink-green border-[#A6E22E]/40' });
    }
    return placements;
  }, [pivotConfig?.rows, pivotConfig?.columns, pivotConfig?.values, pivotConfig?.filters]);

  const isFieldUsed = useCallback((fieldName) => {
    return (
      (pivotConfig?.rows || []).some((r) => r.field === fieldName) ||
      (pivotConfig?.columns || []).some((c) => c.field === fieldName) ||
      (pivotConfig?.values || []).some((v) => v.field === fieldName || v.id === fieldName) ||
      (pivotConfig?.filters || []).some((f) => f.field === fieldName)
    );
  }, [pivotConfig?.rows, pivotConfig?.columns, pivotConfig?.values, pivotConfig?.filters]);

  const unusedCount = useMemo(() => {
    const unUsedStd = (currentDataset?.fields || []).filter((f) => !isFieldUsed(f.name)).length;
    const unUsedCustom = customMetricsCatalog.filter((m) => !isFieldUsed(m.id || m.field)).length;
    return unUsedStd + unUsedCustom;
  }, [currentDataset?.fields, customMetricsCatalog, isFieldUsed]);

  const dimensionCount = useMemo(
    () => (currentDataset?.fields || []).filter((f) => !isFieldMeasure(f)).length,
    [currentDataset?.fields]
  );
  const measureCount = useMemo(
    () => (currentDataset?.fields || []).filter((f) => isFieldMeasure(f)).length + customMetricsCatalog.length,
    [currentDataset?.fields, customMetricsCatalog.length]
  );

  const filteredCustomMetrics = useMemo(() => {
    if (fieldCategoryTab === 'dimension') return [];
    let list = fieldCategoryTab === 'unused' ? customMetricsCatalog.filter(metric=>!isFieldUsed(metric.id || metric.field)) : customMetricsCatalog;
    if (fieldSearchQuery.trim()) {
      const q = fieldSearchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.field || '').toLowerCase().includes(q) ||
          (m.formula || '').toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [customMetricsCatalog, fieldCategoryTab, fieldSearchQuery, isFieldUsed]);

  const filteredFields = useMemo(() => {
    let list = currentDataset?.fields || [];
    if (fieldSearchQuery.trim()) {
      const q = fieldSearchQuery.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (fieldCategoryTab === 'dimension') {
      list = list.filter((f) => !isFieldMeasure(f));
    } else if (fieldCategoryTab === 'measure') {
      list = list.filter((f) => isFieldMeasure(f));
    } else if (fieldCategoryTab === 'unused') {
      list = list.filter((f) => !isFieldUsed(f.name));
    }
    return list;
  }, [currentDataset?.fields, fieldSearchQuery, fieldCategoryTab, isFieldUsed]);
  useLayoutEffect(()=>{
    if (fieldCategoryTab === 'unused' && document.activeElement === document.body) unusedTabRef.current?.focus({preventScroll:true});
  },[fieldCategoryTab, filteredFields.length, filteredCustomMetrics.length]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (hasOpenDialog()) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        const targetTag = e.target?.tagName?.toLowerCase();
        if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;
        e.preventDefault();
        setIsSidebarCollapsed((prev) => {
          const next = !prev;
          soundEngine?.playClick?.(520);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundEngine, showToast]);

  // Persist the user's preference separately from the width that currently fits.
  const [preferredSidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('pivotstudio_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {

          return parsed;
        }
      }
    } catch {}
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);
  const maxSidebarWidth = getSidebarMaxWidth(containerWidth);
  const sidebarWidth = clampSidebarWidth(preferredSidebarWidth, maxSidebarWidth);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setContainerWidth(container.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pivotstudio_sidebar_width', String(preferredSidebarWidth));
    } catch {}
  }, [preferredSidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const originalUserSelect = document.body.style.userSelect;
    const originalCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const rawWidth = Math.round(e.clientX - containerRect.left);
      setSidebarWidth(clampSidebarWidth(rawWidth, getSidebarMaxWidth(containerRect.width)));
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };
  }, [isResizingSidebar]);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    soundEngine?.playClick?.(480);
    showToast?.(t('已恢复侧边栏默认宽度（自动适配可用空间）'));
  }, [soundEngine, showToast]);

  const handleResizerKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(clampSidebarWidth(w, maxSidebarWidth) - 16, maxSidebarWidth));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth((w) => clampSidebarWidth(clampSidebarWidth(w, maxSidebarWidth) + 16, maxSidebarWidth));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(maxSidebarWidth);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resetSidebarWidth();
    }
  }, [resetSidebarWidth, maxSidebarWidth]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
        className="flex-1 min-h-0 flex flex-col md:flex-row overflow-visible md:overflow-hidden relative"
      >
        {/* Left Sidebar: Collapsible Schema Palette & Pivot Analysis Config */}
        {!cinemaTheaterMode && (
          isSidebarCollapsed ? (
            /* Desktop Collapsed Dock Bar (38px width) */
            <aside className="hidden md:flex w-10 h-full bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/90 border-r border-[#D6D4C8] dark:border-[#3E3D32] flex-col items-center justify-between py-3 shrink-0 print:hidden transition-all duration-200 select-none">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick?.(500);
                    setIsSidebarCollapsed(false);
                  }}
                  className="p-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#66D9EF] text-ink-cyan transition shadow-xs"
                  title={t("展开模型与配置侧栏 (快捷键: ⌘B / Ctrl+B)")}
                  aria-label={t("展开侧边栏")}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div
                  className="p-1 rounded-md text-ink-muted hover:text-ink-cyan cursor-pointer transition"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title={t("点击展开侧边栏")}
                >
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              {/* Mini Status Badges */}
              <div className="flex flex-col items-center gap-1.5 text-[9px] apple-font-mono font-semibold">
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#A6E22E]/20 text-ink-green" title={`筛选: ${pivotConfig.filters?.length || 0}`}>
                  {pivotConfig.filters?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#66D9EF]/20 text-ink-cyan" title={`列: ${pivotConfig.columns?.length || 0}`}>
                  {pivotConfig.columns?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#F92672]/20 text-ink-pink" title={`行: ${pivotConfig.rows?.length || 0}`}>
                  {pivotConfig.rows?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#FD971F]/20 text-ink-orange" title={`值: ${pivotConfig.values?.length || 0}`}>
                  {pivotConfig.values?.length || 0}
                </span>
              </div>
            </aside>
          ) : (
            <>
              {/* Expanded Full Sidebar */}
              <aside className={`w-full md:w-[var(--sidebar-width)] md:h-full bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/80 border-b md:border-b-0 md:border-r border-[#D6D4C8] dark:border-[#3E3D32] p-1.5 md:p-2.5 flex flex-col gap-1.5 shrink-0 print:hidden overflow-visible md:overflow-hidden ${isResizingSidebar ? 'select-none pointer-events-none' : 'transition-[width] duration-150'}`}>
              {/* Header: Title + Segmented View Switcher + Collapse Action */}
              <div className="hidden md:flex items-center justify-between pb-1.5 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/60 shrink-0 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-ink-cyan shrink-0" />
                  <span className="text-[11px] font-bold text-[#272822] dark:text-[#F8F8F2] apple-font-mono tracking-tight truncate">
                    {t("字段与透视配置")}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Segmented View Switcher: Split / Fields / Zones */}
                  <div className="flex items-center rounded p-0.5 bg-[#D6D4C8]/50 dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9.5px] apple-font-mono">
                    {[
                      { id: 'split', label: '分栏' },
                      { id: 'fields', label: '字段' },
                      { id: 'zones', label: '配置' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { soundEngine?.playClick?.(480); setSidebarMode(m.id); }}
                        aria-pressed={sidebarMode === m.id}
                        className={`px-1.5 py-0.5 min-h-[24px] rounded text-center font-semibold transition ${
                          sidebarMode === m.id
                            ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2] shadow-2xs'
                            : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                        }`}
                      >
                        {t(m.label)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine?.playClick?.(500);
                      setIsSidebarCollapsed(true);
                    }}
                    className="p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#F92672] hover:bg-black/5 dark:hover:bg-white/5 transition"
                    title={t("收起左侧模型侧边栏 (快捷键: ⌘B / Ctrl+B)")}
                    aria-label={t("收起侧边栏")}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact Dataset Indicator & Quick Switcher */}
              {datasets && datasets.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#FFFDF7]/70 dark:bg-[#1E1F1C]/70 border border-[#D6D4C8]/70 dark:border-[#3E3D32]/70 text-[10.5px] shrink-0">
                  <span className="text-ink-muted text-[10px] shrink-0 font-medium">{t("当前源:")}</span>
                  <select
                    aria-label={t("选择当前数据集")}
                    value={activeDatasetId || ''}
                    onChange={(e) => {
                      soundEngine?.playClick?.(540);
                      const nextId = e.target.value;
                      if (!nextId) {
                        setActiveDatasetId(null);
                        return;
                      }
                      const found = datasets.find((d) => d.id === nextId);
                      if (found && switchDataset) {
                        switchDataset(found.id, found);
                      } else {
                        setActiveDatasetId(nextId);
                      }
                    }}
                    className="flex-1 min-w-0 bg-transparent text-[10.5px] font-semibold text-[#272822] dark:text-[#F8F8F2] apple-font-mono focus:outline-none cursor-pointer truncate"
                  >
                    <option value="">{t("+ 新建 / 介绍主页")}</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({(d.rows?.length || 0).toLocaleString()} {t("行")})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mobile Accordion Toggle for Field Schema */}
              <div className="md:hidden border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-0.5">
                <button
                  type="button"
                  aria-expanded={showMobileSchema}
                  aria-controls="pivot-schema-fields"
                  onClick={() => setShowMobileSchema((expanded) => !expanded)}
                  className="w-full rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-2.5 py-1 text-left text-[11px] font-semibold flex items-center justify-between"
                >
                  <span className="min-w-0 truncate">
                    {t("字段列表（")}{currentDataset?.fields?.length || 0}）
                    {setupEmpty ? (
                      <span className="font-medium text-ink-muted"> · {t('点此展开并用 +行 / +值 开始')}</span>
                    ) : null}
                  </span>
                  <span className="text-ink-cyan shrink-0">{showMobileSchema ? t("收起") : t("展开")}</span>
                </button>
              </div>

              {/* Split Container: Equal 50:50 Default Height & Manual Vertical Resizer between 可用字段 & 透视结构放置区 */}
              <div
                ref={sidebarSplitRef}
                style={{
                  '--sidebar-top-pct': `${sidebarSplitPct}%`,
                  '--sidebar-bottom-pct': `${100 - sidebarSplitPct}%`,
                }}
                className={`flex-1 min-h-0 flex flex-col overflow-visible md:overflow-hidden ${isResizingSidebarSplit ? 'select-none' : ''}`}
              >
                {/* Top Pane: Schema Field Palette (可用字段) */}
                {sidebarMode !== 'zones' && (
                  <div
                    id="pivot-schema-fields"
                    className={`${showMobileSchema ? 'flex' : 'hidden'} md:flex flex-col min-h-0 ${
                      sidebarMode === 'fields'
                        ? 'flex-1 md:overflow-hidden'
                        : 'flex-none md:basis-[var(--sidebar-top-pct)] md:flex-1 md:min-h-[100px] md:overflow-hidden'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 pt-1 md:pt-0 shrink-0">
                      <span className="text-[11px] font-bold tracking-tight apple-font-mono text-[#272822] dark:text-[#F8F8F2]">
                        {' ' + t("可用字段 (")}{filteredFields.length + filteredCustomMetrics.length}/{(currentDataset?.fields?.length || 0) + customMetricsCatalog.length})
                      </span>
                      {(pivotConfig?.values?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => {
                              soundEngine?.playClick?.(540);
                              openMetricCenter('studio', null);
                            }}
                            className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#AE81FF]/15 hover:bg-[#AE81FF]/30 text-ink-purple text-[9px] font-bold inline-flex items-center gap-0.5 transition disabled:opacity-40"
                            title={t("打开指标中心新建自定义计算指标")}
                          >
                            <FunctionSquare className="w-2.5 h-2.5" />
                            <span>{t("+ 新建指标")}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Field Search & Category Filter */}
                    <div className="space-y-1 mb-1 shrink-0">
                      <div className="relative">
                        <Search className="w-3 h-3 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          aria-label={t("搜索可用字段名称")}
                          value={fieldSearchQuery}
                          onChange={(e) => setFieldSearchQuery(e.target.value)}
                          placeholder={t("搜索字段名称...")}
                          className="w-full pl-6 pr-5 py-0.5 min-h-[24px] rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10.5px] placeholder-[#75715E] text-[#272822] dark:text-[#F8F8F2] focus:outline-none focus:border-[#66D9EF] apple-font-mono"
                        />
                        {fieldSearchQuery && (
                          <button
                            onClick={() => setFieldSearchQuery('')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-[#F92672]"
                            aria-label={t("清空搜索")}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      {/* Tabs: 全部 / 维度 / 度量 */}
                      <div className="flex rounded-md p-0.5 bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9.5px] apple-font-mono">
                        <button
                          aria-pressed={fieldCategoryTab === 'all'}
                          onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('all'); }}
                          className={`flex-1 py-0.5 min-h-[24px] rounded text-center font-medium transition ${fieldCategoryTab === 'all' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2] shadow-2xs font-bold' : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
                        >{' ' + t("全部 (")}{(currentDataset?.fields?.length || 0) + customMetricsCatalog.length})
                        </button>
                        <button
                          aria-pressed={fieldCategoryTab === 'dimension'}
                          onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('dimension'); }}
                          className={`flex-1 py-0.5 min-h-[24px] rounded text-center font-medium transition ${fieldCategoryTab === 'dimension' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-ink-cyan shadow-2xs font-bold' : 'text-ink-muted hover:text-[#0088A3] dark:hover:text-[#66D9EF]'}`}
                        >{' ' + t("维度 (")}{dimensionCount})
                        </button>
                        <button
                          aria-pressed={fieldCategoryTab === 'measure'}
                          onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('measure'); }}
                          className={`flex-1 py-0.5 min-h-[24px] rounded text-center font-medium transition ${fieldCategoryTab === 'measure' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-ink-orange shadow-2xs font-bold' : 'text-ink-muted hover:text-[#C86400] dark:hover:text-[#FD971F]'}`}
                        >{' ' + t("度量 (")}{measureCount})
                        </button>
                        <button ref={unusedTabRef} type="button" aria-pressed={fieldCategoryTab === 'unused'} onClick={()=>setFieldCategoryTab('unused')}
                          className={`flex-1 py-0.5 min-h-[24px] rounded text-center font-medium ${fieldCategoryTab === 'unused' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-ink-cyan shadow-2xs' : 'text-ink-muted'}`}>
                          {t('未使用')} ({unusedCount})
                        </button>
                      </div>
                    </div>

                    {/* Draggable Field Items & Saved Custom Metrics */}
                    <div className="overflow-y-auto space-y-1 pr-0.5 flex-1 min-h-[96px] md:min-h-0 max-h-[180px] md:max-h-none">
                    {filteredFields.length === 0 && filteredCustomMetrics.length === 0 ? (
                      <div className="py-4 text-center text-xs text-ink-muted apple-font-mono space-y-1">
                        <p>{t("无匹配字段")}</p>
                        {fieldCategoryTab === 'unused' && <button type="button" onClick={()=>setFieldCategoryTab('all')} className="text-ink-cyan underline">{t('查看全部字段')}</button>}
                        {fieldSearchQuery && (
                          <button
                            onClick={() => setFieldSearchQuery('')}
                            className="text-[10px] text-ink-cyan hover:underline"
                          >{' ' + t("清空搜索条件") + ' '}</button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Saved Custom Metrics in Field Shelf */}
                        {filteredCustomMetrics.map((cm) => {
                          const isInPivot = (pivotConfig?.values || []).some(
                            (v) => v.id === cm.id || (v.isCalculated && v.field === cm.field)
                          );
                          return (
                            <div
                              key={cm.id || cm.field}
                              draggable={!isReadOnly}
                              onDragStart={(event) => {
                                const payload = { source: 'customMetric', metric: cm, field: cm.field, isCalculated: true };
                                event.dataTransfer.effectAllowed = 'copyMove';
                                event.dataTransfer.setData('application/x-pivot-field', JSON.stringify(payload));
                                event.dataTransfer.setData('text/plain', cm.field);
                                setDraggingPayload?.(payload);
                              }}
                              onDragEnd={() => {
                                setDraggingPayload?.(null);
                                setDragOverZone?.(null);
                              }}
                              onClick={(e) => {
                                if (e.target.tagName.toLowerCase() !== 'button') {
                                  addCustomMetricToPivot(cm);
                                }
                              }}
                              className="group p-1.5 rounded-lg border border-[#AE81FF]/45 bg-[#AE81FF]/[0.06] dark:bg-[#1E1F1C]/90 hover:border-[#AE81FF] flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing apple-transition select-none text-[11px]"
                              title={`自定义计算指标: ${cm.formula || `${cm.operandAField} ${cm.op} ${cm.operandBField}`}${cm.description ? ` · ${cm.description}` : ''} (点击或拖拽至数值区)`}
                            >
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <GripVertical className="w-3 h-3 shrink-0 text-ink-purple/60 group-hover:text-ink-purple transition-colors" />
                                <span className="px-1 py-0.5 rounded bg-[#AE81FF]/20 text-ink-purple text-[8.5px] font-bold apple-font-mono shrink-0">
                                  FX
                                </span>
                                <span className="font-semibold truncate text-[#272822] dark:text-[#F8F8F2]">
                                  {cm.field}
                                </span>
                                {(() => {
                                  const placements = getFieldUsagePlacements(cm.id || cm.field);
                                  if (placements.length === 0) return null;
                                  return (
                                    <div className="flex items-center gap-0.5 shrink-0 select-none">
                                      {placements.map((p) => (
                                        <button type="button"
                                          key={p.zone}
                                          onClick={event=>{event.stopPropagation();locateField(p.zone, cm.id || cm.field);}}
                                          aria-label={`${t('定位已配置字段')} · ${cm.id || cm.field} · ${t(p.label)}`}
                                          className={`px-1 py-0.5 min-h-[24px] rounded text-[9px] font-bold border ${p.bg}`}
                                          title={`已配置在：${t(p.label)}区域`}
                                        >
                                          {t(p.label)}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 apple-font-mono text-[8.5px]">
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundEngine?.playClick?.(540);
                                    openMetricCenter('studio', cm.id || cm.field);
                                  }}
                                  className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#AE81FF] hover:text-[#1E1F1C] font-semibold transition inline-flex items-center gap-0.5"
                                  title={t("在指标中心编辑该自定义指标公式")}
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                  <span>{t("公式")}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addCustomMetricToPivot(cm);
                                  }}
                                  className={`px-1.5 py-0.5 min-h-[24px] rounded font-semibold transition ${
                                    isInPivot
                                      ? 'bg-[#A6E22E]/20 text-ink-green'
                                      : 'bg-[#FD971F]/20 text-ink-orange hover:bg-[#FD971F] hover:text-[#1E1F1C]'
                                  }`}
                                  title={isInPivot ? t("该自定义指标已在数值区") : t("添加该自定义指标到数值区")}
                                >
                                  {isInPivot ? t("已上表") : t("+值")}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredFields.map((field) => {
                        const isMeasure = isFieldMeasure(field);
                        const typeCfg = FIELD_TYPES[field.type] || FIELD_TYPES.text;
                        const TypeIcon = typeCfg.icon;
                        return (
                          <div
                            key={field.name}
                            onClick={(e) => {
                              if (e.target.tagName.toLowerCase() !== 'button') {
                                soundEngine?.playClick?.(540);
                                if (isMeasure) {
                                  addFieldToZone('values', field.name);
                                  showToast?.(`已添加「${field.name}」到数值指标`);
                                } else {
                                  addFieldToZone('rows', field.name);
                                  showToast?.(`已添加「${field.name}」到行维度`);
                                }
                              }
                            }}
                            className="group p-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C]/90 hover:border-[#F92672]/60 dark:hover:border-[#66D9EF]/60 flex items-center justify-between gap-1.5 cursor-pointer apple-transition select-none text-[11px]"
                            title={`点击快速添加至${isMeasure ? '指标' : '行维度'} · 拖拽自由配置`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundEngine?.playClick?.(620);
                                  toggleFieldRole?.(field.name);
                                }}
                                disabled={isReadOnly}
                                className={`p-1 rounded border ${typeCfg.color} shrink-0 hover:scale-105 transition`}
                                title={`当前分析角色: ${isMeasure ? '度量 (数值/聚合)' : '维度 (分类/分组)'}，点击快速切换角色`}
                                aria-label={`切换${field.name}角色`}
                              >
                                <TypeIcon className="w-2.5 h-2.5" />
                              </button>
                                                            <span
                                onClick={event => {event.stopPropagation();setProfilingField(field);}}
                                data-testid={`field-${field.name}`}
                                draggable={!isReadOnly}
                                onDragStart={(event) => {
                                  const payload = { source: 'fieldList', field: field.name };
                                  event.dataTransfer.effectAllowed = 'copyMove';
                                  event.dataTransfer.setData('application/x-pivot-field',JSON.stringify(payload));
                                  event.dataTransfer.setData('text/plain',field.name);
                                  setDraggingPayload(payload);
                                }}
                                onDragEnd={() => { setDraggingPayload(null); setDragOverZone(null); }}
                                title={t('查看字段分布；也可拖拽到配置区')}
                                className="flex items-center gap-1 font-medium truncate min-w-[36px] flex-1 cursor-grab active:cursor-grabbing hover:text-ink-cyan transition-colors"
                              >
                                <GripVertical className="w-3 h-3 shrink-0 text-ink-muted" />
                                <span className="truncate">{field.name}</span>
                              </span>
                              {(() => {
                                const placements = getFieldUsagePlacements(field.name);
                                if (placements.length === 0) return null;
                                return (
                                  <div className="flex items-center gap-0.5 shrink-0 select-none">
                                    {placements.map((p) => (
                                      <button type="button"
                                        key={p.zone}
                                        onClick={event=>{event.stopPropagation();locateField(p.zone, field.name);}}
                                        aria-label={`${t('定位已配置字段')} · ${field.name} · ${t(p.label)}`}
                                        className={`px-1 py-0.5 min-h-[24px] rounded text-[9px] font-bold border ${p.bg}`}
                                        title={`已配置在：${t(p.label)}区域`}
                                      >
                                        {t(p.label)}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()}
                              <button
                                type="button"
                                aria-label={`${field.name} · ${t('查看字段分布')}`}
                                title={t('查看字段分布')}
                                onClick={event=>{event.stopPropagation();setProfilingField(field);}}
                                className="p-0.5 shrink-0 rounded text-ink-muted opacity-40 group-hover:opacity-100 hover:text-ink-cyan hover:bg-black/5 dark:hover:bg-white/10 transition"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0 text-[8.5px]">
                              {/* All four zones visible: novices must find columns/filters without opening a menu */}
                              <button
                                type="button"
                                disabled={isReadOnly}
                                aria-label={`${t('+行')} · 添加「${field.name}」到行分组`}
                                onClick={(e) => { e.stopPropagation(); addFieldToZone('rows', field.name); }}
                                className={`px-1.5 py-0.5 min-h-[24px] rounded font-semibold transition ${
                                  !isMeasure
                                    ? 'bg-[#F92672]/15 text-ink-pink hover:bg-[#F92672] hover:text-[#FFFDF7]'
                                    : 'bg-[#EFECE1] dark:bg-[#272822] text-ink-muted hover:bg-[#F92672]/20 hover:text-ink-pink'
                                }`}
                                title={t("添加到行维度")}
                              >
                                {t("+行")}
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                aria-label={`${t('+列')} · 添加「${field.name}」到列比较`}
                                onClick={(e) => { e.stopPropagation(); addFieldToZone('columns', field.name); }}
                                className={`px-1.5 py-0.5 min-h-[24px] rounded font-semibold transition ${
                                  !isMeasure
                                    ? 'bg-[#66D9EF]/15 text-ink-cyan hover:bg-[#66D9EF] hover:text-[#1E1F1C]'
                                    : 'bg-[#EFECE1] dark:bg-[#272822] text-ink-muted hover:bg-[#66D9EF]/20 hover:text-ink-cyan'
                                }`}
                                title={t("添加到列维度")}
                              >
                                {t("+列")}
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                aria-label={`${t('+值')} · 添加「${field.name}」到计算指标`}
                                onClick={(e) => { e.stopPropagation(); addFieldToZone('values', field.name); }}
                                className={`px-1.5 py-0.5 min-h-[24px] rounded font-semibold transition ${
                                  isMeasure
                                    ? 'bg-[#FD971F]/15 text-ink-orange hover:bg-[#FD971F] hover:text-[#1E1F1C]'
                                    : 'bg-[#EFECE1] dark:bg-[#272822] text-ink-muted hover:bg-[#FD971F]/20 hover:text-ink-orange'
                                }`}
                                title={t("添加到数值指标")}
                              >
                                {t("+值")}
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                aria-label={`${t('+筛')} · 添加「${field.name}」到筛选`}
                                onClick={(e) => { e.stopPropagation(); addFieldToZone('filters', field.name); }}
                                className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#A6E22E]/15 text-ink-green hover:bg-[#A6E22E] hover:text-[#1E1F1C] font-semibold transition"
                                title={t("添加到筛选条件")}
                              >
                                {t("+筛")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </>
                    )}
                    </div>
                  </div>
                )}

                {/* Horizontal Draggable Resizer Handle between 可用字段 & 透视结构放置区 */}
                {sidebarMode === 'split' && !isPrintingReport && (
                  <div
                    data-testid="sidebar-split-resizer"
                    role="separator"
                    tabIndex={0}
                    aria-orientation="horizontal"
                    aria-label={t("调节可用字段与透视结构放置区高度")}
                    aria-valuenow={sidebarSplitPct}
                    aria-valuemin={20}
                    aria-valuemax={80}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsResizingSidebarSplit(true);
                    }}
                    onDoubleClick={resetSidebarSplitPct}
                    onKeyDown={handleSidebarSplitKeyDown}
                    className={`hidden md:flex relative items-center justify-center w-full h-2.5 my-0.5 cursor-row-resize z-20 group select-none shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#66D9EF] rounded transition-colors ${
                      isResizingSidebarSplit ? 'bg-[#66D9EF]/40' : 'hover:bg-[#66D9EF]/25 active:bg-[#66D9EF]/50'
                    }`}
                    title={t("上下拖动调节可用字段与放置区高度比例 (双击恢复 50:50 均分)")}
                  >
                    <div
                      className={`h-0.5 w-10 rounded-full transition-colors ${
                        isResizingSidebarSplit
                          ? 'bg-[#66D9EF]'
                          : 'bg-[#D6D4C8] dark:bg-[#49483E] group-hover:bg-[#66D9EF]'
                      }`}
                    />
                    {isResizingSidebarSplit && (
                      <div className="absolute right-2 -top-5 px-1.5 py-0.5 rounded bg-[#272822] text-[#F8F8F2] text-[9.5px] apple-font-mono font-bold shadow-md z-30 pointer-events-none whitespace-nowrap border border-[#49483E]">
                        {sidebarSplitPct}% : {100 - sidebarSplitPct}%
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Pane: Pivot Structure Dropzones (透视结构放置区) */}
                {sidebarMode !== 'fields' && !isPrintingReport && (
                  <div
                    className="flex flex-col min-h-0 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/60 pb-1 shrink-0 px-2"
                  >
                    <SmartTemplatesBar
                      currentDataset={currentDataset}
                      setPivotConfig={setPivotConfig}
                      setChartType={setChartType}
                      setCondFormat={setCondFormat}
                      soundEngine={soundEngine}
                      showToast={showToast}
                      isReadOnly={isReadOnly}
                    />
                  </div>
                )}
                {sidebarMode !== 'fields' && !isPrintingReport && (
                  <div
                    className={`flex flex-col min-h-0 ${
                      sidebarMode === 'zones'
                        ? 'flex-1 md:overflow-hidden'
                        : 'flex-none md:basis-[var(--sidebar-bottom-pct)] md:flex-1 md:min-h-[110px] md:overflow-hidden border-t md:border-t-0 border-[#D6D4C8]/70 dark:border-[#3E3D32]/70 pt-1 md:pt-0'
                    }`}
                  >
                    <PivotConfigPanel
                      pivotConfig={pivotConfig}
                      setPivotConfig={setPivotConfig}
                      currentDataset={currentDataset}
                      locationRequest={locationRequest}
                      customMetrics={customMetricsCatalog}
                      onAddCustomMetric={addCustomMetricToPivot}
                      isReadOnly={isReadOnly}
                      draggingPayload={draggingPayload}
                      setDraggingPayload={setDraggingPayload}
                      dragOverZone={dragOverZone}
                      setDragOverZone={setDragOverZone}
                      addFieldToZone={addFieldToZone}
                      removeZoneItem={removeZoneItem}
                      moveZoneItem={moveZoneItem}
                      toggleDimensionSort={toggleDimensionSort}
                      setHeaderFilterSearch={setHeaderFilterSearch}
                      setActiveHeaderFilterModal={setActiveHeaderFilterModal}
                      setBinFormState={setBinFormState}
                      setActiveBinModal={setActiveBinModal}
                      transposeRowsAndColumns={transposeRowsAndColumns}
                      onOpenMetricCenter={() => {
                        soundEngine?.playClick?.(540);
                        openMetricCenter('studio', null);
                      }}
                      onEditCustomMetric={(metricId) => {
                        soundEngine?.playClick?.(540);
                        openMetricCenter('studio', metricId);
                      }}
                      soundEngine={soundEngine}
                      showToast={showToast}
                    />
                  </div>
                )}
              </div>
            </aside>

            {/* Draggable Resizer Handle (Desktop only) */}
            <div role="region" aria-label={t('调整工作区布局')} className="hidden md:flex w-2 -ml-1 shrink-0">
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label={t("调节侧边栏宽度")}
              aria-valuenow={sidebarWidth}
              aria-valuemin={MIN_SIDEBAR_WIDTH}
              aria-valuemax={maxSidebarWidth}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSidebar(true);
              }}
              onDoubleClick={resetSidebarWidth}
              onKeyDown={handleResizerKeyDown}
              className={`flex relative items-center justify-center w-full cursor-col-resize z-20 group select-none outline-none focus-visible:ring-2 focus-visible:ring-[#66D9EF] transition-colors ${
                isResizingSidebar ? 'bg-[#66D9EF]/50' : 'hover:bg-[#66D9EF]/30 active:bg-[#66D9EF]'
              }`}
              title={t('拖动或用方向键调整宽度；Home / End 到边界，双击或 Enter 恢复默认')}
            >
              <div
                className={`w-0.5 h-8 rounded-full transition-colors ${
                  isResizingSidebar
                    ? 'bg-[#66D9EF]'
                    : 'bg-[#D6D4C8] dark:bg-[#49483E] group-hover:bg-[#66D9EF]'
                }`}
              />
              {isResizingSidebar && (
                <div className="absolute left-3 top-2 px-2 py-0.5 rounded-md bg-[#272822] text-[#F8F8F2] text-[10px] apple-font-mono font-bold shadow-md z-30 pointer-events-none whitespace-nowrap border border-[#49483E]">
                  {sidebarWidth}px
                </div>
              )}
            </div>
            </div>
          </>
        )
      )}

        {/* Main Work Area: Full width when collapsed, 100% clean vertical space */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-visible md:overflow-hidden">
          {/* Work-area chrome: view mode + table prefs only (chart controls live in ChartStudio) */}
          <div className="px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-[#D6D4C8]/70 dark:border-[#3E3D32]/70 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {isSidebarCollapsed && !cinemaTheaterMode && (
                <button
                  onClick={() => {
                    soundEngine?.playClick?.(500);
                    setIsSidebarCollapsed(false);
                    showToast?.('已展开左侧侧边栏 (⌘B)');
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink-cyan hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition"
                  title={t("展开左侧模型与透视配置侧边栏 (快捷键: ⌘B / Ctrl+B)")}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span>{t("展开侧边栏")}</span>
                </button>
              )}

              <div className="inline-flex rounded-lg bg-[#D6D4C8]/45 dark:bg-[#1E1F1C]/80 p-0.5">
                {[
                  { id: 'table', label: '仅透视表' },
                  { id: 'split', label: '表图并列' },
                  { id: 'chart', label: '仅图表' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { soundEngine?.playClick(520); setViewMode(m.id); }}
                    aria-pressed={viewMode === m.id}
                    title={m.id === 'chart' ? t("透视图 (独立图表与笔记模式)") : undefined}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${viewMode === m.id ? 'bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2] shadow-sm' : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
                  >
                    {t(m.label)}
                  </button>
                ))}
              </div>

            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Reserve focus status space so pointer-down cannot move the table. */}
                <button
                  onClick={() => setHighlightedRowKey(null)}
                  disabled={!highlightedRowKey}
                  aria-hidden={!highlightedRowKey}
                  aria-label={`${highlightedRowKey?.replace(/\|\|/g, ' / ') || ''} × ${t('清除聚焦')}`}
                  className={`w-20 min-w-0 truncate px-2 py-0.5 rounded-md text-[11px] text-ink-orange hover:bg-[#FD971F]/12 transition ${highlightedRowKey ? '' : 'invisible'}`}
                  title={`${t('清除聚焦')}${highlightedRowKey ? `: ${highlightedRowKey.replace(/\|\|/g, ' / ')}` : ''}`}
                >
                  {highlightedRowKey?.replace(/\|\|/g, ' / ')} ×
                </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick?.(500);
                  setShowInsightsDeck((prev) => !prev);
                }}
                aria-expanded={showInsightsDeck}
                aria-label={`${t('指标中心')}${pivotConfig?.values?.length ? ` ${pivotConfig.values.length}` : ''}`}
                className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] transition ${
                  showInsightsDeck
                    ? 'bg-[#AE81FF]/12 text-ink-purple font-medium'
                    : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
                title={showInsightsDeck ? t("收起指标中心与洞察面板") : t("展开指标中心（支持新建自定义指标、KPI 卡片与推荐模版）")}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("指标中心")}</span>
                {(pivotConfig?.values?.length || 0) > 0 && (
                  <span className="text-[10px] tabular-nums opacity-70">{' '}{pivotConfig.values.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Metric Center (指标中心): Active KPI Governance, Formula Studio & Custom Metric Catalog */}
          {showInsightsDeck && currentDataset && (
            <MetricCenterPanel
              key={`${datasetCatalogKey}-${metricCenterRequest}`}
              currentDataset={currentDataset}
              pivotResult={pivotResult}
              pivotConfig={pivotConfig}
              setPivotConfig={setPivotConfig}
              unifiedChartSpec={unifiedChartSpec}
              customMetricsCatalog={customMetricsCatalog}
              setCustomMetricsCatalog={setCustomMetricsCatalog}
              addFieldToZone={addFieldToZone}
              removeZoneItem={removeZoneItem}
              setChartType={setChartType}
              setCondFormat={setCondFormat}
              soundEngine={soundEngine}
              showToast={showToast}
              isReadOnly={isReadOnly}
              onClose={() => {
                setShowInsightsDeck(false);
                setEditingMetricId(null);
              }}
              initialTab={metricCenterInitialTab}
              editingMetricId={editingMetricId}
              onClearEditingMetric={() => setEditingMetricId(null)}
            />
          )}

          {/* Main Work Content Area: Split Container with Table and Chart Studio */}
          {children}
        </main>
      </div>

      {/* Field Data Profiler Inspector Modal */}
      <FieldProfilerModal
        requestProfile={requestProfile}
        field={profilingField}
        currentDataset={currentDataset}
        onClose={() => setProfilingField(null)}
        addFieldToZone={addFieldToZone}
        soundEngine={soundEngine}
        isReadOnly={isReadOnly}
      />
    </>
  );
}
