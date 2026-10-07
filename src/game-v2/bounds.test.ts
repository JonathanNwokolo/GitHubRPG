import { describe, expect, it } from "vitest";
import { decideSubclass } from "./decisions";
import { createRPGCharacterV2 } from "./engine";
import { GOLDEN_FIXTURES, makeEvidence, makeV2Profile } from "./fixtures";
import type { ArchetypeAffinity, PracticeArchetype } from "./types";

const uncertainty = (totalScore = 0, uncertainRepositories = 0) => ({ totalScore, schoolScore: totalScore, artifactScore: 0, reviewScore: 0, uncertainRepositories, omittedManifests: uncertainRepositories });
const affinity = (archetype: PracticeArchetype, observed: number, upper = observed, coverage: "full" | "partial" = "full", confidence: "low" | "medium" | "high" = "medium"): ArchetypeAffinity => ({
  archetype, score: observed, observedScore: observed, lowerBound: observed, upperBound: upper, uncertainty: uncertainty(upper - observed, coverage === "partial" ? 1 : 0), boundReason: coverage === "full" ? "no_unobserved_score_potential" : "formula_bound", scoreWithoutAttributes: observed, confidence, coverage, components: {}, evidence: [], primaryEvidenceRepoCount: 2,
});
const set = (topUpper: number, rivalUpper: number, coverage: "full" | "partial" = "partial") => [
  affinity("architect", 70, topUpper, coverage), affinity("artificer", 50, rivalUpper, coverage), affinity("illusionist", 20, 30, coverage), affinity("guardian", 10, 20, coverage), affinity("chronomancer", 5, 15, coverage),
];

describe("V2.2 deterministic evidence bounds", () => {
  it("A: full coverage keeps lower = observed = upper", () => {
    const result = createRPGCharacterV2(GOLDEN_FIXTURES.frontendReact());
    expect(result.archetypes.every((item) => item.lowerBound === item.observedScore && item.upperBound === item.observedScore)).toBe(true);
  });
  it("B/C: partial-small can be safe or unsafe without becoming full", () => {
    const safe = decideSubclass(makeV2Profile(), set(75, 60));
    const unsafe = decideSubclass(makeV2Profile(), set(75, 68));
    expect(safe.value).toBe("architect"); expect(safe.safeWinner).toBe(true); expect(safe.coverage).toBe("partial");
    expect(unsafe.value).toBeNull(); expect(unsafe.safeWinner).toBe(false); expect(unsafe.coverage).toBe("partial");
  });
  it("D/E/F: large uncertainty blocks unless even the rival best case preserves the winner", () => {
    const unsafe = decideSubclass(makeV2Profile(), set(95, 72));
    const safe = decideSubclass(makeV2Profile(), set(100, 60));
    const overtaken = decideSubclass(makeV2Profile(), set(100, 71));
    expect(unsafe.reasonCode).toBe("partial_can_change_winner");
    expect(safe.value).toBe("architect");
    expect(overtaken.guaranteedMargin).toBeLessThan(0);
  });
  it("G: required margin is inclusive and remains five points", () => {
    expect(decideSubclass(makeV2Profile(), set(80, 65)).value).toBe("architect");
    expect(decideSubclass(makeV2Profile(), set(80, 65.01)).value).toBeNull();
  });
  it("H: observed and bounded scores are clamped to 0..100", () => {
    const evidence = makeEvidence(GOLDEN_FIXTURES.frontendReact().evidence.repositories, "partial", 50);
    const result = createRPGCharacterV2({ profile: makeV2Profile(), evidence });
    expect(result.archetypes.every((item) => item.lowerBound! >= 0 && item.lowerBound! <= 100 && item.upperBound! >= 0 && item.upperBound! <= 100)).toBe(true);
  });
  it("preserves bound invariants and monotonic uncertainty", () => {
    const repositories = GOLDEN_FIXTURES.frontendReact().evidence.repositories;
    const full = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence(repositories) });
    const small = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence(repositories, "partial", 1) });
    const large = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence(repositories, "partial", 4) });
    for (const item of large.archetypes) {
      expect(item.lowerBound).toBeLessThanOrEqual(item.observedScore!);
      expect(item.observedScore).toBeLessThanOrEqual(item.upperBound!);
      expect(item.upperBound).toBeGreaterThanOrEqual(small.archetypes.find((candidate) => candidate.archetype === item.archetype)!.upperBound!);
      expect(full.archetypes.find((candidate) => candidate.archetype === item.archetype)!.upperBound).toBeLessThanOrEqual(item.upperBound!);
    }
  });
  it("keeps score confidence semantics separate and all confidence states reachable", () => {
    const low = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence(GOLDEN_FIXTURES.frontendReact().evidence.repositories.slice(0, 1)) });
    const medium = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence(GOLDEN_FIXTURES.frontendReact().evidence.repositories.slice(0, 2)) });
    const high = createRPGCharacterV2(GOLDEN_FIXTURES.frontendReact());
    const unavailable = createRPGCharacterV2({ profile: makeV2Profile(), evidence: makeEvidence([], "unavailable") });
    expect(new Set([low.archetypes[2].confidence, medium.archetypes[2].confidence, high.archetypes[2].confidence, unavailable.archetypes[2].confidence])).toEqual(new Set(["low", "medium", "high", "unavailable"]));
    expect(high.archetypes[2].score).not.toBe(high.archetypes[2].primaryEvidenceRepoCount);
  });
  it("covers tied, below, equal, and above observed margins with bounds", () => {
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70), affinity("artificer", 70), ...set(20, 20).slice(2)]).value).toBeNull();
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70), affinity("artificer", 66), ...set(20, 20).slice(2)]).value).toBeNull();
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70), affinity("artificer", 65), ...set(20, 20).slice(2)]).value).toBe("architect");
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70), affinity("artificer", 64), ...set(20, 20).slice(2)]).value).toBe("architect");
  });
});
