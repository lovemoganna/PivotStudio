// Presentation only: preserve input order, values, and the complete analysis.
export function categoryPage(items = [], seriesCount = 1, width = 960, requestedPage = 0, type = 'bar') {
  const supported = ['bar','horizontal_bar','stacked_bar','pct_stacked_bar'].includes(type);
  const longLabels = items.some(item => String(item.name ?? '').length > 10);
  const groupWidth = Math.max(longLabels ? 96 : 64, Math.max(1,seriesCount) * 14 + 24);
  const pageSize = type === 'horizontal_bar' ? 12 : Math.max(3, Math.min(24, Math.floor(Math.max(240,width - 100) / groupWidth)));
  const paged = supported && items.length > Math.max(12,pageSize);
  const pages = paged ? Math.ceil(items.length / pageSize) : 1;
  const index = Math.max(0, Math.min(pages - 1, requestedPage));
  const start = paged ? index * pageSize : 0;
  const end = paged ? Math.min(items.length, start + pageSize) : items.length;
  return {items:paged ? items.slice(start,end) : items, paged, pages, pageSize, index, start, end, total:items.length};
}

// Keep a common numeric scale between pages, including diverging stacks.
export function categoryValueDomain(items = [], keys = [], stacked = false) {
  let min=0,max=0;
  for(const item of items){
    let positive=0,negative=0;
    for(const key of keys){
      const value=item[key];if(typeof value!=='number'||!Number.isFinite(value))continue;
      if(stacked){if(value>0)positive+=value;else negative+=value;}
      else {min=Math.min(min,value);max=Math.max(max,value);}
    }
    if(stacked){min=Math.min(min,negative);max=Math.max(max,positive);}
  }
  return [min,max===min ? min+1 : max];
}
