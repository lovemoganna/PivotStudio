import { formatDimensionValue } from '../../../utils/formatters.js';
import { encodeGroupSegment } from '../../../utils/groupKeys.js';
import { parseFormulaAST, evaluateFormulaAST } from './formulaEngine.js';
import { analyticNumber } from '../../../utils/normalizeScalar.js';

export function computeAggregation(records, fieldName, aggMethod) {
  return aggregateWithSamples(records, fieldName, aggMethod).value;
}

export function aggregateWithSamples(records = [], fieldName, aggMethod) {
  records = records || [];
  const total = records.length;
  const finish = (value, valid, missing = total - valid, invalid = 0) => ({ value, total, valid, missing, invalid });
  const isVirtualCount = fieldName === '__COUNT__' || !fieldName;
  if (isVirtualCount) {
    if (aggMethod === 'count' || !aggMethod) return finish(total, total);
  }
  const meaningful = (v) => v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '');
  if (aggMethod === 'count') {
    const count = records.filter((r) => meaningful(r[fieldName])).length;
    return finish(count, count);
  }
  if (aggMethod === 'count_distinct') {
    if (isVirtualCount) return finish(total > 0 ? 1 : 0, total);
    const values = records.map(r => r[fieldName]).filter(meaningful);
    return finish(new Set(values.map(String)).size, values.length);
  }
  let sum = 0, count = 0, missing = 0, invalid = 0, min = Infinity, max = -Infinity;
  const numList = (aggMethod === 'median' || aggMethod === 'stddev') ? [] : null;
  for (const row of records) {
    const raw = row[fieldName];
    if (!meaningful(raw)) { missing++; continue; }
    const value = analyticNumber(raw);
    if (value === null) { invalid++; continue; }
    sum += value;
    count++;
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (numList) numList.push(value);
  }
  const result = value => finish(Number.isFinite(value) ? value : null, count, missing, invalid);
  if (!count) return result(null);
  if (aggMethod === 'avg') return result(sum / count);
  if (aggMethod === 'min') return result(min);
  if (aggMethod === 'max') return result(max);
  if (aggMethod === 'median') {
    numList.sort((a, b) => a - b);
    const mid = Math.floor(count / 2);
    return result(count % 2 !== 0 ? numList[mid] : (numList[mid - 1] + numList[mid]) / 2);
  }
  if (aggMethod === 'stddev') {
    if (count <= 1) return result(null);
    const mean = sum / count;
    const sqDiffSum = numList.reduce((acc, val) => acc + (val - mean) ** 2, 0);
    return result(Math.sqrt(sqDiffSum / (count - 1)));
  }
  return result(sum);
}

export function calculatePivot(dataset, pivotConfig, onProgress) {
  onProgress?.(5);
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const allRows = dataset?.rows || [];
  const fieldMap = new Map((dataset?.fields || []).map((f) => [f.name, f]));
  const validFieldNames = new Set(fieldMap.keys());
  validFieldNames.add('__COUNT__');

  // Field Sanity Guard: 字段有效性自愈守卫
  // 过滤掉当前数据集中不存在的失效字段，避免因筛选器残留导致整表记录被清空
  const ignoredFilters = [];
  const filters = [];
  (pivotConfig?.filters || []).forEach((f) => {
    if (validFieldNames.has(f.field)) {
      filters.push(f);
    } else {
      ignoredFilters.push(f.field);
    }
  });

  const ignoredRows = [];
  const rowConfigs = [];
  (pivotConfig?.rows || []).forEach((r, i) => {
    if (validFieldNames.has(r.field)) {
      rowConfigs.push({
        id: r.id || `r_${i}`,
        field: r.field,
        sort: r.sort || 'none',
        dateGranularity: r.dateGranularity || 'raw',
        numberBin: r.numberBin || null,
        excludedValues: r.excludedValues || [],
      });
    } else {
      ignoredRows.push(r.field);
    }
  });

  const ignoredCols = [];
  const colConfigs = [];
  (pivotConfig?.columns || []).forEach((c, i) => {
    if (validFieldNames.has(c.field)) {
      colConfigs.push({
        id: c.id || `c_${i}`,
        field: c.field,
        sort: c.sort || 'none',
        dateGranularity: c.dateGranularity || 'raw',
        numberBin: c.numberBin || null,
        excludedValues: c.excludedValues || [],
      });
    } else {
      ignoredCols.push(c.field);
    }
  });

  const ignoredVals = [];
  const valConfigs = [];
  (pivotConfig?.values || []).forEach((v, i) => {
    if (v.isCalculated || validFieldNames.has(v.field)) {
      valConfigs.push({
        id: v.id || `v_${i}`,
        field: v.field,
        agg: v.isCalculated ? 'calc' : (v.agg || 'sum'),
        showAs: v.showAs || 'normal',
        format: v.format || { thousands: true, decimals: v.isCalculated && v.op === '/' ? 1 : 0, currency: '', isPercent: Boolean(v.isCalculated && v.op === '/') },
        isCalculated: Boolean(v.isCalculated),
        operandA: v.operandA,
        op: v.op,
        operandB: v.operandB,
        operandAField: v.operandAField,
        operandAAgg: v.operandAAgg,
        operandBField: v.operandBField,
        operandBAgg: v.operandBAgg,
        formula: v.formula || '',
        description: v.description || '',
      });
    } else {
      ignoredVals.push(v.field);
    }
  });

  const collapsedRowKeys = pivotConfig?.collapsedRowKeys || {};
  const collapsedColKeys = pivotConfig?.collapsedColKeys || {};
  const showSubtotals = Boolean(pivotConfig?.showSubtotals);

  // 1. Filter records
  const filteredRows = allRows.filter((record, index) => {
    if (index % 10000 === 0) onProgress?.(5 + Math.round(index / Math.max(1, allRows.length) * 20));
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      if (f.excludeAll) return false;
      if (f.selectedValues && f.selectedValues.length > 0) {
        const rawStr = String(record[f.field] ?? '');
        if (!f.selectedValues.includes(rawStr)) return false;
      }
    }
    for (let i = 0; i < rowConfigs.length; i++) {
      const rc = rowConfigs[i];
      if (rc.excludedValues && rc.excludedValues.length > 0) {
        const formatted = formatDimensionValue(record[rc.field], rc, fieldMap.get(rc.field));
        if (rc.excludedValues.includes(formatted)) return false;
      }
    }
    for (let i = 0; i < colConfigs.length; i++) {
      const cc = colConfigs[i];
      if (cc.excludedValues && cc.excludedValues.length > 0) {
        const formatted = formatDimensionValue(record[cc.field], cc, fieldMap.get(cc.field));
        if (cc.excludedValues.includes(formatted)) return false;
      }
    }
    return true;
  });

  // 2. Build hierarchical trees & cell bucket map
  const rowRoot = { key: '__ROOT__', label: 'ROOT', level: -1, childrenMap: new Map(), children: [] };
  const colRoot = { key: '__ROOT__', label: 'ROOT', level: -1, childrenMap: new Map(), children: [] };
  const cellRecordsMap = new Map();
  let groupNodes = 0;
  const guardGroupCount = () => {
    if (++groupNodes > 50000) throw new Error('分组数量超过 50,000，可能耗尽浏览器内存；请减少维度、使用日期/数字分组或先筛选数据');
  };

  const pushBucket = (rKey, cKey, rec) => {
    const k = `${rKey}@@${cKey}`;
    let arr = cellRecordsMap.get(k);
    if (!arr) {
      arr = [];
      if (cellRecordsMap.size >= 500000) throw new Error('分组交叉组合过多，可能内存不足；请减少行列维度或先筛选数据');
      cellRecordsMap.set(k, arr);
    }
    arr.push(rec);
  };

  for (let i = 0; i < filteredRows.length; i++) {
    if (i % 10000 === 0) onProgress?.(25 + Math.round(i / Math.max(1, filteredRows.length) * 40));
    const rec = filteredRows[i];

    const rowPrefixes = [];
    let curRowNode = rowRoot;
    for (let rIdx = 0; rIdx < rowConfigs.length; rIdx++) {
      const rc = rowConfigs[rIdx];
      const seg = formatDimensionValue(rec[rc.field], rc, fieldMap.get(rc.field));
      const keySegment = encodeGroupSegment(seg);
      const nextKey = rIdx === 0 ? keySegment : `${curRowNode.key}||${keySegment}`;
      let child = curRowNode.childrenMap.get(seg);
      if (!child) {
        guardGroupCount();
        child = {
          key: nextKey,
          label: seg,
          level: rIdx,
          pathLabels: rIdx === 0 ? [seg] : [...curRowNode.pathLabels, seg],
          childrenMap: new Map(),
          children: [],
        };
        curRowNode.childrenMap.set(seg, child);
        curRowNode.children.push(child);
      }
      curRowNode = child;
      rowPrefixes.push(nextKey);
    }

    const colPrefixes = [];
    let curColNode = colRoot;
    for (let cIdx = 0; cIdx < colConfigs.length; cIdx++) {
      const cc = colConfigs[cIdx];
      const seg = formatDimensionValue(rec[cc.field], cc, fieldMap.get(cc.field));
      const keySegment = encodeGroupSegment(seg);
      const nextKey = cIdx === 0 ? keySegment : `${curColNode.key}||${keySegment}`;
      let child = curColNode.childrenMap.get(seg);
      if (!child) {
        guardGroupCount();
        child = {
          key: nextKey,
          label: seg,
          level: cIdx,
          pathLabels: cIdx === 0 ? [seg] : [...curColNode.pathLabels, seg],
          childrenMap: new Map(),
          children: [],
        };
        curColNode.childrenMap.set(seg, child);
        curColNode.children.push(child);
      }
      curColNode = child;
      colPrefixes.push(nextKey);
    }

    pushBucket('__GRAND_TOTAL_ROW__', '__GRAND_TOTAL_COL__', rec);
    for (let r = 0; r < rowPrefixes.length; r++) {
      pushBucket(rowPrefixes[r], '__GRAND_TOTAL_COL__', rec);
      for (let c = 0; c < colPrefixes.length; c++) {
        pushBucket(rowPrefixes[r], colPrefixes[c], rec);
      }
    }
    for (let c = 0; c < colPrefixes.length; c++) {
      pushBucket('__GRAND_TOTAL_ROW__', colPrefixes[c], rec);
    }
  }

  const sortColTree = (node) => {
    if (!node.children || node.children.length === 0) return;
    const dimCfg = colConfigs[node.level + 1];
    if (dimCfg && dimCfg.sort && dimCfg.sort !== 'none') {
      const dir = dimCfg.sort === 'asc' ? 1 : -1;
      node.children.sort((a, b) => dir * a.label.localeCompare(b.label, 'zh-CN', { numeric: true }));
    }
    node.children.forEach(sortColTree);
  };
  sortColTree(colRoot);

  const leafColGroups = [];
  const countColLeaves = (node) => {
    const isCollapsed = Boolean(collapsedColKeys[node.key]);
    if (node.children.length === 0 || isCollapsed) {
      node.leafCount = 1;
      leafColGroups.push({
        key: node.key,
        label: node.label,
        pathLabels: node.pathLabels,
        isTotal: false,
      });
      return 1;
    }
    let sum = 0;
    for (let i = 0; i < node.children.length; i++) {
      sum += countColLeaves(node.children[i]);
    }
    node.leafCount = sum;
    return sum;
  };
  if (colConfigs.length > 0) {
    for (let i = 0; i < colRoot.children.length; i++) {
      countColLeaves(colRoot.children[i]);
    }
  }

  const colHeaderRows = [];
  if (colConfigs.length > 0 && colRoot.children.length > 0) {
    for (let lvl = 0; lvl < colConfigs.length; lvl++) {
      colHeaderRows.push([]);
    }
    const valSpan = Math.max(1, valConfigs.length);
    const traverseColHeader = (node) => {
      const isCollapsed = Boolean(collapsedColKeys[node.key]);
      const hasChildren = node.children.length > 0;
      const effectiveLeafMode = !hasChildren || isCollapsed;
      const rSpan = effectiveLeafMode ? (colConfigs.length - node.level) : 1;
      colHeaderRows[node.level].push({
        key: node.key,
        label: node.label,
        level: node.level,
        colSpan: node.leafCount * valSpan,
        rowSpan: rSpan,
        hasChildren,
        isCollapsed,
      });
      if (!effectiveLeafMode) {
        node.children.forEach(traverseColHeader);
      }
    };
    colRoot.children.forEach(traverseColHeader);
  }

  const allColGroups = [
    ...leafColGroups,
    { key: '__GRAND_TOTAL_COL__', label: '行总计', pathLabels: ['行总计'], isTotal: true },
  ];

  // 4. Sort row tree
  const valueSort = pivotConfig?.valueSort;
  const isValueSortValid =
    valueSort &&
    valueSort.direction &&
    valueSort.direction !== 'none' &&
    allColGroups.some((cg) => cg.key === valueSort.colKey) &&
    valConfigs.some((vc) => vc.id === valueSort.valueId);

  const sortRowTree = (node) => {
    if (!node.children || node.children.length === 0) return;
    const childLevel = node.level + 1;
    const dimCfg = rowConfigs[childLevel];

    if (isValueSortValid) {
      const dir = valueSort.direction === 'asc' ? 1 : -1;
      const targetValCfg = valConfigs.find((v) => v.id === valueSort.valueId) || valConfigs[0];
      let targetFormulaAST = null;
      if (targetValCfg?.isCalculated && targetValCfg?.formula) {
        try {
          targetFormulaAST = parseFormulaAST(targetValCfg.formula, dataset.fields);
        } catch {}
      }
      node.children.sort((a, b) => {
        const recsA = cellRecordsMap.get(`${a.key}@@${valueSort.colKey}`) || [];
        const recsB = cellRecordsMap.get(`${b.key}@@${valueSort.colKey}`) || [];
        const evalVal = (recs) => {
          if (targetValCfg.isCalculated) {
            if (targetFormulaAST) {
              return evaluateFormulaAST(targetFormulaAST, recs);
            }
            const valAConfig = valConfigs.find((v) => v.id === targetValCfg.operandA || v.field === targetValCfg.operandA);
            const valBConfig = valConfigs.find((v) => v.id === targetValCfg.operandB || v.field === targetValCfg.operandB);
            const fieldA = targetValCfg.operandAField || valAConfig?.field || (!targetValCfg.operandA?.startsWith('v_') ? targetValCfg.operandA : null);
            const aggA = targetValCfg.operandAAgg || valAConfig?.agg || 'sum';
            const fieldB = targetValCfg.operandBField || valBConfig?.field || (!targetValCfg.operandB?.startsWith('v_') ? targetValCfg.operandB : null);
            const aggB = targetValCfg.operandBAgg || valBConfig?.agg || 'sum';
            const valA = fieldA ? computeAggregation(recs, fieldA, aggA) : null;
            const valB = fieldB ? computeAggregation(recs, fieldB, aggB) : null;
            if (valA === null || valB === null) return null;
            if (targetValCfg.op === '+') return valA + valB;
            if (targetValCfg.op === '-') return valA - valB;
            if (targetValCfg.op === '*') return valA * valB;
            if (targetValCfg.op === '/') return valB !== 0 ? valA / valB : null;
            return null;
          }
          return computeAggregation(recs, targetValCfg.field, targetValCfg.agg);
        };
        const valA = evalVal(recsA);
        const valB = evalVal(recsB);
        const aValid = valA !== null && valA !== undefined && Number.isFinite(valA);
        const bValid = valB !== null && valB !== undefined && Number.isFinite(valB);
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        return dir * (valA - valB);
      });
    } else if (dimCfg && dimCfg.sort && dimCfg.sort !== 'none') {
      const dir = dimCfg.sort === 'asc' ? 1 : -1;
      node.children.sort((a, b) => dir * a.label.localeCompare(b.label, 'zh-CN', { numeric: true }));
    }
    node.children.forEach(sortRowTree);
  };
  sortRowTree(rowRoot);

  const totalRowLevels = Math.max(1, rowConfigs.length);
  const countVisibleRowLeaves = (node) => {
    const isCollapsed = Boolean(collapsedRowKeys[node.key]);
    if (node.children.length === 0 || isCollapsed) {
      node.visibleSpan = 1;
      return 1;
    }
    let sum = 0;
    for (let i = 0; i < node.children.length; i++) {
      sum += countVisibleRowLeaves(node.children[i]);
    }
    if (showSubtotals) sum += 1;
    node.visibleSpan = sum;
    return sum;
  };
  rowRoot.children.forEach(countVisibleRowLeaves);

  const tableRows = [];
  if (rowConfigs.length === 0) {
    tableRows.push({
      rowKey: '__GRAND_TOTAL_ROW__',
      label: '总计',
      isTotal: true,
      isSubtotal: false,
      headerCells: [{ key: 'grand_total_h', label: '总计', rowSpan: 1, colSpan: 1, level: 0, hasChildren: false }],
    });
  } else {
    const collectRows = (node, pendingCells) => {
      const isCollapsed = Boolean(collapsedRowKeys[node.key]);
      const hasChildren = node.children.length > 0;
      const isLeafRender = !hasChildren || isCollapsed;

      const cell = {
        key: node.key,
        label: node.label,
        level: node.level,
        rowSpan: node.visibleSpan,
        colSpan: isLeafRender ? (totalRowLevels - node.level) : 1,
        hasChildren,
        isCollapsed,
      };

      const nextPending = [...pendingCells, cell];
      if (isLeafRender) {
        tableRows.push({
          rowKey: node.key,
          label: node.pathLabels.join(' / '),
          isTotal: false,
          isSubtotal: false,
          headerCells: nextPending,
        });
      } else {
        for (let i = 0; i < node.children.length; i++) {
          collectRows(node.children[i], i === 0 ? nextPending : []);
        }
        if (showSubtotals) {
          tableRows.push({
            rowKey: `${node.key}__SUBTOTAL__`,
            label: `${node.label} 小计`,
            isTotal: false,
            isSubtotal: true,
            headerCells: [
              {
                key: `${node.key}__sub_h`,
                label: `${node.label} 小计`,
                level: node.level + 1,
                rowSpan: 1,
                colSpan: totalRowLevels - (node.level + 1),
                hasChildren: false,
                isCollapsed: false,
              },
            ],
          });
        }
      }
    };
    rowRoot.children.forEach((child) => collectRows(child, []));

    tableRows.push({
      rowKey: '__GRAND_TOTAL_ROW__',
      label: '总计',
      isTotal: true,
      isSubtotal: false,
      headerCells: [
        {
          key: '__GRAND_TOTAL_HEADER__',
          label: '总计',
          level: 0,
          rowSpan: 1,
          colSpan: totalRowLevels,
          hasChildren: false,
          isCollapsed: false,
        },
      ],
    });
  }

  onProgress?.(70);
  if (tableRows.length * allColGroups.length * Math.max(1,valConfigs.length) > 500000) {
    throw new Error('透视结果超过 500,000 个单元格，可能内存不足；请减少列维度、指标或筛选数据后重试');
  }
  const rawValueMatrix = {};
  const sampleStatsByValId = {};
  const displayMatrix = {};
  const statsByValId = {};

  valConfigs.forEach((vc) => {
    statsByValId[vc.id] = { min: Infinity, max: -Infinity };
  });

  for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
    if (rIdx % 1000 === 0) onProgress?.(70 + Math.round(rIdx / Math.max(1, tableRows.length) * 25));
    const r = tableRows[rIdx];
    const lookupRowKey = r.isSubtotal ? r.rowKey.replace('__SUBTOTAL__', '') : r.rowKey;
    for (let cIdx = 0; cIdx < allColGroups.length; cIdx++) {
      const cg = allColGroups[cIdx];
      const recs = cellRecordsMap.get(`${lookupRowKey}@@${cg.key}`) || [];
      for (let vIdx = 0; vIdx < valConfigs.length; vIdx++) {
        const vc = valConfigs[vIdx];
        if (!vc.isCalculated) {
          const summary = aggregateWithSamples(recs, vc.field, vc.agg);
          rawValueMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`] = summary.value;
          displayMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`] = {samples:summary,reason:summary.value !== null ? null : !summary.total ? 'no_records' : !summary.valid ? 'no_valid_numbers' : vc.agg === 'stddev' && summary.valid < 2 ? 'insufficient_samples' : 'numeric_overflow'};
          if (r.isTotal && cg.isTotal) sampleStatsByValId[vc.id] = summary;
        }
      }
    }
  }

  // 对计算字段 (Calculated Measures) 执行跨指标聚合运算
  valConfigs.filter((vc) => vc.isCalculated).forEach((vc) => {
    let formulaAST = null;
    if (vc.formula) {
      try {
        formulaAST = parseFormulaAST(vc.formula, dataset.fields);
      } catch {}
    }
    const targetFieldA = vc.operandAField || (!vc.operandA?.startsWith('v_') ? vc.operandA : null);
    const targetAggA = vc.operandAAgg || 'sum';
    const targetFieldB = vc.operandBField || (!vc.operandB?.startsWith('v_') ? vc.operandB : null);
    const targetAggB = vc.operandBAgg || 'sum';
    const valAConfig = valConfigs.find((v) => v.id === vc.operandA || (!v.isCalculated && v.field === targetFieldA && v.agg === targetAggA));
    const valBConfig = valConfigs.find((v) => v.id === vc.operandB || (!v.isCalculated && v.field === targetFieldB && v.agg === targetAggB));
    for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
      const r = tableRows[rIdx];
      const lookupRowKey = r.isSubtotal ? r.rowKey.replace('__SUBTOTAL__', '') : r.rowKey;
      for (let cIdx = 0; cIdx < allColGroups.length; cIdx++) {
        const cg = allColGroups[cIdx];
        const recs = cellRecordsMap.get(`${lookupRowKey}@@${cg.key}`) || [];
        let calcVal = null;
        if (formulaAST) {
          calcVal = evaluateFormulaAST(formulaAST, recs, (fName, fAgg) => {
            const matchCfg = valConfigs.find((v) => !v.isCalculated && v.field === fName && v.agg === fAgg);
            if (matchCfg) {
              const cached = rawValueMatrix[`${r.rowKey}@@${cg.key}@@${matchCfg.id}`];
              if (cached !== undefined) return cached;
            }
            return undefined;
          });
        } else {
          let valA = valAConfig ? rawValueMatrix[`${r.rowKey}@@${cg.key}@@${valAConfig.id}`] : null;
          let valB = valBConfig ? rawValueMatrix[`${r.rowKey}@@${cg.key}@@${valBConfig.id}`] : null;
          if (valA === null || valA === undefined) {
            if (targetFieldA) valA = computeAggregation(recs, targetFieldA, targetAggA);
          }
          if (valB === null || valB === undefined) {
            if (targetFieldB) valB = computeAggregation(recs, targetFieldB, targetAggB);
          }
          if (valA === null || valA === undefined || valB === null || valB === undefined) calcVal = null;
          else if (vc.op === '+') calcVal = valA + valB;
          else if (vc.op === '-') calcVal = valA - valB;
          else if (vc.op === '*') calcVal = valA * valB;
          else if (vc.op === '/') calcVal = valB !== 0 ? (valA / valB) : null;
        }
        rawValueMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`] = Number.isFinite(calcVal) ? calcVal : null;
        let reason = null;
        if (!Number.isFinite(calcVal)) {
          reason = !recs.length ? 'no_records' : vc.formula && !formulaAST ? 'invalid_formula' : 'formula_unavailable';
          if (formulaAST?.type === 'BinaryOp' && formulaAST.op === '/' && Number.isFinite(evaluateFormulaAST(formulaAST.left,recs)) && evaluateFormulaAST(formulaAST.right,recs) === 0) reason = 'zero_denominator';
          if (!formulaAST && vc.op === '/' && computeAggregation(recs,targetFieldB,targetAggB) === 0) reason = 'zero_denominator';
        }
        displayMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`] = {reason};
      }
    }
  });

  const nonTotalRows = tableRows.filter((r) => !r.isTotal && !r.isSubtotal);
  const rowPositions = new Map(nonTotalRows.map((row,index) => [row.rowKey,index]));
  const runningTotals = new Map();
  for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
    const r = tableRows[rIdx];
    for (let cIdx = 0; cIdx < allColGroups.length; cIdx++) {
      const cg = allColGroups[cIdx];
      for (let vIdx = 0; vIdx < valConfigs.length; vIdx++) {
        const vc = valConfigs[vIdx];
        const mKey = `${r.rowKey}@@${cg.key}@@${vc.id}`;
        const rawVal = rawValueMatrix[mKey] ?? null;
        const grandVal = rawValueMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`] || 0;
        const rowTotVal = rawValueMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`] || 0;
        const colTotVal = rawValueMatrix[`__GRAND_TOTAL_ROW__@@${cg.key}@@${vc.id}`] || 0;

        let displayVal = rawVal;
        let reason = displayMatrix[mKey]?.reason || null;
        let isBaseline = false;

        if (vc.showAs === 'pct_grand') {
          displayVal = grandVal !== 0 ? (rawVal / grandVal) * 100 : null;
        } else if (vc.showAs === 'pct_row') {
          displayVal = rowTotVal !== 0 ? (rawVal / rowTotVal) * 100 : null;
        } else if (vc.showAs === 'pct_col') {
          displayVal = colTotVal !== 0 ? (rawVal / colTotVal) * 100 : null;
        } else if (vc.showAs === 'prev_diff') {
          if (r.isTotal || r.isSubtotal) {
            isBaseline = true;
            displayVal = 0;
          } else {
            const idxInNonTotal = rowPositions.get(r.rowKey) ?? -1;
            if (idxInNonTotal <= 0) {
              isBaseline = true;
              displayVal = 0;
            } else {
              const prevRow = nonTotalRows[idxInNonTotal - 1];
              const prevVal = rawValueMatrix[`${prevRow.rowKey}@@${cg.key}@@${vc.id}`];
              displayVal = prevVal === null || prevVal === undefined ? null : rawVal - prevVal;
            }
          }
        } else if (vc.showAs === 'pct_prev_diff') {
          if (r.isTotal || r.isSubtotal) {
            isBaseline = true;
            displayVal = 0;
          } else {
            const idxInNonTotal = rowPositions.get(r.rowKey) ?? -1;
            if (idxInNonTotal <= 0) {
              isBaseline = true;
              displayVal = 0;
            } else {
              const prevRow = nonTotalRows[idxInNonTotal - 1];
              const prevVal = rawValueMatrix[`${prevRow.rowKey}@@${cg.key}@@${vc.id}`];
              displayVal = prevVal !== null && prevVal !== undefined && prevVal !== 0 ? ((rawVal - prevVal) / Math.abs(prevVal)) * 100 : null;
            }
          }
        } else if (vc.showAs === 'running_total') {
          if (r.isTotal || r.isSubtotal) {
            displayVal = rawVal;
          } else {
            const idxInNonTotal = rowPositions.get(r.rowKey) ?? -1;
            const runningKey = `${cg.key}@@${vc.id}`;
            const runSum = (runningTotals.get(runningKey) || 0) + rawVal;
            runningTotals.set(runningKey,runSum);
            displayVal = runSum;
          }
        }

        if (rawVal === null) displayVal = null;
        if (isBaseline) reason = 'baseline';
        else if (rawVal !== null && displayVal === null) {
          const previous = nonTotalRows[(rowPositions.get(r.rowKey) ?? 0)-1];
          const previousValue = previous ? rawValueMatrix[`${previous.rowKey}@@${cg.key}@@${vc.id}`] : null;
          reason = ['prev_diff','pct_prev_diff'].includes(vc.showAs) && (previousValue === null || previousValue === undefined) ? 'previous_unavailable' : 'zero_denominator';
        }
        displayMatrix[mKey] = {
          ...displayMatrix[mKey],
          reason,
          raw: rawVal,
          display: displayVal,
          isBaseline,
          pctGrand: rawVal !== null && grandVal !== 0 ? ((rawVal / grandVal) * 100).toFixed(1) : null,
          pctRow: rowTotVal !== 0 ? ((rawVal / rowTotVal) * 100).toFixed(1) : '0.0',
          pctCol: colTotVal !== 0 ? ((rawVal / colTotVal) * 100).toFixed(1) : '0.0',
        };

        if (displayVal !== null && !r.isTotal && !r.isSubtotal && !cg.isTotal && !isBaseline) {
          const st = statsByValId[vc.id];
          if (displayVal < st.min) st.min = displayVal;
          if (displayVal > st.max) st.max = displayVal;
        }
      }
    }
  }

  valConfigs.forEach((vc) => {
    if (statsByValId[vc.id].min === Infinity) {
      statsByValId[vc.id] = { min: 0, max: 100 };
    }
  });

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    analysisConfig: pivotConfig,
    rowConfigs,
    colConfigs,
    valConfigs,
    leafColGroups,
    allColGroups,
    colHeaderRows: colHeaderRows.filter((row) => row.length > 0),
    tableRows,
    rawValueMatrix,
    sampleStatsByValId,
    displayMatrix,
    cellRecordsMap,
    statsByValId,
    filteredCount: filteredRows.length,
    totalCount: allRows.length,
    elapsedMs: Math.max(1, Math.round(t1 - t0)),
    sanitizedInfo: {
      ignoredFilters,
      ignoredRows,
      ignoredCols,
      ignoredVals,
      hasInvalidFields: ignoredFilters.length > 0 || ignoredRows.length > 0 || ignoredCols.length > 0 || ignoredVals.length > 0,
    },
  };
}
