import { t } from '../../../i18n.js';
import React from 'react';
import { Sparkles, Trophy, Calendar, Grid3X3, Layers } from 'lucide-react';
import { getMeasureDefaults, isMeasureField, isIdentifierField } from '../../../utils/fieldSemantics.js';

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
  const dimensions = fields.filter((f) => !isMeasureField(f));
  const nonIdDimensions = dimensions.filter((f) => !isIdentifierField(f.name));
  const candidateDimensions = nonIdDimensions.length > 0 ? nonIdDimensions : dimensions;
  const nonDateDimensions = candidateDimensions.filter((f) => f.type !== 'date');
  const measures = fields.filter((f) => isMeasureField(f));
  const dateField = fields.find((f) => f.type === 'date');

  const dim1 = nonDateDimensions[0]?.name || candidateDimensions[0]?.name || fields[0]?.name;
  const dim2 = nonDateDimensions[1]?.name || (candidateDimensions.find(f => f.name !== dim1)?.name) || dim1;
  const numField1 = measures[0] || { name: '__COUNT__', type: 'text' };
  const num1 = numField1.name;
  const numDefaults1 = getMeasureDefaults(numField1);
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
        { id: id1, field: num1, agg: numDefaults1.agg, showAs: 'normal', format: numDefaults1.format },
        { id: id2, field: num1, agg: numDefaults1.agg, showAs: 'pct_grand', format: { thousands: false, decimals: 1, currency: '', isPercent: true } },
      ],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'desc' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: false,
    });
    setChartType?.('bar');
    showToast?.(t('已应用：Top-N 排行与占比'));
  };

  // Template 2: Time Series & MoM Growth (时序双层同环比透视) or Multi-dim Cross Breakdown
  const applyTimeSeriesMoM = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const id1 = `v_m_${Date.now()}_1`;
    const id2 = `v_m_${Date.now()}_2`;
    if (dateField) {
      setPivotConfig({
        filters: [],
        rows: [{ id: 'r_ts1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        columns: [{ id: 'c_ts1', field: dateField.name, sort: 'asc', dateGranularity: 'month', excludedValues: [] }],
        values: [
          { id: id1, field: num1, agg: numDefaults1.agg, showAs: 'normal', format: numDefaults1.format },
          { id: id2, field: num1, agg: numDefaults1.agg, showAs: 'pct_prev_diff', format: { thousands: false, decimals: 1, currency: '', isPercent: true } },
        ],
        valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'none' },
        collapsedRowKeys: {},
        collapsedColKeys: {},
        showSubtotals: true,
      });
      setChartType?.('line');
      showToast?.(t('已应用：时序环比'));
    } else {
      const targetDim2 = dim2 !== dim1 ? dim2 : (candidateDimensions.find(f => f.name !== dim1)?.name || dim1);
      setPivotConfig({
        filters: [],
        rows: [{ id: 'r_ts1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        columns: [{ id: 'c_ts1', field: targetDim2, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
        values: [
          { id: id1, field: num1, agg: numDefaults1.agg, showAs: 'normal', format: numDefaults1.format },
          { id: id2, field: num1, agg: numDefaults1.agg, showAs: 'pct_grand', format: { thousands: false, decimals: 1, currency: '', isPercent: true } },
        ],
        valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'none' },
        collapsedRowKeys: {},
        collapsedColKeys: {},
        showSubtotals: true,
      });
      setChartType?.('bar');
      showToast?.(t('已应用：多维分类占比'));
    }
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
        { id: id1, field: num1, agg: numDefaults1.agg, showAs: 'normal', format: numDefaults1.format },
      ],
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: id1, direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: true,
    });
    setCondFormat?.((prev) => ({ ...prev, colorScale: 'green_yellow_red' }));
    setChartType?.('heatmap');
    showToast?.(t('已应用：交叉热力矩阵'));
  };

  // Template 4: Full Metrics Overview (多指标综合罗盘)
  const applyFullMetrics = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(580);
    const targetMeasures = measures.length > 0 ? measures.slice(0, 4) : [{ name: '__COUNT__', type: 'text' }];
    setPivotConfig({
      filters: [],
      rows: [{ id: 'r_all1', field: dim1, sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
      columns: [],
      values: targetMeasures.map((m, idx) => {
        const mDefs = getMeasureDefaults(m);
        return {
          id: `v_all_${Date.now()}_${idx}`,
          field: m.name,
          agg: mDefs.agg,
          showAs: 'normal',
          format: mDefs.format,
        };
      }),
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: '', direction: 'none' },
      collapsedRowKeys: {},
      collapsedColKeys: {},
      showSubtotals: true,
    });
    setChartType?.('bar');
    showToast?.(t('已应用：多指标汇总'));
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 text-[10px] apple-font-mono scrollbar-none">
      <span className="text-ink-cyan font-bold flex items-center gap-1 shrink-0 mr-1">
        <Sparkles className="w-3 h-3 text-ink-yellow" />
        <span>{t("推荐配置:")}</span>
      </span>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyTopNRanking}
        className="tactile-btn flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[#272822] dark:text-[#F8F8F2] hover:text-[#66D9EF] transition shrink-0 disabled:opacity-40"
        title={t("按主指标降序排列，同时展现数值与占总计百分比")}
      >
        <Trophy className="w-3 h-3 text-ink-orange" />
        <span>{t("Top-N 排行与占比")}</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyTimeSeriesMoM}
        className="tactile-btn flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#A6E22E] text-[#272822] dark:text-[#F8F8F2] hover:text-[#A6E22E] transition shrink-0 disabled:opacity-40"
        title={dateField ? t("时序交叉分期，自动计算较上期环比变动率 (%)") : t("多维分组对比与占比分析")}
      >
        <Calendar className="w-3 h-3 text-ink-green" />
        <span>{dateField ? t("时序环比变动率") : t("多维分类占比")}</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyCrossTabHeatmap}
        className="tactile-btn flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#F92672] text-[#272822] dark:text-[#F8F8F2] hover:text-[#F92672] transition shrink-0 disabled:opacity-40"
        title={t("双维度行列交叉透视，自动挂载三色热力图色阶")}
      >
        <Grid3X3 className="w-3 h-3 text-ink-pink" />
        <span>{t("交叉热力矩阵")}</span>
      </button>

      <button
        type="button"
        disabled={isReadOnly}
        onClick={applyFullMetrics}
        className="tactile-btn flex items-center gap-1 px-2 py-0.8 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#AE81FF] text-[#272822] dark:text-[#F8F8F2] hover:text-[#AE81FF] transition shrink-0 disabled:opacity-40"
        title={t("将前几个数值字段一并加入「值」")}
      >
        <Layers className="w-3 h-3 text-ink-purple" />
        <span>{t("多指标汇总")}</span>
      </button>
    </div>
  );
}
