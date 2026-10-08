/** What a GraphQL request was for. Reviews are not separate: they come inside the `contributions` requests. */
export type GraphqlPurpose = "repositories" | "repository_cursors" | "contributions" | "other";

export interface GraphqlPurposeStats {
  requests: number;
  /** Sum of the attempts' own durations: concurrent attempts add up, so this can exceed the wall time. */
  ms: number;
}

/** Request counters of ONE profile fetch. Internal instrumentation, never sent anywhere. */
export class RequestStats {
  rest = 0;
  graphql = 0;
  readonly graphqlByPurpose: Record<GraphqlPurpose, GraphqlPurposeStats> = {
    repositories: { requests: 0, ms: 0 },
    repository_cursors: { requests: 0, ms: 0 },
    contributions: { requests: 0, ms: 0 },
    other: { requests: 0, ms: 0 },
  };

  /** Set by the data source once the repositories/contributions step is over. */
  phases: FetchPhaseTimings | null = null;

  get total(): number {
    return this.rest + this.graphql;
  }

  recordGraphql(purpose: GraphqlPurpose, ms: number): void {
    const entry = this.graphqlByPurpose[purpose];
    entry.requests++;
    entry.ms += Math.round(ms);
  }
}

export type CacheOutcome = "hit" | "miss" | "coalesced" | "not-found-hit";

/** Wall-clock time of the independent parts of one cold fetch (they overlap). */
export interface FetchPhaseTimings {
  userMs: number;
  repositoriesMs: number;
  contributionsMs: number;
}

export interface ProfileFetchReport {
  /** Cache key (lowercase login). */
  username: string;
  cache: CacheOutcome;
  restRequests: number;
  graphqlRequests: number;
  totalRequests: number;
  durationMs: number;
  authenticated: boolean;
  ok: boolean;
  /** Present for a cold fetch that reached the repositories/contributions step. */
  graphqlByPurpose?: Record<GraphqlPurpose, GraphqlPurposeStats>;
  phases?: FetchPhaseTimings;
}

/** Flat, log-friendly summary of a report: counts and timings only. */
export function summarizeGraphqlCost(report: ProfileFetchReport | undefined): Record<string, number> {
  const by = report?.graphqlByPurpose;
  if (!by) return {};
  return {
    graphql_repository_requests: by.repositories.requests,
    graphql_cursor_requests: by.repository_cursors.requests,
    graphql_contribution_requests: by.contributions.requests,
    graphql_other_requests: by.other.requests,
    graphql_repository_work_ms: by.repositories.ms + by.repository_cursors.ms,
    graphql_contribution_work_ms: by.contributions.ms,
    ...(report.phases
      ? { user_ms: report.phases.userMs, repositories_ms: report.phases.repositoriesMs, contributions_ms: report.phases.contributionsMs }
      : {}),
  };
}
