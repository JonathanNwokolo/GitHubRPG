import { ARTIFACTS, CONTEXTUAL_PATH, DETECTOR_VERSION, IGNORED_PATH, SCHOOLS, V2_BALANCE, type TechnologyDefinition } from "./constants";
import type { EvidenceItem, EvidenceSourceKind, RawEvidenceCollection, RawRepositoryEvidence, TechnologyEvidenceProfile, TechnologyKind } from "./types";

type Declared = { name: string; sourceKind: EvidenceSourceKind; strength: number };

function normalizePath(path: string): string { return path.trim().replace(/\\/g, "/").replace(/^\.\//, ""); }

function jsonDependencies(content: string): Declared[] {
  try {
    const value = JSON.parse(content) as Record<string, unknown>;
    const groups: Array<[string, EvidenceSourceKind, number]> = [
      ["dependencies", "directDependency", 100], ["peerDependencies", "peerDependency", 80], ["devDependencies", "devDependency", 60],
      ["require", "directDependency", 100], ["require-dev", "devDependency", 60],
    ];
    const declared = groups.flatMap(([key, sourceKind, strength]) => {
      const deps = value[key];
      if (!deps || typeof deps !== "object" || Array.isArray(deps)) return [];
      return Object.keys(deps).map((name) => ({ name: name.toLowerCase(), sourceKind, strength }));
    });
    const packageManager = typeof value.packageManager === "string" ? value.packageManager.toLowerCase().match(/^(pnpm|yarn)@/)?.[1] : undefined;
    if (packageManager) declared.push({ name: packageManager, sourceKind: "config", strength: 55 });
    return declared;
  } catch { return []; }
}

function lineDependencies(path: string, content: string): Declared[] {
  const out: Declared[] = [];
  const add = (name: string, dev = false) => out.push({ name: name.toLowerCase(), sourceKind: dev ? "devDependency" : "directDependency", strength: dev ? 60 : 100 });
  if (/requirements.*\.txt$/i.test(path)) {
    for (const line of content.split(/\r?\n/)) { const name = line.trim().match(/^([A-Za-z0-9_.-]+)/)?.[1]; if (name && !line.trim().startsWith("#")) add(name); }
  } else if (/(^|\/)Gemfile$/i.test(path)) {
    for (const match of content.matchAll(/^\s*gem\s+["']([^"']+)/gm)) add(match[1]);
  } else if (/pom\.xml$/i.test(path)) {
    for (const match of content.matchAll(/<groupId>\s*([^<]+)<\/groupId>\s*<artifactId>\s*([^<]+)<\/artifactId>/g)) { add(match[1].trim()); add(`${match[1].trim()}:${match[2].trim()}`); }
  } else if (/build\.gradle(?:\.kts)?$/i.test(path)) {
    for (const match of content.matchAll(/(?:implementation|api|compileOnly|runtimeOnly)\s*\(?["']([^:"']+)(?::([^:"']+))?/g)) { add(match[1]); if (match[2]) add(`${match[1]}:${match[2]}`); }
    for (const match of content.matchAll(/\bid\s*(?:\(\s*)?["']([^"']+)["']/g)) add(match[1]);
  } else if (/\.csproj$|Directory\.Packages\.props$/i.test(path)) {
    for (const match of content.matchAll(/<(?:PackageReference|FrameworkReference)[^>]+Include=["']([^"']+)/gi)) add(match[1]);
  } else if (/pubspec\.yaml$/i.test(path)) {
    let dev = false;
    for (const line of content.split(/\r?\n/)) { if (/^dev_dependencies:/.test(line)) dev = true; else if (/^dependencies:/.test(line)) dev = false; else { const name = line.match(/^\s{2}([\w-]+):/)?.[1]; if (name) add(name, dev); } }
  } else if (/pyproject\.toml$/i.test(path)) {
    for (const definition of [...SCHOOLS, ...ARTIFACTS]) for (const pkg of definition.packages) {
      const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); if (new RegExp(`(?:^|[\\s"'])${escaped}(?:[\\s"'=<>{},]|$)`, "im").test(content)) add(pkg);
    }
  }
  return out;
}

function manifestDeclarations(path: string, content: string): Declared[] {
  if (/(^|\/)(?:package|composer)\.json$/i.test(path)) return jsonDependencies(content);
  return lineDependencies(path, content);
}

function matchesPackage(definition: TechnologyDefinition, name: string): boolean {
  return definition.packages.some((pkg) => pkg.toLowerCase() === name.toLowerCase());
}

function lockCorroborates(repo: RawRepositoryEvidence, definition: TechnologyDefinition): boolean {
  const lockFiles = repo.files.filter((file) => /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Gemfile\.lock|composer\.lock)$/i.test(normalizePath(file.path)));
  return lockFiles.some((file) => definition.packages.some((pkg) => {
    const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[\\s"'/])${escaped}(?:@|[\\s"':/]|$)`, "im").test(file.content);
  }));
}

function makeEvidence(repo: RawRepositoryEvidence, definition: TechnologyDefinition, kind: TechnologyKind, file: RawRepositoryEvidence["files"][number], sourceKind: EvidenceSourceKind, strength: number): EvidenceItem {
  const contextWeight = file.contextWeight ?? (CONTEXTUAL_PATH.test(file.path) ? 0.5 : 1);
  return { repoId: repo.id, repoName: repo.name, itemId: definition.id, itemKind: kind, sourcePath: file.path, sourceKind, strength: Math.round(strength * contextWeight), observedAt: repo.pushedAt, detectorVersion: DETECTOR_VERSION, direct: sourceKind !== "lockCorroboration" };
}

function detectDefinition(repo: RawRepositoryEvidence, definition: TechnologyDefinition, kind: TechnologyKind): EvidenceItem[] {
  const found: EvidenceItem[] = [];
  for (const file of repo.files) {
    const path = normalizePath(file.path);
    if (IGNORED_PATH.test(path)) continue;
    for (const declared of manifestDeclarations(path, file.content)) if (matchesPackage(definition, declared.name)) found.push(makeEvidence(repo, definition, kind, file, declared.sourceKind, declared.strength));
    const basename = path.split("/").at(-1) ?? path;
    if (definition.configs?.some((pattern) => pattern.test(path) || pattern.test(basename))) found.push(makeEvidence(repo, definition, kind, file, "config", 55));
  }
  if (lockCorroborates(repo, definition)) {
    for (const item of found) if (item.sourceKind === "directDependency" || item.sourceKind === "peerDependency" || item.sourceKind === "devDependency") item.strength = Math.min(100, item.strength + 5);
  }
  const best = found.sort((a, b) => b.strength - a.strength || a.sourcePath.localeCompare(b.sourcePath, "en"))[0];
  return best ? [best] : [];
}

export function selectRepositories(repositories: readonly RawRepositoryEvidence[]): { selected: RawRepositoryEvidence[]; eligible: number } {
  const eligible = repositories.filter((repo) => !repo.isFork && !repo.isArchived && !repo.isEmpty);
  const selected = [...eligible].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt) || b.stars - a.stars || a.name.localeCompare(b.name, "en")).slice(0, V2_BALANCE.maxRepositories);
  return { selected, eligible: eligible.length };
}

export function normalizeRepositoryEvidence(raw: RawEvidenceCollection): TechnologyEvidenceProfile {
  const { selected, eligible } = selectRepositories(raw.repositories);
  const evidence = selected.flatMap((repo) => [
    ...SCHOOLS.flatMap((definition) => detectDefinition(repo, definition, "school")),
    ...ARTIFACTS.flatMap((definition) => detectDefinition(repo, definition, "artifact")),
  ]).sort((a, b) => a.itemKind.localeCompare(b.itemKind) || a.itemId.localeCompare(b.itemId) || a.repoId.localeCompare(b.repoId));
  // Coverage describes the declared top-N scoring universe. Lower-priority repositories
  // remain visible through reposCandidates but are not silently counted as skipped files.
  const omittedByBudget = raw.coverage.omittedByBudget;
  const inferredUncertainRepositories = raw.coverage.uncertainRepositories ?? (() => {
    if (raw.coverage.coverage === "full" || (omittedByBudget === 0 && raw.coverage.failed === 0 && (raw.coverage.treesTruncated ?? 0) === 0)) return 0;
    const belowGlobalCap = raw.coverage.manifestsFetched !== undefined && raw.coverage.manifestsFetched < V2_BALANCE.maxManifestsPerProfile;
    if (!belowGlobalCap) return Math.min(raw.coverage.eligible, Math.max(omittedByBudget, raw.coverage.manifestsSkippedByBudget ?? 0) + raw.coverage.failed + (raw.coverage.treesTruncated ?? 0));
    const perRepositoryCapHits = selected.filter((repository) => repository.files.length >= V2_BALANCE.maxManifestsPerRepository).length;
    return Math.min(raw.coverage.eligible, perRepositoryCapHits + raw.coverage.failed + (raw.coverage.treesTruncated ?? 0));
  })();
  const coverage = raw.coverage.coverage === "unavailable" ? "unavailable" : raw.coverage.failed > 0 || omittedByBudget > 0 ? "partial" : raw.coverage.coverage;
  return {
    repositories: selected,
    evidence,
    coverage: { ...raw.coverage, coverage, eligible: Math.min(eligible, V2_BALANCE.maxRepositories), examined: selected.length, omittedByBudget, uncertainRepositories: inferredUncertainRepositories },
    requests: { ...raw.requests, reposInspected: selected.length },
    warnings: coverage === "partial" ? ["manifest_coverage_is_lower_bound"] : coverage === "unavailable" ? ["manifest_evidence_unavailable"] : [],
  };
}
