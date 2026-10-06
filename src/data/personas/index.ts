import type { RawGitHubData } from "../contracts";
import {
  MOCK_REFERENCE_DATE,
  generateMonthlySeries,
  generateRepositories,
  metric,
  monthsInclusive,
  type RepositorySpec,
} from "../seed/deterministicGenerator";
import { createMulberry32, fnv1a } from "../seed/hashAndPrng";

/**
 * Explicit test personas. Each one is a fixed, readable scenario: numbers are written
 * by hand, only repository lists / monthly series are filled by the seeded generator.
 * The username `missing-dev` has no persona on purpose: MockDataSource answers it with a 404.
 */

interface PersonaSpec {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  createdAt: string;
  commits: { value: number; coverage: "full" | "partial" };
  pullRequests: number;
  reviews: number;
  issues: number;
  followers: number;
  activeDays: number;
  longestStreakDays: number;
  currentStreakDays: number;
  recentActiveDays: number;
  /** Monthly series shape: chance a month is active, mean contributions of an active month. */
  series: { activeChance: number; mean: number };
  repositories: RepositorySpec;
}

function buildPersona(spec: PersonaSpec): RawGitHubData {
  const rng = createMulberry32(fnv1a(spec.username));
  const months = monthsInclusive(spec.createdAt, MOCK_REFERENCE_DATE);

  return {
    username: spec.username,
    displayName: spec.displayName,
    bio: spec.bio,
    location: spec.location,
    company: null,
    createdAt: spec.createdAt,
    fetchedAt: MOCK_REFERENCE_DATE,
    isDemo: true,
    followers: metric(spec.followers),
    commits: metric(spec.commits.value, spec.commits.coverage),
    pullRequests: metric(spec.pullRequests),
    reviews: metric(spec.reviews),
    issues: metric(spec.issues),
    repositories: { items: generateRepositories(rng, spec.repositories), coverage: "full" },
    activity: {
      activeDays: metric(spec.activeDays),
      longestStreakDays: metric(spec.longestStreakDays),
      currentStreakDays: metric(spec.currentStreakDays),
      recentActiveDays: metric(spec.recentActiveDays),
      monthlyContributions: {
        months: generateMonthlySeries(rng, months, spec.series.activeChance, spec.series.mean),
        coverage: "full",
      },
    },
  };
}

export const ROOKIE_DEV: RawGitHubData = buildPersona({
  username: "rookie-dev",
  displayName: "Arthur Aprendiz",
  bio: "Iniciando minha jornada pelos pergaminhos da programação e reinos do código aberto.",
  location: "Vila Inicial",
  createdAt: "2026-02-14T09:30:00Z",
  commits: { value: 42, coverage: "full" },
  pullRequests: 1,
  reviews: 0,
  issues: 1,
  followers: 3,
  activeDays: 14,
  longestStreakDays: 3,
  currentStreakDays: 1,
  recentActiveDays: 14,
  series: { activeChance: 0.7, mean: 6 },
  repositories: {
    count: 2,
    forkCount: 0,
    languages: [["JavaScript", 70], ["HTML", 20], ["CSS", 10]],
    totalStars: 3,
    totalForks: 0,
  },
});

/** Long history, Rust main language, commits only partially observed (older history). */
export const VETERAN_DEV: RawGitHubData = buildPersona({
  username: "veteran-dev",
  displayName: "Valéria da Forja Sagrada",
  bio: "Forjando sistemas de baixo nível há mais de uma década.",
  location: "Fortaleza do Kernel",
  createdAt: "2015-05-20T08:00:00Z",
  commits: { value: 6_840, coverage: "partial" },
  pullRequests: 412,
  reviews: 530,
  issues: 210,
  followers: 245,
  activeDays: 1_800,
  longestStreakDays: 94,
  currentStreakDays: 12,
  recentActiveDays: 190,
  series: { activeChance: 0.85, mean: 55 },
  repositories: {
    count: 58,
    forkCount: 14,
    languages: [["Rust", 55], ["TypeScript", 22], ["Python", 12], ["Shell", 6], ["Go", 3], ["C", 2]],
    totalStars: 2_300,
    totalForks: 410,
  },
});

/** Many balanced languages. */
export const POLYGLOT_DEV: RawGitHubData = buildPersona({
  username: "polyglot-dev",
  displayName: "Pietra Poliglota",
  bio: "Fala várias línguas do código e sempre quer aprender mais uma.",
  location: "Arquipélago do Código Aberto",
  createdAt: "2020-08-03T14:00:00Z",
  commits: { value: 2_300, coverage: "full" },
  pullRequests: 140,
  reviews: 60,
  issues: 55,
  followers: 64,
  activeDays: 640,
  longestStreakDays: 41,
  currentStreakDays: 5,
  recentActiveDays: 120,
  series: { activeChance: 0.9, mean: 30 },
  repositories: {
    count: 31,
    forkCount: 6,
    languages: [["TypeScript", 30], ["Python", 25], ["Go", 18], ["Rust", 10], ["Java", 8], ["Shell", 6], ["CSS", 3]],
    totalStars: 85,
    totalForks: 21,
  },
});

/** Reputation-heavy: stars/forks/followers, moderate everything else. */
export const POPULAR_DEV: RawGitHubData = buildPersona({
  username: "popular-dev",
  displayName: "Estela Brilhante",
  bio: "Mantenedora de ferramentas que muita gente usa.",
  location: "Cume das Nuvens",
  createdAt: "2022-07-07T11:00:00Z",
  commits: { value: 1_100, coverage: "full" },
  pullRequests: 60,
  reviews: 25,
  issues: 40,
  followers: 3_200,
  activeDays: 510,
  longestStreakDays: 38,
  currentStreakDays: 9,
  recentActiveDays: 140,
  series: { activeChance: 0.92, mean: 18 },
  repositories: {
    count: 24,
    forkCount: 3,
    languages: [["Go", 70], ["Python", 18], ["Shell", 7], ["TypeScript", 5]],
    totalStars: 437,
    totalForks: 96,
  },
});

/** Valid account with no public history at all. */
export const EMPTY_DEV: RawGitHubData = {
  username: "empty-dev",
  displayName: "Fantasma do Vazio",
  bio: "Uma alma recém-chegada aos portais do código. Nenhum rastro deixado ainda.",
  location: null,
  company: null,
  createdAt: "2026-09-12T00:00:00Z",
  fetchedAt: MOCK_REFERENCE_DATE,
  isDemo: true,
  followers: metric(0),
  commits: metric(0),
  pullRequests: metric(0),
  reviews: metric(0),
  issues: metric(0),
  repositories: { items: [], coverage: "full" },
  activity: {
    activeDays: metric(0),
    longestStreakDays: metric(0),
    currentStreakDays: metric(0),
    recentActiveDays: metric(0),
    monthlyContributions: { months: [0, 0], coverage: "full" },
  },
};

export const RESERVED_PERSONAS: Readonly<Record<string, RawGitHubData>> = {
  "rookie-dev": ROOKIE_DEV,
  "veteran-dev": VETERAN_DEV,
  "polyglot-dev": POLYGLOT_DEV,
  "popular-dev": POPULAR_DEV,
  "empty-dev": EMPTY_DEV,
};

/** Usernames the landing page offers as ready-made scenarios (missing-dev is the 404 one). */
export const PERSONA_USERNAMES = [
  "rookie-dev",
  "veteran-dev",
  "polyglot-dev",
  "popular-dev",
  "empty-dev",
  "missing-dev",
] as const;
