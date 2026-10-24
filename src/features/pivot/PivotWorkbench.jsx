import { t, getLocale, setLocale } from '../../i18n.js';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  RETAIL_TEST_DATASET,
  KEYNOTE_STORYBOARD_SHOTS,
  generateDynamicKeynoteShots,
  VISUAL_CHART_TYPES,
  buildDefaultPivotConfig
} from '../../constants/pivotConstants';
import { soundEngine } from '../../services/soundEngine';
import { decodeView, projectView } from '../../utils/viewConfig';
import { startImportTask } from '../../utils/workerTask';
import { getMeasureDefaults, isMeasureField } from '../../utils/fieldSemantics.js';
import { decodeGroupPath } from '../../utils/groupKeys.js';
import { hasOpenDialog } from '../../utils/useDialogFocus.js';
import {
  exportToCSV as doExportCSV,
  exportToExcelMerged as doExportExcel,
  exportChartAsPNG as doExportPNG,
  exportChartAsSVG as doExportSVG,
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
import { ChartFrame } from './components/ChartFrame';
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
import { WorkspaceModal } from './components/modals/WorkspaceModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';

export default function PivotWorkbench() {
  const [locale, setLocaleState] = useState(getLocale);
  useEffect(() => { document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'; }, [locale]);
  const [theme, setTheme] = useState(() => { try { return ['light','dark','system'].includes(localStorage.getItem('pivotstudio_theme')) ? localStorage.getItem('pivotstudio_theme') : 'system'; } catch { return 'system'; } });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const darkMode = theme === 'system' ? systemDark : theme === 'dark';
  const setDarkMode = useCallback((value) => setTheme((previous) => {
    const current = previous === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : previous === 'dark';
    return (typeof value === 'function' ? value(current) : value) ? 'dark' : 'light';
  }), []);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) => setSystemDark(event.matches);
    query.addEventListener('change',update);
    update(query);
    return () => query.removeEventListener('change',update);
  }, []);
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

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
    () => (activeDatasetId ? datasets.find((d) => d.id === activeDatasetId) : null) || null,
    [datasets, activeDatasetId]
  );

  const [configHistory, setConfigHistory] = useState(() => [buildDefaultPivotConfig(datasets[0] || null)]);
  const readOnlyRef = useRef(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  historyIndexRef.current = historyIndex;

  const pivotConfig = configHistory[historyIndex] || configHistory[0];
  const datasetHistoriesRef = useRef(new Map());
  useEffect(() => {
    if (currentDataset) datasetHistoriesRef.current.set(currentDataset.id, {history:configHistory,index:historyIndex});
  }, [currentDataset,configHistory,historyIndex]);
  const replacePivotConfig = useCallback(config => {
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setConfigHistory([config]);
  }, []);

  const setPivotConfig = useCallback((updater) => {
    if (readOnlyRef.current) return;
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
    missingValueMode: 'connect',
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
    density: 'compact', // 'compact' (28px, default) | 'normal' (36px) | 'relaxed' (44px) | 'auto' (auto row height & wrap)
    colWidthMode: 'equal', // 'equal' (均分, default) | 'autofit' (自适应列宽) | 'custom'
    dataAlignment: 'center', // 'center' (default) | 'left' | 'right'
    showZebra: true,
    wrapText: false,
    showExtremes: true,
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

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: 'usr_analyst_01', name: '张工 (BI分析师)', role: 'Admin' });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [newWorkspaceNameInput, setNewWorkspaceNameInput] = useState('');
  const pendingViewRef = useRef(null);
  const [shareTokenInput, setShareTokenInput] = useState('');
  const workspaceLoadErrorRef = useRef(null);
  const [savedWorkspaces, setSavedWorkspaces] = useState(() => {
    try {
      const raw = window.localStorage.getItem('pivotstudio_workspaces_v1');
      if (!raw) return [];
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved) || !saved.every((view) => view && typeof view.id === 'string' && typeof view.name === 'string' && view.pivotConfig)) throw new Error('配置损坏');
      saved.forEach((view) => projectView({ fullConfig:view.pivotConfig }));
      return saved;
    } catch {
      workspaceLoadErrorRef.current = '本机视图无法读取，可能存储受限或配置损坏；请检查浏览器存储权限，或重新保存视图';
      return [];
    }
  });


  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  const lastChartClickRef = useRef(0);
  const tableContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const isReadOnly = currentUser.role === 'Viewer';
  readOnlyRef.current = isReadOnly;

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  const showToast = useCallback((text, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ text, type });
    if (type !== 'error') toastTimerRef.current = setTimeout(() => { setToastMessage(null); }, 3200);
  }, []);

  useEffect(() => {
    if (workspaceLoadErrorRef.current) {
      showToast(workspaceLoadErrorRef.current,'error');
      // Preserve the invalid value until a subsequent save, then allow recovery.
      workspaceLoadErrorRef.current = null;
      return;
    }
    try { localStorage.setItem('pivotstudio_workspaces_v1',JSON.stringify(savedWorkspaces)); }
    catch { showToast('本机存储不足或不可用，视图仅在当前标签页有效；请释放存储空间后重新保存','error'); }
  }, [savedWorkspaces,showToast]);

  useEffect(() => {
    const handleAsyncError = (event) => showToast(`操作失败：${event.reason?.message || event.error?.message || '浏览器执行异常'}；请重试，必要时重新导入文件`, 'error');
    window.addEventListener('unhandledrejection',handleAsyncError);
    window.addEventListener('error',handleAsyncError);
    return () => { window.removeEventListener('unhandledrejection',handleAsyncError); window.removeEventListener('error',handleAsyncError); };
  }, [showToast]);

  useEffect(() => { try { localStorage.setItem('pivotstudio_theme',theme); } catch { showToast('无法保存主题偏好，当前标签页内仍有效；请检查浏览器存储权限','error'); } }, [theme,showToast]);

  const canUndo = !isReadOnly && historyIndex > 0;
  const canRedo = !isReadOnly && historyIndex < configHistory.length - 1;

  const undo = useCallback(() => {
    if (readOnlyRef.current) return;
    if (historyIndexRef.current > 0) {
      const nextIdx = historyIndexRef.current - 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      soundEngine?.playClick?.(500);
      showToast('已撤销 (Undo)');
    }
  }, [soundEngine, showToast]);

  const redo = useCallback(() => {
    if (readOnlyRef.current) return;
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
      if (hasOpenDialog()) return;
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

  const switchDataset = useCallback((nextId, targetDataset = null) => {
    const nextDs = targetDataset || datasets.find((d) => d.id === nextId);
    if (!nextDs) return;
    setActiveDatasetId(nextId);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);
    setKeynoteShotIdx(0);

    const saved = datasetHistoriesRef.current.get(nextDs.id);
    if (saved) {
      historyIndexRef.current = saved.index;
      setHistoryIndex(saved.index);
      setConfigHistory(saved.history);
    } else replacePivotConfig(buildDefaultPivotConfig(nextDs));

    setChartSpecConfig((prev) => ({
      ...prev,
      primaryValueId: '',
      secondaryValueId: '',
    }));
  }, [datasets, replacePivotConfig]);

  const loadRetailDataset = useCallback(() => {
    setDatasets((prev) => {
      const exists = prev.find((d) => d.id === RETAIL_TEST_DATASET.id);
      if (exists) return prev;
      return [RETAIL_TEST_DATASET, ...prev];
    });
    switchDataset(RETAIL_TEST_DATASET.id, RETAIL_TEST_DATASET);
    soundEngine?.playTransitionChord();
    showToast('已加载全渠道零售经营测试集 (33行)');
  }, [switchDataset, showToast]);

  const currentStoryShots = useMemo(
    () => generateDynamicKeynoteShots(currentDataset),
    [currentDataset]
  );

  const [customStoryShotsByDataset, setCustomStoryShotsByDataset] = useState({});

  const effectiveStoryShots = useMemo(() => {
    if (activeDatasetId && customStoryShotsByDataset[activeDatasetId]) {
      return customStoryShotsByDataset[activeDatasetId];
    }
    return currentStoryShots;
  }, [activeDatasetId, customStoryShotsByDataset, currentStoryShots]);

  const applyKeynoteShot = useCallback((shotIdx, shotList = effectiveStoryShots) => {
    if (readOnlyRef.current) return;
    if (!currentDataset) {
      loadRetailDataset();
    }
    const shots = shotList.length > 0 ? shotList : KEYNOTE_STORYBOARD_SHOTS;
    const normalizedIdx = (shotIdx + shots.length) % shots.length;
    const shot = shots[normalizedIdx];
    if (!shot) return;
    soundEngine.playTransitionChord();
    setKeynoteShotIdx(normalizedIdx);
    setShotProgressPct(0);
    setViewMode((prevMode) => (prevMode === 'chart' ? 'chart' : shot.viewMode));
    setChartType(shot.chartType);

    setPivotConfig((prev) => ({
      ...prev,
      rows: shot.pivotOverride?.rows || [],
      columns: shot.pivotOverride?.columns || [],
      values: shot.pivotOverride?.values || [],
      collapsedRowKeys: {},
      collapsedColKeys: {},
    }));
  }, [effectiveStoryShots, currentDataset, loadRetailDataset]);

  const toggleFieldRole = useCallback((fieldName) => {
    if (isReadOnly) return;
    setDatasets((prevDatasets) =>
      prevDatasets.map((ds) => {
        if (ds.id !== activeDatasetId) return ds;
        const nextFields = (ds.fields || []).map((f) => {
          if (f.name !== fieldName) return f;
          const currentIsMeasure = isMeasureField(f);
          const nextRole = currentIsMeasure ? 'dimension' : 'measure';
          showToast(`已将字段「${f.name}」分析角色切换为: ${nextRole === 'dimension' ? '维度 (分类/分组)' : '度量 (数值/聚合)'}`);
          return { ...f, role: nextRole };
        });
        return { ...ds, fields: nextFields };
      })
    );
  }, [activeDatasetId, showToast, isReadOnly]);

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
      if (hasOpenDialog()) return;
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
      if (!isTyping && !e.metaKey && !e.ctrlKey && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        soundEngine?.playPop?.();
        setShowShortcutsModal((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowChartStudioPopover(false);
        setShowSpecModal(false);
        setShowShortcutsModal(false);
        setDrillDownModal(null);
        setUploadPreviewModal(null);
        setActiveHeaderFilterModal(null);
        setActiveBinModal(null);
        setActiveFormatModal(false);
        setActiveDataSourceModal(null);
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
        const shots = effectiveStoryShots.length > 0 ? effectiveStoryShots : KEYNOTE_STORYBOARD_SHOTS;
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
  }, [keynotePlaying, applyKeynoteShot, effectiveStoryShots]);

  const workerRef = useRef(null);
  const profileRequestsRef = useRef(new Map());
  const profileIdRef = useRef(0);
  const importTaskRef = useRef(null);
  const importSourceRef = useRef(null);
  const reqIdRef = useRef(0);
  const [computeError, setComputeError] = useState(null);
  const [computeAttempt, setComputeAttempt] = useState(0);
  const [computeProgress, setComputeProgress] = useState(0);
  const [isWorkerComputing, setIsWorkerComputing] = useState(false);
  const [activeResults, setActiveResults] = useState(() => {
    const pivotResult = calculatePivot(null, buildDefaultPivotConfig(null));
    return { pivotResult, unifiedChartSpec: buildUnifiedChartSpec(null, pivotResult, 'bar', {}) };
  });
  const cachedDatasetRef = useRef(null);
  const busyRef = useRef(false);

  const stopCalculation = useCallback(() => {
    ++reqIdRef.current;
    for (const request of profileRequestsRef.current.values()) request.reject(new DOMException('已取消','AbortError'));
    profileRequestsRef.current.clear();
    workerRef.current?.terminate();
    workerRef.current = null;
    cachedDatasetRef.current = null;
    busyRef.current = false;
    setIsWorkerComputing(false);
  }, []);

  useEffect(() => {
    // Superseded work is stopped immediately rather than queued behind a stale request.
    if (busyRef.current) stopCalculation();
    const id = ++reqIdRef.current;
    setIsWorkerComputing(true);
    setComputeProgress(0);
    setComputeError(null);
    busyRef.current = true;
    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./engine/pivotWorker.js', import.meta.url), { type: 'module' });
      }
      const worker = workerRef.current;
      worker.onmessage = ({ data }) => {
        if (data.kind === 'profile') {
          const request = profileRequestsRef.current.get(data.profileId);
          profileRequestsRef.current.delete(data.profileId);
          if (request) { if(data.error) request.reject(new Error(data.error)); else request.resolve(data.result); }
          return;
        }
        if (data.kind === 'drill') {
          if (data.generation === reqIdRef.current) setDrillDownModal({ ...data.metadata, records: data.records });
          return;
        }
        if (data.id !== reqIdRef.current) return;
        if (data.progress !== undefined) { setComputeProgress(data.progress); return; }
        busyRef.current = false;
        setIsWorkerComputing(false);
        if (data.success) {
          data.pivotResult.cellRecordsMap = new Map();
          setActiveResults({ pivotResult: data.pivotResult, unifiedChartSpec: data.unifiedChartSpec, dataset: currentDataset, config: pivotConfig, chartType, chartSpecConfig });
        } else { const message = `计算失败：${data.error}；请减少分组字段或拆分数据后重试`; setComputeError(message); showToast(message, 'error'); }
      };
      worker.onerror = (event) => {
        event?.preventDefault?.();
        stopCalculation();
        setComputeError('本地计算进程失败，可能内存不足；请减少分组字段或关闭其他标签页后重试');
        showToast('本地计算进程失败，可能内存不足；请减少分组字段、关闭其他标签页后重试', 'error');
      };
      worker.onmessageerror = worker.onerror;
      worker.postMessage({ id, payload: { dataset: cachedDatasetRef.current === currentDataset ? undefined : currentDataset, pivotConfig, chartType, chartSpecConfig } });
      cachedDatasetRef.current = currentDataset;
    } catch {
      stopCalculation();
      setComputeError('无法启动本地计算进程，请使用最新版浏览器并刷新页面重试');
      showToast('无法启动本地计算进程，请使用最新版浏览器并刷新页面重试', 'error');
    }
  }, [currentDataset, pivotConfig, chartType, chartSpecConfig, showToast, stopCalculation, computeAttempt]);

  const resourceLifecycleRef = useRef(0);
  useEffect(() => {
    const lifecycle = ++resourceLifecycleRef.current;
    return () => {
      // StrictMode can replay mount effects after a fast file selection. Only
      // release resources if no replacement setup ran in this same turn.
      queueMicrotask(() => {
        if (resourceLifecycleRef.current !== lifecycle) return;
        workerRef.current?.terminate();
        importTaskRef.current?.cancel();
      });
    };
  }, []);

  const runImport = useCallback(async (payload, fileName) => {
    importTaskRef.current?.cancel();
    const task = startImportTask(payload, (pct) => setUploadProgress({ fileName, pct, currentChunk: pct, totalChunks: 100 }));
    importTaskRef.current = task;
    setUploadProgress({ fileName, pct: 0, currentChunk: 0, totalChunks: 100 });
    try { return await task.promise; }
    finally {
      if (importTaskRef.current === task) { importTaskRef.current = null; setUploadProgress(null); }
    }
  }, []);

  const resultIsCurrent = activeResults.dataset === currentDataset && activeResults.config === pivotConfig && activeResults.chartType === chartType && activeResults.chartSpecConfig === chartSpecConfig;
  const pivotResult = activeResults.pivotResult;
  const unifiedChartSpec = activeResults.unifiedChartSpec;

  const saveCurrentViewAsShot = useCallback((title, subtitle) => {
    if (!currentDataset) {
      showToast('当前未加载数据集，无法保存分镜', 'error');
      return;
    }
    soundEngine?.playClick?.(620);
    const targetId = activeDatasetId;
    const shots = effectiveStoryShots;
    const nextNumber = String(shots.length + 1).padStart(2, '0');
    const insight = unifiedChartSpec?.executiveInsight;
    const defaultSubtitle = insight
      ? `最高：${insight.topName} (${insight.topFormatted}) · 样本总计 ${insight.groupCount} 组`
      : '自定义分析分镜快照';
    const newShot = {
      id: `custom_shot_${Date.now()}`,
      number: nextNumber,
      title: title || `自定义分镜 ${shots.length + 1}`,
      shortLabel: (title || `分镜${shots.length + 1}`).slice(0, 6),
      subtitle: subtitle || defaultSubtitle,
      cameraNote: 'Custom Analytical Lens · User Defined',
      viewMode,
      chartType,
      pivotOverride: JSON.parse(JSON.stringify(pivotConfig)),
    };
    const nextShots = [...shots, newShot];
    setCustomStoryShotsByDataset((prev) => ({
      ...prev,
      [targetId]: nextShots,
    }));
    setKeynoteShotIdx(nextShots.length - 1);
    showToast(`已成功保存当前视图为分镜 [${nextNumber}]`);
  }, [currentDataset, activeDatasetId, effectiveStoryShots, unifiedChartSpec, viewMode, chartType, pivotConfig, showToast, soundEngine]);

  const updateStoryShot = useCallback((shotIdx, updatedData) => {
    if (!activeDatasetId) return;
    soundEngine?.playClick?.(580);
    const shots = [...effectiveStoryShots];
    if (!shots[shotIdx]) return;
    shots[shotIdx] = {
      ...shots[shotIdx],
      ...updatedData,
      shortLabel: updatedData.title ? updatedData.title.slice(0, 6) : shots[shotIdx].shortLabel,
    };
    setCustomStoryShotsByDataset((prev) => ({
      ...prev,
      [activeDatasetId]: shots,
    }));
    showToast(`已更新分镜 [${shots[shotIdx].number}] 内容`);
  }, [activeDatasetId, effectiveStoryShots, showToast, soundEngine]);

  const deleteStoryShot = useCallback((shotIdx) => {
    if (!activeDatasetId) return;
    const shots = [...effectiveStoryShots];
    if (shots.length <= 1) {
      showToast('至少保留一个分镜', 'error');
      return;
    }
    soundEngine?.playClick?.(440);
    shots.splice(shotIdx, 1);
    const reindexed = shots.map((s, idx) => ({
      ...s,
      number: String(idx + 1).padStart(2, '0'),
    }));
    setCustomStoryShotsByDataset((prev) => ({
      ...prev,
      [activeDatasetId]: reindexed,
    }));
    const nextIdx = Math.max(0, Math.min(shotIdx, reindexed.length - 1));
    setKeynoteShotIdx(nextIdx);
    applyKeynoteShot(nextIdx, reindexed);
    showToast('已删除该分镜');
  }, [activeDatasetId, effectiveStoryShots, showToast, soundEngine, applyKeynoteShot]);

  const resetStoryShots = useCallback(() => {
    if (!activeDatasetId) return;
    soundEngine?.playClick?.(500);
    setCustomStoryShotsByDataset((prev) => {
      const next = { ...prev };
      delete next[activeDatasetId];
      return next;
    });
    setKeynoteShotIdx(0);
    const defaultShots = generateDynamicKeynoteShots(currentDataset);
    if (defaultShots[0]) {
      applyKeynoteShot(0, defaultShots);
    }
    showToast('已恢复为当前数据集的自动推荐故事分镜');
  }, [activeDatasetId, currentDataset, soundEngine, applyKeynoteShot, showToast]);

  const addFieldToZone = useCallback((zone, fieldName, source) => {
    if (isReadOnly) {
      showToast('当前为只读预览模式 (Viewer)，无法修改透视配置', 'error');
      return;
    }
    if (!currentDataset) return;
    soundEngine.playSnap ? soundEngine.playSnap() : soundEngine.playClick(580);
    setPivotConfig((previous) => {
      // Cross-zone moves form one history transaction, so Undo restores both sides.
      const prev = source?.itemId && source.source !== zone && source.source !== 'fieldList'
        ? { ...previous, [source.source]: previous[source.source].filter((item) => item.id !== source.itemId) }
        : previous;
      const list = prev[zone] || [];
      const fMeta = currentDataset.fields?.find((f) => f.name === fieldName);

      if (zone !== 'values' && list.some((it) => it.field === fieldName)) {
        if ((zone === 'rows' || zone === 'columns') && fMeta?.type === 'date') {
          const usedGrans = new Set(list.filter((it) => it.field === fieldName).map((it) => it.dateGranularity));
          const nextGranOrder = ['year', 'quarter', 'month', 'day', 'raw'];
          const nextGran = nextGranOrder.find((g) => !usedGrans.has(g));
          if (!nextGran) {
            showToast(`「${fieldName}」的所有日期粒度均已添加`, 'error');
            return previous;
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
        return previous;
      }

      const id = `${zone[0]}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (zone === 'values') {
        return {
          ...prev,
          values: [
            ...list,
            {
              id,
              field: fieldName,
              showAs: 'normal',
              ...getMeasureDefaults(fMeta),
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
    soundEngine.playPop ? soundEngine.playPop() : soundEngine.playClick(440);
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
    soundEngine.playHaptic ? soundEngine.playHaptic('light') : soundEngine.playClick(540);
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
    soundEngine.playHaptic ? soundEngine.playHaptic('medium') : soundEngine.playClick(500);
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

  const requestProfile = useCallback((field, dimension, matchLabel) => {
    if (busyRef.current || !workerRef.current) return Promise.resolve(null);
    const profileId=++profileIdRef.current;
    return new Promise((resolve,reject) => {
      profileRequestsRef.current.set(profileId,{resolve,reject});
      try { workerRef.current.postMessage({kind:'profile',profileId,field,dimension,matchLabel}); }
      catch(error) { profileRequestsRef.current.delete(profileId); reject(error); }
    });
  }, [currentDataset,isWorkerComputing]);

  const requestDrillDown = useCallback((rowKey, colKey = '__GRAND_TOTAL_COL__', metadata = {}) => {
    if (busyRef.current || !workerRef.current || computeError || !resultIsCurrent) { showToast('请等待本次计算完成后再查看明细', 'error'); return; }
    setDrillSearch(''); setDrillPage(1);
    workerRef.current.postMessage({ kind: 'drill', generation: reqIdRef.current, rowKey: rowKey.replace('__SUBTOTAL__', ''), colKey, metadata });
  }, [showToast,computeError,resultIsCurrent]);

  const handleTablePointClick = useCallback((point) => {
    setHighlightedRowKey(point.rowKey);
  }, []);

  const handleChartPointClick = useCallback(async (pointData) => {
    const now = Date.now();
    if (now - lastChartClickRef.current < 90) return;
    lastChartClickRef.current = now;
    const rk = pointData?.rowKey || pointData?.payload?.rowKey;
    if (!rk) return;

    if (chartSpecConfig.clickLinkMode === 'filter' && rk !== '__GRAND_TOTAL_ROW__') {
      const activeDim = pivotConfig.rows.length > 0 ? pivotConfig.rows[0] : (pivotConfig.columns.length > 0 ? pivotConfig.columns[0] : null);
      if (!activeDim) return;

      const firstSeg = decodeGroupPath(rk)[0];
      let matchingRawVals;
      try { matchingRawVals = (await requestProfile(activeDim.field, activeDim, firstSeg))?.matchingRawValues; }
      catch(error) { if(error.name!=='AbortError') showToast(`联动筛选失败：${error.message}；请重试`,'error'); return; }
      if (!matchingRawVals) { showToast('请等待计算完成后再筛选','error'); return; }


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
      setHighlightedRowKey(rk);
      const onlyColumns = !pivotResult.rowConfigs.length && pivotResult.colConfigs.length;
      const rawPoint = pointData?.payload || pointData;
      const rawColKey = pointData?.colKey || rawPoint?.colKey || '__GRAND_TOTAL_COL__';
      const decodedRowLabel = rk === '__GRAND_TOTAL_ROW__'
        ? '总计'
        : (rawPoint?.name || decodeGroupPath(rk).join(' / ') || '总计');
      const decodedColLabel = rawColKey === '__GRAND_TOTAL_COL__'
        ? '总计'
        : (decodeGroupPath(rawColKey).join(' / ') || '总计');
      const formattedVal = pointData?.formattedValue
        || rawPoint?.formattedValue
        || rawPoint?.formattedDelta
        || rawPoint?._compactPrimaryLabel
        || (typeof rawPoint?.value === 'number'
          ? UnifiedFormatter.formatValue(rawPoint.value, unifiedChartSpec.primaryValCfg, { compact: false })
          : typeof rawPoint?.[unifiedChartSpec.primarySeriesKey] === 'number'
            ? UnifiedFormatter.formatValue(rawPoint[unifiedChartSpec.primarySeriesKey], unifiedChartSpec.primaryValCfg, { compact: false })
            : typeof rawPoint?.x === 'number' && typeof rawPoint?.y === 'number'
              ? `${UnifiedFormatter.formatValue(rawPoint.x, unifiedChartSpec.primaryValCfg, { compact: true })} / ${UnifiedFormatter.formatValue(rawPoint.y, unifiedChartSpec.secondaryValCfg, { compact: true })}`
              : '');
      requestDrillDown(onlyColumns ? '__GRAND_TOTAL_ROW__' : rk, onlyColumns ? rk : rawColKey, {
        rowLabel: onlyColumns ? '总计' : decodedRowLabel,
        colLabel: onlyColumns ? decodedRowLabel : decodedColLabel,
        valLabel: unifiedChartSpec.primarySeriesKey,
        valueFormatted: formattedVal,
      });
    }
  }, [chartSpecConfig.clickLinkMode, currentDataset, pivotConfig.rows, pivotConfig.columns, pivotResult, showToast, requestDrillDown, unifiedChartSpec.primarySeriesKey, unifiedChartSpec.primaryValCfg, unifiedChartSpec.secondaryValCfg, requestProfile]);

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
      const fileLimit = Math.max(32, Math.min(256, (navigator.deviceMemory || 4) * 32)) * 1024 * 1024;
      if (file.size > fileLimit) throw new Error(`文件超过本机保护上限 ${Math.round(fileLimit / 1024 / 1024)} MB，可能内存不足；请拆分文件、减少字段或在内存更大的设备上重试`);
      if (!/\.(csv|tsv|txt|xlsx|xls)$/i.test(file.name)) throw new Error('不支持此文件格式，请另存为 CSV、TSV 或 Excel 后重试');
      importSourceRef.current = { file };
      const sheets = await runImport({ file }, file.name);
      setUploadPreviewModal({ fileName: file.name, activeSheetIdx: 0, sheets });
    } catch (error) {
      if (error.name !== 'AbortError') showToast(`导入失败：${error.message}`, 'error');
    }
    if (e?.target && 'value' in e.target) e.target.value = '';
  }, [showToast, runImport]);

  const reparseImport = useCallback(async (options) => {
    if (!importSourceRef.current || importTaskRef.current) return;
    try {
      const sheets = await runImport({ ...importSourceRef.current, options }, uploadPreviewModal.fileName);
      setUploadPreviewModal((prev) => prev ? { ...prev, sheets, options } : null);
    } catch (error) { if (error.name !== 'AbortError') showToast(error.message, 'error'); }
  }, [runImport, showToast, uploadPreviewModal]);

  // Every newly imported dataset uses the same defaults and independent undo history.
  const commitImportedDataset = useCallback((newDs, autoInitPivot = true) => {
    setDatasets(prev => [...prev, newDs]);
    setActiveDatasetId(newDs.id);
    setHighlightedRowKey(null);
    setHoveredCellTelemetry(null);
    setKeynoteShotIdx(0);
    setChartSpecConfig(prev => ({...prev, primaryValueId:'', secondaryValueId:''}));
    if (pendingViewRef.current) {
      replacePivotConfig(pendingViewRef.current);
      pendingViewRef.current = null;
    } else replacePivotConfig(buildDefaultPivotConfig(autoInitPivot ? newDs : null));
  }, [replacePivotConfig]);

  const confirmUploadDataset = useCallback(async (autoInitPivot = true) => {
    if (!uploadPreviewModal) return;
    const activeIdx = uploadPreviewModal.activeSheetIdx ?? 0;
    const sheet = uploadPreviewModal.sheets[activeIdx] || uploadPreviewModal.sheets[0];
    const sheetSuffix = uploadPreviewModal.sheets.length > 1 ? ` - ${sheet.name || ('Sheet ' + (activeIdx + 1))}` : '';
    let normalizedRows;
    try { normalizedRows = (await runImport({ sheets: [sheet], normalize: true }, uploadPreviewModal.fileName))[0].rows; }
    catch (error) { if (error.name !== 'AbortError') showToast(error.message, 'error'); return; }

    const newDs = {
      id: `ds_upload_${Date.now()}`,
      metricCatalogSource: {fileName: uploadPreviewModal.fileName, sheetName: sheet.name || String(activeIdx)},
      name: `${uploadPreviewModal.fileName}${sheetSuffix} (${normalizedRows.length}行)`,
      fields: sheet.fields,
      rows: normalizedRows,
    };
    commitImportedDataset(newDs, autoInitPivot);
    setUploadPreviewModal(null);
    soundEngine.playTransitionChord();
    showToast(`成功导入数据集「${newDs.name}」`);
  }, [uploadPreviewModal, showToast, runImport, commitImportedDataset]);

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
    if (pendingViewRef.current) replacePivotConfig(pendingViewRef.current);
    pendingViewRef.current = null;
    soundEngine?.playTransitionChord?.();
    showToast(`已加载测试集「${preset.name}」`);
  }, [switchDataset, showToast, replacePivotConfig]);

  const unloadDataset = useCallback((id) => {
    const next = datasets.filter(d => d.id !== id);
    datasetHistoriesRef.current.delete(id);
    setDatasets(next);
    if (id === activeDatasetId) {
      if (next.length) switchDataset(next[0].id, next[0]);
      else {
        setActiveDatasetId(null);
        replacePivotConfig(buildDefaultPivotConfig(null));
      }
    }
    soundEngine?.playClick?.(440);
    showToast('已卸载指定数据集');
  }, [datasets,activeDatasetId, switchDataset, showToast, replacePivotConfig]);

  const unloadCurrentDataset = useCallback(() => {
    unloadDataset(activeDatasetId);
  }, [activeDatasetId, unloadDataset]);

  const handlePasteText = useCallback(async (text) => {
    if (!text?.trim()) return;
    try {
      importSourceRef.current = { text };
      const sheets = await runImport({ text }, 'Clipboard_Data.csv');
      setUploadPreviewModal({ fileName: 'Clipboard_Data.csv', activeSheetIdx: 0, sheets });
    } catch (error) { if (error.name !== 'AbortError') showToast(`解析失败：${error.message}`, 'error'); }
  }, [showToast, runImport]);

  const exportToCSV = useCallback(() => {
    if (!currentDataset || isWorkerComputing || computeError) { showToast('当前没有可导出的已完成结果，请先加载数据并完成计算', 'error'); return; }
    doExportCSV(currentDataset, pivotResult, showToast);
  }, [currentDataset, pivotResult, showToast, isWorkerComputing, computeError]);

  const exportToExcelMerged = useCallback(() => {
    if (!currentDataset || isWorkerComputing || computeError) { showToast('当前没有可导出的已完成结果，请先加载数据并完成计算', 'error'); return; }
    doExportExcel(currentDataset, pivotResult, showToast);
  }, [currentDataset, pivotResult, showToast, isWorkerComputing, computeError]);

  const exportChartAsPNG = useCallback(() => {
    if (!currentDataset || isWorkerComputing || computeError) { showToast('当前没有可导出的已完成结果，请先加载数据并完成计算', 'error'); return; }
    doExportPNG(currentDataset, unifiedChartSpec, chartType, darkMode, viewMode, showToast);
  }, [chartType, currentDataset, darkMode, showToast, unifiedChartSpec, viewMode, isWorkerComputing, computeError]);

  const exportChartAsSVG = useCallback(() => {
    if (!currentDataset || isWorkerComputing || computeError) { showToast('当前没有可导出的已完成结果，请先加载数据并完成计算', 'error'); return; }
    doExportSVG(currentDataset, unifiedChartSpec, chartType, darkMode, viewMode, showToast);
  }, [chartType, currentDataset, darkMode, showToast, unifiedChartSpec, viewMode, isWorkerComputing, computeError]);

  const exportPDFReport = useCallback(() => {
    doExportPDF(setIsPrintingReport);
  }, []);

  const applyShareTokenPayload = useCallback((rawInput) => {
    if (!rawInput || !rawInput.trim()) return false;
    try {
      const decoded = decodeView(rawInput);
      pendingViewRef.current = currentDataset ? null : decoded.fullConfig;
      setPivotConfig(decoded.fullConfig);
      if (decoded.cf) setCondFormat(decoded.cf);
      if (decoded.csc) setChartSpecConfig((p) => ({ ...p, ...decoded.csc }));
      if (decoded.vm) setViewMode(decoded.vm);
      if (decoded.ct) setChartType(decoded.ct);
      if (decoded.ts) setTableSettings((p) => ({ ...p, ...decoded.ts }));
      showToast(currentDataset ? '已恢复视图配置，请核对字段是否匹配' : '已载入视图配置，请自行加载相同字段的数据');
      return true;
    } catch {
      showToast('Share Token 格式无效，无法解析还原', 'error');
      return false;
    }
  }, [showToast, currentDataset, setPivotConfig]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('share_token') || new URLSearchParams(window.location.search).get('share_token');
    if (token) applyShareTokenPayload(token);
    // Read once: data import must not reapply an old URL over subsequent user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spotlight Command Palette Actions
  const commandActions = useMemo(() => {
    const list = [
      { id: 'cmd_undo', category: '历史与操作', label: '撤销上一步透视配置修改 (Undo)', shortcut: '⌘Z', run: undo },
      { id: 'cmd_redo', category: '历史与操作', label: '重做下一步透视配置修改 (Redo)', shortcut: '⌘Y', run: redo },
      { id: 'cmd_keynote', category: 'Keynote 叙事分镜', label: keynotePlaying ? '暂停 96 BPM Keynote 自动运镜' : '启动 96 BPM Apple Keynote 自动运镜', shortcut: 'Space', run: () => { setKeynotePlaying((p) => !p); } },
      { id: 'cmd_theater', category: 'Keynote 叙事分镜', label: cinemaTheaterMode ? '退出剧院全屏舞台模式' : '进入剧院全屏舞台模式 (隐藏侧栏)', shortcut: 'T', run: () => { setCinemaTheaterMode((p) => !p); } },
      { id: 'cmd_transpose', category: '矩阵与结构操作', label: '一键执行透视矩阵「行列互换 (Transpose)」', shortcut: 'R', run: transposeRowsAndColumns },
      ...(effectiveStoryShots.length > 0 ? effectiveStoryShots : KEYNOTE_STORYBOARD_SHOTS).map((s, idx) => ({
        id: `cmd_shot_${idx}`,
        category: 'Keynote 叙事分镜',
        label: `${t('切换分镜')} ${s.number}: ${s.title}`,
        shortcut: `0${idx + 1}`,
        run: () => applyKeynoteShot(idx),
      })),
      ...VISUAL_CHART_TYPES.map((ct) => ({
        id: `cmd_chart_${ct.value}`,
        category: '图表切换',
        label: `${t('切换图表为:')} ${t(ct.label)}`,
        shortcut: ct.short,
        run: () => { setChartType(ct.value); if (viewMode === 'table') setViewMode('split'); },
      })),
      { id: 'cmd_100k', category: '性能与引擎验证', label: '一键生成 100,000 行大数据压测集 (激活虚拟滚动)', shortcut: '100K', run: () => generate100kDataset(100000) },
      { id: 'cmd_theme', category: '外观与导出', label: darkMode ? '切换为 Monokai Light 暖纸浅色主题' : '切换为 Monokai Pro 经典暗黑主题', shortcut: 'Theme', run: () => setDarkMode((p) => !p) },
      { id: 'cmd_excel', category: '外观与导出', label: '导出 Excel 工作簿 (.xlsx)', shortcut: 'XLS', run: exportToExcelMerged },
      { id: 'cmd_csv', category: '外观与导出', label: '导出标准 UTF-8 CSV 数据表 (.csv)', shortcut: 'CSV', run: exportToCSV },
      { id: 'cmd_autofit_cols', category: '透视表排版与对齐', label: '透视表：一键自动优化调整行高与列宽 (Auto-Fit)', shortcut: 'Fit', run: () => { const newWidths = calculateAutoFitColumnWidths(pivotResult, tableSettings.customColWidths); setTableSettings((p) => ({ ...p, colWidthMode: 'autofit', customColWidths: newWidths })); showToast('已自动计算并自适应优化全部行高与列宽'); } },
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
    return list.filter((item) => [item.label, item.category, t(item.label), t(item.category), item.shortcut].some(text => text.toLowerCase().includes(q)));
  }, [keynotePlaying, cinemaTheaterMode, transposeRowsAndColumns, applyKeynoteShot, viewMode, generate100kDataset, darkMode, exportToExcelMerged, exportToCSV, commandQuery, locale, pivotResult, tableSettings, showToast, effectiveStoryShots]);

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
  const currentDensity = tableSettings.density || 'compact';
  const ROW_HEIGHT = rowHeightMap[currentDensity] || 28;
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
    <div data-testid="pivot-workbench" data-calculation-status={isWorkerComputing ? 'running' : computeError ? 'failed' : resultIsCurrent ? 'idle' : 'pending'} className={darkMode && !isPrintingReport ? 'dark' : ''}>
      <div className={`min-h-[100dvh] h-auto md:h-[100dvh] bg-[#F7F6F0] dark:bg-[#1E1F1C] ambient-glow-mesh text-[#272822] dark:text-[#F8F8F2] text-[11px] leading-relaxed antialiased tabular-nums flex flex-col apple-font-sans print:bg-white print:text-black apple-transition ${isPrintingReport ? 'overflow-visible' : 'overflow-x-hidden md:overflow-hidden'}`}>
        {isPrintingReport ? (
          <div className="hidden print:block px-6 py-4 border-b border-black/15">
          <h1 className="text-base font-semibold tracking-tight text-black">{t("PivotEngine Studio [Monokai Pro] 数据透视分析报告 —") + ' '}{currentDataset?.name || '空白工程'}</h1>
          <p className="text-[11px] text-ink-muted mt-1">{t("导出时间:") + ' '}{new Date().toLocaleString('zh-CN')}{' ' + t("· 有效记录:") + ' '}{pivotResult.filteredCount.toLocaleString()} / {pivotResult.totalCount.toLocaleString()}{' ' + t("行 · 导出人:") + ' '}{currentUser.name}</p>
        </div>

        ) : null}

        {/* Modular Header Bar */}
        <HeaderBar
          theme={theme} setTheme={setTheme}
          locale={locale} onLocaleChange={(value) => { const saved = setLocale(value); setLocaleState(value); if (!saved) showToast('无法保存语言偏好，当前标签页内仍有效', 'error'); }}
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
          storyShots={effectiveStoryShots}
          onSaveCurrentViewAsShot={saveCurrentViewAsShot}
          onUpdateStoryShot={updateStoryShot}
          onDeleteStoryShot={deleteStoryShot}
          onResetStoryShots={resetStoryShots}
          unifiedChartSpec={unifiedChartSpec}
          onEnsureDatasetLoaded={loadRetailDataset}
          currentDataset={currentDataset}
          cinemaTheaterMode={cinemaTheaterMode}
          setCinemaTheaterMode={setCinemaTheaterMode}
          shotProgressPct={shotProgressPct}
          pivotResult={pivotResult}
          currentUser={currentUser}
          isReadOnly={isReadOnly}
          viewMode={viewMode}
          isPrintingReport={isPrintingReport}
          setShowSpecModal={setShowSpecModal}
          setShowShortcutsModal={setShowShortcutsModal}
          setShowCommandPalette={setShowCommandPalette}
          setCommandQuery={setCommandQuery}
          setActiveFormatModal={setActiveFormatModal}
          setShowWorkspaceModal={setShowWorkspaceModal}
          exportToExcelMerged={exportToExcelMerged}
          exportToCSV={exportToCSV}
          exportChartAsPNG={exportChartAsPNG}
          exportChartAsSVG={exportChartAsSVG}
          exportPDFReport={exportPDFReport}
          handleFileUpload={handleFileUpload}
          handlePasteText={handlePasteText}
          setActiveDataSourceModal={setActiveDataSourceModal}
          showToast={showToast}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
        />

        {(uploadProgress || isWorkerComputing) && (
          <div className="flex items-center gap-3 px-4 py-2 shrink-0" role="status">
            <span>{uploadProgress ? `正在导入 ${uploadProgress.fileName}` : t("正在计算")}</span>
            <progress aria-label={uploadProgress ? t('导入进度') : t('计算进度')} max="100" value={uploadProgress?.pct ?? computeProgress} className="flex-1" />
            <span>{uploadProgress?.pct ?? computeProgress}%</span>
            <button onClick={() => { if (uploadProgress) importTaskRef.current?.cancel(); else { stopCalculation(); setComputeError('已取消计算，当前显示上次成功结果；可调整配置或重新计算'); } showToast('已取消，保留上次计算结果'); }}>{t("取消")}</button>
          </div>
        )}

        {computeError && <div role="alert" className="px-4 py-2 border-b border-[#F92672] text-ink-pink flex flex-wrap gap-3 items-center">
          <span>{computeError}</span><button onClick={() => setComputeAttempt((value) => value + 1)} className="border rounded px-2 py-1">重新计算</button>
        </div>}
        {/* Workspace Dataset Tab Strip & Context Bar */}
        <DatasetTabStrip
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          currentDataset={currentDataset}
          switchDataset={switchDataset}
          unloadDataset={unloadDataset}
          onOpenIntro={() => setActiveDatasetId(null)}
          pivotResult={pivotResult}
          isWorkerComputing={isWorkerComputing}
          soundEngine={soundEngine}
          handleFileUpload={handleFileUpload}
          onPasteText={handlePasteText}
          setActiveDataSourceModal={setActiveDataSourceModal}
          isReadOnly={isReadOnly}
          uploadProgress={uploadProgress}
          showToast={showToast}
        />

        {!currentDataset ? (
          <IntroScreen
            onUploadFile={handleFileUpload}
            onLoadPresetDataset={loadPresetDataset}
            onLoadRetailDataset={loadRetailDataset}
            onGenerate100kDataset={generate100kDataset}
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
          requestProfile={requestProfile}
          onPasteText={handlePasteText}
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
          isPrintingReport={isPrintingReport}
        >
          {/* 字段有效性自愈横幅: 当配置中遗留失效字段时提醒用户并提供一键重置 */}
          {pivotResult?.sanitizedInfo?.hasInvalidFields && (
            <div className="mx-2.5 sm:mx-4 mb-2 p-2.5 rounded-xl bg-[#FD971F]/15 border border-[#FD971F]/40 flex flex-wrap items-center justify-between gap-2 text-xs apple-font-mono text-ink-orange animate-apple-modal shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold">{t("⚠️ 配置自愈提示:")}</span>
                <span>{' ' + t("检测到当前数据集中不存在的失效字段") + ' '}{pivotResult.sanitizedInfo.ignoredFilters.length > 0 && ` [筛选: ${pivotResult.sanitizedInfo.ignoredFilters.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredRows.length > 0 && ` [行: ${pivotResult.sanitizedInfo.ignoredRows.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredCols.length > 0 && ` [列: ${pivotResult.sanitizedInfo.ignoredCols.join(', ')}]`}
                  {pivotResult.sanitizedInfo.ignoredVals.length > 0 && ` [指标: ${pivotResult.sanitizedInfo.ignoredVals.join(', ')}]`}{' ' + t("，已自动安全脱落以保障计算。") + ' '}</span>
              </div>
              <button
                onClick={() => {
                  soundEngine?.playClick(520);
                  setPivotConfig(buildDefaultPivotConfig(currentDataset));
                  showToast('已重置为当前数据集的推荐默认透视配置');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#FD971F] text-[#1E1F1C] font-bold text-[10px] shrink-0 hover:opacity-90 transition"
              >{' ' + t("一键重置为默认透视") + ' '}</button>
            </div>
          )}

          {/* Preserve usable pane heights; scroll the workspace when both cannot fit. */}
        <div
          ref={splitContainerRef}
          
          className={`flex-1 flex flex-col min-h-[480px] md:min-h-0 bg-[#F7F6F0] dark:bg-[#1E1F1C] p-2.5 sm:p-4 gap-2 animate-apple-stage ${isPrintingReport ? 'overflow-visible h-auto' : 'overflow-auto'}`}
        >
          {(viewMode !== 'chart' || isPrintingReport) && (
            <div
              style={{
                ...(viewMode === 'split' && !isPrintingReport ? { flexBasis: `${splitRatioPct}%`, minHeight: 480 } : {}),
              }}
              className={`bg-[#FFFDF7] dark:bg-[#272822] rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col w-full min-h-0 overflow-hidden apple-transition ${viewMode === 'split' && !isPrintingReport ? 'flex-1' : 'flex-1'} ${isPrintingReport ? 'overflow-visible h-auto' : ''}`}
            >
              <PivotTable
                isReadOnly={isReadOnly}
                onAddRecordCount={() => addFieldToZone('values', '__COUNT__')}
                requestProfile={requestProfile}
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
                handleChartPointClick={handleTablePointClick}
                requestDrillDown={requestDrillDown}
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
                draggingPayload={draggingPayload}
                setDraggingPayload={setDraggingPayload}
                dragOverZone={dragOverZone}
                setDragOverZone={setDragOverZone}
                addFieldToZone={addFieldToZone}
                removeZoneItem={removeZoneItem}
                moveZoneItem={moveZoneItem}
                setHeaderFilterSearch={setHeaderFilterSearch}
                setActiveHeaderFilterModal={setActiveHeaderFilterModal}
                setBinFormState={setBinFormState}
                setActiveBinModal={setActiveBinModal}
                transposeRowsAndColumns={transposeRowsAndColumns}
              />
            </div>
          )}

          {/* Interactive Draggable Split Handle (Horizontal Row-Resize for Vertical Stacking) */}
          {viewMode === 'split' && !isPrintingReport && (
            <div
              id="split-resizer"
              role="separator"
              aria-label={t("调整透视表与图表上下高度")}
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
              title={t("上下拖拽无级调节表图高度 · 双击复位 (50:50)")}
              className={`flex w-full h-2.5 rounded-full items-center justify-center cursor-row-resize focus-visible:ring-2 focus-visible:ring-[#66D9EF] select-none transition-colors shrink-0 group ${isResizingSplit ? 'bg-[#F92672]/30' : 'hover:bg-[#66D9EF]/20'}`}
            >
              <div className={`h-1 w-12 rounded-full transition-colors ${isResizingSplit ? 'bg-action' : 'bg-[#D6D4C8] dark:bg-[#3E3D32] group-hover:bg-[#66D9EF]'}`} />
            </div>
          )}

          {(viewMode !== 'table' || isPrintingReport) && (
            <ChartFrame
              fullscreen={isChartFullscreen && !isPrintingReport}
              onExit={() => setIsChartFullscreen(false)}
              darkMode={darkMode}
              style={{
                ...(viewMode === 'split' && !isPrintingReport ? { flexBasis: `${100 - splitRatioPct}%`, minHeight: 460 } : {}),
              }}
              className={`bg-[#FFFDF7] dark:bg-[#272822] rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] apple-specular-card flex flex-col min-w-0 min-h-0 p-4 apple-transition ${isChartFullscreen ? '' : 'w-full flex-1'} ${isPrintingReport ? 'h-auto' : ''}`}
            >
              <ChartStudio
                isReadOnly={isReadOnly}
                requestDrillDown={requestDrillDown}
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
                onClearHighlight={() => setHighlightedRowKey(null)}
                handleChartPointClick={handleChartPointClick}
                setDrillDownModal={setDrillDownModal}
                setDrillSearch={setDrillSearch}
                setDrillPage={setDrillPage}
                applyKeynoteShot={applyKeynoteShot}
                keynoteShotIdx={keynoteShotIdx}
                storyShots={effectiveStoryShots}
                onSaveCurrentViewAsShot={saveCurrentViewAsShot}
                onUpdateStoryShot={updateStoryShot}
                onDeleteStoryShot={deleteStoryShot}
                onResetStoryShots={resetStoryShots}
                hasCustomStoryShots={Boolean(activeDatasetId && customStoryShotsByDataset[activeDatasetId])} setPivotConfig={setPivotConfig} addFieldToZone={addFieldToZone} removeZoneItem={removeZoneItem}
                pivotConfig={pivotConfig}
                soundEngine={soundEngine}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onAddRecordCount={() => addFieldToZone('values', '__COUNT__')}
                onAddMeasure={(field) => addFieldToZone('values', field)}
                currentDataset={currentDataset}
                showToast={showToast}
                copyTextToClipboard={copyTextToClipboard}
                onExportPNG={exportChartAsPNG}
                onExportSVG={exportChartAsSVG}
              />
            </ChartFrame>
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
          soundEngine={soundEngine}
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
          onReparse={reparseImport}
          isImporting={Boolean(uploadProgress)}
          uploadPreviewModal={uploadPreviewModal}
          setUploadPreviewModal={setUploadPreviewModal}
          confirmUploadDataset={confirmUploadDataset}
          onClose={() => { importTaskRef.current?.cancel(); setUploadPreviewModal(null); }}
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
          requestProfile={requestProfile}
          activeHeaderFilterModal={activeHeaderFilterModal}
          pivotConfig={pivotConfig}
          setPivotConfig={setPivotConfig}
          currentDataset={currentDataset}
          headerFilterSearch={headerFilterSearch}
          setHeaderFilterSearch={setHeaderFilterSearch}
          onClose={() => setActiveHeaderFilterModal(null)}
        />

        <FormatModal
          isReadOnly={isReadOnly}
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
          onModeChange={setActiveDataSourceModal}
          onImportDataset={commitImportedDataset}
          runImport={runImport}
          activeDataSourceModal={activeDataSourceModal}
          onClose={() => setActiveDataSourceModal(null)}
          gsheetUrlInput={gsheetUrlInput}
          setGsheetUrlInput={setGsheetUrlInput}
          duckdbThreshold={duckdbThreshold}
          currentDataset={currentDataset}
          pivotConfig={pivotConfig}
          generate100kDataset={generate100kDataset}
          copyTextToClipboard={copyTextToClipboard}
          soundEngine={soundEngine}
          showToast={showToast}
        />

        <WorkspaceModal
          restorePivotConfig={(config, datasetAvailable) => { pendingViewRef.current = datasetAvailable ? null : config; replacePivotConfig(config); }}
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

        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />
      </div>
    </div>
  );
}
