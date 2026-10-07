import type { DeveloperProfile } from "@/game/types";
import { normalizeRepositoryEvidence } from "./evidence";
import type { RawEvidenceCollection, RawRepositoryEvidence, TechnologyEvidenceProfile } from "./types";

const full = (value: number) => ({ value, coverage: "full" as const });
export function makeV2Profile(overrides: Partial<DeveloperProfile> = {}): DeveloperProfile {
  return {
    username: "fixture", accountCreatedAt: "2014-01-01T00:00:00Z", referenceDate: "2026-01-01T00:00:00Z", isDemo: false,
    commits: full(3000), pullRequests: full(120), reviews: full(220), issues: full(80), followers: full(50), ownRepositories: full(8), starsReceived: full(120), forksReceived: full(20), starredRepositories: full(6),
    languages: [{ name: "TypeScript", bytes: 800_000, repoCount: 8 }, { name: "CSS", bytes: 200_000, repoCount: 5 }], languagesCoverage: "full",
    activity: { activeDays: full(700), longestStreakDays: full(45), currentStreakDays: full(5), recentActiveDays: full(180), monthlyContributions: Array(72).fill(40), monthlyCoverage: "full", yearly: { coverage: "full", years: Array.from({ length: 8 }, (_, index) => ({ year: 2018 + index, contributions: 300, commits: 200, pullRequests: 20, reviews: 30, issues: 10, activeDays: 100 })) } },
    ...overrides,
  };
}

function repo(index: number, dependencies: Record<string, string>, files: Array<{ path: string; content: string }> = []): RawRepositoryEvidence {
  return { id: `repo-${index}`, name: `repo-${index}`, isFork: false, isArchived: false, isEmpty: false, stars: 10 - index, pushedAt: `2025-${String((index % 9) + 1).padStart(2, "0")}-01T00:00:00Z`, languages: { TypeScript: 1000 }, files: [{ path: "package.json", content: JSON.stringify({ dependencies }) }, ...files] };
}

export function makeEvidence(repositories: RawRepositoryEvidence[], coverage: "full" | "partial" | "unavailable" = "full", omittedByBudget = 0): TechnologyEvidenceProfile {
  const raw: RawEvidenceCollection = { repositories, coverage: { coverage, eligible: repositories.filter((item) => !item.isFork).length + omittedByBudget, examined: repositories.length, failed: 0, omittedByBudget }, requests: { rest: 0, graphql: 0, manifestFetches: 0, reposInspected: repositories.length, cacheHits: 0 } };
  return normalizeRepositoryEvidence(raw);
}

export const GOLDEN_FIXTURES = {
  frontendReact: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { react: "*" }, [{ path: "tailwind.config.ts", content: "" }]))) }),
  architecturalSystem: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { next: "*", "@nestjs/core": "*" }))) }),
  frontendVue: () => ({ profile: makeV2Profile({ languages: [{ name: "TypeScript", bytes: 600_000, repoCount: 8 }, { name: "Vue", bytes: 400_000, repoCount: 8 }] }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { vue: "*" }))) }),
  backendPython: () => ({ profile: makeV2Profile({ languages: [{ name: "Python", bytes: 1_000_000, repoCount: 8 }] }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => ({ ...repo(index, {}), files: [{ path: "requirements.txt", content: "django==5.0\n" }] }))) }),
  backendJava: () => ({ profile: makeV2Profile({ languages: [{ name: "Java", bytes: 1_000_000, repoCount: 8 }] }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => ({ ...repo(index, {}), files: [{ path: "pom.xml", content: "<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency>" }] }))) }),
  toolingBuild: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { vite: "*", esbuild: "*" }, [{ path: "rollup.config.ts", content: "" }]))) }),
  devOps: () => ({ profile: makeV2Profile({ languages: [{ name: "Shell", bytes: 1_000_000, repoCount: 8 }] }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, {}, [{ path: "Dockerfile", content: "FROM node" }, { path: ".github/workflows/ci.yml", content: "name: ci" }, { path: "main.tf", content: "terraform {}" }]))) }),
  testingReviewHeavy: () => ({ profile: makeV2Profile({ reviews: full(800) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { vitest: "*", "@playwright/test": "*" }))) }),
  genericReact: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { react: "*" }))) }),
  genericNext: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { next: "*" }))) }),
  genericVite: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { vite: "*" }))) }),
  genericJest: () => ({ profile: makeV2Profile({ reviews: full(800) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, { jest: "*" }))) }),
  genericActions: () => ({ profile: makeV2Profile({ reviews: full(0) }), evidence: makeEvidence(Array.from({ length: 8 }, (_, index) => repo(index, {}, [{ path: ".github/workflows/ci.yml", content: "name: ci" }]))) }),
  lowLevel: () => ({ profile: makeV2Profile({ languages: [{ name: "Rust", bytes: 1_000_000, repoCount: 8 }] }), evidence: makeEvidence([]) }),
  polyglot: () => ({ profile: makeV2Profile({ languages: ["TypeScript", "Python", "Rust", "Go", "Ruby"].map((name) => ({ name, bytes: 200_000, repoCount: 3 })) }), evidence: makeEvidence([]) }),
  newProfile: () => ({ profile: makeV2Profile({ accountCreatedAt: "2025-12-15T00:00:00Z", ownRepositories: full(1) }), evidence: makeEvidence([repo(1, { react: "*" })]) }),
  emptyProfile: () => ({ profile: makeV2Profile({ ownRepositories: full(0), languages: [], commits: full(0), pullRequests: full(0), reviews: full(0), issues: full(0) }), evidence: makeEvidence([]) }),
} as const;
