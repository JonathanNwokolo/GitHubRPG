# Game Engine V2 — Preview Validation

## Status

`PREVIEW FAILED — DO NOT ROLLOUT`

The core delivery chain worked in real Vercel Preview infrastructure, but the requested validation is incomplete. The Preview has no `GITHUB_TOKEN`, exhausted the anonymous GitHub primary limit, and could not finish the real-user/profile matrix, Badge/Card smoke, or protected-deployment browser evidence. Google Chrome was not available to the automation session.

Production was not changed. The engine remains `2.0-experimental-v24-evo`; promotion to `2.0` is **NO**.

## Preview Deployment

- URL: `https://githubrpg-nq4tvkffi-jonathans-projects-3d942e5c.vercel.app`
- Deployment ID: `dpl_Hyhz8c9G7EnD9vqZCaE1eUEkB9LX`
- Environment: Preview
- Created: 2026-10-07 21:26:11 BRT
- Branch: `main`
- Commit: `92e6340f83a4cafae93d44e28d01caf533def556`
- Protection: Vercel Authentication

## Preview Environment

- `GAME_ENGINE_V2_UI_ENABLED=true`
- `GAME_ENGINE_V2_UI_ALLOWLIST=JonathanNwokolo`
- `GITHUB_DATA_SOURCE=github`
- `GITHUB_TOKEN`: not configured in Preview

Production still listed only hidden `GITHUB_DATA_SOURCE` and `GITHUB_TOKEN`; the V2 flag and allowlist remained absent/default OFF.

## Core Runtime Proof

The first experimental request returned HTTP 202 with `state=enriching`, `source=fallback`, `enrichmentStarted=true`, and `lookupMs=14`. Fourteen seconds later, including CLI overhead, a second request returned HTTP 200 `partial` from L1 with `lookupMs=0`, proving that `after()` continued and completed the enrichment.

A fresh Preview deployment then returned the same character from `source=l2` with `lookupMs=16`. That deployment had no process-local L1 from the previous deployment, so this is valid shared Runtime Cache evidence. The final restored Preview also returned L2 in 18 ms, followed by L1 on the next request.

Real stale-while-revalidate was not forced: character freshness is one hour and no Preview-only TTL override exists. Unit coverage proves stale serving and one background revalidation, but real Preview SWR remains `NOT FULLY PROVEN`.

## Product and Security Proof

`JonathanNwokolo` rendered HTTP 200 with `5/54` achievements, `2/40` titles, Grimório, partial copy, a null subclass without a placeholder, and no evolution. Locked secret achievements rendered `???` and `Conquista desconhecida`; no requirement/progress was present.

`torvalds` and `ahejlsberg`, both outside the allowlist at the time of testing, rendered V1 with totals `/31` and `/27` and no Grimório. A nonexistent username returned a real HTTP 404.

The public payload contained no bounds, guaranteed margins, raw manifests, source files, or request accounting. No token appeared in response headers, body, client payload, or runtime logs.

## Hall, Duel, Chronicle, Badge and Share

- Hall `web`: HTTP 200, 5/5 heroes, 0 failed, 0 pending, complete response.
- Hall V2 fan-out: none in the final configuration because only `JonathanNwokolo` is allowlisted and no Hall profile matches it.
- Duel: Preview route HTTP 200; automated flows confirm Duel remains V1 and responsive.
- Chronicle, Badge, Share, metadata and accessibility contracts passed automated tests.
- Badge and Hero Card live Preview smoke returned HTTP 429 because Preview was using anonymous GitHub access. They are not marked PASS.

## Rollback Proof

Flag OFF Preview `dpl_6ki4ecczRhKTyckZbqhjo7DCQm5h` restored `5/31`, `2/27`, and hid Grimório without clearing cache.

Flag ON with `JonathanNwokolo` removed from the allowlist in Preview `dpl_6mARAfDR5EQ5xHbEGRCdJYoPvNpT` produced the same V1 result. The final Preview restored the original restricted allowlist and returned V2 from L2.

## Automated Validation

- lint: PASS
- typecheck: PASS
- unit: PASS, 80 files and 1086 tests
- build: PASS
- V1 balance: PASS, 12/12 invariants
- V2 balance: PASS, 46/46 invariants; 22 Schools, 22 Artifacts, 54 achievements, 40 titles
- E2E: PASS, 54/54
- protected V1/Duel/snapshot diff: empty

Three local test-only stability fixes were required: one repeated accessible-name scan was collapsed into a single scan; one dynamic-modal assertion received a 5 s wait; the six-viewport E2E received a 60 s budget and the Duel copy-status assertion a 10 s wait. No product, engine, balance, API, or UI runtime code changed.

## Dependency Audit

`npm audit --omit=dev` reported two runtime-graph PostCSS advisories through `next@15.5.27` / nested `postcss@8.4.31` (one moderate, one high). The reported exploit paths require processing attacker-controlled CSS/source maps; no runtime endpoint in this application accepts or processes CSS input. The finding remains open because the offered remediation is the breaking upgrade to Next 16.4.0; no forced fix was run.

## Known Limitations

- No distributed lock across instances.
- A first cold V2 result does not update the already rendered page automatically.
- Real Preview SWR remains unproven because of the one-hour TTL.
- Anonymous Preview GitHub access is operationally insufficient for the requested matrix.
- Chrome screenshots and manual visual/accessibility verification remain absent.

## Production Rollout Recommendation

`PREVIEW FAILED — DO NOT ROLLOUT`

Do not activate Production yet. First scope the existing server-only GitHub token to Preview, redeploy, and rerun the blocked real-user matrix, Badge/Card smoke, duplicate enrichment, stale behavior, browser accessibility/responsive pass, and screenshots. After that passes, the conservative next recommendation should be `READY FOR PRODUCTION ALLOWLIST`, with `GAME_ENGINE_V2_UI_ENABLED=true` and a small explicit allowlist for several hours to one day while monitoring cache hits, V1 fallback, enrichment success/failure, runtime-cache errors, `after()` errors, route latency, and cold enrichments.

## Stop Conditions and Rollback Plan

Stop a future rollout on V1 breakage, material profile-latency regression, systematic Runtime Cache or `after()` failure, secret/raw evidence exposure, unexpected Hall fan-out, or failed rollback.

Rollback remains `GAME_ENGINE_V2_UI_ENABLED=false` followed by a new deployment. Do not clear cache or localStorage. Do not promote the engine version as part of UI rollout.

## Files Changed

- Test-only stability patches in `src/app/[username]/CharacterPageSharing.test.tsx`, `src/app/[username]/CharacterPageClient.test.tsx`, and `e2e/flows.spec.ts`.
- Validation records under `artifacts/game-v2-preview/`.
- This report.

No commit or push was created.

## Conclusion

**A Game Engine V2 está validada em Preview e pronta para iniciar rollout controlado em Production? NÃO.**

The runtime architecture passed its central real-infrastructure proof, but missing Preview authentication and missing Chrome evidence leave required acceptance items unresolved.
