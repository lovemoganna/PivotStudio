import { AGG_METHODS, CHART_COLORS } from '../../../constants/pivotConstants.js';
import { UnifiedFormatter, getDimDisplayLabel } from '../../../utils/formatters.js';

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
    const candidateField = dataset?.fields?.find((f) => f.type === 'number' && f.name !== primaryValCfg.field);
    if (candidateField) {
      secondaryValCfg = {
        id: `v_auto_second_${candidateField.name}`,
        field: candidateField.name,
        agg: 'sum',
        showAs: 'normal',
        format: { thousands: true, decimals: 0, currency: candidateField.name.includes('额') || candidateField.name.includes('利') ? '¥' : '', isPercent: false },
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
  const grandTotalRecords = pivotResult?.cellRecordsMap?.get('__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__') || [];

  // If no value metrics are configured, return graceful empty spec immediately
  if (!hasValues) {
    return {
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
  }

  // 1. Build KPI Cards + Mini Sparkline Points
  const kpiCards = valConfigs.slice(0, 4).map((vc, kIdx) => {
    const grandVal = pivotResult.displayMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? 0;
    const aggLabel = AGG_METHODS.find((m) => m.value === vc.agg)?.short || vc.agg;
    const unit = UnifiedFormatter.inferUnit(vc);
    let comparison = null;
    if (dataRows.length >= 2) {
      const firstRow = dataRows[0];
      const secondRow = dataRows[1];
      const v0 = pivotResult.displayMatrix[`${firstRow.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? 0;
      const v1 = pivotResult.displayMatrix[`${secondRow.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? 0;
      if (v1 !== 0) {
        const diffPct = ((v0 - v1) / Math.abs(v1)) * 100;
        comparison = {
          isPositive: diffPct >= 0,
          pctFormatted: `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`,
          baselineLabel: `${firstRow.label} vs ${secondRow.label}`,
        };
      }
    }
    const sparkValues = dataRows.slice(0, 12).map((r) => pivotResult.displayMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? 0);
    return {
      id: vc.id,
      title: `${vc.field} (${aggLabel})`,
      unit,
      color: CHART_COLORS[kIdx % CHART_COLORS.length],
      formattedCurrent: UnifiedFormatter.formatValue(grandVal, vc, { compact: false }),
      comparison,
      sparkValues,
    };
  });

  // 2. Build Series Metadata & Items
  const hasColGroups = pivotResult.leafColGroups && pivotResult.leafColGroups.length > 0;
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
      const sKey = `${vc.field}(${aggShort})`;
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
  const secondarySeriesKey = seriesMetaList[1]?.key || primarySeriesKey;
  const isPercentMode = chartType === 'pct_stacked_bar' || chartType === 'pct_area';
  const missingMode = chartSpecConfig?.missingValueMode || 'zero';

  const lastSeenBySeries = {};
  let processedItems = [];

  if (dataRows.length > 0) {
    processedItems = dataRows.map((r) => {
      const item = {
        name: r.label,
        rowKey: r.rowKey,
        _rawSeriesValues: {},
        matchedRows: pivotResult.cellRecordsMap.get(`${r.rowKey}@@__GRAND_TOTAL_COL__`) || [],
      };
      let stackSum = 0;
      let absSum = 0;
      seriesMetaList.forEach((sm) => {
        const bucketRecs = pivotResult.cellRecordsMap.get(`${r.rowKey}@@${sm.colKey}`) || [];
        const cKey = `${r.rowKey}@@${sm.colKey}@@${sm.valCfg.id}`;
        let val = pivotResult.displayMatrix[cKey]?.display ?? 0;

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

        const numVal = val === null ? 0 : Number(val);
        item._rawSeriesValues[sm.key] = numVal;
        item[sm.key] = val;
        stackSum += numVal;
        absSum += Math.abs(numVal);
      });
      if (isPercentMode && absSum > 0) {
        seriesMetaList.forEach((sm) => {
          item[sm.key] = Number(((Math.abs(item._rawSeriesValues[sm.key]) / absSum) * 100).toFixed(2));
        });
      }
      item._stackSum = stackSum;
      return item;
    });
  } else if (hasColGroups) {
    // If no row dimension is configured but column dimension exists, chart column leaves
    processedItems = pivotResult.leafColGroups.map((cg) => {
      const item = {
        name: cg.label || cg.pathLabels.join(' / '),
        rowKey: cg.key,
        _rawSeriesValues: {},
        matchedRows: pivotResult.cellRecordsMap.get(`__GRAND_TOTAL_ROW__@@${cg.key}`) || [],
      };
      let stackSum = 0;
      let absSum = 0;
      seriesMetaList.forEach((sm) => {
        const cKey = `__GRAND_TOTAL_ROW__@@${cg.key}@@${sm.valCfg.id}`;
        const val = pivotResult.displayMatrix[cKey]?.display ?? 0;
        const numVal = Number(val);
        item._rawSeriesValues[sm.key] = numVal;
        item[sm.key] = val;
        stackSum += numVal;
        absSum += Math.abs(numVal);
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
      matchedRows: grandTotalRecords,
    };
    seriesMetaList.forEach((sm) => {
      const cKey = `__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${sm.valCfg.id}`;
      const val = pivotResult.displayMatrix[cKey]?.display ?? 0;
      item._rawSeriesValues[sm.key] = Number(val);
      item[sm.key] = val;
    });
    processedItems = [item];
  }

  processedItems.forEach((item) => {
    item._stackTotal = item._stackSum ?? 0;
    item._stackTotalFormatted = UnifiedFormatter.formatValue(item._stackTotal, primaryValCfg, { compact: false });
    item._compactPrimaryLabel = isPercentMode
      ? `${Number(item[primarySeriesKey] ?? 0).toFixed(1)}%`
      : UnifiedFormatter.formatValue(item._rawSeriesValues[primarySeriesKey] ?? 0, primaryValCfg, { compact: true });
  });

  if (chartSpecConfig?.sortMode === 'asc') {
    processedItems.sort((a, b) => (a._rawSeriesValues[primarySeriesKey] ?? 0) - (b._rawSeriesValues[primarySeriesKey] ?? 0));
  } else if (chartSpecConfig?.sortMode === 'desc') {
    processedItems.sort((a, b) => (b._rawSeriesValues[primarySeriesKey] ?? 0) - (a._rawSeriesValues[primarySeriesKey] ?? 0));
  }
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
      const cur = Number(it._rawSeriesValues[primarySeriesKey] ?? 0);
      if (derivedMode === 'cumulative') {
        runningCum += cur;
        it[derivedSeriesKey] = runningCum;
      } else if (derivedMode === 'ma3') {
        const slice = processedItems.slice(Math.max(0, idx - 2), idx + 1);
        const avg = slice.reduce((s, x) => s + Number(x._rawSeriesValues[primarySeriesKey] ?? 0), 0) / slice.length;
        it[derivedSeriesKey] = Number(avg.toFixed(1));
      } else if (derivedMode === 'mom_pct') {
        if (idx === 0) {
          it[derivedSeriesKey] = 0;
        } else {
          const prev = Number(processedItems[idx - 1]._rawSeriesValues[primarySeriesKey] ?? 0);
          it[derivedSeriesKey] = prev !== 0 ? Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1)) : 0;
        }
      }
    });
  }

  // Executive Insight Synthesis
  let executiveInsight = null;
  if (processedItems.length > 0) {
    const sortedByPrimary = [...processedItems].sort(
      (a, b) => (b._rawSeriesValues[primarySeriesKey] ?? 0) - (a._rawSeriesValues[primarySeriesKey] ?? 0)
    );
    const topItem = sortedByPrimary[0];
    const totalSum = sortedByPrimary.reduce((acc, it) => acc + Math.max(0, Number(it._rawSeriesValues[primarySeriesKey] ?? 0)), 0);
    const topVal = Number(topItem?._rawSeriesValues[primarySeriesKey] ?? 0);
    const sharePct = totalSum > 0 ? ((Math.max(0, topVal) / totalSum) * 100).toFixed(1) : '0.0';
    executiveInsight = {
      topName: topItem.name,
      topFormatted: UnifiedFormatter.formatValue(topVal, primaryValCfg, { compact: false }),
      sharePct,
      groupCount: processedItems.length,
    };
  }

  // 3. Pie / Donut Items
  const pieTotal = processedItems.reduce((acc, it) => acc + Math.max(0, Number(it._rawSeriesValues[primarySeriesKey] ?? 0)), 0);
  const pieItems = processedItems.map((it, idx) => {
    const rawV = Math.max(0, Number(it._rawSeriesValues[primarySeriesKey] ?? 0));
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
  processedItems.forEach((it, idx) => {
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
  const funnelSorted = [...processedItems].sort(
    (a, b) => (b._rawSeriesValues[primarySeriesKey] ?? 0) - (a._rawSeriesValues[primarySeriesKey] ?? 0)
  );
  const funnelMax = Math.max(1, Number(funnelSorted[0]?._rawSeriesValues[primarySeriesKey] ?? 1));
  const funnelItems = funnelSorted.map((it, idx) => {
    const val = Math.max(0, Number(it._rawSeriesValues[primarySeriesKey] ?? 0));
    const prevVal = idx > 0 ? Math.max(0, Number(funnelSorted[idx - 1]._rawSeriesValues[primarySeriesKey] ?? 0)) : val;
    const convPct = idx === 0 ? 100 : prevVal > 0 ? (val / prevVal) * 100 : 0;
    return {
      name: it.name,
      rowKey: it.rowKey,
      value: val,
      formattedValue: UnifiedFormatter.formatValue(val, primaryValCfg, { compact: false }),
      widthPct: Math.max(20, Math.round((val / funnelMax) * 100)),
      conversionFormatted: idx === 0 ? '基准阶段 (100%)' : `转化率 ${convPct.toFixed(1)}%`,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
      matchedRows: it.matchedRows,
    };
  });

  // 6. Scatter Items with OLS Linear Regression & Z-Score Outlier Detection
  const isSelfCorrelation = secondarySeriesKey === primarySeriesKey;
  const scatterPoints = processedItems.map((it, idx) => {
    const xVal = Number(it._rawSeriesValues[primarySeriesKey] ?? idx + 1);
    let yVal = Number(it._rawSeriesValues[secondarySeriesKey]);
    if (Number.isNaN(yVal) || yVal === undefined || isSelfCorrelation) {
      if (secondaryValCfg?.field && secondaryValCfg.field !== primaryValCfg.field) {
        const matched = it.matchedRows || [];
        yVal = matched.reduce((acc, r) => acc + (Number(r[secondaryValCfg.field]) || 0), 0);
      } else {
        yVal = Number(it._rawSeriesValues[primarySeriesKey] ?? idx + 1);
      }
    }
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
  });
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
  const histField = primaryValCfg.field || '销售额';
  const rawNums = grandTotalRecords
    .map((r) => ({ val: Number(r[histField]), rec: r }))
    .filter((x) => !Number.isNaN(x.val));
  const histogramItems = [];
  if (rawNums.length > 0) {
    const minV = Math.min(...rawNums.map((x) => x.val));
    const maxV = Math.max(...rawNums.map((x) => x.val));
    const binCount = chartSpecConfig?.histogramBins > 0
      ? chartSpecConfig.histogramBins
      : Math.max(4, Math.min(10, Math.ceil(1 + 3.322 * Math.log10(rawNums.length))));
    const step = Math.max(1, Math.ceil((maxV - minV + 1) / binCount));
    for (let b = 0; b < binCount; b++) {
      const low = minV + b * step;
      const high = low + step;
      const matched = rawNums
        .filter((x) => (b === binCount - 1 ? x.val >= low && x.val <= high : x.val >= low && x.val < high))
        .map((x) => x.rec);
      histogramItems.push({
        name: `${UnifiedFormatter.formatValue(low, primaryValCfg, { compact: true })}~${UnifiedFormatter.formatValue(high, primaryValCfg, { compact: true })}`,
        rangeFull: `[${low.toLocaleString()}, ${high.toLocaleString()})`,
        count: matched.length,
        pct: ((matched.length / rawNums.length) * 100).toFixed(1),
        matchedRows: matched,
      });
    }
  }

  // 8. Primary Series Telemetry Stats
  const primaryValues = processedItems.map((it) => Number(it._rawSeriesValues[primarySeriesKey] ?? 0));
  const primaryTotal = primaryValues.reduce((a, b) => a + b, 0);
  const primaryStats = {
    total: primaryTotal,
    mean: primaryValues.length > 0 ? primaryTotal / primaryValues.length : 0,
    max: primaryValues.length > 0 ? Math.max(...primaryValues) : 0,
    min: primaryValues.length > 0 ? Math.min(...primaryValues) : 0,
  };

  return {
    chartType,
    hasValues: true,
    isPercentMode,
    xDimensionLabel,
    primaryValCfg,
    secondaryValCfg,
    primarySeriesKey,
    secondarySeriesKey,
    derivedSeriesKey,
    derivedMode,
    seriesMetaList,
    kpiCards,
    items: processedItems,
    pieItems,
    waterfallItems,
    funnelItems,
    scatterPoints,
    scatterRegressionSegment,
    scatterMeanX,
    scatterMeanY,
    histogramItems,
    primaryStats,
    executiveInsight,
  };
}
