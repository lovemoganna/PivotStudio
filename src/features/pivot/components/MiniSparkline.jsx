import React from 'react';

export function MiniSparkline({ values = [], color = '#F92672' }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72;
  const h = 24;
  const pts = values.map((v, idx) => {
    const x = (idx / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / range) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPts = `0,${h} ${pts.join(' ')} ${w},${h}`;
  const lastPt = pts[pts.length - 1].split(',');
  return (
    <svg width={w} height={h} className="overflow-visible shrink-0 opacity-95">
      <polygon points={areaPts} fill={color} fillOpacity="0.18" />
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="2.2" fill={color} />
    </svg>
  );
}
