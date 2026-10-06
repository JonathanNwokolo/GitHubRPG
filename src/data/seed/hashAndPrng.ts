/**
 * FNV-1a 32-bit hashing algorithm.
 * Converts any string into a deterministic unsigned 32-bit integer.
 */
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 32-bit PRNG algorithm.
 * High-speed generator with 2^32 period and excellent distribution properties.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic random integer generator between min and max (inclusive).
 */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Deterministic random choice from an array.
 */
export function randChoice<T>(rng: () => number, array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error("Cannot pick from an empty array");
  }
  const index = Math.floor(rng() * array.length);
  return array[index];
}

/**
 * Deterministic boolean with given probability of true (default 0.5).
 */
export function randBool(rng: () => number, chanceTrue: number = 0.5): boolean {
  return rng() < chanceTrue;
}
