/**
 * Unified chart visual language — one Monokai product surface across all chart types.
 * Series palette stays CHART_COLORS; this module owns chrome, geometry, and semantic accents.
 */
import { CHART_COLORS } from './pivotConstants.js';

export const CV = {
  series: CHART_COLORS,

  semantic: {
    positive: '#A6E22E',
    negative: '#F92672',
    start: '#66D9EF',
    total: '#AE81FF',
    highlight: '#FD971F',
    derived: '#E6DB74',
    mean: '#FD971F',
    zero: '#75715E',
    ols: '#A6E22E',
    scatterMean: '#66D9EF',
    paperLight: '#FFFDF7',
    paperDark: '#272822',
    inkLight: '#272822',
    inkDark: '#F8F8F2',
    mutedLight: '#75715E',
    mutedDark: '#908E80',
  },

  heatmap: {
    pos: '#66D9EF',
    neg: '#F92672',
    opacityMin: 0.22,
    opacitySpan: 0.78,
    cellRx: 4,
  },

  histogram: {
    from: '#66D9EF',
    to: '#AE81FF',
    opacityFrom: 0.92,
    opacityTo: 0.68,
  },

  stroke: {
    series: 2.4,
    derived: 2,
    highlight: 2.5,
    leader: 1.2,
    zero: 1,
    cell: 1,
  },

  radius: {
    bar: [6, 6, 0, 0],
    hbar: [0, 6, 6, 0],
    stacked: [0, 0, 0, 0],
    waterfall: [4, 4, 0, 0],
  },

  dot: {
    base: 4,
    active: 6,
    highlight: 7,
    derived: 3,
    areaActive: 5,
  },

  grid: {
    dash: '3 3',
    light: '#DFDDD2',
    dark: '#3E3D32',
  },

  refDash: {
    avg: '4 4',
    mean: '3 3',
    ols: '6 3',
    derived: '5 3',
  },

  fill: {
    barGradFrom: 0.95,
    barGradTo: 0.72,
    areaGradFrom: 0.55,
    areaGradTo: 0.06,
    dim: 0.36,
  },

  typography: {
    tickCategory: 9.5,
    tickValue: 10,
    tickHeat: 11,
    tickFunnel: 11.5,
    dataLabel: 9,
    dataLabelWeight: 600,
    legend: 11,
    legendPadTop: 8,
    avgLabel: 9,
  },

  margin: {
    top: 24,
    right: 24,
    left: 10,
    bottom: 24,
    dualRight: 28,
    categoryLeft: 36,
    rotateBottomCompact: 52,
    rotateBottom: 58,
  },
};

export function chartInk(darkMode) {
  return darkMode ? CV.semantic.inkDark : CV.semantic.inkLight;
}

export function chartMuted(darkMode) {
  return darkMode ? CV.semantic.mutedDark : CV.semantic.mutedLight;
}

export function chartPaper(darkMode) {
  return darkMode ? CV.semantic.paperDark : CV.semantic.paperLight;
}

export function chartGridStroke(darkMode) {
  return darkMode ? CV.grid.dark : CV.grid.light;
}

export function chartMargin({ rotate = false, compact = false, dual = false, horizontal = false } = {}) {
  return {
    top: CV.margin.top,
    right: dual ? CV.margin.dualRight : CV.margin.right,
    left: horizontal ? CV.margin.categoryLeft : CV.margin.left,
    bottom: rotate
      ? (compact ? CV.margin.rotateBottomCompact : CV.margin.rotateBottom)
      : CV.margin.bottom,
  };
}

export function chartValueTick(darkMode) {
  return { fontSize: CV.typography.tickValue, fill: chartMuted(darkMode) };
}

export function chartLegendStyle() {
  return { fontSize: CV.typography.legend, paddingTop: CV.typography.legendPadTop };
}

export function chartAvgLabel(text) {
  return {
    value: text,
    position: 'insideTopRight',
    fontSize: CV.typography.avgLabel,
    fill: CV.semantic.mean,
  };
}

export function chartDimOpacity(isDimmed) {
  return isDimmed ? CV.fill.dim : 1;
}

export function chartBarRadius(chartType) {
  if (chartType === 'horizontal_bar') return CV.radius.hbar;
  if (chartType === 'stacked_bar' || chartType === 'pct_stacked_bar') return CV.radius.stacked;
  return CV.radius.bar;
}

export function seriesColor(index = 0) {
  return CV.series[index % CV.series.length];
}
