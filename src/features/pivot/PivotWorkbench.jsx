import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  RETAIL_TEST_DATASET,
  KEYNOTE_STORYBOARD_SHOTS,
  VISUAL_CHART_TYPES,
  buildDefaultPivotConfig
} from '../../constants/pivotConstants';
import * as XLSX from 'xlsx';
import { soundEngine } from '../../services/soundEngine';
import { formatDimensionValue } from '../../utils/formatters';
import { parseCSVTextToSheet } from '../../utils/csvParser';
import {
  exportToCSV as doExportCSV,
  exportToExcelMerged as doExportExcel,
  exportChartAsPNG as doExportPNG,
  exportPDFReport as doExportPDF
} from '../../utils/exportUtils';
import { calculatePivot } from './engine/calculatePivot';
import { buildUnifiedChartSpec } from './engine/buildChartSpec';

// Modular UI Components
import { HeaderBar } from './components/HeaderBar';
import { FieldShelf } from './components/FieldShelf';
import { PivotTable } from './components/PivotTable';
import { ChartStudio } from './components/ChartStudio';
import { StatusBar } from './components/StatusBar';
import { MiniSparkline } from './components/MiniSparkline';

// Modals
import { SpecModal } from './components/modals/SpecModal';
import { DrillDownModal } from './components/modals/DrillDownModal';
import { UploadModal } from './components/modals/UploadModal';
import { BinModal } from './components/modals/BinModal';
import { FilterModal } from './components/modals/FilterModal';
import { FormatModal } from './components/modals/FormatModal';
import { DataSourceModal } from './components/modals/DataSourceModal';
import { TestSuiteModal } from './components/modals/TestSuiteModal';
import { WorkspaceModal } from './components/modals/WorkspaceModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';

export default function PivotWorkbench() {
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [keynotePlaying, setKeynotePlaying] = useState(false);
  const [keynoteShotIdx, setKeynoteShotIdx] = useState(0);
  const [cinemaTheaterMode, setCinemaTheaterMode] = useState(false);
  const [shotProgressPct, setShotProgressPct] = useState(0);

  const [splitRatioPct, setSplitRatioPct] = useState(58);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef(null);

  const [hoveredCellTelemetry, setHoveredCellTelemetry] = useState(null);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [showChartStudioPopover, setShowChartStudioPopover] = useState(false);
  const [showAwardBadgeModal, setShowAwardBadgeModal] = useState(false);

  const [datasets, setDatasets] = useState([RETAIL_TEST_DATASET]);
  const [activeDatasetId, setActiveDatasetId] = useState(RETAIL_TEST_DATASET.id);

  const currentDataset = useMemo(
    () => datasets.find((d) => d.id === activeDatasetId) || datasets[0],
    [datasets, activeDatasetId]
  );

  const [pivotConfig, setPivotConfig] = useState(() => buildDefaultPivotConfig(RETAIL_TEST_DATASET));

  const [viewMode, setViewMode] = useState(() => window.matchMedia('(max-width: 1023px)').matches ? 'table' : 'split');
  const [chartType, setChartType] = useState('bar');
  const [highlightedRowKey, setHighlightedRowKey] = useState(null);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [chartSpecConfig, setChartSpecConfig] = useState({
    primaryValueId: '',
    secondaryValueId: '',
    sortMode: 'none',
    topN: 0,
    missingValueMode: 'zero',
    lineDerivedMetric: 'none',
    showDataLabels: true,
    showAvgReferenceLine: true,
    clickLinkMode: 'highlight',
    histogramBins: 0,
    stickyRowHeaders: true,
  });

  const [condFormat, setCondFormat] = useState({
    colorScale: 'none',
    showDataBar: true,
    customRuleEnabled: false,
    customRuleOp: 'gt',
    customRuleValue: 100000,
    customRuleColor: 'red',
  });

  const [draggingPayload, setDraggingPayload] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [drillDownModal, setDrillDownModal] = useState(null);
  const [drillSearch, setDrillSearch] = useState('');
  const [drillPage, setDrillPage] = useState(1);
  const [uploadPreviewModal, setUploadPreviewModal] = useState(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [activeHeaderFilterModal, setActiveHeaderFilterModal] = useState(null);
  const [headerFilterSearch, setHeaderFilterSearch] = useState('');
  const [activeBinModal, setActiveBinModal] = useState(null);
  const [binFormState, setBinFormState] = useState({ start: 0, step: 50000 });
  const [activeFormatModal, setActiveFormatModal] = useState(false);
  const [activeDataSourceModal, setActiveDataSourceModal] = useState(null);
  const [gsheetAuthMode, setGsheetAuthMode] = useState('public');
  const [gsheetOauthToken, setGsheetOauthToken] = useState('');
  const [gsheetUrlInput, setGsheetUrlInput] = useState('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0');
  const [sqlFormState, setSqlFormState] = useState({
    backendProxyUrl: 'http://127.0.0.1:3001/api/v1/sql',
    host: '127.0.0.1',
    port: '5432',
    dbName: 'bi_warehouse',
    user: 'readonly_analyst',
    password: '••••••••',
    selectedTable: 'fact_sales_orders',
    sql: 'SELECT 日期, 地区, 城市, 产品, 类别, 销售额, 数量 FROM fact_sales_orders WHERE 销售额 > 0 LIMIT 500;',
    connectionStatus: 'idle',
  });
  const [duckdbThreshold] = useState(50000);
  const [showTestSuiteModal, setShowTestSuiteModal] = useState(false);

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: 'usr_analyst_01', name: '张工 (BI分析师)', role: 'Admin' });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws_default_1');
  const [newWorkspaceNameInput, setNewWorkspaceNameInput] = useState('');
  const [shareTokenInput, setShareTokenInput] = useState('');
  const [savedWorkspaces, setSavedWorkspaces] = useState(() => {
    const defaultSnapshots = [
    {
      id: 'ws_default_1',
      name: '大区×品类全渠道销售透视 (预设)',
      updatedAt: '2025-06-20 10:30',
      author: '张工 (BI分析师)',
      datasetId: RETAIL_TEST_DATASET.id,
      viewMode: 'split',
      chartType: 'bar',
      condFormat: { colorScale: 'none', showDataBar: true, customRuleEnabled: false, customRuleOp: 'gt', customRuleValue: 100000, customRuleColor: 'red' },
      chartSpecConfig: { primaryValueId: 'v_init_1', secondaryValueId: 'v_init_2', sortMode: 'none', topN: 0, missingValueMode: 'zero', lineDerivedMetric: 'none' },
      pivotConfig: {
        filters: [],
        rows: [
          { id: 'r_init_1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
          { id: 'r_init_2', field: '商品类别', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
        ],
        columns: [{ id: 'c_init_1', field: '订单日期', sort: 'asc', dateGranularity: 'year', excludedValues: [] }],
        values: [
          { id: 'v_init_1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
          { id: 'v_init_2', field: '销量', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
        ],
        valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: 'v_init_1', direction: 'none' },
        collapsedRowKeys: {},
        collapsedColKeys: {},
        showSubtotals: false,
      },
    },
    ];
    try {
      const saved = JSON.parse(window.localStorage.getItem('pivotstudio_workspaces_v1'));
      return Array.isArray(saved) && saved.length ? saved : defaultSnapshots;
    } catch { return defaultSnapshots; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('pivotstudio_workspaces_v1', JSON.stringify(savedWorkspaces)); } catch { /* memory-only fallback */ }
  }, [savedWorkspaces]);

  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  const lastChartClickRef = useRef(0);
  const tableContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const isReadOnly = currentUser.role === 'Viewer';

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  const showToast = useCallback((text, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ text, type });
    toastTimerRef.current = setTimeout(() => { setToastMessage(null); }, 3200);
  }, []);

  const copyTextToClipboard = useCallback(async (text, successMsg = '已复制到剪贴板') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.focus();
        input.select();
        try {
          if (!document.execCommand('copy')) throw new Error('Copy rejected');
        } finally {
          input.remove();
        }
      }
      showToast(successMsg);
      return true;
    } catch {
      showToast('复制失败，请手动选择文本进行复制', 'error');
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMouseMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(35, Math.min(75, Math.round(rawPct)));
      setSplitRatioPct(clamped);
    };
    const handleMouseUp = () => {
      setIsResizingSplit(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit]);

  const applyKeynoteShot = useCallback((shotIdx) => {
    const normalizedIdx = (shotIdx + KEYNOTE_STORYBOARD_SHOTS.length) % KEYNOTE_STORYBOARD_SHOTS.length;
    const shot = KEYNOTE_STORYBOARD_SHOTS[normalizedIdx];
    if (!shot) return;
    soundEngine.playTransitionChord();
    setKeynoteShotIdx(normalizedIdx);
    setShotProgressPct(0);
    setViewMode(shot.viewMode);
    setChartType(shot.chartType);

    const validFieldNames = new Set((currentDataset?.fields || []).map((f) => f.name));
    const fallbackText = currentDataset?.fields?.find((f) => f.type === 'text')?.name || currentDataset?.fields?.[0]?.name || '';
    const fallbackDate = currentDataset?.fields?.find((f) => f.type === 'date')?.name || fallbackText;
    const fallbackNum = currentDataset?.fields?.find((f) => f.type === 'number')?.name || fallbackText;

    const adaptZone = (items, fallback) =>
      (items || []).map((item) => ({
        ...item,
        field: validFieldNames.has(item.field) ? item.field : fallback,
      })).filter((item) => Boolean(item.field));

    setPivotConfig((prev) => ({
      ...prev,
      rows: adaptZone(shot.pivotOverride.rows, fallbackText),
      columns: adaptZone(shot.pivotOverride.columns, fallbackDate),
      values: adaptZone(shot.pivotOverride.values, fallbackNum),
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
  }, [currentDataset]);

  const switchDataset = useCallback((nextId, targetDataset = null) => {
    const nextDs = targetDataset || datasets.find((d) => d.id === nextId);
    if (!nextDs) return;
    setActiveDatasetId(nextId);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);

    const validFieldNames = new Set((nextDs.fields || []).map((f) => f.name));
    setPivotConfig((prev) => {
      const keepValid = (arr) => (arr || []).filter((it) => validFieldNames.has(it.field));
      let nextRows = keepValid(prev.rows);
      let nextCols = keepValid(prev.columns);
      let nextVals = keepValid(prev.values);
      let nextFilters = keepValid(prev.filters);

      if (nextRows.length === 0 && nextCols.length === 0) {
        const firstText = nextDs.fields?.find((f) => f.type === 'text') || nextDs.fields?.[0];
        if (firstText) {
          nextRows = [{ id: `r_auto_${Date.now()}`, field: firstText.name, sort: 'none', dateGranularity: 'raw', excludedValues: [] }];
        }
      }

      if (nextVals.length === 0) {
        const firstNum = nextDs.fields?.find((f) => f.type === 'number') || nextDs.fields?.[0];
        if (firstNum) {
          nextVals = [{
            id: `v_auto_${Date.now()}`,
            field: firstNum.name,
            agg: firstNum.type === 'number' ? 'sum' : 'count',
            showAs: 'normal',
            format: {
              thousands: true,
              decimals: 0,
              currency: /销售额|金额|营收|price|amount/i.test(firstNum.name) ? '¥' : '',
              isPercent: false
            }
          }];
        }
      }

      return {
        ...prev,
        filters: nextFilters,
        rows: nextRows,
        columns: nextCols,
        values: nextVals,
        valueSort: {
          colKey: '__GRAND_TOTAL_COL__',
          valueId: nextVals[0]?.id || '',
          direction: 'none'
        },
        collapsedRowKeys: {},
        collapsedColKeys: {},
      };
    });

    setChartSpecConfig((prev) => ({
      ...prev,
      primaryValueId: '',
      secondaryValueId: '',
    }));
  }, [datasets]);

  const transposeRowsAndColumns = useCallback(() => {
    if (isReadOnly) {
      showToast('当前为只读预览模式 (Viewer)，无法执行行列互换', 'error');
      return;
    }
    soundEngine.playTransitionChord();
    setPivotConfig((prev) => ({
      ...prev,
      rows: prev.columns,
      columns: prev.rows,
      collapsedRowKeys: {},
      collapsedColKeys: {},
      valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: prev.values[0]?.id || '', direction: 'none' },
    }));
    showToast('已执行多维矩阵「行列互换 (Transpose)」');
  }, [isReadOnly, showToast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        soundEngine.playClick(640);
        setShowCommandPalette((prev) => !prev);
        setCommandQuery('');
        return;
      }
      if (!isTyping && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        soundEngine.playClick(560);
        setCinemaTheaterMode((prev) => !prev);
        return;
      }
      if (!isTyping && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        transposeRowsAndColumns();
        return;
      }
      if (!isTyping && !e.metaKey && !e.ctrlKey && e.key === '[') {
        e.preventDefault();
        applyKeynoteShot(keynoteShotIdx - 1);
        return;
      }
      if (!isTyping && !e.metaKey && !e.ctrlKey && e.key === ']') {
        e.preventDefault();
        applyKeynoteShot(keynoteShotIdx + 1);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowChartStudioPopover(false);
        setShowAwardBadgeModal(false);
        setDrillDownModal(null);
        setUploadPreviewModal(null);
        setActiveHeaderFilterModal(null);
        setActiveBinModal(null);
        setActiveFormatModal(false);
        setActiveDataSourceModal(null);
        setShowTestSuiteModal(false);
        setShowWorkspaceModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transposeRowsAndColumns, applyKeynoteShot, keynoteShotIdx]);

  useEffect(() => {
    if (!keynotePlaying) {
      setShotProgressPct(0);
      return;
    }
    const beatInterval = setInterval(() => {
      soundEngine.playBeatPulse();
    }, 625);
    const progressTimer = setInterval(() => {
      setShotProgressPct((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 100);
    const shotInterval = setInterval(() => {
      setKeynoteShotIdx((prev) => {
        const next = (prev + 1) % KEYNOTE_STORYBOARD_SHOTS.length;
        applyKeynoteShot(next);
        return next;
      });
    }, 5000);
    return () => {
      clearInterval(beatInterval);
      clearInterval(progressTimer);
      clearInterval(shotInterval);
    };
  }, [keynotePlaying, applyKeynoteShot]);

  const pivotResult = useMemo(
    () => calculatePivot(currentDataset, pivotConfig),
    [currentDataset, pivotConfig]
  );

  const unifiedChartSpec = useMemo(
    () => buildUnifiedChartSpec(currentDataset, pivotResult, chartType, chartSpecConfig),
    [currentDataset, pivotResult, chartType, chartSpecConfig]
  );

  const liveEngineTestResults = useMemo(() => {
    const scenarios = [
      {
        id: 't1',
        name: '场景 1：单行字段分组求和 (按销售大区汇总销售额)',
        expectedSummary: '华东 ¥388,300 · 华南 ¥378,000 · 华北 ¥366,950 · 西南 ¥257,880 · 华中 ¥232,380 · 总计 ¥1,623,510',
        cfg: {
          filters: [],
          rows: [{ id: 'r1', field: '销售大区', sort: 'desc', dateGranularity: 'raw', excludedValues: [] }],
          columns: [],
          values: [{ id: 'v1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } }],
        },
        verify: (res) => {
          const grand = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'];
          const east = res.rawValueMatrix['华东@@__GRAND_TOTAL_COL__@@v1'];
          const south = res.rawValueMatrix['华南@@__GRAND_TOTAL_COL__@@v1'];
          return {
            passed: grand === 1623510 && east === 388300 && south === 378000 && res.tableRows.length === 6,
            actualSummary: `华东 ¥${(east || 0).toLocaleString()} · 华南 ¥${(south || 0).toLocaleString()} · 总计 ¥${(grand || 0).toLocaleString()} (${res.elapsedMs}ms)`,
          };
        },
      },
      {
        id: 't2',
        name: '场景 2：两个行字段嵌套分组 (销售大区 × 商品类别，验证首列合并单元格)',
        expectedSummary: '5个大区 × 多类别组合 = 21条明细行 + 1条总计行 = 22行，首列自动行合并',
        cfg: {
          filters: [],
          rows: [
            { id: 'r1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
            { id: 'r2', field: '商品类别', sort: 'none', dateGranularity: 'raw', excludedValues: [] },
          ],
          columns: [],
          values: [{ id: 'v1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } }],
        },
        verify: (res) => {
          const firstRowSpan = res.tableRows[0]?.headerCells?.[0]?.rowSpan;
          return {
            passed: res.tableRows.length === 22 && firstRowSpan > 1,
            actualSummary: `总行数 ${res.tableRows.length} 行 · 首列合并跨度 rowSpan=${firstRowSpan} (${res.elapsedMs}ms)`,
          };
        },
      },
      {
        id: 't3',
        name: '场景 3：行字段与列字段交叉透视 (销售大区 × 订单日期年度交叉表)',
        expectedSummary: '生成 2024年、2025年 及 行总计 交叉列头，总计 ¥1,623,510',
        cfg: {
          filters: [],
          rows: [{ id: 'r1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
          columns: [{ id: 'c1', field: '订单日期', sort: 'asc', dateGranularity: 'year', excludedValues: [] }],
          values: [{ id: 'v1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } }],
        },
        verify: (res) => {
          const colLabels = res.leafColGroups.map((c) => c.label).join(', ');
          const grand = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'];
          return {
            passed: res.leafColGroups.length === 2 && grand === 1623510,
            actualSummary: `交叉列: [${colLabels}] + 行总计 · 总计 ¥${(grand || 0).toLocaleString()} (${res.elapsedMs}ms)`,
          };
        },
      },
      {
        id: 't4',
        name: '场景 4：多个值字段同时计算 (销售额 SUM + 销量 SUM + 毛利润 SUM + 城市 DISTINCT)',
        expectedSummary: '总额 ¥1,623,510 · 销量 1,172 件 · 毛利 ¥649,235 · 覆盖 12 个去重城市',
        cfg: {
          filters: [],
          rows: [{ id: 'r1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
          columns: [],
          values: [
            { id: 'v1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
            { id: 'v2', field: '销量', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
            { id: 'v3', field: '毛利润', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } },
            { id: 'v4', field: '城市', agg: 'count_distinct', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } },
          ],
        },
        verify: (res) => {
          const sumV = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'];
          const qtyV = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v2'];
          const profV = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v3'];
          const distV = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v4'];
          return {
            passed: sumV === 1623510 && qtyV === 1172 && profV === 649235 && distV === 12,
            actualSummary: `SUM=¥${(sumV || 0).toLocaleString()} · 销量=${qtyV} · 毛利=¥${(profV || 0).toLocaleString()} · DISTINCT=${distV}城 (${res.elapsedMs}ms)`,
          };
        },
      },
      {
        id: 't5',
        name: '场景 5：带筛选条件的透视计算 (仅筛选 华东 + 华南)',
        expectedSummary: '过滤后有效记录 15 行，合计销售额 ¥766,300',
        cfg: {
          filters: [{ id: 'f1', field: '销售大区', selectedValues: ['华东', '华南'] }],
          rows: [{ id: 'r1', field: '销售大区', sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
          columns: [{ id: 'c1', field: '商品类别', sort: 'none', dateGranularity: 'raw', excludedValues: [] }],
          values: [{ id: 'v1', field: '销售额', agg: 'sum', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '¥', isPercent: false } }],
        },
        verify: (res) => {
          const grand = res.rawValueMatrix['__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@v1'];
          return {
            passed: res.filteredCount === 15 && grand === 766300,
            actualSummary: `有效行数 ${res.filteredCount}/33 行 · 筛选合计 ¥${(grand || 0).toLocaleString()} (${res.elapsedMs}ms)`,
          };
        },
      },
    ];

    return scenarios.map((sc) => {
      const res = calculatePivot(RETAIL_TEST_DATASET, sc.cfg);
      const v = sc.verify(res);
      return { ...sc, ...v };
    });
  }, []);

  const addFieldToZone = useCallback((zone, fieldName) => {
    if (isReadOnly) {
      showToast('当前为只读预览模式 (Viewer)，无法修改透视配置', 'error');
      return;
    }
    soundEngine.playClick(580);
    setPivotConfig((prev) => {
      const list = prev[zone] || [];
      const fMeta = currentDataset.fields.find((f) => f.name === fieldName);

      if (zone !== 'values' && list.some((it) => it.field === fieldName)) {
        if ((zone === 'rows' || zone === 'columns') && fMeta?.type === 'date') {
          const usedGrans = new Set(list.filter((it) => it.field === fieldName).map((it) => it.dateGranularity));
          const nextGranOrder = ['year', 'quarter', 'month', 'day', 'raw'];
          const nextGran = nextGranOrder.find((g) => !usedGrans.has(g));
          if (!nextGran) {
            showToast(`「${fieldName}」的所有日期粒度均已添加`, 'error');
            return prev;
          }
          const id = `${zone[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          showToast(`已添加多级日期分组：「${fieldName} (${nextGran})」`);
          return {
            ...prev,
            [zone]: [...list, { id, field: fieldName, sort: 'asc', dateGranularity: nextGran, excludedValues: [] }],
            collapsedRowKeys: {},
            collapsedColKeys: {},
          };
        }
        showToast(`「${fieldName}」已存在于该区域`, 'error');
        return prev;
      }

      const id = `${zone[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (zone === 'values') {
        const defaultAgg = fMeta?.type === 'number' ? 'sum' : 'count';
        return {
          ...prev,
          values: [
            ...list,
            {
              id,
              field: fieldName,
              agg: defaultAgg,
              showAs: 'normal',
              format: { thousands: true, decimals: 0, currency: /销售额|金额/.test(fieldName) ? '¥' : '', isPercent: false },
            },
          ],
        };
      }
      if (zone === 'filters') {
        return {
          ...prev,
          filters: [...list, { id, field: fieldName, selectedValues: [] }],
        };
      }
      return {
        ...prev,
        [zone]: [
          ...list,
          { id, field: fieldName, sort: 'none', dateGranularity: fMeta?.type === 'date' ? 'year' : 'raw', excludedValues: [] },
        ],
        collapsedRowKeys: {},
        collapsedColKeys: {},
      };
    });
  }, [currentDataset.fields, isReadOnly, showToast]);

  const removeZoneItem = useCallback((zone, itemId) => {
    if (isReadOnly) return;
    soundEngine.playClick(440);
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: (prev[zone] || []).filter((it) => it.id !== itemId),
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
  }, [isReadOnly]);

  const toggleDimensionSort = useCallback((zone, itemId) => {
    if (isReadOnly) {
      showToast('当前为只读预览模式 (Viewer)，无法修改排序配置', 'error');
      return;
    }
    soundEngine.playClick(540);
    setPivotConfig((prev) => ({
      ...prev,
      [zone]: (prev[zone] || []).map((it) => {
        if (it.id !== itemId) return it;
        const nextSort = it.sort === 'none' ? 'asc' : it.sort === 'asc' ? 'desc' : 'none';
        return { ...it, sort: nextSort };
      }),
      valueSort: zone === 'rows' ? { ...prev.valueSort, direction: 'none' } : prev.valueSort,
    }));
  }, [isReadOnly, showToast]);

  const moveZoneItem = useCallback((zone, index, delta) => {
    if (isReadOnly) return;
    soundEngine.playClick(500);
    setPivotConfig((prev) => {
      const list = [...(prev[zone] || [])];
      const targetIdx = index + delta;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const [moved] = list.splice(index, 1);
      list.splice(targetIdx, 0, moved);
      return {
        ...prev,
        [zone]: list,
        collapsedRowKeys: {},
        collapsedColKeys: {},
      };
    });
  }, [isReadOnly]);

  const toggleRowCollapse = useCallback((rowKey) => {
    setPivotConfig((prev) => ({
      ...prev,
      collapsedRowKeys: {
        ...prev.collapsedRowKeys,
        [rowKey]: !prev.collapsedRowKeys[rowKey],
      },
    }));
  }, []);

  const toggleColCollapse = useCallback((colKey) => {
    setPivotConfig((prev) => ({
      ...prev,
      collapsedColKeys: {
        ...prev.collapsedColKeys,
        [colKey]: !prev.collapsedColKeys[colKey],
      },
    }));
  }, []);

  const cycleValueColSort = useCallback((colKey, valueId) => {
    if (isReadOnly) return;
    setPivotConfig((prev) => {
      const cur = prev.valueSort || {};
      let nextDir = 'desc';
      if (cur.colKey === colKey && cur.valueId === valueId) {
        nextDir = cur.direction === 'desc' ? 'asc' : cur.direction === 'asc' ? 'none' : 'desc';
      }
      return {
        ...prev,
        valueSort: { colKey, valueId, direction: nextDir },
      };
    });
  }, [isReadOnly]);

  const handleChartPointClick = useCallback((pointData) => {
    const now = Date.now();
    if (now - lastChartClickRef.current < 90) return;
    lastChartClickRef.current = now;
    const rk = pointData?.rowKey || pointData?.payload?.rowKey;
    if (!rk || rk === '__GRAND_TOTAL_ROW__') return;

    if (chartSpecConfig.clickLinkMode === 'filter') {
      const activeDim = pivotConfig.rows.length > 0 ? pivotConfig.rows[0] : (pivotConfig.columns.length > 0 ? pivotConfig.columns[0] : null);
      if (!activeDim) return;

      const firstSeg = rk.split('||')[0];
      const fMeta = currentDataset.fields.find((f) => f.name === activeDim.field);
      const matchingRawVals = Array.from(
        new Set(
          currentDataset.rows
            .filter((r) => formatDimensionValue(r[activeDim.field], activeDim, fMeta) === firstSeg)
            .map((r) => String(r[activeDim.field] ?? ''))
        )
      );

      setPivotConfig((prev) => {
        const existing = prev.filters.find((f) => f.field === activeDim.field);
        const isSame = existing && existing.selectedValues.length === matchingRawVals.length && existing.selectedValues.every((v) => matchingRawVals.includes(v));
        if (isSame) {
          showToast(`已清除「${activeDim.field}」的联动筛选`);
          return {
            ...prev,
            filters: prev.filters.filter((f) => f.field !== activeDim.field),
          };
        }
        showToast(`已触发图表全局筛选联动: ${firstSeg}`);
        return {
          ...prev,
          filters: [
            ...prev.filters.filter((f) => f.field !== activeDim.field),
            { id: `f_link_${Date.now()}`, field: activeDim.field, selectedValues: matchingRawVals },
          ],
        };
      });
    } else {
      setHighlightedRowKey((prev) => {
        const nextKey = prev === rk ? null : rk;
        if (nextKey && tableContainerRef.current) {
          const rowIndex = pivotResult.tableRows.findIndex((r) => r.rowKey === nextKey);
          if (rowIndex >= 0) {
            tableContainerRef.current.scrollTo({
              top: Math.max(0, rowIndex * 35 - 72),
              behavior: 'smooth',
            });
          }
        }
        return nextKey;
      });
    }
  }, [chartSpecConfig.clickLinkMode, currentDataset, pivotConfig.rows, pivotResult.tableRows, showToast]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size === 0) {
      showToast('上传的文件为空 (0 Bytes)，请检查文件内容', 'error');
      e.target.value = '';
      return;
    }
    try {
      // 1. 如果是 Excel 工作簿文件 (.xlsx, .xls)
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        setUploadProgress({ fileName: file.name, currentChunk: 1, totalChunks: 1, pct: 100 });
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheets = workbook.SheetNames.map((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (!rawRows || rawRows.length === 0) return null;
          const headers = Object.keys(rawRows[0] || {});
          const fields = headers.map((h) => {
            let numCount = 0;
            let dateCount = 0;
            let boolCount = 0;
            let nonEmpty = 0;
            const sampleSize = Math.min(30, rawRows.length);
            for (let i = 0; i < sampleSize; i++) {
              const val = rawRows[i][h];
              if (val === '' || val === null || val === undefined) continue;
              nonEmpty++;
              if (typeof val === 'boolean' || /^(true|false|是|否)$/i.test(String(val))) {
                boolCount++;
              } else if (val instanceof Date || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(val))) {
                dateCount++;
              } else if (typeof val === 'number' || !Number.isNaN(Number(String(val).replace(/,/g, '')))) {
                numCount++;
              }
            }
            let type = 'text';
            if (nonEmpty > 0) {
              if (boolCount / nonEmpty > 0.6) type = 'boolean';
              else if (dateCount / nonEmpty > 0.5) type = 'date';
              else if (numCount / nonEmpty > 0.6) type = 'number';
            }
            return { name: h, type };
          });
          return {
            name: sheetName,
            fields,
            rows: rawRows,
          };
        }).filter(Boolean);

        setUploadProgress(null);
        if (!sheets || sheets.length === 0) {
          showToast('未能从 Excel 工作簿中解析出有效数据行', 'error');
          return;
        }
        setUploadPreviewModal({
          fileName: file.name,
          activeSheetIdx: 0,
          sheets,
        });
        e.target.value = '';
        return;
      }

      // 2. CSV / TSV / 文本表格文件
      const chunkSize = 64 * 1024;
      const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
      let accumulatedText = '';
      for (let idx = 0; idx < totalChunks; idx++) {
        setUploadProgress({
          fileName: file.name,
          currentChunk: idx + 1,
          totalChunks,
          pct: Math.round(((idx + 1) / totalChunks) * 100),
        });
        const slice = file.slice(idx * chunkSize, (idx + 1) * chunkSize);
        const chunkText = await slice.text();
        accumulatedText += chunkText;
      }
      setUploadProgress(null);
      const sheet = parseCSVTextToSheet(accumulatedText, file.name);
      if (!sheet || sheet.rows.length === 0) {
        showToast('未能从文件中解析出有效数据行', 'error');
        return;
      }
      setUploadPreviewModal({
        fileName: file.name,
        activeSheetIdx: 0,
        sheets: [sheet],
      });
    } catch {
      setUploadProgress(null);
      showToast('文件读取失败，请上传标准 CSV 或 Excel 表格文件', 'error');
    }
    e.target.value = '';
  }, [showToast]);

  const confirmUploadDataset = useCallback((autoInitPivot = true) => {
    if (!uploadPreviewModal) return;
    const sheet = uploadPreviewModal.sheets[uploadPreviewModal.activeSheetIdx] || uploadPreviewModal.sheets[0];
    const normalizedRows = sheet.rows.map((r) => {
      const next = { ...r };
      sheet.fields.forEach((f) => {
        if (f.type === 'number') {
          const raw = String(r[f.name] ?? '').trim();
          const n = raw ? Number(raw.replace(/,/g, '')) : null;
          next[f.name] = n === null || Number.isFinite(n) ? n : null;
        } else if (f.type === 'boolean') {
          next[f.name] = /^(true|1|是|yes)$/i.test(String(r[f.name] ?? '').trim());
        }
      });
      return next;
    });

    const newDs = {
      id: `ds_upload_${Date.now()}`,
      name: `${uploadPreviewModal.fileName} (${normalizedRows.length}行)`,
      fields: sheet.fields,
      rows: normalizedRows,
    };
    setDatasets((prev) => [...prev, newDs]);
    setActiveDatasetId(newDs.id);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);

    if (autoInitPivot) {
      const firstText = sheet.fields.find((f) => f.type === 'text') || sheet.fields[0];
      const firstNum = sheet.fields.find((f) => f.type === 'number') || sheet.fields[0];
      setPivotConfig({
        filters: [],
        rows: firstText ? [{ id: 'r_init_1', field: firstText.name, sort: 'none', dateGranularity: 'raw', excludedValues: [] }] : [],
        columns: [],
        values: firstNum ? [{ id: 'v_init_1', field: firstNum.name, agg: firstNum.type === 'number' ? 'sum' : 'count', showAs: 'normal', format: { thousands: true, decimals: 0, currency: '', isPercent: false } }] : [],
        valueSort: { colKey: '__GRAND_TOTAL_COL__', valueId: 'v_init_1', direction: 'none' },
        collapsedRowKeys: {},
        collapsedColKeys: {},
        showSubtotals: false,
      });
    } else {
      setPivotConfig((prev) => ({ ...prev, filters: [], rows: [], columns: [], values: [], collapsedRowKeys: {}, collapsedColKeys: {} }));
    }
    setUploadPreviewModal(null);
    soundEngine.playTransitionChord();
    showToast(`成功导入数据集「${newDs.name}」`);
  }, [uploadPreviewModal, showToast]);

  const generate100kDataset = useCallback((count = 100000) => {
    const regions = ['华东', '华南', '华北', '西南', '华中', '西北'];
    const cities = ['上海', '深圳', '北京', '成都', '杭州', '广州', '武汉', '西安'];
    const channels = ['线上旗舰店', '企业集采', '线下自营店', '抖音电商'];
    const categories = ['智能数码', '办公外设', '智能家居', '潮流服饰', '休闲食品'];
    const products = ['降噪耳机 Pro', '4K高清显示器', '智能扫地机 X9', '机械键盘 RGB', '纯棉连帽卫衣', '意式咖啡机', '冻干咖啡礼盒', '极光便携投影'];
    const memberTypes = ['普通会员', 'VIP黄金会员', '企业客户'];

    const bigRows = new Array(count);
    for (let i = 0; i < count; i++) {
      const m = (i % 12) + 1;
      const d = (i % 28) + 1;
      const yr = 2023 + (i % 3);
      const sales = ((i * 173) % 95000) + 5000;
      const qty = ((i * 7) % 45) + 1;
      const cost = Math.round(sales * 0.6);
      const profit = sales - cost;

      bigRows[i] = {
        订单日期: `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        销售大区: regions[i % regions.length],
        城市: cities[i % cities.length],
        销售渠道: channels[i % channels.length],
        商品类别: categories[i % categories.length],
        商品名称: products[i % products.length],
        客户类型: memberTypes[i % memberTypes.length],
        销售额: sales,
        销量: qty,
        成本: cost,
        毛利润: profit,
        是否促销: i % 2 === 0,
      };
    }
    const bigDs = {
      id: `ds_100k_${Date.now()}`,
      name: `10万行级全渠道零售压测数据集 (${count.toLocaleString()}行)`,
      fields: RETAIL_TEST_DATASET.fields,
      rows: bigRows,
    };
    setDatasets((prev) => [...prev, bigDs]);
    switchDataset(bigDs.id, bigDs);
    setActiveDataSourceModal(null);
    soundEngine.playTransitionChord();
    showToast(`已生成并载入 ${count.toLocaleString()} 行全渠道零售数据集，虚拟滚动已就绪，聚合仍由本地 JavaScript 执行。`);
  }, [showToast, switchDataset]);

  const exportToCSV = useCallback(() => {
    doExportCSV(currentDataset, pivotResult, showToast);
  }, [currentDataset, pivotResult, showToast]);

  const exportToExcelMerged = useCallback(() => {
    doExportExcel(currentDataset, pivotResult, showToast);
  }, [currentDataset, pivotResult, showToast]);

  const exportChartAsPNG = useCallback(() => {
    doExportPNG(currentDataset, unifiedChartSpec, chartType, darkMode, viewMode, showToast);
  }, [chartType, currentDataset, darkMode, showToast, unifiedChartSpec, viewMode]);

  const exportPDFReport = useCallback(() => {
    doExportPDF(setIsPrintingReport);
  }, []);

  const applyShareTokenPayload = useCallback((rawInput) => {
    if (!rawInput || !rawInput.trim()) return false;
    try {
      const tokenPart = rawInput.includes('share_token=') ? rawInput.split('share_token=')[1].split('&')[0] : rawInput.trim();
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(tokenPart)))));
      if (decoded.ds && decoded.ds !== currentDataset.id) {
        showToast('配置关联的数据集与当前数据集不同，请先加载对应原始数据', 'error');
        return false;
      }
      if (decoded.fullConfig) setPivotConfig(decoded.fullConfig);
      if (decoded.cf) setCondFormat(decoded.cf);
      if (decoded.csc) setChartSpecConfig((p) => ({ ...p, ...decoded.csc }));
      if (decoded.vm) setViewMode(decoded.vm);
      if (decoded.ct) setChartType(decoded.ct);
      showToast('已从 Share Token 成功还原透视工作台视图！');
      return true;
    } catch {
      showToast('Share Token 格式无效，无法解析还原', 'error');
      return false;
    }
  }, [showToast, currentDataset.id]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('share_token');
    if (token) applyShareTokenPayload(token);
  }, [applyShareTokenPayload]);

  // Spotlight Command Palette Actions
  const commandActions = useMemo(() => {
    const list = [
      { id: 'cmd_keynote', category: 'Keynote 叙事分镜', label: keynotePlaying ? '暂停 96 BPM Keynote 自动运镜' : '启动 96 BPM Apple Keynote 自动运镜', shortcut: 'Space', run: () => { setKeynotePlaying((p) => !p); } },
      { id: 'cmd_theater', category: 'Keynote 叙事分镜', label: cinemaTheaterMode ? '退出剧院全屏舞台模式' : '进入剧院全屏舞台模式 (隐藏侧栏)', shortcut: 'T', run: () => { setCinemaTheaterMode((p) => !p); } },
      { id: 'cmd_transpose', category: '矩阵与结构操作', label: '一键执行透视矩阵「行列互换 (Transpose)」', shortcut: 'R', run: transposeRowsAndColumns },
      ...KEYNOTE_STORYBOARD_SHOTS.map((s, idx) => ({
        id: `cmd_shot_${idx}`,
        category: 'Keynote 叙事分镜',
        label: `切换分镜 ${s.number}: ${s.title}`,
        shortcut: `0${idx + 1}`,
        run: () => applyKeynoteShot(idx),
      })),
      ...VISUAL_CHART_TYPES.map((ct) => ({
        id: `cmd_chart_${ct.value}`,
        category: '15 种可视化图表切换',
        label: `切换图表为: ${ct.label}`,
        shortcut: ct.short,
        run: () => { setChartType(ct.value); if (viewMode === 'table') setViewMode('split'); },
      })),
      { id: 'cmd_100k', category: '性能与引擎验证', label: '一键生成 100,000 行大数据压测集 (激活虚拟滚动)', shortcut: '100K', run: () => generate100kDataset(100000) },
      { id: 'cmd_testsuite', category: '性能与引擎验证', label: '打开内置计算场景校验（非全量验收）', shortcut: '5/5', run: () => setShowTestSuiteModal(true) },
      { id: 'cmd_theme', category: '外观与导出', label: darkMode ? '切换为 Monokai Light 暖纸浅色主题' : '切换为 Monokai Pro 经典暗黑主题', shortcut: 'Theme', run: () => setDarkMode((p) => !p) },
      { id: 'cmd_excel', category: '外观与导出', label: '导出 Excel 工作簿 (.xlsx)', shortcut: 'XLS', run: exportToExcelMerged },
      { id: 'cmd_csv', category: '外观与导出', label: '导出标准 UTF-8 CSV 数据表 (.csv)', shortcut: 'CSV', run: exportToCSV },
    ];
    if (!commandQuery.trim()) return list;
    const q = commandQuery.toLowerCase();
    return list.filter((item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [keynotePlaying, cinemaTheaterMode, transposeRowsAndColumns, applyKeynoteShot, viewMode, generate100kDataset, darkMode, exportToExcelMerged, exportToCSV, commandQuery]);

  // Default and synchronized height matching the PivotTable's rendered dimension
  const defaultTableHeight = useMemo(() => {
    const colHeaderCount = Math.max(1, pivotResult.colHeaderRows.length);
    const headerH = (colHeaderCount + (pivotResult.rowConfigs.length > 0 ? 1 : 0)) * 36;
    const rowCount = Math.min(pivotResult.tableRows.length, 30);
    const rowsH = Math.max(1, rowCount) * 35;
    return Math.max(480, Math.min(headerH + rowsH + 16, 720));
  }, [pivotResult.colHeaderRows.length, pivotResult.rowConfigs.length, pivotResult.tableRows.length]);

  const [syncedTableHeight, setSyncedTableHeight] = useState(defaultTableHeight);

  useEffect(() => {
    setSyncedTableHeight(defaultTableHeight);
  }, [defaultTableHeight]);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    const tableEl = tableContainerRef.current.querySelector('#pivot-main-html-table');
    if (!tableEl) return;

    const measure = () => {
      const h = tableEl.offsetHeight || tableEl.scrollHeight;
      if (h > 120) {
        setSyncedTableHeight(Math.max(480, Math.min(h + 12, 740)));
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(tableEl);
    return () => ro.disconnect();
  }, [pivotResult]);

  const ROW_HEIGHT = 32;
  const isVirtualized = pivotResult.tableRows.length > 80 && !isPrintingReport;

  const visibleRowWindow = useMemo(() => {
    if (!isVirtualized) {
      return { startIndex: 0, endIndex: pivotResult.tableRows.length, topPadding: 0, bottomPadding: 0, rows: pivotResult.tableRows };
    }
    const viewportHeight = tableContainerRef.current?.clientHeight || 560;
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8);
    const endIdx = Math.min(pivotResult.tableRows.length, startIdx + Math.ceil(viewportHeight / ROW_HEIGHT) + 16);
    return {
      startIndex: startIdx,
      endIndex: endIdx,
      topPadding: startIdx * ROW_HEIGHT,
      bottomPadding: Math.max(0, (pivotResult.tableRows.length - endIdx) * ROW_HEIGHT),
      rows: pivotResult.tableRows.slice(startIdx, endIdx),
    };
  }, [isVirtualized, pivotResult.tableRows, scrollTop]);

  return (
    <div className={darkMode && !isPrintingReport ? 'dark' : ''}>
      <div className={`h-[100dvh] min-h-[480px] bg-[#F7F6F0] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2] text-[12px] leading-relaxed antialiased tabular-nums flex flex-col apple-font-sans select-none print:bg-white print:text-black apple-transition ${isPrintingReport ? 'h-auto overflow-visible' : 'overflow-y-auto lg:overflow-hidden'}`}>
        <div className="hidden print:block px-6 py-4 border-b border-black/15">
          <h1 className="text-base font-semibold tracking-tight text-black">PivotEngine Studio [Monokai Pro] 数据透视分析报告 — {currentDataset.name}</h1>
          <p className="text-[11px] text-[#75715E] mt-1">导出时间: {new Date().toLocaleString('zh-CN')} · 有效记录: {pivotResult.filteredCount.toLocaleString()} / {pivotResult.totalCount.toLocaleString()} 行 · 导出人: {currentUser.name}</p>
        </div>

        {/* Modular Header Bar */}
        <HeaderBar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          soundEngine={soundEngine}
          keynotePlaying={keynotePlaying}
          setKeynotePlaying={setKeynotePlaying}
          keynoteShotIdx={keynoteShotIdx}
          applyKeynoteShot={applyKeynoteShot}
          cinemaTheaterMode={cinemaTheaterMode}
          setCinemaTheaterMode={setCinemaTheaterMode}
          shotProgressPct={shotProgressPct}
          pivotResult={pivotResult}
          currentUser={currentUser}
          isReadOnly={isReadOnly}
          viewMode={viewMode}
          isPrintingReport={isPrintingReport}
          setShowAwardBadgeModal={setShowAwardBadgeModal}
          setShowCommandPalette={setShowCommandPalette}
          setCommandQuery={setCommandQuery}
          setShowTestSuiteModal={setShowTestSuiteModal}
          setActiveFormatModal={setActiveFormatModal}
          setShowWorkspaceModal={setShowWorkspaceModal}
          liveEngineTestResults={liveEngineTestResults}
          exportToExcelMerged={exportToExcelMerged}
          exportToCSV={exportToCSV}
          exportChartAsPNG={exportChartAsPNG}
          exportPDFReport={exportPDFReport}
          showToast={showToast}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
        />

        <div role="status" className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/65 dark:bg-[#272822]/75 text-[10px] text-[#75715E] dark:text-[#B8B5A8] apple-font-mono">
          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#66D9EF]" />
          <span className="truncate">数据来源：{currentDataset.id === RETAIL_TEST_DATASET.id ? '内置演示数据（非真实业务记录）' : currentDataset.id.startsWith('ds_100k_') ? '本地合成压测数据' : currentDataset.id.startsWith('ds_google_') ? 'Google Sheets 公开数据（导入时快照）' : '本地导入文件'} · {pivotResult.filteredCount.toLocaleString()} / {pivotResult.totalCount.toLocaleString()} 行 · 本地 JavaScript 计算</span>
        </div>

        {/* Bento KPI Cards Strip with Mini Sparklines */}
        {unifiedChartSpec.kpiCards.length > 0 && (
          <div className={`bg-[#F7F6F0] dark:bg-[#1E1F1C] px-3 sm:px-4 pt-3 pb-2 flex sm:grid sm:grid-cols-2 ${unifiedChartSpec.kpiCards.length === 3 ? "lg:grid-cols-3" : unifiedChartSpec.kpiCards.length >= 4 ? "lg:grid-cols-4" : ""} gap-2.5 shrink-0 overflow-x-auto`}>
            {unifiedChartSpec.kpiCards.map((kpi) => (
              <div key={kpi.id} className="min-w-[250px] sm:min-w-0 px-4 py-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] apple-specular-card flex items-center justify-between gap-3 hover:border-[#66D9EF]/60">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#75715E] dark:text-[#908E80] flex items-center gap-1.5 truncate apple-font-mono">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: kpi.color }} />
                    <span className="truncate">{kpi.title}</span>
                    {kpi.unit && <span className="px-1.5 py-0.2 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[#F92672] text-[10px] apple-font-mono shrink-0">{kpi.unit}</span>}
                  </div>
                  <div className="text-lg font-bold tracking-tight apple-font-mono text-[#272822] dark:text-[#F8F8F2] mt-0.5">{kpi.formattedCurrent}</div>
                  {kpi.comparison && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold apple-font-mono ${kpi.comparison.isPositive ? 'bg-[#A6E22E]/15 text-[#4A7500] dark:text-[#A6E22E] border border-[#A6E22E]/30' : 'bg-[#F92672]/15 text-[#F92672] border border-[#F92672]/30'}`}>
                        {kpi.comparison.pctFormatted}
                      </span>
                      <span className="text-[9px] text-[#75715E] dark:text-[#908E80] truncate max-w-[125px]" title={`较 ${kpi.comparison.baselineLabel}`}>
                        较 {kpi.comparison.baselineLabel}
                      </span>
                    </div>
                  )}
                </div>
                <MiniSparkline values={kpi.sparkValues} color={kpi.color} />
              </div>
            ))}
          </div>
        )}

        {/* Modular Field Shelf and Dropzone Shelf */}
        <FieldShelf
          cinemaTheaterMode={cinemaTheaterMode}
          isReadOnly={isReadOnly}
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          setActiveDatasetId={setActiveDatasetId}
          switchDataset={switchDataset}
          currentDataset={currentDataset}
          setHighlightedRowKey={setHighlightedRowKey}
          setHoveredCellTelemetry={setHoveredCellTelemetry}
          setPivotConfig={setPivotConfig}
          handleFileUpload={handleFileUpload}
          uploadProgress={uploadProgress}
          soundEngine={soundEngine}
          setActiveDataSourceModal={setActiveDataSourceModal}
          setUploadPreviewModal={setUploadPreviewModal}
          draggingPayload={draggingPayload}
          setDraggingPayload={setDraggingPayload}
          dragOverZone={dragOverZone}
          setDragOverZone={setDragOverZone}
          addFieldToZone={addFieldToZone}
          removeZoneItem={removeZoneItem}
          moveZoneItem={moveZoneItem}
          toggleDimensionSort={toggleDimensionSort}
          setHeaderFilterSearch={setHeaderFilterSearch}
          setActiveHeaderFilterModal={setActiveHeaderFilterModal}
          setBinFormState={setBinFormState}
          setActiveBinModal={setActiveBinModal}
          viewMode={viewMode}
          setViewMode={setViewMode}
          chartType={chartType}
          setChartType={setChartType}
          chartSpecConfig={chartSpecConfig}
          setChartSpecConfig={setChartSpecConfig}
          pivotConfig={pivotConfig}
          transposeRowsAndColumns={transposeRowsAndColumns}
          unifiedChartSpec={unifiedChartSpec}
          highlightedRowKey={highlightedRowKey}
          pivotResult={pivotResult}
          showToast={showToast}
        >
          {/* Main Work Content Area: Split Container with Table and Chart Studio */}
        <div
          ref={splitContainerRef}
          key={`${viewMode}_${chartType}_${keynoteShotIdx}`}
          className={`flex-1 flex flex-col lg:flex-row min-h-0 bg-[#F7F6F0] dark:bg-[#1E1F1C] p-2 sm:p-3 lg:p-4 gap-2 ${isPrintingReport ? 'overflow-visible flex-col min-h-0 h-auto' : 'overflow-hidden'}`}
        >
          {(viewMode !== 'chart' || isPrintingReport) && (
            <div
              style={{ "--split-table-basis": splitRatioPct + "%" }}
              className={`pivot-split-table bg-[#FFFDF7] dark:bg-[#272822] rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col min-h-0 overflow-hidden apple-transition ${viewMode === 'split' && !isPrintingReport ? 'min-w-0 min-h-[290px] lg:min-h-0 lg:min-w-[280px] flex-1 h-full' : 'w-full flex-1 h-full'} ${isPrintingReport ? 'overflow-visible h-auto' : ''}`}
            >
              <PivotTable
                pivotResult={pivotResult}
                pivotConfig={pivotConfig}
                setPivotConfig={setPivotConfig}
                chartSpecConfig={chartSpecConfig}
                condFormat={condFormat}
                darkMode={darkMode}
                isPrintingReport={isPrintingReport}
                isVirtualized={isVirtualized}
                visibleRowWindow={visibleRowWindow}
                tableContainerRef={tableContainerRef}
                setScrollTop={setScrollTop}
                toggleColCollapse={toggleColCollapse}
                toggleRowCollapse={toggleRowCollapse}
                toggleDimensionSort={toggleDimensionSort}
                cycleValueColSort={cycleValueColSort}
                highlightedRowKey={highlightedRowKey}
                hoveredCellTelemetry={hoveredCellTelemetry}
                setHoveredCellTelemetry={setHoveredCellTelemetry}
                handleChartPointClick={handleChartPointClick}
                setDrillSearch={setDrillSearch}
                setDrillPage={setDrillPage}
                setDrillDownModal={setDrillDownModal}
                soundEngine={soundEngine}
              />
            </div>
          )}

          {/* Interactive Draggable Split Handle */}
          {viewMode === 'split' && !isPrintingReport && (
            <div
              onMouseDown={() => setIsResizingSplit(true)}
              onDoubleClick={() => {
                soundEngine.playClick(600);
                setSplitRatioPct(58);
                showToast('已复位分栏比例为 58 : 42');
              }}
              role="separator" aria-label="调整表图宽度" aria-orientation="vertical" aria-valuemin={35} aria-valuemax={75} aria-valuenow={splitRatioPct} tabIndex={0}
              onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setSplitRatioPct((p) => Math.min(75, Math.max(35, p + (e.key === "ArrowRight" ? 5 : -5)))); } else if (e.key === "Home") { e.preventDefault(); setSplitRatioPct(58); } }}
              title="左右拖拽调整表图比例；方向键微调，Home 复位"
              className={`hidden lg:flex w-2.5 h-full rounded-full items-center justify-center cursor-col-resize select-none transition-colors shrink-0 group ${isResizingSplit ? 'bg-[#F92672]/30' : 'hover:bg-[#66D9EF]/20'}`}
            >
              <div className={`w-1 h-12 rounded-full transition-colors ${isResizingSplit ? 'bg-[#F92672]' : 'bg-[#D6D4C8] dark:bg-[#3E3D32] group-hover:bg-[#66D9EF]'}`} />
            </div>
          )}

          {(viewMode !== 'table' || isPrintingReport) && (
            <div
              id="pivot-chart-container"
              style={{ "--split-chart-basis": (100 - splitRatioPct) + "%" }}
              className={`pivot-split-chart bg-[#FFFDF7] dark:bg-[#272822] monokai-grid-canvas rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col min-h-0 p-4 apple-transition relative ${isChartFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : viewMode === 'split' && !isPrintingReport ? 'min-w-0 min-h-[290px] lg:min-h-0 lg:min-w-[280px] flex-1 h-full' : 'w-full flex-1 h-full'} ${isPrintingReport ? 'h-auto' : ''}`}
            >
              <ChartStudio
                chartType={chartType}
                setChartType={setChartType}
                unifiedChartSpec={unifiedChartSpec}
                pivotResult={pivotResult}
                chartSpecConfig={chartSpecConfig}
                setChartSpecConfig={setChartSpecConfig}
                darkMode={darkMode}
                isChartFullscreen={isChartFullscreen}
                setIsChartFullscreen={setIsChartFullscreen}
                showChartStudioPopover={showChartStudioPopover}
                setShowChartStudioPopover={setShowChartStudioPopover}
                highlightedRowKey={highlightedRowKey}
                handleChartPointClick={handleChartPointClick}
                setDrillDownModal={setDrillDownModal}
                setDrillSearch={setDrillSearch}
                setDrillPage={setDrillPage}
                applyKeynoteShot={applyKeynoteShot}
                keynoteShotIdx={keynoteShotIdx}
                soundEngine={soundEngine}
              />
            </div>
          )}
        </div>
      </FieldShelf>

      {/* Telemetry Status Bar */}
        <StatusBar
          hoveredCellTelemetry={hoveredCellTelemetry}
          unifiedChartSpec={unifiedChartSpec}
          splitRatioPct={splitRatioPct}
          pivotResult={pivotResult}
          duckdbThreshold={duckdbThreshold}
        />

        {/* Modals */}
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          commandQuery={commandQuery}
          setCommandQuery={setCommandQuery}
          commandActions={commandActions}
        />

        <DrillDownModal
          modalData={drillDownModal}
          currentDataset={currentDataset}
          drillSearch={drillSearch}
          setDrillSearch={setDrillSearch}
          drillPage={drillPage}
          setDrillPage={setDrillPage}
          onClose={() => setDrillDownModal(null)}
          showToast={showToast}
        />

        <UploadModal
          uploadPreviewModal={uploadPreviewModal}
          setUploadPreviewModal={setUploadPreviewModal}
          confirmUploadDataset={confirmUploadDataset}
          onClose={() => setUploadPreviewModal(null)}
        />

        <BinModal
          activeBinModal={activeBinModal}
          binFormState={binFormState}
          setBinFormState={setBinFormState}
          setPivotConfig={setPivotConfig}
          onClose={() => setActiveBinModal(null)}
          soundEngine={soundEngine}
          showToast={showToast}
        />

        <FilterModal
          activeHeaderFilterModal={activeHeaderFilterModal}
          pivotConfig={pivotConfig}
          setPivotConfig={setPivotConfig}
          currentDataset={currentDataset}
          headerFilterSearch={headerFilterSearch}
          setHeaderFilterSearch={setHeaderFilterSearch}
          onClose={() => setActiveHeaderFilterModal(null)}
        />

        <FormatModal
          isOpen={activeFormatModal}
          condFormat={condFormat}
          setCondFormat={setCondFormat}
          pivotConfig={pivotConfig}
          setPivotConfig={setPivotConfig}
          onClose={() => setActiveFormatModal(false)}
        />

        <DataSourceModal
          activeDataSourceModal={activeDataSourceModal}
          onClose={() => setActiveDataSourceModal(null)}
          gsheetAuthMode={gsheetAuthMode}
          setGsheetAuthMode={setGsheetAuthMode}
          gsheetUrlInput={gsheetUrlInput}
          setGsheetUrlInput={setGsheetUrlInput}
          gsheetOauthToken={gsheetOauthToken}
          setGsheetOauthToken={setGsheetOauthToken}
          sqlFormState={sqlFormState}
          setSqlFormState={setSqlFormState}
          duckdbThreshold={duckdbThreshold}
          currentDataset={currentDataset}
          pivotConfig={pivotConfig}
          setDatasets={setDatasets}
          setActiveDatasetId={setActiveDatasetId}
          setPivotConfig={setPivotConfig}
          generate100kDataset={generate100kDataset}
          copyTextToClipboard={copyTextToClipboard}
          soundEngine={soundEngine}
          showToast={showToast}
        />

        <TestSuiteModal
          isOpen={showTestSuiteModal}
          onClose={() => setShowTestSuiteModal(false)}
          liveEngineTestResults={liveEngineTestResults}
          isReadOnly={isReadOnly}
          setActiveDatasetId={setActiveDatasetId}
          setPivotConfig={setPivotConfig}
          soundEngine={soundEngine}
          showToast={showToast}
        />

        <WorkspaceModal
          isOpen={showWorkspaceModal}
          onClose={() => setShowWorkspaceModal(false)}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          savedWorkspaces={savedWorkspaces}
          setSavedWorkspaces={setSavedWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          newWorkspaceNameInput={newWorkspaceNameInput}
          setNewWorkspaceNameInput={setNewWorkspaceNameInput}
          shareTokenInput={shareTokenInput}
          setShareTokenInput={setShareTokenInput}
          isReadOnly={isReadOnly}
          activeDatasetId={activeDatasetId}
          datasets={datasets}
          setActiveDatasetId={setActiveDatasetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          chartType={chartType}
          setChartType={setChartType}
          condFormat={condFormat}
          setCondFormat={setCondFormat}
          chartSpecConfig={chartSpecConfig}
          setChartSpecConfig={setChartSpecConfig}
          pivotConfig={pivotConfig}
          setPivotConfig={setPivotConfig}
          applyShareTokenPayload={applyShareTokenPayload}
          copyTextToClipboard={copyTextToClipboard}
          showToast={showToast}
        />

        <SpecModal
          isOpen={showAwardBadgeModal}
          onClose={() => setShowAwardBadgeModal(false)}
        />
      </div>
    </div>
  );
}
