import { z, type ZodTypeAny } from "zod";
import { GitHubDataValidationError } from "./errors";

/** Only the fields we rely on. Anything else GitHub sends is ignored. */

const count = z.number().int().nonnegative();

export const restUserSchema = z.object({
  login: z.string().min(1),
  type: z.string(),
  name: z.string().nullish(),
  avatar_url: z.string().nullish(),
  bio: z.string().nullish(),
  location: z.string().nullish(),
  company: z.string().nullish(),
  created_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date"),
  followers: count,
  public_repos: count,
});
export type RestUser = z.infer<typeof restUserSchema>;

export const restRepoSchema = z.object({
  id: count.optional(),
  name: z.string().min(1),
  owner: z.object({ login: z.string().min(1) }),
  fork: z.boolean(),
  stargazers_count: count,
  forks_count: count,
  /** KB. Informational only: it reads 0 for a freshly pushed repository, so never used to skip a request. */
  size: count,
  archived: z.boolean().optional(),
  pushed_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date").optional(),
  default_branch: z.string().min(1).optional(),
  language: z.string().min(1).nullable().optional(),
});
export type RestRepo = z.infer<typeof restRepoSchema>;

export const restRepoListSchema = z.array(restRepoSchema);

export const restLanguagesSchema = z.record(z.string().min(1), z.number().nonnegative());

const graphqlLanguageEdge = z.object({
  size: z.number().nonnegative(),
  node: z.object({ name: z.string().min(1) }),
});

/** One page of `user.repositories` with each repository's languages (see graphqlRepositories.ts). */
export const graphqlRepositoriesSchema = z.object({
  user: z.object({
    repositories: z.object({
      pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
      nodes: z.array(
        z.object({
          databaseId: count.nullable().optional(),
          name: z.string().min(1),
          isFork: z.boolean(),
          isArchived: z.boolean().optional(),
          isEmpty: z.boolean().optional(),
          pushedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date").optional(),
          diskUsage: count.nullable().optional(),
          primaryLanguage: z.object({ name: z.string().min(1) }).nullable().optional(),
          stargazerCount: count,
          forkCount: count,
          languages: z.object({ totalCount: count, edges: z.array(graphqlLanguageEdge) }).nullable(),
        })
      ),
    }),
  }),
});
export type GraphqlRepositoryNode = z.infer<typeof graphqlRepositoriesSchema>["user"]["repositories"]["nodes"][number];

const day = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contributionCount: count,
});

export const contributionCollectionSchema = z.object({
  totalCommitContributions: count,
  totalIssueContributions: count,
  totalPullRequestContributions: count,
  totalPullRequestReviewContributions: count,
  contributionCalendar: z.object({
    weeks: z.array(z.object({ contributionDays: z.array(day) })),
  }),
});
export type ContributionCollection = z.infer<typeof contributionCollectionSchema>;

/** Validates a GitHub payload. The error names the payload, never includes its content. */
export function parsePayload<S extends ZodTypeAny>(schema: S, data: unknown, what: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new GitHubDataValidationError(what);
  return result.data;
}
