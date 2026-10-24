import React from 'react';
import { UnifiedFormatter, formatAxisTickLabel } from '../../../utils/formatters';

export function renderSmartPieLabel(props, primaryValCfg, darkMode) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value, percent, name, fill } = props;
  if (percent <= 0.008) return null;
  const RADIAN = Math.PI / 180;
  const formattedVal = UnifiedFormatter.formatValue(value, primaryValCfg, { compact: true });
  const pctStr = `${(percent * 100).toFixed(1)}%`;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 14) * cos;
  const my = cy + (outerRadius + 14) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 10;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  if (percent >= 0.12 && innerRadius === 0) {
    const midR = outerRadius * 0.62;
    const ix = cx + midR * cos;
    const iy = cy + midR * sin;
    return (
      <g>
        <text x={ix} y={iy - 5} fill="#1E1F1C" textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700}>
          {formatAxisTickLabel(name, 7)}
        </text>
        <text x={ix} y={iy + 7} fill="#1E1F1C" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} className="apple-font-mono">
          {`${formattedVal}, ${pctStr}`}
        </text>
      </g>
    );
  }

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill || '#F92672'} strokeWidth={1.2} fill="none" opacity={0.85} />
      <circle cx={ex} cy={ey} r={2} fill={fill || '#F92672'} />
      <text
        x={ex + (cos >= 0 ? 5 : -5)}
        y={ey}
        fill={darkMode ? '#F8F8F2' : '#272822'}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={9.5}
        fontWeight={600}
        className="apple-font-mono"
      >
        {`${formatAxisTickLabel(name, 7)}: ${formattedVal} (${pctStr})`}
      </text>
    </g>
  );
}

export function renderSmartBarLabel(props, darkMode, isHorizontal = false) {
  const { x, y, width, height, value } = props;
  if (value === null || value === undefined || value === '' || value === '0' || value === '¥0') return null;
  const textStr = String(value);
  const isNeg = textStr.startsWith('-');

  if (isHorizontal) {
    if (Math.abs(height) < 12) return null;
    if (isNeg) {
      return (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fill="#1E1F1C"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontWeight={700}
          className="apple-font-mono"
        >
          {textStr}
        </text>
      );
    }
    const placeInside = width > 68;
    const tx = placeInside ? x + width - 6 : x + Math.max(0, width) + 6;
    return (
      <text
        x={tx}
        y={y + height / 2}
        fill={placeInside ? '#1E1F1C' : (darkMode ? '#F8F8F2' : '#272822')}
        textAnchor={placeInside ? 'end' : 'start'}
        dominantBaseline="central"
        fontSize={9}
        fontWeight={700}
        className="apple-font-mono"
      >
        {textStr}
      </text>
    );
  }

  if (Math.abs(width) < 18) return null;
  if (isNeg && Math.abs(height) < 18) return null;
  const nearTopEdge = y < 18;
  const ty = isNeg ? Math.max(y, y + height) - 9 : nearTopEdge ? y + 12 : y - 6;
  const fillCol = isNeg || nearTopEdge ? '#1E1F1C' : (darkMode ? '#F8F8F2' : '#272822');

  return (
    <text
      x={x + width / 2}
      y={ty}
      fill={fillCol}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={9}
      fontWeight={700}
      className="apple-font-mono"
    >
      {textStr}
    </text>
  );
}
