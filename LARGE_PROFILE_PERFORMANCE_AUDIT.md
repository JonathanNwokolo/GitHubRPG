# Large Profile Performance Audit

Date: 2026-10-08  
Scope: GitHub-backed V2 cold path for large public profiles  
Profiles: `antfu`, `sindresorhus`, `yyx990803`, `addyosmani`  
Constraints honored: no timeout, polling, engine, balance, UI, infrastructure, dependency, commit, push, PR, or deploy changes.

## 1. Executive Summary

The current local code completed one bounded cold live pass for all four profiles. `antfu` finished in 20.833 s with legitimate `partial` coverage (180 of 209 manifests fetched); `sindresorhus` finished in 32.739 s with `ready` coverage. Neither profile timed out, hit a GitHub rate limit, or received a 5xx.

The primary bottleneck is the base repository/cursor GraphQL path, not V2 scoring. For `sindresorhus`, repository discovery occupied 28.451 s of 32.739 s total wall time (86.9%). The sum of individual GraphQL request durations was 58.424 s because requests overlap; it must not be mistaken for wall time. Contributions already overlap repository discovery.

For `antfu`, the base path took 13.357 s and enrichment took 7.466 s. Manifest fetch was the largest enrichment phase at 5.286 s. Its `partial` state is caused by the frozen 180-manifest budget, not by runtime timeout.

No new runtime optimization was implemented in this audit. The current branch already contains the safe optimizations that materially address the observed production symptom: pipelined cursor discovery/full repository pages, removal of per-repository default-branch resolution, and reuse of the base repository discovery in enrichment. The live results validate that these changes are effective. Further cold-path changes would require either more concurrency, reduced coverage, or a persistent shared SHA cache; none met all acceptance criteria with the available evidence.

Production readiness remains unconfirmed because this task prohibited deployment and repeated production calls. The conclusion is local live-GitHub evidence, not proof that the currently deployed Vercel revision contains the same code or exhibits the same latency.

## 2. Baseline

The reproducible artifact is `artifacts/large-profile-performance/baseline.json`. The runner is `scripts/largeProfilePerformanceAudit.ts`.

| Profile | Total ms | Base ms | Repository wall ms | Contributions wall ms | Enrichment ms | State |
|---|---:|---:|---:|---:|---:|---|
| antfu | 20,833.00 | 13,356.58 | 13,064 | 5,862 | 7,465.75 | PARTIAL |
| sindresorhus | 32,738.53 | 28,695.07 | 28,451 | 5,782 | 4,038.12 | READY |
| yyx990803 | 12,453.08 | 7,766.03 | 7,515 | 3,200 | 4,679.86 | READY |
| addyosmani | 18,462.16 | 12,546.47 | 12,315 | 3,730 | 5,912.20 | READY |

Method:

- Rate budget was checked first: REST 4857/5000 and GraphQL 4991/5000.
- Exactly one cold local live-GitHub pass was made per profile.
- Profiles ran sequentially to avoid a burst against GitHub.
- Warm and same-SHA checks happened only after the cold pass and issued zero GitHub requests.
- No production endpoint was repeatedly called.

Historical comparison is directional, not a controlled same-data A/B: GitHub data changed between captures. The repository pipeline and engine invariant tests provide the semantic equivalence proof for the orchestration change.

| Profile | Historical ms | Current live ms | Improvement |
|---|---:|---:|---:|
| antfu | 50,257 | 20,833.00 | 58.55% |
| sindresorhus | 52,658 | 32,738.53 | 37.83% |

The `antfu` historical number comes from the preserved benchmark CSV; `sindresorhus` comes from `performance-p0-baseline.json`. These are not claimed as same-day network measurements.

## 3. Critical Path

### `sindresorhus`

1. Base REST user lookup starts the profile.
2. Repository pages and contributions run concurrently.
3. The repository cursor walk is necessarily sequential, but it unlocks full 50-repository pages that run with bounded concurrency 3.
4. Base wall time is therefore set by repositories (28.451 s), not contributions (5.782 s).
5. Enrichment then reuses repository metadata and runs 30 recursive trees concurrently under the collector limit.
6. Three manifest GraphQL batches run with bounded concurrency 2.
7. Scoring and projection consume only 5.34 ms combined.

### `antfu`

1. Base repository discovery sets 13.064 s of the 13.357 s base path.
2. Tree discovery takes 2.094 s.
3. Six manifest batches take 5.286 s and form the enrichment critical path.
4. Scoring and projection consume 10.66 ms combined.

The engine is not the cause. Normalization, scoring, and projection are all millisecond-scale.

## 4. Request Breakdown

Counts below include the base pipeline and enrichment.

| Profile | REST | GraphQL | Base repo pages | Cursor calls | Contributions | Trees | Manifest batches |
|---|---:|---:|---:|---:|---:|---:|---:|
| antfu | 31 | 23 | 9 | 5 | 3 | 30 | 6 |
| sindresorhus | 31 | 37 | 20 | 10 | 4 | 30 | 3 |
| yyx990803 | 31 | 13 | 4 | 2 | 4 | 30 | 3 |
| addyosmani | 31 | 19 | 8 | 4 | 4 | 30 | 3 |

The 31 REST calls are one base user lookup plus 30 trees. Repository discovery is not fetched again by the collector.

Historical collector-only versus current collector-only:

- `antfu`: REST 31 -> 30; GraphQL 6 -> 6; trees 30 -> 30; manifest batches 6 -> 6.
- `sindresorhus`: REST 31 -> 30; GraphQL 3 -> 3; trees 30 -> 30; manifest batches 3 -> 3.

The one REST request removed is the duplicated collector repository listing.

## 5. Repository Discovery

The base pipeline collects up to 1,000 repositories with 50 repositories per GraphQL page. Large profiles use a cursor-only walk (100 cursors per request) to learn page boundaries. Full pages begin as soon as their boundary is known and use bounded concurrency 3.

The collector consumes a neutral snapshot of the first 100 base repositories. It reuses:

- repository id and name;
- fork/archive/empty state;
- stars and pushed date;
- language bytes;
- size and primary language;
- a `HEAD` ref accepted by Git Trees in place of resolving every default branch.

Result: `repositoryDiscovery` was `reused` for every measured profile and enrichment made no repository-list request.

## 6. Tree Analysis

| Profile | Repositories analyzed | Recursive trees | Tree ms | Tree cache hits on revisit | Tree misses on revisit |
|---|---:|---:|---:|---:|---:|
| antfu | 30 | 30 | 2,094 | 30 | 0 |
| sindresorhus | 30 | 30 | 1,830 | 30 | 0 |
| yyx990803 | 30 | 30 | 1,691 | 30 | 0 |
| addyosmani | 30 | 30 | 1,893 | 30 | 0 |

No safe tree overfetch was confirmed. Repository selection already excludes forks, archives, and empty repositories, then uses the frozen deterministic ranking. Skipping another repository based on size, stars, or primary language would risk excluding a small but semantically important tooling repository.

All calls use `recursive=1`. The live runs reported no tree failure, timeout, or rate-limit error. The current accounting does not expose a separate per-profile `treesTruncated` field in the audit artifact; coverage logic still includes truncation in the final state.

## 7. Manifest Analysis

| Profile | Discovered | Fetched | Skipped by budget | Manifest ms | SHA manifest hits on revisit |
|---|---:|---:|---:|---:|---:|
| antfu | 209 | 180 | 29 | 5,286 | 180 |
| sindresorhus | 74 | 74 | 0 | 2,187 | 74 |
| yyx990803 | 67 | 67 | 0 | 2,945 | 67 |
| addyosmani | 85 | 85 | 0 | 3,975 | 85 |

Candidates are deterministic and tiered. Tier A manifests are spread across project roots before the remaining Tier A/B/C order. The code deduplicates paths and uses immutable blob SHA cache keys.

No avoidable manifest overfetch was proven. A manifest can only be shown to contribute no school/artifact evidence after its content is fetched and parsed. Pre-filtering by repository size, stars, or language is not semantically equivalent. The `antfu` limit already produces `partial` coverage; reducing work further would regress coverage.

GraphQL manifest batches already overlap with bounded concurrency 2. The REST fallback inside a failed GraphQL batch is serial, but it was not on the successful measured path. Parallelizing that fallback could exceed the intended request envelope when two failed batches overlap, so it was not changed.

## 8. Cache Analysis

Cold character lookup is a miss by definition. Final characters have L1 and Vercel Runtime Cache L2. Normalized evidence, trees, and manifests remain process-local because prior measurements found some evidence payloads above the provider's 2 MiB object limit.

Same-process SHA revisit results:

| Profile | Warm ms | REST | GraphQL | Total SHA hits | Semantic match |
|---|---:|---:|---:|---:|---|
| antfu | 80.12 | 0 | 0 | 210 | YES |
| sindresorhus | 20.09 | 0 | 0 | 104 | YES |
| yyx990803 | 39.10 | 0 | 0 | 97 | YES |
| addyosmani | 39.69 | 0 | 0 | 115 | YES |

L1 final-character lookup measured 0.04-0.20 ms. Local cache write measured 2.77-3.64 ms. L2 was not available in this local run and is not claimed as tested.

Missed opportunity: immutable tree/blob SHA cache data cannot currently be reused across cold Vercel instances. This is real but not yet an acceptable implementation target: persisting thousands of per-SHA entries needs quota, object-count, eviction, and cost measurements. Adding Redis/PostgreSQL was explicitly out of scope.

## 9. Serialization Findings

No accidental serialization was found on the successful critical path:

- repositories and contributions overlap;
- cursor discovery is sequential because each cursor page depends on the preceding cursor;
- full repository pages overlap as soon as cursors become available;
- tree requests use bounded parallelism;
- manifest batches use bounded parallelism;
- scoring and projection are synchronous but negligible.

The serial REST fallback after a failed manifest batch is a failure-path observation, not the measured root cause. It was not modified without a safe global limiter proof.

## 10. Optimization Candidates

| Candidate | Expected effect | Safety result | Decision |
|---|---|---|---|
| Raise repository page concurrency | Lower base time | Could worsen secondary limits and global saturation | Reject now |
| Raise manifest batch concurrency | Lower `antfu` enrichment | No controlled rate-limit proof | Reject now |
| Skip low-star/small repositories | Fewer trees/manifests | Changes semantic coverage | Reject |
| Stop after apparent class/subclass stability | Fewer manifests | No proven upper-bound equivalence for all schools/artifacts/titles | Reject |
| Persist tree/blob SHA cache across instances | Faster revisits | Needs provider quota/cost/eviction evidence | Future measurement |
| Parallelize failed-batch REST fallback | Faster degraded path | May exceed request envelope; no normal-path benefit | Defer |
| Reuse base repository snapshot | Removes duplicate REST list | Proven equivalent | Already present |
| Pipeline cursor walk and full pages | Reduces large-profile base wall time | Proven by invariant tests | Already present |

## 11. Changes Implemented

No public runtime optimization was added during this audit.

Audit-only additions:

- `scripts/largeProfilePerformanceAudit.ts`: bounded, reproducible measurement runner.
- `artifacts/large-profile-performance/baseline.json`: one-pass live results.
- `LARGE_PROFILE_PERFORMANCE_AUDIT.md`: this report.

The current runtime already contains the safe performance changes validated here. No timeout, concurrency limit, engine, balance, UI, polling, infrastructure, or dependency setting was changed.

## 12. Semantic Equivalence

Evidence:

- Same-SHA cold/warm semantic hashes matched 4/4.
- Repository pipeline tests compare sequential and pipelined outputs, ordering, languages, coverage, fallback targets, and V1 character results.
- Focused performance tests: 49/49 passed.
- V2 suite: 108/108 passed.
- Full suite: 1,196/1,196 passed.
- V1/game validation command passed; Vitest also followed imported V2 tests, yielding 319/319.
- No coverage regression occurred in the live matrix: `antfu` remained truthfully partial; the other three profiles were ready/full.

Live GitHub data changed relative to historical artifacts. Manifest discovery counts and exact semantic hashes must not be compared across dates as if the source data were frozen.

## 13. Before/After

No new optimization was implemented, so there is no same-run before/after pair created by this audit. The historical/current comparison below validates the effect of optimizations already present in the checked-out code.

### `antfu`

- Before: 50,257 ms historical; collector REST 31, GraphQL 6, trees 30, manifest batches 6.
- After: 20,833 ms current live; collector REST 30, GraphQL 6, trees 30, manifest batches 6.
- Wall-clock improvement: 58.55% directional.
- Final state: PARTIAL, caused by 180/209 manifest coverage, not timeout.

### `sindresorhus`

- Before: 52,658 ms historical; collector REST 31, GraphQL 3, trees 30, manifest batches 3.
- After: 32,738.53 ms current live; collector REST 30, GraphQL 3, trees 30, manifest batches 3.
- Wall-clock improvement: 37.83% directional.
- Final state: READY.

## 14. Remaining Bottlenecks

1. Large-profile base repository discovery is still the dominant cold cost, especially the dependent cursor walk.
2. `antfu` manifest batches are the dominant enrichment cost, but reducing their number would reduce already-partial coverage.
3. SHA caches are excellent on a warm process but not shared across cold instances.
4. L2 final-character cache helps after a completed enrichment, but it cannot make the first analysis cheaper.
5. The audit cannot establish the deployed Vercel revision or production-region latency because no deploy or production validation was authorized.

## 15. Production Recommendation

Keep the current timeouts, V1 fallback, polling, engine, balance, request limits, and infrastructure unchanged.

The checked-out code is locally ready for a controlled Preview validation: one cold request each for `antfu` and `sindresorhus`, unique correlation ids, and a wait for the terminal enrichment log. HTTP 202 alone is not acceptance. Production should not be declared fixed until logs show `v2_enrichment_finished` for the deployed revision, with no timeout/rate-limit/5xx and the expected `partial` or `ready` state.

Do not increase concurrency merely to chase a lower benchmark. If production remains slow after confirming this code is deployed, the next evidence-gathering step is per-request latency/cost telemetry for the cursor walk and repository pages in Vercel `iad1`, followed by a bounded experiment. Shared SHA persistence should only be considered after measuring cross-instance miss frequency, payload sizes, entry counts, and provider cost.

## Validation

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- Focused repository/collector/delivery tests: PASS, 49/49
- V1/game command: PASS, 319/319 (Vitest included imported V2 tests)
- V2 suite: PASS, 108/108
- Full suite: PASS, 1,196/1,196; existing React `act(...)` warnings remain non-failing
- `npm run build`: PASS
- E2E: NOT RUN; no public runtime or UI code changed in this audit
- Commit/push/PR/deploy: NOT PERFORMED
