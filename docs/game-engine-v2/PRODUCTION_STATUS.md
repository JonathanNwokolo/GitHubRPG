# Game Engine V2 — Production status

> Canonical operational status as of 2026-10-08. Historical validation and implementation records remain preserved, but this document is the authority for the current Production state.

## Current status

- The V2 product presentation is active in Production at `https://githubrpg.vercel.app/`.
- Production is global: `GAME_ENGINE_V2_UI_ENABLED` is active and no Production allowlist is configured. In code, an absent or empty allowlist admits every valid profile while the main flag is on.
- The runtime engine version remains `2.0-experimental-v24-evo`, with schema `game-engine-v2-schema-2`. The word `experimental` is part of the versioned runtime identifier; it does not mean that the current UI path is Preview-only.
- V1 remains the base character and the fallback. V2 augments the public profile presentation with V2 identity, Grimório, achievements, titles, and explanations when a V2 character is available.

## Feature flags

Both flags are server-only and are read by `src/data/datasource/config.ts`.

- `GAME_ENGINE_V2_UI_ENABLED` is fail-closed. Only `1`, `true`, `yes`, or `on`, after trim and lowercase normalization, enables V2.
- `GAME_ENGINE_V2_UI_ALLOWLIST` is an optional comma-separated, trim/lowercase username set.
- Priority is main flag first, then allowlist: OFF always returns the V1 presentation; ON plus a populated allowlist enables V2 only for listed usernames; ON plus an absent or empty allowlist enables all valid profiles.
- OFF does not remove V1 or break the profile. It returns `v2Enabled=false`, no V2 projection, and the existing V1-backed UI and consumers continue operating.

Do not place either flag in a `NEXT_PUBLIC_*` variable, and do not record secret values in documentation or logs.

## Delivery states

- `ready`: a fresh cached or newly enriched V2 character is available with complete subclass coverage.
- `partial`: a V2 character is available, but the evidence/subclass coverage is partial. The character is shown with partial-data signaling; partial is not silently promoted to full.
- `stale`: a previously completed final character is past its fresh TTL but still inside its stale window. It is served immediately.
- `enriching`: no final character is cached. The request returns V1 as the visible fallback while background enrichment runs.
- `unavailable`: required evidence is unavailable or delivery failed safely. V1 remains usable; depending on the delivery result, a conservative V2 projection may exist with unavailable decisions, otherwise the V2 projection is absent.

## Cold profile behavior and polling

The current profile flow is:

```text
cold profile request
→ validate existence and build V1
→ V2 cache miss returns enriching with no V2 character
→ Next.js after() keeps the background enrichment alive
→ the page renders the V1 fallback and an enriching status
→ the client polls the safe experimental projection endpoint
→ a completed final character replaces the V1 presentation layer with V2
```

Polling is bounded to six attempts after delays of 4, 4, 8, 12, 16, and 16 seconds (about 60 seconds total). Each request uses `cache: no-store`, omits credentials, and accepts HTTP 202 while enrichment continues. Polling stops when a character arrives, a terminal non-enriching state arrives, the attempt budget ends, or the component unmounts. The server enrichment budget records a soft threshold at 20 seconds and aborts at 55 seconds.

The endpoint and service coalesce work only within the same running instance. Requests landing on different instances can still start duplicate enrichments; polling can finish without adopting V2 if enrichment exceeds the bounded client window or repeatedly lands on an instance that cannot observe the completed entry.

## Cache

- L1 final-character cache: bounded in-memory cache per process, fresh for 1 hour and stale-servable for another 23 hours.
- L2 final-character cache: Vercel Runtime Cache, shared across instances through the same 1-hour fresh plus 23-hour stale policy. An L2 hit hydrates L1.
- Evidence cache: L1 only, fresh for 6 hours with an 18-hour stale window. Stale evidence triggers recollection; evidence is not written to L2 because measured payloads can exceed the provider's 2 MB item limit.
- Tree and manifest helper caches are in-process only (6 hours and 24 hours respectively).
- Successful final characters are cached; evidence with `unavailable` coverage is not cached as a successful result.

Keys are isolated from V1 and versioned by namespace, engine, schema, detector, catalog, balance, normalized username, profile fingerprint, and an hourly UTC reference bucket. L1 disappears on recycle. L2 improves cross-instance reuse but is not a distributed lock, so it does not eliminate cross-instance duplicate work.

## Why V1 still exists

V1 is not legacy dead code. It remains responsible for the base character (level/XP, attributes, resources, skills, and other stable fields), provides the immediate cold/error fallback, and supplies consumers that have not migrated to the V2 public projection. V2 itself deliberately reuses V1 progression and base stats rather than redefining them.

Confirmed current V1 consumers are:

- the base profile character and Chronicle/class-explanation inputs;
- the public `/api/characters/[username]` endpoint and therefore Duel;
- README Badge SVG;
- Hero Card PNG, achievement cards, and Chronicle cards;
- the Hall's base hero objects (with optional cache-only V2 presentation layered on top).

## Rollback

Set the server-only Production flag `GAME_ENGINE_V2_UI_ENABLED` to a false value (prefer `false`) and create a new Production deployment through the existing Git integration. Expected impact:

- all profiles return the V1 presentation path;
- Grimório and V2-only achievement/title presentation disappear;
- level/XP, attributes, skills, Chronicle, Duel, Badge, Hero Card, and real 404 behavior continue through V1;
- no cache purge is required because the disabled gate is evaluated before V2 delivery/cache lookup.

Rollback changes presentation selection only. It does not delete V2 cache data, change engine rules, or expose any secret.

## Deploy and CI

- Git repository: `JonathanNwokolo/GitHubRPG`.
- Production branch: `main`.
- Deployment system: the existing Vercel Git integration; pushes/merges to `main` produce the Production deployment.
- Public domain: `https://githubrpg.vercel.app/`.
- Node.js runtime/build version: 24.x.

CI policy, exact required check names, local reproduction, failure handling, and the non-duplicated Vercel relationship are documented in [CI and release process](../operations/CI.md).

## Minimum post-release smoke

For the exact Production commit, verify:

- Home responds 200 and search/navigation is usable.
- A real profile responds 200.
- The V2 projection endpoint responds 200 when the profile is ready, or 202 only while a cold enrichment is genuinely in progress.
- Grimório appears on a V2-ready profile.
- Hall (Salão) loads its selected category without silently accepting incomplete results.
- Chronicle remains present on the profile.
- Duel responds 200 and loads both V1 character payloads.
- Badge responds 200 with `image/svg+xml`.
- Hero Card responds 200 with `image/png`.
- A definitely nonexistent GitHub username returns a real HTTP 404 with no residual character sheet.
