export function splitCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur.trim());
  return res;
}

export function parseCSVTextToSheet(csvText, sheetName = 'Sheet1') {
  if (!csvText || !csvText.trim()) return null;
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const headers = splitCSVLine(lines[0]).map((h, i) => h || `字段_${i + 1}`);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] ?? '';
    });
    rows.push(rowObj);
  }

  const sampleSize = Math.min(30, rows.length);
  const fields = headers.map((h) => {
    let numCount = 0;
    let dateCount = 0;
    let boolCount = 0;
    let nonEmpty = 0;

    for (let i = 0; i < sampleSize; i++) {
      const raw = String(rows[i][h] ?? '').trim();
      if (!raw) continue;
      nonEmpty++;
      if (/^(true|false|是|否)$/i.test(raw)) {
        boolCount++;
      } else if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(raw)) {
        dateCount++;
      } else if (!Number.isNaN(Number(raw.replace(/,/g, '')))) {
        numCount++;
      }
    }

    let type = 'text';
    if (nonEmpty > 0) {
      if (boolCount / nonEmpty >= 0.7) type = 'boolean';
      else if (dateCount / nonEmpty >= 0.7) type = 'date';
      else if (numCount / nonEmpty >= 0.7) type = 'number';
    }
    return { name: h, type };
  });

  return { name: sheetName, fields, rows };
}
