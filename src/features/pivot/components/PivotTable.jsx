import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { AGG_METHODS } from '../../../constants/pivotConstants';
import { getColorScaleStyle, formatCellNumber, getDimDisplayLabel } from '../../../utils/formatters';

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
}) {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {pivotResult.filteredCount === 0 && (
        <div className="bg-[#FD971F]/15 border-b border-[#FD971F]/30 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[#C86400] dark:text-[#FD971F] apple-font-mono">当前筛选条件下匹配 0 条记录</span>
          <button
            onClick={() => setPivotConfig((prev) => ({
              ...prev,
              filters: prev.filters.map((f) => ({ ...f, selectedValues: [] })),
              rows: prev.rows.map((r) => ({ ...r, excludedValues: [] })),
              columns: prev.columns.map((c) => ({ ...c, excludedValues: [] })),
            }))}
            className="px-2.5 py-0.5 rounded bg-[#F92672] text-[#F8F8F2] text-[10px] font-semibold apple-font-mono"
          >
            重置全部筛选
          </button>
        </div>
      )}
      <div ref={tableContainerRef} onScroll={(e) => setScrollTop?.(e.currentTarget.scrollTop)} className="flex-1 h-full min-h-0 overflow-auto relative">
        <table id="pivot-main-html-table" className="w-full border-separate border-spacing-0 text-[11px] text-left select-text tabular-nums">
          <thead className="sticky top-0 z-20 bg-[#EFECE1]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-md text-[#272822] dark:text-[#F8F8F2] shadow-sm">
            {pivotResult.colConfigs.length > 0 && pivotResult.colHeaderRows.length > 0 && (
              pivotResult.colHeaderRows.map((headerRow, levelIdx) => (
                <tr key={`col_level_${levelIdx}`}>
                  {levelIdx === 0 && (
                    <th colSpan={Math.max(1, pivotResult.rowConfigs.length)} rowSpan={pivotResult.colHeaderRows.length} className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-[#75715E] dark:text-[#908E80] apple-font-mono ${chartSpecConfig.stickyRowHeaders && pivotResult.rowConfigs.length <= 1 ? 'sticky left-0 z-30' : ''}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span>COL_DIM: {pivotResult.colConfigs.map((c) => getDimDisplayLabel(c)).join(' / ')}</span>
                      </div>
                    </th>
                  )}
                  {headerRow.map((hCell) => {
                    const isColCrosshair = hoveredCellTelemetry && hoveredCellTelemetry.colKey.startsWith(hCell.key);
                    return (
                      <th key={hCell.key} colSpan={hCell.colSpan} rowSpan={hCell.rowSpan} className={`border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-1.5 text-center font-semibold apple-font-mono whitespace-nowrap transition-colors ${isColCrosshair ? 'bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF]' : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-[#0088A3] dark:text-[#66D9EF]'}`}>
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
                    <th colSpan={pivotResult.valConfigs.length} rowSpan={pivotResult.colHeaderRows.length} className="border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#E5E2D5] dark:bg-[#2D2E27] px-3.5 py-2 text-center font-bold text-[#6B38FB] dark:text-[#AE81FF] apple-font-mono whitespace-nowrap">行总计</th>
                  )}
                </tr>
              ))
            )}
            <tr>
              {pivotResult.rowConfigs.length > 0 ? (
                pivotResult.rowConfigs.map((rDim, rIdx) => (
                  <th key={rDim.id} onClick={() => toggleDimensionSort('rows', rDim.id)} className={`border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-[#F92672] apple-font-mono whitespace-nowrap cursor-pointer hover:bg-black/[0.04] dark:hover:bg-[#2D2E27] transition ${chartSpecConfig.stickyRowHeaders && pivotResult.rowConfigs.length <= 1 && rIdx === 0 ? 'sticky left-0 z-30 shadow-[1px_0_0_0_rgba(62,61,50,0.6)]' : ''}`}>
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{getDimDisplayLabel(rDim)}</span>
                      {rDim.sort === 'asc' ? <ArrowUp className="w-3 h-3 text-[#A6E22E]" /> : rDim.sort === 'desc' ? <ArrowDown className="w-3 h-3 text-[#F92672]" /> : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </div>
                  </th>
                ))
              ) : (
                <th className="border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] px-3.5 py-2 font-semibold text-[#F92672]">汇总维度</th>
              )}
              {pivotResult.allColGroups.map((cGroup) =>
                pivotResult.valConfigs.map((vCfg) => {
                  const aggShort = AGG_METHODS.find((m) => m.value === vCfg.agg)?.short || vCfg.agg;
                  const isSortedCol = pivotConfig.valueSort?.colKey === cGroup.key && pivotConfig.valueSort?.valueId === vCfg.id && pivotConfig.valueSort?.direction !== 'none';
                  const isColAxisHovered = hoveredCellTelemetry?.colKey === cGroup.key && hoveredCellTelemetry?.valId === vCfg.id;
                  return (
                    <th key={`${cGroup.key}_${vCfg.id}`} onClick={() => { soundEngine?.playClick(540); cycleValueColSort(cGroup.key, vCfg.id); }} className={`border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-2 text-right font-semibold apple-font-mono whitespace-nowrap cursor-pointer transition ${isColAxisHovered ? 'bg-[#FD971F]/20 text-[#C86400] dark:text-[#FD971F]' : 'bg-[#F7F6F0] dark:bg-[#22231E] text-[#C86400] dark:text-[#FD971F] hover:bg-black/[0.03] dark:hover:bg-[#2D2E27]'}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        <span>{vCfg.field} ({aggShort})</span>
                        {isSortedCol && (pivotConfig.valueSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#A6E22E]" /> : <ArrowDown className="w-3 h-3 text-[#F92672]" />)}
                      </span>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody onMouseLeave={() => setHoveredCellTelemetry?.(null)}>
            {visibleRowWindow.topPadding > 0 && (<tr style={{ height: visibleRowWindow.topPadding }}><td colSpan={999} /></tr>)}
            {visibleRowWindow.rows.map((row) => {
              const isHighlighted = highlightedRowKey === row.rowKey;
              const isRowCrosshair = hoveredCellTelemetry?.rowKey === row.rowKey;
              return (
                <tr key={row.isSubtotal ? `${row.rowKey}__sub` : row.rowKey} className={row.isTotal ? 'bg-[#EFECE1] dark:bg-[#1E1F1C] font-bold text-[#6B38FB] dark:text-[#AE81FF] border-t border-[#ACA99A] dark:border-[#49483E]' : row.isSubtotal ? 'bg-[#66D9EF]/10 font-semibold text-[#0088A3] dark:text-[#66D9EF]' : isHighlighted ? 'bg-[#AE81FF]/20 dark:bg-[#AE81FF]/25' : isRowCrosshair ? 'bg-[#F92672]/[0.06] dark:bg-[#F92672]/[0.09]' : 'hover:bg-black/[0.03] dark:hover:bg-[#3E3D32]/40 transition-colors'}>
                  {!isVirtualized ? (
                    row.headerCells.map((hCell) => {
                      const isHeaderCellCrosshair = (hoveredCellTelemetry && hoveredCellTelemetry.rowKey.startsWith(hCell.key)) || (highlightedRowKey && highlightedRowKey.startsWith(hCell.key));
                      return (
                        <td key={hCell.key} rowSpan={hCell.rowSpan} colSpan={hCell.colSpan} onClick={() => { if (!row.isTotal && !row.isSubtotal) { soundEngine?.playClick(500); handleChartPointClick({ rowKey: row.rowKey, name: row.label }); } }} className={`border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-2 align-middle whitespace-nowrap cursor-pointer font-medium transition-colors ${isHeaderCellCrosshair ? 'text-[#F92672] font-semibold' : ''} ${chartSpecConfig.stickyRowHeaders && pivotResult.rowConfigs.length <= 1 && hCell.level === 0 ? 'sticky left-0 z-10 bg-[#FFFDF7]/95 dark:bg-[#272822]/95 backdrop-blur-sm shadow-[1px_0_0_0_rgba(62,61,50,0.5)]' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            {hCell.hasChildren && (
                              <button onClick={(e) => { e.stopPropagation(); soundEngine?.playClick(600); toggleRowCollapse(hCell.key); }} className="w-4 h-4 rounded bg-black/[0.06] dark:bg-[#3E3D32] hover:bg-[#F92672] hover:text-[#F8F8F2] flex items-center justify-center text-[10px] apple-font-mono transition">
                                {hCell.isCollapsed ? '+' : '−'}
                              </button>
                            )}
                            <span>{hCell.label}</span>
                          </div>
                        </td>
                      );
                    })
                  ) : (
                    (() => {
                      const totalRowDimCols = Math.max(1, pivotResult.rowConfigs.length);
                      if (row.isTotal) return <td colSpan={totalRowDimCols} className="border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-2 font-bold">总计</td>;
                      const segs = row.rowKey.replace('__SUBTOTAL__', '').split('||');
                      return segs.map((seg, sIdx) => (
                        <td key={`${row.rowKey}_${sIdx}`} colSpan={sIdx === segs.length - 1 ? totalRowDimCols - segs.length + 1 : 1} className="border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-2 whitespace-nowrap">
                          {seg}
                        </td>
                      ));
                    })()
                  )}

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

                      return (
                        <td
                          key={cellKey}
                          style={colorScaleStyle}
                          onMouseEnter={() => {
                            setHoveredCellTelemetry?.({
                              rowKey: row.rowKey,
                              colKey: cGroup.key,
                              valId: vCfg.id,
                              rowLabel: row.label,
                              colLabel: cGroup.pathLabels.join(' / '),
                              valLabel: `${vCfg.field}(${vCfg.agg})`,
                              formatted: formatCellNumber(cellObj, vCfg),
                              pctGrand: cellObj?.pctGrand || '0.0',
                              pctRow: cellObj?.pctRow || '0.0',
                              pctCol: cellObj?.pctCol || '0.0',
                            });
                          }}
                          onClick={() => { if (!row.isTotal && !row.isSubtotal) { soundEngine?.playClick(520); handleChartPointClick({ rowKey: row.rowKey, name: row.label }); } }}
                          onDoubleClick={() => {
                            soundEngine?.playTransitionChord();
                            const effectiveRowKey = row.isSubtotal ? row.rowKey.replace('__SUBTOTAL__', '') : row.rowKey;
                            const rawRecs = pivotResult.cellRecordsMap.get(`${effectiveRowKey}@@${cGroup.key}`) || [];
                            setDrillSearch?.('');
                            setDrillPage?.(1);
                            setDrillDownModal?.({ rowLabel: row.isTotal ? '总计' : row.label, colLabel: cGroup.isTotal ? '总计' : cGroup.pathLabels.join(' / '), valLabel: `${vCfg.field} (${vCfg.agg})`, valueFormatted: formatCellNumber(cellObj, vCfg), records: rawRecs });
                          }}
                          className={`relative border border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-2 align-middle text-right apple-font-mono whitespace-nowrap cursor-pointer transition-colors ${isTotalCell ? 'font-bold bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/85 text-[#6B38FB] dark:text-[#AE81FF]' : ''} ${isColCrosshair && !isTotalCell ? 'bg-[#66D9EF]/[0.05] dark:bg-[#66D9EF]/[0.07]' : ''} ${isExactHovered ? 'ring-1 ring-inset ring-[#F92672]' : ''} ${isCustomHit ? 'text-[#F92672] font-bold underline decoration-[#F92672]' : ''}`}
                        >
                          {barPct > 0 && (
                            <div
                              className={`absolute inset-y-1 left-1 rounded-sm pointer-events-none transition-all duration-300 ${val < 0 ? 'bg-[#F92672]/20' : 'bg-[#A6E22E]/[0.14] dark:bg-[#A6E22E]/[0.18]'}`}
                              style={{ width: `calc(${barPct}% - 8px)` }}
                            />
                          )}
                          <span className="relative z-10">{formatCellNumber(cellObj, vCfg)}</span>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
            {visibleRowWindow.bottomPadding > 0 && (<tr style={{ height: visibleRowWindow.bottomPadding }}><td colSpan={999} /></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
