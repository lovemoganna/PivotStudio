import { AGG_METHODS, CHART_COLORS } from '../../../constants/pivotConstants.js';
import { UnifiedFormatter, getDimDisplayLabel } from '../../../utils/formatters.js';
import { isMissingValue } from '../../../utils/normalizeScalar.js';
import { getMeasureDefaults, isMeasureField } from '../../../utils/fieldSemantics.js';
import { computeAggregation } from './calculatePivot.js';
import { buildHistogramBins } from './histogram.js';

function summarizeValues(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    validCount: values.length,
    total,
    mean: values.length ? total / values.length : 0,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0,
  };
}
export function buildUnifiedChartSpec(dataset, pivotResult, chartType, chartSpecConfig) {
  const valConfigs = pivotResult?.valConfigs || [];
  const hasValues = valConfigs.length > 0;

  const defaultNumField = dataset?.fields?.find((f) => f.type === 'number')?.name || '数值指标';
  const primaryValCfg = valConfigs.find((v) => v.id === chartSpecConfig?.primaryValueId) || valConfigs[0] || {
    id: 'v_fallback',
    field: defaultNumField,
    agg: 'sum',
    showAs: 'normal',
    format: { thousands: true, decimals: 0, currency: '', isPercent: false },
  };
  // If only 1 metric is configured, search dataset for a distinct 2nd numeric field for scatter/dual-axis correlation
  let secondaryValCfg = valConfigs.find((v) => v.id === chartSpecConfig?.secondaryValueId) || valConfigs[1];
  if (!secondaryValCfg) {
    const candidateField = dataset?.fields?.find((f) => isMeasureField(f) && f.name !== primaryValCfg.field);
    if (candidateField) {
      secondaryValCfg = {
        id: `v_auto_second_${candidateField.name}`,
        field: candidateField.name,
        showAs: 'normal',
        ...getMeasureDefaults(candidateField),
      };
    } else {
      secondaryValCfg = primaryValCfg;
    }
  }

  const xDimensionLabel = (pivotResult?.rowConfigs?.length || 0) > 0
    ? pivotResult.rowConfigs.map((r) => getDimDisplayLabel(r)).join(' / ')
    : (pivotResult?.colConfigs?.length || 0) > 0
      ? pivotResult.colConfigs.map((c) => getDimDisplayLabel(c)).join(' / ')
      : '汇总维度';

  const dataRows = (pivotResult?.tableRows || []).filter((r) => !r.isTotal && !r.isSubtotal);
  const allGrandTotalRecords = pivotResult?.cellRecordsMap?.get?.('__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__') || [];
  const grandTotalBucket = allGrandTotalRecords;
  const grandTotalRecords = allGrandTotalRecords.slice(0, 50);
  // If no value metrics are configured, return graceful empty spec immediately
  const emptySpec = {
    chartType,
    hasValues: false,
    isPercentMode: false,
    xDimensionLabel: '未配置度量指标',
    primaryValCfg,
    secondaryValCfg,
    primarySeriesKey: '无指标',
    secondarySeriesKey: '无指标',
    derivedSeriesKey: null,
    derivedMode: 'none',
    seriesMetaList: [],
    kpiCards: [],
    items: [],
    pieItems: [],
    waterfallItems: [],
    funnelItems: [],
    scatterPoints: [],
    scatterRegressionSegment: null,
    scatterMeanX: 0,
    scatterMeanY: 0,
    histogramItems: [],
    primaryStats: { total: 0, mean: 0, max: 0, min: 0 },
    executiveInsight: null,
  };
  if (!hasValues) return emptySpec;

  // 1. Build KPI Cards + Mini Sparkline Points
  const kpiCards = valConfigs.slice(0, 4).map((vc, kIdx) => {
    const grandVal = pivotResult.displayMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? null;
    const aggLabel = vc.isCalculated ? '公式' : (AGG_METHODS.find((m) => m.value === vc.agg)?.short || vc.agg);
    const unit = UnifiedFormatter.inferUnit(vc);
    let comparison = null;
    if (dataRows.length >= 2) {
      const firstRow = dataRows[0];
      const secondRow = dataRows[1];
      const v0 = pivotResult.displayMatrix[`${firstRow.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display;
      const v1 = pivotResult.displayMatrix[`${secondRow.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display;
      if (Number.isFinite(v0) && Number.isFinite(v1) && v1 !== 0) {
        const diffPct = ((v0 - v1) / Math.abs(v1)) * 100;
        comparison = {
          isPositive: diffPct >= 0,
          pctFormatted: `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`,
          baselineLabel: `${firstRow.label} vs ${secondRow.label}`,
        };
      }
    }
    const sparkValues = dataRows.slice(0, 12).map((r) => pivotResult.displayMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? null);
    return {
      id: vc.id,
      title: `${vc.field === '__COUNT__' ? '记录数' : vc.field} (${aggLabel})`,
      unit,
      color: CHART_COLORS[kIdx % CHART_COLORS.length],
      formattedCurrent: UnifiedFormatter.formatValue(grandVal, vc, { compact: false }),
      comparison,
      sparkValues,
    };
  });

  // 2. Build Series Metadata & Items
  const hasColGroups = chartType !== 'histogram' && pivotResult.leafColGroups && pivotResult.leafColGroups.length > 0;
  const seriesMetaList = [];
  if (hasColGroups && chartType !== 'combo' && dataRows.length > 0) {
    pivotResult.leafColGroups.forEach((cg, idx) => {
      const sKey = cg.pathLabels.join(' / ');
      seriesMetaList.push({
        key: sKey,
        colKey: cg.key,
        valCfg: primaryValCfg,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        gradId: `appleGrad_${idx % CHART_COLORS.length}`,
        yAxisId: 'left',
      });
    });
  } else {
    valConfigs.forEach((vc, idx) => {
      const aggShort = AGG_METHODS.find((m) => m.value === vc.agg)?.short || vc.agg;
      const sKey = `${vc.field === '__COUNT__' ? '记录数' : vc.field}(${aggShort})`;
      seriesMetaList.push({
        key: sKey,
        colKey: '__GRAND_TOTAL_COL__',
        valCfg: vc,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        gradId: `appleGrad_${idx % CHART_COLORS.length}`,
        yAxisId: idx === 0 ? 'left' : 'right',
      });
    });
  }

  if (seriesMetaList.length === 0) {
    seriesMetaList.push({
      key: '数值汇总',
      colKey: '__GRAND_TOTAL_COL__',
      valCfg: primaryValCfg,
      color: CHART_COLORS[0],
      gradId: 'appleGrad_0',
      yAxisId: 'left',
    });
  }

  const primarySeriesKey = seriesMetaList[0].key;
  const secondarySeriesKey = seriesMetaList[1]?.key || (chartType === 'scatter' && secondaryValCfg.field !== primaryValCfg.field ? `${secondaryValCfg.field}(${AGG_METHODS.find(m=>m.value===secondaryValCfg.agg)?.short || secondaryValCfg.agg})` : primarySeriesKey);
  const isPercentMode = chartType === 'pct_stacked_bar' || chartType === 'pct_area';
  const missingMode = chartSpecConfig?.missingValueMode || 'connect';

  const groupCount = dataRows.length || pivotResult.leafColGroups?.length || 1;
  const requestedCount = chartSpecConfig?.topN > 0 ? Math.min(groupCount, chartSpecConfig.topN) : groupCount;
  const maximumGroups = chartType === 'heatmap' || chartType === 'funnel' ? 200 : 2000;
  // Unbounded SVG marks can block input for tens of seconds. Require an explicit scope.
  if (chartType !== 'histogram' && requestedCount > maximumGroups) {
    const series = seriesMetaList[0];
    const values = dataRows.length
      ? dataRows.map((row) => Number(pivotResult.displayMatrix[`${row.rowKey}@@${series.colKey}@@${series.valCfg.id}`]?.display ?? 0))
      : pivotResult.leafColGroups.map((group) => Number(pivotResult.displayMatrix[`__GRAND_TOTAL_ROW__@@${group.key}@@${series.valCfg.id}`]?.display ?? 0));
    return { ...emptySpec, hasValues: true, kpiCards, seriesMetaList, xDimensionLabel,
      primarySeriesKey, secondarySeriesKey, primaryStats: summarizeValues(values),
      canStack: hasColGroups || (valConfigs.length > 1 && valConfigs.every((value) => UnifiedFormatter.inferUnit(value) === UnifiedFormatter.inferUnit(valConfigs[0]))),
      renderLimit: { groupCount, maximum: maximumGroups } };
  }

  const lastSeenBySeries = {};
  let processedItems = [];

  if (dataRows.length > 0 && chartType !== 'histogram') {
    processedItems = dataRows.map((r) => {
      const item = {
        name: r.label,
        rowKey: r.rowKey,
        _rawSeriesValues: {},
        matchedRows: (pivotResult?.cellRecordsMap?.get?.(`${r.rowKey}@@__GRAND_TOTAL_COL__`) || []).slice(0, 50),
      };
      let stackSum = 0;
      seriesMetaList.forEach((sm) => {
        const bucketRecs = pivotResult?.cellRecordsMap?.get?.(`${r.rowKey}@@${sm.colKey}`) || [];
        const cKey = `${r.rowKey}@@${sm.colKey}@@${sm.valCfg.id}`;
        let val = pivotResult.displayMatrix[cKey]?.display ?? null;

        if (bucketRecs.length === 0) {
          if (missingMode === 'connect') {
            val = null;
          } else if (missingMode === 'prev') {
            val = lastSeenBySeries[sm.key] ?? 0;
          } else {
            val = 0;
          }
        } else {
          lastSeenBySeries[sm.key] = val;
        }

        const numVal = val === null ? null : Number(val);
        item._rawSeriesValues[sm.key] = numVal;
        item[sm.key] = val;
        stackSum += numVal;
      });
      item._stackSum = stackSum;
      return item;
    });
  } else if (hasColGroups && chartType !== 'histogram') {
    // If no row dimension is configured but column dimension exists, chart column leaves
    processedItems = pivotResult.leafColGroups.map((cg) => {
      const item = {
        name: cg.label || cg.pathLabels.join(' / '),
        rowKey: cg.key,
        _rawSeriesValues: {},
        matchedRows: (pivotResult?.cellRecordsMap?.get?.(`__GRAND_TOTAL_ROW__@@${cg.key}`) || []).slice(0, 50),
      };
      let stackSum = 0;
      seriesMetaList.forEach((sm) => {
        const cKey = `__GRAND_TOTAL_ROW__@@${cg.key}@@${sm.valCfg.id}`;
        const val = pivotResult.displayMatrix[cKey]?.display ?? null;
        const numVal = val === null ? null : Number(val);
        item._rawSeriesValues[sm.key] = numVal;
        item[sm.key] = val;
        stackSum += numVal;
      });
      item._stackSum = stackSum;
      return item;
    });
  } else if (grandTotalRecords.length > 0 || (pivotResult?.tableRows?.length || 0) > 0) {
    // Only Grand Total exists
    const item = {
      name: '总体汇总',
      rowKey: '__GRAND_TOTAL_ROW__',
      _rawSeriesValues: {},
      matchedRows: grandTotalRecords.slice(0, 50),
    };
    seriesMetaList.forEach((sm) => {
      const cKey = `__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${sm.valCfg.id}`;
      const val = pivotResult.displayMatrix[cKey]?.display ?? null;
      item._rawSeriesValues[sm.key] = val === null ? null : Number(val);
      item[sm.key] = val;
    });
    processedItems = [item];
  }

  // Composition charts require additive, nonnegative values. Never turn losses into gains.
  const isAdditive = metric => !metric.isCalculated && ['sum', 'count'].includes(metric.agg) && (!metric.showAs || metric.showAs === 'normal') && (metric.agg === 'count' || !metric.format?.isPercent);
  const compositionMetricValid = seriesMetaList.every(sm => isAdditive(sm.valCfg));
  const compositionUnitsMatch = seriesMetaList.every(sm => UnifiedFormatter.inferUnit(sm.valCfg) === UnifiedFormatter.inferUnit(seriesMetaList[0].valCfg));
  const hasNegative = processedItems.some(item => seriesMetaList.some(sm => item._rawSeriesValues[sm.key] < 0));
  const primaryHasNegative = processedItems.some(item => item._rawSeriesValues[primarySeriesKey] < 0);
  let chartIssue = null;
  if (isPercentMode && (!compositionMetricValid || hasNegative)) {
    chartIssue = hasNegative ? '数据包含负数，不能解释为非负部分的占比。请切换柱图查看正负变化。' : '平均值、去重计数、比率或计算指标不能直接相加为整体。请切换柱图比较数值。';
  }
  if (isPercentMode && !chartIssue && !compositionUnitsMatch) chartIssue = '指标单位不同，不能合并成 100%。请切换柱图，或选择单位一致的指标。';
  if (['pie', 'donut'].includes(chartType) && (!isAdditive(primaryValCfg) || primaryHasNegative)) {
    chartIssue = primaryHasNegative ? '数据包含负数，不能解释为非负部分的占比。请切换柱图查看正负变化。' : '平均值、去重计数、比率或计算指标不能直接相加为整体。请切换柱图比较数值。';
  }
  if (chartType === 'funnel' && primaryHasNegative) chartIssue = '数据包含负数，无法用漏斗宽度表达。请切换柱图查看正负变化。';
  if (chartType === 'scatter' && secondarySeriesKey === primarySeriesKey && secondaryValCfg.field === primaryValCfg.field) {
    chartIssue = '散点图需要两个不同的指标。请再添加一个数值字段，或切换柱图比较当前指标。';
  }
  if (isPercentMode && !chartIssue) processedItems.forEach(item => {
    const total = seriesMetaList.reduce((sum, sm) => sum + (item._rawSeriesValues[sm.key] ?? 0), 0);
    seriesMetaList.forEach(sm => {
      const value = item._rawSeriesValues[sm.key];
      item[sm.key] = value === null || total === 0 ? null : value / total * 100;
    });
  });
  if (isPercentMode && !chartIssue && processedItems.some(item => seriesMetaList.some(sm => Number.isFinite(item._rawSeriesValues[sm.key]))) && !processedItems.some(item => seriesMetaList.some(sm => item[sm.key] !== null))) chartIssue = '当前数值合计为 0，没有可解释的占比。请切换柱图查看各组数值。';
  processedItems.forEach((item) => {
    item._stackTotal = item._stackSum ?? 0;
    item._stackTotalFormatted = UnifiedFormatter.formatValue(item._stackTotal, primaryValCfg, { compact: false });
    item._compactPrimaryLabel = isPercentMode
      ? `${Number(item[primarySeriesKey] ?? 0).toFixed(1)}%`
      : UnifiedFormatter.formatValue(item._rawSeriesValues[primarySeriesKey], primaryValCfg, { compact: true });
  });

  if (chartSpecConfig?.sortMode === 'asc') {
    processedItems.sort((a, b) => (a._rawSeriesValues[primarySeriesKey] ?? 0) - (b._rawSeriesValues[primarySeriesKey] ?? 0));
  } else if (chartSpecConfig?.sortMode === 'desc') {
    processedItems.sort((a, b) => (b._rawSeriesValues[primarySeriesKey] ?? 0) - (a._rawSeriesValues[primarySeriesKey] ?? 0));
  }
  const availableGroupCount = processedItems.length;
  if (chartSpecConfig?.topN && chartSpecConfig.topN > 0) {
    processedItems = processedItems.slice(0, chartSpecConfig.topN);
  }

  let derivedSeriesKey = null;
  const derivedMode = chartSpecConfig?.lineDerivedMetric || 'none';
  if (derivedMode !== 'none' && processedItems.length > 0) {
    let runningCum = 0;
    if (derivedMode === 'cumulative') derivedSeriesKey = `${primarySeriesKey}·累计值`;
    if (derivedMode === 'ma3') derivedSeriesKey = `${primarySeriesKey}·3期均线`;
    if (derivedMode === 'mom_pct') derivedSeriesKey = `${primarySeriesKey}·环比(%)`;

    processedItems.forEach((it, idx) => {
      const cur = it._rawSeriesValues[primarySeriesKey];
      if (!Number.isFinite(cur)) { it[derivedSeriesKey] = null; return; }
      if (derivedMode === 'cumulative') {
        runningCum += cur;
        it[derivedSeriesKey] = runningCum;
      } else if (derivedMode === 'ma3') {
        const slice = processedItems.slice(Math.max(0, idx - 2), idx + 1);
        if (slice.some(x => !Number.isFinite(x._rawSeriesValues[primarySeriesKey]))) {it[derivedSeriesKey] = null;return;}
        const avg = slice.reduce((s, x) => s + Number(x._rawSeriesValues[primarySeriesKey] ?? 0), 0) / slice.length;
        it[derivedSeriesKey] = Number(avg.toFixed(1));
      } else if (derivedMode === 'mom_pct') {
        if (idx === 0) {
          it[derivedSeriesKey] = null;
        } else {
          const prev = processedItems[idx - 1]._rawSeriesValues[primarySeriesKey];
          it[derivedSeriesKey] = Number.isFinite(prev) && prev !== 0 ? Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1)) : null;
        }
      }
    });
  }

  // Executive Insight Synthesis
  let executiveInsight = null;
  const validItems = processedItems.filter(it => Number.isFinite(it._rawSeriesValues[primarySeriesKey]));
  if (validItems.length > 0) {
    const sortedByPrimary = [...validItems].sort(
      (a, b) => (b._rawSeriesValues[primarySeriesKey] ?? 0) - (a._rawSeriesValues[primarySeriesKey] ?? 0)
    );
    const topItem = sortedByPrimary[0];
    const bottomItem = sortedByPrimary[sortedByPrimary.length - 1];
    const totalSum = sortedByPrimary.reduce((acc, it) => acc + it._rawSeriesValues[primarySeriesKey], 0);
    const topVal = Number(topItem?._rawSeriesValues[primarySeriesKey] ?? 0);
    const bottomVal = Number(bottomItem?._rawSeriesValues[primarySeriesKey] ?? 0);
    const sharePct = isAdditive(primaryValCfg) && !primaryHasNegative && totalSum > 0 ? ((topVal / totalSum) * 100).toFixed(1) : null;

    // Top 3 cumulative share
    const top3Items = sortedByPrimary.slice(0, 3);
    const top3Sum = top3Items.reduce((acc, it) => acc + (it._rawSeriesValues[primarySeriesKey] ?? 0), 0);
    const top3SharePct = isAdditive(primaryValCfg) && !primaryHasNegative && totalSum > 0 ? ((top3Sum / totalSum) * 100).toFixed(1) : null;

    // Extreme ratio (top vs bottom)
    let extremeRatio = null;
    if (bottomVal > 0 && topVal >= bottomVal && sortedByPrimary.length > 1) {
      extremeRatio = (topVal / bottomVal).toFixed(1);
    }

    // Benchmark count (above mean)
    const meanVal = totalSum / sortedByPrimary.length;
    const aboveMeanCount = sortedByPrimary.filter(it => (it._rawSeriesValues[primarySeriesKey] ?? 0) >= meanVal).length;
    const meanFormatted = UnifiedFormatter.formatValue(meanVal, primaryValCfg, { compact: false });

    // Statistical Z-Score outlier detection across primary series (|z| > 1.8σ)
    if (validItems.length >= 4 && !isPercentMode) {
      const variance = validItems.reduce((acc, it) => {
        const diff = (it._rawSeriesValues[primarySeriesKey] ?? 0) - meanVal;
        return acc + diff * diff;
      }, 0) / validItems.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 1e-9) {
        validItems.forEach((it) => {
          const z = Math.abs(((it._rawSeriesValues[primarySeriesKey] ?? 0) - meanVal) / stdDev);
          if (z > 1.8) {
            it.isOutlier = true;
            it.zScore = z.toFixed(2);
          }
        });
      }
    }

    executiveInsight = {
      topName: topItem.name,
      topRowKey: topItem.rowKey,
      topFormatted: UnifiedFormatter.formatValue(topVal, primaryValCfg, { compact: false }),
      bottomName: bottomItem.name,
      bottomRowKey: bottomItem.rowKey,
      bottomFormatted: UnifiedFormatter.formatValue(bottomVal, primaryValCfg, { compact: false }),
      sharePct,
      topSharePct: sharePct,
      top3SharePct,
      top3Names: top3Items.map(it => it.name).join('、'),
      extremeRatio,
      aboveMeanCount,
      meanFormatted,
      groupCount: processedItems.length,
    };
  }

  // 3. Pie / Donut Items
  const pieTotal = validItems.reduce((acc, it) => acc + it._rawSeriesValues[primarySeriesKey], 0);
  if (['pie', 'donut', 'funnel'].includes(chartType) && !chartIssue && pieTotal <= 0 && validItems.length) chartIssue = '当前数值合计为 0，没有可解释的占比。请切换柱图查看各组数值。';
  const pieItems = (isAdditive(primaryValCfg) && !primaryHasNegative && pieTotal > 0 ? validItems : []).map((it, idx) => {
    const rawV = it._rawSeriesValues[primarySeriesKey];
    return {
      name: it.name,
      rowKey: it.rowKey,
      value: rawV,
      pct: pieTotal > 0 ? ((rawV / pieTotal) * 100).toFixed(1) : '0.0',
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    };
  });

  // 4. Waterfall Items
  const waterfallItems = [];
  let wfRunning = 0;
  validItems.forEach((it, idx) => {
    const delta = Number(it._rawSeriesValues?.[primarySeriesKey] ?? it[primarySeriesKey] ?? 0);
    const startVal = wfRunning;
    wfRunning += delta;
    const low = Math.min(startVal, wfRunning);
    const high = Math.max(startVal, wfRunning);
    waterfallItems.push({
      name: it.name,
      rowKey: it.rowKey,
      isFirst: idx === 0,
      isTotal: false,
      delta,
      startVal,
      cumulativeVal: wfRunning,
      range: [low, high],
      fill: idx === 0 ? '#66D9EF' : delta >= 0 ? '#A6E22E' : '#F92672',
      semanticType: idx === 0 ? '起点 (首项)' : delta >= 0 ? '正向增长' : '负向减少',
      formattedDelta: UnifiedFormatter.formatValue(delta, primaryValCfg, { compact: true, showPlusSign: idx > 0 }),
      formattedCumulative: UnifiedFormatter.formatValue(wfRunning, primaryValCfg, { compact: false }),
      matchedRows: it.matchedRows,
    });
  });
  if (waterfallItems.length > 0) {
    waterfallItems.push({
      name: '终点总计',
      rowKey: '__GRAND_TOTAL_ROW__',
      isFirst: false,
      isTotal: true,
      delta: wfRunning,
      startVal: 0,
      cumulativeVal: wfRunning,
      range: [0, wfRunning],
      fill: '#AE81FF',
      semanticType: '终点 (累计总计)',
      formattedDelta: UnifiedFormatter.formatValue(wfRunning, primaryValCfg, { compact: true }),
      formattedCumulative: UnifiedFormatter.formatValue(wfRunning, primaryValCfg, { compact: false }),
      matchedRows: grandTotalRecords,
    });
  }

  // 5. Funnel Items
  // Preserve the user's category order; category totals alone do not establish conversion.
  const funnelSorted = !primaryHasNegative ? validItems : [];
  const funnelMax = funnelSorted.reduce((max, item) => Math.max(max, item._rawSeriesValues[primarySeriesKey]), 0);
  const funnelItems = funnelSorted.map((it, idx) => {
    const val = Math.max(0, Number(it._rawSeriesValues[primarySeriesKey] ?? 0));
    const prevVal = idx > 0 ? Math.max(0, Number(funnelSorted[idx - 1]._rawSeriesValues[primarySeriesKey] ?? 0)) : val;
    const convPct = prevVal > 0 ? (val / prevVal) * 100 : null;
    return {
      name: it.name,
      rowKey: it.rowKey,
      value: val,
      formattedValue: UnifiedFormatter.formatValue(val, primaryValCfg, { compact: false }),
      widthPct: funnelMax > 0 ? val / funnelMax * 100 : 0,
      conversionFormatted: idx === 0 ? '首项' : convPct === null ? '上项为 0，无法比较' : `相对上项 ${convPct.toFixed(1)}%`,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
      matchedRows: it.matchedRows,
    };
  });

  // 6. Scatter Items with OLS Linear Regression & Z-Score Outlier Detection
  const isSelfCorrelation = secondarySeriesKey === primarySeriesKey;
  const scatterPoints = (chartType === 'scatter' ? validItems : []).map((it, idx) => {
    const xVal = Number(it._rawSeriesValues[primarySeriesKey] ?? idx + 1);
    let yVal = it._rawSeriesValues[secondarySeriesKey];
    if (yVal === undefined || isSelfCorrelation) {
      if (secondaryValCfg?.field && secondaryValCfg.field !== primaryValCfg.field) {
        const bucketKey = dataRows.length ? `${it.rowKey}@@__GRAND_TOTAL_COL__` : hasColGroups ? `__GRAND_TOTAL_ROW__@@${it.rowKey}` : '__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__';
        yVal = computeAggregation(pivotResult.cellRecordsMap?.get(bucketKey) || [], secondaryValCfg.field, secondaryValCfg.agg);
      } else {
        yVal = Number(it._rawSeriesValues[primarySeriesKey] ?? idx + 1);
      }
    }
    if (!Number.isFinite(yVal)) return null;
    return {
      name: it.name,
      rowKey: it.rowKey,
      x: xVal,
      y: yVal,
      z: Math.max(80, Math.min(380, Math.abs(xVal) / 1000)),
      fill: CHART_COLORS[idx % CHART_COLORS.length],
      isOutlier: false,
      zScore: '0.00',
      expectedY: yVal.toFixed(1),
      matchedRows: it.matchedRows,
    };
  }).filter(Boolean);
  let scatterRegressionSegment = null;
  let scatterMeanX = 0;
  let scatterMeanY = 0;
  if (scatterPoints.length >= 2) {
    const n = scatterPoints.length;
    scatterMeanX = scatterPoints.reduce((s, p) => s + p.x, 0) / n;
    scatterMeanY = scatterPoints.reduce((s, p) => s + p.y, 0) / n;
    let num = 0;
    let den = 0;
    scatterPoints.forEach((p) => {
      num += (p.x - scatterMeanX) * (p.y - scatterMeanY);
      den += (p.x - scatterMeanX) ** 2;
    });
    const slope = den !== 0 ? num / den : 0;
    const intercept = scatterMeanY - slope * scatterMeanX;
    const minX = Math.min(...scatterPoints.map((p) => p.x));
    const maxX = Math.max(...scatterPoints.map((p) => p.x));
    scatterRegressionSegment = [
      { x: minX, y: Number((slope * minX + intercept).toFixed(2)) },
      { x: maxX, y: Number((slope * maxX + intercept).toFixed(2)) },
    ];
    if (scatterPoints.length >= 3) {
      const residuals = scatterPoints.map((p) => p.y - (slope * p.x + intercept));
      const stdRes = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n) || 1;
      scatterPoints.forEach((p, idx) => {
        const z = Math.abs(residuals[idx] / stdRes);
        p.zScore = z.toFixed(2);
        p.expectedY = (slope * p.x + intercept).toFixed(1);
        if (z > 1.65) {
          p.isOutlier = true;
          p.fill = '#F92672';
        }
      });
    }
  }

  // 7. Histogram Items (Sturges Binning)
  const histField = (primaryValCfg.field && primaryValCfg.field !== '__COUNT__')
    ? primaryValCfg.field
    : (dataset?.fields?.find((f) => f.type === 'number')?.name || '');
  const rawBins = chartType === 'histogram'
    ? buildHistogramBins(allGrandTotalRecords, histField, chartSpecConfig?.histogramBins)
    : [];

  const sourceField = dataset?.fields?.find(f => f.name === histField);
  const histogramFormat = getMeasureDefaults(sourceField);
  const step = rawBins.length > 1 ? (rawBins[0].high - rawBins[0].low) : 1;
  const decimals = Math.min(8, Math.max(histogramFormat.format.decimals, step > 0 && step < 1 ? Math.ceil(-Math.log10(step * (histogramFormat.format.isPercent ? 100 : 1))) + 1 : histogramFormat.format.decimals));
  const boundaryConfig = { field: histField, agg: 'sum', format: { ...histogramFormat.format, decimals } };

  const histogramItems = rawBins.map((bin) => ({
    ...bin,
    histogramBin: bin.histogramBin,
    histogramRange: { field: histField, low: bin.low, high: bin.high, includeHigh: bin.includeMax },
    name: `${UnifiedFormatter.formatValue(bin.low, boundaryConfig)}~${UnifiedFormatter.formatValue(bin.high, boundaryConfig)}`,
    rangeFull: `[${bin.low.toLocaleString()}, ${bin.high.toLocaleString()}${bin.includeMax ? ']' : ')'}`,
  }));

  const histValidCount = rawBins.reduce((sum, bin) => sum + bin.count, 0);
  const histMissingCount = allGrandTotalRecords.filter(r => isMissingValue(r[histField])).length;
  const histogramSummary = { field: histField, total: allGrandTotalRecords.length, valid: histValidCount, missing: histMissingCount };
  const histogramStats = chartType === 'histogram' ? { valid: histValidCount, records: allGrandTotalRecords.length } : null;

  // 8. Primary Series Telemetry Stats
  const primaryValues = validItems.map((it) => it._rawSeriesValues[primarySeriesKey]).filter(v => typeof v === 'number' && Number.isFinite(v));
  const primaryTotal = primaryValues.reduce((a, b) => a + b, 0);
  const primaryStats = {
    validCount: primaryValues.length,
    total: primaryTotal,
    mean: primaryValues.length > 0 ? primaryTotal / primaryValues.length : 0,
    max: primaryValues.length > 0 ? Math.max(...primaryValues) : 0,
    min: primaryValues.length > 0 ? Math.min(...primaryValues) : 0,
  };
  const canStack = hasColGroups || (valConfigs.length > 1 && valConfigs.every((v) => UnifiedFormatter.inferUnit(v) === UnifiedFormatter.inferUnit(valConfigs[0])));
  const hasDualAxis = !hasColGroups && valConfigs.length > 1;
  const isPrimaryAdditive = isAdditive(primaryValCfg) && !primaryHasNegative;

  return {
    chartType,
    hasValues: true,
    isPercentMode,
    isPrimaryAdditive,
    canStack,
    hasDualAxis,
    xDimensionLabel: chartType === 'histogram' ? histField : xDimensionLabel,
    primaryValCfg,
    secondaryValCfg,
    primarySeriesKey,
    secondarySeriesKey,
    derivedSeriesKey,
    derivedMode,
    seriesMetaList,
    kpiCards,
    items: processedItems,
    scope: chartType !== 'histogram' && processedItems.length < groupCount ? { shown: processedItems.length, total: groupCount } : null,
    pieItems,
    waterfallItems,
    funnelItems,
    scatterPoints,
    scatterRegressionSegment,
    scatterMeanX,
    scatterMeanY,
    histogramItems,
    scope: chartType !== 'histogram' && processedItems.length < groupCount ? { shown: processedItems.length, total: groupCount } : null,
    histogramSummary,
    histogramStats,
    primaryStats,
    executiveInsight,
    chartIssue,
    availableGroupCount,
  };
}
