import React, { useState } from 'react';
import {
  Upload, Globe, Server, Zap, GripVertical, ArrowUp, ArrowDown,
  ArrowUpDown, Filter, RotateCcw, Sparkles, Code2, X
} from 'lucide-react';
import { FIELD_TYPES, AGG_METHODS, VISUAL_CHART_TYPES } from '../../../constants/pivotConstants';
import { parseCSVTextToSheet } from '../../../utils/csvParser';
import { getDimDisplayLabel } from '../../../utils/formatters';

export function FieldShelf({
  children,
  cinemaTheaterMode,
  isReadOnly,
  datasets,
  activeDatasetId,
  setActiveDatasetId,
  switchDataset,
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
}) {
  const [showMobileSchema, setShowMobileSchema] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden relative">
        {/* Left Sidebar: Schema Field Palette & Data Ingestion */}
        {!cinemaTheaterMode && (
          <aside className="w-full lg:w-64 max-h-[310px] lg:max-h-none bg-[#EFECE1]/60 dark:bg-[#1E1F1C]/80 border-r border-[#D6D4C8] dark:border-[#3E3D32] p-3.5 flex flex-col gap-3 shrink-0 print:hidden overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#75715E] dark:text-[#908E80] apple-font-mono">
                  当前数据集
                </span>
                <span className="text-[11px] text-[#4A7500] dark:text-[#A6E22E] apple-font-mono">
                  {currentDataset.rows.length.toLocaleString()} records
                </span>
              </div>

              <select
                value={activeDatasetId}
                onChange={(e) => {
                  soundEngine?.playClick(540);
                  const nextId = e.target.value;
                  if (switchDataset) {
                    switchDataset(nextId);
                  } else {
                    setActiveDatasetId(nextId);
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-xs font-medium text-[#272822] dark:text-[#E6DB74] apple-font-mono focus:outline-none focus:border-[#F92672]"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">
                    {ds.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-1.5">
                <label className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg focus-within:ring-2 focus-within:ring-[#66D9EF] border border-dashed border-[#ACA99A] dark:border-[#75715E] bg-[#FFFDF7]/60 dark:bg-[#1E1F1C]/70 hover:border-[#F92672] dark:hover:border-[#F92672] cursor-pointer text-[11px] font-medium transition ${isReadOnly ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Upload className="w-3.5 h-3.5 text-[#F92672] shrink-0" />
                  <span className="truncate">上传 CSV / Excel</span>
                  <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload} className="hidden" disabled={isReadOnly} />
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
                    const sheet = parseCSVTextToSheet(sampleCsv, 'Retail_Sales_Sample.csv');
                    if (sheet) {
                      setUploadPreviewModal({
                        fileName: 'Retail_Sales_Sample.csv',
                        activeSheetIdx: 0,
                        sheets: [sheet],
                      });
                    }
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#A6E22E]/15 hover:bg-[#A6E22E]/25 border border-[#A6E22E]/35 text-[#4A7500] dark:text-[#A6E22E] text-[10px] font-semibold shrink-0 transition disabled:opacity-40 apple-font-mono"
                  title="无需本地文件，一键加载内置零售样例以体验字段类型推断与预览"
                >
                  样例预览
                </button>
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

              <div className="grid grid-cols-3 gap-1.5 apple-font-mono">
                <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('gsheet'); }} className="px-2 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[10px] font-medium flex items-center justify-center gap-1 transition">
                  <Globe className="w-3 h-3 text-[#66D9EF]" />
                  <span>GSheet</span>
                </button>
                <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('sql'); }} className="px-2 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#FD971F] text-[10px] font-medium flex items-center justify-center gap-1 transition">
                  <Server className="w-3 h-3 text-[#FD971F]" />
                  <span>SQL代理</span>
                </button>
                <button onClick={() => { soundEngine?.playClick(550); setActiveDataSourceModal('bigdata'); }} className="px-2 py-1.5 rounded-lg bg-[#AE81FF]/15 text-[#6B38FB] dark:text-[#AE81FF] border border-[#AE81FF]/35 hover:bg-[#AE81FF]/25 text-[10px] font-semibold flex items-center justify-center gap-1 transition">
                  <Zap className="w-3 h-3 text-[#AE81FF]" />
                  <span>100K压测</span>
                </button>
              </div>
            </div>

            {/* Schema Field List */}
            <div className="lg:hidden border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-2">
              <button
                type="button"
                aria-expanded={showMobileSchema}
                aria-controls="pivot-schema-fields"
                onClick={() => setShowMobileSchema((expanded) => !expanded)}
                className="w-full rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#272822] px-3 py-2 text-left text-[11px] font-semibold flex items-center justify-between"
              >
                <span>字段列表（{currentDataset.fields.length}）</span>
                <span className="text-[#0088A3] dark:text-[#66D9EF]">{showMobileSchema ? '收起' : '展开'}</span>
              </button>
            </div>
            <div id="pivot-schema-fields" className={`${showMobileSchema ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-h-0 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-tight apple-font-mono">数据字段 ({currentDataset.fields.length})</span>
                <span className="text-[10px] text-[#75715E] dark:text-[#908E80] apple-font-mono">拖拽或点击添加</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {currentDataset.fields.map((field) => {
                  const typeCfg = FIELD_TYPES[field.type] || FIELD_TYPES.text;
                  const TypeIcon = typeCfg.icon;
                  return (
                    <div
                      key={field.name}
                      draggable={!isReadOnly}
                      onDragStart={() => setDraggingPayload({ source: 'fieldList', field: field.name })}
                      onDragEnd={() => { setDraggingPayload(null); setDragOverZone(null); }}
                      className="group p-2 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C]/90 hover:border-[#F92672]/60 dark:hover:border-[#66D9EF]/60 flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing apple-transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1 rounded border ${typeCfg.color} shrink-0`}>
                          <TypeIcon className="w-3 h-3" />
                        </span>
                        <span className="font-medium text-xs truncate">{field.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-85 group-hover:opacity-100 shrink-0 apple-font-mono">
                        <button onClick={() => addFieldToZone('rows', field.name)} className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#F92672] hover:text-[#F8F8F2] text-[9px] font-semibold transition">+行</button>
                        <button onClick={() => addFieldToZone('columns', field.name)} className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#66D9EF] hover:text-[#1E1F1C] text-[9px] font-semibold transition">+列</button>
                        <button onClick={() => addFieldToZone('values', field.name)} className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#FD971F] hover:text-[#1E1F1C] text-[9px] font-semibold transition">+值</button>
                        <button onClick={() => addFieldToZone('filters', field.name)} className="px-1.5 py-0.5 rounded bg-[#EFECE1] dark:bg-[#272822] hover:bg-[#A6E22E] hover:text-[#1E1F1C] text-[9px] font-semibold transition">+筛</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Main Work Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-visible lg:overflow-hidden">
          {!cinemaTheaterMode && (
            <>
            <div className="lg:hidden px-3 py-2 bg-[#EFECE1]/65 dark:bg-[#272822]/90 border-b border-[#D6D4C8] dark:border-[#3E3D32]">
              <button
                aria-expanded={showMobileConfig}
                aria-controls="pivot-analysis-config"
                onClick={() => setShowMobileConfig((open) => !open)}
                className="w-full px-3 py-2 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] flex items-center justify-between text-[11px] font-semibold"
              >
                <span>分析配置 · 行 / 列 / 值 / 筛选</span>
                <span className="text-[#0088A3] dark:text-[#66D9EF]">{showMobileConfig ? '收起' : '展开'}</span>
              </button>
            </div>
            <section id="pivot-analysis-config" className={`${showMobileConfig ? 'grid' : 'hidden'} lg:grid bg-[#EFECE1]/65 dark:bg-[#272822]/90 border-b border-[#D6D4C8] dark:border-[#3E3D32] px-4 py-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0 print:hidden`}>
              {[
                { key: 'filters', label: '筛选条件', badgeColor: 'text-[#4A7500] dark:text-[#A6E22E]', borderAccent: 'border-l-2 border-l-[#A6E22E]' },
                { key: 'rows', label: '行维度', badgeColor: 'text-[#F92672]', borderAccent: 'border-l-2 border-l-[#F92672]' },
                { key: 'columns', label: '列维度', badgeColor: 'text-[#0088A3] dark:text-[#66D9EF]', borderAccent: 'border-l-2 border-l-[#66D9EF]' },
                { key: 'values', label: '数值指标', badgeColor: 'text-[#C86400] dark:text-[#FD971F]', borderAccent: 'border-l-2 border-l-[#FD971F]' },
              ].map((z) => {
                const items = pivotConfig[z.key] || [];
                const isOver = dragOverZone === z.key;
                return (
                  <div
                    key={z.key}
                    onDragOver={(e) => { e.preventDefault(); setDragOverZone(z.key); }}
                    onDragLeave={() => setDragOverZone(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverZone(null);
                      if (draggingPayload?.field) {
                        if (draggingPayload.source && draggingPayload.source !== 'fieldList' && draggingPayload.source !== z.key && draggingPayload.itemId) {
                          const targetList = pivotConfig[z.key] || [];
                          const fMeta = currentDataset.fields.find((f) => f.name === draggingPayload.field);
                          if (z.key !== 'values' && fMeta?.type !== 'date' && targetList.some((it) => it.field === draggingPayload.field)) {
                            showToast?.(`目标区域已存在「${draggingPayload.field}」`, 'error');
                            setDraggingPayload(null);
                            return;
                          }
                          removeZoneItem(draggingPayload.source, draggingPayload.itemId);
                        }
                        if (draggingPayload.source !== z.key) {
                          addFieldToZone(z.key, draggingPayload.field);
                        }
                      }
                      setDraggingPayload(null);
                    }}
                    className={`min-h-[64px] p-2 rounded-lg border ${z.borderAccent} apple-specular-card apple-transition flex flex-col gap-1.5 ${isOver ? 'border-[#F92672] bg-[#F92672]/10 scale-[1.01]' : 'border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7]/90 dark:bg-[#1E1F1C]/90'}`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold apple-font-mono">
                      <span className={z.badgeColor}>{z.label}</span>
                      <span className="text-[#75715E] dark:text-[#908E80]">[{items.length}]</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.length === 0 ? (
                        <span className="text-[10px] text-[#75715E] italic py-1 apple-font-mono">/* 拖拽字段至此... */</span>
                      ) : (
                        items.map((it, itemIdx) => {
                          const fMeta = currentDataset.fields.find((f) => f.name === it.field);
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
                                setDraggingPayload({ source: z.key, field: it.field, itemId: it.id, index: itemIdx });
                              }}
                              onDragEnd={() => {
                                setDraggingPayload(null);
                                setDragOverZone(null);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFECE1] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-sm text-[10px] font-medium cursor-grab active:cursor-grabbing hover:border-[#F92672] transition"
                            >
                              <GripVertical className="w-2.5 h-2.5 text-[#75715E] shrink-0" />
                              <span className="text-[#272822] dark:text-[#F8F8F2]">{z.key === 'rows' || z.key === 'columns' ? getDimDisplayLabel(it) : it.field}</span>
                              {z.key === 'filters' && (
                                <button
                                  onClick={() => {
                                    setHeaderFilterSearch('');
                                    setActiveHeaderFilterModal({ zone: 'filters', dim: it });
                                  }}
                                  className={`px-1 rounded text-[9px] font-semibold apple-font-mono transition ${isFiltered ? 'bg-[#A6E22E]/20 text-[#4A7500] dark:text-[#A6E22E]' : 'bg-black/[0.05] dark:bg-[#3E3D32] text-[#75715E] dark:text-[#908E80] hover:text-[#66D9EF]'}`}
                                  title="点击选择筛选值"
                                >
                                  {isFiltered ? `已选${it.selectedValues.length}项` : 'ALL'}
                                </button>
                              )}
                              {z.key === 'values' && (
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
                                  className="bg-transparent text-[#C86400] dark:text-[#FD971F] apple-font-mono font-bold focus:outline-none cursor-pointer disabled:opacity-40"
                                >
                                  {AGG_METHODS.map((m) => (
                                    <option key={m.value} value={m.value} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{m.short}</option>
                                  ))}
                                </select>
                              )}
                              {(z.key === 'rows' || z.key === 'columns') && (fMeta?.type === 'date' || fMeta?.type === 'number') && (
                                <button
                                  disabled={isReadOnly}
                                  onClick={() => {
                                    setBinFormState(it.numberBin || { start: 0, step: 50000 });
                                    setActiveBinModal({ zone: z.key, item: it, fieldType: fMeta.type });
                                  }}
                                  className="px-1 rounded bg-[#66D9EF]/15 text-[#0088A3] dark:text-[#66D9EF] text-[9px] hover:underline disabled:opacity-40 apple-font-mono"
                                >
                                  分组
                                </button>
                              )}
                              {(z.key === 'rows' || z.key === 'columns') && (
                                <button
                                  onClick={() => toggleDimensionSort(z.key, it.id)}
                                  className={`hover:text-[#F92672] transition ${it.sort && it.sort !== 'none' ? 'text-[#F92672]' : 'text-[#75715E]'}`}
                                  title={`维度排序: ${it.sort === 'asc' ? '升序' : it.sort === 'desc' ? '降序' : '默认'}`}
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
                                  title="勾选筛选值"
                                >
                                  <Filter className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {!isReadOnly && items.length > 1 && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-[#75715E]">
                                  {itemIdx > 0 && (
                                    <button onClick={() => moveZoneItem(z.key, itemIdx, -1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2]" title="前移">←</button>
                                  )}
                                  {itemIdx < items.length - 1 && (
                                    <button onClick={() => moveZoneItem(z.key, itemIdx, 1)} className="hover:text-[#272822] dark:hover:text-[#F8F8F2]" title="后移">→</button>
                                  )}
                                </span>
                              )}
                              {!isReadOnly && (
                                <button onClick={() => removeZoneItem(z.key, it.id)} className="text-[#75715E] hover:text-[#F92672] ml-0.5" title="移除字段">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
            </>
          )}

          {/* View Mode, Cube Formula Bar & Executive Insight Strip */}
          <div className="bg-[#EFECE1]/75 dark:bg-[#22231E] border-b border-[#D6D4C8] dark:border-[#3E3D32] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
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
                    {m.label}
                  </button>
                ))}
              </div>

              <select
                aria-label="选择图表类型"
                value={chartType}
                onChange={(e) => { soundEngine?.playClick(560); setChartType(e.target.value); }}
                className="px-3 py-1 rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[#272822] dark:text-[#66D9EF] text-[10px] font-semibold apple-font-mono focus:outline-none focus:border-[#F92672]"
              >
                {VISUAL_CHART_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#FFFDF7] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2]">{t.label}</option>
                ))}
              </select>

              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] cursor-pointer px-2 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-[#3E3D32]/50">
                <input
                  type="checkbox"
                  aria-label="显示多级小计"
                  checked={pivotConfig.showSubtotals}
                  onChange={(e) => setPivotConfig((p) => ({ ...p, showSubtotals: e.target.checked }))}
                  className="rounded accent-[#F92672]"
                />
                <span>多级小计</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#75715E] dark:text-[#908E80] cursor-pointer px-2 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-[#3E3D32]/50">
                <input
                  type="checkbox"
                  aria-label="冻结行表头"
                  checked={chartSpecConfig.stickyRowHeaders}
                  onChange={(e) => setChartSpecConfig((p) => ({ ...p, stickyRowHeaders: e.target.checked }))}
                  className="rounded accent-[#F92672]"
                />
                <span>冻结行表头</span>
              </label>

              <button
                disabled={isReadOnly}
                onClick={transposeRowsAndColumns}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#F92672] hover:text-[#F92672] text-[10px] font-medium transition disabled:opacity-40"
                title="一键互换行维度与列维度 (快捷键: R)"
              >
                <RotateCcw className="w-2.5 h-2.5 text-[#FD971F]" />
                <span>行列互换</span>
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
                title="查看 DuckDB SQL 模板（当前不执行）"
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
    </>
  );
}
