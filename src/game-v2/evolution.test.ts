import { describe, expect, it } from "vitest";
import type { DeveloperProfile } from "@/game/types";
import { decideEvolution, diagnoseEvolutionRules, EVOLUTION_CATALOG, type EvolutionContext } from "./decisions";
import { createRPGCharacterV2 } from "./engine";
import { GOLDEN_FIXTURES, makeV2Profile } from "./fixtures";
import type { ConfidenceLevel, CoverageState, EvolutionId, FrameworkAffinity, PracticeArchetype, SubclassDecision, ToolAffinity } from "./types";

const uncertainty = { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: 0, omittedManifests: 0 };
const full = (value: number) => ({ value, coverage: "full" as const });

function subclass(value: PracticeArchetype, score: number, confidence: ConfidenceLevel = "high", coverage: CoverageState = "full"): SubclassDecision {
  return { value, status: "strong", score, observedScore: score, lowerBound: score, upperBound: score, runnerUpUpperBound: 0, guaranteedMargin: score, safeWinner: true, uncertainty, boundReason: "fixture", confidence, coverage, evidence: [], alternatives: [], rulesApplied: [], reasonCode: "fixture", reason: { pt: "fixture", en: "fixture" }, rulesVersion: "game-engine-v2-experimental" };
}

function affinity(kind: "school" | "artifact", id: string, family: string, score: number, repos: number, sourceKind: "config" | "directDependency" = "directDependency"): FrameworkAffinity | ToolAffinity {
  return { id, name: id, kind, family, score, confidence: repos >= 5 ? "high" : "medium", coverage: "full", evidenceRepoCount: repos, eligibleRepoCount: 12, examinedRepoCount: 12, lastEvidenceAt: "2025-06-01", evidence: Array.from({ length: repos }, (_, index) => ({ repoId: `${id}-${index}`, repoName: `${id}-${index}`, itemId: id, itemKind: kind, sourcePath: sourceKind === "config" ? `${id}.config` : "package.json", sourceKind, strength: sourceKind === "config" ? 55 : 100, observedAt: "2025-06-01", detectorVersion: "fixture", direct: true })), warnings: [] } as FrameworkAffinity | ToolAffinity;
}

const school = (id: string, family: string, score = 72, repos = 6) => affinity("school", id, family, score, repos) as FrameworkAffinity;
const artifact = (id: string, family: string, repos = 6, sourceKind: "config" | "directDependency" = "directDependency") => affinity("artifact", id, family, 68, repos, sourceKind) as ToolAffinity;

interface Fixture { id: EvolutionId; context: EvolutionContext; principalSignal: (context: EvolutionContext) => EvolutionContext }

function profileWithFiveLanguages(): DeveloperProfile {
  return makeV2Profile({ languages: ["TypeScript", "CSS", "HTML", "Dart", "Python"].map((name) => ({ name, bytes: 200_000, repoCount: 6 })) });
}

function fixtures(): Fixture[] {
  const architectProfile = makeV2Profile({ ownRepositories: full(45), pullRequests: full(320), reviews: full(350), issues: full(240) });
  return [
    { id: "evo-archmage", context: { profile: makeV2Profile(), className: "Mago", subclass: subclass("architect", 79), schools: [school("nextjs", "meta-web"), school("nestjs", "backend")], artifacts: [] }, principalSignal: (context) => ({ ...context, schools: context.schools.slice(0, 1) }) },
    { id: "evo-celestial-guardian", context: { profile: makeV2Profile({ reviews: full(260) }), className: "Mago", subclass: subclass("guardian", 81), schools: [], artifacts: [artifact("vitest", "testing", 3), artifact("playwright", "testing", 3)] }, principalSignal: (context) => ({ ...context, artifacts: [] }) },
    { id: "evo-rune-master", context: { profile: makeV2Profile({ languages: [{ name: "Rust", bytes: 800_000, repoCount: 5 }, { name: "C", bytes: 200_000, repoCount: 2 }] }), className: "Guerreiro", subclass: subclass("artificer", 79), schools: [], artifacts: [artifact("vite", "build", 4), artifact("rollup", "build", 4), artifact("electron", "desktop", 3)] }, principalSignal: (context) => ({ ...context, artifacts: context.artifacts.slice(0, 2) }) },
    { id: "evo-arcane-weaver", context: { profile: profileWithFiveLanguages(), className: "Mago", subclass: subclass("illusionist", 79), schools: [school("react", "ui-web", 72, 6)], artifacts: [artifact("storybook", "visual", 4)] }, principalSignal: (context) => ({ ...context, schools: context.schools.map((item) => ({ ...item, score: 59 })) }) },
    { id: "evo-ancestral-forger", context: { profile: makeV2Profile(), className: "Mago", subclass: subclass("artificer", 76), schools: [], artifacts: [artifact("vite", "build", 4), artifact("rollup", "build", 4), artifact("electron", "desktop", 3), artifact("eslint", "toolchain", 5)] }, principalSignal: (context) => ({ ...context, artifacts: context.artifacts.slice(0, 3) }) },
    { id: "evo-high-chronomancer", context: { profile: makeV2Profile({ languages: [{ name: "Shell", bytes: 700_000, repoCount: 7 }, { name: "Go", bytes: 300_000, repoCount: 3 }] }), className: "Patrulheiro", subclass: subclass("chronomancer", 82, "medium"), schools: [], artifacts: [artifact("github-actions", "infra", 4, "config"), artifact("docker", "infra", 4, "config"), artifact("terraform", "infra", 2, "config")] }, principalSignal: (context) => ({ ...context, artifacts: context.artifacts.filter((item) => item.id !== "github-actions") }) },
    { id: "evo-celestial-architect", context: { profile: architectProfile, className: "Mago", subclass: subclass("architect", 83), schools: [school("react", "ui-web", 70, 4), school("nestjs", "backend", 72, 4)], artifacts: [] }, principalSignal: (context) => ({ ...context, schools: context.schools.map((item) => item.family === "backend" ? { ...item, score: 59 } : item) }) },
  ];
}

function withWrongSubclass(context: EvolutionContext): EvolutionContext {
  return { ...context, subclass: subclass(context.subclass.value === "guardian" ? "artificer" : "guardian", 90) };
}

describe("Evolution V2 catalog and reachability", () => {
  it("contains exactly seven localized, unique and title-independent definitions", () => {
    expect(EVOLUTION_CATALOG).toHaveLength(7);
    expect(new Set(EVOLUTION_CATALOG.map((item) => item.id)).size).toBe(7);
    expect(EVOLUTION_CATALOG.every((item) => item.name.pt.length > 0 && item.name.en.length > 0)).toBe(true);
    expect(EVOLUTION_CATALOG.every((item) => item.rarity === "legendary" || item.rarity === "mythic")).toBe(true);
    expect(EVOLUTION_CATALOG.some((item) => "equippedTitleId" in item)).toBe(false);
  });

  for (const fixture of fixtures()) it(`${fixture.id} has a realistic positive and negative-by-one-gate fixture`, () => {
    const positive = decideEvolution(fixture.context);
    expect(positive.value).toBe(fixture.id);
    const nearMiss = fixture.principalSignal(fixture.context);
    expect(decideEvolution(nearMiss).value).toBeNull();
    const diagnosis = diagnoseEvolutionRules(nearMiss).find((item) => item.id === fixture.id)!;
    expect([diagnosis.skillEligible, diagnosis.compositeEligible, diagnosis.journeyEligible].filter((value) => !value)).toHaveLength(1);
  });

  for (const fixture of fixtures()) it(`${fixture.id} rejects wrong subclass, insufficient coverage and low confidence`, () => {
    expect(decideEvolution(withWrongSubclass(fixture.context)).value).toBeNull();
    expect(decideEvolution({ ...fixture.context, subclass: { ...fixture.context.subclass, coverage: "partial" } }).reasonCode).toBe("EVOLUTION_COVERAGE_INSUFFICIENT");
    expect(decideEvolution({ ...fixture.context, subclass: { ...fixture.context.subclass, confidence: "low" } }).reasonCode).toBe("EVOLUTION_CONFIDENCE_LOW");
  });

  it("uses collector-realistic medium confidence for High Chronomancer and keeps low/unavailable blocked", () => {
    const context = fixtures().find((item) => item.id === "evo-high-chronomancer")!.context;
    expect(context.artifacts.every((item) => item.evidence.every((evidence) => evidence.sourceKind === "config"))).toBe(true);
    expect(decideEvolution(context).value).toBe("evo-high-chronomancer");
    expect(decideEvolution({ ...context, subclass: { ...context.subclass, confidence: "low" } }).value).toBeNull();
    expect(decideEvolution({ ...context, subclass: { ...context.subclass, confidence: "unavailable" } }).value).toBeNull();
  });

  it("keeps medium confidence insufficient for every other evolution", () => {
    for (const fixture of fixtures().filter((item) => item.id !== "evo-high-chronomancer")) {
      expect(decideEvolution({ ...fixture.context, subclass: { ...fixture.context.subclass, confidence: "medium" } }).value).toBeNull();
    }
  });

  it("blocks incompatible classes where compatibility is restricted", () => {
    const restricted = fixtures().filter((item) => EVOLUTION_CATALOG.find((definition) => definition.id === item.id)?.classes);
    for (const fixture of restricted) {
      expect(decideEvolution({ ...fixture.context, className: "Aventureiro" }).reasonCode).toBe("EVOLUTION_CLASS_MISMATCH");
    }
  });

  it("does not invent class restrictions for class-agnostic evolutions", () => {
    for (const fixture of fixtures().filter((item) => !EVOLUTION_CATALOG.find((definition) => definition.id === item.id)?.classes)) {
      expect(decideEvolution({ ...fixture.context, className: "Aventureiro" }).value).toBe(fixture.id);
    }
  });
});

describe("Evolution V2 behavior", () => {
  it("emits specific localized reason codes", () => {
    const ancestral = fixtures().find((item) => item.id === "evo-ancestral-forger")!.context;
    expect(decideEvolution({ ...ancestral, profile: { ...ancestral.profile, accountCreatedAt: "2020-01-01T00:00:00Z" } }).reasonCode).toBe("EVOLUTION_MATURITY_LOW");
    const arcane = fixtures().find((item) => item.id === "evo-arcane-weaver")!.context;
    expect(decideEvolution({ ...arcane, profile: makeV2Profile() }).reasonCode).toBe("EVOLUTION_ATTRIBUTE_GATE");
    expect(decideEvolution(fixtures()[0].principalSignal(fixtures()[0].context)).reasonCode).toBe("EVOLUTION_COMPOSITE_GATE");
    expect(decideEvolution(ancestral).reasonCode).toBe("EVOLUTION_GRANTED");
    expect(decideEvolution({ ...ancestral, subclass: { ...ancestral.subclass, value: null, status: "insufficient" } }).reasonCode).toBe("EVOLUTION_SUBCLASS_REQUIRED");
    expect(decideEvolution(ancestral).reason.pt).not.toBe(decideEvolution(ancestral).reason.en);
  });

  it("resolves multiple eligibility by explicit specificity, not array accident", () => {
    const rune = fixtures().find((item) => item.id === "evo-rune-master")!.context;
    const both: EvolutionContext = { ...rune, profile: makeV2Profile({ languages: [{ name: "Rust", bytes: 800_000, repoCount: 5 }], activity: makeV2Profile().activity }), artifacts: [...rune.artifacts, artifact("eslint", "toolchain", 5)] };
    const diagnostics = diagnoseEvolutionRules(both).filter((item) => item.unlock).map((item) => item.id);
    expect(diagnostics).toEqual(expect.arrayContaining(["evo-rune-master", "evo-ancestral-forger"]));
    expect(decideEvolution(both).value).toBe("evo-rune-master");
    expect(decideEvolution(both).rulesApplied).toContain("evolution_tiebreak_higher_minimum_score_then_id");
  });

  it("is stable under irrelevant tooling and deterministic", () => {
    const archmage = fixtures()[0].context;
    const extra = { ...archmage, artifacts: [artifact("prettier", "toolchain", 2)] };
    expect(decideEvolution(extra)).toEqual(decideEvolution(extra));
    expect(decideEvolution(extra).value).toBe(decideEvolution(archmage).value);
  });

  it("blocks profiles that are too immature to obtain the required subclass in the full engine", () => {
    const result = createRPGCharacterV2(GOLDEN_FIXTURES.newProfile());
    expect(result.subclass.value).toBeNull();
    expect(result.evolution.value).toBeNull();
    expect(result.evolution.reasonCode).toBe("EVOLUTION_SUBCLASS_REQUIRED");
  });

  it("has no achievement/title/evolution requirement cycle in the evolution catalog", () => {
    expect(EVOLUTION_CATALOG.every((definition) => !Object.keys(definition).some((key) => /achievement|title|evolutionRequirement/i.test(key)))).toBe(true);
  });
});
