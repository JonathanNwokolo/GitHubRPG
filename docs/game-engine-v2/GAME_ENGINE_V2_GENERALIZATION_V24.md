# Game Engine V2 — Etapa 3E

> **Historical record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

## Status

Etapa 3E executada em 2026-10-07. V1.1 permanece congelada; V2 permanece experimental. Nenhuma alteração foi feita em frontend, API pública, Duel, Chronicle, collector, bounds, catálogo, classes, subclasses, conquistas, títulos ou gates de evolução. Não houve commit, push, deploy ou promoção.

## Independent Matrix

Perfis: **30 públicos e novos**.  
Categorias: frontend/UI 6; backend/architecture 6; tooling/library 5; testing/quality 4; automation/devops 4; systems/low-level 3; mobile/polyglot 2.

## Freeze

Confirmado. `GAME_ENGINE_V2_GENERALIZATION_MATRIX_V24.md` e `artifacts/game-v2-generalization/matrix-v24.json` foram criados antes de executar o modelo. A interseção case-insensitive com os 40 perfis anteriores é vazia. Nenhum perfil foi substituído após a leitura de resultados.

## G0 — V23 Baseline

### Subclass rate

12/30 = **40%**.

### Null rate

18/30 = **60%**.

### Distribution

Architect 1; Artificer 3; Illusionist 2; Guardian 1; Chronomancer 5; null 18.

### Coverage

Full 16 (53.3%); partial-small 7 (23.3%); partial-large 7 (23.3%); unavailable 0.

### Confidence

High 4 (13.3%); medium 22 (73.3%); low 4 (13.3%); unavailable 0.

## Generalization Comparison

| Métrica | Original Calibration | Original Holdout | Independent |
|---|---:|---:|---:|
| Subclass rate | 30% | 0% | 40% |
| Null rate | 70% | 100% | 60% |
| GOOD | 6 | 0 | 16 |
| ACCEPTABLE | 3 | 8 | 12 |
| QUESTIONABLE | 0 | 2 | 2 |
| BAD | 0 | 0 | 0 |
| Avg top score | 57.45 | 67.91 | 62.17 |
| Avg observed margin | 16.58 | 3.62 | 18.03 |
| Avg guaranteed margin | -5.90 | -16.28 | -7.00 |
| Full coverage | 17 | 4 | 16 |
| Partial-small | 5 | 3 | 7 |
| Partial-large | 8 | 3 | 7 |
| High confidence | 4 | 2 | 4 |

## G0 Human Evaluation

GOOD: 16  
ACCEPTABLE: 12  
QUESTIONABLE: 2  
BAD: 0

GOOD + ACCEPTABLE = **93.3%**. Classified profiles: 7 GOOD, 4 ACCEPTABLE, 1 QUESTIONABLE. Null profiles: 9 GOOD, 8 ACCEPTABLE, 1 QUESTIONABLE. A null foi considerado GOOD quando baixa evidência ou ambiguidade real tornava a não classificação a decisão correta.

## Null Diagnostics

| Blocker | Count | % |
|---|---:|---:|
| BOUNDS | 9 | 50.0% |
| SCORE | 7 | 38.9% |
| MARGIN | 1 | 5.6% |
| CONFIDENCE | 1 | 5.6% |
| COVERAGE | 0 | 0% |
| MATURITY | 0 | 0% |
| LEGITIMATE_AMBIGUITY | 0 | 0% |

## Partial-small Analysis

Total: 7  
Safe: 0  
Unsafe: 7  
Subclass: 0  
Blocked by other gate after being safe: 0

Coverage partial não bloqueou sozinha. Nos sete casos, o intervalo permitia matematicamente que outro arquétipo invertesse o vencedor; portanto o null preserva a regra definida. A tabela completa está em `docs/research/GENERALIZATION_ANALYSIS_G0.md`.

## Arquiteto Analysis

Architect foi top1 em 3 perfis, top2 em 8, atingiu >=45 em 9, >=55 em 8 e foi safe winner em 1. `adamchainz` recebeu Architect com Django recorrente, full coverage e margem garantida 18.47. O zero anterior não era falta estrutural de reachability; era distribuição da matriz original e competição elevada com Illusionist/Chronomancer.

## Guardião Analysis

Guardian foi top1 em 5, top2 em 6, atingiu >=45 em 9, >=55 em 8 e foi safe winner em 1. `paulirish` recebeu Guardian com full coverage e margem 9.65, mas a força semântica dessa concessão foi marcada QUESTIONABLE porque a evidência de testing visível é estreita. Outros líderes Guardian ficaram null por bounds parciais ou score baixo. Reachability existe; precisão semântica ainda merece observação.

## Archetype Reachability

| Archetype | Top1 | Top2 | >=45 | >=55 | Safe Winner |
|---|---:|---:|---:|---:|---:|
| Architect | 3 | 8 | 9 | 8 | 1 |
| Artificer | 5 | 6 | 12 | 11 | 3 |
| Illusionist | 7 | 4 | 12 | 9 | 3 |
| Guardian | 5 | 6 | 9 | 8 | 1 |
| Chronomancer | 10 | 6 | 13 | 10 | 8 |

## Correlation Matrix

| | Architect | Artificer | Illusionist | Guardian | Chronomancer |
|---|---:|---:|---:|---:|---:|
| Architect | 1.000 | 0.257 | 0.739 | 0.412 | -0.030 |
| Artificer | 0.257 | 1.000 | 0.535 | 0.651 | 0.015 |
| Illusionist | 0.739 | 0.535 | 1.000 | 0.537 | -0.172 |
| Guardian | 0.412 | 0.651 | 0.537 | 1.000 | 0.205 |
| Chronomancer | -0.030 | 0.015 | -0.172 | 0.205 | 1.000 |

Excessivas (|r| >= 0.75): R0 5; R1 calibration 1; Independent 0.

## Composite Signal Portability

84 ativações. Perfis com pelo menos um composto por arquétipo: Architect 8, Artificer 17, Illusionist 15, Guardian 10, Chronomancer 12. Os compostos não ficaram específicos à matriz original.

## Generic Cap Analysis

Contrafactual offline sem cap: nenhuma mudança de top score na precisão reportada; delta absoluto médio nos 150 scores = 0.01. O cap 42 não está impedindo padrões reais na nova matriz e não há evidência para alterá-lo.

## Specificity Analysis

Trocar specificity configurada por peso uniforme muda os scores em média 10.55 pontos, mostrando que a lógica está ativa. Houve evidência em 21 tecnologias. As mais frequentes foram GitHub Actions 19, ESLint 9, React 8 e Prettier 7. Mesmo assim, todos os arquétipos foram alcançáveis e nenhuma correlação independente excedeu 0.75.

## Score Distribution

Top1: `<30` 2; `30–39` 2; `40–44` 1; `45–49` 0; `50–54` 2; `55–59` 3; `60–69` 9; `70+` 11. O threshold 55 foi alcançado por 23/30 líderes.

## Margin Distribution

Observed: `0–2` 1; `>2–4` 1; `>4–5` 0; `>5–8` 4; `>8–12` 6; `>12` 18.

Guaranteed: `<0` 14; `0–5` 0; `>5–8` 1; `>8–12` 4; `>12` 11. Observed e guaranteed não foram misturados.

## Confidence Analysis

High 4, medium 22, low 4. Todos os 10 líderes Chronomancer são medium; Architect tem 2 medium/1 low, Guardian 4 medium/1 low, Artificer 2 high/3 medium, Illusionist 2 high/3 medium/2 low. Architect e Guardian ainda produziram safe subclass real, portanto high confidence não é requisito estrutural para reachability.

## G0 Diagnosis

Hipótese principal: **H8 — o modelo está saudável na matriz independente; o holdout original representa distribuição significativamente diferente, sobretudo por margens comprimidas e bounds negativos.**

Classificação: **SIGNIFICANT DISTRIBUTION SHIFT**. A diferença holdout 0% versus independent 40% é grande, mas independent superar calibration, alcançar todos os arquétipos, zerar correlações excessivas e manter 0 BAD contradiz `LIKELY OVERFIT` como diagnóstico global.

## G1 Calibration

**NENHUMA.**

| Tunable | Antes | Depois | Evidência |
|---|---:|---:|---|
| Todos | V23 | V23 | Nenhum tunable isolado melhora bounds inseguros sem reduzir precisão; cap, specificity, composites, threshold e margin não mostram falha global. |

## G1 Results

Não aplicável. Nenhum arquivo `g1-results.json` ou `g1-analysis.json` foi criado.

## Final Independent Quality

GOOD 16; ACCEPTABLE 12; QUESTIONABLE 2; BAD 0. GOOD+ACCEPTABLE 93.3%.

## Original Calibration Regression

Sem mudança de balance: 9/30 subclasses preservadas, com 6 GOOD e 3 ACCEPTABLE. Nenhuma regressão introduzida pela Etapa 3E.

## Original Holdout Final

| User | Top1 | Margin | Confidence | Subclass | Evaluation |
|---|---|---:|---|---|---|
| antfu | Illusionist | 1.15 | medium | null | ACCEPTABLE |
| beatrizmilz | Chronomancer | 1.15 | medium | null | ACCEPTABLE |
| diego3g | Illusionist | 11.53 | medium | null | QUESTIONABLE |
| filipedeschamps | Architect | 1.03 | medium | null | ACCEPTABLE |
| loiane | Chronomancer | 0.47 | medium | null | ACCEPTABLE |
| maykbrito | Artificer | 1.10 | high | null | ACCEPTABLE |
| omariosouto | Architect | 0.89 | medium | null | ACCEPTABLE |
| samuelcolvin | Artificer | 11.40 | medium | null | QUESTIONABLE |
| swyxio | Illusionist | 4.81 | high | null | ACCEPTABLE |
| ThePrimeagen | Architect | 2.69 | medium | null | ACCEPTABLE |

## Holdout Summary

GOOD 0; ACCEPTABLE 8; QUESTIONABLE 2; BAD 0. GOOD+ACCEPTABLE = **80%**, abaixo da referência de 85%. Subclasses 0/10. O replay foi feito somente depois de congelar a decisão de não executar G1; nenhum tuning ocorreu depois.

## Generalization Verdict

**SIGNIFICANT DISTRIBUTION SHIFT**.

## Subclass Final Distribution

No conjunto combinado de 70 observações (30 calibration + 10 holdout + 30 independent): Architect 1; Artificer 4; Illusionist 5; Guardian 1; Chronomancer 10; null 49.

## Evolution Reachability

Sem tuning. A nova matriz observou uma evolução real: `developit` desbloqueou `evo-ancestral-forger` com Artificer, full coverage e high confidence. Isso é somente observação; gates de evolução permanecem congelados.

## Titles

Observação apenas. Os cinco títulos de prática apareceram na nova matriz na mesma distribuição das subclasses; um título híbrido (`title-hybrid-pipeline-seer`) apareceu. Nenhum catálogo ou gate foi alterado.

## Achievements Regression

PASS por isolamento e suite V2; zero mudança em catálogo/gates. A distribuição observada foi registrada em `g0-analysis.json`.

## Determinism

Independent 30/30; holdout final 10/10; total da Etapa 3E 40/40.

## Performance

Sem otimização. Cold P90 independent 46.224 s; engine scoring P90 3.93 ms.

## Request Budget

REST P90 31, GraphQL P90 4, máximos 31/6. Todos os perfis respeitaram os caps existentes; calibração offline adicionou zero requests.

## V1 Regression

`npm run balance:review`: **12/12 PASS**. Diff zero em `src/game`, `src/features/duel`, `balance-snapshot.json` e `balance-snapshot-v1.json`.

## Tests

`npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS com 74 arquivos e 1.015/1.015 testes; `npm run balance:review:v2` PASS com 41/41 invariantes. A suíte manteve apenas warnings preexistentes de React `act(...)` em testes de UI.

## Build

`npm run build`: **PASS** com Next.js 15.5.27.

## Promotion Gate

| Área | Resultado |
|---|---|
| Generalization | PASS |
| Archetype semantics | PASS |
| Reachability | PASS |
| Score distribution | PASS |
| Correlation | PASS |
| Margin | PASS |
| Bounds | PASS |
| Partial-small | PASS |
| Confidence | PASS |
| Subclass quality | PASS |
| Null quality | PASS |
| Diversity | PASS |
| Holdout | FAIL |
| Determinism | PASS |
| Request regression | PASS |
| V1 isolation | PASS |

## Hard Blockers

O locked holdout continua em 0/10 subclasses e 80% GOOD+ACCEPTABLE, abaixo da referência de 85%. Isso não demonstra overfit global depois do independent G0, mas impede encerrar a calibração sob o gate solicitado.

## Decision

**GENERALIZATION IMPROVED — ONE BLOCKER REMAINS**.

## Engine Version

`2.0-experimental-v23`. Nenhuma mudança de balance; V24 não foi criado.

## Arquivos alterados

- `GAME_ENGINE_V2_GENERALIZATION_MATRIX_V24.md`
- `docs/research/GENERALIZATION_ANALYSIS_G0.md`
- `GAME_ENGINE_V2_GENERALIZATION_V24.md`
- `GAME_ENGINE_V2_BENCHMARK.md`
- `scripts/gameV2Stage3E.ts`
- `package.json`
- `artifacts/game-v2-generalization/` (matrix, inputs, G0 e holdout final)

## Próximo passo

Não iniciar evoluções nem outra rodada de tuning automaticamente. O próximo trabalho deve ser uma decisão explícita sobre o gate do locked holdout: aceitar que ele mede uma coorte de ambiguidade legítima ou definir, antes de qualquer nova calibração, um critério de aceitação que trate qualidade de null separadamente da taxa de subclasses.

## Conclusão

**A lógica de subclasses generaliza bem o suficiente para encerrar sua calibração? NÃO.**

Ela generaliza na matriz independente, mas o gate final pedido não passa porque o locked holdout permanece abaixo da referência de qualidade e com zero subclasses. Nenhum tuning adicional foi inventado para forçar esse conjunto.
