/** Pure, finite and clamped helpers used only by the duel presentation engine. */
export function clampPower(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/** Logarithmic saturation prevents very large public profiles from dominating a round. */
export function normalizeLog(value: number, softMaximum: number): number {
  if (!Number.isFinite(value) || value <= 0 || softMaximum <= 0) return 0;
  return clampPower((Math.log1p(value) / Math.log1p(softMaximum)) * 100);
}

export function weightedPower(parts: ReadonlyArray<readonly [value: number, weight: number]>): number {
  return clampPower(parts.reduce((total, [value, weight]) => total + clampPower(value) * weight, 0));
}

