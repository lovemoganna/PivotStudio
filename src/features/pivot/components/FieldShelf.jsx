import { t } from '../../../i18n.js';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload, Globe, Server, Zap, GripVertical, ArrowUp, ArrowDown,
  ArrowUpDown, Filter, RotateCcw, Sparkles, Code2, X, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Search, PanelLeft, Layers, Info
} from 'lucide-react';
import { FIELD_TYPES, AGG_METHODS, VISUAL_CHART_TYPES, SHOW_AS_MODES } from '../../../constants/pivotConstants';
import { getDimDisplayLabel } from '../../../utils/formatters';
import { SmartTemplatesBar } from './SmartTemplatesBar';
import { FieldProfilerModal } from './FieldProfilerModal';

export function FieldShelf({
  requestProfile,
  onPasteText,
  children,
  cinemaTheaterMode,
  isReadOnly,
  datasets,
  activeDatasetId,
  setActiveDatasetId,
  switchDataset,
  unloadCurrentDataset,
  currentDataset,
  setHighlightedRowKey,
  setHoveredCellTelemetry,
  setPivotConfig,
  handleFileUpload,
  uploadProgress,
  soundEngine,
  setActiveDataSourceModal,
  setUploadPreviewModal,
  draggingPayload,
  setDraggingPayload,
  dragOverZone,
  setDragOverZone,
  addFieldToZone,
  removeZoneItem,
  moveZoneItem,
  toggleDimensionSort,
  setHeaderFilterSearch,
  setActiveHeaderFilterModal,
  setBinFormState,
  setActiveBinModal,
  viewMode,
  setViewMode,
  chartType,
  setChartType,
  chartSpecConfig,
  setChartSpecConfig,
  pivotConfig,
  transposeRowsAndColumns,
  unifiedChartSpec,
  highlightedRowKey,
  pivotResult,
  showToast,
  toggleFieldRole,
  setCondFormat,
}) {
  const [showMobileSchema, setShowMobileSchema] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [fieldCategoryTab, setFieldCategoryTab] = useState('all'); // 'all' | 'dimension' | 'measure'
  const [profilingField, setProfilingField] = useState(null);

  const isFieldMeasure = (f) => (f.role ? f.role === 'measure' : f.type === 'number');

  const dimensionCount = useMemo(
    () => (currentDataset?.fields || []).filter((f) => !isFieldMeasure(f)).length,
    [currentDataset?.fields]
  );
  const measureCount = useMemo(
    () => (currentDataset?.fields || []).filter((f) => isFieldMeasure(f)).length,
    [currentDataset?.fields]
  );

  const filteredFields = useMemo(() => {
    let list = currentDataset?.fields || [];
    if (fieldSearchQuery.trim()) {
      const q = fieldSearchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (fieldCategoryTab === 'dimension') {
      list = list.filter((f) => !isFieldMeasure(f));
    } else if (fieldCategoryTab === 'measure') {
      list = list.filter((f) => isFieldMeasure(f));
    }
    return list;
  }, [currentDataset?.fields, fieldSearchQuery, fieldCategoryTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        const targetTag = e.target?.tagName?.toLowerCase();
        if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;
        e.preventDefault();
        setIsSidebarCollapsed((prev) => {
          const next = !prev;
          soundEngine?.playClick?.(520);
          showToast?.(next ? '已折叠左侧侧边栏，为主工作区释放宽度 (⌘B)' : '已展开左侧侧边栏 (⌘B)');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundEngine, showToast]);

  const zoneConfigs = [
    { key: 'filters', label: '筛选条件', badgeColor: 'text-[#4A7500] dark:text-[#A6E22E]', borderAccent: 'border-l-2 border-l-[#A6E22E]' },
    { key: 'columns', label: '列维度', badgeColor: 'text-[#0088A3] dark:text-[#66D9EF]', borderAccent: 'border-l-2 border-l-[#66D9EF]' },
    { key: 'rows', label: '行维度', badgeColor: 'text-[#F92672]', borderAccent: 'border-l-2 border-l-[#F92672]' },
    { key: 'values', label: '数值指标', badgeColor: 'text-[#C86400] dark:text-[#FD971F]', borderAccent: 'border-l-2 border-l-[#FD971F]' },
  ];

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-visible md:overflow-hidden relative">
        {/* Left Sidebar: Collapsible Schema Palette & Pivot Analysis Config */}
        {!cinemaTheaterMode && (
          isSidebarCollapsed ? (
            /* Desktop Collapsed Dock Bar (38px width) */
            <aside className="hidden md:flex w-10 h-full bg-[#EFECE1]/80 dark:bg-[#1E1F1C]/90 border-r border-[#D6D4C8] dark:border-[#3E3D32] flex-col items-center justify-between py-3 shrink-0 print:hidden transition-all duration-200 select-none">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick?.(500);
                    setIsSidebarCollapsed(false);
                    showToast?.('已展开左侧侧边栏 (⌘B)');
                  }}
                  className="p-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] hover:border-[#66D9EF] text-[#0088A3] dark:text-[#66D9EF] transition shadow-xs"
                  title={t("展开模型与配置侧栏 (快捷键: ⌘B / Ctrl+B)")}
                  aria-label={t("展开侧边栏")}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div
                  className="text-[11px] font-bold text-[#75715E] dark:text-[#908E80] tracking-widest cursor-pointer hover:text-[#272822] dark:hover:text-[#F8F8F2] transition"
                  style={{ writingMode: 'vertical-rl' }}
                  onClick={() => setIsSidebarCollapsed(false)}
                  title={t("点击展开侧边栏")}
                >{' ' + t("数据模型 · 透视结构") + ' '}</div>
              </div>

              {/* Mini Status Badges */}
              <div className="flex flex-col items-center gap-1.5 text-[9px] apple-font-mono font-semibold">
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E]" title={`筛选: ${pivotConfig.filters?.length || 0}`}>
                  {pivotConfig.filters?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#66D9EF]/20 text-[#0088A3] dark:text-[#66D9EF]" title={`列: ${pivotConfig.columns?.length || 0}`}>
                  {pivotConfig.columns?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#F92672]/20 text-[#F92672]" title={`行: ${pivotConfig.rows?.length || 0}`}>
                  {pivotConfig.rows?.length || 0}
                </span>
                <span className="w-5 h-5 rounded flex items-center justify-center bg-[#FD971F]/20 text-[#C86400] dark:text-[#FD971F]" title={`值: ${pivotConfig.values?.length || 0}`}>
                  {pivotConfig.values?.length || 0}
                </span>
              </div>
            </aside>
          ) : (
            /* Expanded Full Sidebar */
            <aside className="w-full md:w-80 lg:w-84 max-h-[310px] md:max-h-none md:h-full bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/80 border-r border-[#D6D4C8] dark:border-[#3E3D32] p-1.5 md:p-3 flex flex-col gap-1 md:gap-2.5 shrink-0 print:hidden overflow-y-auto transition-all duration-200">
              {/* Header: Title + Collapse Action (Hidden on mobile to keep compact) */}
              <div className="hidden md:flex items-center justify-between pb-1 border-b border-[#D6D4C8]/60 dark:border-[#3E3D32]/60">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0088A3] dark:text-[#66D9EF]" />
                  <span className="text-[11px] font-bold text-[#75715E] dark:text-[#908E80] apple-font-mono tracking-tight">{' ' + t("数据模型与透视配置") + ' '}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#4A7500] dark:text-[#A6E22E] apple-font-mono">
                    {(currentDataset?.rows?.length || 0).toLocaleString()}{' ' + t("行") + ' '}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine?.playClick?.(500);
                      setIsSidebarCollapsed(true);
                      showToast?.('已折叠左侧侧边栏，为主工作区释放宽度 (⌘B)');
                    }}
                    className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-[#75715E] dark:text-[#908E80] hover:text-[#F92672] hover:bg-black/5 dark:hover:bg-white/5 transition"
                    title={t("收起左侧模型侧边栏 (快捷键: ⌘B / Ctrl+B)")}
                    aria-label={t("收起侧边栏")}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{t("收起")}</span>
                  </button>
                </div>
              </div>

              {/* Dataset Ingestion & Selection */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label={t("选择当前数据集")}
                    value={activeDatasetId || ''}
                    onChange={(e) => {
                      soundEngine?.playClick(540);
                      const nextId = e.target.value;
                      if (!nextId) {
                        if (unloadCurrentDataset) {
                          unloadCurrentDataset();
                        } else {
                          setActiveDatasetId(null);
                        }
                        return;
                      }
                      if (switchDataset) {
                        switchDataset(nextId);
                      } else {
                        setActiveDatasetId(nextId);
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-1 md:py-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-xs font-medium text-[#272822] dark:text-[#E6DB74] apple-font-mono focus:outline-none focus:border-[#F92672]"
                  >
                    {datasets.length === 0 && (
                      <option value="">{t("-- 暂无数据集 --")}</option>
                    )}
                    {datasets.map((ds) => (
                      <option key={ds.id} value={ds.id} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">
                        {ds.name}
                      </option>
                    ))}
                    {datasets.length > 0 && (
                      <option value="">{t("-- 卸载当前视图 (返回介绍页) --")}</option>
                    )}
                  </select>
                  {unloadCurrentDataset && currentDataset && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine?.playClick(520);
                        unloadCurrentDataset();
                      }}
                      className="p-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] hover:border-[#F92672] text-[#75715E] hover:text-[#F92672] transition shrink-0"
                      title={t("卸载当前数据集，返回系统介绍主页")}
                      aria-label={t("卸载当前数据集")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <label className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 md:py-1.5 rounded-lg focus-within:ring-2 focus-within:ring-[#66D9EF] border border-dashed border-[#ACA99A] dark:border-[#75715E] bg-[#FFFDF7]/60 dark:bg-[#1E1F1C]/70 hover:border-[#F92672] dark:hover:border-[#F92672] cursor-pointer text-[10.5px] font-medium transition ${isReadOnly ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Upload className="w-3.5 h-3.5 text-[#F92672] shrink-0" />
                    <span className="truncate">{t("上传 CSV / Excel")}</span>
                    <input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={isReadOnly} />
                  </label>
                  <button
                    disabled={isReadOnly}
                    onClick={() => {
                      soundEngine?.playClick(580);
                      const sampleCsv = [
                        '订单日期,销售大区,城市,销售渠道,商品类别,商品名称,客户类型,销售额,销量,成本,毛利润,是否促销',
                        '2025-04-01,华东,上海,线上旗舰店,智能数码,降噪耳机 Pro,VIP黄金会员,35800,20,21480,14320,true',
                        '2025-04-05,华南,深圳,企业集采,办公外设,4K高清显示器,企业客户,91200,30,59280,31920,true',
                        '2025-04-12,华北,北京,抖音电商,潮流服饰,纯棉连帽卫衣,普通会员,36000,72,18000,18000,true',
                        '2025-04-18,西南,成都,线下自营店,智能家居,意式咖啡机,VIP黄金会员,49000,14,29400,19600,false',
                        '2025-04-22,华中,武汉,企业集采,办公外设,4K高清显示器,企业客户,66880,22,43472,23408,false',
                      ].join('\n');
                      onPasteText?.(sampleCsv);
                    }}
                    className="px-2 py-1 md:py-1.5 rounded-lg bg-[#A6E22E]/15 hover:bg-[#A6E22E]/25 border border-[#A6E22E]/35 text-[#4A7500] dark:text-[#A6E22E] text-[10px] font-semibold shrink-0 transition disabled:opacity-40 apple-font-mono"
                    title={t("无需本地文件，一键加载内置零售样例以体验字段类型推断与预览")}
                  >{' ' + t("样例预览") + ' '}</button>
                </div>

                {uploadProgress && (
                  <div className="p-2 rounded-lg bg-[#1E1F1C] border border-[#3E3D32] space-y-1 apple-font-mono">
                    <div className="flex justify-between text-[9px] text-[#66D9EF]">
                      <span>CHUNK {uploadProgress.currentChunk}/{uploadProgress.totalChunks}</span>
                      <span>{uploadProgress.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#272822] rounded-full overflow-hidden">
                      <div className="h-full bg-[#A6E22E] transition-all" style={{ width: `${uploadProgress.pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1 apple-font-mono">
                  <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('gsheet'); }} className="px-1.5 py-1 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[9.5px] font-medium flex items-center justify-center gap-1 transition">
                    <Globe className="w-2.5 h-2.5 text-[#66D9EF]" />
                    <span>GSheet</span>
                  </button>
                  <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('sql'); }} className="px-1.5 py-1 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#FD971F] text-[9.5px] font-medium flex items-center justify-center gap-1 transition">
                    <Server className="w-2.5 h-2.5 text-[#FD971F]" />
                    <span>{t("SQL代理")}</span>
                  </button>
                  <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('bigdata'); }} className="px-1.5 py-1 rounded-md bg-[#AE81FF]/15 text-[#6B38FB] dark:text-[#AE81FF] border border-[#AE81FF]/35 hover:bg-[#AE81FF]/25 text-[9.5px] font-semibold flex items-center justify-center gap-1 transition">
                    <Zap className="w-2.5 h-2.5 text-[#AE81FF]" />
                    <span>{t("100K压测")}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Accordion Toggle for Field Schema */}
              <div className="md:hidden border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-0.5">
                <button
                  type="button"
                  aria-expanded={showMobileSchema}
                  aria-controls="pivot-schema-fields"
                  onClick={() => setShowMobileSchema((expanded) => !expanded)}
                  className="w-full rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-2.5 py-1 text-left text-[11px] font-semibold flex items-center justify-between"
                >
                  <span>{t("字段列表（")}{currentDataset?.fields?.length || 0}）</span>
                  <span className="text-[#0088A3] dark:text-[#66D9EF]">{showMobileSchema ? t("收起") : t("展开")}</span>
                </button>
              </div>

              {/* Middle Section: Schema Field Palette */}
              <div
                id="pivot-schema-fields"
                className={`${showMobileSchema ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-[140px] border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-2`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold tracking-tight apple-font-mono">{' ' + t("可用字段 (")}{filteredFields.length}/{currentDataset?.fields?.length || 0})
                  </span>
                  <span className="text-[9.5px] text-[#75715E] dark:text-[#908E80] apple-font-mono">{t("拖拽或点击")}</span>
                </div>

                {/* Field Search & Category Filter */}
                <div className="space-y-1 mb-1.5 shrink-0">
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#75715E] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      aria-label={t("搜索可用字段名称")}
                      value={fieldSearchQuery}
                      onChange={(e) => setFieldSearchQuery(e.target.value)}
                      placeholder={t("搜索字段名称...")}
                      className="w-full pl-6 pr-5 py-1 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10.5px] placeholder-[#75715E] text-[#272822] dark:text-[#F8F8F2] focus:outline-none focus:border-[#66D9EF] apple-font-mono"
                    />
                    {fieldSearchQuery && (
                      <button
                        onClick={() => setFieldSearchQuery('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-[#75715E] hover:text-[#F92672]"
                        aria-label={t("清空搜索")}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  {/* Tabs: 全部 / 维度 / 度量 */}
                  <div className="flex rounded-md p-0.5 bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] text-[9.5px] apple-font-mono">
                    <button
                      onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('all'); }}
                      className={`flex-1 py-0.5 rounded text-center font-medium transition ${fieldCategoryTab === 'all' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#F8F8F2] shadow-2xs' : 'text-[#75715E] hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
                    >{' ' + t("全部 (")}{currentDataset?.fields?.length || 0})
                    </button>
                    <button
                      onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('dimension'); }}
                      className={`flex-1 py-0.5 rounded text-center font-medium transition ${fieldCategoryTab === 'dimension' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#0088A3] dark:text-[#66D9EF] shadow-2xs' : 'text-[#75715E] hover:text-[#0088A3] dark:hover:text-[#66D9EF]'}`}
                    >{' ' + t("维度 (")}{dimensionCount})
                    </button>
                    <button
                      onClick={() => { soundEngine?.playClick?.(480); setFieldCategoryTab('measure'); }}
                      className={`flex-1 py-0.5 rounded text-center font-medium transition ${fieldCategoryTab === 'measure' ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#C86400] dark:text-[#FD971F] shadow-2xs' : 'text-[#75715E] hover:text-[#C86400] dark:hover:text-[#FD971F]'}`}
                    >{' ' + t("度量 (")}{measureCount})
                    </button>
                  </div>
                </div>

                {/* Draggable Field Items */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-[90px] max-h-[190px] md:max-h-[220px]">
                  {filteredFields.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#75715E] apple-font-mono space-y-1">
                      <p>{t("无匹配字段")}</p>
                      {fieldSearchQuery && (
                        <button
                          onClick={() => setFieldSearchQuery('')}
                          className="text-[10px] text-[#66D9EF] hover:underline"
                        >{' ' + t("清空搜索条件") + ' '}</button>
                      )}
                    </div>
                  ) : (
                    filteredFields.map((field) => {
                      const isMeasure = isFieldMeasure(field);
                      const typeCfg = FIELD_TYPES[field.type] || FIELD_TYPES.text;
                      const TypeIcon = typeCfg.icon;
                      return (
                        <div
                          key={field.name}
                          data-testid={`field-${field.name}`}
                          draggable={!isReadOnly}
                          onDragStart={(event) => {
                            const payload = { source: 'fieldList', field: field.name };
                            event.dataTransfer.effectAllowed = 'copyMove';
                            event.dataTransfer.setData('application/x-pivot-field',JSON.stringify(payload));
                            event.dataTransfer.setData('text/plain',field.name);
                            setDraggingPayload(payload);
                          }}
                          onDragEnd={() => { setDraggingPayload(null); setDragOverZone(null); }}
                          onClick={(e) => {
                            if (e.target.tagName.toLowerCase() !== 'button') {
                              soundEngine?.playClick?.(540);
                              if (isMeasure) {
                                addFieldToZone('values', field.name);
                                showToast?.(`已添加「${field.name}」到数值指标`);
                              } else {
                                addFieldToZone('rows', field.name);
                                showToast?.(`已添加「${field.name}」到行维度`);
                              }
                            }
                          }}
                          className="group p-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C]/90 hover:border-[#F92672]/60 dark:hover:border-[#66D9EF]/60 flex items-center justify-between gap-1 cursor-pointer apple-transition select-none text-[11px]"
                          title={`点击快速添加至${isMeasure ? '指标' : '行维度'} · 拖拽自由配置`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine?.playClick?.(620);
                                toggleFieldRole?.(field.name);
                              }}
                              className={`p-1 rounded border ${typeCfg.color} shrink-0 hover:scale-105 transition`}
                              title={`当前分析角色: ${isMeasure ? '度量 (数值/聚合)' : '维度 (分类/分组)'}，点击快速切换角色`}
                              aria-label={`切换${field.name}角色`}
                            >
                              <TypeIcon className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-medium truncate max-w-[110px]">{field.name}</span>
                            {field.role && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[#75715E] shrink-0">
                                {field.role === 'measure' ? t("度量") : t("维度")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0 apple-font-mono text-[8.5px]">
                            <button onClick={(e) => { e.stopPropagation(); addFieldToZone('rows', field.name); }} className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#F92672] hover:text-[#F8F8F2] font-semibold transition" title={t("添加到行维度")}>{t("+行")}</button>
                            <button onClick={(e) => { e.stopPropagation(); addFieldToZone('columns', field.name); }} className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#66D9EF] hover:text-[#1E1F1C] font-semibold transition" title={t("添加到列维度")}>{t("+列")}</button>
                            <button onClick={(e) => { e.stopPropagation(); addFieldToZone('values', field.name); }} className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#FD971F] hover:text-[#1E1F1C] font-semibold transition" title={t("添加到数值指标")}>{t("+值")}</button>
                            <button onClick={(e) => { e.stopPropagation(); addFieldToZone('filters', field.name); }} className="px-1 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#A6E22E] hover:text-[#1E1F1C] font-semibold transition" title={t("添加到筛选条件")}>{t("+筛")}</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Mobile Accordion Toggle for Pivot Analysis Config */}
              <div className="md:hidden border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-0.5">
                <button
                  type="button"
                  aria-expanded={showMobileConfig}
                  aria-controls="pivot-analysis-config"
                  onClick={() => setShowMobileConfig((expanded) => !expanded)}
                  className="w-full rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-2.5 py-1 text-left text-[11px] font-semibold flex items-center justify-between"
                >
                  <span>{t("分析配置 · 行 / 列 / 值 / 筛选")}</span>
                  <span className="text-[#0088A3] dark:text-[#66D9EF]">{showMobileConfig ? t("收起") : t("展开")}</span>
                </button>
              </div>

              {/* Bottom Section: 4 Pivot Placement Drop Zones (Moved to Left Sidebar) */}
              <section
                id="pivot-analysis-config"
                className={`${showMobileConfig ? 'flex' : 'hidden'} md:flex flex-col border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-2 shrink-0`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold tracking-tight apple-font-mono text-[#75715E] dark:text-[#908E80]">{' ' + t("透视结构放置区") + ' '}</span>
                  <button
                    disabled={isReadOnly}
                    onClick={transposeRowsAndColumns}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#FD971F] hover:text-[#FD971F] text-[9px] font-semibold transition disabled:opacity-40"
                    title={t("一键互换行维度与列维度 (快捷键: R)")}
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-[#FD971F]" />
                    <span>{t("行列互换")}</span>
                  </button>
                </div>

                {/* 2×2 Drop Zones Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {zoneConfigs.map((z) => {
                    const items = pivotConfig[z.key] || [];
                    const isOver = dragOverZone === z.key;
                    return (
                      <div
                        key={z.key}
                        data-testid={`zone-${z.key}`}
                        role="group" aria-label={t(z.label)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverZone(z.key); }}
                        onDragLeave={() => setDragOverZone(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverZone(null);
                          let payload = draggingPayload;
                          try { const serialized = e.dataTransfer.getData('application/x-pivot-field'); if (serialized) payload = JSON.parse(serialized); } catch { /* Ignore unrelated external drags. */ }
                          if (!currentDataset?.fields?.some((field) => field.name === payload?.field)) return;
                          if (payload?.field) {
                            if (payload.source && payload.source !== 'fieldList' && payload.source !== z.key && payload.itemId) {
                              const targetList = pivotConfig[z.key] || [];
                              const fMeta = currentDataset?.fields?.find((f) => f.name === payload.field);
                              if (z.key !== 'values' && fMeta?.type !== 'date' && targetList.some((it) => it.field === payload.field)) {
                                showToast?.(`目标区域已存在「${payload.field}」`, 'error');
                                setDraggingPayload(null);
                                return;
                              }
                            }
                            if (payload.source !== z.key) {
                              addFieldToZone(z.key, payload.field, payload);
                            }
                          }
                          setDraggingPayload(null);
                        }}
                        className={`min-h-[85px] max-h-[145px] p-1.5 rounded-lg border ${z.borderAccent} apple-specular-card apple-transition flex flex-col gap-1 overflow-hidden ${
                          isOver
                            ? 'border-[#F92672] bg-[#F92672]/10 scale-[1.01]'
                            : 'border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7]/90 dark:bg-[#1E1F1C]/90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold apple-font-mono shrink-0">
                          <span className={z.badgeColor}>{t(z.label)}</span>
                          <span className="text-[#75715E] dark:text-[#908E80]">[{items.length}]</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                          {items.length === 0 ? (
                            <span className="text-[9.5px] text-[#75715E] italic block py-2 text-center apple-font-mono">{' ' + t("/* 拖拽至此 */") + ' '}</span>
                          ) : (
                            items.map((it, itemIdx) => {
                              const fMeta = currentDataset?.fields?.find((f) => f.name === it.field);
                              const isFiltered =
                                z.key === 'filters'
                                  ? (it.selectedValues && it.selectedValues.length > 0)
                                  : (it.excludedValues && it.excludedValues.length > 0);
                              return (
                                <div
                                  key={it.id}
                                  draggable={!isReadOnly}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    const payload = { source: z.key, field: it.field, itemId: it.id, index: itemIdx };
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('application/x-pivot-field',JSON.stringify(payload));
                                    e.dataTransfer.setData('text/plain',it.field);
                                    setDraggingPayload(payload);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingPayload(null);
                                    setDragOverZone(null);
                                  }}
                                  className="flex items-center justify-between gap-1 p-1 rounded bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xs text-[9.5px] font-medium cursor-grab active:cursor-grabbing hover:border-[#F92672] transition"
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <GripVertical className="w-2.5 h-2.5 text-[#75715E] shrink-0" />
                                    <span
                                      className="truncate max-w-[55px] text-[#272822] dark:text-[#F8F8F2]"
                                      title={z.key === 'rows' || z.key === 'columns' ? getDimDisplayLabel(it) : it.field}
                                    >
                                      {z.key === 'rows' || z.key === 'columns' ? getDimDisplayLabel(it) : it.field}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {z.key === 'filters' && (
                                      <button
                                        onClick={() => {
                                          setHeaderFilterSearch('');
                                          setActiveHeaderFilterModal({ zone: 'filters', dim: it });
                                        }}
                                        className={`px-1 py-0.2 rounded text-[8.5px] font-semibold apple-font-mono transition ${
                                          isFiltered
                                            ? 'bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E] border border-[#A6E22E]/30'
                                            : 'bg-black/[0.05] dark:bg-[#3E3D32] text-[#75715E] dark:text-[#908E80] hover:text-[#66D9EF]'
                                        }`}
                                        title={isFiltered ? `已选${it.selectedValues.length}项` : '全部'}
                                      >
                                        {isFiltered ? `${it.selectedValues.length}项` : t("全部")}
                                      </button>
                                    )}

                                    {z.key === 'values' && (
                                      <div className="flex items-center gap-0.5">
                                        <select
                                          disabled={isReadOnly}
                                          value={it.agg}
                                          onChange={(e) => {
                                            const nextAgg = e.target.value;
                                            setPivotConfig((prev) => ({
                                              ...prev,
                                              values: prev.values.map((v) => (v.id === it.id ? { ...v, agg: nextAgg } : v)),
                                            }));
                                          }}
                                          className="bg-transparent text-[#C86400] dark:text-[#FD971F] apple-font-mono font-bold focus:outline-none cursor-pointer disabled:opacity-40 text-[9px]"
                                          title={t("切换聚合口径")}
                                          aria-label={t("切换聚合口径")}
                                        >
                                          {AGG_METHODS.map((m) => (
                                            <option key={m.value} value={m.value} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t(m.short)}</option>
                                          ))}
                                        </select>
                                        <select
                                          disabled={isReadOnly}
                                          value={it.showAs || 'normal'}
                                          onChange={(e) => {
                                            const nextShowAs = e.target.value;
                                            setPivotConfig((prev) => ({
                                              ...prev,
                                              values: prev.values.map((v) => (v.id === it.id ? { ...v, showAs: nextShowAs } : v)),
                                            }));
                                          }}
                                          className={`text-[8px] rounded px-0.5 py-0.2 apple-font-mono font-semibold focus:outline-none cursor-pointer disabled:opacity-40 border transition ${
                                            it.showAs && it.showAs !== 'normal'
                                              ? 'bg-[#AE81FF]/20 text-[#6B38FB] dark:text-[#AE81FF] border-[#AE81FF]/40'
                                              : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#75715E] dark:text-[#908E80] border-transparent'
                                          }`}
                                          title={t("快捷表计算 (普通值 / 占总计% / 占行% / 占列% / 环比差 / 环比增长率 / 累计求和)")}
                                          aria-label={t("快捷表计算")}
                                        >
                                          <option value="normal" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("普通")}</option>
                                          <option value="pct_grand" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%总计")}</option>
                                          <option value="pct_row" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%行")}</option>
                                          <option value="pct_col" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("%列")}</option>
                                          <option value="prev_diff" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("环比差")}</option>
                                          <option value="pct_prev_diff" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("环比%")}</option>
                                          <option value="running_total" className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t("累计Σ")}</option>
                                        </select>
                                      </div>
                                    )}

                                    {(z.key === 'rows' || z.key === 'columns') && (fMeta?.type === 'date' || fMeta?.type === 'number') && (
                                      <button
                                        disabled={isReadOnly}
                                        onClick={() => {
                                          setBinFormState(it.numberBin || { start: 0, step: 50000 });
                                          setActiveBinModal({ zone: z.key, item: it, fieldType: fMeta.type });
                                        }}
                                        className="px-1 rounded bg-[#66D9EF]/15 text-[#0088A3] dark:text-[#66D9EF] text-[8.5px] hover:underline disabled:opacity-40 apple-font-mono"
                                        title={t("分组设置")}
                                      >{' ' + t("组") + ' '}</button>
                                    )}

                                    {(z.key === 'rows' || z.key === 'columns') && (
                                      <button
                                        onClick={() => toggleDimensionSort(z.key, it.id)}
                                        className={`hover:text-[#F92672] transition ${it.sort && it.sort !== 'none' ? 'text-[#F92672]' : 'text-[#75715E]'}`}
                                        title={`维度排序: ${it.sort === 'asc' ? '升序' : it.sort === 'desc' ? '降序' : '默认'}`}
                                        aria-label={t("排序")}
                                      >
                                        {it.sort === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : it.sort === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUpDown className="w-2.5 h-2.5" />}
                                      </button>
                                    )}

                                    {(z.key === 'rows' || z.key === 'columns' || z.key === 'filters') && (
                                      <button
                                        onClick={() => {
                                          setHeaderFilterSearch('');
                                          setActiveHeaderFilterModal({ zone: z.key, dim: it });
                                        }}
                                        className={`hover:text-[#A6E22E] transition ${isFiltered ? 'text-[#A6E22E]' : 'text-[#75715E]'}`}
                                        title={t("勾选筛选值")}
                                        aria-label={t("筛选值")}
                                      >
                                        <Filter className="w-2.5 h-2.5" />
                                      </button>
                                    )}

                                    {!isReadOnly && items.length > 1 && (
                                      <span className="inline-flex items-center text-[8.5px] text-[#75715E]">
                                        {itemIdx > 0 && (
                                          <button onClick={() => moveZoneItem(z.key, itemIdx, -1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2]" title={t("前移")}>←</button>
                                        )}
                                        {itemIdx < items.length - 1 && (
                                          <button onClick={() => moveZoneItem(z.key, itemIdx, 1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2]" title={t("后移")}>→</button>
                                        )}
                                      </span>
                                    )}

                                    {!isReadOnly && (
                                      <button
                                        onClick={() => removeZoneItem(z.key, it.id)}
                                        className="text-[#75715E] hover:text-[#F92672]"
                                        title={t("移除字段")}
                                        aria-label={t("移除字段")}
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          )
        )}

        {/* Main Work Area: Full width when collapsed, 100% clean vertical space */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-visible md:overflow-hidden">
          {/* Top Control Bar: View Mode, Chart Type, Subtotals, Sticky Headers, Insights */}
          <div className="bg-[#EFECE1]/75 dark:bg-[#22231E] border-b border-[#D6D4C8] dark:border-[#3E3D32] px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {/* Expand Sidebar Quick Button when collapsed */}
              {isSidebarCollapsed && !cinemaTheaterMode && (
                <button
                  onClick={() => {
                    soundEngine?.playClick?.(500);
                    setIsSidebarCollapsed(false);
                    showToast?.('已展开左侧侧边栏 (⌘B)');
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-xs font-semibold text-[#0088A3] dark:text-[#66D9EF] transition shadow-xs"
                  title={t("展开左侧模型与透视配置侧边栏 (快捷键: ⌘B / Ctrl+B)")}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span>{t("展开侧边栏")}</span>
                  <span className="text-[10px] text-[#75715E] dark:text-[#908E80] apple-font-mono">⌘B</span>
                </button>
              )}

              {/* View Mode Toggle */}
              <div className="inline-flex rounded-lg bg-[#D6D4C8]/60 dark:bg-[#1E1F1C] border border-transparent dark:border-[#3E3D32] p-0.5 apple-font-mono">
                {[
                  { id: 'table', label: '仅透视表' },
                  { id: 'split', label: '表图并列' },
                  { id: 'chart', label: '仅图表' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { soundEngine?.playClick(520); setViewMode(m.id); }}
                    aria-pressed={viewMode === m.id}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold transition ${viewMode === m.id ? 'bg-[#F92672] text-[#F8F8F2] shadow-sm' : 'text-[#75715E] dark:text-[#908E80] hover:text-[#272822] dark:hover:text-[#F8F8F2]'}`}
                  >
                    {t(m.label)}
                  </button>
                ))}
              </div>

              {/* Chart Type Selector */}
              <select
                aria-label={t("选择图表类型")}
                value={chartType}
                onChange={(e) => { soundEngine?.playClick(560); setChartType(e.target.value); }}
                className="px-3 py-1 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#66D9EF] text-[10px] font-semibold apple-font-mono focus:outline-none focus:border-[#F92672]"
              >
                {VISUAL_CHART_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t(type.label)}</option>
                ))}
              </select>

              {/* Pivot Aggregation Options */}
              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] cursor-pointer px-2 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-[#3E3D32]/50">
                <input
                  type="checkbox"
                  aria-label={t("显示多级小计")}
                  checked={pivotConfig.showSubtotals}
                  onChange={(e) => setPivotConfig((p) => ({ ...p, showSubtotals: e.target.checked }))}
                  className="rounded accent-[#F92672]"
                />
                <span>{t("多级小计")}</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] cursor-pointer px-2 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-[#3E3D32]/50">
                <input
                  type="checkbox"
                  aria-label={t("冻结行表头")}
                  checked={chartSpecConfig.stickyRowHeaders}
                  onChange={(e) => setChartSpecConfig((p) => ({ ...p, stickyRowHeaders: e.target.checked }))}
                  className="rounded accent-[#F92672]"
                />
                <span>{t("冻结行表头")}</span>
              </label>

              <button
                disabled={isReadOnly}
                onClick={transposeRowsAndColumns}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#F92672] hover:text-[#F92672] text-[10px] font-medium transition disabled:opacity-40"
                title={t("一键互换行维度与列维度 (快捷键: R)")}
              >
                <RotateCcw className="w-2.5 h-2.5 text-[#FD971F]" />
                <span>{t("行列互换")}</span>
              </button>

              {unifiedChartSpec.executiveInsight && (
                <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E6DB74]/15 border border-[#E6DB74]/30 text-[#8A7900] dark:text-[#E6DB74] text-[10px] font-medium apple-font-mono">
                  <Sparkles className="w-3 h-3 text-[#FD971F] shrink-0" />
                  <span>
                    TOP_FOCUS: <strong>{unifiedChartSpec.executiveInsight.topName}</strong> ({unifiedChartSpec.executiveInsight.topFormatted} · {unifiedChartSpec.executiveInsight.sharePct}%)
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {highlightedRowKey && (
                <button
                  onClick={() => setHighlightedRowKey(null)}
                  className="px-2.5 py-0.5 rounded-md bg-[#AE81FF]/20 border border-[#AE81FF]/40 text-[#6B38FB] dark:text-[#AE81FF] text-[10px] font-semibold apple-font-mono"
                >
                  CLEAR_FOCUS: {highlightedRowKey.replace(/\|\|/g, ' / ')} ×
                </button>
              )}
              <button
                onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('bigdata'); }}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#A6E22E] text-[9px] text-[#75715E] dark:text-[#908E80] apple-font-mono transition"
                title={t("查看 DuckDB SQL 模板（当前不执行）")}
              >
                <Code2 className="w-3 h-3 text-[#A6E22E]" />
                <span>CUBE({pivotResult.rowConfigs.map((r) => r.field).join('×') || 'ALL'})</span>
              </button>
            </div>
          </div>

          {/* Main Work Content Area: Split Container with Table and Chart Studio */}
          {children}
        </main>
      </div>

      {/* Field Data Profiler Inspector Modal */}
      <FieldProfilerModal
        requestProfile={requestProfile}
        field={profilingField}
        currentDataset={currentDataset}
        onClose={() => setProfilingField(null)}
        addFieldToZone={addFieldToZone}
        soundEngine={soundEngine}
        isReadOnly={isReadOnly}
      />
    </>
  );
}
