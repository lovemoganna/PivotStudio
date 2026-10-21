import { t } from '../../../i18n.js';
import React from 'react';
import {
  BarChart3, Sliders, Maximize2, Minimize2, X
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine,
  LabelList, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { CHART_COLORS, VISUAL_CHART_TYPES, KEYNOTE_STORYBOARD_SHOTS } from '../../../constants/pivotConstants';
import { UnifiedFormatter, formatAxisTickLabel, formatCellNumber } from '../../../utils/formatters';
import { UnifiedChartTooltip } from './UnifiedChartTooltip';
import { renderSmartPieLabel, renderSmartBarLabel } from './SmartChartLabels';

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
  handleChartPointClick,
  setDrillDownModal,
  setDrillSearch,
  setDrillPage,
  applyKeynoteShot,
  keynoteShotIdx,
  soundEngine,
}) {
  const [showChartTypes, setShowChartTypes] = React.useState(false);
  const [showLensPresets, setShowLensPresets] = React.useState(false);
  const chartTypeToggleRef = React.useRef(null);
  const restoreScopeFocusRef = React.useRef(false);
  React.useEffect(() => {
    if (!unifiedChartSpec.renderLimit && restoreScopeFocusRef.current) {
      // A completed scope action removes its button; keep keyboard navigation in the chart.
      if (document.activeElement === document.body) chartTypeToggleRef.current?.focus({ preventScroll: true });
      restoreScopeFocusRef.current = false;
    }
  }, [unifiedChartSpec]);
  const [compactAxis, setCompactAxis] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  React.useEffect(() => {
    const measure = () => setCompactAxis(window.innerWidth < 640);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // Display a representative subset of categorical axis ticks without dropping data points.
  const axisMaxLabels = compactAxis ? 4 : 8;
  const categoryTickInterval = Math.max(0, Math.ceil((unifiedChartSpec.items?.length || 0) / axisMaxLabels) - 1);
  return (
    <div data-highlighted-row={highlightedRowKey || ''} className="flex-1 flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div>
          <h3 className="text-xs font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2 apple-font-mono">
            <BarChart3 className="w-4 h-4 text-ink-pink" />
            <span>{t(VISUAL_CHART_TYPES.find((type) => type.value === chartType)?.label || chartType)}</span>
            {unifiedChartSpec.derivedSeriesKey && (
              <span className="px-1.5 py-0.2 rounded bg-[#AE81FF]/20 text-ink-purple text-[9px]">
                +{unifiedChartSpec.derivedSeriesKey}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-ink-muted mt-0.5 apple-font-mono flex items-center gap-2">
            <span>{t("维度：")}{unifiedChartSpec.xDimensionLabel}{' ' + t("· 指标：")}{unifiedChartSpec.primarySeriesKey}</span>
            {!unifiedChartSpec.canStack && (chartType === 'stacked_bar' || chartType === 'stacked_area') && (
              <span className="px-1.5 py-0.2 rounded bg-[#FD971F]/15 text-ink-orange border border-[#FD971F]/30 text-[9px]">{' ' + t("量纲不同已自动按分组呈现") + ' '}</span>
            )}
          </p>
          {unifiedChartSpec.scope && <p role="status" className="text-[10px] text-ink-muted mt-1 break-words">
            {t("图表范围：")}{unifiedChartSpec.scope.shown} / {unifiedChartSpec.scope.total} {t("组；表格和 KPI 保持全量。")}
          </p>}
          {unifiedChartSpec.histogramStats && <p role="status" className="text-[10px] text-ink-muted mt-1 break-words">
            {t("有效数值：")}{unifiedChartSpec.histogramStats.valid.toLocaleString()} / {unifiedChartSpec.histogramStats.records.toLocaleString()} {t("行；空值和非数值不参与频数。")}
          </p>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 relative apple-font-mono">
          <button
            ref={chartTypeToggleRef}
            type="button"
            aria-controls="pivot-chart-types"
            aria-expanded={showChartTypes}
            onClick={() => setShowChartTypes((open) => !open)}
            className="px-2.5 py-1 rounded-md border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] text-[11px] font-semibold hover:border-[#66D9EF]"
          >{t("图表类型") + ' '}{showChartTypes ? t("收起") : t("展开")}</button>
          <button
            onClick={() => {
              soundEngine?.playClick(560);
              setChartSpecConfig((p) => ({ ...p, clickLinkMode: p.clickLinkMode === 'highlight' ? 'filter' : 'highlight' }));
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition ${chartSpecConfig.clickLinkMode === 'filter' ? 'bg-[#FD971F]/15 text-ink-orange border-[#FD971F]/40' : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted border-[#D6D4C8] dark:border-[#3E3D32]'}`}
          >{' ' + t("联动:") + ' '}{chartSpecConfig.clickLinkMode === 'filter' ? t("全局筛选") : t("明细下钻")}
          </button>
          <button
            onClick={() => {
              soundEngine?.playClick(580);
              setShowChartStudioPopover((p) => !p);
            }}
            className="px-2.5 py-1 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[10px] font-semibold flex items-center gap-1 transition"
            title={t("图表规格微调 (TopN / 衍生序列 / 缺失值 / 标签)")}
          >
            <Sliders className="w-3 h-3 text-ink-cyan" />
            <span>{t("规格")}</span>
          </button>
          <button
            onClick={() => {
              soundEngine?.playClick(600);
              setIsChartFullscreen((prev) => !prev);
            }}
            className="p-1.5 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:text-[#F92672] text-ink-muted"
            title={t("全屏切换")} aria-label={isChartFullscreen ? "退出图表全屏" : "图表全屏"}
          >
            {isChartFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Chart Studio Popover */}
          {showChartStudioPopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowChartStudioPopover(false)} />
            <div className="absolute right-0 top-9 z-40 w-[min(20rem,calc(100vw-2rem))] p-4 rounded-xl bg-[#FFFDF7]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-2xl border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl space-y-3 text-xs animate-apple-modal">
              <div className="flex items-center justify-between border-b border-[#3E3D32]/50 pb-2">
                <span className="font-bold text-[11px] text-ink-pink">{t("CHART_SPEC // 规格与衍生分析")}</span>
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

      {/* Quick Tactile Chart Switcher Pill Strip */}
      {showChartTypes && <div id="pivot-chart-types" className="flex items-center gap-1 overflow-x-auto pb-2 mb-1 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/70 apple-font-mono shrink-0">
        {VISUAL_CHART_TYPES.map((ct) => (
          <button
            key={ct.value}
            onClick={() => {
              soundEngine?.playClick(540);
              setChartType(ct.value);
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap transition ${chartType === ct.value ? 'bg-action text-[#F8F8F2]' : 'bg-[#EFECE1]/70 dark:bg-[#1E1F1C] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
          >
            {t(ct.short)}
          </button>
        ))}
      </div>}

      {/* Main Chart Canvas */}
      <div className="flex-1 w-full min-h-[260px] flex items-center justify-center overflow-hidden">
        {unifiedChartSpec.renderLimit ? (
          <div role="status" className="p-6 max-w-lg text-center space-y-3">
            <h4 className="text-sm font-semibold">{t("图表分组过多")}</h4>
            <p className="text-xs text-ink-muted">{unifiedChartSpec.renderLimit.groupCount.toLocaleString()} {t("个分组超过图表上限 200；表格和 KPI 保持全量。请筛选、减少维度或设置 TopN。")}</p>
            <button className="px-3 py-2 rounded-lg bg-action text-[#F8F8F2] text-xs" onClick={(event) => { restoreScopeFocusRef.current = document.activeElement === event.currentTarget; setChartSpecConfig((prev) => ({ ...prev, topN: 10, sortMode: 'desc' })); }}>{t("按主指标显示 Top 10")}</button>
          </div>
        ) : !unifiedChartSpec.hasValues ? (
          <div className="flex flex-col items-center justify-center p-8 text-center apple-font-mono animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-[#FD971F]/10 border border-[#FD971F]/30 flex items-center justify-center mb-3 text-ink-orange shadow-sm">
              <Sliders className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#272822] dark:text-[#F8F8F2] mb-1.5">{' ' + t("未配置度量指标 (Values)") + ' '}</h4>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed mb-4">{' ' + t("当前透视配置中缺少度量值。请在左侧字段架中点击或拖拽数值字段至【指标 / 值 (Values)】区域以生成图表。") + ' '}</p>
            <div className="px-3 py-1 rounded-full bg-[#3E3D32]/40 text-[10px] text-ink-green border border-[#A6E22E]/30">{' ' + t("提示: 可在左侧点击或拖入数值指标，或将任意维度加入值区域设为计数 (COUNT)") + ' '}</div>
          </div>
        ) : unifiedChartSpec.items.length === 0 || (chartType === 'histogram' && !unifiedChartSpec.histogramItems.length) ? (
          <div className="text-center text-xs text-ink-muted py-12 apple-font-mono">{' ' + t("/* 当前筛选条件下暂无可展示的数据行 */") + ' '}</div>
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
              const magnitude = Math.max(1,...shownRows.flatMap((row) => groups.map((group) => Math.abs(pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`]?.display || 0))));
              return <>
                <svg data-chart-svg="true" role="img" aria-label={t("矩阵热力图")} width={Math.max(500,160+groups.length*110)} height={Math.max(180,60+shownRows.length*38)}>
                  {groups.map((group,index) => <text key={group.key} x={165+index*110} y={22} fill={darkMode?'#F8F8F2':'#272822'} fontSize="11">{group.pathLabels?.join(' / ') || '总计'}</text>)}
                  {shownRows.map((row,r) => <g key={row.rowKey}>
                    <text x="4" y={58+r*38} fill={darkMode?'#F8F8F2':'#272822'} fontSize="11">{row.label.slice(0,18)}</text>
                    {groups.map((group,c) => {
                      const cell = pivotResult.displayMatrix[`${row.rowKey}@@${group.key}@@${metric.id}`];
                      const formatted = formatCellNumber(cell,metric);
                      return <g key={group.key} role="button" tabIndex={0} aria-label={`${row.label} / ${group.label}: ${formatted}`} data-highlighted={highlightedRowKey===row.rowKey}
                        onClick={() => handleChartPointClick({ rowKey:row.rowKey, colKey:group.key, name:row.label, formattedValue:formatted })}
                        onKeyDown={(event) => { if(event.key==='Enter'||event.key===' ') {event.preventDefault();handleChartPointClick({rowKey:row.rowKey,colKey:group.key,name:row.label});} }}>
                        <rect x={160+c*110} y={34+r*38} width="106" height="34" rx="3" fill={cell?.display<0?'#F92672':'#66D9EF'} fillOpacity={0.2+0.8*Math.abs(cell?.display||0)/magnitude} stroke={highlightedRowKey===row.rowKey?'#FD971F':'transparent'} strokeWidth="3" />
                        <text x={168+c*110} y={56+r*38} fontSize="11" fill={darkMode?'#F8F8F2':'#272822'}>{formatted}</text>
                      </g>;
                    })}
                  </g>)}
                </svg>
              </>;
            })()}
          </div>
        ) : chartType === 'funnel' ? (
          <div className="w-full h-full overflow-auto">
            <svg data-chart-svg="true" role="img" aria-label={t("漏斗图")} width="800" height={Math.max(220,unifiedChartSpec.funnelItems.length*54+24)}>
              {unifiedChartSpec.funnelItems.map((item,index) => {
                const width = item.widthPct*5.5, x=180+(550-width)/2, y=12+index*54;
                return <g key={item.rowKey} onClick={() => handleChartPointClick(item)} role="button" tabIndex={0} aria-label={`${item.name}: ${item.formattedValue}`}>
                  <text x="8" y={y+24} fontSize="12" fill={darkMode?'#F8F8F2':'#272822'}>{item.name}</text>
                  <polygon points={`${x},${y} ${x+width},${y} ${x+width-8},${y+40} ${x+8},${y+40}`} fill={item.fill} stroke={highlightedRowKey===item.rowKey?'#FD971F':'transparent'} strokeWidth="3" />
                  <text x={x+12} y={y+25} fontSize="12" fill="#1E1F1C">{item.formattedValue} · {item.conversionFormatted}</text>
                </g>;
              })}
            </svg>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            {chartType === 'line' ? (
              <LineChart data={unifiedChartSpec.items} margin={{ top: 24, right: 24, left: 10, bottom: unifiedChartSpec.items.length > 5 ? 44 : 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  dataKey="name"
                  interval={categoryTickInterval}
                  angle={unifiedChartSpec.items.length > 5 ? -25 : 0}
                  textAnchor={unifiedChartSpec.items.length > 5 ? 'end' : 'middle'}
                  height={unifiedChartSpec.items.length > 5 ? 56 : 28}
                  tick={{ fontSize: 9.5, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 8 : 14)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                {(unifiedChartSpec.hasDualAxis || unifiedChartSpec.derivedSeriesKey) && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#A6E22E' }}
                    tickFormatter={(v) => unifiedChartSpec.hasDualAxis ? UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true }) : v}
                  />
                )}
                {chartSpecConfig.showAvgReferenceLine && unifiedChartSpec.primaryStats.mean > 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke="#FD971F"
                    strokeDasharray="4 4"
                    label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
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
                    dot={({cx,cy,payload}) => <circle cx={cx} cy={cy} r={highlightedRowKey===payload?.rowKey?7:4} fill={highlightedRowKey===payload?.rowKey?'#FD971F':sm.color} data-highlighted={highlightedRowKey===payload?.rowKey} onClick={() => handleChartPointClick({...payload,colKey:sm.colKey})} />}
                    activeDot={{ r: 6, onClick: (_, payload) => handleChartPointClick({...payload?.payload,colKey:sm.colKey}) }}
                  >
                    {chartSpecConfig.showDataLabels && idx === 0 && unifiedChartSpec.items.length <= 12 && (
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
              <AreaChart data={unifiedChartSpec.items} margin={{ top: 24, right: 24, left: 10, bottom: unifiedChartSpec.items.length > 5 ? 44 : 24 }}>
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
                  interval={categoryTickInterval}
                  angle={unifiedChartSpec.items.length > 5 ? -25 : 0}
                  textAnchor={unifiedChartSpec.items.length > 5 ? 'end' : 'middle'}
                  height={unifiedChartSpec.items.length > 5 ? 56 : 28}
                  tick={{ fontSize: 9.5, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 8 : 14)}
                />
                <YAxis
                  domain={chartType === 'pct_area' ? [0, 100] : ['auto', 'auto']}
                  tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => (chartType === 'pct_area' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
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
              <ComposedChart data={unifiedChartSpec.items} margin={{ top: 24, right: 28, left: 10, bottom: unifiedChartSpec.items.length > 5 ? 44 : 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis
                  dataKey="name"
                  interval={categoryTickInterval}
                  angle={unifiedChartSpec.items.length > 5 ? -25 : 0}
                  textAnchor={unifiedChartSpec.items.length > 5 ? 'end' : 'middle'}
                  height={unifiedChartSpec.items.length > 5 ? 56 : 28}
                  tick={{ fontSize: 9.5, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 8 : 14)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#F92672' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#A6E22E' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })} />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
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
                  {chartSpecConfig.showDataLabels && (
                    <LabelList dataKey="_compactPrimaryLabel" content={(p) => renderSmartBarLabel(p, darkMode, false)} />
                  )}
                </Bar>
                <Line isAnimationActive={false}
                  yAxisId="right"
                  type="monotone"
                  dataKey={unifiedChartSpec.secondarySeriesKey}
                  name={`${unifiedChartSpec.secondarySeriesKey} [右轴]`}
                  stroke="#A6E22E"
                  strokeWidth={2.8}
                  dot={{ r: 4, fill: '#A6E22E' }}
                  activeDot={{ r: 6, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                />
              </ComposedChart>
            ) : chartType === 'pie' || chartType === 'donut' ? (
              <PieChart>
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Pie isAnimationActive={false}
                  data={unifiedChartSpec.pieItems}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="47%"
                  innerRadius={chartType === 'donut' ? 54 : 0}
                  outerRadius={94}
                  paddingAngle={chartType === 'donut' ? 3 : 1}
                  label={(p) => renderSmartPieLabel(p, unifiedChartSpec.primaryValCfg, darkMode)}
                  labelLine={false}
                  onClick={(d) => handleChartPointClick(d)}
                >
                  {unifiedChartSpec.pieItems.map((entry, idx) => (
                    <Cell
                      key={`pie_c_${idx}`}
                      fill={entry.fill}
                      stroke={highlightedRowKey === entry.rowKey ? '#F8F8F2' : (darkMode ? '#272822' : '#FFFDF7')}
                      strokeWidth={highlightedRowKey === entry.rowKey ? 2.5 : 1}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                {chartType === 'donut' && (
                  <g>
                    <text x="50%" y="43%" textAnchor="middle" fill={darkMode ? '#908E80' : '#75715E'} fontSize={9.5} className="apple-font-mono">
                      {highlightedRowKey ? formatAxisTickLabel(highlightedRowKey.replace(/\|\|/g, '/'), 10) : 'TOTAL_SUM'}
                    </text>
                    <text x="50%" y="51%" textAnchor="middle" fill={darkMode ? '#E6DB74' : '#272822'} fontSize={12} fontWeight={700} className="apple-font-mono">
                      {UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.total, unifiedChartSpec.primaryValCfg, { compact: true })}
                    </text>
                  </g>
                )}
              </PieChart>
            ) : chartType === 'waterfall' ? (
              <BarChart data={unifiedChartSpec.waterfallItems} margin={{ top: 24, right: 20, left: 10, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3E3D32' : '#DFDDD2'} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} tickFormatter={(v) => formatAxisTickLabel(v, 10)} />
                <YAxis tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                <ReferenceLine y={0} stroke="#75715E" />
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
                <Bar isAnimationActive={false} dataKey="range" name="增减桥接区间" radius={[4, 4, 4, 4]} cursor="pointer" onClick={(d) => handleChartPointClick(d)}>
                  {unifiedChartSpec.waterfallItems.map((entry, idx) => (
                    <Cell key={`wf_${idx}`} fill={entry.fill} />
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
                  tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={unifiedChartSpec.secondarySeriesKey}
                  tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                  tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.secondaryValCfg, { compact: true })}
                />
                <ZAxis type="number" dataKey="z" range={[70, 320]} />
                {unifiedChartSpec.scatterMeanX > 0 && (
                  <ReferenceLine x={unifiedChartSpec.scatterMeanX} stroke="#66D9EF" strokeDasharray="3 3" />
                )}
                {unifiedChartSpec.scatterMeanY > 0 && (
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
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
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
                      fill={pt.fill}
                      stroke={pt.isOutlier ? '#F8F8F2' : 'none'}
                      strokeWidth={pt.isOutlier ? 2 : 0}
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
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar isAnimationActive={false}
                  dataKey="count"
                  name={`${t('频数分布')} (${unifiedChartSpec.primaryValCfg.field} · ${t('点击柱体下钻明细')})`}
                  fill="url(#monokaiHistGrad)"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => {
                    soundEngine?.playTransitionChord();
                    const payload = d?.payload || d;
                    if (Number.isInteger(payload?.histogramBin)) handleChartPointClick(payload);
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
                margin={{ top: 24, right: 28, left: chartType === 'horizontal_bar' ? 36 : 10, bottom: unifiedChartSpec.items.length > 5 && chartType !== 'horizontal_bar' ? 44 : 24 }}
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
                    <XAxis type="number" tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }} tickFormatter={(v) => UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true })} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      reversed={true}
                      width={110}
                      tick={{ fontSize: 9.5, fill: darkMode ? '#F8F8F2' : '#272822' }}
                      tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 8 : 14)}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      interval={categoryTickInterval}
                      angle={unifiedChartSpec.items.length > 5 ? -25 : 0}
                      textAnchor={unifiedChartSpec.items.length > 5 ? 'end' : 'middle'}
                      height={unifiedChartSpec.items.length > 5 ? 56 : 28}
                      tick={{ fontSize: 9.5, fill: darkMode ? '#908E80' : '#75715E' }}
                      tickFormatter={(v) => formatAxisTickLabel(v, compactAxis ? 8 : 14)}
                    />
                    <YAxis
                      domain={chartType === 'pct_stacked_bar' ? [0, 100] : ['auto', 'auto']}
                      tick={{ fontSize: 10, fill: darkMode ? '#908E80' : '#75715E' }}
                      tickFormatter={(v) => (chartType === 'pct_stacked_bar' ? `${v}%` : UnifiedFormatter.formatValue(v, unifiedChartSpec.primaryValCfg, { compact: true }))}
                    />
                  </>
                )}
                <ReferenceLine y={0} stroke="#75715E" />
                {chartSpecConfig.showAvgReferenceLine && chartType === 'bar' && unifiedChartSpec.primaryStats.mean > 0 && (
                  <ReferenceLine
                    y={unifiedChartSpec.primaryStats.mean}
                    stroke="#FD971F"
                    strokeDasharray="4 4"
                    label={{ value: `AVG ${UnifiedFormatter.formatValue(unifiedChartSpec.primaryStats.mean, unifiedChartSpec.primaryValCfg, { compact: true })}`, position: 'insideTopRight', fontSize: 9, fill: '#FD971F' }}
                  />
                )}
                <RechartsTooltip content={<UnifiedChartTooltip chartSpec={unifiedChartSpec} darkMode={darkMode} />} />
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
                      {unifiedChartSpec.items.map((item) => <Cell key={item.rowKey} data-highlighted={highlightedRowKey===item.rowKey} stroke={highlightedRowKey===item.rowKey?'#FD971F':'none'} strokeWidth={3} fillOpacity={highlightedRowKey && highlightedRowKey!==item.rowKey?0.35:1} />)}
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

      {/* Optional analysis presets: keep the plot clear by default. */}
      <div className="mt-2 pt-2 border-t border-[#D6D4C8]/60 dark:border-[#3E3D32]/70 flex flex-col gap-2 text-[10px] apple-font-mono shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={showLensPresets}
            aria-controls="pivot-lens-presets"
            onClick={() => setShowLensPresets((open) => !open)}
            className="text-ink-cyan font-semibold px-2 py-1 rounded border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]"
          >{t("分析视角") + ' '}{showLensPresets ? t("收起") : t("展开")}</button>
          <span className="text-ink-muted dark:text-[#B8B5A8] hidden sm:inline">{' ' + t("单击图表查看明细；单击表格高亮，双击查看明细") + ' '}</span>
        </div>
        {showLensPresets && <div id="pivot-lens-presets" className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {KEYNOTE_STORYBOARD_SHOTS.map((shot, idx) => (
            <button
              key={shot.id}
              onClick={() => applyKeynoteShot(idx)}
              className={`px-2 py-1 rounded border transition shrink-0 ${keynoteShotIdx === idx ? 'bg-[#A6E22E]/20 border-[#A6E22E]/50 text-ink-green font-bold' : 'bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
              title={shot.title}
            >{shot.number}·{shot.title.slice(0, 4)}</button>
          ))}
        </div>}
      </div>
    </div>
  );
}
