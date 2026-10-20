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
import { UnifiedFormatter, formatAxisTickLabel } from '../../../utils/formatters';
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
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div>
          <h3 className="text-xs font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2 apple-font-mono">
            <BarChart3 className="w-4 h-4 text-[#F92672]" />
            <span>{VISUAL_CHART_TYPES.find((t) => t.value === chartType)?.label || chartType}</span>
            {unifiedChartSpec.derivedSeriesKey && (
              <span className="px-1.5 py-0.2 rounded bg-[#AE81FF]/20 text-[#AE81FF] text-[9px]">
                +{unifiedChartSpec.derivedSeriesKey}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-[#75715E] dark:text-[#908E80] mt-0.5 apple-font-mono flex items-center gap-2">
            <span>维度：{unifiedChartSpec.xDimensionLabel} · 指标：{unifiedChartSpec.primarySeriesKey}</span>
            {!unifiedChartSpec.canStack && (chartType === 'stacked_bar' || chartType === 'stacked_area') && (
              <span className="px-1.5 py-0.2 rounded bg-[#FD971F]/15 text-[#FD971F] border border-[#FD971F]/30 text-[9px]">
                量纲不同已自动按分组呈现
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 relative apple-font-mono">
          <button
            type="button"
            aria-controls="pivot-chart-types"
            aria-expanded={showChartTypes}
            onClick={() => setShowChartTypes((open) => !open)}
            className="px-2.5 py-1 rounded-md border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1] dark:bg-[#1E1F1C] text-[11px] font-semibold hover:border-[#66D9EF]"
          >图表类型 {showChartTypes ? '收起' : '展开'}</button>
          <button
            onClick={() => {
              soundEngine?.playClick(560);
              setChartSpecConfig((p) => ({ ...p, clickLinkMode: p.clickLinkMode === 'highlight' ? 'filter' : 'highlight' }));
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition ${chartSpecConfig.clickLinkMode === 'filter' ? 'bg-[#FD971F]/15 text-[#FD971F] border-[#FD971F]/40' : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-[#75715E] dark:text-[#908E80] border-[#D6D4C8] dark:border-[#3E3D32]'}`}
          >
            联动: {chartSpecConfig.clickLinkMode === 'filter' ? '全局筛选' : '高亮定位'}
          </button>
          <button
            onClick={() => {
              soundEngine?.playClick(580);
              setShowChartStudioPopover((p) => !p);
            }}
            className="px-2.5 py-1 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[10px] font-semibold flex items-center gap-1 transition"
            title="图表规格微调 (TopN / 衍生序列 / 缺失值 / 标签)"
          >
            <Sliders className="w-3 h-3 text-[#66D9EF]" />
            <span>规格</span>
          </button>
          <button
            onClick={() => {
              soundEngine?.playClick(600);
              setIsChartFullscreen((prev) => !prev);
            }}
            className="p-1.5 rounded-md bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:text-[#F92672] text-[#75715E] dark:text-[#908E80]"
            title="全屏切换" aria-label={isChartFullscreen ? "退出图表全屏" : "图表全屏"}
          >
            {isChartFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Chart Studio Popover */}
          {showChartStudioPopover && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowChartStudioPopover(false)} />
            <div className="absolute right-0 top-9 z-40 w-[min(20rem,calc(100vw-2rem))] p-4 rounded-xl bg-[#FFFDF7]/95 dark:bg-[#1E1F1C]/95 backdrop-blur-2xl border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl space-y-3 text-xs animate-apple-modal">
              <div className="flex items-center justify-between border-b border-[#3E3D32]/50 pb-2">
                <span className="font-bold text-[11px] text-[#F92672]">CHART_SPEC // 规格与衍生分析</span>
                <button onClick={() => setShowChartStudioPopover(false)} aria-label="关闭图表规格面板" className="p-1 rounded hover:bg-white/10 text-[#75715E]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {pivotResult.valConfigs.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#908E80] mb-1">主指标绑定:</label>
                    <select
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
                    <label className="block text-[10px] text-[#908E80] mb-1">次轴/Y轴指标:</label>
                    <select
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
                  <label className="block text-[10px] text-[#908E80] mb-1">图表内排序:</label>
                  <select
                    value={chartSpecConfig.sortMode}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, sortMode: e.target.value }))}
                    className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                  >
                    <option value="none">保持透视表顺序</option>
                    <option value="desc">按主指标降序</option>
                    <option value="asc">按主指标升序</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#908E80] mb-1">TopN 焦点截断:</label>
                  <select
                    value={chartSpecConfig.topN}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, topN: Number(e.target.value) }))}
                    className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                  >
                    <option value={0}>显示全部</option>
                    <option value={3}>Top 3</option>
                    <option value={5}>Top 5</option>
                    <option value={8}>Top 8</option>
                    <option value={10}>Top 10</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#908E80] mb-1">衍生分析序列:</label>
                  <select
                    value={chartSpecConfig.lineDerivedMetric}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, lineDerivedMetric: e.target.value }))}
                    className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                  >
                    <option value="none">无衍生线</option>
                    <option value="cumulative">累计运行总和</option>
                    <option value="ma3">3期移动平均线</option>
                    <option value="mom_pct">环比增长率(%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#908E80] mb-1">缺失值处理策略:</label>
                  <select
                    value={chartSpecConfig.missingValueMode}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, missingValueMode: e.target.value }))}
                    className="w-full px-2 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                  >
                    <option value="zero">按 0 补齐 (Zero)</option>
                    <option value="connect">断开连线 (Null)</option>
                    <option value="prev">前值填充 (Prev)</option>
                  </select>
                </div>
              </div>
              {chartType === 'histogram' && (
                <div>
                  <label className="block text-[10px] text-[#908E80] mb-1">直方图分箱数量 (Bins):</label>
                  <select
                    value={chartSpecConfig.histogramBins}
                    onChange={(e) => setChartSpecConfig((p) => ({ ...p, histogramBins: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[11px]"
                  >
                    <option value={0}>自动分箱 (Sturges公式)</option>
                    <option value={4}>4 个区间</option>
                    <option value={6}>6 个区间</option>
                    <option value={8}>8 个区间</option>
                    <option value={10}>10 个区间</option>
                  </select>
                </div>
              )}
              <label className="flex items-center justify-between pt-1 cursor-pointer text-[11px]">
                <span className="text-[#908E80]">显示柱体/节点数值标签</span>
                <input
                  type="checkbox"
                  checked={chartSpecConfig.showDataLabels}
                  onChange={(e) => setChartSpecConfig((p) => ({ ...p, showDataLabels: e.target.checked }))}
                  className="rounded accent-[#F92672]"
                />
              </label>
              <label className="flex items-center justify-between pt-1 cursor-pointer text-[11px]">
                <span className="text-[#908E80]">显示全局均值参考线 (Avg)</span>
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
            className={`px-2 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap transition ${chartType === ct.value ? 'bg-[#F92672] text-[#F8F8F2]' : 'bg-[#EFECE1]/70 dark:bg-[#1E1F1C] text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
          >
            {ct.short}
          </button>
        ))}
      </div>}

      {/* Main Chart Canvas */}
      <div className="flex-1 w-full h-full min-h-[260px] flex items-center justify-center overflow-hidden">
        {!unifiedChartSpec.hasValues ? (
          <div className="flex flex-col items-center justify-center p-8 text-center apple-font-mono animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-[#FD971F]/10 border border-[#FD971F]/30 flex items-center justify-center mb-3 text-[#FD971F] shadow-sm">
              <Sliders className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#272822] dark:text-[#F8F8F2] mb-1.5">
              未配置度量指标 (Values)
            </h4>
            <p className="text-xs text-[#75715E] dark:text-[#908E80] max-w-sm leading-relaxed mb-4">
              当前透视配置中缺少度量值。请在左侧字段架中点击或拖拽数值字段至【指标 / 值 (Values)】区域以生成图表。
            </p>
            <div className="px-3 py-1 rounded-full bg-[#3E3D32]/40 text-[10px] text-[#A6E22E] border border-[#A6E22E]/30">
              提示: 可拖入销售额、数量或将任意维度设为计数(COUNT)
            </div>
          </div>
        ) : unifiedChartSpec.items.length === 0 ? (
          <div className="text-center text-xs text-[#75715E] dark:text-[#908E80] py-12 apple-font-mono">
            /* 当前筛选条件下暂无可展示的数据行 */
          </div>
        ) : chartType === 'funnel' ? (
          <div className="w-full h-full flex flex-col justify-center gap-2 py-2 px-3 overflow-y-auto">
            {unifiedChartSpec.funnelItems.map((fItem, fIdx) => {
              const isHighlighted = highlightedRowKey === fItem.rowKey;
              const totalShare = unifiedChartSpec.primaryStats.total > 0
                ? ((fItem.value / unifiedChartSpec.primaryStats.total) * 100).toFixed(1)
                : '0.0';
              return (
                <div
                  key={fItem.rowKey}
                  onClick={() => {
                    soundEngine?.playClick(520);
                    handleChartPointClick(fItem);
                  }}
                  onDoubleClick={() => setDrillDownModal?.({ rowLabel: fItem.name, colLabel: '漏斗转化阶段', valLabel: unifiedChartSpec.primarySeriesKey, valueFormatted: `${fItem.formattedValue} (${fItem.conversionFormatted})`, records: fItem.matchedRows || [] })}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-24 text-right text-[11px] font-medium truncate shrink-0 flex flex-col items-end">
                    <span className="truncate text-[#272822] dark:text-[#F8F8F2] font-semibold">{fItem.name}</span>
                    <span className="text-[9px] text-[#75715E] dark:text-[#908E80] apple-font-mono">占总量 {totalShare}%</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div
                      style={{
                        width: `${fItem.widthPct}%`,
                        background: `linear-gradient(135deg, ${fItem.fill} 0%, ${fItem.fill}CC 100%)`,
                        clipPath: 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)',
                      }}
                      className={`h-8 px-4 flex items-center justify-between text-[#1E1F1C] text-[10px] apple-font-mono font-bold shadow-sm group-hover:scale-[1.01] apple-transition ${isHighlighted ? 'ring-2 ring-[#F8F8F2]' : ''}`}
                    >
                      <span>{fItem.formattedValue}</span>
                      <span className="px-1.5 py-0.2 rounded bg-black/25 text-[#F8F8F2] text-[9px]">{fItem.conversionFormatted}</span>
                    </div>
                  </div>
                  <div className="w-14 text-left text-[10px] text-[#75715E] dark:text-[#908E80] apple-font-mono shrink-0">
                    S_0{fIdx + 1}
                  </div>
                </div>
              );
            })}
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
                  <Line
                    key={sm.key}
                    yAxisId={unifiedChartSpec.hasDualAxis ? (sm.yAxisId || 'left') : 'left'}
                    connectNulls={chartSpecConfig.missingValueMode !== 'connect'}
                    type="monotone"
                    dataKey={sm.key}
                    stroke={sm.color}
                    strokeWidth={2.6}
                    dot={{ r: 4, strokeWidth: 2, fill: darkMode ? '#272822' : '#FFFDF7', cursor: 'pointer' }}
                    activeDot={{ r: 6, onClick: (_, payload) => handleChartPointClick(payload?.payload || payload) }}
                  >
                    {chartSpecConfig.showDataLabels && idx === 0 && unifiedChartSpec.items.length <= 12 && (
                      <LabelList dataKey="_compactPrimaryLabel" position="top" style={{ fontSize: 9, fontWeight: 600, fill: darkMode ? '#F8F8F2' : '#272822' }} />
                    )}
                  </Line>
                ))}
                {unifiedChartSpec.derivedSeriesKey && (
                  <Line
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
                  <Area
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
                <Bar
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
                <Line
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
                <Pie
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
                <Bar dataKey="range" name="增减桥接区间" radius={[4, 4, 4, 4]} cursor="pointer" onClick={(d) => handleChartPointClick(d)}>
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
                <Scatter
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
                <Bar
                  dataKey="count"
                  name={`频数分布 (${unifiedChartSpec.primaryValCfg.field} · 双击柱体下钻明细)`}
                  fill="url(#monokaiHistGrad)"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => {
                    soundEngine?.playTransitionChord();
                    const payload = d?.payload || d;
                    if (payload?.matchedRows) {
                      setDrillSearch?.('');
                      setDrillPage?.(1);
                      setDrillDownModal?.({
                        rowLabel: `区间 ${payload.rangeFull}`,
                        colLabel: '直方图频数分箱',
                        valLabel: `${payload.count} 笔 (${payload.pct}%)`,
                        valueFormatted: `${payload.count} 笔`,
                        records: payload.matchedRows,
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
                    <Bar
                      key={sm.key}
                      dataKey={sm.key}
                      stackId={isStacked ? 'stack_bar' : undefined}
                      fill={`url(#${sm.gradId})`}
                      radius={isStacked ? [0, 0, 0, 0] : chartType === 'horizontal_bar' ? [0, 5, 5, 0] : [5, 5, 0, 0]}
                      cursor="pointer"
                      onClick={(d) => handleChartPointClick(d)}
                    >
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
            className="text-[#0088A3] dark:text-[#66D9EF] font-semibold px-2 py-1 rounded border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF]"
          >分析视角 {showLensPresets ? '收起' : '展开'}</button>
          <span className="text-[#75715E] dark:text-[#B8B5A8] hidden sm:inline">
            双击单元格或图表数据点查看原始明细
          </span>
        </div>
        {showLensPresets && <div id="pivot-lens-presets" className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {KEYNOTE_STORYBOARD_SHOTS.map((shot, idx) => (
            <button
              key={shot.id}
              onClick={() => applyKeynoteShot(idx)}
              className={`px-2 py-1 rounded border transition shrink-0 ${keynoteShotIdx === idx ? 'bg-[#A6E22E]/20 border-[#A6E22E]/50 text-[#4A7500] dark:text-[#A6E22E] font-bold' : 'bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border-[#D6D4C8] dark:border-[#3E3D32] text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
              title={shot.title}
            >{shot.number}·{shot.title.slice(0, 4)}</button>
          ))}
        </div>}
      </div>
    </div>
  );
}
