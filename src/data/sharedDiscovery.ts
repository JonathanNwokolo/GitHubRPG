import type { RawGitHubData } from "./contracts";

/** The V2 collector has historically discovered at most the first 100 pushed repositories. */
export const V2_REPOSITORY_DISCOVERY_WINDOW = 100;

export interface SharedRepositoryDiscoveryItem {
  id: string;
  name: string;
  isFork: boolean;
  isArchived: boolean;
  isEmpty: boolean;
  stars: number;
  pushedAt: string;
  defaultBranch: string;
  languages: Record<string, number>;
  size: number;
  primaryLanguage: string | null;
}

/** Neutral server-only input shared by the base loader and evidence collector. */
export interface RepositoryDiscoverySnapshot {
  username: string;
  fetchedAt: string;
  repositories: SharedRepositoryDiscoveryItem[];
  sourceRepositoryCount: number;
  collectorWindowComplete: boolean;
}

export function createRepositoryDiscoverySnapshot(raw: RawGitHubData): RepositoryDiscoverySnapshot | null {
  const window = raw.repositories.items.slice(0, V2_REPOSITORY_DISCOVERY_WINDOW);
  if (window.some((repository) => !repository.discovery)) return null;

  return {
    username: raw.username.trim().toLowerCase(),
    fetchedAt: raw.fetchedAt,
    repositories: window.map((repository) => ({
      id: repository.discovery!.id,
      name: repository.name,
      isFork: repository.isFork,
      isArchived: repository.discovery!.isArchived,
      isEmpty: repository.discovery!.isEmpty,
      stars: repository.stars,
      pushedAt: repository.discovery!.pushedAt,
      defaultBranch: repository.discovery!.defaultBranch,
      languages: { ...repository.languages },
      size: repository.discovery!.size,
      primaryLanguage: repository.discovery!.primaryLanguage,
    })),
    sourceRepositoryCount: raw.repositories.items.length,
    collectorWindowComplete: raw.repositories.items.length <= V2_REPOSITORY_DISCOVERY_WINDOW,
  };
}
