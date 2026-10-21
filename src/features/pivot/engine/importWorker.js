import * as XLSX from 'xlsx';
import { parseCSVTextToSheet, decodeCSVBuffer } from '../../../utils/csvParser.js';

self.onmessage = async ({ data: { file, text, sheets, normalize, options = {} } }) => {
  const progress = (pct) => self.postMessage({ progress: pct });
  try {
    progress(5);
    if (normalize) {
      const sheet = sheets[0];
      const rows = sheet.rows.map((row, index) => {
        if (index % 10000 === 0) progress(Math.round(index / Math.max(1, sheet.rows.length) * 95));
        const next = { ...row };
        for (const field of sheet.fields) {
          if (field.type === 'number') {
            const raw = String(row[field.name] ?? '').trim();
            const number = raw ? Number(raw.replace(/,/g, '')) : null;
            next[field.name] = number === null || Number.isFinite(number) ? number : null;
          } else if (field.type === 'boolean') next[field.name] = /^(true|1|是|yes)$/i.test(String(row[field.name] ?? '').trim());
        }
        return next;
      });
      self.postMessage({ sheets: [{ ...sheet, rows }] });
      return;
    }
    let result;
    if (file && /\.(xlsx|xls)$/i.test(file.name)) {
      const buffer = await file.arrayBuffer();
      progress(30);
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      result = workbook.SheetNames.map((name, index) => {
        progress(35 + Math.round(index / workbook.SheetNames.length * 50));
        // Import underlying numbers (including currency/percent), not display strings.
        // ISO dates keep date inference independent of workbook display formats.
        const records = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' });
        const csv = records.map((row) => row.map((value) => {
          const raw = value instanceof Date ? value.toISOString() : String(value ?? '');
          return `"${raw.replace(/"/g, '""')}"`;
        }).join(',')).join('\n');
        return parseCSVTextToSheet(csv, name, { delimiter: ',', header: 'yes' });
      }).filter(Boolean);
    } else {
      let content = text;
      let encoding = options.encoding || 'utf-8';
      if (file) {
        const buffer = await file.arrayBuffer();
        progress(30);
        const decoded = decodeCSVBuffer(buffer, options.encoding || 'auto');
        content = decoded.text; encoding = decoded.encoding;
      }
      progress(50);
      result = [parseCSVTextToSheet(content, file?.name || '剪贴板数据', { ...options, encoding })].filter(Boolean);
    }
    if (!result.length) throw new Error('没有可用数据行，请添加表头和至少一行数据后重试');
    progress(100);
    self.postMessage({ sheets: result });
  } catch (error) { self.postMessage({ error: error?.message || '文件读取失败，请重新选择 CSV 或 Excel 文件' }); }
};
