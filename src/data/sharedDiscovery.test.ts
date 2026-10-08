import { describe, expect, it } from "vitest";
import { makeRawData } from "@/test/builders";
import { createRepositoryDiscoverySnapshot, V2_REPOSITORY_DISCOVERY_WINDOW } from "./sharedDiscovery";
import { normalizeDeveloperProfile } from "./normalize";

describe("shared repository discovery snapshot", () => {
  it("is unavailable for legacy/mock repository rows and never invents metadata", () => {
    const raw = makeRawData({ repositories: { coverage: "full", items: [{ name: "legacy", isFork: false, stars: 0, forks: 0, languages: {} }] } });
    expect(createRepositoryDiscoverySnapshot(raw)).toBeNull();
  });

  it("keeps the collector's historical 100-repository window explicit", () => {
    const raw = makeRawData({
      username: "Hero",
      repositories: {
        coverage: "full",
        items: Array.from({ length: 105 }, (_, index) => ({
          name: `repo-${index}`,
          isFork: false,
          stars: index,
          forks: 0,
          languages: {},
          discovery: { id: String(index), isArchived: false, isEmpty: false, pushedAt: "2026-10-08T00:00:00.000Z", defaultBranch: "main", size: 1, primaryLanguage: null },
        })),
      },
    });
    const snapshot = createRepositoryDiscoverySnapshot(raw)!;
    expect(snapshot.repositories).toHaveLength(V2_REPOSITORY_DISCOVERY_WINDOW);
    expect(snapshot.sourceRepositoryCount).toBe(105);
    expect(snapshot.collectorWindowComplete).toBe(false);
  });

  it("does not change the V1 profile semantics", () => {
    const withoutDiscovery = makeRawData();
    const withDiscovery = makeRawData({
      repositories: {
        ...withoutDiscovery.repositories,
        items: withoutDiscovery.repositories.items.map((repository, index) => ({
          ...repository,
          discovery: { id: String(index), isArchived: false, isEmpty: false, pushedAt: withoutDiscovery.fetchedAt, defaultBranch: "main", size: 1, primaryLanguage: null },
        })),
      },
    });
    expect(normalizeDeveloperProfile(withDiscovery)).toEqual(normalizeDeveloperProfile(withoutDiscovery));
  });
});
