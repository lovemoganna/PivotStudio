import { buildPivotExportRows, encodeCsvCell, excelNumberFormat } from './exportMatrix.js';
import * as XLSX from 'xlsx';

export function exportToCSV(dataset, pivotResult, showToast) {
  const rows = buildPivotExportRows(pivotResult, { formatted: true });
  const dimensionCount = Math.max(1,pivotResult.rowConfigs?.length || 0);
  const csv = '\uFEFF' + rows.map((row,r) => row.map((value,c) => encodeCsvCell(value,r>0 && c>=dimensionCount)).join(',')).join('\r\n');
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
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const dimensionCount = Math.max(1,pivotResult.rowConfigs?.length || 0);
    const metrics = pivotResult.valConfigs || [];
    for (let r=1; r<rows.length; r++) for (let c=dimensionCount; c<rows[r].length; c++) {
      const cell = sheet[XLSX.utils.encode_cell({r,c})];
      if (cell?.t === 'n') cell.z = excelNumberFormat(metrics[(c-dimensionCount)%metrics.length]);
    }
    XLSX.utils.book_append_sheet(workbook,sheet,'透视表');
    XLSX.writeFile(workbook, (dataset?.name || '数据') + '_透视表.xlsx', { compression: true });
    showToast?.('已导出完整 Excel 工作簿（保留数值格式）');
  } catch {
    showToast?.('XLSX 导出失败，请检查透视表内容', 'error');
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

export async function exportChartImage(dataset, chartSpec, chartType, darkMode, viewMode, showToast, format = 'png') {
  try {
    if (viewMode === 'table') throw new Error('请先切换到表图上下或仅图表视图');
    const container = document.getElementById('pivot-chart-container');
    if (chartSpec?.renderLimit) throw new Error('图表分组过多，请先筛选、减少维度或设置 TopN 后再导出');
    const source = container?.querySelector('svg[data-chart-svg], .recharts-wrapper > svg');
    if (!source || !chartSpec?.items?.length) throw new Error('当前图表为空，请调整筛选或配置指标后重试');
    const box = source.getBoundingClientRect();
    const width = Math.max(1,Math.ceil(box.width)), height = Math.max(1,Math.ceil(box.height));
    const clone = source.cloneNode(true);
    // Inline computed styles so downloaded SVG does not depend on the workbench CSS.
    const originals = [source,...source.querySelectorAll('*')], copies = [clone,...clone.querySelectorAll('*')];
    originals.forEach((node,index) => {
      const styles = getComputedStyle(node);
      for (const key of ['fill','stroke','stroke-width','fill-opacity','opacity','font-size','font-family','font-weight','text-anchor']) {
        let value = styles.getPropertyValue(key);
        value = value.replace(/url\(["']?[^)]*#([^)'" ]+)["']?\)/g,'url(#$1)');
        copies[index].style.setProperty(key,value);
      }
    });
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    const legend = [...container.querySelectorAll('.recharts-legend-item')].map(node => {
      const icon = node.querySelector('.recharts-legend-icon') || node;
      const styles = getComputedStyle(icon);
      const fill = styles.fill === 'none' ? styles.stroke : styles.fill;
      const gradientId = fill.match(/url\(["']?[^)]*#([^)'" ]+)["']?\)/)?.[1];
      const stop = gradientId && source.querySelector(`[id="${CSS.escape(gradientId)}"] stop`);
      return {text:node.querySelector('.recharts-legend-item-text')?.textContent || '',color:stop ? getComputedStyle(stop).stopColor : fill};
    });
    // Export the same visible page, with an explicit range and a compact SVG legend.
    // HTML Recharts legends are outside its SVG and otherwise lose their swatches.
    const measure = document.createElement('canvas').getContext('2d');
    const font = '12px Arial, sans-serif';
    if (measure) measure.font = font;
    const textWidth = text => measure?.measureText(text).width || text.length * 8;
    const wrap = (text, availableWidth = width-24) => {
      const lines=[];let line='';
      for (const char of text) { if (line && textWidth(line+char)>availableWidth) {lines.push(line);line='';} line+=char; }
      if(line)lines.push(line);return lines;
    };
    const header = wrap(`${dataset?.name || '数据'} · ${chartSpec.primaryMeasureLabel || chartSpec.primarySeriesKey}`);
    const notes = [container.querySelector('[data-chart-page-summary]')?.getAttribute('data-chart-page-summary'),container.querySelector('[data-chart-page-note]')?.textContent,chartSpec.scope && `Top ${chartSpec.scope.shown} / ${chartSpec.scope.total}; full table & KPIs`].filter(Boolean).flatMap(text=>wrap(text));
    let legendX=12,legendY=0;
    const legendItems=legend.flatMap(item=>{
      const lines=wrap(item.text,width-54), result=[];
      for(const [index,text] of lines.entries()){
        const itemWidth=Math.min(width-24,textWidth(text)+30);
        if(legendX>12 && legendX+itemWidth>width-12){legendX=12;legendY+=20;}
        result.push({...item,text,x:legendX,y:legendY,swatch:index===0});legendX+=itemWidth;
      }return result;
    });
    const headerHeight=header.length*18+12;
    const legendHeight=legendItems.length ? legendY+24 : 0;
    const totalHeight = headerHeight+height+legendHeight+notes.length*18+12;
    svg.setAttribute('xmlns',ns); svg.setAttribute('width',width); svg.setAttribute('height',totalHeight);
    svg.setAttribute('viewBox',`0 0 ${width} ${totalHeight}`);
    const background=document.createElementNS(ns,'rect'); background.setAttribute('width','100%'); background.setAttribute('height','100%'); background.setAttribute('fill',darkMode?'#272822':'#FFFDF7'); svg.appendChild(background);
    const addText=(value,y,x=12)=>{const text=document.createElementNS(ns,'text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('fill',darkMode?'#F8F8F2':'#272822');text.setAttribute('font-size','12');text.setAttribute('font-family','Arial, sans-serif');text.textContent=value;svg.appendChild(text);};
    header.forEach((line,index)=>addText(line,20+index*18));
    clone.setAttribute('y',headerHeight); clone.setAttribute('width',width); clone.setAttribute('height',height); svg.appendChild(clone);
    legendItems.forEach(item=>{
      if(item.swatch){const marker=document.createElementNS(ns,'rect');marker.setAttribute('x',item.x);marker.setAttribute('y',headerHeight+height+item.y+3);marker.setAttribute('width','10');marker.setAttribute('height','10');marker.setAttribute('fill',item.color);svg.appendChild(marker);}
      addText(item.text,headerHeight+height+item.y+13,item.x+14);
    });
    notes.forEach((line,index)=>addText(line,headerHeight+height+legendHeight+18+index*18));
    const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});
    if(format==='svg') { downloadBlob(blob,`${dataset?.name || '数据'}_透视图表.svg`); }
    else {
      const url=URL.createObjectURL(blob);
      try {
        const image=new Image();
        await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('图表光栅化失败，请改用 SVG 导出'));image.src=url;});
        const canvas=document.createElement('canvas');
        // Bound the export canvas for mobile browsers with stricter texture limits.
        const scale=Math.min(2,8192/width,8192/totalHeight);
        canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(totalHeight*scale);
        const context=canvas.getContext('2d');
        if(!context) throw new Error('无法创建图像画布，请改用 SVG 导出');
        context.drawImage(image,0,0,canvas.width,canvas.height);
        const png=await new Promise((resolve)=>canvas.toBlob(resolve,'image/png'));
        if(!png) throw new Error('图像内存不足，请减少图表分组或改用 SVG 导出');
        downloadBlob(png,`${dataset?.name || '数据'}_透视图表.png`);
      } finally {URL.revokeObjectURL(url);}
    }
    showToast?.(`已导出 ${format.toUpperCase()} 图表`);
  } catch(error) { showToast?.(`图表导出失败：${error.message}`,'error'); }
}

export function exportChartAsPNG(...args) { return exportChartImage(...args,'png'); }
export function exportChartAsSVG(...args) { return exportChartImage(...args,'svg'); }

export function exportPDFReport(setIsPrintingReport) {
  setIsPrintingReport(true);
  setTimeout(() => {
    window.print();
    setIsPrintingReport(false);
  }, 250);
}
