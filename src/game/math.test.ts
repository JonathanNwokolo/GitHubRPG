import { describe, expect, it } from "vitest";
import { ceilTo, clamp, clamp01, floorTo, logNormalize, normalizedEntropy, toStat } from "./math";

describe("logNormalize", () => {
  it("is log1p(value) / log1p(reference)", () => {
    expect(logNormalize(100, 1_000)).toBeCloseTo(Math.log1p(100) / Math.log1p(1_000), 12);
  });

  it("maps 0 to 0 and the reference to 1", () => {
    expect(logNormalize(0, 1_000)).toBe(0);
    expect(logNormalize(1_000, 1_000)).toBe(1);
  });

  it("clamps above the reference and below zero", () => {
    expect(logNormalize(1_000_000, 1_000)).toBe(1);
    expect(logNormalize(-10, 1_000)).toBe(0);
    expect(logNormalize(Number.POSITIVE_INFINITY, 1_000)).toBe(1);
  });

  it("is safe with NaN and invalid references", () => {
    expect(logNormalize(Number.NaN, 1_000)).toBe(0);
    expect(logNormalize(10, 0)).toBe(0);
    expect(logNormalize(10, -5)).toBe(0);
  });

  it("is monotonic with diminishing returns", () => {
    const step = (a: number, b: number) => logNormalize(b, 10_000) - logNormalize(a, 10_000);
    expect(step(1, 11)).toBeGreaterThan(step(1_000, 1_010));
    expect(logNormalize(500, 10_000)).toBeGreaterThan(logNormalize(50, 10_000));
  });
});

describe("normalizedEntropy", () => {
  it("is 0 for one bucket and 1 for a perfectly even spread", () => {
    expect(normalizedEntropy([100], 4)).toBe(0);
    expect(normalizedEntropy([25, 25, 25, 25], 4)).toBeCloseTo(1, 10);
  });

  it("is scale-invariant and ignores empty buckets", () => {
    expect(normalizedEntropy([1, 1, 0], 4)).toBeCloseTo(normalizedEntropy([50, 50], 4), 10);
  });

  it("is 0 with fewer than two categories or no weight", () => {
    expect(normalizedEntropy([5], 1)).toBe(0);
    expect(normalizedEntropy([], 8)).toBe(0);
    expect(normalizedEntropy([0, 0], 8)).toBe(0);
  });
});

describe("rounding helpers", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(Number.NaN, 0, 3)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
  });

  it("toStat returns integers in 0-100", () => {
    expect(toStat(0.456)).toBe(46);
    expect(toStat(7)).toBe(100);
    expect(toStat(-3)).toBe(0);
  });

  it("floorTo / ceilTo round in the conservative direction", () => {
    expect(floorTo(4.96, 1)).toBe(4.9);
    expect(ceilTo(0.71, 1)).toBe(0.8);
    expect(floorTo(4.2, 1)).toBe(4.2);
    expect(ceilTo(3, 1)).toBe(3);
  });
});
