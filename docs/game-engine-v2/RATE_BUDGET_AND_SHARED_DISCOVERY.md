# Rate budget and shared repository discovery

Stage 3 operational contract, implemented on 2026-10-08. The change protects new GitHub work and removes one proven duplicate repository-list request. It does not change V1/V2 balance, public payloads, collector tree/manifest evidence, or deployment infrastructure.

## Evidence and provisional policy

The production sample is intentionally small. Five controlled usernames were read sequentially after the Stage 2 telemetry deployment: `JonathanNwokolo`, `octocat`, `torvalds`, `gaearon`, and `sindresorhus`. Three were cold V2 enrichments and two were L2 hits. No rate-limit, retry, timeout, or same-instance reuse event occurred in that window.

| Metric | Observed value |
| --- | ---: |
| Cold enrichments | 3 / 5 |
| V2 cache hits | 2 / 5 (40%) |
| Average collector REST / cold | 15.7 |
| Observed p90 collector REST / cold | 31 |
| Average collector GraphQL / cold | 1.3 |
| Observed p90 collector GraphQL / cold | 3 |
| Unique usernames | 5 |
| Rate limits / retries / timeouts | 0 / 0 / 0 |
| `v2_enrichment_reused` | 0 |

This is not a statistically stable traffic distribution. The limits below are provisional and deliberately leave large headroom:

- client window: 60 seconds;
- 30 unique cold usernames per authenticated Vercel client address per window;
- 120 cold work admissions per client per window;
- project reserve: stop new cold work when a known REST or GraphQL remaining value is at or below 100 until its reset; for a lower upstream quota, use 20% of that quota (capped at 100), so anonymous REST reserves 12 of 60 instead of failing immediately;
- enrichment concurrency: 2 active plus at most 4 queued per process.

The unique-username limit is six times the complete representative sample. For the normal authenticated quota, the project reserve is more than three times the observed REST p90 and also leaves several observed large GraphQL base loads. Scaling lower upstream quotas prevents the anonymous REST path (limit 60) from being classified as exhausted on its first successful response. GitHub GraphQL `remaining` is a point budget, not a request count, so this is an operational reserve rather than a conversion formula. Recalibrate only after a materially larger production window.

## Public workload map

| Surface | Cost | Cache | Enrichment | Notes |
| --- | --- | --- | --- | --- |
| `/[username]` profile | EXPENSIVE | L1 base + L1/L2 V2 | CAN_TRIGGER_ENRICHMENT | Arbitrary username; V1 streams first. Non-interactive crawlers receive V1/SEO but cannot start V2. |
| `/api/characters/[username]` | MODERATE to EXPENSIVE | CDN + L1 base | CANNOT_TRIGGER_ENRICHMENT | Arbitrary V1 endpoint used by Duel. Client protection is applied only after base L1/negative/in-flight checks. |
| `/api/experimental/v2/characters/[username]` | EXPENSIVE on cold, CHEAP on hit | L1/L2 V2 + L1 base | CAN_TRIGGER_ENRICHMENT | Cache lookup precedes project denial; polling keeps the existing 429 contract. |
| `/api/heroes` / Hall | MODERATE on category cold | CDN + shared base source | CANNOT_TRIGGER_ENRICHMENT | Fixed editorial usernames; cache-only V2 lookup. |
| `/api/badge/[username]` | MODERATE on cold | CDN + L1 base | CANNOT_TRIGGER_ENRICHMENT | Kept outside client limiter so README and Camo fetches are not broken. Project budget still applies to cold GitHub work. |
| Hero, achievement, Chronicle cards | MODERATE on cold | image/CDN + L1 base | CANNOT_TRIGGER_ENRICHMENT | Legitimate social preview consumers remain usable. |
| Duel pages | CHEAP server shell; two V1 API reads in browser | character API caches | CANNOT_TRIGGER_ENRICHMENT | The two arbitrary usernames are protected at `/api/characters`. |
| Chronicle and class explanation | CHEAP after base | same request data | CANNOT_TRIGGER_ENRICHMENT | Derived locally; zero additional GitHub calls. |
| Home, canonical metadata, settings, design system | CHEAP | static/framework | CANNOT_TRIGGER_ENRICHMENT | No GitHub work. |

## Layered protection

1. Username validation runs before GitHub work.
2. Base L1, negative cache, in-flight dedupe, V2 L1/L2, and stale lookup run before a project denial.
3. Client admission uses a SHA-256-derived key from `x-vercel-forwarded-for` only when `x-vercel-id` confirms the request passed through Vercel. Raw addresses are not stored or logged. Outside Vercel this layer fails open because there is no platform-authenticated address.
4. V2 keeps two active enrichments and now bounds the queue at four. Excess cold work is denied for five seconds instead of extending Function duration indefinitely.
5. Confirmed GitHub primary/secondary limits and known critical remaining values open a Runtime Cache circuit. The state is visible across instances and isolated by Vercel environment, so Preview cannot poison Production. After the reset, one probe per process enters half-open; success recovers and failure reopens temporarily.
6. Project denials return HTTP 429 with a bounded integer `Retry-After`. Cached/stale V2 remains usable; product pages keep V1 when V2 cannot start.

GitHub 403 handling remains signal-based: `remaining=0` means primary rate limit; `Retry-After`, HTTP 429, or the official secondary/abuse message means secondary rate limit; other 403 responses remain permission/forbidden failures and do not open the circuit.

## Fail-open and fail-closed decisions

| Condition | Decision |
| --- | --- |
| Telemetry failure | Fail open; delivery is unaffected. |
| Runtime Cache read/write failure | Fail open using local state; no fake global guarantee. |
| Missing trusted client address | Client layer fails open; project budget still applies. |
| Confirmed GitHub rate limit | Fail closed for new cold base/enrichment work. |
| Known remaining budget at reserve | Fail closed until the known reset. |
| Fresh cache hit | Serve. |
| Stale V2 hit during protection | Serve stale; do not schedule refresh. |
| Negative 404 cache hit | Return the cached 404 without enrichment. |
| Non-rate-limit GitHub 403 | Preserve the existing friendly upstream error; do not open the circuit. |

Runtime Cache is not a compare-and-set store. Circuit visibility is cross-instance best effort, but half-open probes and client counters are process-local. Cross-instance enrichment duplication remains unsolved and no distributed lock is claimed.

## Native Vercel controls evaluated

Vercel WAF rate limiting and Bot Protection are available on all plans. Fixed-window WAF limits can globally protect traffic by IP/JA4 before it reaches Functions, and Bot Protection automatically exempts verified crawlers. They remain useful outer layers, particularly in log mode while collecting a larger baseline. They are not used as the project-budget mechanism because they cannot inspect L1/L2 state, GitHub REST versus GraphQL remaining values, or enrichment cost. A broad WAF rule would also rate-limit cheap badge/card/cache hits before the application could serve them.

No PostgreSQL, Redis, queue, worker, VPS, captcha, or new dependency was added.

Official platform references:

- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel Bot Management](https://vercel.com/docs/bot-management)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

## Shared discovery contract

The base GitHub loader now preserves neutral discovery metadata alongside each raw repository: identity, fork/archive/empty state, stars, pushed time, a safe `HEAD` default-branch reference, size, primary language, and per-repository language bytes. GitHub's Trees endpoint resolves `HEAD` to the repository default branch; this avoids the expensive nested `defaultBranchRef` resolver on every GraphQL repository. `RepositoryDiscoverySnapshot` is produced server-side after validation and passed directly to the V2 delivery request.

The V2 collector reuses at most the first 100 repositories in the same pushed order as its historical REST discovery request. This removes only:

```text
GET /users/{username}/repos?type=owner&sort=pushed&direction=desc&per_page=100
```

Trees and manifests remain V2-specific and are still fetched under the same limits. If any discovery metadata is absent, the collector uses its previous safe REST path. The snapshot never enters the public payload or persistent evidence cache.

| Data | V1/base source | V2 source before | Reused? | Risk control |
| --- | --- | --- | --- | --- |
| Profile/base | REST user + normalized base | Already passed as `DeveloperProfile` | Yes, pre-existing | `referenceDate` unchanged. |
| Repository list/order | GraphQL pages of 50, or REST fallback | REST first 100 | Yes | Snapshot is capped to historical 100 window. |
| Fork/archive/empty/stars/pushed/default branch | Base repository query | Same REST list | Yes | Neutral fields; engine V1 ignores discovery metadata. |
| Language bytes | Base GraphQL/REST | V2 list had none | Carried, not substituted for V2 manifest evidence | V1 aggregation unchanged; V2 semantic equality tested. |
| Trees | None | V2 REST tree requests | No | Evidence preserved. |
| Manifests | None | V2 GraphQL batch / REST fallback | No | Evidence preserved. |

## Request delta

The deterministic collector test with identical repository/tree/manifest inputs proves:

| Path | REST before | REST after | GraphQL before | GraphQL after | Semantic result |
| --- | ---: | ---: | ---: | ---: | --- |
| One selected repository, one manifest batch | 2 | 1 | 1 | 1 | Equal except request accounting |

Applying the proven `REST -1` delta to the three controlled cold production profiles gives the expected Preview/Production verification target:

| Profile | REST before | REST after target | GQL before | GQL after target | Total before | Total after target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| octocat | 7 | 6 | 0 | 0 | 7 | 6 |
| torvalds | 9 | 8 | 1 | 1 | 10 | 9 |
| sindresorhus | 31 | 30 | 3 | 3 | 34 | 33 |

These `after` numbers are targets until the exact commit is deployed and its `repository_discovery=reused` telemetry is observed. Latency is not claimed to improve because GitHub variance dominates a single request; request count is the deterministic measure.

## Telemetry and acceptance

Protection events: `client_rate_limited`, `project_budget_denied`, `github_primary_rate_limited`, `github_secondary_rate_limited`, `circuit_opened`, `circuit_half_open`, `circuit_recovered`, `rate_limit_false_positive_suspected`, and `v2_cache_served_during_protection`. A higher authoritative response-header snapshot closes a provisional critical-budget circuit and emits the suspected-false-positive event; confirmed 403/429 circuits are not cleared this way.

Collector/enrichment summaries include `repository_discovery=reused|fetched`. HTTP access logs provide the authoritative total of 429 responses; structured events explain why work was avoided. Tokens, raw addresses, headers, manifests, and usernames are never logged.

Before declaring Stage 3 complete, deploy through the required PR checks, repeat the controlled sample, confirm `REST -1` on cold enrichment, verify semantic/coverage equality, and run the documented Production smoke. Until then this document describes implemented and locally verified behavior, not Production proof.

## Large-profile base latency (Hotfix 3B)

Production evidence: `sindresorhus` cold took `v2_base_loaded` = 56.6 s (24 GraphQL, 1 REST) and the runtime killed the invocation at 60 s, leaving no budget for the collector. The collector was not the cause.

Measured decomposition of those 24 GraphQL requests (local instrumented run, same profile; durations are per request):

| Type | Count | Sequential? | Parallelizable? | Shared? | Needed for V1? |
| --- | ---: | --- | --- | --- | --- |
| `user.repositories` pages (50 repos, languages) | 20 (cap: 1000 repos, `partial`) | Yes: each `after` came from the previous page; ~3.1 s each, ~62 s in total | Not by themselves; yes once the cursors are known | Feeds V1 and the V2 discovery snapshot | Yes |
| `contributionsCollection` x 5 years (reviews included) | 4 (17 account years) | No: 3 at a time, finished in ~6.5 s, off the critical path | Already | No | Yes |
| Reviews as a separate query | 0 | - | - | - | Reviews are `totalPullRequestReviewContributions` inside the contributions requests |

Root cause: the repository cursor chain. Nothing else was on the critical path (the contribution requests ran beside it and ended 55 s earlier).

Probe results (real GitHub, `sindresorhus`): a cursor-only call (`edges { cursor }`, 100 repos) still costs ~2.5 s, so the connection itself is the expensive part, not the languages. `edges[i].cursor` equals the `endCursor` the sequential page would have produced (same repository at position 50, same `endCursor`), and four full pages requested at once took 3.5 s in total, with no degradation.

Change: for profiles with more than `GRAPHQL_PIPELINE_MIN_REPOS` (150) public repositories, `fetchRepositoryPagesPipelined` walks the cursors (10 calls for 1000 repos) and requests each unchanged 50-repository page as soon as its cursor is known, `GRAPHQL_REPO_PAGE_CONCURRENCY` (3) at a time, the first page immediately. Up to 150 repositories the sequential chain is unchanged (small profiles pay nothing). Same query, same page size, same order, same dedupe, same 20-page ceiling, same coverage rules, same REST `/languages` fallback. Every request still goes through `GitHubHttpClient` (limiter of 6, rate-limit gate, Retry-After, transient retry, timeout, abort) and the project circuit around `getProfile`. The next cursor-walk call is queued before the pages it unlocks, so the critical path never waits behind them. A failure anywhere rejects the whole fetch immediately and aborts the siblings; no partial list is returned.

Cost: GraphQL requests go from 24 to 34 for a 1000-repository profile (+10 cursor calls, about +10 GraphQL points of 5000/hour); REST unchanged. Wall clock is bounded by the cursor walk (10 x ~2.7 s) instead of 20 pages x ~3.1 s.

| Metric | Before | After |
| --- | ---: | ---: |
| Base total, local run | 62.7 s (production: 56.6 s) | 32.4 s |
| REST | 1 | 1 |
| GraphQL total | 24 | 34 |
| Repository pages / cursor calls / contributions (incl. reviews) | 20 / 0 / 4 | 20 / 10 / 4 |

Equivalence on real data (both implementations run concurrently against `sindresorhus`): same 1000 repositories in the same order, same flags, languages, discovery fields and coverage (`partial`, the 1000-repository ceiling); contributions, reviews and activity identical; the only difference was one live star count (`awesome`: 516240 vs 516241) and `fetchedAt`.

`v2_base_loaded` now also logs `graphql_repository_requests`, `graphql_cursor_requests`, `graphql_contribution_requests`, `graphql_other_requests`, summed request time (`graphql_repository_work_ms`, `graphql_contribution_work_ms`; concurrent requests add up) and wall-clock phases (`user_ms`, `repositories_ms`, `contributions_ms`). No query text, variables, headers or tokens.

`repository_discovery=reused` did not appear in the failed validation because it is only logged by `v2_collector_finished` / `v2_enrichment_summary`, at the end of the collector, which the runtime timeout prevented from running. The snapshot is built in the same invocation and passed through `deliver(...)` by closure, so it is available to `after()`; nothing was disconnected.
