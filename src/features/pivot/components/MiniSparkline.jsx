import React from 'react';
import { CV } from '../../../constants/chartVisual';

export function MiniSparkline({ values = [], color = CV.series[0] }) {
  if (!values || values.length < 2 || values.some((value) => !Number.isFinite(value))) return null;
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
  const gradId = `sparkline_grad_${color.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <svg width={w} height={h} className="overflow-visible shrink-0 opacity-95">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={CV.fill.areaGradFrom * 0.65} />
          <stop offset="100%" stopColor={color} stopOpacity={CV.fill.areaGradTo} />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={CV.stroke.derived}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={CV.dot.derived - 0.4} fill={color} />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={CV.dot.base} fill={color} fillOpacity="0.22" />
    </svg>
  );
}
