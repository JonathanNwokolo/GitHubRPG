# Game V2 artifact storage

The large, frozen research inputs and derived raw matrices are intentionally kept outside the current Git tree. They are historical replay inputs, not production/runtime dependencies. Compact summaries, holdouts, evaluations, decision authorities, and rollout evidence remain versioned in `artifacts/`.

## Durable archive

The 119 archived files are split into six phase-oriented `.tar.gz` bundles attached to the dedicated GitHub Release [`game-v2-artifacts-2026-10-08`](https://github.com/JonathanNwokolo/GitHubRPG/releases/tag/game-v2-artifacts-2026-10-08). This release is separate from product releases.

`artifacts/ARTIFACTS_RAW_MANIFEST.json` is the authority for:

- every original repository-relative path;
- individual byte length and SHA-256;
- category, phase, detected engine/schema version, and source commit;
- bundle membership, byte length, SHA-256, and immutable release download URL.

## Restore and verification

Restore all archived files to their original paths:

```bash
npm run artifacts:restore
```

Restore one logical bundle:

```bash
npm run artifacts:restore -- --bundle benchmark-inputs-v21
```

Restore into an isolated directory without changing the working tree:

```bash
npm run artifacts:restore -- --target C:\path\to\isolated-root
```

`ARTIFACTS_RAW_DIR` can be used instead of `--target`. Downloaded bundles are cached under the operating-system temporary directory by default; `ARTIFACTS_BUNDLE_CACHE` can select another cache. `--verify-only` never downloads or extracts and therefore requires both cached bundles and restored files.

The restore command verifies the bundle checksum before extraction, rejects unexpected or unsafe archive entries, and then verifies the byte length and SHA-256 of every restored file. An existing file with different content is never overwritten unless `--force` is supplied explicitly.

## Offline scripts

Historical Game V2 benchmark, calibration, generalization, null-quality, evolution, and performance scripts continue to use their original paths. If the corresponding raws are absent, they stop with the explicit restore command instead of downloading or recollecting data silently. Normal build, tests, API routes, and production runtime do not invoke restore.

The narrow `.gitignore` rules cover only the archived raw groups and the three proven duplicate outputs. The 45 compact authorities remain eligible for version control.
