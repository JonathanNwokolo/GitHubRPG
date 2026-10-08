# Game Engine V2 — Etapa 3C

> **Historical record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

## Status

Concluída em 2026-10-07. Resultado: **BOUNDS IMPROVED, CALIBRATION STILL BLOCKED**.

A V2 continua experimental e isolada. V1.1, frontend, API pública, Duel e Chronicle não foram alterados. Não houve commit, push, deploy ou promoção.

## Objetivo

Decidir deterministicamente se o arquétipo observado continua vencedor em todos os estados admissíveis da evidência ainda não observada. Coverage continua `full | partial | unavailable`; bounds não promovem `partial` para `full`.

## Evidence Bounds V2.2

### Modelo matemático

Para cada tecnologia e arquétipo são calculados `observedScore`, `lowerBound`, `upperBound` e `uncertainty`. O modelo usa somente o snapshot existente: repos examinados, manifests descobertos/lidos/omitidos, árvores truncadas/falhas, projetos, evidências e fórmulas V2.

- `observedScore`: score com a evidência lida.
- `lowerBound`: menor score admissível. Evidência nova antiga/fraca pode reduzir médias de recência/força; por isso ele nem sempre coincide com o observado.
- `upperBound`: maior score admissível com evidência nova, respeitando saturações, recorrência por repo, deduplicação, famílias e cap de tooling.
- `uncertainRepositories`: número máximo de repos que podem acrescentar evidência. Abaixo do cap global ele é reconstruído pelos repos que atingiram o limite local; no cap global permanece conservador.

Para uma tecnologia, o melhor caso adiciona no máximo uma recorrência por repo, com recência/força 100. O pior caso considera de zero até todos os repos incertos com a evidência estruturada mais fraca admitida pelo V2.1: recência 20 e força 28 (config contextual de peso 0,5). O mínimo/máximo é então propagado pelas médias das três tecnologias mais fortes, diversidade, pesos de arquétipo e cap de tooling 40.

### Lower bound

`lowerBound = min(score observado, scores admissíveis após 0..N novas recorrências fracas)`.

Em coverage full, `N=0` e `lower = observed = upper`. Reviews partial são métricas monotônicas; o valor observado continua sendo seu lower bound.

### Upper bound

`upperBound = max(score observado, score com até N novas recorrências máximas)`.

Um manifest pode declarar várias tecnologias, mas nunca cria mais de um `evidenceRepo` por tecnologia no mesmo repo. Monorepos continuam deduplicados por repo. O score final permanece em 0..100.

### Uncertainty budget

O output guarda potencial de score total e por domínio (`schoolScore`, `artifactScore`, `reviewScore`), `uncertainRepositories` e `omittedManifests`. O budget é computation-only e não realiza fetch.

### Guaranteed margin

`guaranteedMargin = winnerLowerBound - max(rivalUpperBound)`.

### Safe winner

`safeWinner = guaranteedMargin >= requiredMargin`.

O required margin permanece 5, exatamente como na Etapa 3B. Score safety não substitui confidence, maturity, threshold ou evidence-repo gates.

## Implementação

- `bounds.ts` propaga bounds por tecnologia, componente e arquétipo.
- `decideSubclass()` usa winner worst-case contra rival best-case.
- Collector V2.1 ganhou somente metadata `uncertainRepositories`; não houve novo request nem mudança estrutural.
- Output/schema experimental passou a `2.0-experimental-v22` / `game-engine-v2-schema-2`.
- Balance permaneceu `game-engine-v2-balance-stage3-r3`.

## Novos reasonCodes

- `safe_under_partial_coverage`: partial matematicamente seguro e demais gates aprovados.
- `partial_can_change_winner`: algum rival ainda pode violar a margem garantida.

Os reason codes anteriores de threshold, margin, confidence, maturity e evidência continuam válidos. Não foram criados estados públicos adicionais de coverage.

## Testes de bounds

Cobertos: full exato; partial-small safe/unsafe; partial-large safe/unsafe; rival ultrapassando o winner; margem abaixo/igual/acima de 5; clamp 0..100; monotonicidade da incerteza; confidence low/medium/high/unavailable; e interação bounds + margin.

## Invariantes

O review passou de 30 para **37 invariantes executáveis**. Os sete novos verificam:

1. `lower <= observed`;
2. `observed <= upper`;
3. bounds em 0..100;
4. full com incerteza zero;
5. partial seguro pode conceder;
6. partial inseguro bloqueia;
7. aumentar incerteza nunca reduz upper bound.

## R0 — Mesmo balance da 3B

| Métrica | 3B | 3C Bounds |
|---|---:|---:|
| Subclasses | 1/40 | 2/40 |
| Decisões full | 1 | 1 |
| Partial-small safe | 0 | 0 |
| Partial-large safe | 0 | 1 |
| Blocked by uncertainty | 18 por veto amplo | 6 por prova de bounds |
| Evoluções | 0 | 0 |

O ganho real foi `kentcdodds → Guardião`; EvanBacon ficou 0,79 ponto abaixo da margem garantida exigida. Não houve calibração após o replay.

## Diagnóstico completo

Ordenação: decisões seguras primeiro e depois score observado. O rival é o maior upper bound, que pode diferir do runner-up observado.

| User | Top | Obs. | Lower | Rival best-case | Rival upper | Obs. margin | Guaranteed | Coverage | Conf. | Safe? | Decisão | Blocker/reason |
|---|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|
| kentcdodds | Guardião | 74,20 | 73,86 | Ilusionista | 67,69 | 10,05 | 6,17 | partial-large | medium | sim | Guardião | safe_under_partial_coverage |
| iamkun | Guardião | 60,26 | 60,26 | Artífice | 42,20 | 18,06 | 18,06 | full | low | sim | null | confidence_insufficient |
| sharkdp | Cronomante | 58,73 | 58,73 | Guardião | 38,68 | 20,04 | 20,04 | full | medium | sim | Cronomante | strong_archetype_evidence |
| EvanBacon | Ilusionista | 75,76 | 74,85 | Guardião | 70,64 | 9,27 | 4,21 | partial-small | medium | não | null | partial_can_change_winner |
| antfu | Guardião | 71,91 | 69,79 | Arquiteto | 94,44 | 8,16 | -24,65 | partial-large | medium | não | null | partial_can_change_winner |
| addyosmani | Ilusionista | 70,31 | 70,31 | Guardião | 66,89 | 3,42 | 3,42 | full | high | não | null | margin_insufficient |
| Rich-Harris | Arquiteto | 67,39 | 66,77 | Guardião | 74,10 | 3,09 | -7,33 | partial-small | medium | não | null | margin_insufficient |
| pacocoursey | Ilusionista | 65,72 | 64,71 | Guardião | 68,35 | 3,40 | -3,64 | partial-large | medium | não | null | margin_insufficient |
| segunadebayo | Ilusionista | 65,57 | 64,79 | Guardião | 72,00 | 6,54 | -7,21 | partial-large | medium | não | null | partial_can_change_winner |
| JakeWharton | Cronomante | 64,20 | 64,20 | Guardião | 74,30 | 22,56 | -10,10 | partial-large | medium | não | null | partial_can_change_winner |
| samuelcolvin | Guardião | 63,90 | 61,96 | Cronomante | 63,80 | 0,10 | -1,84 | partial-small | medium | não | null | margin_insufficient |
| mitchellh | Guardião | 62,85 | 62,85 | Cronomante | 60,34 | 2,51 | 2,51 | full | low | não | null | margin_insufficient |
| tiangolo | Guardião | 62,83 | 58,98 | Arquiteto | 67,36 | 0,33 | -8,38 | partial-large | low | não | null | margin_insufficient |
| ThePrimeagen | Cronomante | 62,70 | 62,70 | Guardião | 63,78 | 2,69 | -1,08 | partial-large | medium | não | null | margin_insufficient |
| mitsuhiko | Cronomante | 62,20 | 60,00 | Guardião | 70,88 | 21,60 | -10,89 | partial-small | medium | não | null | partial_can_change_winner |
| loiane | Ilusionista | 61,87 | 61,87 | Cronomante | 60,65 | 1,22 | 1,22 | full | medium | não | null | margin_insufficient |
| omariosouto | Cronomante | 61,78 | 60,76 | Arquiteto | 70,15 | 3,34 | -9,39 | partial-small | medium | não | null | margin_insufficient |
| gaearon | Guardião | 61,27 | 60,21 | Arquiteto | 65,48 | 4,61 | -5,27 | partial-large | medium | não | null | margin_insufficient |
| jesseduffield | Guardião | 61,18 | 61,18 | Cronomante | 60,69 | 0,49 | 0,49 | full | low | não | null | margin_insufficient |
| swyxio | Guardião | 60,39 | 60,39 | Ilusionista | 55,83 | 4,56 | 4,56 | full | medium | não | null | margin_insufficient |
| diego3g | Cronomante | 60,25 | 60,17 | Arquiteto | 72,91 | 3,12 | -12,74 | partial-small | medium | não | null | margin_insufficient |
| sindresorhus | Artífice | 59,04 | 59,04 | Cronomante | 56,76 | 2,28 | 2,28 | full | high | não | null | margin_insufficient |
| necolas | Guardião | 58,62 | 56,92 | Cronomante | 62,36 | 8,38 | -5,44 | partial-large | medium | não | null | partial_can_change_winner |
| mhevery | Artífice | 58,45 | 58,45 | Guardião | 57,78 | 0,67 | 0,67 | full | high | não | null | margin_insufficient |
| maykbrito | Ilusionista | 57,41 | 57,41 | Artífice | 55,25 | 2,16 | 2,16 | full | high | não | null | margin_insufficient |
| emilkowalski | Ilusionista | 55,40 | 54,89 | Arquiteto | 62,53 | 0,29 | -7,63 | partial-small | medium | não | null | margin_insufficient |
| yyx990803 | Guardião | 54,03 | 54,03 | Artífice | 47,69 | 6,33 | 6,33 | full | low | sim | null | score_below_threshold |
| filipedeschamps | Guardião | 54,80 | 50,13 | Arquiteto | 65,62 | 0,75 | -15,48 | partial-large | medium | não | null | score_below_threshold |
| matz | Cronomante | 52,40 | 52,40 | Guardião | 28,73 | 23,67 | 23,67 | full | medium | sim | null | score_below_threshold |
| TaylorOtwell | Cronomante | 51,04 | 51,04 | Arquiteto | 49,03 | 2,01 | 2,01 | full | low | não | null | score_below_threshold |
| beatrizmilz | Cronomante | 48,38 | 48,38 | Artífice | 39,86 | 8,52 | 8,52 | full | medium | sim | null | score_below_threshold |
| kelseyhightower | Cronomante | 47,17 | 47,17 | Artífice | 19,84 | 27,32 | 27,32 | full | medium | sim | null | score_below_threshold |
| gvanrossum | Arquiteto | 45,69 | 45,69 | Cronomante | 35,62 | 10,07 | 10,07 | full | medium | sim | null | score_below_threshold |
| sebmarkbage | Ilusionista | 45,42 | 45,42 | Arquiteto | 41,43 | 3,99 | 3,99 | full | medium | não | null | score_below_threshold |
| JonathanNwokolo | Ilusionista | 44,87 | 44,87 | Arquiteto | 43,49 | 1,38 | 1,38 | full | medium | não | null | score_below_threshold |
| mdo | Cronomante | 35,54 | 35,54 | Guardião | 35,35 | 0,19 | 0,19 | full | low | não | null | score_below_threshold |
| torvalds | Cronomante | 33,71 | 32,26 | Guardião | 56,08 | 12,11 | -23,83 | partial-small | low | não | null | score_below_threshold |
| ahejlsberg | Arquiteto | 32,53 | 32,53 | Guardião | 32,30 | 0,23 | 0,23 | full | low | não | null | score_below_threshold |
| dhh | Guardião | 31,95 | 31,95 | Cronomante | 20,85 | 11,10 | 11,10 | full | low | sim | null | score_below_threshold |
| antirez | Cronomante | 20,25 | 20,25 | Artífice | 56,65 | 2,63 | -36,40 | partial-large | low | não | null | score_below_threshold |

O JSON canônico, com todos os campos de uncertainty e componentes, está em `artifacts/game-v2-benchmark/analysis-v22-bounds.json`.

## Diagnóstico dos casos obrigatórios

### kentcdodds

Guardião observado 74,20; lower 73,86. O melhor rival possível é Ilusionista 67,69; margem garantida 6,17. Os 35 manifests omitidos estão limitados a três repos incertos abaixo do cap global, portanto não podem fabricar dezenas de `evidenceRepos`. Coverage permanece partial-large, confidence medium e a decisão é Guardião com `safe_under_partial_coverage`.

### EvanBacon

Ilusionista observado 75,76; lower 74,85. Guardião pode chegar a 70,64; margem garantida 4,21. Como o gate continua 5, partial-small não é seguro. Decisão `null`, sem forçar resultado.

### antfu

Guardião observado 71,91; lower 69,79. O cap global foi atingido e Arquiteto pode chegar a 94,44. Margem garantida -24,65. Partial-large continua corretamente bloqueado.

### addyosmani

Coverage full e confidence high. Ilusionista 70,31 contra Guardião 66,89; margem 3,42. Bounds não alteram full. O blocker é apenas `margin_insufficient`.

### sindresorhus

Coverage full/high. Artífice 59,04 contra Cronomante 56,76; margem 2,28. Passa threshold, falha margem.

### iamkun

Guardião 60,26, margem garantida 18,06 e coverage full, mas só há um repo de evidência primária relevante, de força média 60. Confidence low é coerente com a semântica quantidade + qualidade; score alto veio de colaboração/atributos de apoio, que não substituem recorrência técnica. Decisão `null`.

### loiane

Coverage full/medium. Ilusionista 61,87 contra Cronomante 60,65; margem 1,22. Blocker exclusivamente de margem.

### sharkdp

Cronomante 58,73, margem 20,04, full/medium. A concessão usa o strong threshold **55**, calibrado na Etapa 3; a referência aproximada a 60 era anterior. Não passou pelo possible path nem por exceção.

## Confidence audit

Distribuição nos 40 perfis maduros: low 11, medium 25, high 4, unavailable 0. High é atingível em dados reais: addyosmani, sindresorhus, mhevery e maykbrito. Fixtures realistas demonstram low, medium, high e unavailable. Confidence permanece independente do score.

Todos os 40 perfis da matriz passam o maturity gate; portanto a amostra não testa frequência de perfis imaturos, apenas a reachability já coberta por fixture.

## Margin audit

Nos 30 calibration profiles:

| Bucket | Perfis |
|---|---:|
| 0–2 | 7 |
| 2–4 | 8 |
| 4–6 | 1 |
| 6–8 | 2 |
| 8–12 | 5 |
| 12+ | 7 |

Não há evidência para reduzir 5: os casos 2–4 apresentam disputas reais entre componentes, inclusive com coverage full. Reduzir a margem agora transformaria ambiguidade em classificação.

## Threshold audit

| Bucket | Perfis calibration |
|---|---:|
| <40 | 5 |
| 40–44 | 1 |
| 45–49 | 3 |
| 50–54 | 3 |
| 55–59 | 5 |
| 60–69 | 10 |
| 70–79 | 3 |
| 80+ | 0 |

O threshold strong 55 e possible 42 foram mantidos. Abaixo de 55 há winners seguros, mas não existe padrão multi-perfil suficiente para afirmar identidade forte sem reabrir os pesos.

## Maturity audit

Gate preservado em 90 dias + 2 repos próprios. Nenhum dos 40 perfis reais foi bloqueado por maturity; fixtures continuam cobrindo perfil novo/pequeno. Não houve evidência para alterar.

## Calibration changes

**Nenhuma.** Threshold 55, possible 42, margin 5, confidence, maturity, pesos e evolution gates permanecem os da Etapa 3B. A amostra calibration não sustentou mudança global sem overfit.

## Calibration result

### Subclass distribution

| Subclasse | Perfis |
|---|---:|
| Arquiteto | 0 |
| Artífice | 0 |
| Ilusionista | 0 |
| Guardião | 1 |
| Cronomante | 1 |
| null | 38 |

Não há diversidade suficiente para declarar o sistema de subclasses pronto.

## Evolution reachability

| Evolução | Fixture positiva realista? | Perfis reais com subclasse elegível | Unlocks |
|---|---|---:|---:|
| Arquimago | sim | 0 | 0 |
| Guardião Celestial | sim | 1 | 0 |
| Mestre das Runas | sim | 0 | 0 |
| Tecelão Arcano | sim | 0 | 0 |
| Forjador Ancestral | sim | 0 | 0 |
| Alto Cronomante | sim | 1 | 0 |
| Arquiteto Celestial | sim | 0 | 0 |

Todas as sete regras têm fixture positiva e negativas de score/coverage. Nenhuma evolução real desbloqueou; os gates não foram reduzidos.

## Titles

Os títulos de prática exercitados passaram de um para dois: Guardião e Cronomante. Arquiteto, Artífice e Ilusionista continuam ausentes; os três híbridos continuam ausentes. O catálogo não foi alterado.

## Achievements regression

PASS. Nenhuma conquista foi recalibrada ou removida. `living-legend` passou a desbloquear para kentcdodds como efeito esperado da nova subclasse strong; nenhum unlock anterior regrediu.

## Holdout

| User | Classe | Subclasse | Evolução | Evaluation | Notes |
|---|---|---|---|---|---|
| filipedeschamps | Bardo | null | null | ACCEPTABLE | abaixo de strong e guaranteed margin negativa |
| diego3g | Mago | null | null | ACCEPTABLE | margem observada e garantida insuficientes |
| maykbrito | Mago | null | null | ACCEPTABLE | full/high, margem 2,16 |
| loiane | Mago | null | null | ACCEPTABLE | full, margem 1,22 |
| beatrizmilz | Bardo | null | null | ACCEPTABLE | winner seguro, score 48,38 |
| omariosouto | Mago | null | null | ACCEPTABLE | partial-small, guaranteed margin negativa |
| swyxio | Bardo | null | null | ACCEPTABLE | full, margem 4,56 |
| antfu | Mago | null | null | QUESTIONABLE | gap large permite rival upper 94,44 |
| samuelcolvin | Alquimista | null | null | ACCEPTABLE | disputa efetiva, guaranteed margin -1,84 |
| ThePrimeagen | Aventureiro | null | null | ACCEPTABLE | gap large e guaranteed margin negativa |

GOOD 0; ACCEPTABLE 9; QUESTIONABLE 1; BAD 0. GOOD + ACCEPTABLE = 90%. O holdout não foi usado para tuning.

## Explainability

Templates PT-BR/EN distinguem `safe_under_partial_coverage` de `partial_can_change_winner`. A engine guarda a matemática completa; nenhuma UI foi criada.

## Determinism

40/40 replays offline semanticamente idênticos.

## Performance regression

Bounds adicionaram requests? **NÃO**. P90 de scoring anterior: 5,63 ms. P90 da engine com bounds: 4,53 ms nesta execução (variação de medição, não alegação de speedup). Cold P90 preservado do collector: 33,146 s. O blocker absoluto de delivery/performance continua.

## Request budget regression

PASS. REST P90 continua 31; zero request novo por bounds.

## V1 Regression

`npm run balance:review`: 12/12 PASS. Diff protegido em `src/game`, `src/features/duel`, snapshots V1: zero.

## Testes e build

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 74 arquivos e 1.014 testes.
- `npm run build`: PASS.
- `npm run balance:review`: 12/12 PASS.
- `npm run balance:review:v2`: 37/37 PASS.

O suite completo ainda imprime warnings React preexistentes de `act(...)` em testes de UI; não houve falha e esses arquivos estão fora do escopo V2.

## Promotion Gate

| Área | Resultado |
|---|---|
| Correctness | PASS |
| Bounds | PASS |
| Coverage handling | PASS |
| Confidence | PASS |
| Margin | PASS |
| Subclass | FAIL |
| Evolution reachability | PASS |
| Titles | FAIL |
| Achievements | PASS |
| Explainability | PASS |
| Determinism | PASS |
| Performance regression | PASS |
| Request budget | PASS |
| V1 isolation | PASS |

## Hard blockers restantes

- subclasses apenas 2/40, concentradas em Guardião/Cronomante;
- evoluções reais 0/40;
- três títulos de prática e todos os híbridos continuam não exercitados;
- gaps que atingem o cap global ainda produzem bounds amplos;
- cold P90 33,1 s continua inadequado para delivery síncrono.

## Decisão

**BOUNDS IMPROVED, CALIBRATION STILL BLOCKED**

## Engine experimental version

`2.0-experimental-v22`, schema `game-engine-v2-schema-2`, detector `game-engine-v2-detectors-3-collector-v21`, balance inalterado `game-engine-v2-balance-stage3-r3`.

## Arquivos alterados

Somente V2, scripts V2, documentação e artefatos V2. Nenhum frontend, API pública, V1, Duel ou Chronicle.

## Próximo passo recomendado

Antes de calibrar thresholds, melhorar a metadata do gap global para preservar os repos exatos dos targets cortados pelo cap de 180. Depois repetir a calibração de 30 perfis. Performance/delivery ainda não deve começar como fase de promoção.

## Conclusão

**A lógica da Game Engine V2 está pronta para sair da fase de calibração e avançar para performance/delivery?**

**NÃO.**
