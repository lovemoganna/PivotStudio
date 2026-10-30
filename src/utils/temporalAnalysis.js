// Time calculations require a single, explicitly bucketed calendar axis.
export function periodIndex(label, granularity) {
  const text = String(label);
  let m;
  if (granularity === 'year' && (m = /^(\d{4})年$/.exec(text))) return +m[1];
  if (granularity === 'quarter' && (m = /^(\d{4})-Q([1-4])$/.exec(text))) return +m[1] * 4 + +m[2] - 1;
  if (granularity === 'month' && (m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text))) return +m[1] * 12 + +m[2] - 1;
  if (['day','hour','minute'].includes(granularity) && (m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(text))) {
    const parts = [+m[1], +m[2]-1, +m[3], +(m[4] || 0), +(m[5] || 0)];
    const d = new Date(0); d.setUTCFullYear(parts[0],parts[1],parts[2]); d.setUTCHours(parts[3],parts[4],0,0);
    if (d.getUTCFullYear() !== parts[0] || d.getUTCMonth() !== parts[1] || d.getUTCDate() !== parts[2] || d.getUTCHours() !== parts[3] || d.getUTCMinutes() !== parts[4]) return null;
    if (granularity !== 'day' && !m[4]) return null;
    return d.getTime() / ({day:86400000,hour:3600000,minute:60000}[granularity]);
  }
  return null;
}

export function temporalAxisIssue(dataset, rows, columns, sortMode, items) {
  const axis = rows.length ? rows : columns;
  if (axis.length !== 1 || !dataset.fields.some(f => f.name === axis[0].field && f.type === 'date')) return '环比和移动平均需要单一日期维度；请将日期放到行或列，并选择时间粒度。';
  if (!['year','quarter','month','day','hour','minute'].includes(axis[0].dateGranularity)) return '请按年、季度、月、日、小时或分钟分组后计算；原始日期、星期几和周分组尚未定义连续周期。';
  if (['asc','desc'].includes(sortMode)) return '环比和移动平均不能按指标大小排序；请将图表排序设为默认，系统会按时间升序计算。';
  if (items.some(item => periodIndex(item.name,axis[0].dateGranularity) === null)) return '时间轴包含空值或无效日期，无法可靠比较周期；请先筛除或修正这些记录。';
  return null;
}
