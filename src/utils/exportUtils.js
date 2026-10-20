import { formatCellNumber } from './formatters';
import { buildPivotExportRows, encodeCsvCell } from './exportMatrix.js';
import * as XLSX from 'xlsx';

export function exportToCSV(dataset, pivotResult, showToast) {
  const rows = buildPivotExportRows(pivotResult);
  const csv = '\uFEFF' + rows.map((row) => row.map(encodeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (dataset?.name || '数据') + '_透视表.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast?.('已导出完整 CSV 透视结果');
  } catch {
    showToast?.('CSV 导出失败', 'error');
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function exportToExcelMerged(dataset, pivotResult, showToast) {
  try {
    const rows = buildPivotExportRows(pivotResult);
    if (rows.length < 2) {
      showToast?.('透视结果为空，无法导出 Excel', 'error');
      return;
    }
    const table = document.getElementById('pivot-main-html-table');
    // Preserve visual merged headers when every row is actually rendered.
    const fullTableRendered = Boolean(table) && pivotResult.tableRows.length <= 80;
    const workbook = fullTableRendered
      ? XLSX.utils.table_to_book(table, { sheet: '透视表' })
      : XLSX.utils.book_new();
    if (!fullTableRendered) {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, '透视表');
    }
    XLSX.writeFile(workbook, (dataset?.name || '数据') + '_透视表.xlsx', { compression: true });
    showToast?.(fullTableRendered ? '已导出 Excel 工作簿（保留表头合并）' : '已导出完整 Excel 工作簿（扁平表头）');
  } catch {
    showToast?.('XLSX 导出失败，请检查透视表内容', 'error');
  }
}

export function exportChartAsPNG(dataset, unifiedChartSpec, chartType, darkMode, viewMode, showToast) {
  if (viewMode === 'table') {
    showToast?.('请先切换到「表图上下」或「仅图表」视图再导出图表', 'error');
    return;
  }
  if (!unifiedChartSpec || unifiedChartSpec.items.length === 0) {
    showToast?.('当前筛选条件下无图表数据可导出', 'error');
    return;
  }
  if (chartType === 'funnel') {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = Math.max(420, unifiedChartSpec.funnelItems.length * 58 + 110);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = darkMode ? '#272822' : '#F7F6F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = darkMode ? '#F8F8F2' : '#272822';
    ctx.font = 'bold 16px "JetBrains Mono", "Noto Sans SC", monospace, sans-serif';
    ctx.fillText(`${dataset?.name || '数据'} — 锥形转化漏斗图 (${unifiedChartSpec.primarySeriesKey})`, 32, 42);
    unifiedChartSpec.funnelItems.forEach((fItem, idx) => {
      const y = 76 + idx * 54;
      ctx.fillStyle = darkMode ? '#F8F8F2' : '#272822';
      ctx.font = '13px "JetBrains Mono", "Noto Sans SC", monospace, sans-serif';
      ctx.fillText(fItem.name, 32, y + 23);
      const maxBarW = 680;
      const barW = Math.max(160, (fItem.widthPct / 100) * maxBarW);
      const barX = 200 + (maxBarW - barW) / 2;
      ctx.fillStyle = fItem.fill;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, y, barW, 36, 8);
      } else {
        ctx.rect(barX, y, barW, 36);
      }
      ctx.fill();
      ctx.fillStyle = '#1E1F1C';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${fItem.formattedValue} · ${fItem.conversionFormatted}`, barX + 16, y + 22);
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset?.name || '数据'}_漏斗图.png`;
    a.click();
    showToast?.('已导出高清 PNG 漏斗图文件');
    return;
  }
  const svgEl = document.querySelector('#pivot-chart-container .recharts-wrapper svg');
  if (!svgEl) {
    showToast?.('未检测到图表画布，请重试', 'error');
    return;
  }
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataset?.name || '数据'}_透视图表.svg`;
  a.click();
  URL.revokeObjectURL(url);
  showToast?.('已导出高清矢量图表文件');
}

export function exportPDFReport(setIsPrintingReport) {
  setIsPrintingReport(true);
  setTimeout(() => {
    window.print();
    setIsPrintingReport(false);
  }, 250);
}
