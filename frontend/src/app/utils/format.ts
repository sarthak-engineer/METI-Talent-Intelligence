/**
 * Safe formatting helpers to prevent NaN, null, undefined, or Infinity rendering.
 */

export function formatScore(val: any, fallback: string = "—"): string {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return `${Math.round(Number(val))}`;
}

export function formatPercent(val: any, fallback: string = "—"): string {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  const num = Number(val);
  const pct = num <= 1.0 && num > 0 ? num * 100 : num;
  return `${Math.round(pct)}%`;
}

export function formatReadiness(val: any, fallback: string = "Not assessed"): string {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return `${Math.round(Number(val))}%`;
}

export function formatCount(val: any, fallback: string = "—"): string {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return `${Number(val)}`;
}
