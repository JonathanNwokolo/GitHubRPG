import type { DataCoverage, RawCalendarYear, RawGitHubData, RawMetric, RawRepository } from "../contracts";
import { createMulberry32, fnv1a, randChoice, randInt } from "./hashAndPrng";

/**
 * The mock "now". Fixed on purpose: with a moving clock the same username would age
 * (and change achievements) over time, breaking determinism.
 */
export const MOCK_REFERENCE_DATE = "2026-10-01T00:00:00Z";

const DAY_MS = 86_400_000;

export type Rng = () => number;
export type WeightedLanguage = readonly [name: string, weight: number];

export function metric(value: number, coverage: DataCoverage = "full"): RawMetric {
  return { value, coverage };
}

/** Months between two ISO dates, counting both the first and the last month. */
export function monthsInclusive(createdIso: string, referenceIso: string): number {
  const c = new Date(createdIso);
  const r = new Date(referenceIso);
  return Math.max(1, (r.getUTCFullYear() - c.getUTCFullYear()) * 12 + (r.getUTCMonth() - c.getUTCMonth()) + 1);
}

/** Contributions per month: each month is active with `activeChance`, then ~`mean` contributions. */
export function generateMonthlySeries(rng: Rng, months: number, activeChance: number, mean: number): number[] {
  return Array.from({ length: months }, () =>
    rng() < activeChance ? Math.max(1, Math.round(mean * (0.3 + 1.4 * rng()))) : 0
  );
}

/**
 * Demo per-day calendar derived from the monthly series, so a day-level view stays consistent with it: every month's
 * contributions are spread over a deterministic set of its days and sum back to exactly that month's value.
 * Uses its OWN generator (seeded from `seed`), so it never shifts the draws of the profile it is attached to.
 */
export function generateMockCalendar(
  seed: string,
  monthly: readonly number[],
  createdIso: string,
  referenceIso: string
): RawCalendarYear[] {
  const rng = createMulberry32(fnv1a(`${seed}:calendar`));
  const created = new Date(createdIso);
  const reference = new Date(referenceIso);
  const firstYear = created.getUTCFullYear();
  const lastYear = reference.getUTCFullYear();
  const referenceDay = Math.floor(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()) / DAY_MS);
  const createdDay = Math.floor(Date.UTC(firstYear, created.getUTCMonth(), created.getUTCDate()) / DAY_MS);

  const years: RawCalendarYear[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const yearStart = Math.floor(Date.UTC(year, 0, 1) / DAY_MS);
    const yearEnd = Math.min(Math.floor(Date.UTC(year, 11, 31) / DAY_MS), referenceDay);
    years.push({ year, counts: new Array<number>(yearEnd - yearStart + 1).fill(0) });
  }

  monthly.forEach((total, offset) => {
    if (total <= 0) return;
    const monthIndex = created.getUTCMonth() + offset;
    const year = firstYear + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const monthStart = Math.max(Math.floor(Date.UTC(year, month, 1) / DAY_MS), createdDay);
    const monthEnd = Math.min(Math.floor(Date.UTC(year, month + 1, 0) / DAY_MS), referenceDay);
    const available = monthEnd - monthStart + 1;
    const target = years.find((entry) => entry.year === year);
    if (available <= 0 || !target) return;

    const activeDays = Math.max(1, Math.min(total, available, Math.round(total / (1 + rng() * 5))));
    const days = Array.from({ length: available }, (_, i) => monthStart + i);
    shuffle(rng, days);
    const chosen = days.slice(0, activeDays);
    const amounts = allocateByWeight(total, chosen.map(() => rng() ** 2 + 0.1));
    const yearStart = Math.floor(Date.UTC(year, 0, 1) / DAY_MS);
    chosen.forEach((day, i) => {
      target.counts[day - yearStart] += amounts[i];
    });
  });

  return years;
}

/** Largest-remainder allocation of `n` items over weights (deterministic, sums exactly to n). */
export function allocateByWeight(n: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (n <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / total) * n);
  const counts = exact.map(Math.floor);
  let left = n - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    counts[index]++;
    left--;
  }
  return counts;
}

/** Splits `total` over `n` slots with a heavy tail (a few popular repos, many with none). */
function distributeHeavyTail(rng: Rng, total: number, n: number): number[] {
  if (n === 0) return [];
  const weights = Array.from({ length: n }, () => rng() ** 3 + 0.001);
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.floor((w / sum) * total));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export interface RepositorySpec {
  count: number;
  /** Extra repositories flagged as forks (they must never count). */
  forkCount: number;
  languages: readonly WeightedLanguage[];
  totalStars: number;
  totalForks: number;
}

export function generateRepositories(rng: Rng, spec: RepositorySpec): RawRepository[] {
  const perLanguage = allocateByWeight(spec.count, spec.languages.map((l) => l[1]));
  const languageOrder = shuffle(
    rng,
    spec.languages.flatMap(([name], i) => Array.from({ length: perLanguage[i] }, () => name))
  );
  const stars = distributeHeavyTail(rng, spec.totalStars, spec.count);
  const forks = distributeHeavyTail(rng, spec.totalForks, spec.count);

  const own: RawRepository[] = languageOrder.map((language, i) => ({
    name: `${language.toLowerCase().replace(/[^a-z0-9]/g, "")}-projeto-${i + 1}`,
    isFork: false,
    stars: stars[i],
    forks: forks[i],
    languages: { [language]: randInt(rng, 40_000, 240_000) },
  }));

  const forked: RawRepository[] = Array.from({ length: spec.forkCount }, (_, i) => ({
    name: `fork-clonado-${i + 1}`,
    isFork: true,
    // Forks carry big numbers on purpose: they must not inflate anything.
    stars: randInt(rng, 50, 900),
    forks: randInt(rng, 5, 120),
    languages: { [randChoice(rng, spec.languages)[0]]: randInt(rng, 200_000, 900_000) },
  }));

  return [...own, ...forked];
}

const FIRST_NAMES = [
  "Alden", "Beatriz", "Cassian", "Daphne", "Elion", "Freya", "Gareth", "Helena", "Ignis", "Jora",
  "Kael", "Lyra", "Morrigan", "Nyx", "Orion", "Peregrine", "Rowan", "Sylvan", "Thorne", "Vesper",
];
const LAST_NAMES = [
  "da Cidadela", "do Abismo", "da Forja", "dos Portais", "do Éter", "dos Teclados", "das Sombras",
  "das Marés", "do Silício", "da Aurora", "do Vácuo", "dos Ventos", "da Constelação", "do Fogo Fátuo",
];
const LOCATIONS = [
  "Vale dos Servidores", "Torre da Compilação", "Planície dos Pacotes", "Cavernas do Terminal",
  "Oásis do Frontend", "Fortaleza do Kernel", "Cume das Nuvens", "Arquipélago do Código Aberto",
];
const COMPANIES = [
  "Laboratório dos Alquimistas", "Corte dos Magos do Código", "Ordem dos Paladinos Tipados",
  "Forja dos Guardiões", "Conselho Assíncrono", "",
];

/** Language pool for hashed usernames: [name, weight of being picked as a main language]. */
const LANGUAGE_POOL: readonly WeightedLanguage[] = [
  ["TypeScript", 5], ["JavaScript", 4], ["Python", 5], ["Rust", 2], ["Go", 2], ["C++", 1.5],
  ["C", 1], ["Java", 2.5], ["C#", 1.5], ["PHP", 1], ["Ruby", 1], ["Kotlin", 1], ["Swift", 1],
  ["Dart", 0.5], ["Shell", 1.5], ["HTML", 2], ["CSS", 2], ["Lua", 0.5],
];

function pickWeighted(rng: Rng, pool: readonly WeightedLanguage[]): string {
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [name, weight] of pool) {
    roll -= weight;
    if (roll < 0) return name;
  }
  return pool[pool.length - 1][0];
}

/** Everything a hashed username produces is a pure function of the username. */
export function generateDeterministicProfile(username: string): RawGitHubData {
  const clean = username.toLowerCase().trim();
  const rng = createMulberry32(fnv1a(clean));

  const displayName = `${randChoice(rng, FIRST_NAMES)} ${randChoice(rng, LAST_NAMES)}`;
  const location = randChoice(rng, LOCATIONS);
  const company = randChoice(rng, COMPANIES);

  const ageYears = 0.2 + rng() * 13;
  const fetchedMs = Date.parse(MOCK_REFERENCE_DATE);
  const createdAt = new Date(fetchedMs - Math.round(ageYears * 365.25 * DAY_MS)).toISOString();
  const months = monthsInclusive(createdAt, MOCK_REFERENCE_DATE);

  const intensity = rng() ** 1.8;
  const monthly = generateMonthlySeries(rng, months, 0.25 + 0.65 * rng(), 3 + intensity * 60);
  const contributions = monthly.reduce((a, b) => a + b, 0);
  const activeMonths = monthly.filter((m) => m > 0).length;

  const activeDays = Math.min(Math.round(contributions / (1.5 + rng() * 2.5)), activeMonths * 28);
  const longestStreak = Math.min(activeDays, Math.floor(1 + rng() * 60 * intensity));

  // One to four main languages, the first one dominant.
  const mainLanguages: string[] = [];
  while (mainLanguages.length < 1 + Math.floor(rng() * 4)) {
    const candidate = pickWeighted(rng, LANGUAGE_POOL);
    if (!mainLanguages.includes(candidate)) mainLanguages.push(candidate);
  }
  const dominance = 0.45 + rng() * 0.5;
  const languageWeights: WeightedLanguage[] = mainLanguages.map((name, i) => [
    name,
    i === 0 ? dominance : (1 - dominance) / Math.max(1, mainLanguages.length - 1),
  ]);

  const repoCount = Math.floor(rng() ** 1.3 * Math.min(60, 4 + ageYears * 4));
  const repositories = generateRepositories(rng, {
    count: repoCount,
    forkCount: Math.floor(rng() * 8),
    languages: languageWeights,
    totalStars: Math.floor(rng() ** 4 * 800),
    totalForks: Math.floor(rng() ** 4 * 120),
  });

  return {
    username: clean,
    displayName,
    bio: `Explorador dos círculos arcanos de ${mainLanguages[0]}. Transformando ideias em runas e arquiteturas digitais.`,
    location,
    company: company || null,
    createdAt,
    fetchedAt: MOCK_REFERENCE_DATE,
    isDemo: true,
    followers: metric(Math.floor(rng() ** 3 * 400 * (1 + ageYears / 3))),
    commits: metric(Math.round(contributions * 0.78), rng() < 0.25 ? "partial" : "full"),
    pullRequests: metric(Math.round(contributions * 0.04 * (0.5 + rng()))),
    reviews: metric(Math.round(contributions * 0.03 * rng() * 2)),
    issues: metric(Math.round(contributions * 0.03 * (0.5 + rng()))),
    repositories: { items: repositories, coverage: "full" },
    activity: {
      activeDays: metric(activeDays),
      longestStreakDays: metric(longestStreak),
      currentStreakDays: metric(rng() < 0.5 ? Math.floor(rng() * longestStreak) : 0),
      recentActiveDays: metric(Math.min(activeDays, Math.floor(rng() * 200 * intensity))),
      monthlyContributions: { months: monthly, coverage: "full" },
      calendar: {
        years: generateMockCalendar(clean, monthly, createdAt, MOCK_REFERENCE_DATE),
        coverage: "full",
      },
    },
  };
}
