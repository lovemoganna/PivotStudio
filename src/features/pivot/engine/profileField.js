import { formatDimensionValue } from '../../../utils/formatters.js';

export function profileField(dataset, fieldName, dimension, matchLabel) {
  const rows = dataset?.rows || [];
  const field = dataset?.fields?.find((item) => item.name === fieldName);
  const values = new Map(), labels = new Set(), matching = new Set();
  let nonNullCount=0, sum=0, valid=0, min=Infinity, max=-Infinity;
  for (const row of rows) {
    const raw=row[fieldName], text=String(raw ?? '');
    const label=dimension ? formatDimensionValue(raw,dimension,field) : text;
    labels.add(label);
    if (matchLabel !== undefined && label === matchLabel) matching.add(text);
    if (raw===null || raw===undefined || text.trim()==='') continue;
    nonNullCount++;
    values.set(text,(values.get(text)||0)+1);
    if(field?.type==='number') {
      const value=Number(text.replace(/,/g,''));
      if(Number.isFinite(value)){sum+=value;valid++;min=Math.min(min,value);max=Math.max(max,value);}
    }
  }
  const entries=[...values];
  return {
    total:rows.length, nonNullCount, nullCount:rows.length-nonNullCount,
    completenessPct:rows.length?(nonNullCount/rows.length*100).toFixed(1):'0',
    distinctCount:values.size, validNumericCount:valid, invalidNumericCount:field?.type==='number'?nonNullCount-valid:0, numMin:valid?min:null,numMax:valid?max:null,numAvg:valid?sum/valid:null,
    slicerValues:entries.slice(0,16).map(([label,count])=>({label,count})),
    topValues:entries.sort((a,b)=>b[1]-a[1]).slice(0,5).map(([val,count])=>({val,count,pct:rows.length?(count/rows.length*100).toFixed(1):'0'})),
    distinctValues:[...labels].sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true})),
    matchingRawValues:[...matching],
  };
}
