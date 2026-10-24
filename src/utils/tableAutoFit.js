import { getDimDisplayLabel, formatCellNumber } from './formatters.js';
import { AGG_METHODS } from '../constants/pivotConstants.js';
import { decodeGroupPath } from './groupKeys.js';

/**
 * Calculates string visual length estimating CJK characters at ~13px and ASCII at ~7.5px.
 */
export function estimateVisualTextWidth(text) {
  if (!text) return 0;
  const str = String(text);
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // CJK characters, fullwidth symbols
    if (code > 255) {
      w += 13.5;
    } else {
      w += 7.5;
    }
  }
  return w;
}

/**
 * Calculates optimal auto-fit column widths for all row dimensions and value columns.
 * @param {Object} pivotResult 
 * @param {Object} existingWidths 
 * @returns {Object} map of colKey -> width in px
 */
export function calculateAutoFitColumnWidths(pivotResult, existingWidths = {}) {
  const result = { ...existingWidths };
  if (!pivotResult) return result;

  const rowConfigs = pivotResult.rowConfigs || [];
  const tableRows = pivotResult.tableRows || [];
  const colGroups = pivotResult.allColGroups || [];
  const valConfigs = pivotResult.valConfigs || [];
  const displayMatrix = pivotResult.displayMatrix || {};

  // 1. Calculate auto-fit widths for row dimension columns
  if (rowConfigs.length > 0) {
    rowConfigs.forEach((rDim, rIdx) => {
      const colKey = `row_${rDim.id}`;
      const headerLabel = getDimDisplayLabel(rDim);
      let maxTextW = estimateVisualTextWidth(headerLabel) + 40; // sort icon & padding

      // Sample first 150 rows
      const sampleLimit = Math.min(tableRows.length, 150);
      for (let i = 0; i < sampleLimit; i++) {
        const row = tableRows[i];
        let valStr = '';
        if (row.isTotal) {
          valStr = '总计';
        } else {
          const segs = decodeGroupPath(row.rowKey || '');
          valStr = segs[rIdx] || '';
        }
        // Account for tree indent/collapse button on hierarchical rows
        const cellTextW = estimateVisualTextWidth(valStr) + 36;
        if (cellTextW > maxTextW) {
          maxTextW = cellTextW;
        }
      }

      // Clamp between 96px and 340px
      result[colKey] = Math.max(96, Math.min(340, Math.ceil(maxTextW)));
    });
  } else {
    result['row_summary'] = 130;
  }

  // 2. Calculate auto-fit widths for value columns
  for (const cGroup of colGroups) {
    for (const vCfg of valConfigs) {
      const colKey = `${cGroup.key}_${vCfg.id}`;
      const aggShort = AGG_METHODS.find((m) => m.value === vCfg.agg)?.short || vCfg.agg;
      const headerLabel = `${vCfg.field} (${aggShort})`;
      let maxTextW = estimateVisualTextWidth(headerLabel) + 32;

      // Sample first 150 rows
      const sampleLimit = Math.min(tableRows.length, 150);
      for (let i = 0; i < sampleLimit; i++) {
        const row = tableRows[i];
        const cellKey = `${row.rowKey}@@${cGroup.key}@@${vCfg.id}`;
        const cellObj = displayMatrix[cellKey];
        const formatted = formatCellNumber(cellObj, vCfg);
        const cellTextW = estimateVisualTextWidth(formatted) + 30;
        if (cellTextW > maxTextW) {
          maxTextW = cellTextW;
        }
      }

      // Clamp between 88px and 280px
      result[colKey] = Math.max(88, Math.min(280, Math.ceil(maxTextW)));
    }
  }

  return result;
}

/**
 * Calculates auto-fit width for a single column.
 */
export function calculateSingleColumnAutoFit(colKey, pivotResult) {
  if (!pivotResult || !colKey) return 120;
  const allWidths = calculateAutoFitColumnWidths(pivotResult);
  return allWidths[colKey] || 120;
}
