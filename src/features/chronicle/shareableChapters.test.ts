import { describe, expect, it } from "vitest";
import { buildDeveloperChronicle } from "./buildDeveloperChronicle";
import { findShareableChapter, isShareableChapter, parseChapterYear, shareableChapters } from "./shareableChapters";
import { yearlyProfile } from "./testing/fixtures";

const CHRONICLE = buildDeveloperChronicle(
  yearlyProfile({
    createdAt: "2019-03-12T00:00:00Z",
    referenceDate: "2026-10-01T00:00:00Z",
    years: { 2019: 40, 2020: 180, 2021: 200, 2022: 190, 2023: 342, 2024: 610, 2025: 1300, 2026: 250 },
  })
);

describe("shareable chapters", () => {
  it("always includes the opening chapter and the current one", () => {
    const years = shareableChapters(CHRONICLE).map((entry) => entry.year);
    expect(years).toContain(2019);
    expect(years).toContain(2026);
  });

  it("includes the chapters the Chronicle rates above normal (the most active year)", () => {
    const peak = CHRONICLE.years.find((entry) => entry.highlights.some((h) => h.kind === "mostActiveYear"));
    expect(peak).toBeDefined();
    expect(isShareableChapter(peak!)).toBe(true);
    expect(findShareableChapter(CHRONICLE, peak!.year)).toBe(peak);
  });

  it("leaves out chapters of normal rarity", () => {
    const normal = CHRONICLE.years.filter((entry) => !entry.isStart && !entry.isCurrent && entry.rarity === "normal");
    for (const entry of normal) {
      expect(isShareableChapter(entry)).toBe(false);
      expect(findShareableChapter(CHRONICLE, entry.year)).toBeUndefined();
    }
  });

  it("only returns chapters that exist in THIS chronicle", () => {
    expect(findShareableChapter(CHRONICLE, 1999)).toBeUndefined();
    expect(findShareableChapter(CHRONICLE, 2099)).toBeUndefined();
  });

  it("parses only a four-digit year", () => {
    expect(parseChapterYear("2025")).toBe(2025);
    for (const bad of ["", "25", "02025", "2025.0", "2025a", "-2025", " 2025", "../2025", "abcd", "２０２５"]) {
      expect(parseChapterYear(bad), bad).toBeNull();
    }
  });
});
