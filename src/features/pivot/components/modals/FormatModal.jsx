import { t } from '../../../../i18n.js';
import React, { useState } from 'react';
import { useDialogFocus } from '../../../../utils/useDialogFocus';
import { Palette, X, AlignCenter, AlignLeft, AlignRight, Rows, Table, Calculator, Plus, Trash2, Sparkles, HelpCircle } from 'lucide-react';
import { SHOW_AS_MODES } from '../../../../constants/pivotConstants';

const COLOR_SCALE_PREVIEWS = {
  none: 'bg-transparent border border-dashed border-[#D6D4C8] dark:border-[#49483E]',
  green_yellow_red: 'bg-gradient-to-r from-[#A6E22E] via-[#E6DB74] to-[#F92672]',
  blue_scale: 'bg-gradient-to-r from-[#66D9EF]/20 via-[#66D9EF]/60 to-[#66D9EF]',
  emerald_scale: 'bg-gradient-to-r from-[#A6E22E]/20 via-[#A6E22E]/60 to-[#A6E22E]',
  purple_magenta: 'bg-gradient-to-r from-[#F92672]/30 via-[#AE81FF]/60 to-[#AE81FF]',
  orange_heat: 'bg-gradient-to-r from-[#FD971F]/20 via-[#FD971F]/60 to-[#FD971F]',
};

export function FormatModal({
  isOpen,
  isReadOnly = false,
  condFormat,
  setCondFormat,
  pivotConfig,
  setPivotConfig,
  tableSettings,
  setTableSettings,
  onClose,
}) {
  const dialogRef = useDialogFocus(Boolean(isOpen), onClose);
  const [showCalcBuilder, setShowCalcBuilder] = useState(false);
  const [calcForm, setCalcForm] = useState({
    name: '毛利率',
    operandA: '',
    op: '/',
    operandB: '',
    isPercent: true,
    decimals: 1,
  });

  if (!isOpen) return null;

  const baseValues = (pivotConfig.values || []).filter((v) => !v.isCalculated);

  const applyPreset = (presetName, defaultOp, defaultPercent, defaultDecimals, searchA, searchB) => {
    let matchA = '';
    let matchB = '';
    if (baseValues.length > 0) {
      const foundA = baseValues.find((v) => searchA.some((k) => v.field.toLowerCase().includes(k)));
      const foundB = baseValues.find((v) => searchB.some((k) => v.field.toLowerCase().includes(k)));
      matchA = foundA ? foundA.id : baseValues[0]?.id || '';
      matchB = foundB ? foundB.id : (baseValues[1] ? baseValues[1].id : baseValues[0]?.id || '');
    }
    setCalcForm({
      name: presetName,
      operandA: matchA,
      op: defaultOp,
      operandB: matchB,
      isPercent: defaultPercent,
      decimals: defaultDecimals,
    });
  };

  const handleCreateCalculatedField = () => {
    if (!calcForm.name.trim() || !calcForm.operandA || !calcForm.operandB) return;
    const newId = `v_calc_${Date.now()}`;
    const opAObj = baseValues.find((v) => v.id === calcForm.operandA);
    const opBObj = baseValues.find((v) => v.id === calcForm.operandB);
    const newCalcValue = {
      id: newId,
      field: calcForm.name.trim(),
      isCalculated: true,
      operandA: calcForm.operandA,
      operandAField: opAObj?.field || calcForm.operandA,
      operandAAgg: opAObj?.agg || 'sum',
      op: calcForm.op,
      operandB: calcForm.operandB,
      operandBField: opBObj?.field || calcForm.operandB,
      operandBAgg: opBObj?.agg || 'sum',
      agg: 'calc',
      showAs: 'normal',
      format: {
        thousands: false,
        decimals: calcForm.decimals,
        currency: '',
        isPercent: calcForm.isPercent,
      },
    };
    setPivotConfig((prev) => ({
      ...prev,
      values: [...(prev.values || []), newCalcValue],
    }));
    setShowCalcBuilder(false);
  };

  const handleRemoveValue = (id) => {
    setPivotConfig((prev) => ({
      ...prev,
      values: (prev.values || []).filter((v) => v.id !== id),
    }));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 animate-apple-fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("数值与条件格式设置")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-apple-modal"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#D6D4C8] dark:border-[#3E3D32] flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold apple-font-mono text-[#272822] dark:text-[#F8F8F2] flex items-center gap-2">
            <Palette className="w-4 h-4 text-ink-orange" />
            <span>{t("FORMAT_STUDIO // 格式、数据居中对齐、行高列宽与显示")}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label={t("关闭数值与条件格式设置")}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted hover:text-[#F92672] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <fieldset disabled={isReadOnly} className="min-w-0 p-5 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Section 1: Conditional Formatting */}
          <div className="space-y-3">
            <div className="font-bold text-ink-pink apple-font-mono flex items-center justify-between">
              <span>{t("1. 透视表条件格式 (色阶 / 数据条 / 阈值标红)")}</span>
              <span className="text-[10px] text-ink-muted font-normal">{t("一目了然看数值高低与极值")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-ink-muted mb-1 apple-font-mono">
                  {t("单元格背景色阶 (Color Scale):")}
                </label>
                <div className="space-y-1.5">
                  <select
                    aria-label={t("单元格背景色阶 (Color Scale):")}
                    value={condFormat.colorScale}
                    onChange={(e) => setCondFormat((p) => ({ ...p, colorScale: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono text-xs focus:outline-none focus:border-[#66D9EF]"
                  >
                    <option value="none">{t("关闭色阶 (None)")}</option>
                    <option value="green_yellow_red">{t("红-黄-绿三色热力图")}</option>
                    <option value="blue_scale">{t("Monokai 冰川青色阶")}</option>
                    <option value="emerald_scale">{t("Monokai 荧光绿色阶")}</option>
                    <option value="purple_magenta">{t("Monokai 品红-极光紫色阶")}</option>
                    <option value="orange_heat">{t("暖橙渐变热力色阶")}</option>
                  </select>
                  {/* Visual Preview Strip */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 flex-1 rounded-full transition-all ${
                        COLOR_SCALE_PREVIEWS[condFormat.colorScale] || COLOR_SCALE_PREVIEWS.none
                      }`}
                    />
                    <span className="text-[9.5px] text-ink-muted apple-font-mono">
                      {condFormat.colorScale === 'none' ? t("未启用") : t("色阶预览")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                  <input
                    type="checkbox"
                    checked={condFormat.showDataBar}
                    onChange={(e) => setCondFormat((p) => ({ ...p, showDataBar: e.target.checked }))}
                    className="rounded accent-[#A6E22E]"
                  />
                  <span>{t("启用单元格内嵌比例数据条 (Data Bar)")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                  <input
                    type="checkbox"
                    checked={condFormat.customRuleEnabled}
                    onChange={(e) => setCondFormat((p) => ({ ...p, customRuleEnabled: e.target.checked }))}
                    className="rounded accent-[#F92672]"
                  />
                  <span>{t("启用自定义阈值高亮规则")}</span>
                </label>
              </div>
            </div>
            {condFormat.customRuleEnabled && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono text-xs animate-apple-fade-in">
                <span>{t("当数值")}</span>
                <select
                  aria-label={t("阈值比较方式")}
                  value={condFormat.customRuleOp}
                  onChange={(e) => setCondFormat((p) => ({ ...p, customRuleOp: e.target.value }))}
                  className="px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E]"
                >
                  <option value="gt">{t("大于 (>)")}</option>
                  <option value="lt">{t("小于 (<)")}</option>
                  <option value="eq">{t("等于 (=)")}</option>
                </select>
                <input
                  type="number"
                  aria-label={t("阈值")}
                  value={condFormat.customRuleValue}
                  onChange={(e) => setCondFormat((p) => ({ ...p, customRuleValue: e.target.value }))}
                  className="w-32 px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E]"
                />
                <span className="text-ink-pink font-bold">{t("时以品红加粗下划线高亮")}</span>
              </div>
            )}
          </div>

          {/* Section 2: Table Layout, Alignment & Density */}
          {tableSettings && setTableSettings && (
            <div className="space-y-3 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-4">
              <div className="font-bold text-ink-green apple-font-mono flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5" />
                  <span>{t("2. 透视表数据对齐方式与行高密度设置")}</span>
                </div>
                <span className="text-[10px] text-ink-muted font-normal">{t("优化报表阅读节奏")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-ink-muted mb-1 apple-font-mono">
                    {' ' + t("数据与表头对齐方式:") + ' '}
                  </label>
                  <div className="flex items-center bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] rounded-lg p-1">
                    {[
                      { id: 'center', label: '居中对齐 (默认)', icon: AlignCenter },
                      { id: 'left', label: '靠左对齐', icon: AlignLeft },
                      { id: 'right', label: '靠右对齐', icon: AlignRight },
                    ].map((al) => {
                      const Icon = al.icon;
                      const active = (tableSettings.dataAlignment || 'center') === al.id;
                      return (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => setTableSettings((p) => ({ ...p, dataAlignment: al.id }))}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition ${
                            active
                              ? 'bg-[#A6E22E] text-[#1E1F1C] shadow-sm'
                              : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{al.id === 'center' ? t("居中") : al.id === 'left' ? t("靠左") : t("靠右")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-ink-muted mb-1 apple-font-mono">
                    {' ' + t("行高密度规格:") + ' '}
                  </label>
                  <select
                    aria-label={t("行高密度规格:")}
                    value={tableSettings.density || 'compact'}
                    onChange={(e) => {
                      const nextD = e.target.value;
                      setTableSettings((p) => ({ ...p, density: nextD, wrapText: nextD === 'auto' }));
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] apple-font-mono text-xs focus:outline-none focus:border-[#A6E22E]"
                  >
                    <option value="compact">{t("紧凑 (28px - 大数据紧凑扫描)")}</option>
                    <option value="normal">{t("标准 (36px - 经典平衡)")}</option>
                    <option value="relaxed">{t("宽松 (44px - 舒适触摸阅读)")}</option>
                    <option value="auto">{t("自适应换行 (随内容行数自适应高度)")}</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                    <input
                      type="checkbox"
                      checked={Boolean(tableSettings.showZebra)}
                      onChange={(e) => setTableSettings((p) => ({ ...p, showZebra: e.target.checked }))}
                      className="rounded accent-[#A6E22E]"
                    />
                    <span>{t("启用隔行轻柔斑马纹")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer apple-font-mono">
                    <input
                      type="checkbox"
                      checked={Boolean(tableSettings.wrapText)}
                      onChange={(e) => setTableSettings((p) => ({ ...p, wrapText: e.target.checked }))}
                      className="rounded accent-[#FD971F]"
                    />
                    <span>{t("允许长文本自动折行")}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Values & Formatting */}
          <div className="space-y-3 border-t border-[#D6D4C8] dark:border-[#3E3D32] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-ink-cyan apple-font-mono">
                {t("3. 值指标显示方式 (占比/环比/累计) 与衍生计算度量")}
              </div>
              <button
                type="button"
                onClick={() => setShowCalcBuilder((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A6E22E]/15 border border-[#A6E22E]/40 text-ink-green text-[10.5px] font-bold apple-font-mono hover:bg-[#A6E22E]/25 transition"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{showCalcBuilder ? t("收起公式构建") : t("+ 新建衍生计算指标")}</span>
              </button>
            </div>

            {/* Calculated Field Builder Inline Card */}
            {showCalcBuilder && (
              <div className="p-3.5 rounded-xl bg-[#FAF8F1] dark:bg-[#1E1F1C] border border-[#A6E22E]/50 space-y-3 apple-font-mono text-xs animate-apple-modal">
                <div className="flex flex-wrap items-center justify-between gap-2 text-ink-green font-bold">
                  <span>{t("新建复合计算度量 (跨指标聚合级公式运算)")}</span>
                  <span className="text-[10px] text-ink-muted">{t("如: [毛利润] / [销售额]")}</span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-ink-muted">{t("快捷预设:")}</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('毛利率', '/', true, 1, ['利润', 'profit', 'margin'], ['销售', 'sales', 'revenue'])}
                    className="px-2 py-0.5 rounded bg-[#A6E22E]/15 border border-[#A6E22E]/30 text-ink-green hover:bg-[#A6E22E]/25 transition"
                  >
                    📈 {t("毛利率 (利润÷销售额)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('客单价', '/', false, 2, ['销售', 'sales', 'amount'], ['订单', 'count', '数量', 'order'])}
                    className="px-2 py-0.5 rounded bg-[#66D9EF]/15 border border-[#66D9EF]/30 text-ink-cyan hover:bg-[#66D9EF]/25 transition"
                  >
                    🛒 {t("客单价 (销售额÷单量)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('净利润', '-', false, 0, ['销售', 'sales', 'revenue'], ['成本', 'cost'])}
                    className="px-2 py-0.5 rounded bg-[#FD971F]/15 border border-[#FD971F]/30 text-ink-orange hover:bg-[#FD971F]/25 transition"
                  >
                    💰 {t("净额 (销售额-成本)")}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-[9.5px] text-ink-muted mb-1">{t("指标名称:")}</label>
                    <input
                      type="text"
                      aria-label={t("指标名称:")}
                      value={calcForm.name}
                      onChange={(e) => setCalcForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={t("如: 毛利率")}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] text-ink-muted mb-1">{t("指标 A (分子/首项):")}</label>
                    <select
                      aria-label={t("指标 A (分子/首项):")}
                      value={calcForm.operandA}
                      onChange={(e) => setCalcForm((p) => ({ ...p, operandA: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs"
                    >
                      <option value="">{t("-- 选择指标 A --")}</option>
                      {baseValues.map((v) => (
                        <option key={v.id} value={v.id}>{v.field} ({v.agg})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[9.5px] text-ink-muted mb-1">{t("运算符:")}</label>
                      <select
                        aria-label={t("运算符:")}
                        value={calcForm.op}
                        onChange={(e) => setCalcForm((p) => ({ ...p, op: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs text-center font-bold text-ink-pink"
                      >
                        <option value="/">{t("÷ (除法)")}</option>
                        <option value="*">{t("× (乘法)")}</option>
                        <option value="-">{t("- (减法)")}</option>
                        <option value="+">{t("+ (加法)")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-ink-muted mb-1">{t("指标 B (分母):")}</label>
                      <select
                        aria-label={t("指标 B (分母):")}
                        value={calcForm.operandB}
                        onChange={(e) => setCalcForm((p) => ({ ...p, operandB: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs"
                      >
                        <option value="">{t("-- 选择指标 B --")}</option>
                        {baseValues.map((v) => (
                          <option key={v.id} value={v.id}>{v.field} ({v.agg})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                      <input
                        type="checkbox"
                        checked={calcForm.isPercent}
                        onChange={(e) => setCalcForm((p) => ({ ...p, isPercent: e.target.checked }))}
                        className="rounded accent-[#A6E22E]"
                      />
                      <span>{t("百分比 %")}</span>
                    </label>
                    <button
                      type="button"
                      disabled={!calcForm.name.trim() || !calcForm.operandA || !calcForm.operandB}
                      onClick={handleCreateCalculatedField}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#A6E22E] hover:bg-[#B8F03E] text-[#1E1F1C] font-bold text-xs shadow-xs transition disabled:opacity-40"
                    >
                      {' ' + t("生成指标") + ' '}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Explanatory Tip on Show As */}
            <div className="p-2.5 rounded-lg bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/60 border border-[#D6D4C8] dark:border-[#3E3D32] text-[10.5px] text-ink-muted leading-relaxed space-y-1">
              <div className="font-semibold text-ink-cyan apple-font-mono flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-ink-cyan" />
                <span>{t("显示方式 (Show As) 含义速查：")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                <div>• <strong>{t("占总计百分比:")}</strong> {t("该单元格占整张透视表总计的比例")}</div>
                <div>• <strong>{t("占行总计百分比:")}</strong> {t("该单元格占所在行汇总的结构比重")}</div>
                <div>• <strong>{t("占列总计百分比:")}</strong> {t("该单元格在所在列的占比 (如市场份额)")}</div>
                <div>• <strong>{t("环比变动率:")}</strong> {t("与上一行对比的增长率 (MoM)")}</div>
              </div>
            </div>

            {pivotConfig.values.length === 0 ? (
              <div className="text-ink-muted italic apple-font-mono">{t("/* 当前值区域为空，请先拖入值指标 */")}</div>
            ) : (
              pivotConfig.values.map((vItem) => (
                <div
                  key={vItem.id}
                  className="p-3 rounded-xl bg-[#EFECE1]/50 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center apple-font-mono"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-ink-orange truncate flex items-center gap-1.5">
                      {vItem.isCalculated && (
                        <span className="px-1.5 py-0.2 rounded bg-[#AE81FF]/20 text-ink-purple text-[8.5px] font-bold uppercase tracking-wider shrink-0">
                          CALC
                        </span>
                      )}
                      <span className="truncate">{vItem.field}</span>
                    </div>
                    {vItem.isCalculated ? (
                      <div className="text-[9px] text-ink-muted truncate mt-0.5" title={vItem.formula || ''}>
                        {vItem.formula
                          ? `${t('公式:')} ${vItem.formula}`
                          : ` ${t("公式: [")}${baseValues.find(b => b.id === vItem.operandA)?.field || vItem.operandAField || vItem.operandA}] ${vItem.op} [${baseValues.find(b => b.id === vItem.operandB)?.field || vItem.operandBField || vItem.operandB}]`}
                      </div>
                    ) : (
                      <div className="text-[9px] text-ink-muted truncate mt-0.5">{t("聚合:") + ' '}{vItem.agg}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink-muted mb-0.5">{t("显示方式 (Show As):")}</label>
                    <select
                      aria-label={`${vItem.field} · ${t("显示方式 (Show As):")}`}
                      value={vItem.showAs || 'normal'}
                      onChange={(e) => {
                        const nextShowAs = e.target.value;
                        setPivotConfig((prev) => ({
                          ...prev,
                          values: prev.values.map((v) => (v.id === vItem.id ? { ...v, showAs: nextShowAs } : v)),
                        }));
                      }}
                      className="w-full px-2 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                    >
                      {SHOW_AS_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{t(m.label)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink-muted mb-0.5">{t("单位/符号与小数位:")}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder={t("单位(如¥,ms,MB)")}
                        aria-label={`${vItem.field} · ${t("单位/符号")}`}
                        value={vItem.format?.currency ?? ''}
                        onChange={(e) => {
                          const cur = e.target.value;
                          setPivotConfig((prev) => ({
                            ...prev,
                            values: prev.values.map((v) =>
                              v.id === vItem.id ? { ...v, format: { ...v.format, currency: cur } } : v
                            ),
                          }));
                        }}
                        className="w-20 px-1.5 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                      />
                      <select
                        aria-label={`${vItem.field} · ${t("小数位数")}`}
                        value={vItem.format?.decimals ?? (vItem.format?.isPercent ? 1 : 0)}
                        onChange={(e) => {
                          const dec = Number(e.target.value);
                          setPivotConfig((prev) => ({
                            ...prev,
                            values: prev.values.map((v) =>
                              v.id === vItem.id ? { ...v, format: { ...v.format, decimals: dec } } : v
                            ),
                          }));
                        }}
                        className="px-1.5 py-1 rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                      >
                        <option value={0}>{t("0位小数")}</option>
                        <option value={1}>{t("1位小数")}</option>
                        <option value={2}>{t("2位小数")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                      <input
                        type="checkbox"
                        checked={vItem.format?.thousands !== false && !vItem.format?.isPercent}
                        onChange={(e) => {
                          const th = e.target.checked;
                          setPivotConfig((prev) => ({
                            ...prev,
                            values: prev.values.map((v) =>
                              v.id === vItem.id ? { ...v, format: { ...v.format, thousands: th } } : v
                            ),
                          }));
                        }}
                        className="rounded accent-[#A6E22E]"
                      />
                      <span>{t("千分位")}</span>
                    </label>
                    {vItem.isCalculated && (
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(vItem.id)}
                        className="p-1 rounded text-ink-muted hover:text-[#F92672] transition"
                        title={t("删除该计算指标")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
