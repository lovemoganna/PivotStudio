import { t } from '../../../i18n.js';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ArrowUp, ArrowDown, ArrowUpDown, Sparkles, StretchHorizontal,
  RotateCcw, Columns, Rows, AlignCenter, AlignLeft, AlignRight, Copy, Check,
  Maximize2, Minimize2, Filter, Palette, GripVertical, X, Info, ChevronDown
} from 'lucide-react';
import { AGG_METHODS, SHOW_AS_MODES, buildDefaultPivotConfig } from '../../../constants/pivotConstants';
import { decodeGroupPath } from '../../../utils/groupKeys.js';
import { getColorScaleStyle, formatCellNumber, getDimDisplayLabel } from '../../../utils/formatters';
import { calculateAutoFitColumnWidths, calculateSingleColumnAutoFit } from '../../../utils/tableAutoFit';

export function PivotTable({
  requestProfile,
  pivotResult,
  pivotConfig,
  setPivotConfig,
  chartSpecConfig,
  setChartSpecConfig,
  unifiedChartSpec,
  condFormat,
  setCondFormat,
  currentDataset,
  darkMode,
  isPrintingReport,
  isVirtualized,
  visibleRowWindow,
  tableContainerRef,
  setScrollTop,
  toggleColCollapse,
  toggleRowCollapse,
  toggleDimensionSort,
  cycleValueColSort,
  highlightedRowKey,
  hoveredCellTelemetry,
  setHoveredCellTelemetry,
  handleChartPointClick,
  requestDrillDown,
  setDrillSearch,
  setDrillPage,
  setDrillDownModal,
  soundEngine,
  tableSettings: propTableSettings,
  setTableSettings: propSetTableSettings,
  viewMode,
  setViewMode,
  copyTextToClipboard,
  showToast,
  onAddRecordCount,
  isReadOnly,
  draggingPayload,
  setDraggingPayload,
  dragOverZone,
  setDragOverZone,
  addFieldToZone,
  removeZoneItem,
  moveZoneItem,
  setHeaderFilterSearch,
  setActiveHeaderFilterModal,
  setBinFormState,
  setActiveBinModal,
  transposeRowsAndColumns,
}) {
  // Local fallback if tableSettings not passed as props
  const [localTableSettings, setLocalTableSettings] = useState({
    density: 'compact', // 'compact' | 'normal' | 'relaxed' | 'auto'
    colWidthMode: 'equal', // 'equal' | 'autofit' | 'custom'
    dataAlignment: 'center', // 'center' | 'left' | 'right' (Default: Centered)
    showZebra: true,
    wrapText: false,
    showExtremes: true,
    customColWidths: {},
  });

  const tableSettings = propTableSettings || localTableSettings;
  const setTableSettings = propSetTableSettings || setLocalTableSettings;

  // Dragging state for column resizing & full-height ghost guideline
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showTableTips, setShowTableTips] = useState(false);
  const [resizingCol, setResizingCol] = useState(null); // { colKey, startX, startWidth }

  const [dragClientX, setDragClientX] = useState(null);
  const [copiedCellKey, setCopiedCellKey] = useState(null);

  // Rectangular cell range selection state for multi-cell copy
  const [selectionRange, setSelectionRange] = useState(null); // { startRow, startCol, endRow, endCol }
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Horizontal scroll state for dynamic shadow masks
  const [scrollState, setScrollState] = useState({ hasLeft: false, hasRight: false });
  const [tableViewportWidth, setTableViewportWidth] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = tableContainerRef?.current;
    if (!el) return;
    setTableViewportWidth(width => width === el.clientWidth ? width : el.clientWidth);
    const hasLeft = el.scrollLeft > 4;
    const hasRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 6;
    setScrollState((prev) => {
      if (prev.hasLeft !== hasLeft || prev.hasRight !== hasRight) {
        return { hasLeft, hasRight };
      }
      return prev;
    });
  }, [tableContainerRef]);

  useEffect(() => {
    updateScrollState();
    const el = tableContainerRef?.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, tableContainerRef, pivotResult]);

  // Row and Column Index Maps for O(1) range selection lookup
  // Available Slicer Fields (Rows + Columns + Filters, fallback to text fields)
  const slicerFields = useMemo(() => {
    const list = [];
    (pivotConfig?.rows || []).forEach((r) => { if (r.field && !list.includes(r.field)) list.push(r.field); });
    (pivotConfig?.columns || []).forEach((c) => { if (c.field && !list.includes(c.field)) list.push(c.field); });
    (pivotConfig?.filters || []).forEach((f) => { if (f.field && !list.includes(f.field)) list.push(f.field); });
    if (list.length === 0 && currentDataset?.fields) {
      currentDataset.fields.filter((f) => f.type !== 'number').forEach((f) => list.push(f.name));
    }
    return list;
  }, [pivotConfig?.rows, pivotConfig?.columns, pivotConfig?.filters, currentDataset?.fields]);

  const [activeSlicerField, setActiveSlicerField] = useState(() => slicerFields[0] || '');

  useEffect(() => {
    if (!slicerFields.includes(activeSlicerField) && slicerFields[0]) {
      setActiveSlicerField(slicerFields[0]);
    }
  }, [slicerFields, activeSlicerField]);

  // Slicer Value Pills with record counts
  const [slicerValuePills,setSlicerValuePills] = useState([]);
  useEffect(() => {
    let active=true;
    setSlicerValuePills([]);
    if(activeSlicerField) requestProfile?.(activeSlicerField).then((profile)=>{if(active && profile)setSlicerValuePills(profile.slicerValues);}).catch((error)=>{if(active && error.name!=='AbortError')showToast?.('切片器统计失败，请重新计算后重试','error');});
    return ()=>{active=false;};
  },[activeSlicerField,requestProfile,showToast]);

  // Current selected slicer values
  const currentSlicerFilter = useMemo(() => (pivotConfig?.filters || []).find((f) => f.field === activeSlicerField), [pivotConfig?.filters, activeSlicerField]);
  const currentSlicerSelected = currentSlicerFilter?.selectedValues || [];
  const slicerSelectsAll = !currentSlicerFilter?.excludeAll && currentSlicerSelected.length === 0;

  const handleSlicerToggle = useCallback((val) => {
    soundEngine?.playClick?.(540);
    setPivotConfig?.((prev) => {
      const existingFilters = prev.filters || [];
      const fIdx = existingFilters.findIndex((f) => f.field === activeSlicerField);
      if (!val) {
        if (fIdx === -1) return prev;
        const nextFilters = [...existingFilters];
        nextFilters.splice(fIdx, 1);
        return { ...prev, filters: nextFilters };
      }
      const fObj = existingFilters[fIdx] || { field: activeSlicerField, selectedValues: [] };
      const curSelected = fObj.selectedValues || [];
      const nextSelected = !fObj.excludeAll && curSelected.length === 1 && curSelected[0] === val ? [] : [val];
      const nextFilters = [...existingFilters];
      if (fIdx >= 0) {
        if (nextSelected.length === 0) {
          nextFilters.splice(fIdx, 1);
        } else {
          nextFilters[fIdx] = { ...fObj, excludeAll: false, selectedValues: nextSelected };
        }
      } else if (nextSelected.length > 0) {
        nextFilters.push({ field: activeSlicerField, selectedValues: nextSelected });
      }
      return { ...prev, filters: nextFilters };
    });
  }, [activeSlicerField, soundEngine, setPivotConfig]);

  const rowKeyToIndex = useMemo(() => {
    const map = new Map();
    (pivotResult.tableRows || []).forEach((r, idx) => {
      map.set(r.rowKey, idx);
    });
    return map;
  }, [pivotResult.tableRows]);

  const valColKeyToIndex = useMemo(() => {
    const map = new Map();
    let idx = 0;
    for (const cg of pivotResult.allColGroups || []) {
      for (const vc of pivotResult.valConfigs || []) {
        map.set(`${cg.key}_${vc.id}`, idx++);
      }
    }
    return map;
  }, [pivotResult.allColGroups, pivotResult.valConfigs]);

  // Global mouseup and copy keydown for range selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelectingRange(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectionRange(null);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'C')) {
        if (!selectionRange) return;
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

        const rows = [];
        for (let r = minR; r <= maxR; r++) {
          const rowObj = pivotResult.tableRows[r];
          if (!rowObj) continue;
          const lineCells = [];
          let colIdx = 0;
          for (const cg of pivotResult.allColGroups) {
            for (const vc of pivotResult.valConfigs) {
              if (colIdx >= minC && colIdx <= maxC) {
                const cellData = pivotResult.displayMatrix[`${rowObj.rowKey}@@${cg.key}@@${vc.id}`];
                lineCells.push(formatCellNumber(cellData, vc));
              }
              colIdx++;
            }
          }
          rows.push(lineCells.join('\t'));
        }
        if (rows.length > 0) {
          const tsv = rows.join('\n');
          e.preventDefault();
          copyTextToClipboard?.(tsv, `已复制选区数据 (${maxR - minR + 1}行 × ${maxC - minC + 1}列) 到剪贴板`);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionRange, pivotResult, copyTextToClipboard]);

  // Global mouse event listeners during column resizing
  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e) => {
      setDragClientX(e.clientX);
      const delta = e.clientX - resizingCol.startX;
      const nextWidth = Math.max(64, Math.min(600, resizingCol.startWidth + delta));
      setTableSettings((prev) => ({
        ...prev,
        colWidthMode: 'custom',
        customColWidths: {
          ...(prev.customColWidths || {}),
          [resizingCol.colKey]: nextWidth,
        },
      }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      setDragClientX(null);
      soundEngine?.playClick?.(480);
      updateScrollState();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, setTableSettings, soundEngine, updateScrollState]);

  // Width accessor helpers
  const defaultRowColWidth = 136;
  const defaultValColWidth = 118;

  const getRowColWidth = (rIdx) => {
    const rDim = pivotResult.rowConfigs[rIdx];
    const colKey = rDim ? `row_${rDim.id}` : 'row_summary';
    return tableSettings.customColWidths?.[colKey] || defaultRowColWidth;
  };

  const getRowColStickyLeft = (rIdx) => {
    let left = 0;
    for (let i = 0; i < rIdx; i++) {
      left += getRowColWidth(i);
    }
    return left;
  };

  const getRowColSpanWidth = (level, colSpan) => {
    let w = 0;
    for (let i = level; i < level + colSpan; i++) {
      w += getRowColWidth(i);
    }
    return w;
  };

  const totalRowHeaderWidth = useMemo(() => {
    if (!pivotResult.rowConfigs || pivotResult.rowConfigs.length === 0) {
      return tableSettings.customColWidths?.['row_summary'] || defaultRowColWidth;
    }
    return pivotResult.rowConfigs.reduce((sum, _, idx) => sum + getRowColWidth(idx), 0);
  }, [pivotResult.rowConfigs, tableSettings.customColWidths]);

  const currentColWidthMode = tableSettings.colWidthMode || 'equal';
  const equalValColWidth = useMemo(() => {
    const containerW = tableViewportWidth || tableContainerRef?.current?.clientWidth || 900;
    const availableW = Math.max(120, containerW - totalRowHeaderWidth - 24);
    const totalValCols = (pivotResult.allColGroups?.length || 0) * Math.max(1, pivotResult.valConfigs?.length || 1);
    if (totalValCols === 0) return defaultValColWidth;
    return Math.max(88, Math.min(260, Math.floor(availableW / totalValCols)));
  }, [tableViewportWidth, tableContainerRef, totalRowHeaderWidth, pivotResult.allColGroups?.length, pivotResult.valConfigs?.length]);

  const getValColWidth = (cGroupKey, valId) => {
    const colKey = `${cGroupKey}_${valId}`;
    if (tableSettings.customColWidths?.[colKey]) {
      return tableSettings.customColWidths[colKey];
    }
    if (currentColWidthMode === 'equal') {
      return equalValColWidth;
    }
    return defaultValColWidth;
  };
  const narrowTable = tableViewportWidth > 0 && tableViewportWidth < 640;
  const tableWidth = totalRowHeaderWidth + pivotResult.allColGroups.reduce((sum,group) => sum + pivotResult.valConfigs.reduce((valueSum,metric) => valueSum + getValColWidth(group.key,metric.id),0),0);
  const freezeAllRowHeaders = !tableViewportWidth || totalRowHeaderWidth < tableViewportWidth * 0.7;
  const freezeRowHeaders = chartSpecConfig.stickyRowHeaders && freezeAllRowHeaders;
  const freezeRowSpan = (index,span=1) => chartSpecConfig.stickyRowHeaders && (freezeAllRowHeaders || (index===0 && span===1 && getRowColWidth(0)<tableViewportWidth*0.7));

  // Grand Total Row separation: pinned to sticky tfoot
  const grandTotalRow = useMemo(() => {
    return pivotResult.tableRows.find((r) => r.isTotal);
  }, [pivotResult.tableRows]);

  // Regular body rows (excluding total row which sits pinned in tfoot)
  const bodyRows = useMemo(() => {
    return visibleRowWindow.rows.filter((r) => !r.isTotal);
  }, [visibleRowWindow.rows]);

  // Compute column max & min values across non-total data rows for visual anchors
  const colExtremesMap = useMemo(() => {
    const map = {};
    if (!tableSettings.showExtremes) return map;

    for (const cGroup of pivotResult.allColGroups) {
      for (const vCfg of pivotResult.valConfigs) {
        const colKey = `${cGroup.key}_${vCfg.id}`;
        let maxVal = -Infinity;
        let minVal = Infinity;
        let validCount = 0;

        for (const row of pivotResult.tableRows) {
          if (row.isTotal || row.isSubtotal) continue;
          const cellKey = `${row.rowKey}@@${cGroup.key}@@${vCfg.id}`;
          const val = pivotResult.displayMatrix[cellKey]?.display;
          if (typeof val === 'number' && Number.isFinite(val)) {
            validCount++;
            if (val > maxVal) maxVal = val;
            if (val < minVal) minVal = val;
          }
        }

        if (validCount > 1) {
          map[colKey] = { maxVal, minVal };
        }
      }
    }
    return map;
  }, [pivotResult.allColGroups, pivotResult.valConfigs, pivotResult.tableRows, pivotResult.displayMatrix, tableSettings.showExtremes]);

  // Resize start handler
  const handleResizeStart = (e, colKey, currentWidth) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol({
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    });
    setDragClientX(e.clientX);
  };

  // Auto-fit all columns
  const handleAutoFitAll = () => {
    soundEngine?.playClick?.(620);
    const newWidths = calculateAutoFitColumnWidths(pivotResult, tableSettings.customColWidths);
    setTableSettings((prev) => ({
      ...prev,
      colWidthMode: 'autofit',
      customColWidths: newWidths,
    }));
    setTimeout(updateScrollState, 50);
    showToast?.('已自动计算并自适应优化全部行高与列宽');
  };

  // Auto-fit single column (e.g. double click resize handle)
  const handleAutoFitSingle = (colKey) => {
    soundEngine?.playClick?.(580);
    const fitWidth = calculateSingleColumnAutoFit(colKey, pivotResult);
    setTableSettings((prev) => ({
      ...prev,
      colWidthMode: 'custom',
      customColWidths: {
        ...(prev.customColWidths || {}),
        [colKey]: fitWidth,
      },
    }));
    setTimeout(updateScrollState, 50);
    showToast?.(`已将该列宽自动调整为 ${fitWidth}px`);
  };

  // Equalize value column widths
  const handleEqualizeColumns = () => {
    soundEngine?.playClick?.(540);
    const containerW = tableContainerRef.current?.clientWidth || 900;
    const availableW = Math.max(120, containerW - totalRowHeaderWidth - 24);
    const totalValCols = pivotResult.allColGroups.length * Math.max(1, pivotResult.valConfigs.length);
    if (totalValCols === 0) return;
    const equalW = Math.max(88, Math.min(260, Math.floor(availableW / totalValCols)));

    const nextWidths = { ...(tableSettings.customColWidths || {}) };
    for (const cGroup of pivotResult.allColGroups) {
      for (const vCfg of pivotResult.valConfigs) {
        delete nextWidths[`${cGroup.key}_${vCfg.id}`];
      }
    }
    setTableSettings((prev) => ({
      ...prev,
      colWidthMode: 'equal',
      customColWidths: nextWidths,
    }));
    setTimeout(updateScrollState, 50);
    showToast?.(`已均分各指标列宽 (${equalW}px)`);
  };

  // Reset column widths
  const handleResetColWidths = () => {
    soundEngine?.playClick?.(480);
    setTableSettings((prev) => ({
      ...prev,
      colWidthMode: 'equal',
      customColWidths: {},
    }));
    setTimeout(updateScrollState, 50);
    showToast?.('已恢复默认列宽配置');
  };

  // Toggle table fullscreen / focus mode
  const handleToggleTableFocus = () => {
    soundEngine?.playClick?.(560);
    if (setViewMode) {
      if (viewMode === 'table') {
        setViewMode('split');
        showToast?.('已恢复「表图并列」模式');
      } else {
        setViewMode('table');
        showToast?.('已切换至「全屏专注表格」模式');
      }
    }
  };

  // Density & Alignment CSS classes
  const currentDensity = tableSettings.density || 'compact';
  const densityCellPadding = {
    compact: 'px-2.5 py-1 text-[10.5px]',
    normal: 'px-3.5 py-2 text-[11px]',
    relaxed: 'px-4 py-3 text-xs',
    auto: 'px-3.5 py-2.5 text-[11px]',
  }[currentDensity];

  const isWrapMode = tableSettings.density === 'auto' || tableSettings.wrapText;
  const cellWrapCls = isWrapMode ? 'whitespace-normal break-words leading-snug' : 'whitespace-nowrap';

  // Data alignment: 'center' (default), 'left', 'right'
  const currentAlignment = tableSettings.dataAlignment || 'center';
  const dataTextAlignCls = {
    center: 'text-center',
    left: 'text-left',
    right: 'text-right',
  }[currentAlignment];

  const dataFlexAlignCls = {
    center: 'justify-center',
    left: 'justify-start',
    right: 'justify-end',
  }[currentAlignment];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-text relative">
      {pivotConfig?.values?.length === 0 && (
        <div data-testid="analysis-start" className="px-4 py-3 border-b border-[#D6D4C8] dark:border-[#3E3D32] text-sm leading-6 shrink-0">
          <p className="font-semibold">{t('还没有数值指标')}</p>
          <p>{t('从字段列表点击 +值，或先统计记录数。添加行维度后，可查看每个类别有多少条记录。')}</p>
          <button type="button" disabled={isReadOnly} onClick={onAddRecordCount} className="mt-2 px-3 py-1.5 rounded bg-action text-white font-semibold disabled:opacity-40">{t('统计记录数')}</button>
        </div>
      )}
      {pivotResult.filteredCount === 0 && (
        <div className="bg-[#FD971F]/15 border-b border-[#FD971F]/30 px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <span className="text-ink-orange apple-font-mono">{t("当前筛选条件下匹配 0 条记录")}</span>
          <button
            onClick={() => setPivotConfig((prev) => ({
              ...prev,
              filters: prev.filters.map((f) => ({ ...f, excludeAll: false, selectedValues: [] })),
              rows: prev.rows.map((r) => ({ ...r, excludedValues: [] })),
              columns: prev.columns.map((c) => ({ ...c, excludedValues: [] })),
            }))}
            className="px-2.5 py-0.5 rounded bg-action text-[#F8F8F2] text-[10px] font-semibold apple-font-mono hover:bg-[#FF3B85] transition"
          >{' ' + t("重置全部筛选") + ' '}</button>
        </div>
      )}

      {/* Universal Slicer Pills Bar (通用快捷切片器胶囊条) */}
      {slicerFields.length > 0 && slicerValuePills.length > 0 && (
        <div className="bg-[#FAF8F1] dark:bg-[#22231E] border-b border-[#D6D4C8] dark:border-[#3E3D32] px-3 py-1 flex items-center gap-2 overflow-x-auto text-[10px] apple-font-mono shrink-0 select-none">
          <div className="flex items-center gap-1.5 shrink-0 text-ink-muted font-bold">
            <Filter className="w-3 h-3 text-ink-green" />
            <span className="hidden sm:inline">{t("切片器:")}</span>
            <select
              aria-label={t("选择字段切片器")}
              value={activeSlicerField}
              onChange={(e) => {
                soundEngine?.playClick?.(500);
                setActiveSlicerField(e.target.value);
              }}
              className="px-2 py-0.5 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] text-[#272822] dark:text-[#F8F8F2] font-semibold"
            >
              {slicerFields.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto min-w-0 pr-1">
            <button
              onClick={() => handleSlicerToggle(null)}
              aria-pressed={slicerSelectsAll}
              className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold transition shrink-0 ${
                slicerSelectsAll
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >{' ' + t("全部 (All)") + ' '}</button>
            {slicerValuePills.map((p) => {
              const isSelected = currentSlicerSelected.includes(p.label);
              return (
                <button
                  key={p.label}
                  onClick={() => handleSlicerToggle(p.label)}
                  aria-pressed={isSelected}
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-medium transition shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#66D9EF] text-[#1E1F1C] font-bold shadow-xs'
                      : 'bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:border-[#66D9EF] hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{p.label}</span>
                  <span className="text-ink-muted text-[9px]">({p.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiet default: keep one toggle visible; expand for column/row cosmetics. */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/60">
        <button
          type="button"
          aria-expanded={showDisplaySettings}
          aria-controls="pivot-table-display-settings"
          onClick={() => {
            soundEngine?.playClick?.(480);
            setShowDisplaySettings((open) => !open);
          }}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition ${
            showDisplaySettings
              ? 'text-ink-cyan bg-[#66D9EF]/12'
              : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          <span>{t('表格选项')}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDisplaySettings ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2 text-[10px]">
          {selectionRange && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#66D9EF]/15 border border-[#66D9EF]/30 text-ink-cyan font-semibold">
              <span className="truncate">{' ' + t("选区:") + ' '}{Math.abs((selectionRange?.endRow || 0) - (selectionRange?.startRow || 0)) + 1}{t("行 ×") + ' '}{Math.abs((selectionRange?.endCol || 0) - (selectionRange?.startCol || 0)) + 1}{t("列") + ' '}</span>
              <button
                onClick={() => setSelectionRange(null)}
                className="hover:text-[#F92672] min-w-[24px] min-h-[24px] inline-flex items-center justify-center text-xs font-bold leading-none rounded"
                title={t("清除选区 (Esc)")}
                aria-label={t("清除选区")}
              >
                ×
              </button>
            </div>
          )}
          {setViewMode && (
            <button
              onClick={handleToggleTableFocus}
              className={`p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded-md border text-[10px] font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-action text-[#F8F8F2] border-[#F92672]'
                  : 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
              title={viewMode === 'table' ? '还原为表图并列模式' : '一键最大化透视表 (全屏专注模式)'}
            >
              {viewMode === 'table' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}
          <span className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.05] text-[9px] text-ink-muted tabular-nums">
            {pivotResult.tableRows.length}{t("行 ×") + ' '}{pivotResult.allColGroups.length * Math.max(1, pivotResult.valConfigs.length)}{t("列") + ' '}
          </span>
        </div>
      </div>
      <div id="pivot-table-display-settings" className={`${showDisplaySettings ? 'flex' : 'hidden'} bg-[#EFECE1]/90 dark:bg-[#1E1F1C]/90 border-b border-[#D6D4C8] dark:border-[#3E3D32] px-3 py-1 flex-wrap items-center justify-between gap-1.5 text-[10.5px] shrink-0 select-none`}>
        {/* Left: Column Width & Row Height & Alignment */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 列宽控制组 */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-ink-muted font-semibold flex items-center gap-1">
              <Columns className="w-3 h-3 text-ink-cyan" />
              <span className="hidden sm:inline">{t("列宽")}</span>
            </span>
            <button
              onClick={handleAutoFitAll}
              aria-pressed={currentColWidthMode === 'autofit'}
              title={t("根据当前数据和表头内容，一键自动优化所有列宽")}
              className={`flex items-center gap-1 px-2 py-0.5 min-h-[24px] rounded-md text-[10px] font-semibold active:scale-95 transition ${
                currentColWidthMode === 'autofit'
                  ? 'bg-[#66D9EF] text-[#1E1F1C] shadow-xs'
                  : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{t("自适应列宽")}</span>
            </button>
            <button
              onClick={handleEqualizeColumns}
              aria-pressed={currentColWidthMode === 'equal'}
              title={t("在可视窗口内均分指标列宽")}
              className={`flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] rounded-md text-[10px] font-semibold active:scale-95 transition ${
                currentColWidthMode === 'equal'
                  ? 'bg-[#66D9EF] text-[#1E1F1C] shadow-xs'
                  : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <StretchHorizontal className="w-2.5 h-2.5" />
              <span>{t("均分")}</span>
            </button>
            <button
              onClick={handleResetColWidths}
              title={t("恢复默认列宽")}
              className="px-1.5 py-0.5 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded-md text-[10px] text-ink-muted hover:text-[#F92672] hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* 行高与密度控制组 */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-ink-muted font-semibold flex items-center gap-1">
              <Rows className="w-3 h-3 text-ink-orange" />
              <span className="hidden sm:inline">{t("行高")}</span>
            </span>
            {[
              { id: 'compact', label: '紧凑' },
              { id: 'normal', label: '标准' },
              { id: 'relaxed', label: '宽松' },
              { id: 'auto', label: '自适应换行' },
            ].map((d) => (
              <button
                key={d.id}
                aria-pressed={currentDensity === d.id}
                onClick={() => {
                  soundEngine?.playClick?.(520);
                  setTableSettings((p) => ({
                    ...p,
                    density: d.id,
                    wrapText: d.id === 'auto',
                  }));
                  showToast?.(`行高已设为: ${d.label}`);
                }}
                className={`px-1.5 py-0.5 min-h-[24px] inline-flex items-center justify-center rounded-md text-[10px] font-semibold transition ${
                  currentDensity === d.id
                    ? 'bg-[#FD971F] text-[#1E1F1C] shadow-xs'
                    : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
              >
                {t(d.label)}
              </button>
            ))}
          </div>

          {/* 数据对齐方式 (居中默认) */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-ink-muted font-semibold">{t("对齐")}</span>
            <button
              onClick={() => {
                soundEngine?.playClick?.(500);
                setTableSettings((p) => ({ ...p, dataAlignment: 'center' }));
                showToast?.('数据已设置为居中对齐');
              }}
              title={t("数据居中对齐 (当前默认推荐)")}
              className={`px-1.5 py-0.5 min-h-[24px] rounded-md flex items-center gap-1 text-[10px] font-semibold transition ${
                currentAlignment === 'center'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              <AlignCenter className="w-3 h-3" />
              <span>{t("居中")}</span>
            </button>
            <button
              onClick={() => {
                soundEngine?.playClick?.(500);
                setTableSettings((p) => ({ ...p, dataAlignment: 'left' }));
                showToast?.('数据已设置为靠左对齐');
              }}
              title={t("数据靠左对齐")}
              className={`p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded-md transition ${
                currentAlignment === 'left'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                soundEngine?.playClick?.(500);
                setTableSettings((p) => ({ ...p, dataAlignment: 'right' }));
                showToast?.('数据已设置为靠右对齐');
              }}
              title={t("数据靠右对齐")}
              className={`p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded-md transition ${
                currentAlignment === 'right'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Table toggles — secondary cosmetics live behind 表格选项 */}
        <div className="flex flex-wrap max-w-full items-center gap-2">
          {setChartSpecConfig && (
            <label className="inline-flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] min-h-[24px]" title={t("滚动时保持行表头可见")}>
              <input
                type="checkbox"
                aria-label={t("冻结行表头")}
                checked={Boolean(chartSpecConfig?.stickyRowHeaders)}
                onChange={(e) => {
                  soundEngine?.playClick?.(520);
                  setChartSpecConfig((p) => ({ ...p, stickyRowHeaders: e.target.checked }));
                }}
                className="rounded accent-[#F92672]"
              />
              <span>{t("冻结行表头")}</span>
            </label>
          )}

          <label className="inline-flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] min-h-[24px]" title={t("开启或隐藏行分组多级小计 (Subtotals)")}>
            <input
              type="checkbox"
              aria-label={t("显示行分组多级小计")}
              checked={Boolean(pivotConfig?.showSubtotals)}
              onChange={(e) => {
                soundEngine?.playClick?.(520);
                const next = e.target.checked;
                setPivotConfig?.((prev) => ({ ...prev, showSubtotals: next }));
                showToast?.(next ? '已开启行分组小计' : '已隐藏行分组小计');
              }}
              className="rounded accent-[#AE81FF]"
            />
            <span>{t("分组小计")}</span>
          </label>

          <label className="inline-flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] min-h-[24px]" title={t("标注每列最高值(●)与负数语义色")}>
            <input
              type="checkbox"
              aria-label={t("标注每列最高值与极值锚点")}
              checked={Boolean(tableSettings.showExtremes)}
              onChange={(e) => setTableSettings((p) => ({ ...p, showExtremes: e.target.checked }))}
              className="rounded accent-[#A6E22E]"
            />
            <span>{t("极值锚点")}</span>
          </label>

          <label className="inline-flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] min-h-[24px]" title={t("开启或隐藏隔行斑马纹背景")}>
            <input
              type="checkbox"
              aria-label={t("启用表格隔行斑马纹背景")}
              checked={Boolean(tableSettings.showZebra)}
              onChange={(e) => setTableSettings((p) => ({ ...p, showZebra: e.target.checked }))}
              className="rounded accent-[#A6E22E]"
            />
            <span>{t("斑马纹")}</span>
          </label>

          {/* Quick Data Bar Toggle */}
          {setCondFormat && (
            <label className="inline-flex items-center gap-1 text-[10px] text-ink-muted cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] min-h-[24px]" title={t("开启或隐藏单元格内的数值数据条可视化背景")}>
              <input
                type="checkbox"
                aria-label={t("启用单元格数据条可视化")}
                checked={Boolean(condFormat?.showDataBar)}
                onChange={(e) => {
                  soundEngine?.playClick?.(520);
                  const next = e.target.checked;
                  setCondFormat((p) => ({ ...p, showDataBar: next }));
                  showToast?.(next ? '已开启单元格数据条' : '已隐藏单元格数据条');
                }}
                className="rounded accent-[#66D9EF]"
              />
              <span>{t("数据条")}</span>
            </label>
          )}

          {/* Quick Heatmap Color Scale Toggle */}
          {setCondFormat && (
            <button
              onClick={() => {
                soundEngine?.playClick?.(560);
                setCondFormat((p) => {
                  const nextScale = p.colorScale === 'none' ? 'green_yellow_red' : p.colorScale === 'green_yellow_red' ? 'blue_scale' : 'none';
                  showToast?.(nextScale === 'none' ? '已关闭矩阵色阶' : nextScale === 'green_yellow_red' ? '已开启红-黄-绿热力图' : '已开启冰川青渐变色阶');
                  return { ...p, colorScale: nextScale };
                });
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 min-h-[24px] rounded-md text-[10px] font-semibold border transition ${
                condFormat?.colorScale && condFormat.colorScale !== 'none'
                  ? 'bg-[#FD971F]/20 text-ink-orange border-[#FD971F]/50 shadow-xs'
                  : 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
              title={t("一键循环切换矩阵热力色阶 (红黄绿三色热力 / 冰川青 / 关闭)")}
            >
              <Palette className="w-3 h-3 text-ink-orange" />
              <span className="hidden sm:inline">{t("热力色阶")}</span>
            </button>
          )}

          {/* Quick Table Tips Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine?.playClick?.(520);
              setShowTableTips((p) => !p);
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 min-h-[24px] rounded-md text-[10px] font-semibold border transition ${
              showTableTips
                ? 'bg-[#66D9EF]/20 text-ink-cyan border-[#66D9EF]/60 shadow-xs'
                : 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
            }`}
            title={t("查看透视表格高效交互与看表技巧")}
            aria-expanded={showTableTips}
          >
            <Info className="w-3 h-3 text-ink-cyan" />
            <span className="hidden sm:inline">{t("看表技巧")}</span>
          </button>

          {/* Table Focus / Maximize Button */}
          {setViewMode && (
            <button
              onClick={handleToggleTableFocus}
              className={`p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded-md border text-[10px] font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-action text-[#F8F8F2] border-[#F92672]'
                  : 'bg-[#FFFDF7] dark:bg-[#272822] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
              title={viewMode === 'table' ? '还原为表图并列模式' : '一键最大化透视表 (全屏专注模式)'}
            >
              {viewMode === 'table' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}

          <span className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.05] text-[9px] text-ink-muted">
            {pivotResult.tableRows.length}{t("行 ×") + ' '}{pivotResult.allColGroups.length * Math.max(1, pivotResult.valConfigs.length)}{t("列") + ' '}</span>
        </div>
      </div>

      {/* Beginner Table Reading & Efficiency Guide Banner */}
      {showTableTips && (
        <div className="bg-[#FFFDF7] dark:bg-[#1E1F1C] border-b border-[#66D9EF]/40 px-3.5 py-2 text-[10.5px] apple-font-mono animate-fadeIn flex flex-wrap items-center justify-between gap-3 text-ink-muted shrink-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold text-ink-cyan flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>{t("看表与交互秘籍：")}</span>
            </span>
            <span className="flex items-center gap-1">
              <strong className="text-ink-pink">🔍 {t("双击单元格")}</strong>
              <span>{t("穿透下钻原始记录明细")}</span>
            </span>
            <span className="flex items-center gap-1">
              <strong className="text-ink-green">📋 {t("框选 + ⌘C")}</strong>
              <span>{t("拖选矩形区域一键复制为 Excel TSV")}</span>
            </span>
            <span className="flex items-center gap-1">
              <strong className="text-ink-orange">⚡ {t("Alt + 单击")}</strong>
              <span>{t("闪电复制单个格式化数值")}</span>
            </span>
            <span className="flex items-center gap-1">
              <strong className="text-ink-purple">↔ {t("双击列边框")}</strong>
              <span>{t("自适应贴合最佳列宽")}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTableTips(false)}
            className="text-[10px] text-ink-muted hover:text-ink-pink px-1.5 py-0.5 rounded transition"
            title={t("收起技巧提示")}
          >
            {t("收起 ✕")}
          </button>
        </div>
      )}

      {/* Main Table Container with Horizontal Scroll Tracking */}
      <div
        ref={tableContainerRef}
        tabIndex={0}
        role="region"
        aria-label={t('透视表结果，可横向滚动')}
        onScroll={(e) => {
          setScrollTop?.(e.currentTarget.scrollTop);
          updateScrollState();
        }}
        className="flex-1 h-full min-h-0 overflow-auto relative"
      >
        {/* Horizontal Scroll Shadow Masks */}
        {scrollState.hasLeft && freezeRowHeaders && (
          <div
            style={{ left: `${totalRowHeaderWidth}px` }}
            className="absolute top-0 bottom-0 w-4 pointer-events-none z-25 bg-gradient-to-r from-black/20 dark:from-black/45 to-transparent transition-opacity"
          />
        )}
        {scrollState.hasRight && (
          <div
            className="absolute top-0 bottom-0 right-0 w-4 pointer-events-none z-25 bg-gradient-to-l from-black/15 dark:from-black/35 to-transparent transition-opacity"
          />
        )}

        {/* Full-height Ghost Guide Line during Column Resizing */}
        {resizingCol && dragClientX && (
          <div
            style={{
              left: `${dragClientX - (tableContainerRef.current?.getBoundingClientRect().left || 0) + (tableContainerRef.current?.scrollLeft || 0)}px`,
            }}
            className="absolute top-0 bottom-0 w-[2px] bg-action z-50 pointer-events-none shadow-[0_0_8px_#F92672]"
          />
        )}

        <table id="pivot-main-html-table" role="table" style={narrowTable ? {tableLayout:'fixed',width:tableWidth} : undefined} className="border-separate border-spacing-0 text-[11px] select-text tabular-nums min-w-full">
          {narrowTable && <colgroup>
            {Array.from({length:Math.max(1,pivotResult.rowConfigs.length)},(_,index)=><col key={`row-${index}`} style={{width:getRowColWidth(index)}} />)}
            {pivotResult.allColGroups.flatMap(group=>pivotResult.valConfigs.map(metric=><col key={`${group.key}-${metric.id}`} style={{width:getValColWidth(group.key,metric.id)}} />))}
          </colgroup>}
          <thead role="rowgroup" className="sticky top-0 z-20 bg-[#EFECE1]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-md text-[#272822] dark:text-[#F8F8F2] shadow-sm">
            {/* Top-level Column Group Headers */}
            {pivotResult.colConfigs.length > 0 && pivotResult.colHeaderRows.length > 0 && (
              pivotResult.colHeaderRows.map((headerRow, levelIdx) => (
                <tr role="row" key={`col_level_${levelIdx}`}>
                  {levelIdx === 0 && (
                    <th
                      role="columnheader"
                      colSpan={Math.max(1, pivotResult.rowConfigs.length)}
                      rowSpan={pivotResult.colHeaderRows.length}
                      style={{
                        width: `${totalRowHeaderWidth}px`,
                        minWidth: `${totalRowHeaderWidth}px`,
                        left: freezeRowHeaders ? 0 : undefined,
                      }}
                      className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-ink-muted apple-font-mono ${
                        freezeRowHeaders
                          ? 'sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{t("列维度：")}{pivotResult.colConfigs.map((c) => getDimDisplayLabel(c)).join(' / ')}</span>
                      </div>
                    </th>
                  )}
                  {headerRow.map((hCell) => {
                    const isColCrosshair = hoveredCellTelemetry && hoveredCellTelemetry.colKey.startsWith(hCell.key);
                    return (
                      <th
                        role="columnheader"
                        key={hCell.key}
                        colSpan={hCell.colSpan}
                        rowSpan={hCell.rowSpan}
                        className={`relative border border-[#D6D4C8] dark:border-[#3E3D32] px-3 py-1.5 text-center font-semibold apple-font-mono whitespace-nowrap transition-colors ${
                          isColCrosshair
                            ? 'bg-[#66D9EF]/20 text-ink-cyan'
                            : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-cyan'
                        }`}
                      >
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {hCell.hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine?.playClick(600);
                                toggleColCollapse(hCell.key);
                              }}
                              className="w-4 h-4 rounded bg-black/[0.06] dark:bg-[#3E3D32] hover:bg-action hover:text-[#F8F8F2] flex items-center justify-center text-[10px] transition"
                              title={hCell.isCollapsed ? '展开列分组' : '折叠列分组'}
                            >
                              {hCell.isCollapsed ? '+' : '−'}
                            </button>
                          )}
                          <span>{hCell.label}</span>
                        </div>
                      </th>
                    );
                  })}
                  {levelIdx === 0 && (
                    <th
                      role="columnheader"
                      colSpan={Math.max(1, pivotResult.valConfigs.length)}
                      rowSpan={pivotResult.colHeaderRows.length}
                      className="border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#E5E2D5] dark:bg-[#2D2E27] px-3.5 py-2 text-center font-bold text-ink-purple apple-font-mono whitespace-nowrap"
                    >{' ' + t("行总计") + ' '}</th>
                  )}
                </tr>
              ))
            )}

            {/* Bottom-level Dimension & Metric Headers */}
            <tr role="row">
              {pivotResult.rowConfigs.length > 0 ? (
                pivotResult.rowConfigs.map((rDim, rIdx) => {
                  const isLastRowDim = rIdx === pivotResult.rowConfigs.length - 1;
                  const rowColKey = `row_${rDim.id}`;
                  const colW = getRowColWidth(rIdx);
                  const stickyL = getRowColStickyLeft(rIdx);
                  const freezeRowHeaders = freezeRowSpan(rIdx);

                  return (
                    <th
                      role="columnheader"
                      key={rDim.id}
                      tabIndex={0}
                      aria-sort={rDim.sort === 'asc' ? 'ascending' : rDim.sort === 'desc' ? 'descending' : 'none'}
                      title={t("点击切换排序 · 拖拽右侧分界线调宽 · 双击自适应")}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleDimensionSort('rows', rDim.id);
                        }
                      }}
                      onClick={() => toggleDimensionSort('rows', rDim.id)}
                      style={{
                        width: `${colW}px`,
                        minWidth: `${colW}px`,
                        left: freezeRowHeaders ? `${stickyL}px` : undefined,
                      }}
                      className={`relative group border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] ${densityCellPadding} font-semibold text-ink-pink apple-font-mono ${cellWrapCls} cursor-pointer hover:bg-black/[0.04] dark:hover:bg-[#2D2E27] transition ${
                        freezeRowHeaders
                          ? `sticky z-30 ${isLastRowDim ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}`
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">{getDimDisplayLabel(rDim)}</span>
                        {rDim.sort === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-ink-green shrink-0" />
                        ) : rDim.sort === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-ink-pink shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 shrink-0" />
                        )}
                      </div>

                      {/* Interactive Column Resize Handle */}
                      <div
                        aria-hidden="true"
                        onMouseDown={(e) => handleResizeStart(e, rowColKey, colW)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleAutoFitSingle(rowColKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={t("左右拖动调整行维度列宽 · 双击自适应内容")}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-action group-hover:bg-[#F92672]/30 transition z-20 flex items-center justify-center select-none"
                      >
                        <div className="w-[1px] h-3.5 bg-black/20 dark:bg-white/20 group-hover:bg-action" />
                      </div>
                    </th>
                  );
                })
              ) : (
                <th
                  role="columnheader"
                  style={{
                    width: `${tableSettings.customColWidths?.['row_summary'] || defaultRowColWidth}px`,
                    minWidth: `${tableSettings.customColWidths?.['row_summary'] || defaultRowColWidth}px`,
                    left: freezeRowHeaders ? 0 : undefined,
                  }}
                  className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-ink-pink ${
                    freezeRowHeaders ? 'sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''
                  }`}
                >{' ' + t("汇总维度") + ' '}</th>
              )}

              {/* Value Metric Headers - Centered by default matching data */}
              {pivotResult.allColGroups.map((cGroup) =>
                pivotResult.valConfigs.map((vCfg) => {
                  const aggShort = AGG_METHODS.find((m) => m.value === vCfg.agg)?.short || vCfg.agg;
                  const isSortedCol = pivotConfig.valueSort?.colKey === cGroup.key && pivotConfig.valueSort?.valueId === vCfg.id && pivotConfig.valueSort?.direction !== 'none';
                  const isColAxisHovered = hoveredCellTelemetry?.colKey === cGroup.key && hoveredCellTelemetry?.valId === vCfg.id;
                  const valColKey = `${cGroup.key}_${vCfg.id}`;
                  const colW = getValColWidth(cGroup.key, vCfg.id);

                  return (
                    <th
                      role="columnheader"
                      key={valColKey}
                      tabIndex={0}
                      aria-sort={isSortedCol ? (pivotConfig.valueSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      title={t("点击切换排序 · 拖拽右侧分界线调宽 · 双击自适应")}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          cycleValueColSort(cGroup.key, vCfg.id);
                        }
                      }}
                      onClick={() => {
                        soundEngine?.playClick(540);
                        cycleValueColSort(cGroup.key, vCfg.id);
                      }}
                      style={{
                        width: `${colW}px`,
                        minWidth: `${colW}px`,
                      }}
                      className={`relative group border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} ${dataTextAlignCls} font-semibold apple-font-mono ${cellWrapCls} cursor-pointer transition ${
                        isColAxisHovered
                          ? 'bg-[#FD971F]/20 text-ink-orange'
                          : 'bg-[#F7F6F0] dark:bg-[#22231E] text-ink-orange hover:bg-black/[0.03] dark:hover:bg-[#2D2E27]'
                      }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${dataFlexAlignCls} w-full`}>
                        <span className="truncate">{vCfg.field === '__COUNT__' ? t('记录数') : vCfg.field} ({aggShort})</span>
                        {isSortedCol && (
                          pivotConfig.valueSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-ink-green shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-ink-pink shrink-0" />
                          )
                        )}
                      </span>

                      {/* Interactive Column Resize Handle */}
                      <div
                        aria-hidden="true"
                        onMouseDown={(e) => handleResizeStart(e, valColKey, colW)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleAutoFitSingle(valColKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={t("左右拖动调整指标列宽 · 双击自适应内容")}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-action group-hover:bg-[#F92672]/30 transition z-20 flex items-center justify-center select-none"
                      >
                        <div className="w-[1px] h-3.5 bg-black/20 dark:bg-white/20 group-hover:bg-action" />
                      </div>
                    </th>
                  );
                })
              )}
              {pivotResult.valConfigs.length === 0 && (
                <th
                  role="columnheader"
                  className={`border border-dashed border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} text-center font-normal apple-font-mono text-[11px] bg-[#FAF8F1] dark:bg-[#1E1F1C] min-w-[160px]`}
                >
                  <div className="flex items-center justify-center gap-1.5 text-ink-orange font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("待配置数值指标")}</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody role="rowgroup" onMouseLeave={() => setHoveredCellTelemetry?.(null)}>
            {visibleRowWindow.topPadding > 0 && (
              <tr style={{ height: visibleRowWindow.topPadding }}><td colSpan={999} /></tr>
            )}
            {bodyRows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(1, pivotResult?.rowConfigs?.length || 1) + Math.max(1, (pivotResult?.allColGroups?.length || 1) * Math.max(1, pivotResult?.valConfigs?.length || 1))}
                  className="py-12 px-6 text-center text-xs text-ink-muted bg-[#FFFDF7]/60 dark:bg-[#1E1F1C]/60"
                >
                  {pivotResult?.filteredRowCount === 0 && (pivotResult?.totalRowCount || 0) > 0 ? (
                    <div className="space-y-2 max-w-md mx-auto">
                      <p className="font-semibold text-ink-orange">
                        {t('当前筛选条件排除了全部记录（0 条匹配）')}
                      </p>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        {t('请在左侧【筛选条件】或表头筛选中取消勾选排除项，或点击下方重置筛选。')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPivotConfig?.((prev) => ({
                            ...prev,
                            filters: [],
                            rows: (prev.rows || []).map((r) => ({ ...r, excludedValues: [] })),
                            columns: (prev.columns || []).map((c) => ({ ...c, excludedValues: [] })),
                          }));
                          showToast?.('已清空全部筛选条件');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#A6E22E] bg-[#A6E22E]/15 text-ink-green font-semibold text-xs apple-font-mono hover:scale-105 transition"
                      >
                        {t('清空全部筛选条件')}
                      </button>
                    </div>
                  ) : (pivotResult?.rowConfigs?.length || 0) === 0 && (pivotResult?.valConfigs?.length || 0) === 0 ? (
                    <div className="space-y-2 max-w-md mx-auto">
                      <p className="font-semibold text-[#272822] dark:text-[#F8F8F2]">
                        {t('透视表未配置分组维度与数值指标')}
                      </p>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
                        {t('点击左侧字段旁的【+行】添加分组，或点击【+值】添加统计指标；也可使用上方「推荐配置」一键生成分析。')}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentDataset?.fields?.length) {
                              setPivotConfig?.(buildDefaultPivotConfig(currentDataset));
                              showToast?.('已应用推荐透视结构');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#66D9EF] bg-[#66D9EF]/15 text-ink-cyan font-semibold text-xs apple-font-mono hover:scale-105 transition"
                        >
                          {t('一键应用推荐透视')}
                        </button>
                        <button
                          type="button"
                          onClick={onAddRecordCount}
                          className="px-3 py-1.5 rounded-lg border border-[#FD971F] bg-[#FD971F]/15 text-ink-orange font-semibold text-xs apple-font-mono hover:scale-105 transition"
                        >
                          {t('+ 添加记录数指标')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-ink-muted">
                      {t('当前视图无行维度分组数据。可在左侧为行区域添加维度以展开明细。')}
                    </div>
                  )}
                </td>
              </tr>
            )}
            {bodyRows.map((row, rowIdx) => {
              const isHighlighted = highlightedRowKey === row.rowKey;
              const isRowCrosshair = hoveredCellTelemetry?.rowKey === row.rowKey;
              const isZebraRow = tableSettings.showZebra && (rowIdx % 2 === 1) && !row.isSubtotal && !isHighlighted && !isRowCrosshair;

              return (
                <tr
                  role="row"
                  key={row.isSubtotal ? `${row.rowKey}__sub` : row.rowKey}
                  className={`${
                    row.isSubtotal
                      ? 'bg-[#66D9EF]/10 font-semibold text-ink-cyan'
                      : isHighlighted
                      ? 'bg-[#AE81FF]/20 dark:bg-[#AE81FF]/25'
                      : isRowCrosshair
                      ? 'bg-[#F92672]/[0.06] dark:bg-[#F92672]/[0.09]'
                      : isZebraRow
                      ? 'bg-black/[0.018] dark:bg-white/[0.02]'
                      : ''
                  } hover:bg-black/[0.035] dark:hover:bg-[#3E3D32]/40 transition-colors`}
                >
                  {/* Row Dimension Cells */}
                  {!isVirtualized ? (
                    row.headerCells.map((hCell) => {
                      const isHeaderCellCrosshair = (hoveredCellTelemetry && hoveredCellTelemetry.rowKey.startsWith(hCell.key)) || (highlightedRowKey && highlightedRowKey.startsWith(hCell.key));
                      const isStickyEdge = (hCell.level + hCell.colSpan) >= Math.max(1, pivotResult.rowConfigs.length);
                      const colW = getRowColSpanWidth(hCell.level, hCell.colSpan);
                      const stickyL = getRowColStickyLeft(hCell.level);
                      const freezeRowHeaders = freezeRowSpan(hCell.level,hCell.colSpan);

                      return (
                        <td
                          role="rowheader"
                          key={hCell.key}
                          rowSpan={hCell.rowSpan}
                          colSpan={hCell.colSpan}
                          onClick={() => {
                            if (!row.isSubtotal) {
                              soundEngine?.playClick(500);
                              handleChartPointClick({ rowKey: row.rowKey, name: row.label });
                            }
                          }}
                          style={{
                            width: `${colW}px`,
                            minWidth: `${colW}px`,
                            left: freezeRowHeaders ? `${stickyL}px` : undefined,
                          }}
                          className={`border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} align-middle ${cellWrapCls} cursor-pointer font-medium transition-colors ${
                            isHeaderCellCrosshair ? 'text-ink-pink font-semibold' : ''
                          } ${
                            freezeRowHeaders
                              ? `sticky z-10 ${
                                  row.isSubtotal
                                    ? 'bg-[#EDF8FA] dark:bg-[#202728]'
                                    : isHighlighted
                                    ? 'bg-[#F1ECFB] dark:bg-[#2C273A]'
                                    : isZebraRow
                                    ? 'bg-[#FAF8F1] dark:bg-[#252620]'
                                    : 'bg-[#FFFDF7] dark:bg-[#272822]'
                                } ${isStickyEdge ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.45)]' : ''}`
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {hCell.hasChildren && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundEngine?.playClick(600);
                                  toggleRowCollapse(hCell.key);
                                }}
                                className="w-4 h-4 rounded bg-black/[0.06] dark:bg-[#3E3D32] hover:bg-action hover:text-[#F8F8F2] flex items-center justify-center text-[10px] apple-font-mono transition shrink-0"
                              >
                                {hCell.isCollapsed ? '+' : '−'}
                              </button>
                            )}
                            <span className={isWrapMode ? 'break-words' : 'truncate'}>{hCell.label}</span>
                          </div>
                        </td>
                      );
                    })
                  ) : (
                    (() => {
                      const totalRowDimCols = Math.max(1, pivotResult.rowConfigs.length);
                      const segs = decodeGroupPath(row.rowKey);
                      return segs.map((seg, sIdx) => {
                        const isEdge = sIdx === segs.length - 1;
                        const cSpan = isEdge ? totalRowDimCols - segs.length + 1 : 1;
                        const colW = getRowColSpanWidth(sIdx, cSpan);
                        const stickyL = getRowColStickyLeft(sIdx);
                        const freezeRowHeaders = freezeRowSpan(sIdx,cSpan);

                        return (
                          <td
                            role="rowheader"
                            key={`${row.rowKey}_${sIdx}`}
                            colSpan={cSpan}
                            style={{
                              width: `${colW}px`,
                              minWidth: `${colW}px`,
                              left: freezeRowHeaders ? `${stickyL}px` : undefined,
                            }}
                            className={`border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} ${cellWrapCls} ${
                              freezeRowHeaders
                                ? `sticky z-10 ${
                                    isZebraRow
                                      ? 'bg-[#FAF8F1] dark:bg-[#252620]'
                                      : 'bg-[#FFFDF7] dark:bg-[#272822]'
                                  } ${isEdge ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.45)]' : ''}`
                                : ''
                            }`}
                          >
                            {seg}
                          </td>
                        );
                      });
                    })()
                  )}

                  {/* Value / Measure Data Cells - Centered by default as requested */}
                  {pivotResult.allColGroups.map((cGroup) =>
                    pivotResult.valConfigs.map((vCfg) => {
                      const cellKey = `${row.rowKey}@@${cGroup.key}@@${vCfg.id}`;
                      const cellObj = pivotResult.displayMatrix[cellKey];
                      const stats = pivotResult.statsByValId[vCfg.id] || { min: 0, max: 100 };
                      const val = cellObj?.display ?? 0;
                      const isSubtotalCell = row.isSubtotal || cGroup.isTotal;
                      const isBaseline = cellObj?.isBaseline;
                      const colorScaleStyle = !isSubtotalCell && !isBaseline ? getColorScaleStyle(val, stats.min, stats.max, condFormat.colorScale, darkMode) : {};
                      const barPct = !isSubtotalCell && !isBaseline && condFormat.showDataBar && stats.max > 0 ? Math.min(100, Math.max(0, (Math.abs(val) / Math.max(Math.abs(stats.max), Math.abs(stats.min) || 1)) * 100)) : 0;
                      const isCustomHit = !isSubtotalCell && !isBaseline && condFormat.customRuleEnabled && (
                        (condFormat.customRuleOp === 'gt' && val > Number(condFormat.customRuleValue)) ||
                        (condFormat.customRuleOp === 'lt' && val < Number(condFormat.customRuleValue)) ||
                        (condFormat.customRuleOp === 'eq' && val === Number(condFormat.customRuleValue))
                      );
                      const isColCrosshair = hoveredCellTelemetry?.colKey === cGroup.key && hoveredCellTelemetry?.valId === vCfg.id;
                      const isExactHovered = isRowCrosshair && isColCrosshair;
                      const isKeyboardDrill = !row.isSubtotal &&
                        cGroup.key === pivotResult.allColGroups[0]?.key &&
                        vCfg.id === pivotResult.valConfigs[0]?.id;

                      const colW = getValColWidth(cGroup.key, vCfg.id);
                      const formattedText = formatCellNumber(cellObj, vCfg);

                      // Column extremes & negative value semantic styling
                      const extremes = colExtremesMap[`${cGroup.key}_${vCfg.id}`];
                      const isColMax = extremes && val === extremes.maxVal && val > 0 && !isSubtotalCell;
                      const isNegative = typeof val === 'number' && val < 0;

                      // Range selection lookup
                      const rIdx = rowKeyToIndex.get(row.rowKey);
                      const cIdx = valColKeyToIndex.get(`${cGroup.key}_${vCfg.id}`);
                      const isCellSelected = Boolean(
                        selectionRange &&
                        rIdx !== undefined &&
                        cIdx !== undefined &&
                        rIdx >= Math.min(selectionRange.startRow, selectionRange.endRow) &&
                        rIdx <= Math.max(selectionRange.startRow, selectionRange.endRow) &&
                        cIdx >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
                        cIdx <= Math.max(selectionRange.startCol, selectionRange.endCol)
                      );

                      const openCellDetail = () => {
                        soundEngine?.playTransitionChord();
                        const effectiveRowKey = row.isSubtotal ? row.rowKey.replace('__SUBTOTAL__', '') : row.rowKey;
                        requestDrillDown?.(effectiveRowKey, cGroup.key, {
                          rowLabel: row.label,
                          colLabel: cGroup.isTotal ? '总计' : cGroup.pathLabels.join(' / '),
                          valLabel: `${vCfg.field} (${vCfg.agg})`, valueFormatted: formattedText,
                        });
                      };

                      return (
                        <td
                          role="cell"
                          data-testid="pivot-value-cell"
                          data-row-key={row.rowKey}
                          key={cellKey}
                          title={`${row.label} · ${cGroup.isTotal ? t('行总计') : cGroup.pathLabels.join(' / ')}: ${formattedText} (${t('双击穿透明细 / Alt+单击复制')})`}
                          tabIndex={isKeyboardDrill ? 0 : undefined}
                          aria-label={`${row.label}，${cGroup.isTotal ? '行总计' : cGroup.pathLabels.join(' / ')}，${vCfg.field}(${vCfg.agg})：${formattedText}${isKeyboardDrill ? '。双击查看明细，Alt+单击复制' : ''}`}
                          onKeyDown={isKeyboardDrill ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openCellDetail();
                            }
                          } : undefined}
                          style={{
                            width: `${colW}px`,
                            minWidth: `${colW}px`,
                            ...colorScaleStyle,
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 0 && !e.altKey && rIdx !== undefined && cIdx !== undefined) {
                              // Highlight before range selection can alter toolbar/scroll geometry.
                              if (!row.isSubtotal) handleChartPointClick({ rowKey: row.rowKey, name: row.label });
                              setIsSelectingRange(true);
                              setSelectionRange({
                                startRow: rIdx,
                                startCol: cIdx,
                                endRow: rIdx,
                                endCol: cIdx,
                              });
                            }
                          }}
                          onMouseEnter={() => {
                            if (isSelectingRange && rIdx !== undefined && cIdx !== undefined) {
                              setSelectionRange((prev) => (prev ? { ...prev, endRow: rIdx, endCol: cIdx } : null));
                            }
                            setHoveredCellTelemetry?.({
                              rowKey: row.rowKey,
                              colKey: cGroup.key,
                              valId: vCfg.id,
                              rowLabel: row.label,
                              colLabel: cGroup.pathLabels.join(' / '),
                              valLabel: `${vCfg.field}(${vCfg.agg})`,
                              formatted: formattedText,
                              hasAdditiveShares: Number.isFinite(cellObj?.raw) && cellObj?.pctGrand !== null && ['sum', 'count'].includes(vCfg.agg) && (!vCfg.showAs || vCfg.showAs === 'normal'),
                              pctGrand: cellObj?.pctGrand ?? null,
                              pctRow: cellObj?.pctRow || '0.0',
                              pctCol: cellObj?.pctCol || '0.0',
                            });
                          }}
                          onClick={(e) => {
                            // Alt+Click quick copies value
                            if (e.altKey) {
                              e.stopPropagation();
                              if (copyTextToClipboard) {
                                copyTextToClipboard(formattedText, `已复制单元格数值: ${formattedText}`);
                                setCopiedCellKey(cellKey);
                                setTimeout(() => setCopiedCellKey(null), 1600);
                              }
                              return;
                            }
                            if (!row.isSubtotal) {
                              soundEngine?.playClick(520);
                              handleChartPointClick({ rowKey: row.rowKey, name: row.label });
                            }
                          }}
                          onDoubleClick={openCellDetail}
                          className={`relative border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} align-middle ${dataTextAlignCls} apple-font-mono ${cellWrapCls} cursor-pointer transition-colors ${
                            isCellSelected ? 'bg-[#66D9EF]/25 dark:bg-[#66D9EF]/35 ring-1.5 ring-inset ring-[#66D9EF] font-bold z-1' : ''
                          } ${
                            isSubtotalCell ? 'font-semibold bg-[#66D9EF]/10 text-ink-cyan' : ''
                          } ${
                            isNegative ? 'text-ink-pink dark:text-[#FF8CAF] font-medium' : ''
                          } ${
                            isColCrosshair && !isSubtotalCell && !isCellSelected ? 'bg-[#66D9EF]/[0.05] dark:bg-[#66D9EF]/[0.07]' : ''
                          } ${
                            isExactHovered && !isCellSelected ? 'ring-2 ring-inset ring-[#F92672]' : ''
                          } ${
                            isCustomHit ? 'text-ink-pink font-bold underline decoration-[#F92672]' : ''
                          }`}
                        >
                          {/* Inner Data Bar */}
                          {barPct > 0 && (
                            <div
                              className={`absolute inset-y-1 left-1 rounded-sm pointer-events-none transition-all duration-300 ${
                                val < 0 ? 'bg-[#F92672]/20' : 'bg-[#A6E22E]/[0.15] dark:bg-[#A6E22E]/[0.2]'
                              }`}
                              style={{ width: `calc(${barPct}% - 8px)` }}
                            />
                          )}

                          {/* Number Label with Column Max Indicator */}
                          <span className={`relative z-10 inline-flex items-center ${dataFlexAlignCls} w-full ${isWrapMode ? 'break-words' : 'truncate'}`}>
                            {isColMax && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full bg-[#A6E22E] shadow-[0_0_6px_#A6E22E] mr-1 shrink-0"
                                title={t("该指标列当前最高峰值 (Max)")}
                              />
                            )}
                            <span>{formattedText}</span>
                          </span>

                          {/* Instant Feedback on Copy */}
                          {copiedCellKey === cellKey && (
                            <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#A6E22E]/90 text-[#1E1F1C] font-bold text-[10px] rounded animate-pulse">
                              <Check className="w-3 h-3 mr-0.5" />{' ' + t("已复制") + ' '}</span>
                          )}
                        </td>
                      );
                    })
                  )}
                  {pivotResult.valConfigs.length === 0 && (
                    <td
                      className={`border border-dashed border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} text-center apple-font-mono text-xs bg-[#FFFDF7]/60 dark:bg-[#272822]/60`}
                    >
                      {row.isTotal ? (
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            soundEngine?.playClick?.(540);
                            onAddRecordCount?.();
                          }}
                          className="px-2 py-0.5 rounded bg-[#FD971F]/15 hover:bg-[#FD971F]/25 text-ink-orange font-semibold text-[10px] apple-font-mono transition inline-flex items-center gap-1"
                          title={t("一键添加「记录数」指标查看分布行数")}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{t("+ 统计记录数")}</span>
                        </button>
                      ) : (
                        <span className="text-ink-muted/50 text-[10px]">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {visibleRowWindow.bottomPadding > 0 && (
              <tr style={{ height: visibleRowWindow.bottomPadding }}><td colSpan={999} /></tr>
            )}
          </tbody>

          {/* Sticky Bottom Grand Total Foot */}
          {grandTotalRow && (
            <tfoot role="rowgroup" className="sticky bottom-0 z-20 bg-[#EFECE1] dark:bg-[#1E1F1C] border-t-2 border-[#ACA99A] dark:border-[#49483E] shadow-[0_-3px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_-3px_8px_rgba(0,0,0,0.4)]">
              <tr role="row" className="font-bold text-ink-purple">
                <td
                  role="rowheader"
                  colSpan={Math.max(1, pivotResult.rowConfigs.length)}
                  style={{
                    width: `${totalRowHeaderWidth}px`,
                    minWidth: `${totalRowHeaderWidth}px`,
                    left: freezeRowHeaders ? 0 : undefined,
                  }}
                  className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] ${densityCellPadding} ${
                    freezeRowHeaders
                      ? 'sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{t("总计 (Grand Total)")}</span>
                    <span className="text-[9px] text-ink-muted font-normal font-mono">{t("全量聚合")}</span>
                  </div>
                </td>
                {pivotResult.allColGroups.map((cGroup) =>
                  pivotResult.valConfigs.map((vCfg) => {
                    const cellKey = `${grandTotalRow.rowKey}@@${cGroup.key}@@${vCfg.id}`;
                    const cellObj = pivotResult.displayMatrix[cellKey];
                    const colW = getValColWidth(cGroup.key, vCfg.id);
                    const formattedText = formatCellNumber(cellObj, vCfg);

                    const openGrandTotalDetail = () => {
                      soundEngine?.playTransitionChord();
                      requestDrillDown?.(grandTotalRow.rowKey, cGroup.key, {
                        rowLabel: t('总计 (Grand Total)'),
                        colLabel: cGroup.isTotal ? t('总计') : (cGroup.pathLabels?.join(' / ') || t('全量')),
                        valLabel: `${vCfg.field} (${vCfg.agg})`,
                        valueFormatted: formattedText,
                      });
                    };

                    return (
                      <td
                        role="cell"
                        key={`foot_${cellKey}`}
                        onDoubleClick={openGrandTotalDetail}
                        title={t("双击查看此总计项对应的原始交易明细")}
                        style={{
                          width: `${colW}px`,
                          minWidth: `${colW}px`,
                        }}
                        className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] ${densityCellPadding} ${dataTextAlignCls} apple-font-mono font-bold text-ink-purple cursor-pointer hover:bg-[#66D9EF]/20 transition-colors`}
                      >
                        <span className={`block w-full ${dataTextAlignCls} truncate`}>
                          {formattedText}
                        </span>
                      </td>
                    );
                  })
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
