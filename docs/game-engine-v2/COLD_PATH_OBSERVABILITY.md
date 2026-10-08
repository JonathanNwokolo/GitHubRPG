# Game Engine V2 — cold path observability

Operational contract introduced in Stage 2 on 2026-10-08. It observes the existing architecture (Vercel + GitHub API + L1 + Runtime Cache L2 + `after()`); it does not change collector limits, balance, global rate limiting, or V1/V2 request reuse.

## Polling contract

The browser accepts only contract version `1`, engine `2.0-experimental-v24-evo`, schema `game-engine-v2-schema-2`, known delivery states, and a structurally valid public character. `ready` and usable `partial` are terminal. `unavailable`, incompatible payload, request timeout, rate-limit exhaustion, and attempt exhaustion are explicit terminal UI states; V1 remains the safe fallback. A valid stale character remains visible while refresh polling continues.

The schedule remains 4, 4, 8, 12, 16, and 16 seconds, is sequential, and has a 65-second wall-clock ceiling plus a 10-second per-request ceiling. `Retry-After`/`retryAfterMs` is clamped to 1–60 seconds and never causes an earlier retry. Hidden pages do not start requests; visibility resume performs one immediate lookup. Username changes and unmount abort the old request, clear timers, and remove the visibility listener.

## Structured events

Server logs are one-line JSON and use a random `correlation_id` plus a stable 12-hex SHA-256 `subject_id`; the username itself, tokens, cookies, raw manifests, profile payloads, and evidence are absent.

- `v2_base_loaded`: base/profile duration, base REST/GraphQL counts, cache source.
- `v2_lookup_started`, `v2_cache_hit`, `v2_cache_miss`, `v2_stale_served`: lookup/cache path.
- `v2_enrichment_started`, `v2_enrichment_reused`: local background scheduling/coalescing.
- `v2_collector_started`, `v2_collector_finished`: collector duration, repo-selection/trees/manifests/normalization durations and aggregated request counts.
- `v2_enrichment_summary`, `v2_enrichment_finished`, `v2_enrichment_failed`: compact final result and duration.
- `v2_rate_limited`, `v2_timeout`, `v2_collector_error`: stable error classification without raw upstream bodies.
- `v2_poll_started`, `v2_poll_attempt`: compact server-visible browser attempts.
- `v2_poll_summary`: browser console summary with attempts, elapsed time, terminal result, and hidden pauses. Browser logs are not guaranteed to reach Vercel; server attempt events remain the production source for request-side polling analysis.

Filter Vercel Function logs by the event name, then group a flow by `correlation_id`. Cache sources are `l1`, `l2`, `stale`, `miss`, or `fallback`. No SLO is defined by this stage.

## Known limitation

Runtime Cache has no distributed compare-and-set lock for this flow. Same-process reuse emits `v2_enrichment_reused`; cross-instance duplication cannot be identified reliably without shared coordination, so no `duplicate_suspected` metric is emitted. This is deliberately documented instead of presenting inference as fact.
