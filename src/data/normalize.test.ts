import { describe, expect, it } from "vitest";
import type { RawRepository } from "./contracts";
import { normalizeDeveloperProfile } from "./normalize";
import { RawGitHubDataSchema, validateRawGitHubData } from "./schemas";
import { makeRawData, rawMetric } from "@/test/builders";

const repo = (overrides: Partial<RawRepository> = {}): RawRepository => ({
  name: "repo",
  isFork: false,
  stars: 0,
  forks: 0,
  languages: {},
  ...overrides,
});

describe("normalizeDeveloperProfile", () => {
  it("excludes forks from repositories, stars, forks and languages", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({
        repositories: {
          coverage: "full",
          items: [
            repo({ name: "mine", stars: 10, forks: 2, languages: { Go: 1_000 } }),
            repo({ name: "forked", isFork: true, stars: 5_000, forks: 900, languages: { Rust: 9_000_000 } }),
          ],
        },
      })
    );
    expect(profile.ownRepositories.value).toBe(1);
    expect(profile.starsReceived.value).toBe(10);
    expect(profile.forksReceived.value).toBe(2);
    expect(profile.languages).toEqual([{ name: "Go", bytes: 1_000, repoCount: 1 }]);
  });

  it("aggregates language bytes and the number of repos that use each language", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({
        repositories: {
          coverage: "full",
          items: [
            repo({ stars: 3, languages: { TypeScript: 100, CSS: 20 } }),
            repo({ languages: { TypeScript: 50 } }),
            repo({ stars: 1, languages: { Python: 70, CSS: 0 } }),
          ],
        },
      })
    );
    const byName = Object.fromEntries(profile.languages.map((l) => [l.name, l]));
    expect(byName.TypeScript).toEqual({ name: "TypeScript", bytes: 150, repoCount: 2 });
    expect(byName.CSS).toEqual({ name: "CSS", bytes: 20, repoCount: 1 });
    expect(byName.Python.repoCount).toBe(1);
    expect(profile.starredRepositories.value).toBe(2);
  });

  it("derived repository figures inherit the repository list coverage", () => {
    const partial = normalizeDeveloperProfile(
      makeRawData({ repositories: { coverage: "partial", items: [repo({ stars: 4 })] } })
    );
    expect(partial.ownRepositories).toEqual({ value: 1, coverage: "partial" });
    expect(partial.starsReceived).toEqual({ value: 4, coverage: "partial" });
    expect(partial.languagesCoverage).toBe("partial");
  });

  it("unavailable repositories produce unavailable figures and no languages", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({ repositories: { coverage: "unavailable", items: [repo({ stars: 99 })] } })
    );
    expect(profile.ownRepositories).toEqual({ value: 0, coverage: "unavailable" });
    expect(profile.starsReceived).toEqual({ value: 0, coverage: "unavailable" });
    expect(profile.languages).toEqual([]);
  });

  it("keeps the coverage of raw metrics and zeroes unavailable ones", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({
        commits: rawMetric(1_240, "partial"),
        reviews: rawMetric(null, "unavailable"),
        pullRequests: rawMetric(7),
      })
    );
    expect(profile.commits).toEqual({ value: 1_240, coverage: "partial" });
    expect(profile.reviews).toEqual({ value: 0, coverage: "unavailable" });
    expect(profile.pullRequests).toEqual({ value: 7, coverage: "full" });
  });

  it("maps dates, demo flag and trims empty text", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({ createdAt: "2019-04-02T00:00:00Z", fetchedAt: "2026-02-01T00:00:00Z", bio: "   ", displayName: " Ada " })
    );
    expect(profile.accountCreatedAt).toBe("2019-04-02T00:00:00Z");
    expect(profile.referenceDate).toBe("2026-02-01T00:00:00Z");
    expect(profile.isDemo).toBe(true);
    expect(profile.bio).toBeUndefined();
    expect(profile.displayName).toBe("Ada");
  });

  it("keeps only absolute https avatar URLs", () => {
    const avatar = (avatarUrl: string | null | undefined) => normalizeDeveloperProfile(makeRawData({ avatarUrl })).avatarUrl;
    expect(avatar(" https://avatars.githubusercontent.com/u/1?v=4 ")).toBe("https://avatars.githubusercontent.com/u/1?v=4");
    expect(avatar("http://example.com/a.png")).toBeUndefined();
    expect(avatar("javascript:alert(1)")).toBeUndefined();
    expect(avatar("not a url")).toBeUndefined();
    expect(avatar("  ")).toBeUndefined();
    expect(avatar(null)).toBeUndefined();
    expect(avatar(undefined)).toBeUndefined();
  });

  it("does not share mutable state with the raw data", () => {
    const raw = makeRawData({
      activity: {
        ...makeRawData().activity,
        monthlyContributions: { months: [1, 2, 3], coverage: "full" },
      },
    });
    const profile = normalizeDeveloperProfile(raw);
    profile.activity.monthlyContributions.push(99);
    expect(raw.activity.monthlyContributions.months).toEqual([1, 2, 3]);
  });

  it("drops monthly data when it is unavailable", () => {
    const profile = normalizeDeveloperProfile(
      makeRawData({
        activity: { ...makeRawData().activity, monthlyContributions: { months: [5, 5], coverage: "unavailable" } },
      })
    );
    expect(profile.activity.monthlyContributions).toEqual([]);
    expect(profile.activity.monthlyCoverage).toBe("unavailable");
  });
});

describe("raw data validation", () => {
  it("accepts well-formed data, including unavailable metrics with null", () => {
    expect(() => validateRawGitHubData(makeRawData({ reviews: rawMetric(null, "unavailable") }))).not.toThrow();
  });

  it("rejects null values unless the metric is unavailable", () => {
    expect(RawGitHubDataSchema.safeParse(makeRawData({ commits: rawMetric(null, "full") })).success).toBe(false);
  });

  it("rejects negative or fractional counters", () => {
    expect(RawGitHubDataSchema.safeParse(makeRawData({ commits: rawMetric(-1) })).success).toBe(false);
    expect(RawGitHubDataSchema.safeParse(makeRawData({ commits: rawMetric(1.5) })).success).toBe(false);
  });

  it("rejects invalid dates and an account created after it was fetched", () => {
    expect(RawGitHubDataSchema.safeParse(makeRawData({ createdAt: "not-a-date" })).success).toBe(false);
    expect(
      RawGitHubDataSchema.safeParse(makeRawData({ createdAt: "2027-01-01T00:00:00Z", fetchedAt: "2026-01-01T00:00:00Z" })).success
    ).toBe(false);
  });

  it("rejects malformed payloads and unknown coverage values", () => {
    expect(RawGitHubDataSchema.safeParse({}).success).toBe(false);
    expect(RawGitHubDataSchema.safeParse(null).success).toBe(false);
    expect(
      RawGitHubDataSchema.safeParse(makeRawData({ commits: { value: 1, coverage: "maybe" as never } })).success
    ).toBe(false);
  });

  it("rejects negative language bytes", () => {
    const bad = makeRawData({ repositories: { coverage: "full", items: [repo({ languages: { Go: -5 } })] } });
    expect(RawGitHubDataSchema.safeParse(bad).success).toBe(false);
  });
});
