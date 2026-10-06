/** Request counters of ONE profile fetch. Internal instrumentation, never sent anywhere. */
export class RequestStats {
  rest = 0;
  graphql = 0;

  get total(): number {
    return this.rest + this.graphql;
  }
}

export type CacheOutcome = "hit" | "miss" | "coalesced" | "not-found-hit";

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
}
