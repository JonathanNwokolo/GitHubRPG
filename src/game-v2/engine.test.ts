import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG_V2, TITLE_CATALOG_V2 } from "./catalogs";
import { createEvidenceCacheKey } from "./cache";
import { decideEvolution, decideSubclass } from "./decisions";
import { createRPGCharacterV2 } from "./engine";
import { makeEvidence, makeV2Profile, GOLDEN_FIXTURES } from "./fixtures";
import { normalizeRepositoryEvidence } from "./evidence";
import { calculateTechnologyAffinities } from "./scoring";
import { presentAchievementV2 } from "./achievements";
import { ARTIFACTS, SCHOOLS } from "./constants";
import { reviewV2Invariants } from "./invariants";
import { collectGitHubEvidenceV2 } from "./collector";
import type { ArchetypeAffinity, FrameworkAffinity, PracticeArchetype, SubclassDecision, ToolAffinity } from "./types";

describe("Game Engine V2 catalogs", () => {
  it("passes all 46 executable invariants", () => {
    const results = reviewV2Invariants();
    expect(results).toHaveLength(46);
    expect(results.filter((item) => !item.passed)).toEqual([]);
  });
  it("keeps the approved taxonomy and catalog totals", () => {
    expect(SCHOOLS).toHaveLength(22); expect(ARTIFACTS).toHaveLength(22);
    expect(ACHIEVEMENT_CATALOG_V2).toHaveLength(54);
    expect(new Set(ACHIEVEMENT_CATALOG_V2.map((item) => item.id)).size).toBe(54);
    expect(ACHIEVEMENT_CATALOG_V2.filter((item) => item.origin === "v1")).toHaveLength(31);
    expect(ACHIEVEMENT_CATALOG_V2.filter((item) => item.origin === "v2")).toHaveLength(23);
    expect(ACHIEVEMENT_CATALOG_V2.filter((item) => item.secret)).toHaveLength(6);
    expect(ACHIEVEMENT_CATALOG_V2.every((item) => item.name.pt && item.name.en && item.lore.pt && item.lore.en && item.requiredEvidence.length)).toBe(true);
    expect(ACHIEVEMENT_CATALOG_V2.some((item) => /visit|share|duel|engagement/i.test(item.requirement))).toBe(false);
    expect(TITLE_CATALOG_V2).toHaveLength(40);
    expect(new Set(TITLE_CATALOG_V2.map((item) => item.id)).size).toBe(40);
    expect(TITLE_CATALOG_V2.filter((item) => item.origin === "v1")).toHaveLength(27);
    expect(TITLE_CATALOG_V2.filter((item) => item.origin === "v2")).toHaveLength(13);
    expect(TITLE_CATALOG_V2.every((item) => item.name.pt && item.name.en && item.requirement)).toBe(true);
  });

  it("redacts every locked secret public requirement", () => {
    const secret = { ...ACHIEVEMENT_CATALOG_V2.find((item) => item.secret)!, unlocked: false, coverage: "full" as const, progress: 69, target: 70, evidence: [] };
    expect(presentAchievementV2(secret, "pt-BR")).toEqual({ id: secret.id, rarity: secret.rarity, unlocked: false, secret: true, name: "???", description: "Conquista desconhecida" });
  });

  it("keeps calibrated mythic composite gates rare but reachable", () => {
    const ordinary = createRPGCharacterV2(GOLDEN_FIXTURES.frontendReact());
    expect(ordinary.achievements.find((item) => item.id === "five-paths")?.unlocked).toBe(false);
    const profile = makeV2Profile({
      ownRepositories: { value: 50, coverage: "full" }, starsReceived: { value: 1000, coverage: "full" }, pullRequests: { value: 500, coverage: "full" }, reviews: { value: 500, coverage: "full" },
      languages: ["TypeScript", "Python", "Rust", "Go", "Ruby"].map((name) => ({ name, bytes: 200_000, repoCount: 10 })),
    });
    const exceptional = createRPGCharacterV2({ profile, evidence: makeEvidence([]) });
    expect(exceptional.achievements.find((item) => item.id === "five-paths")?.unlocked).toBe(true);
  });
});

describe("V2 evidence and affinity", () => {
  it("detects exact direct dependencies/configs, normalizes case, deduplicates, and gives forks zero", () => {
    const evidence = makeEvidence([
      { id: "own", name: "own", isFork: false, isArchived: false, isEmpty: false, stars: 1, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files: [{ path: "package.json", content: JSON.stringify({ dependencies: { REACT: "*", next: "*" }, devDependencies: { vitest: "*" } }) }, { path: "next.config.ts", content: "" }] },
      { id: "fork", name: "fork", isFork: true, isArchived: false, isEmpty: false, stars: 100, pushedAt: "2026-01-01T00:00:00Z", languages: {}, files: [{ path: "package.json", content: JSON.stringify({ dependencies: { vue: "*" } }) }] },
    ]);
    expect(evidence.evidence.filter((item) => item.itemId === "nextjs")).toHaveLength(1);
    expect(evidence.evidence.some((item) => item.repoId === "fork")).toBe(false);
    expect(evidence.evidence.some((item) => item.itemId === "react")).toBe(true);
    expect(evidence.evidence.some((item) => item.itemId === "vitest" && item.sourceKind === "devDependency")).toBe(true);
  });

  it("does not treat lockfile-only/transitive text or unknown technologies as evidence", () => {
    const evidence = makeEvidence([{ id: "a", name: "a", isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files: [{ path: "package-lock.json", content: JSON.stringify({ packages: { "node_modules/react": { version: "19" } } }) }, { path: "README.md", content: "next docker react" }] }]);
    expect(evidence.evidence).toEqual([]);
  });

  it("uses packageManager as primary toolchain evidence instead of lockfiles", () => {
    const direct = makeEvidence([{ id: "pm", name: "pm", isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files: [{ path: "package.json", content: JSON.stringify({ packageManager: "pnpm@10.0.0" }) }, { path: "yarn.lock", content: "__metadata:" }] }]);
    expect(direct.evidence.some((item) => item.itemId === "pnpm" && item.sourceKind === "config")).toBe(true);
    expect(direct.evidence.some((item) => item.itemId === "yarn")).toBe(false);
  });

  it("ignores recognized files inside vendored source directories", () => {
    const evidence = makeEvidence([{ id: "vendored", name: "vendored", isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files: [{ path: "upstream/contrib/oss-fuzz/Dockerfile", content: "FROM base" }, { path: "third_party/sample/package.json", content: JSON.stringify({ dependencies: { react: "*" } }) }] }]);
    expect(evidence.evidence).toEqual([]);
  });

  it("recognizes every explicitly specified manifest ecosystem", () => {
    const files = [
      { path: "requirements.txt", content: "Django==5" }, { path: "Gemfile", content: "gem 'rails'" }, { path: "composer.json", content: JSON.stringify({ require: { "laravel/framework": "*" } }) },
      { path: "pom.xml", content: "<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency>" }, { path: "app.csproj", content: '<FrameworkReference Include="Microsoft.AspNetCore.App" />' }, { path: "pubspec.yaml", content: "dependencies:\n  flutter:\n    sdk: flutter" },
    ];
    const evidence = makeEvidence([{ id: "all", name: "all", isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files }]);
    const ids = new Set(evidence.evidence.map((item) => item.itemId));
    for (const id of ["django", "rails", "laravel", "spring", "aspnet-core", "flutter"]) expect(ids.has(id)).toBe(true);
  });

  it("keeps affinity scores inside 0..100 and unavailable distinct from zero", () => {
    const full = calculateTechnologyAffinities(GOLDEN_FIXTURES.frontendReact().evidence, "2026-01-01T00:00:00Z");
    expect([...full.schools, ...full.artifacts].every((item) => item.score !== null && item.score >= 0 && item.score <= 100)).toBe(true);
    const unavailable = normalizeRepositoryEvidence({ repositories: [], coverage: { coverage: "unavailable", eligible: 0, examined: 0, failed: 0, omittedByBudget: 0 }, requests: { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: 0, cacheHits: 0 } });
    expect(calculateTechnologyAffinities(unavailable, "2026-01-01").schools[0].score).toBeNull();
  });

  it("separates score from low/medium/high confidence and rewards direct declarations", () => {
    const repository = (index: number, declaration: "dependency" | "dev" | "config" | "none", old = false) => ({ id: `c-${index}`, name: `c-${index}`, isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: old ? "2010-01-01T00:00:00Z" : "2025-01-01T00:00:00Z", languages: {}, files: declaration === "config" ? [{ path: "next.config.ts", content: "" }] : declaration === "none" ? [] : [{ path: "package.json", content: JSON.stringify({ [declaration === "dependency" ? "dependencies" : "devDependencies"]: { next: "*" } }) }] });
    const one = calculateTechnologyAffinities(makeEvidence([repository(1, "dependency")]), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const two = calculateTechnologyAffinities(makeEvidence([repository(1, "dependency"), repository(2, "dependency")]), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const twoConfigs = calculateTechnologyAffinities(makeEvidence([repository(1, "config"), repository(2, "config")]), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const eightDirect = calculateTechnologyAffinities(makeEvidence(Array.from({ length: 8 }, (_, index) => repository(index, "dependency"))), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const eightDev = calculateTechnologyAffinities(makeEvidence(Array.from({ length: 8 }, (_, index) => repository(index, "dev"))), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const devWithLockRepositories = Array.from({ length: 8 }, (_, index) => ({ ...repository(index, "dev"), files: [...repository(index, "dev").files, { path: "pnpm-lock.yaml", content: "  next@15.0.0:" }] }));
    const eightDevWithLock = calculateTechnologyAffinities(makeEvidence(devWithLockRepositories), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    const sparseHigh = calculateTechnologyAffinities(makeEvidence(Array.from({ length: 30 }, (_, index) => repository(index, index < 4 ? "config" : index === 4 ? "dependency" : "none", true))), "2026-01-01").schools.find((item) => item.id === "nextjs")!;
    expect(one.confidence).toBe("low"); expect(two.confidence).toBe("medium"); expect(twoConfigs.confidence).toBe("medium"); expect(sparseHigh.confidence).toBe("high");
    expect(one.score).toBeGreaterThan(0); expect(eightDirect.score).toBeGreaterThan(one.score!); expect(eightDirect.score).toBeGreaterThan(eightDev.score!);
    expect(eightDevWithLock.score).toBeGreaterThan(eightDev.score!);
    expect(sparseHigh.score).toBeLessThan(60);
  });

  it("turns collection failures into unavailable evidence instead of breaking V1", async () => {
    const evidence = await collectGitHubEvidenceV2("octocat", { fetch: (() => Promise.reject(new Error("offline"))) as typeof fetch, referenceDate: "2026-01-01", sourceFingerprint: "test" });
    expect(evidence.coverage.coverage).toBe("unavailable"); expect(evidence.evidence).toEqual([]); expect(evidence.requests.rest).toBe(1);
  });
});

describe("V2 decisions, coverage, and determinism", () => {
  it("is deep-equal for repeated identical input and explicit reference date", () => {
    const input = GOLDEN_FIXTURES.frontendReact();
    const first = createRPGCharacterV2(input);
    for (let index = 0; index < 5; index++) expect(createRPGCharacterV2(input)).toEqual(first);
    expect(JSON.stringify(first)).not.toContain("Date.now");
  });

  it("keeps Aventureiro and null specialization/evolution for empty and new profiles", () => {
    const empty = createRPGCharacterV2(GOLDEN_FIXTURES.emptyProfile());
    expect(empty.class.value).toBe("Aventureiro"); expect(empty.subclass.value).toBeNull(); expect(empty.evolution.value).toBeNull();
    expect(createRPGCharacterV2(GOLDEN_FIXTURES.newProfile()).subclass.reasonCode).toBe("profile_immature");
    const unknown = createRPGCharacterV2({ ...GOLDEN_FIXTURES.emptyProfile(), profile: makeV2Profile({ languages: [{ name: "UnmappedLang", bytes: 100, repoCount: 1 }] }) });
    expect(unknown.class.value).toBe("Aventureiro");
  });

  it("does not grant a subclass below threshold, with short margin, low confidence, or unsafe partial coverage", () => {
    const affinity = (archetype: PracticeArchetype, score: number, confidence: "low" | "medium" = "medium"): ArchetypeAffinity => ({ archetype, score, observedScore: score, lowerBound: score, upperBound: score, uncertainty: { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: 0, omittedManifests: 0 }, boundReason: "fixture", scoreWithoutAttributes: score, confidence, coverage: "full", components: {}, evidence: [], primaryEvidenceRepoCount: 2 });
    const base = [affinity("architect", 54), affinity("artificer", 20), affinity("illusionist", 10), affinity("guardian", 5), affinity("chronomancer", 0)];
    expect(decideSubclass(makeV2Profile(), base).reasonCode).toBe("score_below_threshold");
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70), affinity("artificer", 67), ...base.slice(2)]).reasonCode).toBe("margin_insufficient");
    expect(decideSubclass(makeV2Profile(), [affinity("architect", 70, "low"), ...base.slice(1)]).reasonCode).toBe("confidence_insufficient");
    const partial = [{ ...affinity("architect", 70), coverage: "partial" as const }, { ...affinity("artificer", 40), upperBound: 68 }, ...base.slice(2)];
    expect(decideSubclass(makeV2Profile(), partial).reasonCode).toBe("partial_can_change_winner");
  });

  it("creates different practice leaders from the same dominant language without randomization", () => {
    const react = createRPGCharacterV2(GOLDEN_FIXTURES.frontendReact());
    const tooling = createRPGCharacterV2(GOLDEN_FIXTURES.toolingBuild());
    expect(react.archetypes[0]).toBeDefined();
    const leader = (value: typeof react) => [...value.archetypes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0].archetype;
    expect(leader(react)).toBe("illusionist"); expect(leader(tooling)).toBe("artificer");
  });

  it("rewards a composite testing pattern but caps influence after the top three signals", () => {
    const repositories = Array.from({ length: 8 }, (_, index) => ({ id: `quality-${index}`, name: `quality-${index}`, isFork: false, isArchived: false, isEmpty: false, stars: 0, pushedAt: "2025-01-01T00:00:00Z", languages: {}, files: [{ path: "package.json", content: JSON.stringify({ devDependencies: { vitest: "*", jest: "*", cypress: "*", "@playwright/test": "*" } }) }] }));
    const all = createRPGCharacterV2({ profile: makeV2Profile({ reviews: { value: 0, coverage: "full" } }), evidence: makeEvidence(repositories) });
    const one = createRPGCharacterV2({ profile: makeV2Profile({ reviews: { value: 0, coverage: "full" } }), evidence: makeEvidence(repositories.map((repo) => ({ ...repo, files: [{ path: "package.json", content: JSON.stringify({ devDependencies: { vitest: "*" } }) }] }))) });
    const three = createRPGCharacterV2({ profile: makeV2Profile({ reviews: { value: 0, coverage: "full" } }), evidence: makeEvidence(repositories.map((repo) => ({ ...repo, files: [{ path: "package.json", content: JSON.stringify({ devDependencies: { vitest: "*", cypress: "*", "@playwright/test": "*" } }) }] }))) });
    const guardian = (value: typeof all) => value.archetypes.find((item) => item.archetype === "guardian")?.score ?? 0;
    expect(guardian(all)).toBe(guardian(three));
    expect(guardian(all)).toBeGreaterThan(guardian(one));
  });

  it("makes every archetype reachable, blocks generic-only signals, and reacts to counterfactual removal", () => {
    const realistic = [GOLDEN_FIXTURES.architecturalSystem(), GOLDEN_FIXTURES.toolingBuild(), GOLDEN_FIXTURES.frontendReact(), GOLDEN_FIXTURES.testingReviewHeavy(), GOLDEN_FIXTURES.devOps()].map(createRPGCharacterV2);
    expect(realistic.map((item) => item.subclass.value)).toEqual(["architect", "artificer", "illusionist", "guardian", "chronomancer"]);
    const generic = [GOLDEN_FIXTURES.genericNext(), GOLDEN_FIXTURES.genericVite(), GOLDEN_FIXTURES.genericReact(), GOLDEN_FIXTURES.genericJest(), GOLDEN_FIXTURES.genericActions()].map(createRPGCharacterV2);
    expect(generic.every((item) => item.subclass.value === null)).toBe(true);
    const practices: PracticeArchetype[] = ["architect", "artificer", "illusionist", "guardian", "chronomancer"];
    for (let index = 0; index < realistic.length; index++) {
      const strong = realistic[index].archetypes.find((item) => item.archetype === practices[index])?.scoreWithoutAttributes ?? 0;
      const weak = generic[index].archetypes.find((item) => item.archetype === practices[index])?.scoreWithoutAttributes ?? 0;
      expect(strong).toBeGreaterThan(weak);
    }
  });

  it("respects Grimoire presentation limits and never decides an equipped title", () => {
    const character = createRPGCharacterV2(GOLDEN_FIXTURES.frontendReact());
    expect(character.grimoire.affinities.length).toBeLessThanOrEqual(8); expect(character.grimoire.schools.length).toBeLessThanOrEqual(5); expect(character.grimoire.artifacts.length).toBeLessThanOrEqual(8);
    expect("equippedTitleId" in character).toBe(false);
  });

  it("uses a separately versioned cache key", () => expect(createEvidenceCacheKey({ username: "User", sourceFingerprint: "abc", referenceDate: "2026-01-01" })).toContain("v2-experimental/2.0-experimental"));
});

describe("all seven evolution gates", () => {
  const subclass = (value: PracticeArchetype, score: number): SubclassDecision => ({ value, status: "strong", score, observedScore: score, lowerBound: score, upperBound: score, runnerUpUpperBound: 0, guaranteedMargin: score, safeWinner: true, uncertainty: { totalScore: 0, schoolScore: 0, artifactScore: 0, reviewScore: 0, uncertainRepositories: 0, omittedManifests: 0 }, boundReason: "fixture", confidence: "high", coverage: "full", evidence: [], alternatives: [], rulesApplied: [], reasonCode: "fixture", reason: { pt: "fixture", en: "fixture" }, rulesVersion: "game-engine-v2-experimental" });
  const school = (family: string, score = 80, repos = 6): FrameworkAffinity => ({ id: family, name: family, kind: "school", family, score, confidence: "high", coverage: "full", evidenceRepoCount: repos, eligibleRepoCount: 8, examinedRepoCount: 8, lastEvidenceAt: "2025-01-01", evidence: Array.from({ length: repos }, (_, i) => ({ repoId: `${family}-${i}`, repoName: `${family}-${i}`, itemId: family, itemKind: "school", sourcePath: "package.json", sourceKind: i % 2 ? "config" : "directDependency", strength: 100, observedAt: "2025-01-01", detectorVersion: "test", direct: true })), warnings: [] });
  const artifact = (id: string, family: string, repos = 6): ToolAffinity => ({ ...school(family, 80, repos), id, name: id, kind: "artifact", evidence: school(family, 80, repos).evidence.map((e) => ({ ...e, itemId: id, itemKind: "artifact" })) });
  const cases: Array<[string, PracticeArchetype, number, "Mago" | "Guerreiro" | "Bardo" | "Ladino", FrameworkAffinity[], ToolAffinity[]]> = [
    ["evo-archmage", "architect", 80, "Mago", [school("meta-web"), school("backend")], []],
    ["evo-celestial-guardian", "guardian", 82, "Mago", [], [artifact("vitest", "testing")]],
    ["evo-rune-master", "artificer", 80, "Guerreiro", [], [artifact("vite", "build"), artifact("eslint", "toolchain"), artifact("electron", "desktop")]],
    ["evo-arcane-weaver", "illusionist", 80, "Bardo", [school("ui-web")], []],
    ["evo-ancestral-forger", "artificer", 80, "Mago", [], [artifact("vite", "build"), artifact("eslint", "toolchain"), artifact("electron", "desktop"), artifact("docker", "infra")]],
    ["evo-high-chronomancer", "chronomancer", 82, "Ladino", [], [artifact("github-actions", "infra"), artifact("docker", "infra")]],
    ["evo-celestial-architect", "architect", 82, "Mago", [school("ui-web"), school("backend")], []],
  ];
  for (const [id, practice, score, className, schools, artifacts] of cases) it(`${id}: positive, one gate negative, incompatible/partial`, () => {
    const languages = id === "evo-rune-master" ? [{ name: "Rust", bytes: 1_000_000, repoCount: 8 }]
      : id === "evo-high-chronomancer" ? [{ name: "Shell", bytes: 1_000_000, repoCount: 8 }]
      : id === "evo-arcane-weaver" ? ["TypeScript", "CSS", "HTML", "Python", "Go", "Rust", "Ruby", "Dart"].map((name) => ({ name, bytes: 125_000, repoCount: 5 }))
      : [{ name: "TypeScript", bytes: 800_000, repoCount: 8 }, { name: "CSS", bytes: 200_000, repoCount: 5 }];
    const profile = makeV2Profile({ languages, ...(id === "evo-celestial-architect" ? { ownRepositories: { value: 100, coverage: "full" as const }, pullRequests: { value: 1000, coverage: "full" as const }, reviews: { value: 1000, coverage: "full" as const }, issues: { value: 1000, coverage: "full" as const } } : {}) });
    const positive = decideEvolution({ profile, className, subclass: subclass(practice, score), schools, artifacts });
    expect(positive.value).toBe(id);
    const below = decideEvolution({ profile, className, subclass: subclass(practice, score - 20), schools, artifacts }); expect(below.value).toBeNull();
    const partial = decideEvolution({ profile, className, subclass: { ...subclass(practice, score), coverage: "partial" }, schools, artifacts }); expect(partial.value).toBeNull();
  });
});
