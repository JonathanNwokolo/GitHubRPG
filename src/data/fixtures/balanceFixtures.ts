import type { GitHubDataSource, RawGitHubData, RawRepository } from "../contracts";
import { MockDataSource } from "../datasource/MockDataSource";
import { MOCK_REFERENCE_DATE, metric, monthsInclusive } from "../seed/deterministicGenerator";

/**
 * Balance-review fixtures: fixed, hand-written stress profiles.
 *
 * Unlike the personas, NOTHING here is seeded or random. Every headline number is written
 * out in the fixture, and the helpers below only spread totals evenly (integer arithmetic),
 * so a future engine change can be compared against exactly the same input data.
 *
 * They are deliberately NOT registered in RESERVED_PERSONAS: the app never serves them.
 * They exist for `npm run balance:review` and their own tests.
 */

// ---------------------------------------------------------------------------
// Deterministic helpers (no randomness)
// ---------------------------------------------------------------------------

/** Splits `total` into `count` integers that sum exactly to `total`; earlier slots get the remainder. */
export function spreadTotal(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * `count` slots summing to `total`: the explicit `top` values first (the "popular" repos),
 * the rest of the total spread evenly over the remaining slots.
 */
export function topThenSpread(total: number, count: number, top: readonly number[] = []): number[] {
  const head = top.slice(0, count);
  const headSum = head.reduce((a, b) => a + b, 0);
  return [...head, ...spreadTotal(total - headSum, count - head.length)];
}

interface RepoGroup {
  /** Repositories in this group. */
  count: number;
  /** Bytes per repository, per language. A repo with several entries is a mixed-language repo. */
  languages: Record<string, number>;
}

/** Own (non-fork) repositories from explicit groups; stars/forks are assigned in order. */
function ownRepositories(groups: readonly RepoGroup[], stars: readonly number[], forks: readonly number[]): RawRepository[] {
  const repos: RawRepository[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const index = repos.length;
      const main = Object.keys(group.languages)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      repos.push({
        name: `${main}-repo-${index + 1}`,
        isFork: false,
        stars: stars[index] ?? 0,
        forks: forks[index] ?? 0,
        languages: { ...group.languages },
      });
    }
  }
  if (stars.length !== repos.length || forks.length !== repos.length) {
    throw new Error(`fixture mismatch: ${repos.length} repos but ${stars.length} star slots / ${forks.length} fork slots`);
  }
  return repos;
}

function forkedRepositories(count: number, stars: number, forks: number, language: string, bytes: number): RawRepository[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `forked-repo-${i + 1}`,
    isFork: true,
    stars,
    forks,
    languages: { [language]: bytes },
  }));
}

/**
 * Monthly contributions: `total` spread evenly over the months where `isActive(index)` holds
 * (index 0 = account creation month). No noise, so the shape of the history is readable.
 */
function monthlySeries(months: number, total: number, isActive: (index: number) => boolean): number[] {
  const activeIndexes = Array.from({ length: months }, (_, i) => i).filter(isActive);
  const shares = spreadTotal(total, activeIndexes.length);
  const series = new Array<number>(months).fill(0);
  activeIndexes.forEach((monthIndex, i) => {
    series[monthIndex] = shares[i];
  });
  return series;
}

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

interface StressSpec {
  username: string;
  displayName: string;
  /** What the fixture is meant to probe. Shown in the review. */
  purpose: string;
  createdAt: string;
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
  followers: number;
  activeDays: number;
  longestStreakDays: number;
  currentStreakDays: number;
  recentActiveDays: number;
  /** Which months (0 = creation month) have contributions, spread evenly. Ignored when `monthly` is given. */
  activeMonth?: (index: number) => boolean;
  /** Explicit month-by-month contributions (index 0 = creation month); must cover every month of the account. */
  monthly?: readonly number[];
  repositories: RawRepository[];
}

export interface StressFixture {
  purpose: string;
  data: RawGitHubData;
}

function buildStress(spec: StressSpec): StressFixture {
  const months = monthsInclusive(spec.createdAt, MOCK_REFERENCE_DATE);
  const contributions = spec.commits + spec.pullRequests + spec.reviews + spec.issues;
  if (spec.monthly && spec.monthly.length !== months) {
    throw new Error(`fixture ${spec.username}: ${spec.monthly.length} explicit months but the account spans ${months}`);
  }
  const monthlySeriesValues = spec.monthly ? [...spec.monthly] : monthlySeries(months, contributions, spec.activeMonth ?? everyMonth);

  return {
    purpose: spec.purpose,
    data: {
      username: spec.username,
      displayName: spec.displayName,
      bio: null,
      location: null,
      company: null,
      createdAt: spec.createdAt,
      fetchedAt: MOCK_REFERENCE_DATE,
      isDemo: true,
      followers: metric(spec.followers),
      commits: metric(spec.commits),
      pullRequests: metric(spec.pullRequests),
      reviews: metric(spec.reviews),
      issues: metric(spec.issues),
      repositories: { items: spec.repositories, coverage: "full" },
      activity: {
        activeDays: metric(spec.activeDays),
        longestStreakDays: metric(spec.longestStreakDays),
        currentStreakDays: metric(spec.currentStreakDays),
        recentActiveDays: metric(spec.recentActiveDays),
        monthlyContributions: {
          months: monthlySeriesValues,
          coverage: "full",
        },
      },
    },
  };
}

const everyMonth = () => true;

// ---------------------------------------------------------------------------
// Stress profiles
// ---------------------------------------------------------------------------

/** Lots of commits, almost nothing else, one language. Do commits alone dominate Level? */
const COMMIT_HEAVY = buildStress({
  username: "commit-heavy-dev",
  displayName: "Commit Heavy",
  purpose: "Muitos commits, poucos PRs/reviews/repos/stars, baixa diversidade.",
  createdAt: "2021-03-01T00:00:00Z",
  commits: 20_000,
  pullRequests: 15,
  reviews: 3,
  issues: 5,
  followers: 12,
  activeDays: 1_400,
  longestStreakDays: 120,
  currentStreakDays: 30,
  recentActiveDays: 220,
  activeMonth: everyMonth,
  repositories: ownRepositories(
    [{ count: 4, languages: { TypeScript: 100_000 } }],
    [4, 2, 1, 1],
    [1, 0, 0, 0]
  ),
});

/** Moderate work, huge popularity. Does Level inflate, or does it stay in Reputation? */
const STAR_HEAVY = buildStress({
  username: "star-heavy-dev",
  displayName: "Star Heavy",
  purpose: "Commits moderados, poucos PRs/reviews/repos, muitas stars e forks recebidos.",
  createdAt: "2022-01-10T00:00:00Z",
  commits: 1_500,
  pullRequests: 40,
  reviews: 10,
  issues: 30,
  followers: 6_000,
  activeDays: 420,
  longestStreakDays: 25,
  currentStreakDays: 4,
  recentActiveDays: 110,
  activeMonth: everyMonth,
  repositories: ownRepositories(
    [
      { count: 3, languages: { Go: 150_000 } },
      { count: 2, languages: { Python: 80_000 } },
    ],
    [18_000, 9_000, 3_000, 1_500, 500],
    [2_500, 1_200, 500, 200, 100]
  ),
});

/** 13.5-year-old account that barely does anything anymore. */
const OLD_INACTIVE = buildStress({
  username: "old-inactive-dev",
  displayName: "Old Inactive",
  purpose: "Conta de ~13,5 anos, poucos commits/repos, quase nenhuma atividade recente.",
  createdAt: "2013-04-01T00:00:00Z",
  commits: 600,
  pullRequests: 12,
  reviews: 2,
  issues: 8,
  followers: 25,
  activeDays: 180,
  longestStreakDays: 9,
  currentStreakDays: 0,
  recentActiveDays: 4,
  // Active for the first 4 years, then a sporadic month every 9 months.
  activeMonth: (i) => i < 48 || i % 9 === 0,
  repositories: ownRepositories(
    [
      { count: 6, languages: { PHP: 60_000 } },
      { count: 3, languages: { JavaScript: 40_000 } },
    ],
    [20, 8, 4, 3, 2, 1, 1, 1, 0],
    [4, 2, 1, 1, 0, 0, 0, 0, 0]
  ),
});

/** Under a year old, but an intense recent burst. */
const NEW_VERY_ACTIVE = buildStress({
  username: "new-very-active-dev",
  displayName: "New Very Active",
  purpose: "Conta com <1 ano, muitos commits, vários PRs/reviews, atividade recente forte.",
  createdAt: "2026-01-05T00:00:00Z",
  commits: 3_200,
  pullRequests: 260,
  reviews: 180,
  issues: 70,
  followers: 90,
  activeDays: 250,
  longestStreakDays: 60,
  currentStreakDays: 21,
  recentActiveDays: 250,
  activeMonth: everyMonth,
  repositories: ownRepositories(
    [
      { count: 10, languages: { TypeScript: 90_000 } },
      { count: 5, languages: { Python: 60_000 } },
      { count: 3, languages: { Go: 50_000 } },
    ],
    topThenSpread(120, 18, [40, 20]),
    topThenSpread(15, 18, [5, 3])
  ),
});

/**
 * Pair with BALANCED_POLYGLOT: identical in every number except the language mix
 * (20 repos, 2,000 kB of source in both), so any difference is caused by languages alone.
 */
const SHARED_LANGUAGE_PROBE = {
  createdAt: "2019-06-01T00:00:00Z",
  commits: 8_000,
  pullRequests: 120,
  reviews: 40,
  issues: 30,
  followers: 80,
  activeDays: 1_100,
  longestStreakDays: 75,
  currentStreakDays: 12,
  recentActiveDays: 160,
  activeMonth: everyMonth,
} as const;

const SHARED_PROBE_STARS = topThenSpread(150, 20, [60, 30]);
const SHARED_PROBE_FORKS = topThenSpread(25, 20, [10, 5]);

/** TypeScript 96% / CSS 2% / HTML 1% / Shell 1%, every repo. */
const SINGLE_LANGUAGE = buildStress({
  ...SHARED_LANGUAGE_PROBE,
  username: "single-language-dev",
  displayName: "Single Language",
  purpose: "Quase só TypeScript (96/2/1/1), muitos commits e repos: Versatility deve ficar baixa.",
  repositories: ownRepositories(
    [{ count: 20, languages: { TypeScript: 96_000, CSS: 2_000, HTML: 1_000, Shell: 1_000 } }],
    SHARED_PROBE_STARS,
    SHARED_PROBE_FORKS
  ),
});

/** TypeScript 40% / Python 30% / Go 20% / CSS 10%, one language per repo. */
const BALANCED_POLYGLOT = buildStress({
  ...SHARED_LANGUAGE_PROBE,
  username: "balanced-polyglot-dev",
  displayName: "Balanced Polyglot",
  purpose: "Mesmos números do single-language-dev, mas TS 40 / Python 30 / Go 20 / CSS 10.",
  repositories: ownRepositories(
    [
      { count: 8, languages: { TypeScript: 100_000 } },
      { count: 6, languages: { Python: 100_000 } },
      { count: 4, languages: { Go: 100_000 } },
      { count: 2, languages: { CSS: 100_000 } },
    ],
    SHARED_PROBE_STARS,
    SHARED_PROBE_FORKS
  ),
});

/** Review/PR/issue heavy; commits only moderate. */
const COLLABORATION_HEAVY = buildStress({
  username: "collaboration-heavy-dev",
  displayName: "Collaboration Heavy",
  purpose: "Commits moderados, muitos PRs, reviews e issues.",
  createdAt: "2020-05-01T00:00:00Z",
  commits: 2_000,
  pullRequests: 900,
  reviews: 1_100,
  issues: 700,
  followers: 300,
  activeDays: 900,
  longestStreakDays: 60,
  currentStreakDays: 15,
  recentActiveDays: 170,
  activeMonth: everyMonth,
  repositories: ownRepositories(
    [
      { count: 8, languages: { Java: 90_000 } },
      { count: 4, languages: { Kotlin: 60_000 } },
      { count: 2, languages: { Shell: 20_000 } },
    ],
    topThenSpread(220, 14, [80, 40]),
    topThenSpread(60, 14, [20, 10])
  ),
});

/** 300 tiny repos, hardly any work in each. */
const REPO_HEAVY = buildStress({
  username: "repo-heavy-dev",
  displayName: "Repo Heavy",
  purpose: "300 repos próprios com poucos commits cada, pouca colaboração e popularidade.",
  createdAt: "2021-01-01T00:00:00Z",
  commits: 700,
  pullRequests: 8,
  reviews: 0,
  issues: 4,
  followers: 10,
  activeDays: 260,
  longestStreakDays: 14,
  currentStreakDays: 2,
  recentActiveDays: 60,
  activeMonth: everyMonth,
  repositories: ownRepositories(
    [
      { count: 120, languages: { JavaScript: 8_000 } },
      { count: 90, languages: { Python: 8_000 } },
      { count: 60, languages: { HTML: 8_000 } },
      { count: 30, languages: { Shell: 8_000 } },
    ],
    topThenSpread(15, 300, [6, 4]),
    topThenSpread(3, 300, [2, 1])
  ),
});

/** Artificially extreme: every counter far past its reference value, plus huge forked repos. */
const EXTREME = buildStress({
  username: "extreme-dev",
  displayName: "Extreme",
  purpose: "Números artificialmente altos (100k+ commits, 1.200 repos, 150k stars, 16 anos): clamps e retornos decrescentes.",
  createdAt: "2010-09-01T00:00:00Z",
  commits: 150_000,
  pullRequests: 12_000,
  reviews: 15_000,
  issues: 12_000,
  followers: 120_000,
  activeDays: 5_200,
  longestStreakDays: 1_100,
  currentStreakDays: 640,
  recentActiveDays: 365,
  activeMonth: everyMonth,
  repositories: [
    ...ownRepositories(
      [
        { count: 120, languages: { TypeScript: 150_000 } },
        { count: 120, languages: { Python: 150_000 } },
        { count: 120, languages: { Go: 150_000 } },
        { count: 120, languages: { Rust: 150_000 } },
        { count: 120, languages: { Java: 150_000 } },
        { count: 120, languages: { "C++": 150_000 } },
        { count: 120, languages: { Ruby: 150_000 } },
        { count: 120, languages: { Kotlin: 150_000 } },
        { count: 120, languages: { Shell: 150_000 } },
        { count: 120, languages: { CSS: 150_000 } },
      ],
      topThenSpread(150_000, 1_200, [40_000, 25_000, 15_000, 10_000, 8_000, 6_000, 5_000, 4_000, 3_000, 2_000]),
      topThenSpread(25_000, 1_200, [5_000, 3_000, 2_000, 1_500, 1_200, 1_000, 800, 600, 500, 400])
    ),
    // Forks with enormous numbers: they must not add a single point anywhere.
    ...forkedRepositories(50, 5_000, 800, "Rust", 3_000_000),
  ],
});

// ---------------------------------------------------------------------------
// Consistency probes (V1.1)
//
// Same idea as the stress profiles (explicit numbers, no PRNG, not registered as personas), but the
// monthly history is written out month by month, because these exist to exercise the distribution
// part of Consistency, which the uniform stress profiles cannot.
// ---------------------------------------------------------------------------

/** Shared by the three one-year probes: a 12-month-old account (Nov 2025 .. Oct 2026), 540 contributions in total. */
const ONE_YEAR_PROBE = {
  createdAt: "2025-11-01T00:00:00Z",
  commits: 500,
  pullRequests: 20,
  reviews: 10,
  issues: 10,
  followers: 15,
  repositories: ownRepositories(
    [{ count: 5, languages: { TypeScript: 60_000 } }],
    [3, 2, 1, 0, 0],
    [1, 0, 0, 0, 0]
  ),
} as const;

/** ~83% of the 540 contributions in one month. 28 active days, all of them in that burst. */
const BURST = buildStress({
  ...ONE_YEAR_PROBE,
  username: "burst-dev",
  displayName: "Burst",
  purpose: "~500 commits concentrados quase todos em 1 mês (450 de 540 contribuições), 4 meses ativos de 12.",
  monthly: [0, 0, 0, 0, 0, 40, 450, 30, 0, 0, 0, 20],
  activeDays: 28,
  longestStreakDays: 14,
  currentStreakDays: 0,
  recentActiveDays: 28,
});

/** The same 540 contributions, 45 in each of the 12 months. */
const STEADY = buildStress({
  ...ONE_YEAR_PROBE,
  username: "steady-dev",
  displayName: "Steady",
  purpose: "Mesmo volume do burst-dev (540), 45 contribuições por mês durante os 12 meses.",
  monthly: spreadTotal(540, 12),
  activeDays: 144,
  longestStreakDays: 5,
  currentStreakDays: 3,
  recentActiveDays: 144,
});

/** Active every month, but only ~8 days per month (weekends), short streaks. */
const WEEKEND = buildStress({
  ...ONE_YEAR_PROBE,
  username: "weekend-dev",
  displayName: "Weekend",
  purpose: "Recorrente nos 12 meses, mas em poucos dias (fins de semana: 96 dias ativos) e sem sequências longas.",
  monthly: [40, 50, 45, 45, 40, 50, 45, 45, 40, 50, 45, 45],
  activeDays: 96,
  longestStreakDays: 2,
  currentStreakDays: 0,
  recentActiveDays: 96,
});

/** 106 months (Jan 2018 .. Oct 2026): 24 active months, 74 months stopped, 8 months back. */
const INACTIVE_RETURNING = buildStress({
  username: "inactive-returning-dev",
  displayName: "Inactive Returning",
  purpose: "Histórico antigo (24 meses ativos em 2018-2019), 74 meses parado e retorno recente (últimos 8 meses).",
  createdAt: "2018-01-01T00:00:00Z",
  commits: 900,
  pullRequests: 50,
  reviews: 20,
  issues: 30,
  followers: 40,
  activeDays: 304,
  longestStreakDays: 20,
  currentStreakDays: 7,
  recentActiveDays: 100,
  monthly: [...Array<number>(24).fill(25), ...Array<number>(74).fill(0), ...Array<number>(8).fill(50)],
  repositories: ownRepositories(
    [
      { count: 6, languages: { Python: 40_000 } },
      { count: 3, languages: { Go: 30_000 } },
    ],
    [30, 12, 6, 4, 2, 1, 1, 0, 0],
    [5, 2, 1, 0, 0, 0, 0, 0, 0]
  ),
});

export const CONSISTENCY_FIXTURES: Readonly<Record<string, StressFixture>> = Object.fromEntries(
  [BURST, STEADY, WEEKEND, INACTIVE_RETURNING].map((fixture) => [fixture.data.username, fixture])
);

export const CONSISTENCY_USERNAMES = ["burst-dev", "steady-dev", "weekend-dev", "inactive-returning-dev"] as const;

export const STRESS_FIXTURES: Readonly<Record<string, StressFixture>> = Object.fromEntries(
  [
    COMMIT_HEAVY,
    STAR_HEAVY,
    OLD_INACTIVE,
    NEW_VERY_ACTIVE,
    SINGLE_LANGUAGE,
    BALANCED_POLYGLOT,
    COLLABORATION_HEAVY,
    REPO_HEAVY,
    EXTREME,
  ].map((fixture) => [fixture.data.username, fixture])
);

/** Order used by the review. */
export const STRESS_USERNAMES = [
  "commit-heavy-dev",
  "star-heavy-dev",
  "old-inactive-dev",
  "new-very-active-dev",
  "single-language-dev",
  "balanced-polyglot-dev",
  "collaboration-heavy-dev",
  "repo-heavy-dev",
  "extreme-dev",
] as const;

/**
 * Serves the stress and consistency fixtures and falls back to MockDataSource for the existing personas,
 * so the review runs every profile through the same real pipeline (validation included).
 */
export class BalanceFixtureDataSource implements GitHubDataSource {
  readonly kind = "mock" as const;
  private readonly fallback = new MockDataSource();

  async getProfile(username: string): Promise<RawGitHubData> {
    const key = username.toLowerCase().trim();
    const fixture = STRESS_FIXTURES[key] ?? CONSISTENCY_FIXTURES[key];
    return fixture ? fixture.data : this.fallback.getProfile(username);
  }
}
