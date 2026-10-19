import { getDimDisplayLabel, formatCellNumber } from './formatters';
import * as XLSX from 'xlsx';

export function exportToCSV(dataset, pivotResult, showToast) {
  const headers = [
    ...pivotResult.rowConfigs.map((r) => getDimDisplayLabel(r)),
    ...pivotResult.allColGroups.flatMap((cg) =>
      pivotResult.valConfigs.map((vc) => `${cg.pathLabels.join('/')}_${vc.field}(${vc.agg})`)
    ),
  ];
  const lines = [headers.join(',')];
  pivotResult.tableRows.forEach((r) => {
    const rowLabels = r.isTotal
      ? ['总计', ...new Array(Math.max(0, pivotResult.rowConfigs.length - 1)).fill('')]
      : r.rowKey.replace('__SUBTOTAL__', '').split('||');
    while (rowLabels.length < Math.max(1, pivotResult.rowConfigs.length)) rowLabels.push('');
    const vals = pivotResult.allColGroups.flatMap((cg) =>
      pivotResult.valConfigs.map((vc) => {
        const cellObj = pivotResult.displayMatrix[`${r.rowKey}@@${cg.key}@@${vc.id}`];
        return `"${String(formatCellNumber(cellObj, vc)).replace(/"/g, '""')}"`;
      })
    );
    lines.push([...rowLabels.map((l) => `"${String(l).replace(/"/g, '""')}"`), ...vals].join(','));
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataset.name}_透视表.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast?.('已导出 CSV 文件');
}

export function exportToExcelMerged(dataset, pivotResult, showToast) {
  const table = document.getElementById('pivot-main-html-table');
  if (!table) { showToast?.('当前没有可导出的透视表', 'error'); return; }
  try {
    const book = XLSX.utils.table_to_book(table, { sheet: '透视表' });
    XLSX.writeFile(book, `${dataset.name}_透视表.xlsx`, { compression: true });
    showToast?.('已导出 XLSX 工作簿');
  } catch {
    showToast?.('XLSX 导出失败，请检查当前透视表', 'error');
  }
}

export function exportChartAsPNG(dataset, unifiedChartSpec, chartType, darkMode, viewMode, showToast) {
  if (viewMode === 'table') {
    showToast?.('请先切换到「表图并列」或「仅图表」视图再导出图表', 'error');
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
    ctx.font = 'bold 16px "JetBrains Mono", monospace, sans-serif';
    ctx.fillText(`${dataset.name} — 锥形转化漏斗图 (${unifiedChartSpec.primarySeriesKey})`, 32, 42);
    unifiedChartSpec.funnelItems.forEach((fItem, idx) => {
      const y = 76 + idx * 54;
      ctx.fillStyle = darkMode ? '#F8F8F2' : '#272822';
      ctx.font = '13px "JetBrains Mono", monospace, sans-serif';
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
    a.download = `${dataset.name}_漏斗图.png`;
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
  a.download = `${dataset.name}_透视图表.svg`;
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
