import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  BalanceFixtureDataSource,
  CONSISTENCY_FIXTURES,
  CONSISTENCY_USERNAMES,
  STRESS_FIXTURES,
  STRESS_USERNAMES,
} from "@/data/fixtures/balanceFixtures";
import { PERSONA_USERNAMES } from "@/data/personas";
import { normalizeDeveloperProfile } from "@/data/normalize";
import { validateRawGitHubData } from "@/data/schemas";
import { calculateAccountAge } from "@/game/age";
import { temporalDistribution } from "@/game/attributes/calculateAttributes";
import {
  IMPACT_WEIGHTS,
  LANGUAGE_RULES,
  LEVEL_MAX,
  MAX_XP,
  PROGRESSION_CURVE_EXPONENT,
  REFERENCE,
  SKILL,
  XP_WEIGHTS,
  calculateProgressionScore,
  createRPGCharacter,
  logNormalize,
  xpThresholdForLevel,
} from "@/game/engine";
import { xpFromProgressionScore } from "@/game/progression/xp";
import type { AchievementProgress, DeveloperProfile, Metric, MetricUnit, Rarity, RPGCharacter, ThresholdProgress } from "@/game/types";

/**
 * Generates BALANCE_REVIEW.md from the REAL engine. Nothing is calculated by hand and
 * no rule or constant is touched: this only reads what the engine produces today.
 *
 * Run with: npm run balance:review
 *
 * Everything after ANALYSIS_MARKER in the existing file is hand-written analysis and is preserved.
 */

const OUTPUT = resolve(__dirname, "..", "docs", "game-engine-v1", "BALANCE_REVIEW.md");
const SNAPSHOT_OUTPUT = resolve(__dirname, "..", "balance-snapshot.json");
const SNAPSHOT_ENGINE = "v1.1";
const ANALYSIS_MARKER = "<!-- ANALYSIS: hand-written below, preserved by the generator -->";
const SKILLS_PER_PROFILE = 5;

const EXISTING_PERSONAS = PERSONA_USERNAMES.filter((name) => name !== "missing-dev");
const ALL_PROFILES = [...EXISTING_PERSONAS, ...STRESS_USERNAMES, ...CONSISTENCY_USERNAMES];

interface Entry {
  username: string;
  profile: DeveloperProfile;
  character: RPGCharacter;
  isStress: boolean;
}

async function runPipeline(username: string): Promise<Entry> {
  // Same four steps as src/data/loadCharacter.ts, unrolled because the review also needs the profile.
  const raw = await new BalanceFixtureDataSource().getProfile(username);
  const profile = normalizeDeveloperProfile(validateRawGitHubData(raw));
  return {
    username,
    profile,
    character: createRPGCharacter(profile),
    isStress: username in STRESS_FIXTURES || username in CONSISTENCY_FIXTURES,
  };
}

const n = (value: number) => value.toLocaleString("en-US");
const row = (cells: Array<string | number>) => `| ${cells.join(" | ")} |`;

function table(header: string[], align: Array<"l" | "r">, rows: Array<Array<string | number>>): string {
  return [
    row(header),
    row(align.map((a) => (a === "r" ? "---:" : "---"))),
    ...rows.map(row),
  ].join("\n");
}

// --- Section 1: inputs -----------------------------------------------------------------

function inputsTable(entries: Entry[]): string {
  return table(
    ["Profile", "Age (y)", "Commits", "PRs", "Reviews", "Issues", "Repos", "Stars", "Forks", "Followers", "Active days", "Recent days", "Languages (≥5%)"],
    ["l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
    entries.map(({ username, profile }) => {
      const age = calculateAccountAge(profile.accountCreatedAt, profile.referenceDate).years;
      const relevant = profile.languages.length
        ? new Set(
            profile.languages
              .filter((l) => l.bytes / profile.languages.reduce((s, x) => s + x.bytes, 0) >= 0.05)
              .map((l) => l.name)
          ).size
        : 0;
      return [
        username,
        age.toFixed(1),
        n(profile.commits.value),
        n(profile.pullRequests.value),
        n(profile.reviews.value),
        n(profile.issues.value),
        n(profile.ownRepositories.value),
        n(profile.starsReceived.value),
        n(profile.forksReceived.value),
        n(profile.followers.value),
        n(profile.activity.activeDays.value),
        n(profile.activity.recentActiveDays.value),
        relevant,
      ];
    })
  );
}

// --- Section 2: main table -------------------------------------------------------------

function mainTable(entries: Entry[]): string {
  return table(
    ["Profile", "Level", "XP", "Tier", "Activity", "Experience", "Reputation", "Versatility", "Consistency", "Class", "Subclass"],
    ["l", "r", "r", "l", "r", "r", "r", "r", "r", "l", "l"],
    entries.map(({ username, character: c }) => [
      username,
      c.progression.level,
      n(c.progression.totalXp),
      c.progression.tier,
      c.stats.activity,
      c.stats.experience,
      c.stats.reputation,
      c.stats.versatility,
      c.stats.consistency,
      c.archetype.className,
      c.archetype.subclassName ?? "—",
    ])
  );
}

// --- Section 3: skills -----------------------------------------------------------------

function skillsSection(entries: Entry[]): string {
  return entries
    .map(({ username, character }) => {
      const lines = character.skills
        .slice(0, SKILLS_PER_PROFILE)
        .map((s) => `${s.name} — LVL ${s.level} — ${s.tier} (${s.sharePercent}% / ${s.repoCount} repos)`);
      const body = lines.length ? lines.join("\n") : "(sem skills)";
      return `**${username}**\n\n\`\`\`text\n${body}\n\`\`\``;
    })
    .join("\n\n");
}

// --- Section 4: where the XP comes from ---------------------------------------------------

/** Re-derives the progression score term by term, from the engine's own constants and logNormalize. */
function xpComponents(profile: DeveloperProfile) {
  const impact =
    logNormalize(profile.starsReceived.value, REFERENCE.starsReceived) * IMPACT_WEIGHTS.stars +
    logNormalize(profile.forksReceived.value, REFERENCE.forksReceived) * IMPACT_WEIGHTS.forks;
  const parts = {
    commits: logNormalize(profile.commits.value, REFERENCE.commits) * XP_WEIGHTS.commits,
    pullRequests: logNormalize(profile.pullRequests.value, REFERENCE.pullRequests) * XP_WEIGHTS.pullRequests,
    reviews: logNormalize(profile.reviews.value, REFERENCE.reviews) * XP_WEIGHTS.reviews,
    issues: logNormalize(profile.issues.value, REFERENCE.issues) * XP_WEIGHTS.issues,
    repositories: logNormalize(profile.ownRepositories.value, REFERENCE.ownRepositories) * XP_WEIGHTS.repositories,
    impact: impact * XP_WEIGHTS.impact,
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return { parts, sum };
}

function xpBreakdownTable(entries: Entry[]): string {
  return table(
    ["Profile", "Commits", "PRs", "Reviews", "Issues", "Repos", "Stars+Forks", "Score", `Score^${PROGRESSION_CURVE_EXPONENT}`, "% of max XP", "Level"],
    ["l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"],
    entries.map(({ username, profile, character }) => {
      const { parts, sum } = xpComponents(profile);
      const score = calculateProgressionScore(profile);
      if (Math.abs(sum - score) > 1e-9) {
        throw new Error(`XP breakdown of ${username} (${sum}) does not match the engine (${score}).`);
      }
      const pts = (v: number) => (v * 100).toFixed(1);
      return [
        username,
        pts(parts.commits),
        pts(parts.pullRequests),
        pts(parts.reviews),
        pts(parts.issues),
        pts(parts.repositories),
        pts(parts.impact),
        score.toFixed(3),
        (score ** PROGRESSION_CURVE_EXPONENT).toFixed(3),
        `${((character.progression.totalXp / MAX_XP) * 100).toFixed(1)}%`,
        character.progression.level,
      ];
    })
  );
}

// --- Section 5: other outputs -----------------------------------------------------------------

function progressionExtrasTable(entries: Entry[]): string {
  return table(
    ["Profile", "Achievements", "Titles", "Default title", "Skills", "HP", "MP"],
    ["l", "r", "r", "l", "r", "r", "r"],
    entries.map(({ username, character: c }) => {
      const unlockedTitles = c.titles.filter((t) => t.unlocked);
      const defaultTitle = c.titles.find((t) => t.id === c.defaultTitleId)?.name ?? "—";
      return [
        username,
        `${c.achievements.filter((a) => a.unlocked).length}/${c.achievements.length}`,
        `${unlockedTitles.length}/${c.titles.length}`,
        defaultTitle,
        c.skills.length,
        c.resources.maxHp,
        c.resources.maxMp,
      ];
    })
  );
}

// --- Section 6: achievements ------------------------------------------------------------------

const RARITIES: ReadonlyArray<{ id: Rarity; label: string }> = [
  { id: "common", label: "Comum" },
  { id: "rare", label: "Raro" },
  { id: "epic", label: "Épico" },
  { id: "legendary", label: "Lendário" },
];
const RARITY_RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const RARITY_LABEL = Object.fromEntries(RARITIES.map((r) => [r.id, r.label])) as Record<Rarity, string>;
const ACHIEVEMENTS_SHOWN = 5;

const UNIT_LABEL: Record<MetricUnit, string> = {
  commits: "commits",
  pullRequests: "PRs",
  reviews: "reviews",
  issues: "issues",
  repositories: "repos",
  stars: "stars",
  languages: "linguagens",
  years: "anos",
};

type RarityCounts = Record<Rarity, { unlocked: number; total: number }>;

function rarityCounts(character: RPGCharacter): RarityCounts {
  const counts = Object.fromEntries(RARITIES.map((r) => [r.id, { unlocked: 0, total: 0 }])) as RarityCounts;
  for (const a of character.achievements) {
    counts[a.rarity].total++;
    if (a.unlocked) counts[a.rarity].unlocked++;
  }
  return counts;
}

/** Same rule as the engine (evaluateThreshold): "remaining" only exists with full coverage. */
function progressText(p: ThresholdProgress): string {
  if (p.coverage === "unavailable" || p.current === null) return "dado indisponível — coverage: unavailable";
  const base = `${n(p.current)} / ${n(p.target)} ${UNIT_LABEL[p.unit]}`;
  if (p.unlocked) return `${base} — desbloqueado — coverage: ${p.coverage}`;
  if (p.coverage === "partial" || p.remaining === null) {
    return `${base} — valor mínimo observado, não dá para dizer quanto falta — coverage: partial`;
  }
  return `${base} — faltam ${n(p.remaining)} — coverage: full`;
}

function achievementsSummaryTable(entries: Entry[]): string {
  return table(
    ["Profile", "Total", ...RARITIES.map((r) => r.label)],
    ["l", "r", "r", "r", "r", "r"],
    entries.map(({ username, character }) => {
      const counts = rarityCounts(character);
      const unlocked = character.achievements.filter((a) => a.unlocked).length;
      return [
        username,
        `${unlocked}/${character.achievements.length}`,
        ...RARITIES.map((r) => `${counts[r.id].unlocked}/${counts[r.id].total}`),
      ];
    })
  );
}

/** Highest rarity first, then the last-defined (hardest) one inside the same rarity. */
function relevantUnlocked(character: RPGCharacter): AchievementProgress[] {
  return character.achievements
    .map((a, index) => ({ a, index }))
    .filter(({ a }) => a.unlocked)
    .sort((x, y) => RARITY_RANK[y.a.rarity] - RARITY_RANK[x.a.rarity] || y.index - x.index)
    .slice(0, ACHIEVEMENTS_SHOWN)
    .map(({ a }) => a);
}

function achievementsDetail(entries: Entry[]): string {
  return entries
    .map(({ username, character }) => {
      const unlocked = relevantUnlocked(character).map((a) => `  ${a.name} (${RARITY_LABEL[a.rarity]}) — ${a.description}`);
      const next = character.nextMilestones.map((m) => `  ${m.name} (${RARITY_LABEL[m.rarity]})\n    ${progressText(m)}`);
      return [
        `**${username}**`,
        "",
        "```text",
        `Desbloqueadas (até ${ACHIEVEMENTS_SHOWN}, as mais raras primeiro):`,
        ...(unlocked.length ? unlocked : ["  (nenhuma)"]),
        "Próximos marcos:",
        ...(next.length ? next : ["  (nenhum marco bloqueado)"]),
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

// --- Section 7: titles -------------------------------------------------------------------------

function titlesDetail(entries: Entry[]): string {
  return entries
    .map(({ username, character: c }) => {
      const unlocked = c.titles.filter((t) => t.unlocked);
      const defaultTitle = c.titles.find((t) => t.id === c.defaultTitleId)?.name ?? "—";
      const combos = c.titles.filter((t) => t.kind === "combination" && t.unlocked).map((t) => t.name);
      const next = c.titles.flatMap((t) => (t.kind === "threshold" && t.isNext ? [`  ${t.name} — ${progressText(t)}`] : []));
      return [
        `**${username}** — ${unlocked.length}/${c.titles.length} títulos · padrão: ${defaultTitle}`,
        "",
        "```text",
        `Classe / subclasse: ${c.archetype.className} / ${c.archetype.subclassName ?? "—"}`,
        `Título de combinação: ${combos.length ? combos.join(", ") : "nenhum"}`,
        "Próximos títulos quantitativos (um por categoria):",
        ...(next.length ? next : ["  (todos os quantitativos desbloqueados)"]),
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

/** Per-language share of the own-repo bytes (same input the engine's subclass rule reads). */
function languageShares(profile: DeveloperProfile): number[] {
  const total = profile.languages.reduce((s, l) => s + l.bytes, 0);
  if (total === 0) return [];
  const byName = new Map<string, number>();
  for (const l of profile.languages) byName.set(l.name, (byName.get(l.name) ?? 0) + l.bytes);
  return [...byName.values()].map((bytes) => bytes / total);
}

function subclassTable(entries: Entry[]): string {
  const relevantPct = LANGUAGE_RULES.relevantShare * 100;
  const subclassPct = LANGUAGE_RULES.subclassShare * 100;
  return table(
    ["Profile", `Linguagens ≥${relevantPct}%`, `Linguagens ≥${subclassPct}%`, "Classe", "Subclasse", "Títulos de combinação"],
    ["l", "r", "r", "l", "l", "r"],
    entries.map(({ username, profile, character: c }) => {
      const shares = languageShares(profile);
      const combos = c.titles.filter((t) => t.kind === "combination");
      return [
        username,
        shares.filter((s) => s >= LANGUAGE_RULES.relevantShare).length,
        shares.filter((s) => s >= LANGUAGE_RULES.subclassShare).length,
        c.archetype.className,
        c.archetype.subclassName ?? "—",
        `${combos.filter((t) => t.unlocked).length}/${combos.length}`,
      ];
    })
  );
}

function lockedCombinationList(entry: Entry): string {
  return entry.character.titles
    .filter((t) => t.kind === "combination" && !t.unlocked)
    .map((t) => `- **${t.name}** (${t.description})`)
    .join("\n");
}

// --- Section 8: level progression --------------------------------------------------------------

function levelProgressTable(entries: Entry[]): string {
  return table(
    ["Profile", "Level", "XP total", "Threshold atual", "Threshold próximo", "XP restante", "Progresso"],
    ["l", "r", "r", "r", "r", "r", "r"],
    entries.map(({ username, character: { progression: p } }) =>
      p.nextLevel === null
        ? [username, p.level, n(p.totalXp), n(p.currentLevelXp), "MAX LEVEL", "—", "MAX LEVEL"]
        : [username, p.level, n(p.totalXp), n(p.currentLevelXp), n(p.nextLevelXp), n(p.xpRemaining), `${p.progressPercent}%`]
    )
  );
}

/** Smallest progression score whose XP reaches `level`, by bisection on the engine's own curve. */
function minimumScoreForLevel(level: number): number {
  const target = xpThresholdForLevel(level);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (xpFromProgressionScore(mid) >= target) high = mid;
    else low = mid;
  }
  return high;
}

const SCALE_LEVELS = [2, 5, 6, 10, 16, 20, 31, 40, 51, 60, 71, 80, 90, 99] as const;

function scoreScaleTable(): string {
  return table(
    ["Level", "XP necessário", "Score mínimo", "% dos pontos possíveis"],
    ["r", "r", "r", "r"],
    SCALE_LEVELS.map((level) => {
      const score = minimumScoreForLevel(level);
      return [level, n(xpThresholdForLevel(level)), score.toFixed(3), `${(score * 100).toFixed(1)}%`];
    })
  );
}

function levelSummary(entries: Entry[]): string {
  const levels = entries.map((e) => ({ name: e.username, level: e.character.progression.level }));
  const above90 = levels.filter((l) => l.level >= 90);
  const atMax = levels.filter((l) => l.level === LEVEL_MAX);
  const top = levels.filter((l) => l.name !== "extreme-dev").reduce((a, b) => (b.level > a.level ? b : a));
  const list = (items: typeof levels) => (items.length ? ` (${items.map((l) => `${l.name} ${l.level}`).join(", ")})` : "");
  return [
    `- Perfis com Level ≥ 90: **${above90.length}** de ${levels.length}${list(above90)}.`,
    `- Perfis no Level ${LEVEL_MAX}: **${atMax.length}**${list(atMax)}.`,
    `- Maior Level sem contar o extreme-dev: **${top.name} (${top.level})**.`,
  ].join("\n");
}

// --- Section 9: synthetic probes (internal; not personas, not registered anywhere) -----------------

type Counters = Partial<{
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
  ownRepositories: number;
  starsReceived: number;
  forksReceived: number;
  followers: number;
}>;

const full = (value: number): Metric => ({ value, coverage: "full" });

/** A profile with some counters overridden. Only progression (Level/XP) is read from these probes. */
function withCounters(base: DeveloperProfile, counters: Counters): DeveloperProfile {
  const overrides = Object.fromEntries(Object.entries(counters).map(([key, value]) => [key, full(value)]));
  return { ...base, ...overrides };
}

const probe = (base: DeveloperProfile, counters: Counters) => createRPGCharacter(withCounters(base, counters)).progression;

const LADDER_COMMITS = [1, 10, 50, 100, 500, 1_000, 5_000, 10_000] as const;

/** Ratios of polyglot-dev (140 PRs, 60 reviews, 55 issues, 31 repos per 2,300 commits), rounded. */
function proportionalCounters(commits: number): Counters {
  return {
    commits,
    pullRequests: Math.round(commits * 0.06),
    reviews: Math.round(commits * 0.026),
    issues: Math.round(commits * 0.024),
    ownRepositories: Math.round(commits * 0.013),
  };
}

function commitLadderTable(base: DeveloperProfile): string {
  return table(
    ["Commits", "Level só com commits", "Level do perfil proporcional", "PRs / reviews / issues / repos do proporcional"],
    ["r", "r", "r", "l"],
    LADDER_COMMITS.map((commits) => {
      const proportional = proportionalCounters(commits);
      return [
        n(commits),
        probe(base, { commits }).level,
        probe(base, proportional).level,
        `${proportional.pullRequests} / ${proportional.reviews} / ${proportional.issues} / ${proportional.ownRepositories}`,
      ];
    })
  );
}

const MINIMAL_PROBES: ReadonlyArray<{ label: string; counters: Counters }> = [
  { label: "1 commit", counters: { commits: 1 } },
  { label: "1 commit + 1 PR + 1 issue + 1 repo", counters: { commits: 1, ownRepositories: 1, pullRequests: 1, issues: 1 } },
  { label: "10 commits", counters: { commits: 10 } },
  { label: "10 commits + 1 PR + 1 issue + 1 repo", counters: { commits: 10, pullRequests: 1, issues: 1, ownRepositories: 1 } },
  { label: "42 commits + 1 PR + 1 issue + 2 repos + 3 stars (≈ rookie-dev)", counters: { commits: 42, pullRequests: 1, issues: 1, ownRepositories: 2, starsReceived: 3 } },
  { label: "100 commits + 5 PRs + 2 reviews + 3 issues + 3 repos", counters: { commits: 100, pullRequests: 5, reviews: 2, issues: 3, ownRepositories: 3 } },
];

function minimalProbesTable(base: DeveloperProfile): string {
  return table(
    ["Perfil mínimo", "Level", "XP"],
    ["l", "r", "r"],
    MINIMAL_PROBES.map(({ label, counters }) => {
      const p = probe(base, counters);
      return [label, p.level, n(p.totalXp)];
    })
  );
}

const ISOLATED_CEILINGS: ReadonlyArray<{ label: string; counters: Counters }> = [
  { label: "Commits: 10.000", counters: { commits: 10_000 } },
  { label: "Commits: 150.000", counters: { commits: 150_000 } },
  { label: "PRs: 1.000", counters: { pullRequests: 1_000 } },
  { label: "Reviews: 1.000", counters: { reviews: 1_000 } },
  { label: "Issues: 1.000", counters: { issues: 1_000 } },
  { label: "Repos: 200", counters: { ownRepositories: 200 } },
  { label: "Repos: 1.200", counters: { ownRepositories: 1_200 } },
  { label: "Stars 5.000 + forks 1.000", counters: { starsReceived: 5_000, forksReceived: 1_000 } },
  { label: "Stars 150.000 + forks 25.000", counters: { starsReceived: 150_000, forksReceived: 25_000 } },
  { label: "Followers: 120.000", counters: { followers: 120_000 } },
];

function isolatedCeilingsTable(base: DeveloperProfile): string {
  return table(
    ["Termo isolado (todo o resto em 0)", "Level"],
    ["l", "r"],
    ISOLATED_CEILINGS.map(({ label, counters }) => [label, probe(base, counters).level])
  );
}

// --- Section 10: monthly distribution of the profiles -------------------------------------------

function monthlyTable(entries: Entry[]): string {
  return table(
    ["Profile", "Meses", "Meses ativos", "Menor mês ativo", "Maior mês ativo", "Distribuição"],
    ["l", "r", "r", "r", "r", "l"],
    entries.map(({ username, profile }) => {
      const months = profile.activity.monthlyContributions;
      const active = months.filter((m) => m > 0);
      const min = active.length ? Math.min(...active) : 0;
      const max = active.length ? Math.max(...active) : 0;
      const label =
        active.length === 0
          ? "sem atividade"
          : max - min > 1
            ? "irregular"
            : active.length === months.length
              ? "uniforme"
              : "uniforme nos meses ativos, com meses vazios";
      return [username, months.length, active.length, n(min), n(max), label];
    })
  );
}

// --- Section 11: invariants --------------------------------------------------------------------

interface Check {
  label: string;
  failures: string[];
}

/** Walks the whole character; JSON.stringify would hide NaN/Infinity as null. */
function allNumbersFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allNumbersFinite);
  if (value && typeof value === "object") return Object.values(value).every(allNumbersFinite);
  return true;
}

function invariantChecks(entries: Entry[]): Check[] {
  const failing = (predicate: (entry: Entry) => boolean) =>
    entries.filter((entry) => !predicate(entry)).map((entry) => entry.username);

  const stats = (e: Entry) => Object.values(e.character.stats);
  const extreme = entries.find((e) => e.username === "extreme-dev");

  return [
    {
      label: `Level entre 1 e ${LEVEL_MAX}`,
      failures: failing((e) => e.character.progression.level >= 1 && e.character.progression.level <= LEVEL_MAX),
    },
    {
      label: `XP entre 0 e ${n(MAX_XP)} (XP do Level ${LEVEL_MAX})`,
      failures: failing((e) => e.character.progression.totalXp >= 0 && e.character.progression.totalXp <= MAX_XP),
    },
    {
      label: "Atributos são inteiros entre 0 e 100",
      failures: failing((e) => stats(e).every((v) => Number.isInteger(v) && v >= 0 && v <= 100)),
    },
    {
      label: `Skills entre ${SKILL.levelMin} e ${SKILL.levelMax}`,
      failures: failing((e) => e.character.skills.every((s) => s.level >= SKILL.levelMin && s.level <= SKILL.levelMax)),
    },
    {
      label: "Nenhum valor NaN/Infinity no personagem",
      failures: failing((e) => allNumbersFinite(e.character)),
    },
    {
      label: "Determinismo (mesmo input, mesmo personagem)",
      failures: failing((e) => JSON.stringify(createRPGCharacter(e.profile)) === JSON.stringify(e.character)),
    },
    {
      label: "progressPercent entre 0 e 100",
      failures: failing(({ character: { progression: p } }) => p.progressPercent >= 0 && p.progressPercent <= 100),
    },
    {
      label: "XP restante nunca negativo",
      failures: failing(({ character: { progression: p } }) => p.xpRemaining >= 0),
    },
    {
      label: `Progressão coerente: XP dentro do Level; Level ${LEVEL_MAX} sem próximo Level, sem threshold inexistente e sem restante`,
      failures: failing(({ character: { progression: p } }) =>
        p.nextLevel === null
          ? p.level === LEVEL_MAX && p.xpRemaining === 0 && p.progressPercent === 100 && p.nextLevelXp === p.currentLevelXp
          : p.nextLevel === p.level + 1 &&
            p.nextLevelXp > p.currentLevelXp &&
            p.totalXp >= p.currentLevelXp &&
            p.totalXp < p.nextLevelXp &&
            p.xpRemaining === p.nextLevelXp - p.totalXp
      ),
    },
    {
      label: "empty-dev: Level 1, 0 XP, sem skills, sem erro",
      failures: entries.some(
        (e) => e.username === "empty-dev" && e.character.progression.level === 1 && e.character.progression.totalXp === 0 && e.character.skills.length === 0
      )
        ? []
        : ["empty-dev"],
    },
    {
      label: "extreme-dev: Level 99 = MAX LEVEL, XP = MAX_XP, sem overflow",
      failures:
        extreme &&
        extreme.character.progression.level === LEVEL_MAX &&
        extreme.character.progression.totalXp === MAX_XP &&
        extreme.character.progression.nextLevel === null
          ? []
          : ["extreme-dev"],
    },
    {
      label: "Forks fora das métricas (extreme-dev: 1.200 repos, 150.000 stars, 25.000 forks)",
      failures:
        extreme &&
        extreme.profile.ownRepositories.value === 1_200 &&
        extreme.profile.starsReceived.value === 150_000 &&
        extreme.profile.forksReceived.value === 25_000
          ? []
          : ["extreme-dev"],
    },
  ];
}

function checksSection(checks: Check[]): string {
  return table(
    ["Invariante", "Resultado"],
    ["l", "l"],
    checks.map((c) => [c.label, c.failures.length ? `**FALHOU**: ${c.failures.join(", ")}` : "OK"])
  );
}

// --- Snapshot (balance-snapshot.json) -------------------------------------------------------------

/**
 * Deterministic: only engine output for fixed inputs. No dates of generation, no ids.
 * Diff this file after a balance change to see exactly who moved.
 */
function buildSnapshot(entries: Entry[]) {
  return {
    engine: SNAPSHOT_ENGINE,
    referenceDate: entries[0]?.profile.referenceDate ?? null,
    profiles: Object.fromEntries(
      entries.map(({ username, character: c }) => [
        username,
        {
          level: c.progression.level,
          xp: c.progression.totalXp,
          tier: c.progression.tier,
          stats: {
            activity: c.stats.activity,
            experience: c.stats.experience,
            reputation: c.stats.reputation,
            versatility: c.stats.versatility,
            consistency: c.stats.consistency,
          },
          class: c.archetype.className,
          subclass: c.archetype.subclassName ?? null,
          achievementCount: c.achievements.filter((a) => a.unlocked).length,
          achievementsByRarity: Object.fromEntries(RARITIES.map((r) => [r.id, rarityCounts(c)[r.id].unlocked])),
          titleCount: c.titles.filter((t) => t.unlocked).length,
          defaultTitle: c.titles.find((t) => t.id === c.defaultTitleId)?.name ?? null,
          skills: c.skills.map((s) => ({ name: s.name, level: s.level })),
          hp: c.resources.maxHp,
          mp: c.resources.maxMp,
        },
      ])
    ),
  };
}

// --- Fixtures description -----------------------------------------------------------------

function fixturesSection(): string {
  return STRESS_USERNAMES.map((name) => `- **${name}** — ${STRESS_FIXTURES[name].purpose}`).join("\n");
}

function consistencyFixturesSection(): string {
  return CONSISTENCY_USERNAMES.map((name) => `- **${name}** — ${CONSISTENCY_FIXTURES[name].purpose}`).join("\n");
}

// --- Consistency probes -----------------------------------------------------------------------

/** Run-length summary of a monthly series, e.g. "24×25 · 74×0 · 8×50". */
function monthlyShape(months: readonly number[]): string {
  const runs: string[] = [];
  let i = 0;
  while (i < months.length) {
    let j = i;
    while (j < months.length && months[j] === months[i]) j++;
    runs.push(j - i === 1 ? `${months[i]}` : `${j - i}×${months[i]}`);
    i = j;
  }
  return runs.join(" · ");
}

function consistencyTable(entries: Entry[]): string {
  return table(
    [
      "Profile",
      "Consistency",
      "Meses (ativos/total)",
      "Contribuições",
      "Maior mês (% do total)",
      "Dias ativos",
      "Maior sequência",
      "Dias recentes",
      "Distribuição temporal (0–1)",
      "Forma mensal",
    ],
    ["l", "r", "r", "r", "r", "r", "r", "r", "r", "l"],
    entries.map(({ username, profile, character: c }) => {
      const months = profile.activity.monthlyContributions;
      const total = months.reduce((a, b) => a + b, 0);
      const peak = months.length ? Math.max(...months) : 0;
      return [
        username,
        c.stats.consistency,
        `${months.filter((m) => m > 0).length}/${months.length}`,
        n(total),
        total ? `${((peak / total) * 100).toFixed(0)}%` : "—",
        n(profile.activity.activeDays.value),
        n(profile.activity.longestStreakDays.value),
        n(profile.activity.recentActiveDays.value),
        temporalDistribution(months).toFixed(3),
        `\`${monthlyShape(months)}\``,
      ];
    })
  );
}

function consistencyVerdict(entries: Entry[]): string {
  const score = (name: string) => entries.find((e) => e.username === name)?.character.stats.consistency;
  const steady = score("steady-dev");
  const burst = score("burst-dev");
  if (steady === undefined || burst === undefined) return "- steady-dev × burst-dev: perfis ausentes.";
  return steady > burst
    ? `- **steady-dev (${steady}) > burst-dev (${burst})**: o mesmo volume distribuído ao longo do ano rende mais Consistency.`
    : `- **RED FLAG: steady-dev (${steady}) <= burst-dev (${burst})**: a fórmula não distingue regularidade de rajada.`;
}

// --- Assemble ------------------------------------------------------------------------------

async function main(): Promise<void> {
  const allEntries = await Promise.all(ALL_PROFILES.map(runPipeline));
  const consistencyEntries = allEntries.filter((e) => e.username in CONSISTENCY_FIXTURES);
  // The 14 profiles of the V1 review. The consistency probes only appear in their own section,
  // in the monthly table, in the invariants and in the snapshot.
  const entries = allEntries.filter((e) => !(e.username in CONSISTENCY_FIXTURES));
  const checks = invariantChecks(allEntries);
  const emptyEntry = entries.find((e) => e.username === "empty-dev");
  if (!emptyEntry) throw new Error("empty-dev is required as the base of the synthetic probes.");
  const baseProfile = emptyEntry.profile;

  const generated = `# BALANCE_REVIEW.md

> **Gerado por \`npm run balance:review\`** a partir do engine atual (\`scripts/generateBalanceReview.ts\`).
> Nenhum número daqui foi calculado à mão. Engine: **Balance V1.1** (baseline V1 preservado em \`balance-snapshot-v1.json\`; comparação em \`BALANCE_V1_VS_V1_1.md\`).
> A seção **Análise** (depois do marcador no fim do arquivo) é escrita à mão e preservada ao regerar.

Data de referência de todos os perfis: \`2026-10-01\` (fixa, sem relógio). Fixtures de stress: \`src/data/fixtures/balanceFixtures.ts\` (valores explícitos, sem seed).

## Perfis de stress

${fixturesSection()}

### Fixtures de Consistency (V1.1)

Valores explícitos mês a mês, sem PRNG, fora de RESERVED_PERSONAS. Aparecem só na seção "Consistency: rajada × regularidade", na tabela mensal, nas invariantes e no snapshot.

${consistencyFixturesSection()}

Os perfis existentes (rookie, veteran, polyglot, popular, empty) são os mesmos de \`src/data/personas\`; \`missing-dev\` é o 404 e não tem personagem.

## Entradas (o que cada perfil tem)

Valores depois de validação e normalização (forks já excluídos de repos/stars/forks/linguagens).

${inputsTable(entries)}

## Resultado principal

${mainTable(entries)}

## Skills (até ${SKILLS_PER_PROFILE} por perfil)

Formato: \`linguagem — LVL — tier (participação nos bytes / repos que a contêm)\`.

${skillsSection(entries)}

## De onde vem o XP

Cada coluna é a contribuição do termo para o progression score, em **pontos percentuais** (já multiplicada pelo peso). A soma é o Score; o XP vem de Score^${PROGRESSION_CURVE_EXPONENT} × ${n(MAX_XP)} (XP do Level ${LEVEL_MAX}). Os termos foram recompostos a partir das constantes do engine e conferidos contra \`calculateProgressionScore\`: se divergirem, o gerador falha.

${xpBreakdownTable(entries)}

## Conquistas, títulos e recursos

${progressionExtrasTable(entries)}

## Conquistas

Total desbloqueado / disponível, por raridade. As conquistas são cumulativas e não dão XP.

${achievementsSummaryTable(entries)}

Detalhe por perfil. Os próximos marcos seguem a regra do engine (\`selectNextMilestones\`: um por categoria, o mais próximo primeiro, idade excluída). "Faltam" só aparece com coverage \`full\`; com \`partial\` o engine só conhece um mínimo e não diz quanto falta.

${achievementsDetail(entries)}

## Títulos

Quantos títulos cada perfil desbloqueou, o título padrão, o título de combinação classe/subclasse e o próximo título quantitativo de cada categoria.

${titlesDetail(entries)}

### Subclasse e títulos de combinação

A subclasse exige que a linguagem tenha pelo menos ${LANGUAGE_RULES.subclassShare * 100}% do uso relevante (\`LANGUAGE_RULES.subclassShare\`) e que a classe seja diferente da principal. Os ${entries[0].character.titles.filter((t) => t.kind === "combination").length} títulos de combinação são fixos por par classe + subclasse.

${subclassTable(entries)}

Títulos de combinação bloqueados no extreme-dev (a distribuição mais versátil que as fixtures têm):

${lockedCombinationList(entries.find((e) => e.username === "extreme-dev") ?? entries[0])}

## Progressão de Level

Threshold = XP total para **alcançar** o Level. No Level ${LEVEL_MAX} não existe próximo Level: aparece MAX LEVEL, sem restante nem threshold.

${levelProgressTable(entries)}

${levelSummary(entries)}

### Score necessário por Level

O XP vem de Score^${PROGRESSION_CURVE_EXPONENT} × ${n(MAX_XP)}. Esta tabela inverte a curva do engine: o menor progression score que alcança cada Level. O Score é a soma dos termos ponderados da seção "De onde vem o XP" (máximo 1,000 = todos os termos nas referências).

${scoreScaleTable()}

### Velocidade da curva: perfis sintéticos

Perfis sintéticos apenas para esta análise (não são personas nem fixtures registradas; só o Level/XP deles é lido). "Só commits" deixa todo o resto em 0. "Proporcional" usa as razões do polyglot-dev, arredondadas: 6% de PRs, 2,6% de reviews, 2,4% de issues e 1,3% de repos por commit.

${commitLadderTable(baseProfile)}

Perfis mínimos, poucas ações espalhadas entre categorias:

${minimalProbesTable(baseProfile)}

### Tetos isolados

Um único termo no valor indicado, todo o resto em 0.

${isolatedCeilingsTable(baseProfile)}

## Distribuição mensal das fixtures

"Uniforme" = todos os meses ativos têm a mesma quantidade (diferença de no máximo 1). Nesses perfis o único sinal que a fórmula de Consistency enxerga é a proporção de meses ativos; perfis totalmente uniformes não servem para avaliar a parte de distribuição (evenness).

${monthlyTable(allEntries)}

## Consistency: rajada × regularidade

Os quatro perfis dedicados a testar a fórmula de Consistency (que **não** foi alterada na V1.1). Burst, steady e weekend têm o mesmo volume (540 contribuições, conta de 12 meses); o que muda é como ele se distribui no tempo.

${consistencyTable(consistencyEntries)}

${consistencyVerdict(consistencyEntries)}

## Invariantes

${checksSection(checks)}

${ANALYSIS_MARKER}
`;

  let analysis = "";
  if (existsSync(OUTPUT)) {
    const previous = readFileSync(OUTPUT, "utf8");
    const at = previous.indexOf(ANALYSIS_MARKER);
    if (at >= 0) analysis = previous.slice(at + ANALYSIS_MARKER.length).replace(/^\r?\n/, "");
  }

  writeFileSync(OUTPUT, generated + analysis, "utf8");
  writeFileSync(SNAPSHOT_OUTPUT, `${JSON.stringify(buildSnapshot(allEntries), null, 2)}
`, "utf8");

  const failed = checks.filter((c) => c.failures.length);
  console.log(`BALANCE_REVIEW.md e balance-snapshot.json gerados: ${allEntries.length} perfis, ${checks.length - failed.length}/${checks.length} invariantes OK.`);
  if (failed.length) {
    for (const c of failed) console.error(`FALHOU: ${c.label} -> ${c.failures.join(", ")}`);
    process.exitCode = 1;
  }
}

void main();
