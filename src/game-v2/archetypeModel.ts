import { calculateAccountAge } from "@/game/age";
import { calculateStats } from "@/game/attributes/calculateAttributes";
import { analyzeLanguages } from "@/game/languages";
import type { DeveloperProfile } from "@/game/types";
import { ARCHETYPE_ORDER, V2_BALANCE } from "./constants";
import type { PracticeArchetype, TechnologyAffinity } from "./types";

export interface ArchetypeTechnologyView {
  id: string;
  family: string;
  score: number | null;
  evidenceRepoCount: number;
}

interface SignalDefinition {
  specificity: number;
  generic?: boolean;
  role: string;
}

export const ARCHETYPE_SIGNAL_SPECIFICITY: Readonly<Record<PracticeArchetype, Readonly<Record<string, SignalDefinition>>>> = {
  architect: {
    nextjs: { specificity: .55, generic: true, role: "meta" }, nuxt: { specificity: .65, role: "meta" }, sveltekit: { specificity: .65, role: "meta" },
    astro: { specificity: .50, generic: true, role: "meta" }, remix: { specificity: .70, role: "meta" },
    express: { specificity: .45, generic: true, role: "backend" }, nestjs: { specificity: .85, role: "backend" }, fastify: { specificity: .70, role: "backend" },
    django: { specificity: .75, role: "backend" }, flask: { specificity: .50, generic: true, role: "backend" }, fastapi: { specificity: .70, role: "backend" },
    laravel: { specificity: .75, role: "backend" }, rails: { specificity: .75, role: "backend" }, spring: { specificity: .85, role: "backend" }, "aspnet-core": { specificity: .85, role: "backend" },
  },
  artificer: {
    vite: { specificity: .50, generic: true, role: "build" }, webpack: { specificity: .65, role: "build" }, rollup: { specificity: .90, role: "build" }, esbuild: { specificity: .95, role: "build" },
    electron: { specificity: .90, role: "desktop" }, tauri: { specificity: .95, role: "desktop" },
    pnpm: { specificity: .25, generic: true, role: "toolchain" }, yarn: { specificity: .20, generic: true, role: "toolchain" },
    eslint: { specificity: .20, generic: true, role: "toolchain" }, prettier: { specificity: .18, generic: true, role: "toolchain" },
  },
  illusionist: {
    react: { specificity: .45, generic: true, role: "ui" }, vue: { specificity: .65, role: "ui" }, svelte: { specificity: .75, role: "ui" }, angular: { specificity: .65, role: "ui" },
    "react-native": { specificity: .70, role: "ui" }, expo: { specificity: .65, role: "ui" }, flutter: { specificity: .80, role: "ui" },
    tailwind: { specificity: .45, generic: true, role: "visual" }, "material-ui": { specificity: .75, role: "visual" }, "chakra-ui": { specificity: .80, role: "visual" }, "shadcn-ui": { specificity: .70, role: "visual" },
    storybook: { specificity: .85, role: "visual" }, playwright: { specificity: .25, generic: true, role: "interaction" }, cypress: { specificity: .30, generic: true, role: "interaction" },
  },
  guardian: {
    playwright: { specificity: .75, role: "testing" }, vitest: { specificity: .45, generic: true, role: "testing" }, jest: { specificity: .45, generic: true, role: "testing" },
    cypress: { specificity: .70, role: "testing" }, storybook: { specificity: .20, generic: true, role: "testing" },
  },
  chronomancer: {
    "github-actions": { specificity: .45, generic: true, role: "pipeline" }, docker: { specificity: .70, role: "delivery" }, terraform: { specificity: 1, role: "infra" },
  },
};

export interface ArchetypeModelItem {
  archetype: PracticeArchetype;
  score: number | null;
  primary: number | null;
  components: Record<string, number | null>;
  signalIds: string[];
}

function clamp(value: number): number { return Math.max(0, Math.min(100, value)); }

function signalPattern(archetype: PracticeArchetype, technologies: readonly ArchetypeTechnologyView[], collaboration: number | null): { score: number; signalIds: string[] } {
  const definitions = ARCHETYPE_SIGNAL_SPECIFICITY[archetype];
  const signals = technologies.flatMap((technology) => {
    const definition = definitions[technology.id];
    if (!definition || technology.score === null || technology.evidenceRepoCount === 0) return [];
    const raw = technology.score * definition.specificity;
    return [{ id: technology.id, role: definition.role, value: definition.generic ? Math.min(V2_BALANCE.genericSignalCap, raw) : raw }];
  }).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id, "en"));
  const [first, second, third] = signals;
  let score = (first?.value ?? 0) + .30 * (second?.value ?? 0) + .15 * (third?.value ?? 0);
  const roles = new Set(signals.map((signal) => signal.role));
  if (archetype === "architect") {
    if (roles.has("meta") && roles.has("backend")) score += 18;
    if (signals.length >= 3) score += 6;
  } else if (archetype === "artificer") {
    if (signals.filter((signal) => signal.value > V2_BALANCE.genericSignalCap).length >= 2) score += 15;
    if (roles.has("build") && (roles.has("desktop") || roles.has("toolchain"))) score += 8;
  } else if (archetype === "illusionist") {
    if (roles.has("ui") && roles.has("visual")) score += 18;
    if (signals.filter((signal) => signal.role === "ui").length >= 2) score += 6;
    if (signals.some((signal) => signal.id === "storybook") && roles.has("ui")) score += 6;
  } else if (archetype === "guardian") {
    if (signals.length >= 2) score += 15;
    if (signals.length >= 2 && (collaboration ?? 0) >= 50) score += 8;
  } else {
    if (roles.has("pipeline") && (roles.has("delivery") || roles.has("infra"))) score += 18;
    if (roles.has("delivery") && roles.has("infra")) score += 10;
    if (signals.length >= 3) score += 6;
  }
  return { score: clamp(score), signalIds: signals.map((signal) => signal.id) };
}

export function calculateArchetypeModel(profile: DeveloperProfile, schools: readonly ArchetypeTechnologyView[], artifacts: readonly ArchetypeTechnologyView[], collaborationOverride?: number | null): ArchetypeModelItem[] {
  const unavailable = [...schools, ...artifacts].every((item) => item.score === null);
  if (unavailable) return ARCHETYPE_ORDER.map((archetype) => ({ archetype, score: null, primary: null, components: {}, signalIds: [] }));
  const stats = calculateStats(profile, analyzeLanguages(profile.languages), calculateAccountAge(profile.accountCreatedAt, profile.referenceDate));
  const maturity = stats.experience;
  const collaboration = collaborationOverride !== undefined ? collaborationOverride : profile.reviews.coverage === "unavailable" ? null : clamp(profile.reviews.value / 2);
  const technologies = [...schools, ...artifacts];
  const patterns = Object.fromEntries(ARCHETYPE_ORDER.map((archetype) => [archetype, signalPattern(archetype, technologies, collaboration)])) as Record<PracticeArchetype, { score: number; signalIds: string[] }>;
  const components = { structural: patterns.architect.score, craft: patterns.artificer.score, visual: patterns.illusionist.score, quality: patterns.guardian.score, automation: patterns.chronomancer.score, collaboration, maturity, consistency: stats.consistency, versatility: stats.versatility };
  const scores: Record<PracticeArchetype, number | null> = {
    architect: clamp(.78 * components.structural + .08 * maturity + .07 * stats.versatility + .04 * components.quality + .03 * components.automation),
    artificer: clamp(.80 * components.craft + .08 * maturity + .07 * stats.versatility + .05 * components.automation),
    illusionist: clamp(.80 * components.visual + .06 * maturity + .06 * stats.versatility + .05 * components.structural + .03 * components.quality),
    guardian: collaboration === null ? null : clamp(.75 * components.quality + .10 * collaboration + .07 * stats.consistency + .03 * maturity + .05 * components.automation),
    chronomancer: clamp(.80 * components.automation + .07 * stats.consistency + .05 * components.craft + .04 * maturity + .04 * stats.versatility),
  };
  return ARCHETYPE_ORDER.map((archetype) => ({ archetype, score: scores[archetype], primary: patterns[archetype].score, components: { ...components }, signalIds: patterns[archetype].signalIds }));
}

export function affinityView(item: TechnologyAffinity): ArchetypeTechnologyView {
  return { id: item.id, family: item.family, score: item.score, evidenceRepoCount: item.evidenceRepoCount };
}
