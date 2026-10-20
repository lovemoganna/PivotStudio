/** Absolute-value bar axes include zero so differences are not exaggerated. */
export function zeroAnchoredMinimum(dataMin) { return Math.min(0, Number(dataMin) || 0); }
export function zeroAnchoredMaximum(dataMax) { return Math.max(0, Number(dataMax) || 0); }
export const ZERO_ANCHORED_DOMAIN = [zeroAnchoredMinimum,zeroAnchoredMaximum];
