import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  RETAIL_TEST_DATASET,
  KEYNOTE_STORYBOARD_SHOTS,
  generateDynamicKeynoteShots,
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
import { calculateAutoFitColumnWidths } from '../../utils/tableAutoFit';

// Modular UI Components
import { HeaderBar } from './components/HeaderBar';
import { FieldShelf } from './components/FieldShelf';
import { PivotTable } from './components/PivotTable';
import { ChartStudio } from './components/ChartStudio';
import { StatusBar } from './components/StatusBar';
import { MiniSparkline } from './components/MiniSparkline';
import { IntroScreen } from './components/IntroScreen';
import { DatasetTabStrip } from './components/DatasetTabStrip';
import { ALL_BENCHMARK_PRESETS } from '../../constants/benchmarkDatasets';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keynotePlaying, setKeynotePlaying] = useState(false);
  const [keynoteShotIdx, setKeynoteShotIdx] = useState(0);
  const [cinemaTheaterMode, setCinemaTheaterMode] = useState(false);
  const [shotProgressPct, setShotProgressPct] = useState(0);

  const [splitRatioPct, setSplitRatioPct] = useState(50);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef(null);

  const [hoveredCellTelemetry, setHoveredCellTelemetry] = useState(null);

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [showChartStudioPopover, setShowChartStudioPopover] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);

  const [datasets, setDatasets] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('smoke') === 'true' || params.get('smoke') === '1' || params.get('demo') === 'retail') {
          return [RETAIL_TEST_DATASET];
        }
      }
    } catch {
      // fallback to empty
    }
    return [];
  });
  const [activeDatasetId, setActiveDatasetId] = useState(() => (datasets.length > 0 ? datasets[0].id : null));

  const currentDataset = useMemo(
    () => (activeDatasetId ? datasets.find((d) => d.id === activeDatasetId) : null) || datasets[0] || null,
    [datasets, activeDatasetId]
  );

  const [configHistory, setConfigHistory] = useState(() => [buildDefaultPivotConfig(datasets[0] || null)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  historyIndexRef.current = historyIndex;

  const pivotConfig = configHistory[historyIndex] || configHistory[0];

  const setPivotConfig = useCallback((updater) => {
    setConfigHistory((prevHistory) => {
      const curIdx = historyIndexRef.current;
      const currentConfig = prevHistory[curIdx] || prevHistory[prevHistory.length - 1];
      const nextConfig = typeof updater === 'function' ? updater(currentConfig) : updater;

      if (JSON.stringify(currentConfig) === JSON.stringify(nextConfig)) {
        return prevHistory;
      }

      const truncated = prevHistory.slice(0, curIdx + 1);
      const nextHistory = [...truncated, nextConfig];
      if (nextHistory.length > 30) {
        nextHistory.shift();
      }
      const nextIdx = nextHistory.length - 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      return nextHistory;
    });
  }, []);

  const [viewMode, setViewMode] = useState('split');
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

  const [tableSettings, setTableSettings] = useState({
    density: 'normal', // 'compact' (28px) | 'normal' (36px) | 'relaxed' (44px) | 'auto' (auto row height & wrap)
    dataAlignment: 'center', // 'center' (default) | 'left' | 'right'
    showZebra: true,
    wrapText: false,
    customColWidths: {},
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
  const [gsheetUrlInput, setGsheetUrlInput] = useState('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0');
  const [duckdbThreshold] = useState(50000);
  const [showTestSuiteModal, setShowTestSuiteModal] = useState(false);

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: 'usr_analyst_01', name: '张工 (BI分析师)', role: 'Admin' });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [newWorkspaceNameInput, setNewWorkspaceNameInput] = useState('');
  const [shareTokenInput, setShareTokenInput] = useState('');
  const [savedWorkspaces, setSavedWorkspaces] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('pivotstudio_workspaces_v1'));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < configHistory.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const nextIdx = historyIndexRef.current - 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      soundEngine?.playClick?.(500);
      showToast('已撤销 (Undo)');
    }
  }, [soundEngine, showToast]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < configHistory.length - 1) {
      const nextIdx = historyIndexRef.current + 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      soundEngine?.playClick?.(580);
      showToast('已重做 (Redo)');
    }
  }, [configHistory.length, soundEngine, showToast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const copyTextToClipboard = useCallback(async (text, successMsg = '已复制到剪贴板') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        try {
          ta.focus();
          ta.select();
          if (!document.execCommand('copy')) throw new Error('Clipboard API unavailable');
        } finally {
          ta.remove();
        }
      }
      showToast(successMsg);
      return true;
    } catch {
      showToast('复制失败，请检查浏览器剪贴板权限', 'error');
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    if (!isResizingSplit) return;
    const handleMouseMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;
      const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.max(20, Math.min(80, Math.round(rawPct)));
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

  const currentStoryShots = useMemo(
    () => generateDynamicKeynoteShots(currentDataset),
    [currentDataset]
  );

  const applyKeynoteShot = useCallback((shotIdx) => {
    const shots = currentStoryShots.length > 0 ? currentStoryShots : KEYNOTE_STORYBOARD_SHOTS;
    const normalizedIdx = (shotIdx + shots.length) % shots.length;
    const shot = shots[normalizedIdx];
    if (!shot) return;
    soundEngine.playTransitionChord();
    setKeynoteShotIdx(normalizedIdx);
    setShotProgressPct(0);
    setViewMode(shot.viewMode);
    setChartType(shot.chartType);

    setPivotConfig((prev) => ({
      ...prev,
      rows: shot.pivotOverride?.rows || [],
      columns: shot.pivotOverride?.columns || [],
      values: shot.pivotOverride?.values || [],
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
  }, [currentStoryShots]);

  const toggleFieldRole = useCallback((fieldName) => {
    setDatasets((prevDatasets) =>
      prevDatasets.map((ds) => {
        if (ds.id !== activeDatasetId) return ds;
        const nextFields = (ds.fields || []).map((f) => {
          if (f.name !== fieldName) return f;
          const currentIsMeasure = f.role ? f.role === 'measure' : f.type === 'number';
          const nextRole = currentIsMeasure ? 'dimension' : 'measure';
          showToast(`已将字段「${f.name}」分析角色切换为: ${nextRole === 'dimension' ? '维度 (分类/分组)' : '度量 (数值/聚合)'}`);
          return { ...f, role: nextRole };
        });
        return { ...ds, fields: nextFields };
      })
    );
  }, [activeDatasetId, showToast]);

  const switchDataset = useCallback((nextId, targetDataset = null) => {
    const nextDs = targetDataset || datasets.find((d) => d.id === nextId);
    if (!nextDs) return;
    setActiveDatasetId(nextId);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);

    const validFieldNames = new Set((nextDs.fields || []).map((f) => f.name));
    validFieldNames.add('__COUNT__');
    setPivotConfig((prev) => {
      const keepValid = (arr) => (arr || []).filter((it) => validFieldNames.has(it.field));
      let nextRows = keepValid(prev.rows);
      let nextCols = keepValid(prev.columns);
      let nextVals = keepValid(prev.values);
      let nextFilters = keepValid(prev.filters);

      if (nextRows.length === 0 && nextCols.length === 0) {
        const firstDim = nextDs.fields?.find((f) => f.role === 'dimension' || (!f.role && f.type !== 'number')) || nextDs.fields?.[0];
        if (firstDim) {
          nextRows = [{ id: `r_auto_${Date.now()}`, field: firstDim.name, sort: 'none', dateGranularity: 'raw', excludedValues: [] }];
        }
      }

      if (nextVals.length === 0) {
        const firstNum = nextDs.fields?.find((f) => f.role === 'measure' || (!f.role && f.type === 'number'));
        if (firstNum) {
          const isAvg = /rate|ratio|pct|score|age|temp|lat|cpu|率|比|分|度|龄/i.test(firstNum.name);
          nextVals = [{
            id: `v_auto_${Date.now()}`,
            field: firstNum.name,
            agg: isAvg ? 'avg' : 'sum',
            showAs: 'normal',
            format: {
              thousands: true,
              decimals: isAvg ? 1 : 0,
              currency: '',
              isPercent: /rate|ratio|pct|percent|率|比/i.test(firstNum.name),
            }
          }];
        } else {
          // 纯文本/问卷数据自适应注入通用计数
          nextVals = [{
            id: `v_auto_count_${Date.now()}`,
            field: '__COUNT__',
            agg: 'count',
            showAs: 'normal',
            format: { thousands: true, decimals: 0, currency: '', isPercent: false }
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
        setShowSpecModal(false);
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
        const shots = currentStoryShots.length > 0 ? currentStoryShots : KEYNOTE_STORYBOARD_SHOTS;
        const next = (prev + 1) % shots.length;
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

  // Web Worker async computation pipeline for large datasets with main-thread fallback
  const workerRef = useRef(null);
  const reqIdRef = useRef(0);
  const [isWorkerComputing, setIsWorkerComputing] = useState(false);
  const [activeResults, setActiveResults] = useState(() => {
    const initP = calculatePivot(null, buildDefaultPivotConfig(null));
    const initC = buildUnifiedChartSpec(null, initP, 'bar', {
      primaryValueId: '', secondaryValueId: '', sortMode: 'none', topN: 0,
      missingValueMode: 'zero', lineDerivedMetric: 'none', showDataLabels: true,
      showAvgReferenceLine: true, clickLinkMode: 'highlight', histogramBins: 0, stickyRowHeaders: true,
    });
    return { pivotResult: initP, unifiedChartSpec: initC };
  });

  const currentDatasetRef = useRef(currentDataset);
  const pivotConfigRef = useRef(pivotConfig);
  const chartTypeRef = useRef(chartType);
  const chartSpecConfigRef = useRef(chartSpecConfig);

  useEffect(() => {
    currentDatasetRef.current = currentDataset;
    pivotConfigRef.current = pivotConfig;
    chartTypeRef.current = chartType;
    chartSpecConfigRef.current = chartSpecConfig;
  }, [currentDataset, pivotConfig, chartType, chartSpecConfig]);

  useEffect(() => {
    let worker = null;
    try {
      worker = new Worker(new URL('./engine/pivotWorker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const { id, success, pivotResult: pRes, unifiedChartSpec: cSpec } = e.data || {};
        if (id === reqIdRef.current) {
          setIsWorkerComputing(false);
          if (success && pRes && cSpec) {
            pRes.cellRecordsMap = new Map();
            setActiveResults({ pivotResult: pRes, unifiedChartSpec: cSpec });
          } else {
            const fallbackP = calculatePivot(currentDatasetRef.current, pivotConfigRef.current);
            const fallbackC = buildUnifiedChartSpec(currentDatasetRef.current, fallbackP, chartTypeRef.current, chartSpecConfigRef.current);
            setActiveResults({ pivotResult: fallbackP, unifiedChartSpec: fallbackC });
          }
        }
      };
      worker.onerror = (err) => {
        console.warn('Pivot WebWorker execution error, falling back to main-thread:', err);
        setIsWorkerComputing(false);
        const fallbackP = calculatePivot(currentDatasetRef.current, pivotConfigRef.current);
        const fallbackC = buildUnifiedChartSpec(currentDatasetRef.current, fallbackP, chartTypeRef.current, chartSpecConfigRef.current);
        setActiveResults({ pivotResult: fallbackP, unifiedChartSpec: fallbackC });
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }
    return () => {
      if (worker) worker.terminate();
    };
  }, []);

  useEffect(() => {
    // Fast path for small datasets: calculate synchronously for immediate 0ms UI feedback
    if (!currentDataset?.rows || currentDataset.rows.length <= 2500) {
      setIsWorkerComputing(false);
      const pRes = calculatePivot(currentDataset, pivotConfig);
      const cSpec = buildUnifiedChartSpec(currentDataset, pRes, chartType, chartSpecConfig);
      setActiveResults({ pivotResult: pRes, unifiedChartSpec: cSpec });
      return;
    }

    // Heavy path (>2500 rows, e.g. 100K dataset): offload to Web Worker to keep UI thread 100% smooth
    const nextId = ++reqIdRef.current;
    if (workerRef.current) {
      setIsWorkerComputing(true);
      try {
        workerRef.current.postMessage({
          id: nextId,
          payload: { dataset: currentDataset, pivotConfig, chartType, chartSpecConfig },
        });
      } catch (postErr) {
        console.warn('postMessage to WebWorker failed, running on main-thread:', postErr);
        setIsWorkerComputing(false);
        const pRes = calculatePivot(currentDataset, pivotConfig);
        const cSpec = buildUnifiedChartSpec(currentDataset, pRes, chartType, chartSpecConfig);
        setActiveResults({ pivotResult: pRes, unifiedChartSpec: cSpec });
      }
    } else {
      setIsWorkerComputing(false);
      const pRes = calculatePivot(currentDataset, pivotConfig);
      const cSpec = buildUnifiedChartSpec(currentDataset, pRes, chartType, chartSpecConfig);
      setActiveResults({ pivotResult: pRes, unifiedChartSpec: cSpec });
    }
  }, [currentDataset, pivotConfig, chartType, chartSpecConfig]);

  const pivotResult = activeResults.pivotResult;
  const unifiedChartSpec = activeResults.unifiedChartSpec;

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
    if (!currentDataset) return;
    soundEngine.playClick(580);
    setPivotConfig((prev) => {
      const list = prev[zone] || [];
      const fMeta = currentDataset.fields?.find((f) => f.name === fieldName);

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
  }, [currentDataset?.fields, isReadOnly, showToast]);

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
      const fMeta = currentDataset?.fields?.find((f) => f.name === activeDim.field);
      const matchingRawVals = Array.from(
        new Set(
          (currentDataset?.rows || [])
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
    let file = null;
    if (e instanceof File) {
      file = e;
    } else if (e?.target?.files?.[0]) {
      file = e.target.files[0];
    } else if (e?.dataTransfer?.files?.[0]) {
      file = e.dataTransfer.files[0];
    }
    if (!file) return;
    if (file.size === 0) {
      showToast('上传的文件为空 (0 Bytes)，请检查文件内容', 'error');
      if (e?.target && 'value' in e.target) e.target.value = '';
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
            // Thresholds unified with csvParser.js (>= 0.7) for consistent type
            // inference regardless of whether the source file is CSV or Excel.
            let type = 'text';
            if (nonEmpty > 0) {
              if (boolCount / nonEmpty >= 0.7) type = 'boolean';
              else if (dateCount / nonEmpty >= 0.7) type = 'date';
              else if (numCount / nonEmpty >= 0.7) type = 'number';
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
        if (e?.target && 'value' in e.target) e.target.value = '';
        return;
      }

      // 2. CSV / TSV / 文本表格文件
      const chunkSize = 64 * 1024;
      const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
      let accumulatedText = '';
      const decoder = new TextDecoder('utf-8', { fatal: true });
      for (let idx = 0; idx < totalChunks; idx++) {
        setUploadProgress({
          fileName: file.name,
          currentChunk: idx + 1,
          totalChunks,
          pct: Math.round(((idx + 1) / totalChunks) * 100),
        });
        const slice = file.slice(idx * chunkSize, (idx + 1) * chunkSize);
        const buffer = await slice.arrayBuffer();
        accumulatedText += decoder.decode(buffer, { stream: true });
      }
      accumulatedText += decoder.decode();
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
    if (e?.target && 'value' in e.target) e.target.value = '';
  }, [showToast]);

  const confirmUploadDataset = useCallback((autoInitPivot = true) => {
    if (!uploadPreviewModal) return;
    const activeIdx = uploadPreviewModal.activeSheetIdx ?? 0;
    const sheet = uploadPreviewModal.sheets[activeIdx] || uploadPreviewModal.sheets[0];
    const sheetSuffix = uploadPreviewModal.sheets.length > 1 ? ` - ${sheet.name || ('Sheet ' + (activeIdx + 1))}` : '';
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
      name: `${uploadPreviewModal.fileName}${sheetSuffix} (${normalizedRows.length}行)`,
      fields: sheet.fields,
      rows: normalizedRows,
    };
    setDatasets((prev) => [...prev, newDs]);
    setActiveDatasetId(newDs.id);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);

    if (autoInitPivot) {
      setPivotConfig(buildDefaultPivotConfig(newDs));
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

  const loadPresetDataset = useCallback((preset) => {
    if (!preset) return;
    setDatasets((prev) => {
      const exists = prev.find((d) => d.id === preset.id);
      if (exists) return prev;
      return [...prev, preset];
    });
    switchDataset(preset.id, preset);
    setPivotConfig(buildDefaultPivotConfig(preset));
    soundEngine?.playTransitionChord?.();
    showToast(`已加载测试集「${preset.name}」`);
  }, [switchDataset, showToast]);

  const loadRetailDataset = useCallback(() => {
    setDatasets((prev) => {
      const exists = prev.find((d) => d.id === RETAIL_TEST_DATASET.id);
      if (exists) return prev;
      return [RETAIL_TEST_DATASET, ...prev];
    });
    switchDataset(RETAIL_TEST_DATASET.id, RETAIL_TEST_DATASET);
    setPivotConfig(buildDefaultPivotConfig(RETAIL_TEST_DATASET));
    soundEngine?.playTransitionChord();
    showToast('已加载全渠道零售经营测试集 (33行)');
  }, [switchDataset, showToast]);

  const unloadDataset = useCallback((id) => {
    setDatasets((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (id === activeDatasetId) {
        const nextActive = next.length > 0 ? next[0].id : null;
        setActiveDatasetId(nextActive);
        if (next.length === 0) {
          setPivotConfig(buildDefaultPivotConfig(null));
        } else {
          switchDataset(nextActive, next[0]);
        }
      }
      return next;
    });
    soundEngine?.playClick?.(440);
    showToast('已卸载指定数据集');
  }, [activeDatasetId, switchDataset, showToast]);

  const unloadCurrentDataset = useCallback(() => {
    unloadDataset(activeDatasetId);
  }, [activeDatasetId, unloadDataset]);

  const handlePasteText = useCallback((text) => {
    if (!text || !text.trim()) return;
    try {
      const sheet = parseCSVTextToSheet(text, '剪贴板数据');
      if (!sheet || sheet.rows.length === 0) {
        showToast('未能从粘贴内容中识别出有效表格行', 'error');
        return;
      }
      setUploadPreviewModal({
        fileName: 'Clipboard_Data.csv',
        activeSheetIdx: 0,
        sheets: [sheet],
      });
    } catch (err) {
      showToast(`解析失败: ${err.message}`, 'error');
    }
  }, [showToast]);

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
      if (decoded.fullConfig) setPivotConfig(decoded.fullConfig);
      if (decoded.cf) setCondFormat(decoded.cf);
      if (decoded.csc) setChartSpecConfig((p) => ({ ...p, ...decoded.csc }));
      if (decoded.vm) setViewMode(decoded.vm);
      if (decoded.ct) setChartType(decoded.ct);
      if (decoded.ts) setTableSettings((p) => ({ ...p, ...decoded.ts }));
      showToast('已从 Share Token 成功还原透视工作台视图！');
      return true;
    } catch {
      showToast('Share Token 格式无效，无法解析还原', 'error');
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('share_token');
    if (token) applyShareTokenPayload(token);
  }, [applyShareTokenPayload]);

  // Spotlight Command Palette Actions
  const commandActions = useMemo(() => {
    const list = [
      { id: 'cmd_undo', category: '历史与操作', label: '撤销上一步透视配置修改 (Undo)', shortcut: '⌘Z', run: undo },
      { id: 'cmd_redo', category: '历史与操作', label: '重做下一步透视配置修改 (Redo)', shortcut: '⌘Y', run: redo },
      { id: 'cmd_keynote', category: 'Keynote 叙事分镜', label: keynotePlaying ? '暂停 96 BPM Keynote 自动运镜' : '启动 96 BPM Apple Keynote 自动运镜', shortcut: 'Space', run: () => { setKeynotePlaying((p) => !p); } },
      { id: 'cmd_theater', category: 'Keynote 叙事分镜', label: cinemaTheaterMode ? '退出剧院全屏舞台模式' : '进入剧院全屏舞台模式 (隐藏侧栏)', shortcut: 'T', run: () => { setCinemaTheaterMode((p) => !p); } },
      { id: 'cmd_transpose', category: '矩阵与结构操作', label: '一键执行透视矩阵「行列互换 (Transpose)」', shortcut: 'R', run: transposeRowsAndColumns },
      ...(currentStoryShots.length > 0 ? currentStoryShots : KEYNOTE_STORYBOARD_SHOTS).map((s, idx) => ({
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
      { id: 'cmd_autofit_cols', category: '透视表排版与对齐', label: '透视表：一键自动优化调整行高与列宽 (Auto-Fit)', shortcut: 'Fit', run: () => { const newWidths = calculateAutoFitColumnWidths(pivotResult, tableSettings.customColWidths); setTableSettings((p) => ({ ...p, customColWidths: newWidths })); showToast('已自动计算并自适应优化全部行高与列宽'); } },
      { id: 'cmd_align_center', category: '透视表排版与对齐', label: '透视表：设置数据与表头居中对齐 (Centered 默认)', shortcut: 'Align', run: () => { setTableSettings((p) => ({ ...p, dataAlignment: 'center' })); showToast('数据已设置为居中对齐'); } },
      { id: 'cmd_align_left', category: '透视表排版与对齐', label: '透视表：设置数据靠左对齐 (Left)', shortcut: 'Left', run: () => { setTableSettings((p) => ({ ...p, dataAlignment: 'left' })); showToast('数据已设置为靠左对齐'); } },
      { id: 'cmd_align_right', category: '透视表排版与对齐', label: '透视表：设置数据靠右对齐 (Right)', shortcut: 'Right', run: () => { setTableSettings((p) => ({ ...p, dataAlignment: 'right' })); showToast('数据已设置为靠右对齐'); } },
      { id: 'cmd_density_compact', category: '透视表排版与对齐', label: '透视表行高：切换为紧凑规格 (28px)', shortcut: 'Dense', run: () => { setTableSettings((p) => ({ ...p, density: 'compact', wrapText: false })); showToast('行高已切换为紧凑规格 (28px)'); } },
      { id: 'cmd_density_normal', category: '透视表排版与对齐', label: '透视表行高：切换为标准规格 (36px)', shortcut: 'Normal', run: () => { setTableSettings((p) => ({ ...p, density: 'normal', wrapText: false })); showToast('行高已切换为标准规格 (36px)'); } },
      { id: 'cmd_density_relaxed', category: '透视表排版与对齐', label: '透视表行高：切换为宽松规格 (44px)', shortcut: 'Spacious', run: () => { setTableSettings((p) => ({ ...p, density: 'relaxed', wrapText: false })); showToast('行高已切换为宽松规格 (44px)'); } },
      { id: 'cmd_density_auto', category: '透视表排版与对齐', label: '透视表行高：启用自适应换行 (随内容展开行高)', shortcut: 'Wrap', run: () => { setTableSettings((p) => ({ ...p, density: 'auto', wrapText: true })); showToast('已启用自适应换行与动态行高'); } },
      { id: 'cmd_toggle_zebra', category: '透视表排版与对齐', label: '透视表：切换隔行轻柔斑马纹', shortcut: 'Zebra', run: () => { setTableSettings((p) => ({ ...p, showZebra: !p.showZebra })); showToast('已切换斑马纹显示'); } },
    ];
    if (!commandQuery.trim()) return list;
    const q = commandQuery.toLowerCase();
    return list.filter((item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [keynotePlaying, cinemaTheaterMode, transposeRowsAndColumns, applyKeynoteShot, viewMode, generate100kDataset, darkMode, exportToExcelMerged, exportToCSV, commandQuery, pivotResult, tableSettings, showToast]);

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

  const rowHeightMap = { compact: 28, normal: 36, relaxed: 44, auto: 44 };
  const currentDensity = tableSettings.density || 'normal';
  const ROW_HEIGHT = rowHeightMap[currentDensity] || 36;
  const isVirtualized = pivotResult.tableRows.length > 80 && !isPrintingReport && currentDensity !== 'auto' && !tableSettings.wrapText;

  const visibleRowWindow = useMemo(() => {
    if (!isVirtualized) {
      return { startIndex: 0, endIndex: pivotResult.tableRows.length, topPadding: 0, bottomPadding: 0, rows: pivotResult.tableRows };
    }
    const viewportHeight = tableContainerRef.current?.clientHeight || 560;
    const startIdx = Math.min(Math.max(0, pivotResult.tableRows.length - 1), Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8));
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
      <div className={`min-h-[100dvh] h-auto md:h-[100dvh] bg-[#F7F6F0] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2] text-[11px] leading-relaxed antialiased tabular-nums flex flex-col apple-font-sans print:bg-white print:text-black apple-transition ${isPrintingReport ? 'overflow-visible' : 'overflow-x-hidden md:overflow-hidden'}`}>
        <div className="hidden print:block px-6 py-4 border-b border-black/15">
          <h1 className="text-base font-semibold tracking-tight text-black">PivotEngine Studio [Monokai Pro] 数据透视分析报告 — {currentDataset?.name || '空白工程'}</h1>
          <p className="text-[11px] text-[#75715E] mt-1">导出时间: {new Date().toLocaleString('zh-CN')} · 有效记录: {pivotResult.filteredCount.toLocaleString()} / {pivotResult.totalCount.toLocaleString()} 行 · 导出人: {currentUser.name}</p>
        </div>

        {/* Modular Header Bar */}
        <HeaderBar
          canUndo={canUndo}
          canRedo={canRedo}
          undo={undo}
          redo={redo}
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
          setShowSpecModal={setShowSpecModal}
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

        {/* Workspace Dataset Tab Strip */}
        <DatasetTabStrip
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          switchDataset={switchDataset}
          unloadDataset={unloadDataset}
          onOpenIntro={() => setActiveDatasetId(null)}
          pivotResult={pivotResult}
          isWorkerComputing={isWorkerComputing}
          soundEngine={soundEngine}
        />

        <div role="status" className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/65 dark:bg-[#272822]/75 text-[10px] text-[#75715E] dark:text-[#B8B5A8] apple-font-mono">
          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#66D9EF]" />
          <span className="truncate">数据来源：{!currentDataset ? '未载入数据集 · 等待输入以开启透视分析 · 本地 JavaScript 极速计算引擎就绪' : currentDataset.id === RETAIL_TEST_DATASET?.id ? '内置演示数据（非真实业务记录）' : currentDataset.id.startsWith('ds_100k_') ? '本地合成压测数据' : currentDataset.id.startsWith('ds_google_') ? 'Google Sheets 公开数据（导入时快照）' : '本地导入文件'} · {(pivotResult?.filteredCount || 0).toLocaleString()} / {(pivotResult?.totalCount || 0).toLocaleString()} 行 · 本地 JavaScript 计算</span>
        </div>

        {/* Bento KPI Cards Strip with Mini Sparklines */}
        {currentDataset && unifiedChartSpec.kpiCards.length > 0 && (
          <div className="bg-[#F7F6F0] dark:bg-[#1E1F1C] px-4 pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
            {unifiedChartSpec.kpiCards.map((kpi) => (
              <div key={kpi.id} className="px-4 py-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] apple-specular-card flex items-center justify-between gap-3 apple-transition hover:border-[#66D9EF]/60">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#75715E] dark:text-[#908E80] flex items-center gap-1.5 truncate apple-font-mono">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: kpi.color }} />
                    <span className="truncate">{kpi.title}</span>
                    {kpi.unit && <span className="px-1.5 py-0.2 rounded bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[#F92672] text-[10px] apple-font-mono shrink-0">{kpi.unit}</span>}
                  </div>
                  <div className="text-base font-bold tracking-tight apple-font-mono text-[#272822] dark:text-[#F8F8F2] mt-0.5">{kpi.formattedCurrent}</div>
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

        {!currentDataset ? (
          <IntroScreen
            onUploadFile={handleFileUpload}
            onLoadPresetDataset={loadPresetDataset}
            onLoadRetailDataset={loadRetailDataset}
            onGenerate100kDataset={generate100kDataset}
            onOpenTestSuite={() => setShowTestSuiteModal(true)}
            onPasteText={handlePasteText}
            uploadProgress={uploadProgress}
            soundEngine={soundEngine}
            showToast={showToast}
            isReadOnly={isReadOnly}
          />
        ) : (
          <>
            {/* Modular Field Shelf and Dropzone Shelf */}
            <FieldShelf
              cinemaTheaterMode={cinemaTheaterMode}
              isReadOnly={isReadOnly}
              datasets={datasets}
              activeDatasetId={activeDatasetId}
              setActiveDatasetId={setActiveDatasetId}
              switchDataset={switchDataset}
              unloadCurrentDataset={unloadCurrentDataset}
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
          toggleFieldRole={toggleFieldRole}
          setCondFormat={setCondFormat}
        >
          {/* 字段有效性自愈横幅: 当配置中遗留失效字段时提醒用户并提供一键重置 */}
          {pivotResult?.sanitizedInfo?.hasInvalidFields && (
            <div className="mx-2.5 sm:mx-4 mb-2 p-2.5 rounded-xl bg-[#FD971F]/15 border border-[#FD971F]/40 flex flex-wrap items-center justify-between gap-2 text-xs apple-font-mono text-[#C86400] dark:text-[#FD971F] animate-apple-modal shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold">⚠️ 配置自愈提示:</span>
                <span>
                  检测到当前数据集中不存在的失效字段
                  {pivotResult.sanitizedInfo.ignoredFilters.length > 0 && ` [筛选: ${pivotResult.sanitizedInfo.ignoredFilters.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredRows.length > 0 && ` [行: ${pivotResult.sanitizedInfo.ignoredRows.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredCols.length > 0 && ` [列: ${pivotResult.sanitizedInfo.ignoredCols.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredVals.length > 0 && ` [指标: ${pivotResult.sanitizedInfo.ignoredVals.join(', ')}]`}
                  ，已自动安全脱落以保障计算。
                </span>
              </div>
              <button
                onClick={() => {
                  soundEngine?.playClick(520);
                  setPivotConfig(buildDefaultPivotConfig(currentDataset));
                  showToast('已重置为当前数据集的推荐默认透视配置');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#FD971F] text-[#1E1F1C] font-bold text-[10px] shrink-0 hover:opacity-90 transition"
              >
                一键重置为默认透视
              </button>
            </div>
          )}

          {/* Main Work Content Area: Split Container with Table and Chart Studio */}
        <div
          ref={splitContainerRef}
          
          className={`flex-1 flex flex-col min-h-[480px] bg-[#F7F6F0] dark:bg-[#1E1F1C] p-2.5 sm:p-4 gap-2 animate-apple-stage ${isPrintingReport ? 'overflow-visible h-auto' : 'overflow-hidden'}`}
        >
          {(viewMode !== 'chart' || isPrintingReport) && (
            <div
              style={{
                ...(viewMode === 'split' && !isPrintingReport ? { flexBasis: `${splitRatioPct}%` } : {}),
              }}
              className={`bg-[#FFFDF7] dark:bg-[#272822] rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col w-full min-h-0 overflow-hidden apple-transition ${viewMode === 'split' && !isPrintingReport ? 'flex-1' : 'flex-1'} ${isPrintingReport ? 'overflow-visible h-auto' : ''}`}
            >
              <PivotTable
                pivotResult={pivotResult}
                pivotConfig={pivotConfig}
                setPivotConfig={setPivotConfig}
                chartSpecConfig={chartSpecConfig}
                condFormat={condFormat}
                setCondFormat={setCondFormat}
                currentDataset={currentDataset}
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
                tableSettings={tableSettings}
                setTableSettings={setTableSettings}
                viewMode={viewMode}
                setViewMode={setViewMode}
                copyTextToClipboard={copyTextToClipboard}
                showToast={showToast}
              />
            </div>
          )}

          {/* Interactive Draggable Split Handle (Horizontal Row-Resize for Vertical Stacking) */}
          {viewMode === 'split' && !isPrintingReport && (
            <div
              id="split-resizer"
              role="separator"
              aria-label="调整透视表与图表上下高度"
              aria-orientation="horizontal"
              aria-valuemin={20}
              aria-valuemax={80}
              aria-valuenow={splitRatioPct}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setSplitRatioPct((pct) => Math.max(20, Math.min(80, pct + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 5 : -5))));
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  setSplitRatioPct(20);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  setSplitRatioPct(80);
                }
              }}
              onMouseDown={() => setIsResizingSplit(true)}
              onDoubleClick={() => {
                soundEngine.playClick(600);
                setSplitRatioPct(50);
                showToast('已复位表图高度比例为 50 : 50');
              }}
              title="上下拖拽无级调节表图高度 · 双击复位 (50:50)"
              className={`flex w-full h-2.5 rounded-full items-center justify-center cursor-row-resize focus-visible:ring-2 focus-visible:ring-[#66D9EF] select-none transition-colors shrink-0 group ${isResizingSplit ? 'bg-[#F92672]/30' : 'hover:bg-[#66D9EF]/20'}`}
            >
              <div className={`h-1 w-12 rounded-full transition-colors ${isResizingSplit ? 'bg-[#F92672]' : 'bg-[#D6D4C8] dark:bg-[#3E3D32] group-hover:bg-[#66D9EF]'}`} />
            </div>
          )}

          {(viewMode !== 'table' || isPrintingReport) && (
            <div
              id="pivot-chart-container"
              style={{
                ...(viewMode === 'split' && !isPrintingReport ? { flexBasis: `${100 - splitRatioPct}%` } : {}),
              }}
              className={`bg-[#FFFDF7] dark:bg-[#272822] rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col w-full min-h-0 p-4 apple-transition relative ${isChartFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : viewMode === 'split' && !isPrintingReport ? 'flex-1' : 'flex-1'} ${isPrintingReport ? 'h-auto' : ''}`}
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
        isWorkerComputing={isWorkerComputing}
      />
      </>
    )}

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
          tableSettings={tableSettings}
          setTableSettings={setTableSettings}
          onClose={() => setActiveFormatModal(false)}
        />

        <DataSourceModal
          activeDataSourceModal={activeDataSourceModal}
          onClose={() => setActiveDataSourceModal(null)}
          gsheetUrlInput={gsheetUrlInput}
          setGsheetUrlInput={setGsheetUrlInput}
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
          setDatasets={setDatasets}
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
          tableSettings={tableSettings}
          setTableSettings={setTableSettings}
          applyShareTokenPayload={applyShareTokenPayload}
          copyTextToClipboard={copyTextToClipboard}
          showToast={showToast}
        />

        <SpecModal
          isOpen={showSpecModal}
          onClose={() => setShowSpecModal(false)}
        />
      </div>
    </div>
  );
}
