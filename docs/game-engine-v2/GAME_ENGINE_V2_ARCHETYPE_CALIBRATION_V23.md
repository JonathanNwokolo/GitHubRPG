# Game Engine V2 — Etapa 3D

## Status

Concluída em 2026-10-07. A V2 permanece experimental e isolada. V1.1, frontend, API pública, Duel, Chronicle, collector V2.1 e estrutura dos bounds V2.2 não foram alterados.

Decisão: **ARCHETYPES IMPROVED — MORE CALIBRATION NEEDED**.

## Objetivo

Testar se os sinais dos cinco arquétipos distinguem práticas técnicas, sem aumentar subclasses artificialmente. A ordem foi preservada: R0 somente nos 30 perfis de calibration; R1 somente após o diagnóstico; R2 não usado; holdout executado uma única vez após congelar R1.

## R0 — Archetype Signal Analysis

O relatório completo está em `docs/research/ARCHETYPE_SIGNAL_ANALYSIS_R0.md`; a matriz de 30 perfis, incluindo classe, coverage, confidence, maturity, schools, artifacts, scores, top1/top2, margem e decomposição, está em `artifacts/game-v2-benchmark/benchmark-v23-r0-analysis.json`.

### Score distribution

| Arquétipo | Mean | Median | P25 | P75 | P90 | Min | Max | >=40 | >=50 | >=60 | >=70 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Arquiteto | 38,88 | 43,58 | 23,00 | 52,02 | 57,02 | 10,81 | 67,39 | 18 | 9 | 2 | 0 |
| Artífice | 38,21 | 40,17 | 22,59 | 53,86 | 59,08 | 12,50 | 60,05 | 15 | 8 | 1 | 0 |
| Ilusionista | 37,75 | 42,27 | 18,38 | 53,89 | 65,58 | 7,20 | 75,76 | 15 | 8 | 5 | 2 |
| Guardião | 46,88 | 46,39 | 35,28 | 60,95 | 64,52 | 17,63 | 74,20 | 17 | 15 | 9 | 1 |
| Cronomante | 45,50 | 46,61 | 36,19 | 58,24 | 62,59 | 20,25 | 64,20 | 19 | 14 | 7 | 0 |

### Correlation matrix

| | Arquiteto | Artífice | Ilusionista | Guardião | Cronomante |
|---|---:|---:|---:|---:|---:|
| Arquiteto | 1,000 | 0,705 | 0,879 | 0,812 | 0,245 |
| Artífice | 0,705 | 1,000 | 0,821 | 0,812 | 0,486 |
| Ilusionista | 0,879 | 0,821 | 1,000 | 0,809 | 0,266 |
| Guardião | 0,812 | 0,812 | 0,809 | 1,000 | 0,521 |
| Cronomante | 0,245 | 0,486 | 0,266 | 0,521 | 1,000 |

Cinco pares ultrapassavam 0,75. Arquiteto, Artífice, Ilusionista e Guardião estavam fortemente correlacionados.

### Margin distribution

| Bucket | Quantidade | % |
|---|---:|---:|
| 0–2 | 7 | 23,3% |
| >2–4 | 8 | 26,7% |
| >4–6 | 1 | 3,3% |
| >6–8 | 2 | 6,7% |
| >8–12 | 5 | 16,7% |
| >12–20 | 2 | 6,7% |
| >20 | 5 | 16,7% |

### Signal overlap

- Testing alimentava Arquiteto, Ilusionista e Guardião.
- Infra alimentava quatro arquétipos.
- Maturity alimentava os cinco.
- Versatility alimentava três.
- A média dos três maiores sinais não distinguia presença isolada de padrão composto.

### Generic signals

React, Next.js, Vite, Jest/Vitest e GitHub Actions podiam produzir componentes altos quando recorrentes, mas não possuíam teto semântico explícito no arquétipo.

### Specific signals

Os sinais mais específicos já existiam nos dados — Storybook/visual tooling, Rollup/esbuild/desktop, testes E2E, Terraform e combinações frontend+backend — mas a fórmula de família diluía essa especificidade.

### Diagnosis

- signal overlap: 11
- weak specificity: 2
- saturation: 0
- threshold: 2
- margin: 10
- confidence: 1
- legitimate ambiguity: 7

O problema primário era A/B: overlap e especificidade fraca. Threshold e margem não eram a primeira ferramenta.

## Arquétipo por arquétipo

### Arquiteto

Identidade: estrutura de aplicação, meta-frameworks, backend e composição de camadas.

Problemas: Next.js/Express isolados tinham influência excessiva; testing e maturidade ajudavam demais.

Mudanças: especificidade por Escola, teto para Next.js/Express genéricos, composto meta+backend e peso principal de 78% para o padrão estrutural.

### Artífice

Identidade: build systems, desktop e toolchain específica.

Problemas: Vite, package manager, linter e formatter eram tratados como equivalentes a Rollup/esbuild/Electron/Tauri.

Mudanças: especificidade explícita, cap para tooling genérico e bônus somente para diversidade de sinais específicos/composição build+workshop.

### Ilusionista

Identidade: UI recorrente combinada com visual tooling, design system, Storybook ou interação.

Problemas: React sozinho elevava o componente; testing genérico cruzava com Guardião.

Mudanças: React/Tailwind genéricos limitados; composto UI+visual; Storybook recebe significado visual; Playwright/Cypress são apenas apoio de interação.

### Guardião

Identidade: padrão recorrente/diverso de testes, apoiado por reviews e consistência.

Problemas: Jest/Vitest isolados mais reviews/atributos podiam formar score forte.

Mudanças: Jest/Vitest genéricos limitados; bônus de reviews só existe com ao menos dois sinais de teste; qualidade técnica pesa 75%.

### Cronomante

Identidade: pipelines, delivery e infra em padrão composto.

Problemas: GitHub Actions isolado podia dominar; craft e consistência aproximavam Cronomante de Artífice/Guardião.

Mudanças: Actions genérico limitado; Docker/Terraform mais específicos; composto pipeline+delivery/infra; automação pesa 80%.

## R1 — Signal Calibration

| Campo/Peso | Antes | Depois | Motivo |
|---|---|---|---|
| Specificity | implícita por família | peso explícito por tecnologia/arquétipo | separar sinal genérico de específico |
| Generic signal cap | inexistente | 42 no componente primário | impedir identidade forte por um sinal genérico |
| Composite signals | diversidade simples | combinações gerais por papel | distinguir presença de ecosystem pattern |
| Arquiteto principal | structural 60% | padrão estrutural 78% | reduzir apoio genérico |
| Artífice principal | craft 60% | padrão de oficina 80% | tooling específico deve decidir |
| Ilusionista principal | visual/UI 65% | padrão visual 80% | UI+visual deve decidir |
| Guardião principal | quality 55% | padrão de qualidade 75% | reviews/atributos não criam identidade |
| Cronomante principal | automation 65% | padrão de automação 80% | pipeline/infra deve decidir |
| subclassStrong | 55 | 55 | sem evidência para mudança global |
| subclassPossible | 42 | 42 | sem mudança |
| requiredMargin | 5 | 5 | sem mudança |
| Confidence gates | V2.2 | V2.2 | sem mudança |

## R1 Results

### Distribution

| Arquétipo | Mean | Median | P25 | P75 | P90 | Min | Max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Arquiteto | 29,91 | 29,63 | 13,69 | 44,35 | 50,59 | 5,91 | 60,25 |
| Artífice | 35,20 | 31,74 | 13,26 | 53,34 | 66,59 | 6,27 | 95,10 |
| Ilusionista | 35,06 | 26,83 | 8,81 | 62,74 | 74,05 | 4,08 | 90,50 |
| Guardião | 34,90 | 32,96 | 20,02 | 41,01 | 65,94 | 8,85 | 90,55 |
| Cronomante | 41,65 | 36,05 | 25,81 | 59,41 | 72,64 | 9,53 | 84,01 |

### Correlations

| | Arquiteto | Artífice | Ilusionista | Guardião | Cronomante |
|---|---:|---:|---:|---:|---:|
| Arquiteto | 1,000 | 0,514 | 0,694 | 0,664 | 0,061 |
| Artífice | 0,514 | 1,000 | 0,713 | 0,746 | 0,139 |
| Ilusionista | 0,694 | 0,713 | 1,000 | 0,800 | -0,060 |
| Guardião | 0,664 | 0,746 | 0,800 | 1,000 | 0,124 |
| Cronomante | 0,061 | 0,139 | -0,060 | 0,124 | 1,000 |

Quatro dos cinco pares excessivos caíram abaixo de 0,75. Ilusionista×Guardião ficou em 0,800, mas a inspeção mostra coocorrência real de UI e testes na matriz; não foi perseguida correlação baixa artificialmente.

### Margins

0–2: 1; >2–4: 2; >4–6: 5; >6–8: 4; >8–12: 6; >12–20: 5; >20: 7.

### Subclasses

Calibration: 9/30 — Artífice 1, Ilusionista 3, Cronomante 5, null 21. Arquiteto e Guardião continuam alcançáveis por fixture, mas não receberam decisão real nesta amostra.

## R2 — Threshold/Margin Refinement

**NÃO NECESSÁRIO.**

Três líderes ficaram em 50–54, mas representam padrões e blockers diferentes. Abaixar threshold após R1 não era sustentado por um padrão sistemático; margem 5 também foi preservada.

## Final subclass distribution

- Arquiteto: 0
- Artífice: 1
- Ilusionista: 3
- Guardião: 0
- Cronomante: 5
- null: 31

Cronomante representa 5/9 concessões (55,6%), abaixo do gatilho de investigação de 60–70%.

## Subclass quality — Calibration

- GOOD: 6
- ACCEPTABLE: 3
- QUESTIONABLE: 0
- BAD: 0

## Casos de referência

### kentcdodds

R1 produziu Artífice 95,10 e Guardião 90,55, margem 4,55. A evidência contém simultaneamente build/tooling diverso e testes diversos; a ambiguidade é legítima. A antiga concessão Guardião foi removida e `living-legend` regrediu como efeito downstream esperado, sem mudança no catálogo.

### sharkdp

Cronomante foi preservado e fortalecido: 84,01 contra Artífice 39,38, com GitHub Actions, Docker e Terraform.

### EvanBacon

Ilusionista 90,50 contra Artífice 60,11. O observado é claro, mas bounds partial-small dão margem garantida -6,96; permanece null.

### addyosmani

Ilusionista 65,59 contra Cronomante 60,08; full/high, margem 5,51. Resultado GOOD.

### sindresorhus

Artífice 51,61 contra Cronomante 44,99; margem 6,62, mas abaixo de strong 55. O threshold não foi reduzido por um único caso.

### iamkun

Artífice 54,60 contra Guardião 35,30; full/medium. O antigo Guardião apoiado por colaboração/atributos desapareceu; permanece null abaixo de 55.

### loiane

Holdout: Cronomante 67,12 contra Arquiteto 66,65; full/medium, margem 0,47. Null é ambiguidade legítima.

### antfu

Holdout: Ilusionista 91,39 contra Artífice 90,23; partial-large, margem observada 1,15 e garantida -10,99. Null é seguro e semanticamente coerente.

## Archetype reachability

| Archetype | Realistic fixture | Reachable | Generic-only blocked |
|---|---|---|---|
| Arquiteto | Next.js + NestJS recorrentes | sim | Next.js sozinho |
| Artífice | Vite + esbuild + Rollup recorrentes | sim | Vite sozinho |
| Ilusionista | React + Tailwind recorrentes | sim | React sozinho |
| Guardião | Vitest + Playwright + reviews | sim | Jest sozinho |
| Cronomante | Actions + Docker + Terraform | sim | Actions sozinho |

## Counterfactual tests

Fixtures pareadas confirmam que retirar o sinal específico/composto reduz o componente primário de cada arquétipo. O teste também confirma que o quarto sinal de uma família não ultrapassa a influência dos três maiores.

## Evolution diagnostics

As sete evoluções continuam congeladas e alcançáveis por fixture. Em dados reais: 0 unlocks. As subclasses elegíveis por regra foram 3/0/1/3/1/5/0; confidence high, coverage e outros gates continuam bloqueando. Não houve calibração de evolução.

## Titles

Prática: Artífice 1, Ilusionista 3 e Cronomante 5. Um híbrido (`title-hybrid-pipeline-seer`) foi exercitado. Catálogo inalterado.

## Achievements regression

PASS. Catálogo e gates não mudaram. Somente `living-legend`, que depende da subclasse strong, mudou: quatro adições e uma remoção esperadas pelo novo resultado de subclasses.

## Holdout

| User | Top scores | Subclass | Evaluation | Notes |
|---|---|---|---|---|
| antfu | Ilusionista 91,39 / Artífice 90,23 | null | ACCEPTABLE | ambiguidade real + partial-large |
| beatrizmilz | Cronomante 36,82 / Artífice 35,67 | null | ACCEPTABLE | abaixo de strong |
| diego3g | Ilusionista 76,02 / Arquiteto 64,50 | null | QUESTIONABLE | partial-small veta líder observado claro |
| filipedeschamps | Arquiteto 53,39 / Cronomante 52,36 | null | ACCEPTABLE | abaixo de strong e empate amplo |
| loiane | Cronomante 67,12 / Arquiteto 66,65 | null | ACCEPTABLE | full, margem 0,47 |
| maykbrito | Artífice 73,44 / Ilusionista 72,35 | null | ACCEPTABLE | full/high, margem 1,10 |
| omariosouto | Arquiteto 72,26 / Ilusionista 71,37 | null | ACCEPTABLE | margem 0,89 |
| samuelcolvin | Artífice 73,48 / Cronomante 62,08 | null | QUESTIONABLE | partial-small veta líder observado claro |
| swyxio | Ilusionista 72,16 / Guardião 67,36 | null | ACCEPTABLE | full/high, margem 4,81 |
| ThePrimeagen | Arquiteto 62,98 / Cronomante 60,29 | null | ACCEPTABLE | partial-large, margem curta |

GOOD: 0; ACCEPTABLE: 8; QUESTIONABLE: 2; BAD: 0. GOOD + ACCEPTABLE: **80%**.

## Generalization

Calibration concedeu 9/30 (30%); holdout concedeu 0/10. Não houve BAD, mas a utilidade não generalizou e dois vetoes de bounds partial-small ficaram subinformativos. Isso impede encerrar a calibração.

## Final correlation matrix

Igual à matriz R1, pois R2 não foi usado. Maiores deltas: Arquiteto×Ilusionista 0,879→0,694; Artífice×Ilusionista 0,821→0,713; Guardião×Cronomante 0,521→0,124; Arquiteto×Guardião 0,812→0,664.

## Determinism

40/40 replays: **PASS**.

## Performance regression

Novos requests: 0. Engine calibration P90 medido em 2,32 ms contra 4,53 ms na medição V2.2; a diferença é variação de medição, não alegação de speedup. Cold P90 do collector permanece 33,1 s e não foi trabalhado nesta etapa.

## Request budget regression

PASS. REST P90 31; GraphQL P90 5; zero novo fetch.

## V1 Regression

12/12 PASS. Diff protegido em `src/game`, `src/features/duel`, `balance-snapshot.json` e `balance-snapshot-v1.json`: zero em relação ao início da Etapa 3D.

## Invariantes V2

41/41 PASS. Novos invariantes cobrem cap genérico, alcance dos cinco arquétipos, bloqueio de sinal genérico isolado e empate determinístico.

## Testes

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS — 74 arquivos, 1.015 testes
- `npm run balance:review`: PASS — 12/12
- `npm run balance:review:v2`: PASS — 41/41

Warnings React preexistentes de `act(...)` continuam sem falhas e fora do escopo V2.

## Build

`npm run build`: PASS.

## Promotion Gate

| Área | Resultado |
|---|---|
| Archetype semantics | PASS |
| Score distribution | PASS |
| Distinctness | PASS |
| Subclass quality | FAIL |
| Subclass diversity | FAIL |
| Confidence | PASS |
| Bounds | PASS |
| Evolution reachability | PASS |
| Titles | PASS |
| Determinism | PASS |
| Performance regression | PASS |
| Request regression | PASS |
| V1 isolation | PASS |

## Hard blockers restantes

- holdout com 0/10 subclasses e GOOD+ACCEPTABLE de 80%;
- dois líderes semanticamente claros no holdout continuam vetados por bounds partial-small;
- nenhuma concessão real de Arquiteto ou Guardião na configuração final;
- 0 evoluções reais;
- cold P90 de 33,1 s permanece blocker de delivery, embora performance não tenha sido escopo desta etapa.

## Decisão

**ARCHETYPES IMPROVED — MORE CALIBRATION NEEDED**

## Engine experimental version

`2.0-experimental-v23`; balance `game-engine-v2-balance-v23-r1-signals`.

## Arquivos alterados

- `src/game-v2/archetypeModel.ts`, `scoring.ts`, `bounds.ts`, `constants.ts`, `types.ts`, `fixtures.ts`, `engine.test.ts`, `invariants.ts`, `index.ts` e snapshot V23;
- scripts de análise R0, R1, holdout e finalização da Etapa 3D;
- artefatos V23, este relatório, benchmark e implementação V2;
- `package.json` somente com comandos V2.

Nenhum frontend, API pública, V1, Duel ou Chronicle foi alterado pela Etapa 3D.

## Próximo passo recomendado

Investigar, sem reabrir o holdout atual para tuning, por que bounds partial-small continuam amplos em líderes claros e montar uma nova matriz independente antes de qualquer nova calibração. Não avançar automaticamente para performance/delivery.

## Conclusão

**A lógica de subclasses da Game Engine V2 está pronta para sair da calibração?**

**NÃO.**
