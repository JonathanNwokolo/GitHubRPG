/**
 * An in-memory GitHub for tests: a `fetch` replacement that serves REST and GraphQL
 * from plain data, counts calls and can inject failures. No network, ever.
 */

export interface FakeRepo {
  name: string;
  fork?: boolean;
  stars?: number;
  forks?: number;
  /** KB; 0 = empty repository. Defaults to 10. */
  size?: number;
  languages?: Record<string, number>;
  /** Status the /languages call answers with instead of 200. */
  languagesStatus?: number;
  /** GraphQL answers `languages: null` for this repository (blocked, unreadable). */
  languagesNull?: boolean;
}

export interface FakeYear {
  commits?: number;
  pullRequests?: number;
  issues?: number;
  reviews?: number;
}

export interface FakeGitHubOptions {
  login?: string;
  type?: string;
  name?: string | null;
  createdAt?: string;
  followers?: number;
  /** Defaults to repos.length. */
  publicRepos?: number;
  repos?: FakeRepo[];
  /** Page size used for /repos pagination (GitHub's is 100). */
  pageSize?: number;
  /** date -> contribution count. */
  days?: Record<string, number>;
  /** Totals per year. Missing years answer zeros. */
  years?: Record<number, FakeYear>;
  missingUser?: boolean;
  /** Sent as headers on every response. */
  rateLimitHeaders?: Record<string, string>;
}

export interface FakeCall {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  graphqlQuery?: string;
  graphqlVariables?: Record<string, unknown>;
}

function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function headersOf(init: RequestInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) out[key.toLowerCase()] = value;
  return out;
}

export function createFakeGitHub(options: FakeGitHubOptions = {}) {
  const calls: FakeCall[] = [];
  const state = { inFlight: 0, maxInFlight: 0 };
  /** Optional per-request hook: return a Response to override the answer. */
  const overrides: Array<(call: FakeCall) => Response | Promise<Response> | undefined> = [];

  const login = options.login ?? "octo-dev";
  const repos = options.repos ?? [];
  const pageSize = options.pageSize ?? 100;
  const days = options.days ?? {};

  function rest(call: FakeCall): Response {
    const base = `/users/${login.toLowerCase()}`;
    const path = call.path.toLowerCase();

    if (path === base) {
      if (options.missingUser) return json({ message: "Not Found" }, { status: 404 });
      return json({
        login,
        type: options.type ?? "User",
        name: options.name === undefined ? "Octo Dev" : options.name,
        bio: null,
        location: null,
        company: null,
        created_at: options.createdAt ?? "2019-03-10T12:00:00Z",
        followers: options.followers ?? 12,
        public_repos: options.publicRepos ?? repos.length,
      });
    }

    if (path === `${base}/repos`) {
      const page = Number(call.query.get("page") ?? "1");
      const slice = repos.slice((page - 1) * pageSize, page * pageSize);
      const hasNext = page * pageSize < repos.length;
      return json(
        slice.map((repo) => ({
          name: repo.name,
          owner: { login },
          fork: repo.fork ?? false,
          stargazers_count: repo.stars ?? 0,
          forks_count: repo.forks ?? 0,
          size: repo.size ?? 10,
        })),
        { headers: hasNext ? { link: `<https://api.github.com/x?page=${page + 1}>; rel="next"` } : {} }
      );
    }

    const languagesMatch = /^\/repos\/([^/]+)\/([^/]+)\/languages$/.exec(call.path);
    if (languagesMatch) {
      const repo = repos.find((r) => r.name === decodeURIComponent(languagesMatch[2]));
      if (!repo) return json({ message: "Not Found" }, { status: 404 });
      if (repo.languagesStatus) return json({ message: "unavailable" }, { status: repo.languagesStatus });
      return json(repo.languages ?? {});
    }

    return json({ message: "Not Found" }, { status: 404 });
  }

  /** user.repositories(first, after) with languages(first: $langs): cursors are "c<offset>". */
  function repositoriesPage(call: FakeCall): Response {
    const variables = call.graphqlVariables ?? {};
    const first = Math.min(Number(variables.first ?? 100), 100);
    const langs = Number(variables.langs ?? 10);
    const offset = typeof variables.after === "string" ? Number(variables.after.slice(1)) : 0;
    const end = Math.min(offset + first, repos.length);
    const nodes = repos.slice(offset, end).map((repo) => {
      const entries = Object.entries(repo.languages ?? {}).sort((a, b) => b[1] - a[1]);
      return {
        name: repo.name,
        isFork: repo.fork ?? false,
        stargazerCount: repo.stars ?? 0,
        forkCount: repo.forks ?? 0,
        languages: repo.languagesNull
          ? null
          : {
              totalCount: entries.length,
              edges: entries.slice(0, langs).map(([name, size]) => ({ size, node: { name } })),
            },
      };
    });
    return json({
      data: {
        user: {
          repositories: {
            pageInfo: { hasNextPage: end < repos.length, endCursor: nodes.length > 0 ? `c${end}` : null },
            nodes,
          },
        },
      },
    });
  }

  function graphql(call: FakeCall): Response {
    const query = call.graphqlQuery ?? "";
    if (options.missingUser) {
      return json({ data: { user: null }, errors: [{ type: "NOT_FOUND", message: "Could not resolve to a User" }] });
    }
    if (query.includes("repositories(")) return repositoriesPage(call);
    const user: Record<string, unknown> = {};

    for (const match of query.matchAll(/y(\d{4}): contributionsCollection/g)) {
      const year = Number(match[1]);
      const totals = options.years?.[year] ?? {};
      const yearDays = Object.entries(days)
        .filter(([date]) => date.startsWith(`${year}-`))
        .map(([date, count]) => ({ date, contributionCount: count }));
      user[`y${year}`] = {
        totalCommitContributions: totals.commits ?? 0,
        totalPullRequestContributions: totals.pullRequests ?? 0,
        totalIssueContributions: totals.issues ?? 0,
        totalPullRequestReviewContributions: totals.reviews ?? 0,
        // Real calendars are padded to whole weeks: spill a zero day into the neighbouring year.
        contributionCalendar: {
          weeks: [
            { contributionDays: [{ date: `${year - 1}-12-31`, contributionCount: 0 }, ...yearDays] },
          ],
        },
      };
    }
    return json({ data: { user } });
  }

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = headersOf(init);
    const graphqlBody =
      url.pathname === "/graphql"
        ? (JSON.parse(String(init?.body)) as { query: string; variables?: Record<string, unknown> })
        : undefined;
    const call: FakeCall = {
      method: init?.method ?? "GET",
      path: url.pathname,
      query: url.searchParams,
      headers,
      graphqlQuery: graphqlBody?.query,
      graphqlVariables: graphqlBody?.variables,
    };
    calls.push(call);

    state.inFlight++;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    try {
      // Yield so concurrent callers genuinely overlap.
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      for (const override of overrides) {
        const answer = await override(call);
        if (answer) return answer;
      }
      const response = url.pathname === "/graphql" ? graphql(call) : rest(call);
      for (const [key, value] of Object.entries(options.rateLimitHeaders ?? {})) response.headers.set(key, value);
      return response;
    } finally {
      state.inFlight--;
    }
  };

  return {
    fetch: fakeFetch,
    calls,
    overrides,
    state,
    count: (kind: "rest" | "graphql") => calls.filter((c) => (c.path === "/graphql") === (kind === "graphql")).length,
    languageCalls: () => calls.filter((c) => c.path.endsWith("/languages")),
    repositoryPageCalls: () => calls.filter((c) => c.graphqlQuery?.includes("repositories(")),
  };
}

export type FakeGitHub = ReturnType<typeof createFakeGitHub>;
