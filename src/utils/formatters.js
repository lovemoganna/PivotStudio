export const UnifiedFormatter = {
  inferUnit(valCfg) {
    if (!valCfg) return '';
    if (valCfg.showAs && valCfg.showAs.startsWith('pct_')) return '%';
    if (valCfg.format?.isPercent) return '%';
    if (valCfg.format?.currency) return valCfg.format.currency;
    if (valCfg.agg === 'count' || valCfg.agg === 'count_distinct') return '笔';
    if (/销售额|金额|成本|利润|单价/.test(valCfg.field || '')) return '¥';
    if (/数量|件数|销量/.test(valCfg.field || '')) return '件';
    return '';
  },
  formatValue(val, valCfg, options = {}) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
    const num = Number(val);
    const isPctShowAs = valCfg?.showAs && valCfg.showAs.startsWith('pct_');
    const isPercent = isPctShowAs || valCfg?.format?.isPercent;
    const decimals = isPctShowAs ? 1 : (valCfg?.format?.decimals ?? 0);
    const useThousands = valCfg?.format?.thousands !== false;
    const isCountAgg = valCfg?.agg === 'count' || valCfg?.agg === 'count_distinct';
    let currency = '';
    if (!isPercent && !isCountAgg) {
      if (valCfg?.format?.currency !== undefined && valCfg?.format?.currency !== null && valCfg?.format?.currency !== '') {
        currency = valCfg.format.currency;
      } else if (/销售额|金额|成本|利润|毛利润|单价|营收|收入|price|amount|revenue|cost|profit/i.test(valCfg?.field || '')) {
        currency = '¥';
      }
    }
    const plusSign = options.showPlusSign && num > 0 ? '+' : '';

    if (isPercent) {
      return `${plusSign}${num.toFixed(decimals)}%`;
    }

    if (options.compact) {
      const abs = Math.abs(num);
      const sign = num < 0 ? '-' : plusSign;
      if (abs >= 1000000) {
        return `${sign}${currency}${(abs / 1000000).toFixed(2)}M`;
      }
      if (abs >= 1000) {
        return `${sign}${currency}${(abs / 1000).toFixed(1)}K`;
      }
      return `${sign}${currency}${abs.toFixed(decimals)}`;
    }

    const absNum = Math.abs(num);
    const fixedStr = absNum.toFixed(decimals);
    const parts = fixedStr.split('.');
    if (useThousands) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    const signStr = num < 0 ? '-' : plusSign;
    return `${signStr}${currency}${parts.join('.')}`;
  },
};

export function formatCellNumber(cellObj, valCfg) {
  if (!cellObj || cellObj.isBaseline) return '-';
  return UnifiedFormatter.formatValue(cellObj.display, valCfg, { compact: false });
}

export function formatDimensionValue(rawVal, dimCfg, fieldMeta) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '(空)';
  const fType = fieldMeta?.type || 'text';

  if (fType === 'date' && dimCfg?.dateGranularity && dimCfg.dateGranularity !== 'raw') {
    const str = String(rawVal).trim();
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const day = d.getDate();
      if (dimCfg.dateGranularity === 'year') return `${yr}年`;
      if (dimCfg.dateGranularity === 'quarter') return `${yr}-Q${Math.floor((mo - 1) / 3) + 1}`;
      if (dimCfg.dateGranularity === 'month') return `${yr}-${String(mo).padStart(2, '0')}`;
      if (dimCfg.dateGranularity === 'week') {
        const startOfYear = new Date(yr, 0, 1);
        const weekNo = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
        return `${yr}-W${String(weekNo).padStart(2, '0')}`;
      }
      if (dimCfg.dateGranularity === 'day') return `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  if (fType === 'number' && dimCfg?.numberBin && dimCfg.numberBin.step > 0) {
    const num = Number(rawVal);
    if (!Number.isNaN(num)) {
      const start = Number(dimCfg.numberBin.start || 0);
      const step = Number(dimCfg.numberBin.step);
      const idx = Math.floor((num - start) / step);
      const low = start + idx * step;
      const high = low + step;
      return `[${low}, ${high})`;
    }
  }

  if (fType === 'boolean') {
    return rawVal === true || String(rawVal).toLowerCase() === 'true' ? '是 (True)' : '否 (False)';
  }

  return String(rawVal);
}

export function getDimDisplayLabel(dimCfg) {
  if (!dimCfg) return '';
  if (dimCfg.dateGranularity && dimCfg.dateGranularity !== 'raw') {
    const gMap = { year: '年', quarter: '季', month: '月', week: '周', day: '日' };
    return `${dimCfg.field} (${gMap[dimCfg.dateGranularity] || dimCfg.dateGranularity})`;
  }
  if (dimCfg.numberBin && dimCfg.numberBin.step > 0) {
    return `${dimCfg.field} (分箱:${dimCfg.numberBin.step})`;
  }
  return dimCfg.field;
}

export function getColorScaleStyle(val, min, max, scheme, isDark = true) {
  if (scheme === 'none' || max <= min || Number.isNaN(val)) return {};
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
  if (scheme === 'green_yellow_red') {
    const hue = Math.round((1 - ratio) * 95 + (ratio > 0.5 ? 245 : 0)) % 360;
    return { backgroundColor: isDark ? `hsla(${hue}, 82%, 34%, 0.45)` : `hsla(${hue}, 80%, 82%, 0.65)` };
  }
  if (scheme === 'blue_scale') {
    const alpha = (isDark ? 0.12 + ratio * 0.42 : 0.1 + ratio * 0.38).toFixed(2);
    return { backgroundColor: `rgba(102, 217, 239, ${alpha})` };
  }
  if (scheme === 'emerald_scale') {
    const alpha = (isDark ? 0.12 + ratio * 0.42 : 0.1 + ratio * 0.38).toFixed(2);
    return { backgroundColor: `rgba(166, 226, 46, ${alpha})` };
  }
  return {};
}

export function formatAxisTickLabel(val, maxLen = 12) {
  const s = String(val ?? '');
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}
