import { formatDimensionValue } from '../../../utils/formatters.js';

export function computeAggregation(records, fieldName, aggMethod) {
  if (!records?.length) return 0;
  const meaningful = (v) => v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '');
  if (aggMethod === 'count') return records.filter((r) => meaningful(r[fieldName])).length;
  if (aggMethod === 'count_distinct') return new Set(records.map((r) => r[fieldName]).filter(meaningful).map(String)).size;
  let sum=0,count=0,min=Infinity,max=-Infinity;
  for (const row of records) {
    const raw = row[fieldName];
    if (!meaningful(raw)) continue;
    const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g,''));
    if (!Number.isFinite(value)) continue;
    sum += value; count++;
    min=Math.min(min,value); max=Math.max(max,value);
  }
  if (!count) return 0;
  if (aggMethod === 'avg') return sum/count;
  if (aggMethod === 'min') return min;
  if (aggMethod === 'max') return max;
  return sum;
}

export function calculatePivot(dataset, pivotConfig) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const allRows = dataset?.rows || [];
  const fieldMap = new Map((dataset?.fields || []).map((f) => [f.name, f]));

  const rowConfigs = (pivotConfig?.rows || []).map((r, i) => ({
    id: r.id || `r_${i}`,
    field: r.field,
    sort: r.sort || 'none',
    dateGranularity: r.dateGranularity || 'raw',
    numberBin: r.numberBin || null,
    excludedValues: r.excludedValues || [],
  }));

  const colConfigs = (pivotConfig?.columns || []).map((c, i) => ({
    id: c.id || `c_${i}`,
    field: c.field,
    sort: c.sort || 'none',
    dateGranularity: c.dateGranularity || 'raw',
    numberBin: c.numberBin || null,
    excludedValues: c.excludedValues || [],
  }));

  const valConfigs = (pivotConfig?.values || []).map((v, i) => ({
    id: v.id || `v_${i}`,
    field: v.field,
    agg: v.agg || 'sum',
    showAs: v.showAs || 'normal',
    format: v.format || { thousands: true, decimals: 0, currency: /销售额|金额/.test(v.field || '') ? '¥' : '', isPercent: false },
  }));

  const filters = pivotConfig?.filters || [];
  const collapsedRowKeys = pivotConfig?.collapsedRowKeys || {};
  const collapsedColKeys = pivotConfig?.collapsedColKeys || {};
  const showSubtotals = Boolean(pivotConfig?.showSubtotals);

  // 1. Filter records
  const filteredRows = allRows.filter((record) => {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
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

  const pushBucket = (rKey, cKey, rec) => {
    const k = `${rKey}@@${cKey}`;
    let arr = cellRecordsMap.get(k);
    if (!arr) {
      arr = [];
      cellRecordsMap.set(k, arr);
    }
    arr.push(rec);
  };

  for (let i = 0; i < filteredRows.length; i++) {
    const rec = filteredRows[i];

    const rowPrefixes = [];
    let curRowNode = rowRoot;
    for (let rIdx = 0; rIdx < rowConfigs.length; rIdx++) {
      const rc = rowConfigs[rIdx];
      const seg = formatDimensionValue(rec[rc.field], rc, fieldMap.get(rc.field));
      const nextKey = rIdx === 0 ? seg : `${curRowNode.key}||${seg}`;
      let child = curRowNode.childrenMap.get(seg);
      if (!child) {
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
      const nextKey = cIdx === 0 ? seg : `${curColNode.key}||${seg}`;
      let child = curColNode.childrenMap.get(seg);
      if (!child) {
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
      node.children.sort((a, b) => {
        const recsA = cellRecordsMap.get(`${a.key}@@${valueSort.colKey}`) || [];
        const recsB = cellRecordsMap.get(`${b.key}@@${valueSort.colKey}`) || [];
        const valA = computeAggregation(recsA, targetValCfg.field, targetValCfg.agg);
        const valB = computeAggregation(recsB, targetValCfg.field, targetValCfg.agg);
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

  const rawValueMatrix = {};
  const displayMatrix = {};
  const statsByValId = {};

  valConfigs.forEach((vc) => {
    statsByValId[vc.id] = { min: Infinity, max: -Infinity };
  });

  for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
    const r = tableRows[rIdx];
    const lookupRowKey = r.isSubtotal ? r.rowKey.replace('__SUBTOTAL__', '') : r.rowKey;
    for (let cIdx = 0; cIdx < allColGroups.length; cIdx++) {
      const cg = allColGroups[cIdx];
      const recs = cellRecordsMap.get(`${lookupRowKey}@@${cg.key}`) || [];
      for (let vIdx = 0; vIdx < valConfigs.length; vIdx++) {
        const vc = valConfigs[vIdx];
        const rawVal = computeAggregation(recs, vc.field, vc.agg);
        rawValueMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`] = rawVal;
      }
    }
  }

  const nonTotalRows = tableRows.filter((r) => !r.isTotal && !r.isSubtotal);
  for (let rIdx = 0; rIdx < tableRows.length; rIdx++) {
    const r = tableRows[rIdx];
    for (let cIdx = 0; cIdx < allColGroups.length; cIdx++) {
      const cg = allColGroups[cIdx];
      for (let vIdx = 0; vIdx < valConfigs.length; vIdx++) {
        const vc = valConfigs[vIdx];
        const mKey = `${r.rowKey}@@${cg.key}@@${vc.id}`;
        const rawVal = rawValueMatrix[mKey] ?? 0;
        const grandVal = rawValueMatrix[`__GRAND_TOTAL_ROW__@@__GRAND_TOTAL_COL__@@${vc.id}`] || 0;
        const rowTotVal = rawValueMatrix[`${r.rowKey}@@__GRAND_TOTAL_COL__@@${vc.id}`] || 0;
        const colTotVal = rawValueMatrix[`__GRAND_TOTAL_ROW__@@${cg.key}@@${vc.id}`] || 0;

        let displayVal = rawVal;
        let isBaseline = false;

        if (vc.showAs === 'pct_grand') {
          displayVal = grandVal !== 0 ? (rawVal / grandVal) * 100 : 0;
        } else if (vc.showAs === 'pct_row') {
          displayVal = rowTotVal !== 0 ? (rawVal / rowTotVal) * 100 : 0;
        } else if (vc.showAs === 'pct_col') {
          displayVal = colTotVal !== 0 ? (rawVal / colTotVal) * 100 : 0;
        } else if (vc.showAs === 'prev_diff') {
          if (r.isTotal || r.isSubtotal) {
            isBaseline = true;
            displayVal = 0;
          } else {
            const idxInNonTotal = nonTotalRows.findIndex((nr) => nr.rowKey === r.rowKey);
            if (idxInNonTotal <= 0) {
              isBaseline = true;
              displayVal = 0;
            } else {
              const prevRow = nonTotalRows[idxInNonTotal - 1];
              const prevVal = rawValueMatrix[`${prevRow.rowKey}@@${cg.key}@@${vc.id}`] ?? 0;
              displayVal = rawVal - prevVal;
            }
          }
        }

        displayMatrix[mKey] = {
          raw: rawVal,
          display: displayVal,
          isBaseline,
          pctGrand: grandVal !== 0 ? ((rawVal / grandVal) * 100).toFixed(1) : '0.0',
          pctRow: rowTotVal !== 0 ? ((rawVal / rowTotVal) * 100).toFixed(1) : '0.0',
          pctCol: colTotVal !== 0 ? ((rawVal / colTotVal) * 100).toFixed(1) : '0.0',
        };

        if (!r.isTotal && !r.isSubtotal && !cg.isTotal && !isBaseline) {
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
    rowConfigs,
    colConfigs,
    valConfigs,
    leafColGroups,
    allColGroups,
    colHeaderRows: colHeaderRows.filter((row) => row.length > 0),
    tableRows,
    rawValueMatrix,
    displayMatrix,
    cellRecordsMap,
    statsByValId,
    filteredCount: filteredRows.length,
    totalCount: allRows.length,
    elapsedMs: Math.max(1, Math.round(t1 - t0)),
  };
}
