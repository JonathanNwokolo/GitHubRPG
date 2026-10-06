/** Small pure math helpers shared by the whole engine. */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Diminishing-returns normalization: log1p(value) / log1p(reference), clamped to [0, 1].
 * `reference` is a balancing anchor, not a real maximum.
 */
export function logNormalize(value: number, reference: number): number {
  if (!(value > 0) || !(reference > 0)) return 0;
  if (value === Number.POSITIVE_INFINITY) return 1;
  return clamp01(Math.log1p(value) / Math.log1p(reference));
}

/**
 * Shannon entropy of `weights` (natural log) divided by ln(categories).
 * 0 = everything in one bucket; 1 = perfectly even across `categories` buckets.
 * Using a fixed `categories` (instead of weights.length) keeps two balanced
 * languages from looking as versatile as eight.
 */
export function normalizedEntropy(weights: readonly number[], categories: number): number {
  if (categories < 2) return 0;
  let total = 0;
  for (const w of weights) if (w > 0) total += w;
  if (total <= 0) return 0;
  let entropy = 0;
  for (const w of weights) {
    if (w <= 0) continue;
    const p = w / total;
    entropy -= p * Math.log(p);
  }
  return clamp01(entropy / Math.log(categories));
}

/** Score in [0, 1] -> integer 0-100. */
export function toStat(score: number): number {
  return Math.round(clamp01(score) * 100);
}

const EPSILON = 1e-9;

export function floorTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + EPSILON) / factor;
}

export function ceilTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor - EPSILON) / factor;
}
