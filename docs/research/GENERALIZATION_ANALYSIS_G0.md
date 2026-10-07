# Generalization Analysis G0

Date: 2026-10-07  
Engine: `2.0-experimental-v23`  
Balance: `game-engine-v2-balance-v23-r1-signals`  
Matrix: 30 independent profiles, frozen before any V2 result was read.

## Executive diagnosis

**Primary G0 hypothesis: H8 — the subclass model generalizes on independent data; the original holdout is a materially different low-margin cohort.**

The independent matrix produced 12/30 subclasses (40%), compared with 9/30 (30%) in original calibration and 0/10 in the locked holdout. All five archetypes led profiles, cleared score 55, and produced at least one safe winner. Human review found 16 GOOD, 12 ACCEPTABLE, 2 QUESTIONABLE, and 0 BAD: 93.3% GOOD+ACCEPTABLE.

This rejects likely overfit as the primary explanation. The locked holdout remains a significant distribution shift: its average observed margin is 3.62, versus 16.58 in calibration and 18.03 in the independent matrix.

## Baseline result

| Metric | Original calibration | Locked holdout | Independent G0 |
|---|---:|---:|---:|
| Profiles | 30 | 10 | 30 |
| Subclass rate | 30% | 0% | 40% |
| Null rate | 70% | 100% | 60% |
| GOOD | 6 | 0 | 16 |
| ACCEPTABLE | 3 | 8 | 12 |
| QUESTIONABLE | 0 | 2 | 2 |
| BAD | 0 | 0 | 0 |
| Average top score | 57.45 | 67.91 | 62.17 |
| Average observed margin | 16.58 | 3.62 | 18.03 |
| Average guaranteed margin | -5.90 | -16.28 | -7.00 |
| Full coverage | 17 | 4 | 16 |
| Partial-small | 5 | 3 | 7 |
| Partial-large | 8 | 3 | 7 |
| High confidence | 4 | 2 | 4 |

The independent subclass distribution is Architect 1, Artificer 3, Illusionist 2, Guardian 1, Chronomancer 5, null 18.

## Null diagnosis

| Primary blocker | Count | Share of nulls |
|---|---:|---:|
| BOUNDS | 9 | 50.0% |
| SCORE | 7 | 38.9% |
| MARGIN | 1 | 5.6% |
| CONFIDENCE | 1 | 5.6% |
| COVERAGE | 0 | 0% |
| MATURITY | 0 | 0% |
| LEGITIMATE_AMBIGUITY | 0 | 0% |

No profile was blocked merely because coverage was partial. The result depends on score, observed separation, confidence, or whether the missing evidence can mathematically reverse the winner.

## Partial-small diagnosis

There are seven partial-small profiles. All seven have an unsafe winner, none receives a subclass, and none is a safe winner subsequently blocked by another gate.

| User | Top 1 observed | Top 1 lower | Top 2 | Top 2 upper | Guaranteed margin | Confidence | Outcome |
|---|---:|---:|---|---:|---:|---|---|
| bradtraversy | Illusionist 75.28 | 73.40 | Architect | 83.30 | -23.12 | medium | null; observed margin 2.93 |
| wesbos | Architect 65.34 | 58.12 | Illusionist | 91.01 | -38.64 | medium | null; bounds |
| julienschmidt | Guardian 18.54 | 18.54 | Chronomancer | 95.75 | -77.21 | low | null; score |
| orta | Illusionist 69.01 | 65.48 | Artificer | 93.95 | -32.15 | medium | null; bounds |
| bahmutov | Guardian 85.13 | 84.31 | Chronomancer | 96.30 | -11.99 | medium | null; bounds |
| brendangregg | Architect 11.23 | 11.23 | Artificer | 94.32 | -84.48 | low | null; score |
| BurntSushi | Chronomancer 39.63 | 39.51 | Guardian | 83.57 | -54.92 | medium | null; score |

The veto rate is therefore 7/7, but it is not an automatic coverage veto: every interval permits a rival to overtake the observed leader. Relaxing the safe gate would change its mathematical meaning and is not supported by G0.

## Archetype reachability

| Archetype | Top 1 | Top 2 | Score >=45 | Score >=55 | Safe winner |
|---|---:|---:|---:|---:|---:|
| Architect | 3 | 8 | 9 | 8 | 1 |
| Artificer | 5 | 6 | 12 | 11 | 3 |
| Illusionist | 7 | 4 | 12 | 9 | 3 |
| Guardian | 5 | 6 | 9 | 8 | 1 |
| Chronomancer | 10 | 6 | 13 | 10 | 8 |

Architect and Guardian are not structurally unreachable. Both lead five or fewer profiles, clear the strong threshold in eight or more profiles, and produce a real safe subclass in the independent matrix.

The most common rival to Illusionist is Architect (5/7 Illusionist leaders). The most common rival to Chronomancer is Guardian (5/10). Artificer splits mainly against Illusionist and Chronomancer. Architect has no single dominant rival in its three leadership cases.

## Correlation portability

| | Architect | Artificer | Illusionist | Guardian | Chronomancer |
|---|---:|---:|---:|---:|---:|
| Architect | 1.000 | 0.257 | 0.739 | 0.412 | -0.030 |
| Artificer | 0.257 | 1.000 | 0.535 | 0.651 | 0.015 |
| Illusionist | 0.739 | 0.535 | 1.000 | 0.537 | -0.172 |
| Guardian | 0.412 | 0.651 | 0.537 | 1.000 | 0.205 |
| Chronomancer | -0.030 | 0.015 | -0.172 | 0.205 | 1.000 |

R0 calibration had five correlations >=0.75. R1 calibration retained one (`Illusionist`/`Guardian` = 0.800). Independent G0 has zero; its maximum is `Architect`/`Illusionist` = 0.739. R1 discrimination therefore ports beyond the original calibration set.

## Signal portability and counterfactuals

Composite rules activated 84 times: Architect 8 profiles, Artificer 17, Illusionist 15, Guardian 10, Chronomancer 12. They are not sparse or confined to the original matrix.

Removing generic cap 42 offline changed no profile's top score at displayed precision; mean absolute change across all 150 archetype scores was 0.01. The cap is not suppressing real patterns in this matrix and also is not doing material work here. No change is justified.

Replacing configured specificity with uniform weight changes scores by 10.55 points on average, so specificity is materially active. The evidence is distributed across 21 detected technologies. GitHub Actions (19 profiles), ESLint (9), React (8), and Prettier (7) are the most common, but all five archetypes remain reachable and correlations stay below 0.75; no small technology set is shown to dominate the final decisions globally.

## Distribution diagnostics

Top scores: `<30` 2, `30–39` 2, `40–44` 1, `45–49` 0, `50–54` 2, `55–59` 3, `60–69` 9, `70+` 11. The threshold 55 is realistically reachable: 23/30 leaders reach it.

Observed margins: `0–2` 1, `>2–4` 1, `>4–5` 0, `>5–8` 4, `>8–12` 6, `>12` 18. Guaranteed margins: `<0` 14, `0–5` 0, `>5–8` 1, `>8–12` 4, `>12` 11. Coverage uncertainty, not observed score compression, explains most unsafe decisions.

Confidence is high 4, medium 22, low 4. Chronomancer leaders are all medium; Architect and Guardian each have a low-confidence leader. This does not prevent real subclasses for either archetype but remains a limitation of the evidence mix.

## G1 decision

**NENHUMA.**

No single permitted tunable addresses the observed pattern without weakening precision:

- threshold 55 is already reachable and score-blocked nulls lack strong observed evidence;
- margin 5 is not the cause of nine bounds-blocked nulls;
- generic cap 42 has negligible measured impact;
- specificity and composite signals port to the independent matrix;
- bypassing the partial-small safe gate would grant subclasses where the deterministic interval allows a rival to win.

The engine stays `2.0-experimental-v23`; no V24 balance version is created.

## G0 verdict

**SIGNIFICANT DISTRIBUTION SHIFT.** The model generalizes on the independent cohort, while the locked holdout remains unusually compressed and conservative. This is evidence against a globally overfit model, but it does not erase the holdout acceptance shortfall.
