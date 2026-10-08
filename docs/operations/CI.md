# CI and release process

This is the operational reference for the GitHub Actions quality gate and its relationship with Vercel.

## Triggers

The workflow at `.github/workflows/ci.yml` runs for:

- every pull request whose base branch is `main`;
- every push to `main`, including the merge commit that Vercel builds for Production.

The workflow uses Node.js 24, matching the Vercel project, and `npm ci` against the committed `package-lock.json`. It does not read the Production `GITHUB_TOKEN`; tests and builds run with `GITHUB_DATA_SOURCE=mock`.

## Jobs and required checks

The exact required status check names are:

- `Quality` — lint, TypeScript, and the complete Vitest unit/integration suite;
- `Build` — a clean Next.js production build after `Quality` succeeds;
- `E2E` — all Playwright tests against the production build produced by `Build`.

`Build` depends on `Quality`; `E2E` depends on `Build`. The `.next` artifact is produced inside the same workflow run, excludes `.next/cache`, expires after one day, and is never reused by another run. This preserves a single clean build as the artifact tested by E2E.

The full E2E suite runs on pull requests and on pushes to `main`. There is no `continue-on-error` and no secret-dependent test path.

## Merge and release policy

`main` is the Production branch. Changes must arrive through a pull request and all three checks above must succeed on the current head before merge. The branch rule is strict, so the pull request must also be up to date with `main`; administrator enforcement prevents the normal direct-push bypass.

Vercel remains the only deployment system:

1. GitHub Actions validates the pull request.
2. GitHub blocks merge while a required check is pending or failing.
3. After merge, GitHub Actions validates the `main` commit again.
4. The existing Vercel Git integration builds that commit and required Vercel Deployment Checks hold domain promotion until the selected GitHub Actions checks succeed.

The workflow does not install the Vercel CLI, call `vercel deploy`, or create a second deployment pipeline.

## Local reproduction

Use Node.js 24 and run from the repository root:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The E2E configuration starts the already-built application with `next start` on port 3005 and forces deterministic mock data. Rebuild before E2E; do not reuse an old `.next` directory.

## Failure handling

- `Quality / Lint`: reproduce with `npm run lint`; fix the reported source or configuration issue.
- `Quality / Typecheck`: reproduce with `npm run typecheck`; fix the type contract rather than suppressing it.
- `Quality / Unit and integration tests`: reproduce with `npm test`, then narrow to the failing Vitest file only for diagnosis.
- `Build`: remove any stale local `.next`, run `npm run build` with `GITHUB_DATA_SOURCE=mock`, and check for undeclared local files or environment dependencies.
- `E2E`: run a fresh build, then `npm run test:e2e`; inspect the first failing Playwright assertion and server output. Do not add retries or `continue-on-error` merely to make the gate green.

If a required check is renamed, update both GitHub branch protection and Vercel Deployment Checks before merging the rename. A skipped required workflow remains blocking.

## Post-release verification

After a merge, confirm that the GitHub run for the exact Production SHA is green, the Vercel deployment for that SHA is `READY` and promoted only after its checks, and the public smoke checklist in [Game Engine V2 Production Status](../game-engine-v2/PRODUCTION_STATUS.md) passes.
