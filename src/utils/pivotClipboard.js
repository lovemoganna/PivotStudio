import {buildPivotExportRows,excelNumberFormat} from './exportMatrix.js';

const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeText=value=>/^\s*[=+\-@\t\r]/.test(String(value)) ? "'"+value : String(value);
const tsvCell=value=>{
  const text=typeof value==='number' ? String(value) : safeText(value ?? '');
  return /[\t\r\n"]/.test(text) ? '"'+text.replaceAll('"','""')+'"' : text;
};

// The complete result, not the virtualized DOM or current selection, is the source.
export function buildPivotClipboard(pivotResult) {
  const rows=buildPivotExportRows(pivotResult);
  const dimensionCount=Math.max(1,pivotResult.rowConfigs?.length || 0);
  const metrics=pivotResult.valConfigs || [];
  const html='<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">'+rows.map((row,r)=>'<tr>'+row.map((value,c)=>{
    if(r===0)return '<th>'+escapeHTML(safeText(value))+'</th>';
    const metric=c>=dimensionCount ? metrics[(c-dimensionCount)%metrics.length] : null;
    if(metric && typeof value==='number' && Number.isFinite(value)) {
      const excelFormat=excelNumberFormat(metric).replaceAll('\\','\\\\').replaceAll('"','\\"').replace(/[\r\n\f]/g,' ');
      return `<td data-t="n" data-v="${value}" x:num="${value}" style="mso-number-format:&quot;${escapeHTML(excelFormat)}&quot;">${value}</td>`;
    }
    return `<td data-t="s" x:str style="mso-number-format:'\\@';white-space:pre-wrap">${escapeHTML(safeText(value ?? ''))}</td>`;
  }).join('')+'</tr>').join('')+'</table></body></html>';
  return {html,text:rows.map(row=>row.map(tsvCell).join('\t')).join('\r\n'),rowCount:rows.length-1,columnCount:rows[0].length};
}

export async function writePivotClipboard(payload) {
  if(navigator.clipboard?.write && typeof ClipboardItem!=='undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':new Blob([payload.html],{type:'text/html'}),
        'text/plain':new Blob([payload.text],{type:'text/plain'}),
      })]);
      return 'html';
    }catch(error){if(!['NotSupportedError','TypeError'].includes(error.name))throw error;}
  }
  if(navigator.clipboard?.writeText) {await navigator.clipboard.writeText(payload.text);return 'text';}
  throw new Error('当前浏览器无法写入剪贴板，请使用导出 Excel');
}
