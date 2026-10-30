import { t } from '../../../i18n.js';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Calculator, Sparkles, Plus, Trash2, Edit3, Check, AlertCircle,
  Copy, ArrowLeft, ArrowRight, Search, X, Download, Upload,
  ShieldCheck,
  Tag, Hash, ArrowUpDown, RefreshCw, Wand2, Target, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { AGG_METHODS, SHOW_AS_MODES } from '../../../constants/pivotConstants.js';
import { UnifiedFormatter } from '../../../utils/formatters.js';
import { isMeasureField, getMeasureDefaults } from '../../../utils/fieldSemantics.js';
import {
  validateMetricFormula,
  evaluateFormulaAST,
  buildFormulaFromVisualSpec,
  formatFormulaField,
} from '../engine/formulaEngine.js';
import { buildMetricPresets } from '../../../utils/metricPresets.js';
import { normalizeMetricDefinitions, validateMetricCatalogMerge } from '../../../utils/metricCatalog.js';
import { MiniSparkline } from './MiniSparkline.jsx';
import { SmartTemplatesBar } from './SmartTemplatesBar.jsx';

const METRIC_CATEGORIES = [
  { id: 'ratio', label: '比率/效率', color: 'text-ink-purple bg-[#AE81FF]/15 border-[#AE81FF]/30' },
  { id: 'profit', label: '差额/差额比', color: 'text-ink-green bg-[#A6E22E]/15 border-[#A6E22E]/30' },
  { id: 'average', label: '单均/频次', color: 'text-ink-cyan bg-[#66D9EF]/15 border-[#66D9EF]/30' },
  { id: 'scale', label: '规模/折算', color: 'text-ink-orange bg-[#FD971F]/15 border-[#FD971F]/30' },
];

const GOAL_CATEGORIES = [
  { id: 'all', label: '全部场景' },
  { id: 'profit', label: '差额比较', desc: '差值与差额比，需确认单位一致' },
  { id: 'average', label: '按记录或类别分摊', desc: '总量除以记录数或字段唯一值个数' },
  { id: 'ratio', label: '比值计算', desc: '两项汇总值相除，不推断业务含义' },
  { id: 'scale', label: '数量级折算', desc: '保留原字段单位，调整显示数量级' },
];

/**
 * Intelligent formula auto-correction helper for common beginner syntax errors:
 * - Missing square brackets around field names
 * - Full-width Chinese punctuation
 * - Mismatched unclosed parentheses
 */
function suggestFormulaFix(rawFormula, fields = []) {
  if (!rawFormula || typeof rawFormula !== 'string') return null;
  let fixed = rawFormula.trim()
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/，/g, ',')
    .replace(/／/g, '/')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/＊/g, '*');

  for (const f of fields) {
    if (!f?.name) continue;
    const escaped = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<!\\[)${escaped}(?!\\])`, 'g');
    fixed = fixed.replace(re, `[${f.name}]`);
  }

  let openCount = 0;
  for (const ch of fixed) {
    if (ch === '(') openCount++;
    if (ch === ')') openCount--;
  }
  if (openCount > 0) {
    fixed += ')'.repeat(openCount);
  }

  if (fixed !== rawFormula.trim()) {
    const val = validateMetricFormula(fixed, fields);
    if (val.valid) return fixed;
  }
  return null;
}

/**
 * Extract referenced field names from formula string
 */
function getReferencedFieldNames(formulaStr) {
  if (!formulaStr) return [];
  const matches = formulaStr.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1)).filter((n) => n !== '__COUNT__')));
}

export function MetricCenterPanel({
  currentDataset,
  pivotConfig,
  setPivotConfig,
  pivotResult,
  unifiedChartSpec,
  setChartType,
  setCondFormat,
  isReadOnly,
  soundEngine,
  showToast,
  onClose,
  initialTab = 'active', // 'active' | 'studio' | 'catalog'
  editingMetricId = null,
  onClearEditingMetric,
  customMetricsCatalog = [],
  setCustomMetricsCatalog,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [targetBenchmarkInputs, setTargetBenchmarkInputs] = useState({});
  const [activeBenchmarkModalId, setActiveBenchmarkModalId] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'custom' | 'native'
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all'); // 'all' | 'ratio' | 'profit' | 'average' | 'scale'
  
  const importInputRef = useRef(null);
  const importContextRef = useRef(null);
  importContextRef.current = { isReadOnly, datasetId: currentDataset?.id };
  const formulaInputRef = useRef(null);

  const fields = currentDataset?.fields || [];
  const measureFields = useMemo(() => fields.filter((f) => isMeasureField(f)), [fields]);
  const dimensionFields = useMemo(() => fields.filter((f) => !isMeasureField(f)), [fields]);

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Studio Builder State
  const [editingId, setEditingId] = useState(editingMetricId || null);
  const [builderMode, setBuilderMode] = useState('binary'); // 'binary' | 'margin' | 'constant' | 'expression'
  const [formState, setFormState] = useState({
    name: '',
    category: 'ratio',
    description: '',
    operandAField: '',
    operandAAgg: 'sum',
    op: '/',
    operandBField: '',
    operandBAgg: 'sum',
    constantValue: 10000,
    formula: '',
    formatPreset: 'percent', // 'number' | 'percent' | 'cny' | 'usd'
    decimals: 1,
    thousands: true,
    unit: '',
    showAs: 'normal',
  });

  // Initialize default studio form when dataset changes (and not editing an existing metric)
  const initDefaultForm = useCallback(() => {
    const m0 = measureFields[0]?.name || '__COUNT__';
    const m1 = measureFields[1]?.name || '__COUNT__';
    const hasTwo = measureFields.length >= 2;
    const opA = hasTwo ? m1 : m0;
    const aggA = opA === '__COUNT__' ? 'count' : 'sum';
    const opB = hasTwo ? m0 : '__COUNT__';
    const aggB = opB === '__COUNT__' ? 'count' : 'sum';
    const defaultFormula = buildFormulaFromVisualSpec({
      mode: 'binary',
      operandAField: opA,
      operandAAgg: aggA,
      op: '/',
      operandBField: opB,
      operandBAgg: aggB,
    });
    setEditingId(null);
    setBuilderMode('binary');
    setFormState({
      name: hasTwo ? `${m1}/${m0}比值` : measureFields.length === 1 ? `${m0}/记录数` : '自定义衍生指标',
      category: hasTwo ? 'ratio' : 'average',
      description: hasTwo ? `${m1}与${m0}分别汇总后相除；是否具有业务意义需核对字段定义与单位。` : `${m0}汇总后除以全部记录数（含空值记录）。`,
      operandAField: opA,
      operandAAgg: aggA,
      op: '/',
      operandBField: opB,
      operandBAgg: aggB,
      constantValue: 10000,
      formula: defaultFormula,
      formatPreset: hasTwo ? 'percent' : 'number',
      decimals: 1,
      thousands: !hasTwo,
      unit: '',
      showAs: 'normal',
    });
  }, [measureFields]);

  useEffect(() => {
    initDefaultForm();
  }, [currentDataset?.id, initDefaultForm]);

  // Load metric into studio when editingMetricId prop is passed or requested
  const loadMetricForEdit = useCallback((metric) => {
    if (!metric) return;
    soundEngine?.playClick?.(540);
    const fmt = metric.format || {};
    const preset = fmt.isPercent
      ? 'percent'
      : fmt.currency === '¥'
        ? 'cny'
        : fmt.currency === '$'
          ? 'usd'
          : 'number';
    const opA = metric.operandAField || (!metric.operandA?.startsWith('v_') ? metric.operandA : measureFields[0]?.name || '__COUNT__');
    const aggA = metric.operandAAgg || (opA === '__COUNT__' ? 'count' : 'sum');
    const opB = metric.operandBField || (!metric.operandB?.startsWith('v_') ? metric.operandB : '__COUNT__');
    const aggB = metric.operandBAgg || (opB === '__COUNT__' ? 'count' : 'sum');
    const mode = metric.builderMode || (metric.formula ? 'expression' : 'binary');
    const expr = metric.formula || buildFormulaFromVisualSpec({
      mode: 'binary',
      operandAField: opA,
      operandAAgg: aggA,
      op: metric.op || '/',
      operandBField: opB,
      operandBAgg: aggB,
    });

    setEditingId(metric.id || null);
    setBuilderMode(mode);
    setFormState({
      name: metric.field || '',
      category: metric.category || (fmt.isPercent ? 'ratio' : 'profit'),
      description: metric.description || '',
      operandAField: opA,
      operandAAgg: aggA,
      op: metric.op || '/',
      operandBField: opB,
      operandBAgg: aggB,
      constantValue: metric.constantValue ?? 10000,
      formula: expr,
      formatPreset: preset,
      decimals: fmt.decimals ?? (fmt.isPercent ? 1 : 0),
      thousands: fmt.thousands !== false,
      unit: fmt.currency && fmt.currency !== '¥' && fmt.currency !== '$' ? fmt.currency : (fmt.unit || ''),
      showAs: metric.showAs || 'normal',
    });
    setActiveTab('studio');
  }, [measureFields, soundEngine]);

  useEffect(() => {
    if (editingMetricId) {
      const target =
        (pivotConfig?.values || []).find((v) => v.id === editingMetricId) ||
        customMetricsCatalog.find((m) => m.id === editingMetricId);
      if (target) {
        loadMetricForEdit(target);
      }
      onClearEditingMetric?.();
    }
  }, [editingMetricId, pivotConfig?.values, customMetricsCatalog, loadMetricForEdit, onClearEditingMetric]);

  // Synchronize formula string when in visual modes ('binary', 'margin', 'constant')
  const effectiveFormula = useMemo(() => {
    if (builderMode === 'expression') {
      return formState.formula;
    }
    return buildFormulaFromVisualSpec({
      mode: builderMode,
      operandAField: formState.operandAField,
      operandAAgg: formState.operandAField === '__COUNT__' ? 'count' : formState.operandAAgg,
      op: formState.op,
      operandBField: formState.operandBField,
      operandBAgg: formState.operandBField === '__COUNT__' ? 'count' : formState.operandBAgg,
      constantValue: formState.constantValue,
    });
  }, [
    builderMode,
    formState.formula,
    formState.operandAField,
    formState.operandAAgg,
    formState.op,
    formState.operandBField,
    formState.operandBAgg,
    formState.constantValue,
  ]);

  // Live Formula Validation & Grand Total Preview
  const formulaValidation = useMemo(
    () => validateMetricFormula(effectiveFormula, fields),
    [effectiveFormula, fields]
  );


  const suggestedFormulaFix = useMemo(() => {
    if (builderMode !== 'expression' || formulaValidation.valid) return null;
    return suggestFormulaFix(formState.formula, fields);
  }, [builderMode, formulaValidation.valid, formState.formula, fields]);

  const previewFormatObject = useMemo(() => {
    const isPercent = formState.formatPreset === 'percent';
    const currency =
      formState.formatPreset === 'cny'
        ? '¥'
        : formState.formatPreset === 'usd'
          ? '$'
          : formState.unit.trim();
    return {
      thousands: isPercent ? false : Boolean(formState.thousands),
      decimals: Number.isInteger(Number(formState.decimals)) ? Number(formState.decimals) : 1,
      currency,
      isPercent,
    };
  }, [formState.formatPreset, formState.thousands, formState.decimals, formState.unit]);

  const livePreviewResult = useMemo(() => {
    if (!formulaValidation.valid || !formulaValidation.ast) {
      return { raw: null, formatted: '-' };
    }
    const sampleRows = currentDataset?.rows || [];
    const rawVal = evaluateFormulaAST(formulaValidation.ast, sampleRows);
    const mockVc = {
      field: formState.name || '预览指标',
      agg: 'calc',
      isCalculated: true,
      showAs: 'normal',
      format: previewFormatObject,
    };
    const formatted = UnifiedFormatter.formatValue(rawVal, mockVc, { compact: false });
    return { raw: rawVal, formatted };
  }, [formulaValidation, currentDataset?.rows, formState.name, previewFormatObject]);

  // Sample Breakdown Preview by active or top dimension
  const sampleDimensionBreakdown = useMemo(() => {
    if (!formulaValidation.valid || !formulaValidation.ast) return [];
    const rows = currentDataset?.rows;
    if (!rows || rows.length === 0) return [];

    const activeDimName =
      pivotConfig?.rows?.[0]?.field ||
      pivotConfig?.columns?.[0]?.field ||
      dimensionFields?.[0]?.name;

    if (!activeDimName || activeDimName === '__COUNT__') return [];

    const sampleSlice = rows.slice(0, 300);
    const groups = new Map();
    for (const r of sampleSlice) {
      const key = r[activeDimName];
      if (key === null || key === undefined || key === '') continue;
      const strKey = String(key);
      if (!groups.has(strKey)) groups.set(strKey, []);
      groups.get(strKey).push(r);
    }

    const topGroups = Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    const mockVc = {
      field: formState.name || '预览指标',
      agg: 'calc',
      isCalculated: true,
      showAs: 'normal',
      format: previewFormatObject,
    };

    return topGroups.map(([groupName, groupRows]) => {
      const raw = evaluateFormulaAST(formulaValidation.ast, groupRows);
      const formatted = UnifiedFormatter.formatValue(raw, mockVc, { compact: false });
      return {
        dimName: activeDimName,
        groupName,
        count: groupRows.length,
        raw,
        formatted,
      };
    });
  }, [formulaValidation, currentDataset?.rows, pivotConfig?.rows, pivotConfig?.columns, dimensionFields, formState.name, previewFormatObject]);

  // Natural language formula interpretation
  const naturalLanguageFormulaNote = useMemo(() => {
    if (builderMode === 'constant') {
      const a = formState.operandAField === '__COUNT__' ? '记录数 (COUNT)' : `【${formState.operandAField}】`;
      const aggA = formState.operandAField === '__COUNT__' ? '' : AGG_METHODS.find(m => m.value === formState.operandAAgg)?.short || formState.operandAAgg;
      return `口径解读：将每组分组全部记录的 ${a}${aggA ? `（按${aggA}汇总）` : ''}，通过 ${formState.op} ${formState.constantValue} 进行常数折算。适合进行货币量级转换（如元转万元）或单位换算。`;
    }
    if (builderMode === 'margin') {
      const a = formState.operandAField === '__COUNT__' ? '记录数' : `【${formState.operandAField}】`;
      const b = formState.operandBField === '__COUNT__' ? '记录数' : `【${formState.operandBField}】`;
      return `口径解读：计算 (${a}汇总 - ${b}汇总) ÷ ${a}汇总。先汇总再计算比率，不是逐行比率的平均值；是否代表利润率，取决于所选字段的业务含义。`;
    }
    if (builderMode === 'binary') {
      const a = formState.operandAField === '__COUNT__' ? '记录数' : `【${formState.operandAField}】`;
      const b = formState.operandBField === '__COUNT__' ? '记录数' : `【${formState.operandBField}】`;
      const aggA = formState.operandAField === '__COUNT__' ? '总记录数' : `${a}（${AGG_METHODS.find(m => m.value === formState.operandAAgg)?.short || formState.operandAAgg}）`;
      const aggB = formState.operandBField === '__COUNT__' ? '总记录数' : `${b}（${AGG_METHODS.find(m => m.value === formState.operandBAgg)?.short || formState.operandBAgg}）`;
      const opText = formState.op === '/' ? '除以' : formState.op === '*' ? '乘以' : formState.op === '-' ? '减去' : '加上';
      const whyNote = formState.op === '/' ? '先按所选口径分别汇总，再相除；不是逐行比率的平均值。' : '';
      return `口径解读：计算每组维度的 ${aggA} ${opText} ${aggB}。${whyNote}`;
    }
    return '高级公式解读：支持各类聚合函数、去重计数与数学运算，已内置零分母防报错与空值优雅回退机制。';
  }, [builderMode, formState.operandAField, formState.operandAAgg, formState.op, formState.operandBField, formState.operandBAgg, formState.constantValue]);

  const smartMetricPresets = useMemo(() => buildMetricPresets(fields), [fields]);

  // Filter presets based on selected goal
  const filteredSmartPresets = useMemo(() => {
    if (selectedGoal === 'all') return smartMetricPresets;
    return smartMetricPresets.filter((p) => p.category === selectedGoal);
  }, [smartMetricPresets, selectedGoal]);

  const applyPresetToStudio = (preset, autoCommit = false) => {
    soundEngine?.playClick?.(560);
    const s = preset.spec;
    const expr = buildFormulaFromVisualSpec({
      mode: preset.mode,
      operandAField: s.operandAField,
      operandAAgg: s.operandAAgg,
      op: s.op || '/',
      operandBField: s.operandBField || '__COUNT__',
      operandBAgg: s.operandBAgg || 'count',
      constantValue: s.constantValue ?? 10000,
    });
    const nextState = {
      ...formState,
      name: s.name,
      category: preset.category || 'ratio',
      description: s.description || '',
      operandAField: s.operandAField,
      operandAAgg: s.operandAAgg || 'sum',
      op: s.op || '/',
      operandBField: s.operandBField || '__COUNT__',
      operandBAgg: s.operandBAgg || 'count',
      constantValue: s.constantValue ?? 10000,
      formula: expr,
      formatPreset: s.formatPreset || 'number',
      decimals: s.decimals ?? 1,
      thousands: s.formatPreset !== 'percent',
      unit: s.unit || '',
      showAs: 'normal',
    };
    setBuilderMode(preset.mode);
    setFormState(nextState);

    if (autoCommit) {
      commitMetricObject({
        state: nextState,
        mode: preset.mode,
        formulaStr: expr,
        addToTable: true,
        forceNew: true,
      });
    }
  };

  const commitMetricObject = ({
    state = formState,
    mode = builderMode,
    formulaStr = effectiveFormula,
    addToTable = true,
    forceNew = false,
  } = {}) => {
    if (isReadOnly) return;
    const metricName = (state.name || '').trim();
    if (!metricName) {
      showToast?.('请填写自定义指标名称', 'error');
      return;
    }
    const existingName = customMetricsCatalog.find(metric => metric.field === metricName &&
      (forceNew || metric.id !== editingId));
    if (existingName) {
      showToast?.(`指标「${metricName}」已存在，请修改名称或编辑原指标`, 'error');
      return;
    }
    if (!addToTable && editingId && (pivotConfig?.values || []).some(metric => metric.id === editingId)) {
      showToast?.('该指标正在透视表中使用，请选择“保存修改并更新透视表”', 'error');
      return;
    }
    const validation = validateMetricFormula(formulaStr, fields);
    if (!validation.valid) {
      showToast?.(`公式校验未通过：${validation.error}`, 'error');
      return;
    }

    soundEngine?.playClick?.(600);
    const isPercent = state.formatPreset === 'percent';
    const currency =
      state.formatPreset === 'cny'
        ? '¥'
        : state.formatPreset === 'usd'
          ? '$'
          : (state.unit || '').trim();

    const targetId = !forceNew && editingId ? editingId : `v_calc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const metricPayload = {
      id: targetId,
      field: metricName,
      isCalculated: true,
      builderMode: mode,
      category: state.category || 'ratio',
      description: (state.description || '').trim() || formulaStr,
      formula: formulaStr,
      operandA: state.operandAField,
      operandAField: state.operandAField,
      operandAAgg: state.operandAField === '__COUNT__' ? 'count' : (state.operandAAgg || 'sum'),
      op: state.op || '/',
      operandB: state.operandBField,
      operandBField: state.operandBField,
      operandBAgg: state.operandBField === '__COUNT__' ? 'count' : (state.operandBAgg || 'sum'),
      constantValue: state.constantValue,
      agg: 'calc',
      showAs: state.showAs || 'normal',
      format: {
        thousands: isPercent ? false : Boolean(state.thousands),
        decimals: Number.isInteger(Number(state.decimals)) ? Number(state.decimals) : 1,
        currency,
        isPercent,
      },
    };

    setCustomMetricsCatalog?.((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === targetId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...metricPayload };
        return next;
      }
      return [metricPayload, ...prev];
    });

    if (addToTable) {
      setPivotConfig?.((prev) => {
        const currentValues = prev.values || [];
        const existsIdx = currentValues.findIndex((v) => v.id === targetId);
        if (existsIdx >= 0) {
          const nextValues = [...currentValues];
          nextValues[existsIdx] = { ...nextValues[existsIdx], ...metricPayload };
          return { ...prev, values: nextValues };
        }
        return {
          ...prev,
          values: [...currentValues, metricPayload],
        };
      });
      showToast?.(editingId && !forceNew ? `已更新自定义指标「${metricName}」` : `已创建并上表自定义指标「${metricName}」`);
    } else {
      showToast?.(`已将「${metricName}」保存至指标资产库`);
    }

    setEditingId(null);
  };

  // Cursor-aware insertion for FX expression mode
  const insertTokenIntoFormula = (snippet) => {
    soundEngine?.playClick?.(520);
    setBuilderMode('expression');
    setFormState((prev) => {
      const cur = prev.formula || '';
      const inputEl = formulaInputRef.current;
      if (inputEl && typeof inputEl.selectionStart === 'number') {
        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd;
        const needsLeadingSpace = start > 0 && cur[start - 1] !== ' ' && !snippet.startsWith(' ');
        const needsTrailingSpace = cur[end] && cur[end] !== ' ' && !snippet.endsWith(' ');
        const insertText = `${needsLeadingSpace ? ' ' : ''}${snippet}${needsTrailingSpace ? ' ' : ''}`;
        const nextFormula = cur.slice(0, start) + insertText + cur.slice(end);
        setTimeout(() => {
          if (formulaInputRef.current) {
            const newPos = start + insertText.length;
            formulaInputRef.current.setSelectionRange(newPos, newPos);
            formulaInputRef.current.focus();
          }
        }, 0);
        return { ...prev, formula: nextFormula };
      }
      const nextFormula = cur ? `${cur.trim()} ${snippet}` : snippet;
      return { ...prev, formula: nextFormula };
    });
  };

  // Active metrics in current pivotConfig.values
  const activeValues = pivotConfig?.values || [];

  // Metric health and diagnostics evaluator
  const getMetricDiagnostic = (vc) => {
    if (!pivotResult || !pivotResult.tableRows) return null;
    const nonTotalRows = (pivotResult.tableRows || []).filter((r) => !r.isTotal);
    if (nonTotalRows.length === 0) return { status: 'empty', label: '暂无明细', color: 'text-ink-muted' };

    const values = [];
    let nullCount = 0;
    let negativeCount = 0;
    let overHundredPctCount = 0;

    for (const row of nonTotalRows) {
      const raw = pivotResult.rawValueMatrix?.[`${row.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`];
      if (raw === null || raw === undefined) {
        nullCount++;
      } else if (typeof raw === 'number' && Number.isFinite(raw)) {
        values.push(raw);
        if (raw < 0) negativeCount++;
        if (vc.format?.isPercent && raw > 1.0) overHundredPctCount++;
      }
    }

    if (values.length === 0) {
      return {
        status: 'null',
        badge: '全为空值',
        color: 'bg-black/5 dark:bg-white/10 text-ink-muted',
        tip: '全表此指标当前无有效值，请检查筛选条件或分子分母字段',
      };
    }
    if (negativeCount > 0) {
      return {
        status: 'warning',
        badge: `${negativeCount}项负值`,
        color: 'bg-[#F92672]/15 text-ink-pink',
        tip: `提示：共有 ${negativeCount} 个类目出现负值，通常代表成本倒挂、退款亏损或逆向差额`,
      };
    }
    if (overHundredPctCount > 0) {
      return {
        status: 'info',
        badge: `${overHundredPctCount}项>100%`,
        color: 'bg-[#66D9EF]/15 text-ink-cyan',
        tip: `提示：共有 ${overHundredPctCount} 个分组比率超 100%，适合核验是否为超额完成率或杠杆比率`,
      };
    }
    return {
      status: 'good',
      badge: '健康正常',
      color: 'bg-[#A6E22E]/15 text-ink-green',
      tip: `计算正常：涵盖 ${values.length} 个分组，数值分布健康，无除零报错`,
    };
  };

  // Move metric order left or right in activeValues
  const moveActiveMetric = (fromIndex, toIndex) => {
    if (isReadOnly || toIndex < 0 || toIndex >= activeValues.length) return;
    soundEngine?.playClick?.(520);
    setPivotConfig?.((prev) => {
      const list = [...(prev.values || [])];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, values: list };
    });
    showToast?.(`已调整指标顺序`);
  };

  // Cycle format preset quickly for native or active metrics
  const cycleFormatPreset = (vc) => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(530);
    const curFmt = vc.format || {};
    let nextFmt;
    if (!curFmt.currency && !curFmt.isPercent) {
      nextFmt = { ...curFmt, currency: '¥', isPercent: false, decimals: 0, thousands: true };
    } else if (curFmt.currency === '¥') {
      nextFmt = { ...curFmt, currency: '', isPercent: true, decimals: 1, thousands: false };
    } else if (curFmt.isPercent) {
      nextFmt = { ...curFmt, currency: '', isPercent: false, decimals: 2, thousands: true };
    } else {
      nextFmt = { ...curFmt, currency: '', isPercent: false, decimals: 0, thousands: true };
    }
    setPivotConfig?.((prev) => ({
      ...prev,
      values: prev.values.map((v) => (v.id === vc.id ? { ...v, format: nextFmt } : v)),
    }));
    showToast?.(`已切换指标格式: ${nextFmt.isPercent ? '百分比 (%)' : nextFmt.currency ? '¥ 人民币' : `${nextFmt.decimals}位小数`}`);
  };

  // Clear all active metrics
  const clearAllActiveMetrics = () => {
    if (isReadOnly || activeValues.length === 0) return;
    soundEngine?.playClick?.(500);
    setPivotConfig?.((prev) => ({
      ...prev,
      values: [],
    }));
    showToast?.('已清空当前透视表指标配置');
  };

  // Batch add all catalog metrics to table
  const addAllCatalogMetricsToTable = () => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(560);
    const toAdd = [];
    for (const cm of customMetricsCatalog) {
      if (!activeValues.some((v) => v.id === cm.id || (v.isCalculated && v.field === cm.field))) {
        toAdd.push(cm);
      }
    }
    if (toAdd.length === 0) {
      showToast?.('所有衍生指标均已在上表中');
      return;
    }
    setPivotConfig?.((prev) => ({
      ...prev,
      values: [...(prev.values || []), ...toAdd],
    }));
    showToast?.(`已批量上表 ${toAdd.length} 个衍生指标`);
  };

  // Toggle a metric from catalog onto/off the active pivot table
  const toggleCatalogMetricOnTable = (metricItem) => {
    if (isReadOnly) return;
    soundEngine?.playClick?.(560);
    const isAlreadyActive = activeValues.some(
      (v) => v.id === metricItem.id || (v.isCalculated === Boolean(metricItem.isCalculated) && v.field === metricItem.field)
    );
    if (isAlreadyActive) {
      setPivotConfig?.((prev) => ({
        ...prev,
        values: (prev.values || []).filter(
          (v) => !(v.id === metricItem.id || (v.isCalculated === Boolean(metricItem.isCalculated) && v.field === metricItem.field))
        ),
      }));
      showToast?.(`已从当前透视表移除「${metricItem.field}」`);
    } else {
      if (metricItem.isCalculated) {
        const newInstance = {
          ...metricItem,
          id: activeValues.some((v) => v.id === metricItem.id)
            ? `v_calc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
            : metricItem.id,
        };
        setPivotConfig?.((prev) => ({
          ...prev,
          values: [...(prev.values || []), newInstance],
        }));
      } else {
        const fMeta = fields.find((f) => f.name === metricItem.field);
        const defs = getMeasureDefaults(fMeta);
        setPivotConfig?.((prev) => ({
          ...prev,
          values: [
            ...(prev.values || []),
            {
              id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
              field: metricItem.field,
              showAs: 'normal',
              ...defs,
            },
          ],
        }));
      }
      showToast?.(`已将「${metricItem.field}」添加至透视表`);
    }
  };

  return (
    <div
      data-testid="metric-center"
      className="metric-center min-w-0 mx-2.5 sm:mx-4 mt-2 p-3 rounded-xl border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822]/95 shadow-md space-y-2.5 shrink-0 animate-apple-stage max-h-[460px] overflow-y-auto apple-font-mono"
    >
      {/* Top Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D6D4C8]/70 dark:border-[#3E3D32]/70">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#272822] dark:text-[#F8F8F2] shrink-0">
            <Calculator className="w-3.5 h-3.5 text-ink-purple" />
            <span>{t("指标中心")}</span>
          </div>

          {/* 3-Tab Segmented Switcher */}
          <div
            role="tablist"
            aria-label={t("指标中心功能视图")}
            className="flex min-w-0 max-w-full flex-wrap items-center rounded-lg p-0.5 bg-[#EFECE1] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] text-[10px]"
          >
            {[
              { id: 'active', label: `${t("已配指标与看板")} (${activeValues.length})` },
              { id: 'studio', label: editingId ? t("编辑自定义指标") : t("+ 新建自定义指标") },
              { id: 'catalog', label: `${t("指标库与模板")} (${customMetricsCatalog.length + measureFields.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => {
                  soundEngine?.playClick?.(500);
                  setActiveTab(tab.id);
                }}
                className={`min-w-0 flex-auto break-words px-2.5 py-1 min-h-[24px] rounded-md font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-[#FFFDF7] dark:bg-[#272822] text-ink-purple shadow-2xs font-bold'
                    : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        <div className="flex items-center gap-2">
          {unifiedChartSpec?.executiveInsight && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E6DB74]/15 border border-[#E6DB74]/30 text-ink-yellow text-[9.5px] truncate max-w-[260px]">
              <Sparkles className="w-3 h-3 text-ink-orange shrink-0" />
              <span className="truncate">
                {t("焦点:")} <strong>{unifiedChartSpec.executiveInsight.topName}</strong> ({unifiedChartSpec.executiveInsight.topFormatted})
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-[#F92672] p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded transition shrink-0"
            title={t("收起指标中心")}
            aria-label={t("收起指标中心")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TAB 1: Active Metrics & Live KPI Cards (已配指标与看板) */}
      {activeTab === 'active' && (
        <div className="space-y-2.5">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
            <div className="flex items-center gap-2 text-ink-muted">
              <span>{t("当前已上表指标:")} <strong className="text-[#272822] dark:text-[#F8F8F2]">{activeValues.length}</strong> 个</span>
              {activeValues.length > 0 && (
                <span className="hidden sm:inline-block text-[9px] text-ink-muted">
                  (包含 {activeValues.filter(v => v.isCalculated).length} 个自定义衍生公式，{activeValues.filter(v => !v.isCalculated).length} 个原生度量)
                </span>
              )}
            </div>
            {activeValues.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={clearAllActiveMetrics}
                  className="px-2 py-0.5 min-h-[24px] rounded border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-[#F92672] text-[9.5px] font-semibold transition"
                  title={t("一键从透视表移除所有数值指标")}
                >
                  {t("清空已配指标")}
                </button>
              </div>
            )}
          </div>

          {activeValues.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-[#D6D4C8] dark:border-[#3E3D32] text-center space-y-2 text-xs text-ink-muted">
              <p>{t("当前透视表尚未配置任何数值或衍生指标。")}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('studio')}
                  className="px-3 py-1 min-h-[28px] rounded-lg bg-[#AE81FF] text-[#1E1F1C] font-bold text-[10.5px] hover:opacity-90 transition"
                >
                  {t("+ 新建自定义计算指标")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-3 py-1 min-h-[28px] rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] text-[10.5px] font-semibold hover:border-[#66D9EF] transition"
                >
                  {t("从指标资产库选用")}
                </button>
              </div>
            </div>
          ) : (
            <div className="metric-kpi-grid grid grid-cols-1 gap-2">
              {activeValues.map((vc, idx) => {
                const kpi = (unifiedChartSpec?.kpiCards || []).find((k) => k.id === vc.id);
                const grandRaw = pivotResult?.displayMatrix?.[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`]?.display ?? null;
                const formattedTotal = kpi?.formattedCurrent || UnifiedFormatter.formatValue(grandRaw, vc, { compact: false });
                const formulaText = vc.isCalculated
                  ? vc.formula || `[${vc.operandAField || vc.operandA}] ${vc.op} [${vc.operandBField || vc.operandB}]`
                  : null;
                const diagnostic = getMetricDiagnostic(vc);

                return (
                  <div
                    key={vc.id}
                    data-testid="metric-center-active-card"
                    className="p-2.5 rounded-lg border border-[#D6D4C8]/90 dark:border-[#3E3D32] bg-[#EFECE1]/40 dark:bg-[#1E1F1C]/80 flex flex-col justify-between gap-2 hover:border-[#66D9EF]/60 transition"
                  >
                    <div>
                      {/* Top Row: Color indicator, Title, Tag & Order Reordering Controls */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#272822] dark:text-[#F8F8F2]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: kpi?.color || '#66D9EF' }}
                            />
                            <span className="truncate" title={vc.field === '__COUNT__' ? t('记录数') : vc.field}>
                              {vc.field === '__COUNT__' ? t('记录数') : vc.field}
                            </span>
                            {vc.isCalculated ? (
                              <span className="px-1 py-0.2 rounded bg-[#AE81FF]/20 text-ink-purple text-[8.5px] font-bold shrink-0">
                                FX 公式
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 rounded bg-[#FD971F]/15 text-ink-orange text-[8.5px] font-semibold shrink-0">
                                {t(AGG_METHODS.find((m) => m.value === vc.agg)?.short || vc.agg)}
                              </span>
                            )}
                            {vc.showAs && vc.showAs !== 'normal' && (
                              <span className="px-1 py-0.2 rounded bg-[#66D9EF]/15 text-ink-cyan text-[8.5px] font-bold shrink-0">
                                {t(SHOW_AS_MODES.find(m => m.value === vc.showAs)?.label || vc.showAs)}
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-bold tracking-tight text-[#272822] dark:text-[#F8F8F2] mt-0.5">
                            {formattedTotal}
                          </div>

                          {/* Metric Health & Diagnostics Pill */}
                          {diagnostic && (
                            <div className="flex items-center gap-1 mt-0.5" title={diagnostic.tip}>
                              <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-semibold ${diagnostic.color}`}>
                                {diagnostic.status === 'good' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                {diagnostic.status === 'warning' && <AlertTriangle className="w-2.5 h-2.5" />}
                                <span>{diagnostic.badge}</span>
                              </span>
                              <span className="text-[8.5px] text-ink-muted truncate max-w-[120px]">
                                {diagnostic.tip}
                              </span>
                            </div>
                          )}

                          {formulaText ? (
                            <div className="text-[9px] text-ink-purple truncate mt-0.5" title={formulaText}>
                              {formulaText}
                            </div>
                          ) : kpi?.comparison ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`inline-flex items-center px-1 py-0.2 rounded text-[8.5px] font-bold ${
                                  kpi.comparison.isPositive
                                    ? 'bg-[#A6E22E]/15 text-ink-green'
                                    : 'bg-[#F92672]/15 text-ink-pink'
                                }`}
                              >
                                {kpi.comparison.pctFormatted}
                              </span>
                              <span className="text-[8.5px] text-ink-muted truncate max-w-[110px]">
                                {t("较")} {kpi.comparison.baselineLabel}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Reorder Left/Right & Sparkline */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="inline-flex items-center rounded border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#272822] p-0.5">
                            <button
                              type="button"
                              disabled={isReadOnly || idx === 0}
                              onClick={() => moveActiveMetric(idx, idx - 1)}
                              className="p-0.5 min-w-[18px] min-h-[18px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] disabled:opacity-30 transition"
                              title={t("向左移一列")}
                              aria-label={`指标 ${vc.field} 向左移一列`}
                            >
                              <ArrowLeft className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isReadOnly || idx === activeValues.length - 1}
                              onClick={() => moveActiveMetric(idx, idx + 1)}
                              className="p-0.5 min-w-[18px] min-h-[18px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] disabled:opacity-30 transition"
                              title={t("向右移一列")}
                              aria-label={`指标 ${vc.field} 向右移一列`}
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          {kpi?.sparkValues && <MiniSparkline values={kpi.sparkValues} color={kpi.color} />}
                        </div>
                      </div>
                    </div>

                    {/* Quick Inline Controls on Card */}
                    <div className="pt-1.5 border-t border-[#D6D4C8]/50 dark:border-[#3E3D32]/60 flex flex-wrap items-center justify-between gap-1 text-[9.5px]">
                      <div className="flex w-full min-w-0 items-center gap-1">
                        {!vc.isCalculated && vc.field !== '__COUNT__' && (
                          <select
                            aria-label={`${vc.field} · ${t("切换聚合口径")}`}
                            disabled={isReadOnly}
                            value={vc.agg || 'sum'}
                            onChange={(e) => {
                              const nextAgg = e.target.value;
                              setPivotConfig?.((prev) => ({
                                ...prev,
                                values: prev.values.map((v) => (v.id === vc.id ? { ...v, agg: nextAgg } : v)),
                              }));
                            }}
                            className="w-0 min-w-0 flex-1 px-1 py-0.5 min-h-[24px] max-w-[45%] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-orange font-bold text-[9.5px] truncate"
                          >
                            {AGG_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{t(m.short)}</option>
                            ))}
                          </select>
                        )}
                        <select
                          aria-label={`${vc.field} · ${t("快捷表计算")}`}
                          disabled={isReadOnly}
                          value={vc.showAs || 'normal'}
                          onChange={(e) => {
                            const nextShowAs = e.target.value;
                            setPivotConfig?.((prev) => ({
                              ...prev,
                              values: prev.values.map((v) => (v.id === vc.id ? { ...v, showAs: nextShowAs } : v)),
                            }));
                          }}
                          className="w-0 min-w-0 max-w-full flex-1 px-1 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted text-[9.5px] truncate"
                        >
                          {SHOW_AS_MODES.map((m) => (
                            <option key={m.value} value={m.value}>{t(m.label)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between w-full pt-0.5">
                        {/* Quick Format Cycle Toggle */}
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => cycleFormatPreset(vc)}
                          className="px-1.5 py-0.5 min-h-[22px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[8.5px] font-semibold text-ink-cyan hover:border-[#66D9EF] transition"
                          title={t("快捷切换格式（常规 / 人民币¥ / 百分比% / 小数位）")}
                        >
                          {vc.format?.isPercent ? '% 百分比' : vc.format?.currency ? `${vc.format.currency} 货币` : vc.format?.decimals ? `${vc.format.decimals}位小数` : '常规格式'}
                        </button>

                        <div className="flex items-center gap-0.5">
                          {vc.isCalculated && (
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => loadMetricForEdit(vc)}
                              className="px-1.5 py-0.5 min-h-[22px] inline-flex items-center gap-0.5 rounded bg-[#AE81FF]/15 hover:bg-[#AE81FF]/30 text-ink-purple font-semibold transition"
                              title={t("编辑该自定义指标公式与格式")}
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>{t("编辑")}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => {
                              setPivotConfig?.((prev) => ({
                                ...prev,
                                values: (prev.values || []).filter((v) => v.id !== vc.id),
                              }));
                              showToast?.(`已从当前表移除指标「${vc.field}」`);
                            }}
                            className="p-1 min-w-[22px] min-h-[22px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#F92672] transition"
                            title={t("从当前透视表移除")}
                            aria-label={`移除指标 ${vc.field}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Bottom Bar: Create Custom Metric + Smart Templates */}
          <div className="pt-2 border-t border-[#D6D4C8]/60 dark:border-[#3E3D32]/60 flex flex-wrap items-center justify-between gap-2">
            <SmartTemplatesBar
              currentDataset={currentDataset}
              setPivotConfig={setPivotConfig}
              setChartType={setChartType}
              setCondFormat={setCondFormat}
              soundEngine={soundEngine}
              showToast={showToast}
              isReadOnly={isReadOnly}
            />
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => {
                initDefaultForm();
                setActiveTab('studio');
              }}
              className="px-2.5 py-1 min-h-[26px] inline-flex items-center gap-1 rounded-lg bg-[#AE81FF]/20 hover:bg-[#AE81FF]/30 border border-[#AE81FF]/40 text-ink-purple text-[10px] font-bold transition shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>{t("新建自定义计算指标")}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Custom Metric Studio (新建 / 编辑自定义指标) */}
      {activeTab === 'studio' && (
        <div className="space-y-2.5 text-[10.5px]">
          {/* Goal-Driven Scenario Tabs */}
          <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-[#D6D4C8]/40 dark:border-[#3E3D32]/40">
            <span className="text-[9.5px] font-bold text-ink-muted shrink-0 flex items-center gap-1">
              <Target className="w-3 h-3 text-ink-purple" />
              <span>{t("分析目标向导:")}</span>
            </span>
            {GOAL_CATEGORIES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  soundEngine?.playClick?.(480);
                  setSelectedGoal(g.id);
                }}
                className={`px-2 py-0.5 min-h-[22px] rounded text-[9px] font-semibold transition ${
                  selectedGoal === g.id
                    ? 'bg-[#AE81FF]/20 text-ink-purple border border-[#AE81FF]/40 font-bold'
                    : 'bg-[#EFECE1]/50 dark:bg-[#1E1F1C] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                }`}
                title={g.desc}
              >
                {t(g.label)}
              </button>
            ))}
          </div>

          {/* Smart 1-Click Industry Metric Presets */}
          {filteredSmartPresets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#D6D4C8]/50 dark:border-[#3E3D32]/50">
              <span className="text-[9.5px] font-bold text-ink-muted shrink-0">{t("计算模板（先查看口径）:")}</span>
              {filteredSmartPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="inline-flex max-w-full min-w-0 items-center rounded-md border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/60 dark:bg-[#1E1F1C] overflow-hidden"
                >
                  <button
                    type="button"
                    disabled={isReadOnly}
                    data-testid={`metric-preset-${preset.id}`}
                    onClick={() => applyPresetToStudio(preset, false)}
                    className="min-w-0 break-words px-2 py-0.5 min-h-[24px] hover:bg-black/5 dark:hover:bg-white/5 text-[#272822] dark:text-[#F8F8F2] text-[9.5px] font-semibold transition"
                    title={`${preset.spec.description} (点击载入到下方编辑器)`}
                  >
                    {preset.label}
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    data-testid={`metric-preset-add-${preset.id}`}
                    aria-label={`+上表：${preset.label}`}
                    onClick={() => applyPresetToStudio(preset, true)}
                    className="shrink-0 px-1.5 py-0.5 min-h-[24px] bg-[#AE81FF]/15 hover:bg-[#AE81FF] text-ink-purple hover:text-[#1E1F1C] text-[9px] font-bold border-l border-[#D6D4C8] dark:border-[#3E3D32] transition"
                    title={t("一键直接生成并添加到透视表")}
                  >
                    {t("+上表")}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p data-testid="metric-preset-guidance" className="text-ink-muted leading-relaxed">
            {t('模板只描述计算方式。请先核对字段、单位和统计粒度，再决定是否上表。')}
          </p>

          {/* Builder Mode Switcher: 双字段四则 / 复合净率 / 常数折算 / FX高级公式 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9.5px] text-ink-muted font-semibold">{t("构建模式:")}</span>
              {[
                { id: 'binary', label: '双字段四则 (A ÷ B)' },
                { id: 'margin', label: '差额比 ((A - B) ÷ A)' },
                { id: 'constant', label: '常数折算 (A ÷ 10000)' },
                { id: 'expression', label: 'FX 高级公式表达式' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick?.(480);
                    if (m.id === 'expression' && builderMode !== 'expression') {
                      setFormState((p) => ({ ...p, formula: effectiveFormula }));
                    }
                    setBuilderMode(m.id);
                  }}
                  aria-pressed={builderMode === m.id}
                  className={`px-2 py-0.5 min-h-[24px] rounded text-[9.5px] font-semibold transition ${
                    builderMode === m.id
                      ? 'bg-[#AE81FF] text-[#1E1F1C] font-bold shadow-2xs'
                      : 'bg-[#EFECE1] dark:bg-[#1E1F1C] text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  {t(m.label)}
                </button>
              ))}
            </div>

            {editingId && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FD971F]/20 text-ink-orange text-[9.5px] font-bold">
                <span>{t("正在编辑已有指标")}</span>
                <button
                  type="button"
                  onClick={initDefaultForm}
                  className="underline hover:text-[#F92672] min-h-[24px] px-1"
                >
                  {t("切换为新建")}
                </button>
              </span>
            )}
          </div>

          {/* Row 1: Metric Metadata (Name, Category, Description) */}
          <div className="metric-metadata-grid grid grid-cols-1 gap-2">
            <div>
              <label className="block text-[9.5px] text-ink-muted mb-0.5">{t("自定义指标名称:")}</label>
              <input
                type="text"
                aria-label={t("自定义指标名称")}
                disabled={isReadOnly}
                value={formState.name}
                onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("如: 毛利率 / 客单价 / 净利率")}
                className="w-full px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10.5px] font-bold focus:outline-none focus:border-[#AE81FF]"
              />
            </div>

            <div>
              <label className="block text-[9.5px] text-ink-muted mb-0.5">{t("指标业务分类:")}</label>
              <select
                aria-label={t("自定义指标业务分类")}
                disabled={isReadOnly}
                value={formState.category}
                onChange={(e) => setFormState((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
              >
                {METRIC_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{t(c.label)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] text-ink-muted mb-0.5">{t("业务口径说明 (选填):")}</label>
              <input
                type="text"
                aria-label={t("业务口径说明")}
                disabled={isReadOnly}
                value={formState.description}
                onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
                placeholder={t("记录该指标的业务定义或计算口径说明...")}
                className="w-full px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
              />
            </div>
          </div>

          {/* Row 2: Formula Definition (Visual Guided OR FX Expression Editor) */}
          {builderMode !== 'expression' ? (
            <div className="space-y-1.5">
              <div className="metric-formula-grid p-2.5 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32] grid grid-cols-1 gap-2 items-end">
                {/* Operand A */}
                <div>
                  <label className="block text-[9.5px] text-ink-muted mb-0.5">
                    {builderMode === 'margin' ? t("基准指标 A (如销售额):") : t("首项/分子 (指标 A):")}
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      aria-label={t("自定义指标首项字段")}
                      disabled={isReadOnly}
                      value={formState.operandAField}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isDim = val !== '__COUNT__' && !measureFields.some(m => m.name === val);
                        setFormState((p) => ({
                          ...p,
                          operandAField: val,
                          operandAAgg: isDim ? 'count_distinct' : (val === '__COUNT__' ? 'count' : 'sum'),
                        }));
                      }}
                      className="flex-1 min-w-0 px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                    >
                      <option value="__COUNT__">{t("记录数 (COUNT)")}</option>
                      {measureFields.length > 0 && (
                        <optgroup label={t("📊 数值度量 (推荐求和/均值)")}>
                          {measureFields.map((f) => (
                            <option key={f.name} value={f.name}>{f.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {dimensionFields.length > 0 && (
                        <optgroup label={t("🏷️ 维度字段 (推荐去重计数 COUNTD)")}>
                          {dimensionFields.map((f) => (
                            <option key={f.name} value={f.name}>{f.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {formState.operandAField !== '__COUNT__' && (
                      <select
                        aria-label={t("首项聚合方式")}
                        disabled={isReadOnly}
                        value={formState.operandAAgg}
                        onChange={(e) => setFormState((p) => ({ ...p, operandAAgg: e.target.value }))}
                        className="w-20 shrink-0 px-1.5 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] text-ink-orange font-bold"
                      >
                        {AGG_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{t(m.short)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-[9.5px] text-ink-muted mb-0.5">{t("运算规则:")}</label>
                  {builderMode === 'margin' ? (
                    <div className="px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-center font-bold text-ink-purple text-[10px]">
                      (A - B) ÷ A
                    </div>
                  ) : (
                    <select
                      aria-label={t("自定义指标运算符")}
                      disabled={isReadOnly}
                      value={formState.op}
                      onChange={(e) => {
                        const nextOp = e.target.value;
                        setFormState((p) => ({
                          ...p,
                          op: nextOp,
                          formatPreset: nextOp === '/' && builderMode === 'binary' ? 'percent' : p.formatPreset === 'percent' ? 'number' : p.formatPreset,
                        }));
                      }}
                      className="w-full px-1.5 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10.5px] text-center font-bold text-ink-pink"
                    >
                      <option value="/">÷ ({t("除以")})</option>
                      <option value="*">× ({t("乘以")})</option>
                      <option value="-">- ({t("减去")})</option>
                      <option value="+">+ ({t("加上")})</option>
                    </select>
                  )}
                </div>

                {/* Operand B or Constant */}
                <div>
                  {builderMode === 'constant' ? (
                    <>
                      <label className="block text-[9.5px] text-ink-muted mb-0.5">{t("常数/折算系数:")}</label>
                      <input
                        type="number"
                        step="any"
                        aria-label={t("常数系数")}
                        disabled={isReadOnly}
                        value={formState.constantValue}
                        onChange={(e) => setFormState((p) => ({ ...p, constantValue: e.target.value }))}
                        className="w-full px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10.5px] font-bold"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-[9.5px] text-ink-muted mb-0.5">
                        {builderMode === 'margin' ? t("扣除项指标 B (如成本):") : t("次项/分母 (指标 B):")}
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          aria-label={t("自定义指标次项字段")}
                          disabled={isReadOnly}
                          value={formState.operandBField}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isDim = val !== '__COUNT__' && !measureFields.some(m => m.name === val);
                            setFormState((p) => ({
                              ...p,
                              operandBField: val,
                              operandBAgg: isDim ? 'count_distinct' : (val === '__COUNT__' ? 'count' : 'sum'),
                            }));
                          }}
                          className="flex-1 min-w-0 px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                        >
                          <option value="__COUNT__">{t("记录数 (COUNT)")}</option>
                          {measureFields.length > 0 && (
                            <optgroup label={t("📊 数值度量 (推荐求和/均值)")}>
                              {measureFields.map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {dimensionFields.length > 0 && (
                            <optgroup label={t("🏷️ 维度字段 (推荐去重计数 COUNTD)")}>
                              {dimensionFields.map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {formState.operandBField !== '__COUNT__' && (
                          <select
                            aria-label={t("次项聚合方式")}
                            disabled={isReadOnly}
                            value={formState.operandBAgg}
                            onChange={(e) => setFormState((p) => ({ ...p, operandBAgg: e.target.value }))}
                            className="w-20 shrink-0 px-1.5 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] text-ink-orange font-bold"
                          >
                            {AGG_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{t(m.short)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Natural Language Interpretation Banner */}
              <div data-testid="metric-formula-explanation" className="flex flex-wrap items-start gap-2 px-2.5 py-1 rounded bg-[#66D9EF]/10 border border-[#66D9EF]/30 text-[11px] leading-relaxed">
                <span className="text-ink-cyan min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
                  {naturalLanguageFormulaNote}
                </span>
              </div>
            </div>
          ) : (
            /* FX Expression Editor Mode */
            <div className="p-2.5 rounded-lg bg-[#EFECE1]/60 dark:bg-[#1E1F1C] border border-[#AE81FF]/40 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="min-w-0 text-[9.5px] font-bold text-ink-purple [overflow-wrap:anywhere]">
                  {t("FX 公式表达式 (支持 SUM/AVG/COUNT/COUNTD/MIN/MAX/MEDIAN/STDDEV/ROUND/ABS 及括号四则运算):")}
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  {['SUM(', 'AVG(', 'COUNTD(', 'COUNT()', 'ROUND(', 'IFNULL(', '(', ')', ' / ', ' * ', ' - ', ' + '].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => insertTokenIntoFormula(tok)}
                      className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] hover:border-[#AE81FF] text-[9.5px] font-bold transition"
                    >
                      {tok.trim()}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setFormState(p => ({ ...p, formula: '' }))}
                    className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-ink-muted hover:text-[#F92672] text-[9.5px] transition"
                  >
                    {t("清空")}
                  </button>
                </div>
              </div>

              <input
                ref={formulaInputRef}
                type="text"
                aria-label={t("自定义指标公式表达式")}
                disabled={isReadOnly}
                value={formState.formula}
                onChange={(e) => setFormState((p) => ({ ...p, formula: e.target.value }))}
                placeholder="例如: (SUM([销售额]) - SUM([毛利])) / SUM([销售额])"
                className="w-full px-2.5 py-1.5 min-h-[28px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#49483E] text-xs font-bold text-ink-purple focus:outline-none focus:border-[#AE81FF]"
              />

              {/* Click-to-Insert Field Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] text-ink-muted">{t("点击插入字段:")}</span>
                {fields.map((f) => {
                  const isM = isMeasureField(f);
                  const snippet = `${isM ? 'SUM' : 'COUNTD'}(${formatFormulaField(f.name)})`;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => insertTokenIntoFormula(snippet)}
                      className="px-1.5 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#272822] border border-[#D6D4C8] dark:border-[#3E3D32] hover:border-[#66D9EF] text-[9px] transition"
                      title={`点击在光标处插入 ${snippet}`}
                    >
                      + [{f.name}]
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {builderMode === 'binary' && formState.op === '*' && (
            <p data-testid="aggregate-product-warning" className="text-[11px] leading-relaxed text-ink-muted">
              {t('先分别汇总两项，再相乘；这不是逐行相乘后求和。如需计算销售额，请使用每条记录的金额字段。')}
            </p>
          )}

          {/* Row 3: Format, ShowAs & Live Trial Preview + Save Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Format Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[9.5px] text-ink-muted">{t("格式:")}</span>
                <select
                  aria-label={t("自定义指标数值格式")}
                  disabled={isReadOnly}
                  value={formState.formatPreset}
                  onChange={(e) => {
                    const nextPreset = e.target.value;
                    setFormState((p) => ({
                      ...p,
                      formatPreset: nextPreset,
                      decimals: nextPreset === 'percent' ? 1 : p.decimals,
                    }));
                  }}
                  className="px-2 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px] font-semibold"
                >
                  <option value="percent">{t("百分比 (28.4%)")}</option>
                  <option value="number">{t("数值 (1,234.5)")}</option>
                  <option value="cny">{t("人民币 (¥1,234)")}</option>
                  <option value="usd">{t("美元 ($1,234)")}</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9.5px] text-ink-muted">{t("小数:")}</span>
                <select
                  aria-label={t("自定义指标小数位数")}
                  disabled={isReadOnly}
                  value={formState.decimals}
                  onChange={(e) => setFormState((p) => ({ ...p, decimals: Number(e.target.value) }))}
                  className="px-1.5 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                >
                  <option value={0}>0 {t("位")}</option>
                  <option value={1}>1 {t("位")}</option>
                  <option value={2}>2 {t("位")}</option>
                  <option value={3}>3 {t("位")}</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9.5px] text-ink-muted">{t("表计算:")}</span>
                <select
                  aria-label={t("自定义指标默认表计算")}
                  disabled={isReadOnly}
                  value={formState.showAs}
                  onChange={(e) => setFormState((p) => ({ ...p, showAs: e.target.value }))}
                  className="px-1.5 py-1 min-h-[26px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                >
                  {SHOW_AS_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{t(m.label)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Validation & Preview + Commit Buttons */}
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <div
                data-testid="metric-live-preview"
                className={`inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] ${
                  formulaValidation.valid
                    ? 'bg-[#A6E22E]/10 border-[#A6E22E]/40 text-ink-green'
                    : 'bg-[#F92672]/10 border-[#F92672]/40 text-ink-pink'
                }`}
              >
                {formulaValidation.valid ? (
                  <>
                    <Check className="w-3 h-3 shrink-0" />
                    <span className="text-ink-muted">{t("实时全表试算:")}</span>
                    <strong className="min-w-0 [overflow-wrap:anywhere] text-[#272822] dark:text-[#F8F8F2]">{livePreviewResult.formatted}</strong>
                    <span className="hidden md:inline text-[9px] text-ink-muted truncate max-w-[180px]" title={effectiveFormula}>
                      ({effectiveFormula})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[240px]">{formulaValidation.error}</span>
                  </>
                )}
              </div>

              {formulaValidation.valid && (
                <span data-testid="metric-preview-scope" className="text-[10px] leading-relaxed text-ink-muted">
                  {t('基于全部导入记录，不应用当前筛选；上表后按透视表范围计算。')}
                </span>
              )}

              {/* One-Click Auto-Fix Suggestion for Beginners */}
              {suggestedFormulaFix && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine?.playClick?.(560);
                    setFormState((p) => ({ ...p, formula: suggestedFormulaFix }));
                    showToast?.('已自动修复公式格式');
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 min-h-[26px] rounded-lg bg-[#E6DB74]/20 hover:bg-[#E6DB74]/35 border border-[#E6DB74]/50 text-ink-yellow text-[9.5px] font-bold transition animate-pulse"
                  title={`点击应用建议修复: ${suggestedFormulaFix}`}
                >
                  <Wand2 className="w-3 h-3 shrink-0 text-ink-orange" />
                  <span>{t("✨ 建议修复")}</span>
                </button>
              )}

              <button
                type="button"
                disabled={isReadOnly || !formulaValidation.valid || !formState.name.trim() || Boolean(editingId && activeValues.some(metric => metric.id === editingId))}
                title={editingId && activeValues.some(metric => metric.id === editingId)
                  ? '该指标正在表中使用，请选择“保存修改并更新透视表”' : undefined}
                onClick={() => commitMetricObject({ addToTable: false })}
                className="px-2.5 py-1 min-h-[28px] rounded-lg border border-[#D6D4C8] dark:border-[#49483E] bg-[#FFFDF7] dark:bg-[#1E1F1C] hover:border-[#AE81FF] text-[10px] font-semibold transition disabled:opacity-40"
              >
                {t("仅存指标库")}
              </button>

              {editingId && (
                <button
                  type="button"
                  disabled={isReadOnly || !formulaValidation.valid || !formState.name.trim()}
                  onClick={() => commitMetricObject({ addToTable: true, forceNew: true })}
                  className="px-2.5 py-1 min-h-[28px] rounded-lg border border-[#AE81FF]/60 bg-[#AE81FF]/15 text-ink-purple hover:bg-[#AE81FF]/30 text-[10px] font-semibold transition disabled:opacity-40"
                  title={t("保留原指标不变，以此为模板另存为新指标")}
                >
                  {t("另存为新指标")}
                </button>
              )}

              <button
                type="button"
                data-testid="metric-center-submit"
                disabled={isReadOnly || !formulaValidation.valid || !formState.name.trim()}
                onClick={() => commitMetricObject({ addToTable: true })}
                className="inline-flex items-center gap-1 px-3 py-1 min-h-[28px] rounded-lg bg-[#A6E22E] hover:bg-[#B8F03E] text-[#1E1F1C] font-bold text-[10.5px] shadow-2xs transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? t("保存修改并更新透视表") : t("添加指标并上表")}</span>
              </button>
            </div>
          </div>

          {/* Dimension Breakdown Sample Preview Pills */}
          {formulaValidation.valid && sampleDimensionBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#D6D4C8]/40 dark:border-[#3E3D32]/40 text-[9.5px]">
              <span className="text-ink-muted">
                {t("分维度抽样试算")} ({sampleDimensionBreakdown[0].dimName}):
              </span>
              {sampleDimensionBreakdown.map((item) => (
                <span
                  key={item.groupName}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#3E3D32]"
                >
                  <span className="font-semibold text-ink-muted">{item.groupName}:</span>
                  <strong className="text-ink-cyan">{item.formatted}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Metric Catalog & Smart Templates (指标库与模板) */}
      {activeTab === 'catalog' && (
        <div className="space-y-2.5 text-[10.5px]">
          {/* Top Filter and Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filter by Scope */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: `全部指标 (${customMetricsCatalog.length + measureFields.length})` },
                { id: 'custom', label: `自定义衍生指标 (${customMetricsCatalog.length})` },
                { id: 'native', label: `原生度量字段 (${measureFields.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCatalogFilter(f.id)}
                  className={`px-2 py-0.5 min-h-[24px] rounded text-[9.5px] font-semibold transition ${
                    catalogFilter === f.id
                      ? 'bg-[#FFFDF7] dark:bg-[#1E1F1C] text-ink-cyan border border-[#66D9EF]/50 font-bold'
                      : 'text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  {t(f.label)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative w-36 sm:w-44">
                <Search className="w-3 h-3 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label={t("搜索指标库")}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder={t("搜索指标名称或公式...")}
                  className="w-full pl-6 pr-2 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] text-[10px]"
                />
              </div>

              {/* Batch On-Table Helper */}
              {customMetricsCatalog.length > 0 && (
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={addAllCatalogMetricsToTable}
                  className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 min-h-[24px] rounded bg-[#AE81FF]/15 hover:bg-[#AE81FF]/25 text-ink-purple text-[9.5px] font-semibold transition"
                  title={t("一键将资产库所有衍生指标批量添加上表")}
                >
                  <span>{t("批量上表")}</span>
                </button>
              )}

              {/* Export / Import Metrics JSON Actions */}
              <button
                type="button"
                onClick={() => {
                  try {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customMetricsCatalog, null, 2));
                    const dl = document.createElement('a');
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `pivotstudio_metrics_${currentDataset?.name || 'custom'}.json`);
                    document.body.appendChild(dl);
                    dl.click();
                    dl.remove();
                    showToast?.('已导出指标库定义 (JSON)');
                  } catch {
                    showToast?.('导出指标库失败', 'error');
                  }
                }}
                className="px-2 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] hover:border-ink-cyan text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] text-[9.5px] font-semibold inline-flex items-center gap-1 transition"
                title={t("导出当前数据集自定义指标定义 (JSON)")}
              >
                <Download className="w-2.5 h-2.5" />
                <span>{t("导出")}</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => importInputRef.current?.click()}
                className="px-2 py-0.5 min-h-[24px] rounded bg-[#FFFDF7] dark:bg-[#1E1F1C] border border-[#D6D4C8] dark:border-[#49483E] hover:border-ink-purple text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] text-[9.5px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                title={t("导入外部指标定义 (JSON)")}
              >
                <Upload className="w-2.5 h-2.5" />
                <span>{t("导入")}</span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={isReadOnly}
                aria-label={t('导入指标定义 JSON')}
                onChange={(e) => {
                  if (isReadOnly) return;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onerror = () => showToast?.('读取指标文件失败，请重新选择文件', 'error');
                  reader.onload = (event) => {
                    if (importContextRef.current.isReadOnly || importContextRef.current.datasetId !== currentDataset?.id) return;
                    try {
                      const parsed = normalizeMetricDefinitions(JSON.parse(event.target?.result), fields);
                      validateMetricCatalogMerge(customMetricsCatalog, parsed);
                      const replacements = new Map(parsed.map(metric => [metric.id, metric]));
                      setPivotConfig?.(prev => ({
                        ...prev,
                        values: (prev.values || []).map(metric =>
                          metric.isCalculated && replacements.has(metric.id)
                            ? { ...metric, ...replacements.get(metric.id) }
                            : metric
                        )
                      }));
                      setCustomMetricsCatalog?.((prev) => {
                        const map = new Map(prev.map((m) => [m.id || m.field, m]));
                        for (const item of parsed) {
                          map.set(item.id, item);
                        }
                        return Array.from(map.values());
                      });
                      const updated = (pivotConfig?.values || []).filter(metric => metric.isCalculated && replacements.has(metric.id)).length;
                      showToast?.(`已成功导入 ${parsed.length} 个指标定义${updated ? `，同步更新 ${updated} 个已上表指标` : ''}`);
                    } catch (error) {
                      showToast?.(`导入指标失败：${error.message}`, 'error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Secondary Filter: Business Category Filter Pills */}
          {catalogFilter !== 'native' && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[9px] text-ink-muted">{t("业务分类:")}</span>
              {[
                { id: 'all', label: '全部' },
                ...METRIC_CATEGORIES
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatalogCategoryFilter(c.id)}
                  className={`px-1.5 py-0.2 rounded text-[9px] font-semibold transition ${
                    catalogCategoryFilter === c.id
                      ? 'bg-[#AE81FF]/25 text-ink-purple border border-[#AE81FF]/50 font-bold'
                      : 'bg-black/5 dark:bg-white/5 text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2]'
                  }`}
                >
                  {t(c.label)}
                </button>
              ))}
            </div>
          )}

          {/* Metric Cards Grid or Zero Search Results Helper */}
          {catalogFilter !== 'native' &&
           customMetricsCatalog.filter((m) => {
             if (catalogCategoryFilter !== 'all' && m.category !== catalogCategoryFilter) return false;
             if (!catalogSearch.trim()) return true;
             const q = catalogSearch.toLowerCase();
             return m.field.toLowerCase().includes(q) || (m.formula || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
           }).length === 0 &&
           catalogSearch.trim() && (
            <div className="p-4 rounded-lg border border-dashed border-[#D6D4C8] dark:border-[#3E3D32] text-center space-y-2">
              <p className="text-ink-muted text-[10px]">
                {t("未在指标库中找到包含")} “<strong className="text-[#272822] dark:text-[#F8F8F2]">{catalogSearch}</strong>” {t("的指标定义")}
              </p>
              <button
                type="button"
                onClick={() => {
                  soundEngine?.playClick?.(540);
                  initDefaultForm();
                  setFormState((p) => ({
                    ...p,
                    name: catalogSearch.trim(),
                    description: `基于搜索「${catalogSearch.trim()}」创建的业务指标`,
                  }));
                  setActiveTab('studio');
                }}
                className="px-2.5 py-1 min-h-[26px] rounded-lg bg-[#AE81FF]/20 hover:bg-[#AE81FF]/30 border border-[#AE81FF]/40 text-ink-purple text-[10px] font-bold transition inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t("以此名称新建自定义指标")}</span>
              </button>
            </div>
          )}

          <div className="metric-catalog-grid grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
            {/* Custom Metrics in Catalog */}
            {catalogFilter !== 'native' &&
              customMetricsCatalog
                .filter((m) => {
                  if (catalogCategoryFilter !== 'all' && m.category !== catalogCategoryFilter) return false;
                  if (!catalogSearch.trim()) return true;
                  const q = catalogSearch.toLowerCase();
                  return m.field.toLowerCase().includes(q) || (m.formula || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
                })
                .map((cm) => {
                  const isOnTable = activeValues.some((v) => v.id === cm.id || (v.isCalculated && v.field === cm.field));
                  const catObj = METRIC_CATEGORIES.find((c) => c.id === cm.category) || METRIC_CATEGORIES[0];
                  const fmtText = cm.format?.isPercent
                    ? `百分比 (${cm.format?.decimals ?? 1}位小数)`
                    : cm.format?.currency
                      ? `${cm.format.currency} 货币`
                      : `${cm.format?.decimals ?? 0}位小数`;
                  const refFields = getReferencedFieldNames(cm.formula);

                  return (
                    <div
                      key={cm.id}
                      className="p-2 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#EFECE1]/50 dark:bg-[#1E1F1C]/90 flex items-center justify-between gap-2 hover:border-[#AE81FF]/50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className={`px-1 py-0.2 rounded border text-[8.5px] font-bold shrink-0 ${catObj.color}`}>
                            {t(catObj.label)}
                          </span>
                          <span className="font-bold text-[#272822] dark:text-[#F8F8F2] shrink-0 max-w-[140px] sm:max-w-[180px] truncate" title={cm.field}>
                            {cm.field}
                          </span>
                        </div>
                        <div className="text-[9px] text-ink-purple truncate mt-0.5" title={cm.formula}>
                          {cm.formula}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[8.5px] text-ink-muted truncate mt-0.2">
                          <span>{fmtText}</span>
                          {refFields.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded truncate max-w-[120px]" title={`依赖字段: ${refFields.join(', ')}`}>
                              <Layers className="w-2.5 h-2.5 shrink-0" />
                              <span>{refFields.join(', ')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => toggleCatalogMetricOnTable(cm)}
                          className={`px-2 py-0.5 min-h-[24px] rounded text-[9.5px] font-bold transition ${
                            isOnTable
                              ? 'bg-[#A6E22E]/20 text-ink-green border border-[#A6E22E]/40'
                              : 'bg-[#AE81FF]/20 text-ink-purple hover:bg-[#AE81FF] hover:text-[#1E1F1C]'
                          }`}
                        >
                          {isOnTable ? t("✓ 已上表") : t("+ 上表")}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              if (!navigator.clipboard?.writeText) throw new Error('剪贴板不可用');
                              await navigator.clipboard.writeText(cm.formula || '');
                              showToast?.(`已复制「${cm.field}」公式`);
                            } catch {
                              showToast?.('复制公式失败', 'error');
                            }
                          }}
                          className="p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#272822] dark:hover:text-[#F8F8F2] transition"
                          title={t("复制该指标公式")}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => loadMetricForEdit(cm)}
                          className="p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded text-ink-muted hover:text-ink-cyan transition"
                          title={t("编辑该自定义指标")}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isReadOnly || isOnTable}
                          onClick={() => {
                            setCustomMetricsCatalog?.((prev) => prev.filter((item) => item.id !== cm.id));
                            showToast?.(`已从指标库删除「${cm.field}」`);
                          }}
                          className="p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center rounded text-ink-muted hover:text-[#F92672] disabled:opacity-40"
                          title={isOnTable ? t('先点击“已上表”从数值区移除，再删除指标定义') : t("从指标库删除")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

            {/* Native Dataset Measure Fields */}
            {catalogFilter !== 'custom' &&
              measureFields
                .filter((f) => !catalogSearch.trim() || f.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                .map((mf) => {
                  const isOnTable = activeValues.some((v) => !v.isCalculated && v.field === mf.name);
                  return (
                    <div
                      key={mf.name}
                      className="p-2 rounded-lg border border-[#D6D4C8] dark:border-[#3E3D32] bg-[#FFFDF7] dark:bg-[#1E1F1C]/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="px-1 py-0.2 rounded bg-[#FD971F]/15 text-ink-orange text-[8.5px] font-bold shrink-0">
                            {t("原生度量")}
                          </span>
                          <span className="font-bold text-[#272822] dark:text-[#F8F8F2] truncate">{mf.name}</span>
                        </div>
                        <div className="text-[9px] text-ink-muted truncate mt-0.5">
                          {t("默认聚合: 求和 / 均值")}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => toggleCatalogMetricOnTable({ field: mf.name, isCalculated: false })}
                        className={`px-2 py-0.5 min-h-[24px] rounded text-[9.5px] font-bold transition shrink-0 ${
                          isOnTable
                            ? 'bg-[#A6E22E]/20 text-ink-green border border-[#A6E22E]/40'
                            : 'bg-[#EFECE1] dark:bg-[#272822] text-[#272822] dark:text-[#F8F8F2] hover:bg-[#FD971F] hover:text-[#1E1F1C]'
                        }`}
                      >
                        {isOnTable ? t("✓ 已上表") : t("+ 上表")}
                      </button>
                    </div>
                  );
                })}
          </div>

          <div className="pt-1.5 border-t border-[#D6D4C8]/60 dark:border-[#3E3D32]/60">
            <SmartTemplatesBar
              currentDataset={currentDataset}
              setPivotConfig={setPivotConfig}
              setChartType={setChartType}
              setCondFormat={setCondFormat}
              soundEngine={soundEngine}
              showToast={showToast}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
}
