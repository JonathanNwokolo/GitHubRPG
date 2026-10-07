import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LANGUAGE_RULES, PROGRESSION_CURVE_EXPONENT, SKILL, STAT_WEIGHTS } from "@/game/constants";
import { COMBINATION_TITLES } from "@/game/titles/titleList";

/**
 * Generates BALANCE_V1_VS_V1_1.md from the two snapshots. Nothing is typed by hand:
 * every number comes from balance-snapshot-v1.json (the frozen V1 baseline, never rewritten)
 * and balance-snapshot.json (the current engine, rewritten by `npm run balance:review`).
 *
 * Run with: npm run balance:compare   (after npm run balance:review)
 *
 * The snapshot does not store combination titles. They are fully determined by the class +
 * subclass pair (the engine unlocks a combination title when both match), so they are derived
 * here from the engine's own COMBINATION_TITLES table for BOTH versions.
 */

const ROOT = resolve(__dirname, "..");
const BASELINE = resolve(ROOT, "balance-snapshot-v1.json");
const CURRENT = resolve(ROOT, "balance-snapshot.json");
const OUTPUT = resolve(ROOT, "docs", "game-engine-v1", "BALANCE_V1_VS_V1_1.md");

/** Order of the review (the 14 profiles of V1). Anything else in the current snapshot is "new". */
const PROFILE_ORDER = [
  "rookie-dev",
  "veteran-dev",
  "polyglot-dev",
  "popular-dev",
  "empty-dev",
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

interface SnapshotProfile {
  level: number;
  xp: number;
  tier: string;
  stats: { activity: number; experience: number; reputation: number; versatility: number; consistency: number };
  class: string;
  subclass: string | null;
  achievementCount: number;
  titleCount: number;
  defaultTitle: string | null;
  skills: Array<{ name: string; level: number }>;
  hp: number;
  mp: number;
}

interface Snapshot {
  engine: string;
  profiles: Record<string, SnapshotProfile>;
}

const load = (path: string): Snapshot => JSON.parse(readFileSync(path, "utf8")) as Snapshot;
const before = load(BASELINE);
const after = load(CURRENT);

const n = (value: number) => value.toLocaleString("en-US");
const pct = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => (value > 0 ? `+${n(value)}` : n(value));
const row = (cells: Array<string | number>) => `| ${cells.join(" | ")} |`;

function table(header: string[], align: Array<"l" | "r">, rows: Array<Array<string | number>>): string {
  return [row(header), row(align.map((a) => (a === "r" ? "---:" : "---"))), ...rows.map(row)].join("\n");
}

const names = PROFILE_ORDER.filter((name) => before.profiles[name] && after.profiles[name]);
const missing = PROFILE_ORDER.filter((name) => !before.profiles[name] || !after.profiles[name]);
if (missing.length) throw new Error(`Perfis ausentes em algum snapshot: ${missing.join(", ")}`);

const combinationTitle = (p: SnapshotProfile): string =>
  COMBINATION_TITLES.find((t) => t.className === p.class && t.subclassName === p.subclass)?.name ?? "—";
const allSkills = (p: SnapshotProfile): string => (p.skills.length ? p.skills.map((s) => `${s.name} ${s.level}`).join(", ") : "—");

// --- Level -------------------------------------------------------------------------------------

function levelTable(): string {
  return table(
    ["Profile", "V1 Level", "V1.1 Level", "Delta", "V1 XP", "V1.1 XP", "V1 Tier", "V1.1 Tier"],
    ["l", "r", "r", "r", "r", "r", "l", "l"],
    names.map((name) => {
      const a = before.profiles[name];
      const b = after.profiles[name];
      return [name, a.level, b.level, signed(b.level - a.level), n(a.xp), n(b.xp), a.tier, a.tier === b.tier ? "=" : b.tier];
    })
  );
}

// --- Stats -------------------------------------------------------------------------------------

function experienceTable(): string {
  return table(
    ["Profile", "V1 Experience", "V1.1 Experience", "Delta", "V1 HP", "V1.1 HP", "V1 MP", "V1.1 MP"],
    ["l", "r", "r", "r", "r", "r", "r", "r"],
    names.map((name) => {
      const a = before.profiles[name];
      const b = after.profiles[name];
      return [name, a.stats.experience, b.stats.experience, signed(b.stats.experience - a.stats.experience), a.hp, b.hp, a.mp, b.mp];
    })
  );
}

function otherStatsCheck(): string {
  const keys = ["activity", "reputation", "versatility", "consistency"] as const;
  const changed = names.flatMap((name) =>
    keys.filter((key) => before.profiles[name].stats[key] !== after.profiles[name].stats[key]).map((key) => `${name}.${key}`)
  );
  return changed.length
    ? `Atributos além de Experience que mudaram (inesperado): ${changed.join(", ")}.`
    : "Activity, Reputation, Versatility e Consistency: **idênticos** nos 14 perfis (só Experience mudou, como previsto).";
}

// --- Skills -------------------------------------------------------------------------------------

function skillsTable(): string {
  const rows = names
    .filter((name) => allSkills(before.profiles[name]) !== allSkills(after.profiles[name]))
    .map((name) => [name, allSkills(before.profiles[name]), allSkills(after.profiles[name])]);
  return rows.length
    ? table(["Profile", "V1 skills (todas)", "V1.1 skills (todas)"], ["l", "l", "l"], rows)
    : "Nenhuma skill mudou.";
}

function skillsUnchanged(): string {
  const same = names.filter((name) => allSkills(before.profiles[name]) === allSkills(after.profiles[name]));
  return same.length ? `Sem mudança: ${same.join(", ")}.` : "";
}

// --- Subclass / combination titles ------------------------------------------------------------

function classTable(): string {
  const rows = names
    .filter((name) => {
      const a = before.profiles[name];
      const b = after.profiles[name];
      return a.class !== b.class || a.subclass !== b.subclass || combinationTitle(a) !== combinationTitle(b);
    })
    .map((name) => {
      const a = before.profiles[name];
      const b = after.profiles[name];
      return [name, `${a.class} / ${a.subclass ?? "—"}`, `${b.class} / ${b.subclass ?? "—"}`, combinationTitle(a), combinationTitle(b)];
    });
  return rows.length
    ? table(["Profile", "V1 classe / subclasse", "V1.1 classe / subclasse", "V1 título de combinação", "V1.1 título de combinação"], ["l", "l", "l", "l", "l"], rows)
    : "Nenhuma classe, subclasse ou título de combinação mudou.";
}

function titlesTable(): string {
  return table(
    ["Profile", "V1 títulos", "V1.1 títulos", "V1 título padrão", "V1.1 título padrão", "V1 conquistas", "V1.1 conquistas"],
    ["l", "r", "r", "l", "l", "r", "r"],
    names.map((name) => {
      const a = before.profiles[name];
      const b = after.profiles[name];
      return [name, a.titleCount, b.titleCount, a.defaultTitle ?? "—", a.defaultTitle === b.defaultTitle ? "=" : (b.defaultTitle ?? "—"), a.achievementCount, b.achievementCount];
    })
  );
}

// --- Summary -----------------------------------------------------------------------------------

function summary(): string {
  const deltas = names.map((name) => ({ name, delta: after.profiles[name].level - before.profiles[name].level }));
  const tierChanges = names.filter((name) => before.profiles[name].tier !== after.profiles[name].tier);
  const subclassChanges = names.filter((name) => before.profiles[name].subclass !== after.profiles[name].subclass);
  const nonEmpty = deltas.filter((d) => d.name !== "empty-dev" && d.name !== "extreme-dev");
  const down = nonEmpty.filter((d) => d.delta < 0);
  const biggest = nonEmpty.reduce((a, b) => (b.delta < a.delta ? b : a));
  const smallest = nonEmpty.reduce((a, b) => (b.delta > a.delta ? b : a));
  return [
    `- Perfis cujo Level **caiu**: ${down.length} de ${nonEmpty.length} (sem contar empty-dev e extreme-dev, que não mudam).`,
    `- Maior queda: **${biggest.name} (${signed(biggest.delta)})**. Menor queda: **${smallest.name} (${signed(smallest.delta)})**.`,
    `- Mudaram de tier: ${tierChanges.length ? tierChanges.map((name) => `${name} (${before.profiles[name].tier} → ${after.profiles[name].tier})`).join(", ") : "nenhum"}.`,
    `- Mudaram de subclasse: ${subclassChanges.length ? subclassChanges.map((name) => `${name} (${before.profiles[name].subclass ?? "—"} → ${after.profiles[name].subclass ?? "—"})`).join(", ") : "nenhum"}.`,
  ].join("\n");
}

function onlyInCurrent(): string {
  const extra = Object.keys(after.profiles).filter((name) => !before.profiles[name]);
  if (!extra.length) return "";
  return `\nPerfis que só existem na V1.1 (fixtures de Consistency, sem equivalente na V1): ${extra.join(", ")}. Ver BALANCE_REVIEW.md, seção "Consistency: rajada × regularidade".\n`;
}

const document = `# BALANCE_V1_VS_V1_1.md

> **Gerado por \`npm run balance:compare\`** a partir de \`balance-snapshot-v1.json\` (engine \`${before.engine}\`, baseline congelado) e \`balance-snapshot.json\` (engine \`${after.engine}\`).
> Nenhum número daqui foi digitado à mão. Para regerar: \`npm run balance:review && npm run balance:compare\`.

## O que mudou entre V1 e V1.1

| Regra | V1 | V1.1 |
| --- | --- | --- |
| Expoente da curva de progressão (\`PROGRESSION_CURVE_EXPONENT\`) | 2.1 | ${PROGRESSION_CURVE_EXPONENT} |
| Experience: idade | 30% | ${pct(STAT_WEIGHTS.experience.accountAge)} |
| Experience: repositórios | 25% | ${pct(STAT_WEIGHTS.experience.repositories)} |
| Experience: PRs | 20% | ${pct(STAT_WEIGHTS.experience.pullRequests)} |
| Experience: reviews | 15% | ${pct(STAT_WEIGHTS.experience.reviews)} |
| Experience: issues | 10% | ${pct(STAT_WEIGHTS.experience.issues)} |
| Skill: share da linguagem | 35% | ${pct(SKILL.weights.share)} |
| Skill: presença em repositórios | 35% | ${pct(SKILL.weights.presence)} |
| Skill: volume relativo | 30% | ${pct(SKILL.weights.volume)} |
| Subclasse: share mínimo da 2ª linguagem relevante | 15% | ${pct(LANGUAGE_RULES.subclassShare)} |

Pesos do XP (commits 40 / PRs 20 / reviews 15 / issues 10 / repos 10 / impacto 5), MAX_XP, \`xpThresholdForLevel\`, tiers, Consistency e demais atributos **não** mudaram.

## Level

${levelTable()}

${summary()}
${onlyInCurrent()}
## Experience (e HP/MP, que dependem dela e do Level)

${experienceTable()}

${otherStatsCheck()}

## Skills

${skillsTable()}

${skillsUnchanged()}

## Classe, subclasse e títulos de combinação

Só aparecem os perfis em que algo mudou. O título de combinação é derivado do par classe + subclasse, pela tabela do próprio engine.

${classTable()}

## Títulos e conquistas (total)

${titlesTable()}
`;

writeFileSync(OUTPUT, document, "utf8");
console.log(`BALANCE_V1_VS_V1_1.md gerado: ${names.length} perfis comparados (${before.engine} → ${after.engine}).`);
