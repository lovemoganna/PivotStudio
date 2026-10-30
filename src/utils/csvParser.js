import { isIdentifierField } from './fieldSemantics.js';
import { isUnsafeInteger } from './normalizeScalar.js';

// Quoted commas, embedded newlines and escaped quotes are handled as one CSV record.
export function parseCSVRecords(text, delimiter = ',', limit = Infinity) {
  const records = [];
  let row = [], cell = '', quoted = false, afterQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i === 0 && ch === '\uFEFF') continue;
    if (afterQuote && ch !== delimiter && ch !== '\n' && ch !== '\r') {
      if (ch === ' ' || ch === '\t') continue;
      throw new Error('CSV 引号闭合后存在多余字符，请检查引号与分隔符');
    }
    if (ch === '"') {
      if (quoted && text[i+1] === '"') { cell += '"'; i++; }
      else if (quoted) { quoted = false; afterQuote = true; }
      else if (cell.length === 0) quoted = true;
      else throw new Error('CSV 未加引号的字段中出现双引号，请将整个字段加引号并转义内部引号');
    } else if (ch === delimiter && !quoted) { row.push(cell); cell = ''; afterQuote = false; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim() !== '')) records.push(row);
      row = []; cell = ''; afterQuote = false;
      if (records.length >= limit) return records;
    } else cell += ch;
  }
  if (quoted) throw new Error('CSV 存在未闭合的引号');
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim() !== '')) records.push(row);
  }
  return records;
}

export function splitCSVLine(line) { return parseCSVRecords(line)[0] || []; }

export function decodeCSVBuffer(buffer, encoding = 'auto') {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 255 && bytes[1] === 254 || bytes[0] === 254 && bytes[1] === 255) {
    throw new Error('检测到 UTF-16 编码，请另存为 UTF-8 CSV 后重试');
  }
  if (encoding !== 'auto') return { text: new TextDecoder(encoding, { fatal: true }).decode(bytes), encoding };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }; }
  catch { return { text: new TextDecoder('gbk', { fatal: true }).decode(bytes), encoding: 'gbk' }; }
}

export function detectDelimiter(text) {
  let best = ',', bestScore = -Infinity;
  for (const delimiter of [',', '\t', ';', '|']) {
    let sample;
    try { sample = parseCSVRecords(text, delimiter, 24); } catch { continue; }
    const widths = sample.map((row) => row.length);
    const counts = new Map();
    for (const width of widths) counts.set(width, (counts.get(width) || 0) + 1);
    const [width = 1, frequency = 0] = [...counts].sort((a,b) => b[1] - a[1])[0] || [];
    const score = width > 1 ? frequency / Math.max(1, widths.length) * 100 + Math.min(width, 30) : 0;
    if (score > bestScore) { bestScore = score; best = delimiter; }
  }
  return best;
}

function scalarType(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'empty';
  if (/^(true|false|是|否)$/i.test(raw)) return 'boolean';
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:$|[ T])/.test(raw) && !Number.isNaN(Date.parse(raw))) return 'date';
  // Identifiers with leading zeroes must retain their spelling.
  if (!/^[-+]?0\d+/.test(raw) && Number.isFinite(Number(raw.replace(/,/g,'')))) return 'number';
  return 'text';
}

export function parseCSVTextToSheet(csvText, sheetName = 'Sheet1', options = {}) {
  if (!csvText?.trim()) return null;
  if (/^\s*(?:<!doctype|<html)/i.test(csvText)) throw new Error('内容是 HTML 网页，请导出 CSV 文件或检查公开表格访问权限后重试');
  if (csvText.includes('\0')) throw new Error('文件含二进制内容，请选择文本 CSV、TSV 或有效 Excel 文件');
  const delimiter = options.delimiter && options.delimiter !== 'auto' ? options.delimiter : detectDelimiter(csvText);
  const records = parseCSVRecords(csvText, delimiter);
  if (!records.length) return null;
  const first = records[0];
  const detectedHeader = first.every((value) => ['text','empty'].includes(scalarType(value)));
  const hasHeader = options.header === undefined || options.header === 'auto' ? detectedHeader : options.header === true || options.header === 'yes';
  if (hasHeader && records.length < 2) return null;
  const headers = hasHeader ? first.map((h,i) => h.trim() || `字段_${i+1}`) : first.map((_,i) => `字段_${i+1}`);
  if (new Set(headers).size !== headers.length) throw new Error('CSV 表头存在重复字段，请重命名后重试');
  let shortRowCount = 0;
  const rows = records.slice(hasHeader ? 1 : 0).map((cells, rowIndex) => {
    if (cells.length > headers.length) throw new Error(`CSV 第 ${rowIndex + (hasHeader ? 2 : 1)} 行存在 ${cells.length - headers.length} 个无表头字段，请检查分隔符或补齐表头`);
    if (cells.length < headers.length) shortRowCount++;
    const row = {};
    headers.forEach((h,i) => { Object.defineProperty(row, h, { value: cells[i] ?? '', enumerable: true, writable: true, configurable: true }); });
    return row;
  });
  const fields = headers.map((name) => {
    const counts = { number: 0, date: 0, boolean: 0, text: 0 };
    let nonempty = 0;
    for (const row of rows.slice(0,100)) {
      const type = scalarType(row[name]);
      if (type !== 'empty') { nonempty++; counts[type]++; }
    }
    // Inspect every row for irreversible precision loss, including beyond inference's sample.
    const precisionProtected = rows.some(row => isUnsafeInteger(row[name]));
    const type = precisionProtected || isIdentifierField(name) ? 'text' : ['boolean','date','number'].find((key) => nonempty && counts[key] / nonempty >= 0.7) || 'text';
    return { name, type, ...(precisionProtected ? {precisionProtected:true} : {}) };
  });
  const warnings = [shortRowCount ? `${shortRowCount} 行缺少字段，已按原有规则补为空值；请核对分隔符设置，并确认原文件是否遗漏列` : '', fields.some(f=>f.precisionProtected) ? '检测到超出安全整数精度的值，相关列已保留为文本，避免不同值被合并。' : ''].filter(Boolean).join('；');
  return { name: sheetName, fields, rows, importMeta: { delimiter, hasHeader, encoding: options.encoding || 'utf-8', warnings } };
}
