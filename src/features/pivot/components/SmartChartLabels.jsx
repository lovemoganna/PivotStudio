import React from 'react';
import { UnifiedFormatter, formatAxisTickLabel } from '../../../utils/formatters';
import { CV, chartInk, chartLabelInk, seriesColor } from '../../../constants/chartVisual';

export function renderSmartPieLabel(props, primaryValCfg, darkMode, position = 'auto') {
  const { cx, cy, midAngle, innerRadius, outerRadius, value, percent, name, fill } = props;
  if (percent <= 0.008) return null;
  const RADIAN = Math.PI / 180;
  const formattedVal = UnifiedFormatter.formatValue(value, primaryValCfg, { compact: true });
  const pctStr = `${(percent * 100).toFixed(1)}%`;
  const leaderInk = chartInk(darkMode);

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 14) * cos;
  const my = cy + (outerRadius + 14) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 10;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  if (position === 'inside' || (position === 'auto' && percent >= 0.12 && innerRadius === 0)) {
    const midR = innerRadius + (outerRadius - innerRadius) * 0.62;
    const ix = cx + midR * cos;
    const iy = cy + midR * sin;
    // Interior labels follow the actual slice color, independently of theme.
    return (
      <g data-value-label="true" pointerEvents="none">
        <text x={ix} y={iy - 5} fill={chartLabelInk(fill)} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700}>
          {formatAxisTickLabel(name, 7)}
        </text>
        <text x={ix} y={iy + 7} fill={chartLabelInk(fill)} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} className="apple-font-mono">
          {`${formattedVal}, ${pctStr}`}
        </text>
      </g>
    );
  }

  return (
    <g data-value-label="true" pointerEvents="none">
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill || seriesColor(0)} strokeWidth={CV.stroke.leader} fill="none" opacity={0.85} />
      <circle cx={ex} cy={ey} r={2} fill={fill || seriesColor(0)} />
      <text data-value-label="true"
        x={ex + (cos >= 0 ? 5 : -5)}
        y={ey}
        fill={leaderInk}
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

export function renderSmartBarLabel(props, darkMode, isHorizontal = false, position = 'auto', markFill = seriesColor(0)) {
  const { x, y, width, height, value } = props;
  if (value === null || value === undefined || value === '') return null;
  const textStr = String(value);
  if (position !== 'auto') {
    const left = Math.min(x, x + width), right = Math.max(x, x + width);
    const top = Math.min(y, y + height), bottom = Math.max(y, y + height);
    let tx = (left + right) / 2, ty = (top + bottom) / 2, anchor = 'middle';
    if (position === 'top') ty = top - 8;
    if (position === 'bottom') ty = bottom + 8;
    if (position === 'insideTop') ty = top + 8;
    if (position === 'insideBottom') ty = bottom - 8;
    if (position === 'left' || position === 'insideLeft') { tx = left + (position === 'left' ? -6 : 6); anchor = position === 'left' ? 'end' : 'start'; }
    if (position === 'right' || position === 'insideRight') { tx = right + (position === 'right' ? 6 : -6); anchor = position === 'right' ? 'start' : 'end'; }
    const inside = (position === 'inside' || position.startsWith('inside')) && Math.abs(width * height) > 0;
    return <text data-value-label="true" x={tx} y={ty} fill={inside ? chartLabelInk(markFill) : chartInk(darkMode)} textAnchor={anchor} dominantBaseline="central" fontSize={CV.typography.dataLabel} fontWeight={700} className="apple-font-mono">{textStr}</text>;
  }
  const isNeg = textStr.startsWith('-');
  const labelSize = CV.typography.dataLabel;
  const outsideInk = chartInk(darkMode);

  if (isHorizontal) {
    if (Math.abs(height) < 12) return null;
    if (isNeg) {
      return (
        <text data-value-label="true"
          x={x + width / 2}
          y={y + height / 2}
          fill={chartLabelInk(markFill)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={labelSize}
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
      <text data-value-label="true"
        x={tx}
        y={y + height / 2}
        fill={placeInside ? chartLabelInk(markFill) : outsideInk}
        textAnchor={placeInside ? 'end' : 'start'}
        dominantBaseline="central"
        fontSize={labelSize}
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
  const fillCol = isNeg || nearTopEdge ? chartLabelInk(markFill) : outsideInk;

  return (
    <text data-value-label="true"
      x={x + width / 2}
      y={ty}
      fill={fillCol}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={labelSize}
      fontWeight={700}
      className="apple-font-mono"
    >
      {textStr}
    </text>
  );
}
