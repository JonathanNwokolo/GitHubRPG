# Game Engine V2 — Independent Generalization Matrix V24

> **Historical research record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

Status: **FROZEN BEFORE G0**  
Frozen on: 2026-10-07  
Engine at freeze: `2.0-experimental-v23`

This matrix is independent from the 30 original calibration profiles and the 10 locked holdout profiles. Selection used only public-account availability, public repository volume, and intended practice diversity. No V2 score, archetype, subclass, or outcome was inspected before freeze.

## Selection rules

- Public personal GitHub account (`type = User`) verified through the GitHub profile API on 2026-10-07.
- At least 28 public repositories at freeze time; collector eligibility is evaluated separately.
- No username appears in the original 40-profile benchmark.
- Categories describe the practice represented by the public repository set; they are not expected archetypes or human-quality labels.
- A frozen profile may be replaced only for a technical collection error that makes evaluation impossible. Any replacement must be documented before its model result is read.

## Frozen matrix

| # | Username | Selection category | Public repos at freeze | Inclusion reason |
|---:|---|---|---:|---|
| 1 | bradtraversy | frontend/UI | 331 | Broad public web-project set with recurring client-side applications. |
| 2 | wesbos | frontend/UI | 440 | Large public JavaScript and browser-facing project set. |
| 3 | cassidoo | frontend/UI | 194 | Public UI and web application projects with varied repository sizes. |
| 4 | joshwcomeau | frontend/UI | 235 | Public React and interactive-web project set. |
| 5 | adamwathan | frontend/UI | 178 | Public UI-system and web-tool projects. |
| 6 | developit | frontend/UI | 351 | Public client-framework and web-runtime projects. |
| 7 | ry | backend/architecture | 63 | Public runtime and server-oriented repositories. |
| 8 | fatih | backend/architecture | 65 | Public Go service and developer-platform projects. |
| 9 | julienschmidt | backend/architecture | 55 | Public Go HTTP and routing-oriented repositories. |
| 10 | spf13 | backend/architecture | 122 | Public Go application architecture and CLI repositories. |
| 11 | adamchainz | backend/architecture | 1358 | Large public Python/Django maintenance and package set. |
| 12 | tj | backend/architecture | 296 | Public server, CLI, and systems-facing JavaScript/Go repositories. |
| 13 | paulirish | tooling/library | 385 | Public browser tooling and performance-oriented library set. |
| 14 | isaacs | tooling/library | 487 | Large public package and runtime-tooling set. |
| 15 | feross | tooling/library | 148 | Public JavaScript libraries and cross-platform tooling. |
| 16 | lukeed | tooling/library | 345 | Public small libraries, build tools, and server utilities. |
| 17 | orta | tooling/library | 988 | Large public TypeScript and developer-tool repository set. |
| 18 | bahmutov | testing/quality | 1280 | Public browser-testing, CI, and test-example repositories. |
| 19 | vitalets | testing/quality | 197 | Public test tooling and JavaScript library repositories. |
| 20 | boneskull | testing/quality | 605 | Public test-runner, automation, and maintenance repositories. |
| 21 | jquense | testing/quality | 231 | Public UI libraries with recurring testing infrastructure. |
| 22 | geerlingguy | automation/devops | 325 | Public infrastructure automation and configuration repositories. |
| 23 | alexellis | automation/devops | 469 | Public container, delivery, and infrastructure repositories. |
| 24 | lizrice | automation/devops | 102 | Public container, cloud-native, and systems repositories. |
| 25 | brendangregg | automation/devops | 42 | Public observability and operational tooling repositories. |
| 26 | BurntSushi | systems/low-level | 182 | Public Rust and performance-oriented systems repositories. |
| 27 | dtolnay | systems/low-level | 122 | Public Rust compiler/tooling and library repositories. |
| 28 | fasterthanlime | systems/low-level | 511 | Public Rust, networking, and systems-learning repositories. |
| 29 | KrzysztofZablocki | mobile/polyglot | 46 | Public Apple-platform and mobile-tooling repositories. |
| 30 | chrisbanes | mobile/polyglot | 28 | Public Android, Kotlin, and UI-platform repositories. |

## Category distribution

| Category | Count |
|---|---:|
| frontend/UI | 6 |
| backend/architecture | 6 |
| tooling/library | 5 |
| testing/quality | 4 |
| automation/devops | 4 |
| systems/low-level | 3 |
| mobile/polyglot | 2 |

Total: **30 profiles**.

## Independence check

The case-insensitive intersection with the original calibration and locked holdout usernames is empty at freeze time. The original holdout remains locked validation data and is not available to any G0/G1 tuning decision.
