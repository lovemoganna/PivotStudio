// Escape data before joining internal path/cell separators; ordinary keys stay stable.
export function encodeGroupSegment(value) {
  const text = String(value);
  if (!/[%|@]|__/.test(text)) return text;
  return text.replace(/%/g, '%25').replace(/\|/g, '%7C').replace(/@/g, '%40').replace(/__/g, '%5F%5F');
}

export function decodeGroupPath(key) {
  return String(key).replace(/__SUBTOTAL__$/, '').split('||').map(segment => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
}
