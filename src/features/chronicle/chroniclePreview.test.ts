import { describe, expect, it } from "vitest";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import { MAX_PREVIEW_ENTRIES, selectPreviewYears } from "./chroniclePreview";
import { noHistoryProfile, yearlyProfile } from "./testing/fixtures";

const REF = "2026-10-01T00:00:00Z";

describe("selectPreviewYears", () => {
  it("picks the start, one relevant chapter in between and the current chapter, in order", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2011-09-03T00:00:00Z",
        referenceDate: REF,
        years: { 2011: 10, 2012: 20, 2013: 30, 2014: 40, 2015: 50, 2016: 60, 2017: 70, 2018: 80, 2019: 90, 2020: 100, 2021: 600, 2022: 4000, 2023: 500, 2024: 600, 2025: 700, 2026: 800 },
      })
    );
    const picked = selectPreviewYears(chronicle);

    expect(picked.length).toBeLessThanOrEqual(MAX_PREVIEW_ENTRIES);
    expect(picked[0].isStart).toBe(true);
    expect(picked[picked.length - 1]).toBe(chronicle.currentChapter);
    expect(picked.map((entry) => entry.year)).toEqual([...picked.map((entry) => entry.year)].sort((a, b) => a - b));
    // The in-between chapter is one the chronicle itself flagged as relevant: nothing is invented.
    for (const entry of picked.slice(1, -1)) {
      expect(entry.rarity).not.toBe("normal");
      expect(chronicle.years).toContain(entry);
    }
  });

  it("shows only what exists when no chapter in between is relevant", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2025-03-01T00:00:00Z", referenceDate: REF, years: { 2025: 5, 2026: 5 } })
    );
    const picked = selectPreviewYears(chronicle);
    expect(picked.map((entry) => entry.year)).toEqual([2025, 2026]);
  });

  it("returns a single chapter for an account created in the current year", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({ createdAt: "2026-09-20T00:00:00Z", referenceDate: REF, years: { 2026: 1 } })
    );
    expect(selectPreviewYears(chronicle)).toHaveLength(1);
  });

  it("works without any yearly history: only the start and the current chapter", () => {
    const chronicle = buildDeveloperChronicle(noHistoryProfile("2019-03-12T00:00:00Z", REF));
    const picked = selectPreviewYears(chronicle);
    expect(picked.map((entry) => entry.year)).toEqual([2019, 2026]);
  });

  it("never picks a year whose data could not be read", () => {
    const chronicle = buildDeveloperChronicle(
      yearlyProfile({
        createdAt: "2018-04-01T00:00:00Z",
        referenceDate: REF,
        omitYears: [2019, 2020],
        yearlyCoverage: "partial",
        years: { 2018: 10, 2021: 100, 2022: 200, 2023: 300, 2024: 400, 2025: 500, 2026: 100 },
      })
    );
    expect(selectPreviewYears(chronicle).every((entry) => entry.known)).toBe(true);
  });
});
