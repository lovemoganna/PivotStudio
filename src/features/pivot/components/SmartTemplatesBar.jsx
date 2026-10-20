import React from 'react';
import { Sparkles, Trophy, Calendar, Grid3X3, Layers } from 'lucide-react';

export function SmartTemplatesBar({
  currentDataset,
  setPivotConfig,
  setChartType,
  setCondFormat,
  soundEngine,
  showToast,
  isReadOnly,
}) {
  if (!currentDataset?.fields?.length) return null;

  const fields = currentDataset.fields;
  const dimensions = fields.filter((f) => f.role === 'dimension' || (!f.role && f.type !== 'number'));
  const measures = fields.filter((f) => f.role === 'measure' || (!f.role && f.type === 'number'));
  const dateField = fields.find((f) => f.type === 'date');

  const dim1 = dimensions[0]?.name || fields[0]?.name;
  const dim2 = dimensions[1]?.name || dimensions[0]?.name;
  const num1 = measures[0]?.name || '__COUNT__';
  const num2 = measures[1]?.name;

  // Template 1: Top-N Pareto Ranking (降序排行与累计/全局占比)
  const applyTopNRanking = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const id1 = `v_t_${Date.now()}_1`;
    const id2 = `v_t_${Date.now()}_2`;
    setPivotConfig({
      filters: [],
      rows: [{ id: 'r_top1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: [
        { id: id1, field: num1, agg: num1 === '__COUNT__' ? 'count' : 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
        { id: id2, field: num1, agg: num1 === '__COUNT__' ? 'count' : 'sum', showAs: 'pct_grand', format: { thousands: false, decimals: 1, currency: '', isPercent: true } },
      ],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'desc' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: false,
    });
    setChartType?.('bar');
    showToast?.(`已应用「Top-N 核心贡献排行与总计占比」智能模版`);
  };

  // Template 2: Time Series & MoM Growth (时序双层同环比透视)
  const applyTimeSeriesMoM = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const effectiveDate = dateField?.name || (dimensions[1]?.name || dim1);
    const id1 = `v_m_${Date.now()}_1`;
    const id2 = `v_m_${Date.now()}_2`;
    setPivotConfig({
      filters: [],
      rows: [{ id: 'r_ts1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [{ id: 'c_ts1', field: effectiveDate, sort: 'asc', dateGranularity: dateField ? 'month' : 'raw', excludedValues: [] }],
      values: [
        { id: id1, field: num1, agg: num1 === '__COUNT__' ? 'count' : 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
        { id: id2, field: num1, agg: num1 === '__COUNT__' ? 'count' : 'sum', showAs: 'pct_prev_diff', format: { thousands: false, decimals: 1, currency: '', isPercent: true } },
      ],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: true,
    });
    setChartType?.('line');
    showToast?.(`已应用「时序分布与环比变动率 (% Growth)」智能模版`);
  };

  // Template 3: Cross-Tab Heatmap (双维度交叉热力矩阵)
  const applyCrossTabHeatmap = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const targetDim2 = dim2 !== dim1 ? dim2 : (fields.find((f) => f.name !== dim1)?.name || dim1);
    const id1 = `v_h_${Date.now()}`;
    setPivotConfig({
      filters: [],
      rows: [{ id: 'r_h1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [{ id: 'c_h1', field: targetDim2, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      values: [
        { id: id1, field: num1, agg: num1 === '__COUNT__' ? 'count' : 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
      ],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: true,
    });
    setCondFormat?.((prev) => ({ ...prev, colorScale: 'green_yellow_red' }));
    setChartType?.('bar');
    showToast?.(`已应用「双维度交叉矩阵与热力色阶」智能模版`);
  };

  // Template 4: Full Metrics Overview (多指标综合罗盘)
  const applyFullMetrics = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const targetMeasures = measures.length > 0 ? measures.slice(0, 4) : [{ name: '__COUNT__' }];
    setPivotConfig({
      filters: [],
      rows: [{ id: 'r_all1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: targetMeasures.map((m, idx) => ({
        id: `v_all_${Date.now()}_${idx}`,
        field: m.name,
        agg: m.name === '__COUNT__' ? 'count' : 'sum',
        showAs: 'normal',
        format: { thousands: true, decimals: 0, currency: '', isPercent: false },
      })),
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: '', direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: true,
    });
    setChartType?.('bar');
    showToast?.(`已应用「多指标全景汇总」智能模版`);
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 text-[10px] apple-font-mono scrollbar-none">
      <span className="text-[#66D9EF] font-bold flex items-center gap-1 shrink-0 mr-1">
        <Sparkles className="w-3 h-3 text-[#E6DB74]" />
        <span>智能透视推荐:</span>
      </span>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyTopNRanking}
        className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[#272822] dark:text-[#F8F8F2] hover:text-[#66D9EF] transition shrink-0 disabled:opacity-40"
        title="按主指标降序排列，同时展现数值与占总计百分比"
      >
        <Trophy className="w-3 h-3 text-[#FD971F]" />
        <span>Top-N 排行与占比</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyTimeSeriesMoM}
        className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#A6E22E] text-[#272822] dark:text-[#F8F8F2] hover:text-[#A6E22E] transition shrink-0 disabled:opacity-40"
        title="时序交叉分期，自动计算较上期环比变动率 (%)"
      >
        <Calendar className="w-3 h-3 text-[#A6E22E]" />
        <span>时序环比变动率</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyCrossTabHeatmap}
        className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#F92672] text-[#272822] dark:text-[#F8F8F2] hover:text-[#F92672] transition shrink-0 disabled:opacity-40"
        title="双维度行列交叉透视，自动挂载三色热力图色阶"
      >
        <Grid3X3 className="w-3 h-3 text-[#F92672]" />
        <span>交叉热力矩阵</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyFullMetrics}
        className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#AE81FF] text-[#272822] dark:text-[#F8F8F2] hover:text-[#AE81FF] transition shrink-0 disabled:opacity-40"
        title="快速将数据集中前4个数值度量并列聚合"
      >
        <Layers className="w-3 h-3 text-[#AE81FF]" />
        <span>全量度量罗盘</span>
      </button>
    </div>
  );
}
