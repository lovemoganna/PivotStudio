import { t } from '../../../i18n.js';
import React from 'react';
import {
  Terminal, Lock, Search, Film, CheckCircle2, Palette,
  FolderOpen, Volume2, VolumeX, Sun, Moon, SkipBack, SkipForward, AlertCircle, ChevronRight, ChevronDown, X,
  Undo2, Redo2, Upload, Sparkles, Plus, Pencil, Trash2, RotateCcw, Play, Pause, Database, Keyboard, MoreHorizontal, Download
} from 'lucide-react';
import { KEYNOTE_STORYBOARD_SHOTS } from '../../../constants/pivotConstants';
import { StoryShotDialog } from './modals/StoryShotDialog';
import { ToolbarMenu } from './ToolbarMenu';

export function HeaderBar({
  theme, setTheme, locale, onLocaleChange,
  canUndo,
  canRedo,
  undo,
  redo,
  darkMode,
  setDarkMode,
  soundEnabled,
  setSoundEnabled,
  soundEngine,
  keynotePlaying,
  setKeynotePlaying,
  keynoteShotIdx,
  applyKeynoteShot,
  cinemaTheaterMode,
  setCinemaTheaterMode,
  shotProgressPct,
  pivotResult,
  currentUser,
  isReadOnly,
  viewMode,
  isPrintingReport,
  setShowShortcutsModal,
  setShowCommandPalette,
  setCommandQuery,
  setActiveFormatModal,
  setShowWorkspaceModal,
  exportToExcelMerged,
  exportToCSV,
  exportChartAsPNG,
  exportChartAsSVG,
  exportPDFReport,
  handleFileUpload,
  handlePasteText,
  setActiveDataSourceModal,
  showToast,
  toastMessage,
  setToastMessage,
  storyShots,
  onSaveCurrentViewAsShot,
  onUpdateStoryShot,
  onDeleteStoryShot,
  onResetStoryShots,
  unifiedChartSpec,
  onEnsureDatasetLoaded,
  currentDataset,
  hasSavedViews = false,
}) {
  const effectiveStoryShots = (storyShots && storyShots.length > 0) ? storyShots : KEYNOTE_STORYBOARD_SHOTS;
  const activeKeynoteShot = effectiveStoryShots[keynoteShotIdx] || effectiveStoryShots[0] || KEYNOTE_STORYBOARD_SHOTS[0];
  const hasDataset = Boolean(currentDataset);
  const [isEditingShot, setIsEditingShot] = React.useState(false);
  const [editShotForm, setEditShotForm] = React.useState({ title: '', subtitle: '' });
  const [isSavingNewShot, setIsSavingNewShot] = React.useState(false);
  const [newShotForm, setNewShotForm] = React.useState({ title: '', subtitle: '' });
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [toolbarOverflows, setToolbarOverflows] = React.useState(false);
  const exportMenuRef = React.useRef(null);
  const moreMenuRef = React.useRef(null);
  const toolbarRef = React.useRef(null);

  React.useEffect(() => {
    const el = toolbarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setToolbarOverflows(el.scrollWidth > el.clientWidth + 4);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [hasDataset, keynotePlaying, cinemaTheaterMode]);

  React.useEffect(() => {
    if (!hasDataset) {
      setExportMenuOpen(false);
      setMoreMenuOpen(false);
    }
  }, [hasDataset]);
  const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const scrollToolbar = () => {
    const el = toolbarRef.current;
    if (!el) return;
    const reachedEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12;
    el.scrollTo({ left: reachedEnd ? 0 : el.scrollLeft + Math.max(220, el.clientWidth * 0.8), behavior: scrollBehavior() });
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="ps-dark-surface fixed bottom-10 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl border bg-[#272822]/95 text-[#F8F8F2] border-[#F92672]/50 backdrop-blur-2xl animate-apple-modal max-w-[calc(100vw-2rem)] sm:max-w-md">
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-ink-pink shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-ink-green shrink-0" />}
          <span className="text-[11px] font-medium tracking-tight leading-snug apple-font-mono">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-1 p-0.5 rounded text-ink-muted hover:text-[#F8F8F2] hover:bg-white/10 transition" aria-label={t("关闭通知")}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Main Header Bar (MECE Functional Architecture) */}
      <header className="min-h-12 py-1.5 bg-[#EFECE1]/90 dark:bg-[#272822]/95 backdrop-blur-2xl border-b border-[#D6D4C8] dark:border-[#3E3D32] px-3 sm:px-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 shrink-0 print:hidden z-30 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#F92672] via-[#FD971F] via-[#E6DB74] via-[#A6E22E] via-[#66D9EF] to-[#AE81FF]" />

        {/* =========================================================================
            MODULE 1: 品牌与工程识别 (Brand & Identity)
            ========================================================================= */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="ps-dark-surface w-8 h-8 rounded-lg bg-[#1E1F1C] border border-[#3E3D32] flex items-center justify-center text-ink-pink shadow-sm shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F92672]/20 via-transparent to-[#66D9EF]/20" />
            <Terminal className="w-4 h-4 text-ink-pink relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-bold tracking-tight flex items-center gap-2">
                <span className="text-[#272822] dark:text-[#F8F8F2]">PivotStudio</span>
                <span className="text-[10px] font-medium text-ink-muted hidden sm:inline">{t("数据透视")}</span>
              </h1>
              {setShowShortcutsModal && (
                <button
                  type="button"
                  onClick={() => { soundEngine?.playPop?.(); setShowShortcutsModal(true); }}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md text-ink-muted hover:text-ink-cyan hover:bg-[#66D9EF]/10 border border-transparent hover:border-[#66D9EF]/30 font-medium apple-transition shrink-0 whitespace-nowrap"
                  title={t("查看键盘快捷键 (?)")}
                  aria-label={t("快捷键指南")}
                >
                  <Keyboard className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("快捷键")}</span>
                  <kbd className="text-[8px] opacity-75 hidden sm:inline">?</kbd>
                </button>
              )}
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[#FD971F]/15 text-ink-orange font-semibold border border-[#FD971F]/35">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t("只读预览")}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-ink-muted hidden xl:block leading-tight mt-0.5">
              {hasDataset ? t("选择行、列与指标，查看透视结果") : t("导入表格，开始分析")}
            </p>
          </div>
        </div>

        {/* =========================================================================
            OPERATIONAL TOOLBAR: MECE Organized Clusters
            ========================================================================= */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-full xl:flex-initial">
          <div
            ref={toolbarRef}
            role="toolbar"
            tabIndex={0}
            aria-label={t("分析工作台工具栏，可横向滚动")}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
                event.preventDefault();
                event.currentTarget.scrollBy({ left: event.key === 'ArrowRight' ? 180 : -180, behavior: scrollBehavior() });
              }
            }}
            className="flex flex-1 flex-nowrap items-center gap-2 overflow-x-auto max-w-full min-w-0 pb-1 xl:pb-0 [&>*]:shrink-0"
          >
            {/* ---------------------------------------------------------------------
                CLUSTER 1: 数据枢纽 (Data Hub: Inbound Import & Outbound Export)
                --------------------------------------------------------------------- */}
            <div
              className="flex items-center h-8 bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg shadow-xs divide-x divide-[#D6D4C8] dark:divide-[#3E3D32] apple-font-mono text-[11px]"
              role="group"
              aria-label={t("数据枢纽")}
            >
              {/* Sub-cluster: 数据导入 (Inbound) */}
              <div className="flex items-center h-full px-1 gap-0.5">
                <span className="px-1 hidden md:flex items-center text-ink-pink select-none" title={t("数据导入")}>
                  <Database className="w-3.5 h-3.5" />
                </span>
                <label
                  className={`h-7 flex items-center gap-1 px-2 rounded-md hover:bg-[#F92672]/15 text-ink-pink font-semibold cursor-pointer transition select-none ${isReadOnly ? 'opacity-40 pointer-events-none' : ''}`}
                  title={t("上传本地 CSV、TSV 或 Excel 文件新建数据集")}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("上传")}</span>
                  <input
                    aria-label={t('上传 CSV / Excel')}
                    type="file"
                    accept=".csv,.tsv,.txt,.xls,.xlsx"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={isReadOnly}
                  />
                </label>

                {handlePasteText && (
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={onEnsureDatasetLoaded}
                    className="h-7 flex items-center gap-1 px-1.5 rounded-md hover:bg-[#A6E22E]/15 text-ink-green font-semibold transition disabled:opacity-40"
                    title={t("一键加载零售样例数据")}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>{t("样例")}</span>
                  </button>
                )}

                {setActiveDataSourceModal && (
                  <button
                    type="button"
                    onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('gsheet'); }}
                    className="h-7 flex items-center px-1.5 rounded-md hover:bg-[#66D9EF]/15 text-ink-cyan font-semibold transition"
                    title={t("外部数据源 (Google Sheets / SQL代理 / 100K压测)")}
                  >
                    <span>+来源</span>
                  </button>
                )}
              </div>

              {/* Sub-cluster: 数据导出 — one quiet menu after data is loaded */}
              {hasDataset && (
                <div ref={exportMenuRef} className="relative flex items-center h-full px-1">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={exportMenuOpen}
                    onClick={() => { soundEngine?.playClick?.(520); setMoreMenuOpen(false); setExportMenuOpen((open) => !open); }}
                    className={`h-7 flex items-center gap-1 px-2 rounded-md font-semibold transition ${
                      exportMenuOpen
                        ? 'bg-[#A6E22E]/20 text-ink-green'
                        : 'hover:bg-[#A6E22E]/15 text-[#272822] dark:text-ink-green'
                    }`}
                    title={t("导出表格或图表")}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>{t("导出")}</span>
                    <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exportMenuOpen && (
                    <ToolbarMenu anchorRef={exportMenuRef} label={t('导出格式')} darkMode={darkMode} onClose={()=>setExportMenuOpen(false)}>
                      {[
                        { label: '.XLSX', onClick: exportToExcelMerged, title: t('导出真正的 Excel 工作簿 (.xlsx)'), disabled: false },
                        { label: '.CSV', onClick: exportToCSV, title: t('导出 CSV 数据表 (.csv)'), disabled: false },
                        { label: '.PNG', onClick: exportChartAsPNG, title: viewMode === 'table' ? t('请先切换到含图表的视图再导出 PNG') : t('导出 PNG 图表'), disabled: viewMode === 'table' },
                        { label: '.SVG', onClick: exportChartAsSVG, title: t('导出 SVG 矢量图表'), disabled: viewMode === 'table' },
                        { label: '.PDF', onClick: exportPDFReport, title: t('打开打印窗口，可选择另存为 PDF'), disabled: false },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          disabled={item.disabled}
                          title={item.title}
                          onClick={() => {
                            if (item.disabled) return;
                            item.onClick?.();
                            setExportMenuOpen(false);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg text-left text-[11px] font-semibold text-[#272822] dark:text-[#F8F8F2] hover:bg-[#A6E22E]/15 disabled:opacity-35 disabled:cursor-not-allowed transition"
                        >
                          {item.label}
                        </button>
                      ))}
                    </ToolbarMenu>
                  )}
                </div>
              )}
            </div>

            {!hasDataset && hasSavedViews && <button onClick={() => setShowWorkspaceModal(true)} className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] text-xs text-ink-cyan shrink-0"><FolderOpen className="w-3.5 h-3.5" />{t('恢复分析配置')}</button>}

            {/* ---------------------------------------------------------------------
                CLUSTER 2: 分析操作与全局指令 (Analysis Operations & Commands)
                --------------------------------------------------------------------- */}
            <div
              className="flex items-center h-8 bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg shadow-xs divide-x divide-[#D6D4C8] dark:divide-[#3E3D32]"
              role="group"
              aria-label={t("分析与操作")}
            >
              {/* History: Undo / Redo */}
              <div className="flex items-center px-0.5">
                <button
                  disabled={!canUndo}
                  onClick={() => { soundEngine?.playClick?.(500); undo?.(); }}
                  className={`h-7 w-7 flex items-center justify-center rounded transition ${canUndo ? 'text-[#272822] dark:text-[#F8F8F2] hover:bg-[#3E3D32]/15 dark:hover:bg-[#3E3D32]' : 'text-[#75715E]/40 cursor-not-allowed'}`}
                  title={t("撤销透视配置 (⌘Z / Ctrl+Z)")}
                  aria-label={t("撤销")}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={!canRedo}
                  onClick={() => { soundEngine?.playClick?.(580); redo?.(); }}
                  className={`h-7 w-7 flex items-center justify-center rounded transition ${canRedo ? 'text-[#272822] dark:text-[#F8F8F2] hover:bg-[#3E3D32]/15 dark:hover:bg-[#3E3D32]' : 'text-[#75715E]/40 cursor-not-allowed'}`}
                  title={t("重做透视配置 (⌘Y / Ctrl+Y / ⌘⇧Z)")}
                  aria-label={t("重做")}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Command Palette — always available for power users */}
              <button
                onClick={() => { soundEngine?.playClick(640); setShowCommandPalette(true); setCommandQuery(''); }}
                className={`h-full flex items-center gap-1.5 px-2 hover:bg-[#3E3D32]/10 dark:hover:bg-[#3E3D32]/50 text-[11px] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] apple-transition ${!hasDataset ? 'rounded-r-lg' : ''}`}
                title={t("打开全局指令面板 (⌘K / Ctrl+K)")}
                aria-label={`${t('指令')} ⌘K · ${t('打开指令面板')}`}
              >
                <Search className="w-3.5 h-3.5 text-ink-cyan" />
                <span className="hidden md:inline font-medium text-[11px]">{t("指令")}</span>
                <kbd aria-hidden="true" className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] text-[9px] font-semibold text-ink-pink border border-[#D6D4C8] dark:border-[#49483E] apple-font-mono hidden sm:inline">⌘K</kbd>
              </button>

              {/* Format — only after data is loaded */}
              {hasDataset && (
                <button
                  onClick={() => { soundEngine?.playClick(580); setActiveFormatModal(true); }}
                  className="h-full flex items-center gap-1.5 px-2.5 rounded-r-lg hover:bg-[#FD971F]/10 text-[#272822] dark:text-[#F8F8F2] text-[11px] font-medium apple-transition"
                  title={t("数值格式、条件高亮与千分位设置")}
                >
                  <Palette className="w-3.5 h-3.5 text-ink-orange" />
                  <span>{t("格式与数值")}</span>
                </button>
              )}
            </div>

            {/* ---------------------------------------------------------------------
                CLUSTER 3: 更多 — workspace / demo stay available without crowding the bar
                --------------------------------------------------------------------- */}
            {hasDataset && (
              <div ref={moreMenuRef} className="relative flex items-center h-8">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                  onClick={() => { soundEngine?.playClick?.(520); setExportMenuOpen(false); setMoreMenuOpen((open) => !open); }}
                  className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[11px] font-semibold apple-transition ${
                    moreMenuOpen || keynotePlaying || cinemaTheaterMode
                      ? 'text-ink-pink border-[#F92672]/40 bg-[#F92672]/10'
                      : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                  title={t("工作区、演示与更多")}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span>{t("更多")}</span>
                  <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreMenuOpen && (
                  <ToolbarMenu anchorRef={moreMenuRef} label={t('更多操作')} darkMode={darkMode} minWidth={180} onClose={()=>setMoreMenuOpen(false)}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { soundEngine?.playClick(600); setShowWorkspaceModal(true); setMoreMenuOpen(false); }}
                      className="w-full h-8 px-2.5 rounded-lg text-left text-[11px] font-semibold text-ink-pink hover:bg-[#F92672]/10 inline-flex items-center gap-2 transition"
                      title={t("本地工作区快照、演示角色与分享配置")}
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("工作区 ·") + ' '}{currentUser.name.split(' ')[0]}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!currentDataset) onEnsureDatasetLoaded?.();
                        const nextState = !keynotePlaying;
                        setKeynotePlaying(nextState);
                        if (nextState) {
                          soundEngine?.playToggle ? soundEngine.playToggle(true) : soundEngine?.playClick?.(600);
                          applyKeynoteShot(keynoteShotIdx);
                          showToast?.('已开始演示播放');
                        } else {
                          soundEngine?.playToggle ? soundEngine.playToggle(false) : soundEngine?.playClick?.(440);
                          showToast?.('已暂停演示');
                        }
                        setMoreMenuOpen(false);
                      }}
                      className="w-full h-8 px-2.5 rounded-lg text-left text-[11px] font-semibold text-[#272822] dark:text-[#F8F8F2] hover:bg-[#3E3D32]/10 inline-flex items-center gap-2 transition"
                      title={t("播放 / 暂停演示")}
                    >
                      <Film className="w-3.5 h-3.5 text-ink-pink shrink-0" />
                      <span>{keynotePlaying ? `${t("演示")} [${activeKeynoteShot.number}]` : t("演示")}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!currentDataset) onEnsureDatasetLoaded?.();
                        soundEngine?.playWhoosh ? soundEngine.playWhoosh() : soundEngine?.playClick?.(560);
                        setCinemaTheaterMode((p) => !p);
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-lg text-left text-[11px] font-semibold inline-flex items-center gap-2 transition ${
                        cinemaTheaterMode ? 'bg-[#A6E22E]/20 text-[#1E1F1C] dark:text-ink-green' : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] hover:bg-[#3E3D32]/10'
                      }`}
                      title={t("切换演示舞台模式 (快捷键: T)")}
                    >
                      <span>{t("演示舞台")}</span>
                    </button>
                  </ToolbarMenu>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------------------
                CLUSTER 4: 系统与环境偏好 (System & Environment Preferences)
                Consolidating Language, Theme mode, Theme quick-toggle & Audio feedback
                --------------------------------------------------------------------- */}
            <div
              className="flex items-center h-8 bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg shadow-xs divide-x divide-[#D6D4C8] dark:divide-[#3E3D32]"
              role="group"
              aria-label={t("环境偏好")}
            >
              {/* Language Selection */}
              <div className="flex items-center px-1">
                <select
                  aria-label={t('界面语言')}
                  value={locale}
                  onChange={(event) => onLocaleChange(event.target.value)}
                  className="h-7 text-[11px] font-medium apple-font-mono bg-transparent text-[#272822] dark:text-[#F8F8F2] px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#66D9EF]/40 cursor-pointer"
                >
                  <option value="zh" className="bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]">中文</option>
                  <option value="en" className="bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]">English</option>
                </select>
              </div>

              {/* Theme Selection Dropdown */}
              <div className="flex items-center px-1">
                <select
                  aria-label={t('主题模式')}
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className="h-7 text-[11px] font-medium apple-font-mono bg-transparent text-[#272822] dark:text-[#F8F8F2] px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#66D9EF]/40 cursor-pointer"
                >
                  <option value="system" className="bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]">{t('跟随系统')}</option>
                  <option value="light" className="bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]">{t('浅色')}</option>
                  <option value="dark" className="bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2]">{t('深色')}</option>
                </select>
              </div>

              {/* Quick Sound Engine Toggle */}
              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) {
                    if (soundEngine) soundEngine.enabled = true;
                    soundEngine?.playPop?.();
                  }
                }}
                title={soundEnabled ? '微交互声效已开启 (点击静音)' : '微交互声效已静音 (点击开启)'}
                aria-label={soundEnabled ? '关闭声效' : '开启声效'}
                className="tactile-btn h-full w-8 flex items-center justify-center hover:bg-[#3E3D32]/15 text-[#272822] dark:text-[#F8F8F2] transition"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-ink-green" /> : <VolumeX className="w-3.5 h-3.5 text-ink-muted" />}
              </button>

              {/* Quick Theme Toggle Button (Sun / Moon) */}
              <button
                onClick={() => { soundEngine?.playClick(480); setDarkMode((prev) => !prev); }}
                title={darkMode ? '当前：Monokai Pro Dark (点击切换暖纸浅色)' : '当前：Monokai Light (点击切换经典暗色)'}
                className="tactile-btn h-full w-8 flex items-center justify-center rounded-r-lg hover:bg-[#3E3D32]/15 text-[#272822] dark:text-[#F8F8F2] transition"
                aria-label={t("切换主题")}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-ink-yellow" /> : <Moon className="w-3.5 h-3.5 text-ink-purple" />}
              </button>
            </div>

          </div>

          {/* Only show scroll affordance when the decluttered toolbar actually overflows. */}
          {toolbarOverflows && (
            <button
              type="button"
              onClick={scrollToolbar}
              aria-label={t("更多工具，滚动到末尾后返回开头")}
              title={t("查看更多工具")}
              className="h-8 w-8 shrink-0 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] flex items-center justify-center text-ink-cyan hover:border-[#66D9EF] shadow-xs transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          KEYNOTE DIRECTOR STAGE HUD
          ========================================================================= */}
      {(keynotePlaying || cinemaTheaterMode) && (
        <div className="ps-dark-surface bg-[#191A17] text-[#F8F8F2] px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#3E3D32] flex flex-col gap-2 animate-apple-stage print:hidden relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded bg-action text-[#F8F8F2] text-[10px] apple-font-mono font-bold tracking-wider uppercase shadow-sm shrink-0">
                {t("场景")} {activeKeynoteShot.number}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-tight flex items-center gap-2 flex-wrap">
                  <span className="text-ink-yellow apple-font-mono">{activeKeynoteShot.title}</span>
                  {/* Action buttons inside Stage HUD */}
                  <div className="inline-flex items-center gap-1 ml-1 text-[10px] apple-font-mono">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        soundEngine?.playClick?.(540);
                        setEditShotForm({ title: activeKeynoteShot.title, subtitle: activeKeynoteShot.subtitle || '' });
                        setIsEditingShot(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-ink-muted hover:text-[#F8F8F2] flex items-center gap-0.5 transition"
                      title={t("编辑当前分析笔记标题与结论")}
                    >
                      <Pencil className="w-2.5 h-2.5 text-ink-cyan" />
                      <span>{t("编辑结论")}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        soundEngine?.playClick?.(540);
                        const insight = unifiedChartSpec?.executiveInsight;
                        setNewShotForm({
                          title: `${t('分析笔记')} ${effectiveStoryShots.length + 1}`,
                          subtitle: insight
                            ? `${t('最高')}：${insight.topName} (${insight.topFormatted}) · ${insight.groupCount} ${t('组')}`
                            : t('当前透视与图表视图'),
                        });
                        setIsSavingNewShot(true);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#AE81FF]/50 text-ink-purple hover:text-[#F8F8F2] flex items-center gap-0.5 transition"
                      title={t("将当前视图保存为分析笔记")}
                    >
                      <Plus className="w-2.5 h-2.5 text-ink-purple" />
                      <span>{t("存为笔记")}</span>
                    </button>

                    {effectiveStoryShots.length > 1 && (
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onDeleteStoryShot?.(keynoteShotIdx)}
                        className="p-1 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-ink-muted hover:text-ink-pink transition"
                        title={t("删除当前分析笔记")}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => onResetStoryShots?.()}
                      className="p-1 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-ink-muted hover:text-ink-yellow transition"
                      title={t("恢复为推荐分析场景")}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[10.5px] text-ink-muted apple-font-mono mt-0.5 truncate max-w-2xl">{activeKeynoteShot.subtitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Play / Pause toggle right in stage HUD */}
              <button
                onClick={() => {
                  const nextState = !keynotePlaying;
                  setKeynotePlaying(nextState);
                  if (nextState) {
                    soundEngine?.playToggle ? soundEngine.playToggle(true) : soundEngine?.playClick?.(600);
                    applyKeynoteShot(keynoteShotIdx);
                    showToast?.('已开始演示播放');
                  } else {
                    soundEngine?.playToggle ? soundEngine.playToggle(false) : soundEngine?.playClick?.(440);
                    showToast?.('已暂停演示');
                  }
                }}
                className={`p-1.5 rounded border apple-font-mono transition tactile-btn ${keynotePlaying ? 'bg-action text-[#F8F8F2] border-[#F92672]' : 'bg-[#272822] text-ink-green border-[#49483E] hover:border-[#A6E22E]'}`}
                title={keynotePlaying ? t("暂停自动播放") : t("自动播放")}
              >
                {keynotePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  soundEngine?.playWhoosh ? soundEngine.playWhoosh() : soundEngine?.playClick?.(520);
                  applyKeynoteShot(keynoteShotIdx - 1);
                }}
                className="p-1.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-[#F8F8F2] transition tactile-btn"
                title={t("上一场景 (快捷键: [)")}
              >
                <SkipBack className="w-3.5 h-3.5 text-ink-cyan" />
              </button>
              <div className="flex items-center gap-1.5 px-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                {effectiveStoryShots.map((s, idx) => (
                  <button
                    key={s.id || `shot_${idx}`}
                    onClick={() => {
                      soundEngine?.playPop ? soundEngine.playPop() : soundEngine?.playClick?.(540);
                      applyKeynoteShot(idx);
                    }}
                    title={`${s.number} · ${s.title}`}
                    className={`w-7 h-7 rounded-lg text-xs font-bold apple-font-mono transition tactile-btn flex items-center justify-center border shrink-0 ${keynoteShotIdx === idx ? 'bg-action text-[#F8F8F2] border-[#F92672] shadow-sm' : 'bg-[#272822] text-ink-muted border-[#49483E] hover:text-[#F8F8F2] hover:border-[#66D9EF]'}`}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  soundEngine?.playWhoosh ? soundEngine.playWhoosh() : soundEngine?.playClick?.(520);
                  applyKeynoteShot(keynoteShotIdx + 1);
                }}
                className="p-1.5 rounded bg-[#272822] hover:bg-[#3E3D32] border border-[#49483E] text-[#F8F8F2] transition tactile-btn"
                title={t("下一场景 (快捷键: ])")}
              >
                <SkipForward className="w-3.5 h-3.5 text-ink-cyan" />
              </button>
            </div>
          </div>
          {keynotePlaying && (
            <div className="w-full bg-[#272822] h-1 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F92672] via-[#FD971F] to-[#A6E22E] transition-all duration-100 ease-linear" style={{ width: `${shotProgressPct}%` }} />
            </div>
          )}
        </div>
      )}

      <StoryShotDialog
        mode={isEditingShot ? 'edit' : isSavingNewShot ? 'save' : null}
        number={activeKeynoteShot.number}
        form={isEditingShot ? editShotForm : newShotForm}
        setForm={isEditingShot ? setEditShotForm : setNewShotForm}
        currentInsight={unifiedChartSpec?.executiveInsight}
        unifiedChartSpec={unifiedChartSpec}
        onClose={() => {setIsEditingShot(false);setIsSavingNewShot(false);}}
        onSubmit={() => {
          if(isEditingShot)onUpdateStoryShot?.(keynoteShotIdx,editShotForm);
          else onSaveCurrentViewAsShot?.(newShotForm.title,newShotForm.subtitle);
          setIsEditingShot(false);setIsSavingNewShot(false);
        }}
      />
    </>
  );
}
