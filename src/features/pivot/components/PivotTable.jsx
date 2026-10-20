import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowUp, ArrowDown, ArrowUpDown, Sparkles, StretchHorizontal,
  RotateCcw, Columns, Rows, AlignCenter, AlignLeft, AlignRight, Copy, Check
} from 'lucide-react';
import { AGG_METHODS } from '../../../constants/pivotConstants';
import { getColorScaleStyle, formatCellNumber, getDimDisplayLabel } from '../../../utils/formatters';
import { calculateAutoFitColumnWidths, calculateSingleColumnAutoFit } from '../../../utils/tableAutoFit';

export function PivotTable({
  pivotResult,
  pivotConfig,
  setPivotConfig,
  chartSpecConfig,
  condFormat,
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
  setDrillSearch,
  setDrillPage,
  setDrillDownModal,
  soundEngine,
  tableSettings: propTableSettings,
  setTableSettings: propSetTableSettings,
  copyTextToClipboard,
  showToast,
}) {
  // Local fallback if tableSettings not passed as props
  const [localTableSettings, setLocalTableSettings] = useState({
    density: 'normal', // 'compact' | 'normal' | 'relaxed' | 'auto'
    dataAlignment: 'center', // 'center' | 'left' | 'right' (Default: Centered)
    showZebra: true,
    wrapText: false,
    customColWidths: {},
  });

  const tableSettings = propTableSettings || localTableSettings;
  const setTableSettings = propSetTableSettings || setLocalTableSettings;

  // Dragging state for column resizing
  const [resizingCol, setResizingCol] = useState(null); // { colKey, startX, startWidth }
  const [copiedCellKey, setCopiedCellKey] = useState(null);

  // Global mouse event listeners during column resizing
  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e) => {
      const delta = e.clientX - resizingCol.startX;
      const nextWidth = Math.max(64, Math.min(600, resizingCol.startWidth + delta));
      setTableSettings((prev) => ({
        ...prev,
        customColWidths: {
          ...(prev.customColWidths || {}),
          [resizingCol.colKey]: nextWidth,
        },
      }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      soundEngine?.playClick?.(480);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, setTableSettings, soundEngine]);

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

  const getValColWidth = (cGroupKey, valId) => {
    const colKey = `${cGroupKey}_${valId}`;
    return tableSettings.customColWidths?.[colKey] || defaultValColWidth;
  };

  // Resize start handler
  const handleResizeStart = (e, colKey, currentWidth) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol({
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  };

  // Auto-fit all columns
  const handleAutoFitAll = () => {
    soundEngine?.playClick?.(620);
    const newWidths = calculateAutoFitColumnWidths(pivotResult, tableSettings.customColWidths);
    setTableSettings((prev) => ({
      ...prev,
      customColWidths: newWidths,
    }));
    showToast?.('已自动计算并自适应优化全部行高与列宽');
  };

  // Auto-fit single column (e.g. double click resize handle)
  const handleAutoFitSingle = (colKey) => {
    soundEngine?.playClick?.(580);
    const fitWidth = calculateSingleColumnAutoFit(colKey, pivotResult);
    setTableSettings((prev) => ({
      ...prev,
      customColWidths: {
        ...(prev.customColWidths || {}),
        [colKey]: fitWidth,
      },
    }));
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
        nextWidths[`${cGroup.key}_${vCfg.id}`] = equalW;
      }
    }
    setTableSettings((prev) => ({
      ...prev,
      customColWidths: nextWidths,
    }));
    showToast?.(`已均分各指标列宽 (${equalW}px)`);
  };

  // Reset column widths
  const handleResetColWidths = () => {
    soundEngine?.playClick?.(480);
    setTableSettings((prev) => ({
      ...prev,
      customColWidths: {},
    }));
    showToast?.('已恢复默认列宽配置');
  };

  // Density & Alignment CSS classes
  const densityCellPadding = {
    compact: 'px-2.5 py-1 text-[10.5px]',
    normal: 'px-3.5 py-2 text-[11px]',
    relaxed: 'px-4 py-3 text-xs',
    auto: 'px-3.5 py-2.5 text-[11px]',
  }[tableSettings.density || 'normal'];

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
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-text">
      {/* 0 matching records alert */}
      {pivotResult.filteredCount === 0 && (
        <div className="bg-[#FD971F]/15 border-b border-[#FD971F]/30 px-4 py-2 flex items-center justify-between text-xs shrink-0">
          <span className="text-[#C86400] dark:text-[#FD971F] apple-font-mono">当前筛选条件下匹配 0 条记录</span>
          <button
            onClick={() => setPivotConfig((prev) => ({
              ...prev,
              filters: prev.filters.map((f) => ({ ...f, selectedValues: [] })),
              rows: prev.rows.map((r) => ({ ...r, excludedValues: [] })),
              columns: prev.columns.map((c) => ({ ...c, excludedValues: [] })),
            }))}
            className="px-2.5 py-0.5 rounded bg-[#F92672] text-[#F8F8F2] text-[10px] font-semibold apple-font-mono hover:bg-[#FF3B85] transition"
          >
            重置全部筛选
          </button>
        </div>
      )}

      {/* Horizontal scroll helper note */}
      {pivotResult.allColGroups.length > 35 && (
        <div className="bg-[#66D9EF]/10 border-b border-[#66D9EF]/25 px-4 py-1.5 flex items-center justify-between text-[10px] apple-font-mono text-[#0088A3] dark:text-[#66D9EF] shrink-0">
          <span>提示：当前生成了 {pivotResult.allColGroups.length} 组交叉列头，已启用水平滚动视图</span>
          <span className="hidden sm:inline">按住 Shift + 鼠标滚轮可快速横向浏览</span>
        </div>
      )}

      {/* 透视表增强控制工具条 (自适应列宽、行高密度、数据居中对齐、斑马纹) */}
      <div className="bg-[#EFECE1]/90 dark:bg-[#1E1F1C]/90 border-b border-[#D6D4C8] dark:border-[#3E3D32] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] apple-font-mono shrink-0 select-none">
        {/* Left: Column Width & Row Height & Alignment */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 列宽控制组 */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] font-semibold flex items-center gap-1">
              <Columns className="w-3 h-3 text-[#66D9EF]" />
              <span className="hidden sm:inline">列宽</span>
            </span>
            <button
              onClick={handleAutoFitAll}
              title="根据当前数据和表头内容，一键自动优化所有列宽"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#66D9EF]/15 text-[#0088A3] dark:text-[#66D9EF] hover:bg-[#66D9EF]/25 active:scale-95 transition"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>自适应列宽</span>
            </button>
            <button
              onClick={handleEqualizeColumns}
              title="在可视窗口内均分指标列宽"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <StretchHorizontal className="w-2.5 h-2.5" />
              <span>均分</span>
            </button>
            <button
              onClick={handleResetColWidths}
              title="恢复默认列宽"
              className="px-1.5 py-0.5 rounded-md text-[10px] text-[#75715E] dark:text-[#908E80] hover:text-[#F92672] hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* 行高与密度控制组 */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] font-semibold flex items-center gap-1">
              <Rows className="w-3 h-3 text-[#FD971F]" />
              <span className="hidden sm:inline">行高</span>
            </span>
            {[
              { id: 'compact', label: '紧凑' },
              { id: 'normal', label: '标准' },
              { id: 'relaxed', label: '宽松' },
              { id: 'auto', label: '自适应换行' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  soundEngine?.playClick?.(520);
                  setTableSettings((p) => ({
                    ...p,
                    density: d.id,
                    wrapText: d.id === 'auto',
                  }));
                  showToast?.(`行高已设为: ${d.label}`);
                }}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition ${
                  tableSettings.density === d.id
                    ? 'bg-[#FD971F] text-[#1E1F1C] shadow-xs'
                    : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* 数据对齐方式 (居中默认) */}
          <div className="flex items-center bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-0.5 shadow-xs">
            <span className="px-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] font-semibold">对齐</span>
            <button
              onClick={() => {
                soundEngine?.playClick?.(500);
                setTableSettings((p) => ({ ...p, dataAlignment: 'center' }));
                showToast?.('数据已设置为居中对齐');
              }}
              title="数据居中对齐 (当前默认推荐)"
              className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-semibold transition ${
                currentAlignment === 'center'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              <AlignCenter className="w-3 h-3" />
              <span>居中</span>
            </button>
            <button
              onClick={() => {
                soundEngine?.playClick?.(500);
                setTableSettings((p) => ({ ...p, dataAlignment: 'left' }));
                showToast?.('数据已设置为靠左对齐');
              }}
              title="数据靠左对齐"
              className={`p-1 rounded-md transition ${
                currentAlignment === 'left'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'
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
              title="数据靠右对齐"
              className={`p-1 rounded-md transition ${
                currentAlignment === 'right'
                  ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-xs'
                  : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'
              }`}
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Quick Options (Zebra stripes, hints, stats) */}
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-[10px] text-[#75715E] dark:text-[#908E80] cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2]">
            <input
              type="checkbox"
              checked={Boolean(tableSettings.showZebra)}
              onChange={(e) => setTableSettings((p) => ({ ...p, showZebra: e.target.checked }))}
              className="rounded accent-[#A6E22E]"
            />
            <span>斑马纹</span>
          </label>
          <span className="text-[10px] text-[#75715E] dark:text-[#908E80] hidden lg:inline">
            拖拽分界线调宽 · 双击自适应
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.05] text-[9px] text-[#75715E] dark:text-[#908E80]">
            {pivotResult.tableRows.length}行 × {pivotResult.allColGroups.length * Math.max(1, pivotResult.valConfigs.length)}列
          </span>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        ref={tableContainerRef}
        onScroll={(e) => setScrollTop?.(e.currentTarget.scrollTop)}
        className="flex-1 h-full min-h-0 overflow-auto relative"
      >
        <table id="pivot-main-html-table" role="table" aria-label="多维数据透视矩阵表" className="border-separate border-spacing-0 text-[11px] select-text tabular-nums min-w-full">
          <thead role="rowgroup" className="sticky top-0 z-20 bg-[#EFECE1]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-md text-[#272822] dark:text-[#F8F8F2] shadow-sm">
            {/* Top-level Column Group Headers */}
            {pivotResult.colConfigs.length > 0 && pivotResult.colHeaderRows.length > 0 && (
              pivotResult.colHeaderRows.map((headerRow, levelIdx) => (
                <tr role="row" key={`col_level_${levelIdx}`}>
                  {levelIdx === 0 && (
                    <th
                      colSpan={Math.max(1, pivotResult.rowConfigs.length)}
                      rowSpan={pivotResult.colHeaderRows.length}
                      style={{
                        width: `${totalRowHeaderWidth}px`,
                        minWidth: `${totalRowHeaderWidth}px`,
                        left: chartSpecConfig.stickyRowHeaders ? 0 : undefined,
                      }}
                      className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-[#75715E] dark:text-[#908E80] apple-font-mono ${
                        chartSpecConfig.stickyRowHeaders
                          ? 'sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>列维度：{pivotResult.colConfigs.map((c) => getDimDisplayLabel(c)).join(' / ')}</span>
                      </div>
                    </th>
                  )}
                  {headerRow.map((hCell) => {
                    const isColCrosshair = hoveredCellTelemetry && hoveredCellTelemetry.colKey.startsWith(hCell.key);
                    return (
                      <th
                        key={hCell.key}
                        colSpan={hCell.colSpan}
                        rowSpan={hCell.rowSpan}
                        className={`relative border border-[#D6D4C8] dark:border-[#3E3D32] px-3 py-1.5 text-center font-semibold apple-font-mono whitespace-nowrap transition-colors ${
                          isColCrosshair
                            ? 'bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF]'
                            : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-[#0088A3] dark:text-[#66D9EF]'
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
                              className="w-4 h-4 rounded bg-black/[0.06] dark:bg-[#3E3D32] hover:bg-[#F92672] hover:text-[#F8F8F2] flex items-center justify-center text-[10px] transition"
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
                      colSpan={pivotResult.valConfigs.length}
                      rowSpan={pivotResult.colHeaderRows.length}
                      className="border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#E5E2D5] dark:bg-[#2D2E27] px-3.5 py-2 text-center font-bold text-[#6B38FB] dark:text-[#AE81FF] apple-font-mono whitespace-nowrap"
                    >
                      行总计
                    </th>
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

                  return (
                    <th
                      key={rDim.id}
                      tabIndex={0}
                      aria-sort={rDim.sort === 'asc' ? 'ascending' : rDim.sort === 'desc' ? 'descending' : 'none'}
                      title="点击切换排序 · 拖拽右侧分界线调宽 · 双击自适应"
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
                        left: chartSpecConfig.stickyRowHeaders ? `${stickyL}px` : undefined,
                      }}
                      className={`relative group border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] ${densityCellPadding} font-semibold text-[#F92672] apple-font-mono ${cellWrapCls} cursor-pointer hover:bg-black/[0.04] dark:hover:bg-[#2D2E27] transition ${
                        chartSpecConfig.stickyRowHeaders
                          ? `sticky z-30 ${isLastRowDim ? 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''}`
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">{getDimDisplayLabel(rDim)}</span>
                        {rDim.sort === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-[#A6E22E] shrink-0" />
                        ) : rDim.sort === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-[#F92672] shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 shrink-0" />
                        )}
                      </div>

                      {/* Interactive Column Resize Handle */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => handleResizeStart(e, rowColKey, colW)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleAutoFitSingle(rowColKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="左右拖动调整行维度列宽 · 双击自适应内容"
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#F92672] group-hover:bg-[#F92672]/30 transition z-20 flex items-center justify-center select-none"
                      >
                        <div className="w-[1px] h-3.5 bg-black/20 dark:bg-white/20 group-hover:bg-[#F92672]" />
                      </div>
                    </th>
                  );
                })
              ) : (
                <th
                  style={{
                    width: `${tableSettings.customColWidths?.['row_summary'] || defaultRowColWidth}px`,
                    minWidth: `${tableSettings.customColWidths?.['row_summary'] || defaultRowColWidth}px`,
                    left: chartSpecConfig.stickyRowHeaders ? 0 : undefined,
                  }}
                  className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-[#F92672] ${
                    chartSpecConfig.stickyRowHeaders ? 'sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : ''
                  }`}
                >
                  汇总维度
                </th>
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
                      key={valColKey}
                      tabIndex={0}
                      aria-sort={isSortedCol ? (pivotConfig.valueSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      title="点击切换排序 · 拖拽右侧分界线调宽 · 双击自适应"
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
                          ? 'bg-[#FD971F]/20 text-[#C86400] dark:text-[#FD971F]'
                          : 'bg-[#F7F6F0] dark:bg-[#22231E] text-[#C86400] dark:text-[#FD971F] hover:bg-black/[0.03] dark:hover:bg-[#2D2E27]'
                      }`}
                    >
                      <span className={`inline-flex items-center gap-1 ${dataFlexAlignCls} w-full`}>
                        <span className="truncate">{vCfg.field} ({aggShort})</span>
                        {isSortedCol && (
                          pivotConfig.valueSort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#A6E22E] shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#F92672] shrink-0" />
                          )
                        )}
                      </span>

                      {/* Interactive Column Resize Handle */}
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={(e) => handleResizeStart(e, valColKey, colW)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleAutoFitSingle(valColKey);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="左右拖动调整指标列宽 · 双击自适应内容"
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#F92672] group-hover:bg-[#F92672]/30 transition z-20 flex items-center justify-center select-none"
                      >
                        <div className="w-[1px] h-3.5 bg-black/20 dark:bg-white/20 group-hover:bg-[#F92672]" />
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          <tbody role="rowgroup" onMouseLeave={() => setHoveredCellTelemetry?.(null)}>
            {visibleRowWindow.topPadding > 0 && (
              <tr style={{ height: visibleRowWindow.topPadding }}><td colSpan={999} /></tr>
            )}
            {visibleRowWindow.rows.map((row, rowIdx) => {
              const isHighlighted = highlightedRowKey === row.rowKey;
              const isRowCrosshair = hoveredCellTelemetry?.rowKey === row.rowKey;
              const isZebraRow = tableSettings.showZebra && (rowIdx % 2 === 1) && !row.isTotal && !row.isSubtotal && !isHighlighted && !isRowCrosshair;

              return (
                <tr
                  key={row.isSubtotal ? `${row.rowKey}__sub` : row.rowKey}
                  className={`${
                    row.isTotal
                      ? 'bg-[#EFECE1] dark:bg-[#1E1F1C] font-bold text-[#6B38FB] dark:text-[#AE81FF] border-t border-[#ACA99A] dark:border-[#49483E]'
                      : row.isSubtotal
                      ? 'bg-[#66D9EF]/10 font-semibold text-[#0088A3] dark:text-[#66D9EF]'
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

                      return (
                        <td
                          role="rowheader"
                          key={hCell.key}
                          rowSpan={hCell.rowSpan}
                          colSpan={hCell.colSpan}
                          onClick={() => {
                            if (!row.isTotal && !row.isSubtotal) {
                              soundEngine?.playClick(500);
                              handleChartPointClick({ rowKey: row.rowKey, name: row.label });
                            }
                          }}
                          style={{
                            width: `${colW}px`,
                            minWidth: `${colW}px`,
                            left: chartSpecConfig.stickyRowHeaders ? `${stickyL}px` : undefined,
                          }}
                          className={`border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} align-middle ${cellWrapCls} cursor-pointer font-medium transition-colors ${
                            isHeaderCellCrosshair ? 'text-[#F92672] font-semibold' : ''
                          } ${
                            chartSpecConfig.stickyRowHeaders
                              ? `sticky z-10 ${
                                  row.isTotal
                                    ? 'bg-[#EFECE1] dark:bg-[#1E1F1C]'
                                    : row.isSubtotal
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
                                className="w-4 h-4 rounded bg-black/[0.06] dark:bg-[#3E3D32] hover:bg-[#F92672] hover:text-[#F8F8F2] flex items-center justify-center text-[10px] apple-font-mono transition shrink-0"
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
                      if (row.isTotal) {
                        return (
                          <td role="rowheader"
                            colSpan={totalRowDimCols}
                            style={{
                              width: `${totalRowHeaderWidth}px`,
                              minWidth: `${totalRowHeaderWidth}px`,
                              left: chartSpecConfig.stickyRowHeaders ? 0 : undefined,
                            }}
                            className={`border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} font-bold ${
                              chartSpecConfig.stickyRowHeaders
                                ? 'sticky left-0 z-10 bg-[#EFECE1] dark:bg-[#1E1F1C] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.45)]'
                                : ''
                            }`}
                          >
                            总计
                          </td>
                        );
                      }
                      const segs = row.rowKey.replace('__SUBTOTAL__', '').split('||');
                      return segs.map((seg, sIdx) => {
                        const isEdge = sIdx === segs.length - 1;
                        const cSpan = isEdge ? totalRowDimCols - segs.length + 1 : 1;
                        const colW = getRowColSpanWidth(sIdx, cSpan);
                        const stickyL = getRowColStickyLeft(sIdx);

                        return (
                          <td
                            key={`${row.rowKey}_${sIdx}`}
                            colSpan={cSpan}
                            style={{
                              width: `${colW}px`,
                              minWidth: `${colW}px`,
                              left: chartSpecConfig.stickyRowHeaders ? `${stickyL}px` : undefined,
                            }}
                            className={`border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} ${cellWrapCls} ${
                              chartSpecConfig.stickyRowHeaders
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
                      const isTotalCell = row.isTotal || row.isSubtotal || cGroup.isTotal;
                      const isBaseline = cellObj?.isBaseline;
                      const colorScaleStyle = !isTotalCell && !isBaseline ? getColorScaleStyle(val, stats.min, stats.max, condFormat.colorScale, darkMode) : {};
                      const barPct = !isTotalCell && !isBaseline && condFormat.showDataBar && stats.max > 0 ? Math.min(100, Math.max(0, (Math.abs(val) / Math.max(Math.abs(stats.max), Math.abs(stats.min) || 1)) * 100)) : 0;
                      const isCustomHit = !isTotalCell && !isBaseline && condFormat.customRuleEnabled && (
                        (condFormat.customRuleOp === 'gt' && val > Number(condFormat.customRuleValue)) ||
                        (condFormat.customRuleOp === 'lt' && val < Number(condFormat.customRuleValue)) ||
                        (condFormat.customRuleOp === 'eq' && val === Number(condFormat.customRuleValue))
                      );
                      const isColCrosshair = hoveredCellTelemetry?.colKey === cGroup.key && hoveredCellTelemetry?.valId === vCfg.id;
                      const isExactHovered = isRowCrosshair && isColCrosshair;
                      const isKeyboardDrill = !row.isTotal && !row.isSubtotal &&
                        cGroup.key === pivotResult.allColGroups[0]?.key &&
                        vCfg.id === pivotResult.valConfigs[0]?.id;

                      const colW = getValColWidth(cGroup.key, vCfg.id);
                      const formattedText = formatCellNumber(cellObj, vCfg);

                      const openCellDetail = () => {
                        soundEngine?.playTransitionChord();
                        const effectiveRowKey = row.isSubtotal ? row.rowKey.replace('__SUBTOTAL__', '') : row.rowKey;
                        const rawRecs = pivotResult.cellRecordsMap.get(`${effectiveRowKey}@@${cGroup.key}`) || [];
                        setDrillSearch?.('');
                        setDrillPage?.(1);
                        setDrillDownModal?.({
                          rowLabel: row.isTotal ? '总计' : row.label,
                          colLabel: cGroup.isTotal ? '总计' : cGroup.pathLabels.join(' / '),
                          valLabel: `${vCfg.field} (${vCfg.agg})`,
                          valueFormatted: formattedText,
                          records: rawRecs,
                        });
                      };

                      return (
                        <td
                          role="cell"
                          key={cellKey}
                          tabIndex={isKeyboardDrill ? 0 : undefined}
                          aria-label={`${row.isTotal ? '总计' : row.label}，${cGroup.isTotal ? '行总计' : cGroup.pathLabels.join(' / ')}，${vCfg.field}(${vCfg.agg})：${formattedText}${isKeyboardDrill ? '。双击或按 Enter 查看明细，Alt+单击复制' : ''}`}
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
                          onMouseEnter={() => {
                            setHoveredCellTelemetry?.({
                              rowKey: row.rowKey,
                              colKey: cGroup.key,
                              valId: vCfg.id,
                              rowLabel: row.label,
                              colLabel: cGroup.pathLabels.join(' / '),
                              valLabel: `${vCfg.field}(${vCfg.agg})`,
                              formatted: formattedText,
                              pctGrand: cellObj?.pctGrand || '0.0',
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
                            if (!row.isTotal && !row.isSubtotal) {
                              soundEngine?.playClick(520);
                              handleChartPointClick({ rowKey: row.rowKey, name: row.label });
                            }
                          }}
                          onDoubleClick={openCellDetail}
                          className={`relative border border-[#D6D4C8] dark:border-[#3E3D32] ${densityCellPadding} align-middle ${dataTextAlignCls} apple-font-mono ${cellWrapCls} cursor-pointer transition-colors ${
                            isTotalCell ? 'font-bold bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/85 text-[#6B38FB] dark:text-[#AE81FF]' : ''
                          } ${
                            isColCrosshair && !isTotalCell ? 'bg-[#66D9EF]/[0.05] dark:bg-[#66D9EF]/[0.07]' : ''
                          } ${
                            isExactHovered ? 'ring-2 ring-inset ring-[#F92672]' : ''
                          } ${
                            isCustomHit ? 'text-[#F92672] font-bold underline decoration-[#F92672]' : ''
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

                          {/* Centered Number Label */}
                          <span className={`relative z-10 inline-block w-full ${dataTextAlignCls} ${isWrapMode ? 'break-words' : 'truncate'}`}>
                            {formattedText}
                          </span>

                          {/* Instant Feedback on Copy */}
                          {copiedCellKey === cellKey && (
                            <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#A6E22E]/90 text-[#1E1F1C] font-bold text-[10px] rounded animate-pulse">
                              <Check className="w-3 h-3 mr-0.5" /> 已复制
                            </span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
            {visibleRowWindow.bottomPadding > 0 && (
              <tr style={{ height: visibleRowWindow.bottomPadding }}><td colSpan={999} /></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
