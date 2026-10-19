// Quoted commas, embedded newlines and escaped quotes are handled as one CSV record.
export function parseCSVRecords(text) {
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i === 0 && ch === '\uFEFF') continue;
    if (ch === '"') {
      if (quoted && text[i+1] === '"') { cell += '"'; i++; }
      else if (quoted) quoted = false;
      else if (cell.length === 0) quoted = true;
      else cell += ch;
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim() !== '')) records.push(row);
      row = []; cell = '';
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

export function parseCSVTextToSheet(csvText, sheetName = 'Sheet1') {
  if (!csvText?.trim()) return null;
  const records = parseCSVRecords(csvText);
  if (records.length < 2) return null;
  const headers = records[0].map((h,i) => h.trim() || `字段_${i+1}`);
  if (new Set(headers).size !== headers.length) throw new Error('CSV 表头存在重复字段');
  const rows = records.slice(1).map((cells) => {
    const row = {};
    headers.forEach((h,i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
  const fields = headers.map((name) => {
    let number=0,date=0,boolean=0,nonempty=0;
    for (const row of rows.slice(0,30)) {
      const raw = String(row[name] ?? '').trim();
      if (!raw) continue;
      nonempty++;
      if (/^(true|false|是|否)$/i.test(raw)) boolean++;
      else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(raw)) date++;
      else if (Number.isFinite(Number(raw.replace(/,/g,'')))) number++;
    }
    let type='text';
    if (nonempty) {
      if (boolean/nonempty >= 0.7) type='boolean';
      else if (date/nonempty >= 0.7) type='date';
      else if (number/nonempty >= 0.7) type='number';
    }
    return {name,type};
  });
  return {name:sheetName,fields,rows};
}
