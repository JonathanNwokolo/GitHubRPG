# Game Engine V2 — Etapa 3

## Status

Concluída em 2026-10-07. Resultado: **DO NOT PROMOTE**. A versão permanece `2.0-experimental`; frontend, Duelo, Chronicle, V1, rotas públicas e produção não foram alterados.

## Benchmark

Quantidade de perfis: 40  
Calibration: 30  
Holdout: 10

Os 26 perfis obrigatórios foram incluídos. Os 14 complementares públicos foram: `tiangolo`, `TaylorOtwell`, `mitsuhiko`, `jesseduffield`, `sharkdp`, `mitchellh`, `kelseyhightower`, `EvanBacon`, `JakeWharton`, `Rich-Harris`, `swyxio`, `antfu`, `samuelcolvin` e `ThePrimeagen`. `charliermarsh` foi substituído antes da análise porque o GitHub devolveu 502 repetido ao montar o perfil completo.

## Categorias representadas

Frontend/UI, design systems, backend Node/Python/Java/PHP/Ruby, low-level C/C++/Rust, Go, tooling/CLI/build, DevOps/automação, testing/review, mobile/Expo/Kotlin, polyglot, long-lived, huge e small. A matriz real ficou enviesada para perfis maduros e conhecidos porque 26 nomes eram obrigatórios; isso foi considerado na leitura de raridade.

## Baseline R0

### Classes

Calibration: Mago 14, Guerreiro 5, Bardo 3, Alquimista 2, Aventureiro 2, Escriba 1, Oráculo 1, Patrulheiro 2.

### Subclasses

`null`: 30/30. Líderes internos: Guardião 15, Cronomante 10, Ilusionista 5.

### Evoluções

`null`: 30/30.

### Coverage

Manifest: full 2, partial 28. Linguagens: full 27, partial 3.

### Confidence

Medium 12, low 18.

### Performance

Calibration cold: P50 22,0 s; P75 34,8 s; P90 41,8 s; máximo 67,3 s. Warm em cache de processo: <1 ms medido, arredondado para 0 ms.

### Requests

Calibration V2 REST: média 49, P90 89, máximo 90. Manifest/tree: média 48, P90 88. Repos inspecionados: média 22, P90 30.

## Bugs encontrados

- Detector bugs: Docker era detectado em paths vendorizados `upstream/`; config direta recorrente nunca alcançava confidence medium.
- Engine bugs: média de família somava mais de três itens, mas dividia por três, inflando Guardião/Ilusionista.
- Data issues: dois manifests/configs por repo deixam muitos candidatos sem leitura; exemplos/repros são risco de evidência fraca, mas não foram removidos por username ou reputação.
- Performance issues: coleta faz uma árvore e até dois blobs por repo, chegando frequentemente a 60–90 REST requests e 30–67 s.

## Round 1 — Detector fixes

- Paths vendorizados `vendor`, `third_party`, `external`, `upstream` e variantes passaram a ser ignorados; duas evidências Docker confirmadamente vendorizadas em `mitchellh` foram removidas.
- Config recorrente passou a poder sustentar confidence medium.
- A média de família foi corrigida para usar os três maiores itens reais.
- Efeito: confidence medium 12→17 no R1; false positive vendorizado confirmado 2→0. Subclasses continuaram 0 porque coverage permaneceu partial.

## Round 2 — Balance calibration

| Tunable | Antes | Depois | Motivo |
|---|---:|---:|---|
| subclassStrong | 60 | 55 | leaders coerentes ficavam entre 55–60 sem justificar queda maior |
| subclassPossible | 45 | 42 | preservar explicação de sinais moderados após reponderação |
| subclassMargin | 8 | 5 | 8 bloqueava padrões distintos; 5 ainda prefere null em disputas próximas |
| toolingArchetypeCap | 30 | 40 | cap 30 tornava Artífice matematicamente incapaz de liderar na amostra |
| Architect | 45/20/15 + tools | 60 structural, 15 maturity, 10 versatility, 10 quality, 5 automation | Escola estrutural deve dominar |
| Artificer | 50 craft, 20 automation, 15/15 support | 60 craft, 15 automation, 10 versatility, 15 maturity | oficina deve depender de tooling diverso |
| Illusionist | 55 visual, 15/15/15 support | 65 visual, 10 structural, 15 versatility, 10 maturity | UI/mobile deve dominar |
| Guardian | 40 quality, 20 collaboration, 20 consistency, 10/10 | 55 quality, 15 collaboration, 15 consistency, 5 maturity, 10 automation | reviews/maturidade não podem criar Guardião sozinhas |
| Chronomancer | 50 automation, 15 craft, 20/15 support | 65 automation, 10 craft, 15 consistency, 10 maturity | automação deve dominar sem workflow isolado |
| craft/automation diversity | nenhum | alvo de 2 tecnologias | Vite ou GitHub Actions isolados não definem identidade |

Efeito: líderes finais da calibração ficaram Arquiteto 4, Artífice 2, Ilusionista 8, Guardião 9 e Cronomante 7. Nenhum passou ao output devido ao blocker de coverage.

## Round 3

Refinamento restrito a raridades míticas:

| Tunable | Antes | Depois | Efeito em 40 |
|---|---|---|---:|
| language-specialist | 70%, 5 repos | 85%, 10 repos | 11→3 |
| five-paths | 3 anos, 5 repos, 25 stars, 25 PRs, 2 afinidades | 10 anos, 50 repos, 1.000 stars, 500 PRs, 500 reviews, 5 afinidades | 30→2 |

## Resultado final

### Class distribution

40 perfis: Mago 19, Bardo 6, Guerreiro 5, Aventureiro 3, Alquimista 3, Patrulheiro 2, Escriba 1, Oráculo 1. Cada classe foi derivada dos bytes observados; conhecimento externo não substituiu os dados.

### Subclass distribution

`null`: 40/40. Líderes internos: Guardião 14, Ilusionista 10, Cronomante 9, Arquiteto 5, Artífice 2.

### Evolution distribution

`null`: 40/40.

### Confidence

Medium 30, low 10; high 0. Coverage partial impede high.

### Coverage

Manifest full 2 (5%), partial 38 (95%), unavailable 0. Linguagens full 36, partial 4, unavailable 0.

## Holdout

| User | V2 | Evaluation | Notes |
|---|---|---|---|
| filipedeschamps | Bardo / null | ACCEPTABLE | leader 52,9 e margem 0,7 |
| diego3g | Mago / null | ACCEPTABLE | leader 56,6, margem 2,3 |
| maykbrito | Mago / null | ACCEPTABLE | leader 58,4, margem 1,1 |
| loiane | Mago / null | QUESTIONABLE | Ilusionista 61,7, medium, margem 10,4; partial veta |
| beatrizmilz | Bardo / null | ACCEPTABLE | Cronomante 48,2 abaixo do strong |
| omariosouto | Mago / null | QUESTIONABLE | Ilusionista 69,4, medium, margem 9,9; partial veta |
| swyxio | Bardo / null | ACCEPTABLE | Guardião 59,2, margem 3,8 |
| antfu | Mago / null | QUESTIONABLE | Guardião 68,4, medium, margem 8,4; partial veta |
| samuelcolvin | Alquimista / null | ACCEPTABLE | líderes empatados em 60,6 |
| ThePrimeagen | Aventureiro / null | ACCEPTABLE | Cronomante 62,7, margem 3,3 |

Resumo: GOOD 0; ACCEPTABLE 7; QUESTIONABLE 3; BAD 0. GOOD+ACCEPTABLE = 70%, abaixo da meta de 85%. A revisão completa dos 40 está em `artifacts/game-v2-benchmark/human-evaluations.json`.

## Framework detection

Falsos positivos confirmados: 2 referências Docker vendorizadas no R0; 0 após R1 na amostra manual.  
Falsos negativos confirmados: 0. Risco não resolvido: manifests/configs omitidos pelo limite de dois arquivos por repo impedem afirmar recall suficiente. Monorepos continuam deduplicados por repo.

## Tooling detection

O R0 deixava GitHub Actions recorrente dominar Cronomante e múltiplas ferramentas inflarem médias. A R2 adicionou diversidade e reponderação. Vite/GitHub Actions isolados não concederam subclasse no resultado final. Resultado do detector: PASS; resultado de coverage: FAIL.

## Conquistas

54 total: 11 common, 13 rare, 16 epic, 8 legendary, 6 mythic. Itens míticos finais tiveram 3 unlocks totais na calibração; `language-specialist-70` desbloqueou 3/40 e `five-paths` 2/40. `schools-fullstack`, `ecosystems-3`, `perfect-balance` e `living-legend` ficaram em 0/40, sem alteração automática por ausência numa amostra pequena. Itens suspeitos ainda frequentes na amostra madura: `active-days-365`, `consistent-years-5` e `collaboration-triad-25`; não foram alterados por viés da matriz.

As 6 secretas foram confirmadas. O presenter público retorna `???` e não expõe lore, requisito ou progresso quando locked; os testes cobrem o contrato.

## Títulos

40 total: 5 common, 12 rare, 14 epic, 7 legendary, 2 mythic. Dezessete títulos nunca desbloquearam, incluindo os cinco títulos de prática, três híbridos e o título derivado de living legend. Na amostra de 10 perfis, os títulos disponíveis descrevem principalmente métricas V1 (stars, commits, PRs, idade), não identidade V2; resultado FAIL enquanto subclasses permanecerem bloqueadas.

## Evoluções

7 total; frequência observada 0/40. Elegíveis/unlocks: 0/0 para todas. Blocker comum: `subclass_required`; coverage full e confidence high também não ocorreram. Near cases: EvanBacon para Arcane Weaver (score 75,2, mas partial/subclass null); os demais ficaram abaixo de score, compatibilidade ou diversidade. Evolução não é trivial, mas não foi demonstrada como atingível pela coleta real.

## Explicabilidade

As explicações correspondem aos bytes, scores, coverage e reason codes, não afirmam competência e explicam `null`. PASS técnico. A utilidade é limitada porque `coverage_could_change_winner` responde por 38/40 decisões finais.

## Performance

| Métrica cold | Valor |
|---|---:|
| P50 | 27,5 s |
| P75 | 35,9 s |
| P90 | 45,0 s |
| Max | 67,3 s |

Faixas propostas: ideal <=10 s; aceitável >10–20 s; problemática >20 s. Apenas 7/40 ficaram no ideal e 14/40 em até 20 s. Warm em cache de processo ficou abaixo de 1 ms, mas não prova cache persistente ou multi-instância.

## Request budget

| Métrica V2 | Média | P90 | Máximo |
|---|---:|---:|---:|
| REST | 53,5 | 89 | 90 |
| GraphQL | 0 | 0 | 0 |
| Manifest/tree | 52,5 | 88 | 89 |
| Repos inspected | 23,3 | 30 | 30 |

V1, no mesmo cold run: média 1 REST e 7,8 GraphQL (P90 12, max 24). O budget V2 compra coverage full em apenas 5% da matriz; FAIL econômico.

## V1 Regression

12/12? SIM.  
Arquivos V1 alterados? NÃO.  
Diff em `src/game`, `balance-snapshot-v1.json` e `balance-snapshot.json`: zero.

## Invariantes V2

30/30? SIM. Replays reais: 40/40 semanticamente idênticos com os inputs congelados.

## Testes

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: FAIL — 996/997; `CharacterPageSharing.test.tsx` excedeu 5 s em duas execuções completas. O mesmo caso passou isolado em 3,5 s. Não foi alterado por estar fora de `src/game-v2` e pelo bloqueio explícito de frontend.
- `npm run build`: PASS
- `npm run balance:review`: 12/12 PASS
- `npm run balance:review:v2`: 30/30 PASS

## Promotion Gate

| Área | Resultado |
|---|---|
| Correctness | FAIL |
| Framework detection | FAIL |
| Tooling | PASS |
| Confidence | PASS |
| Partial coverage | FAIL |
| Class distribution | PASS |
| Subclass distribution | FAIL |
| Evolutions | FAIL |
| Achievements | PASS |
| Titles | FAIL |
| Explainability | PASS |
| Determinism | PASS |
| Performance | FAIL |
| Request budget | FAIL |
| V1 isolation | PASS |

## Hard blockers

- 38/40 perfis com manifest coverage partial.
- Lower-bound partial é tratado como veto total; upper-bound determinístico por repo ainda não existe.
- 0/40 subclasses e 0/40 evoluções.
- Holdout GOOD+ACCEPTABLE de 70%.
- P90 cold de 45 s e P90 de 89 REST requests.
- Dois arquivos por repo omitem candidatos suficientes para impedir recall/coverage confiáveis.
- Títulos V2 de identidade não foram exercitados em perfis reais.

## Decisão

**DO NOT PROMOTE**

## Justificativa

Os detectores e o balanceamento interno melhoraram, invariantes e determinismo passaram, e a V1 permaneceu isolada. Porém, a combinação coleta + coverage impede a V2 de produzir sua principal proposta de valor em perfis reais. Afrouxar o gate partial para atingir percentuais seria desonesto; aumentar requests no caminho síncrono agravaria uma latência já inviável.

## Engine version final

`2.0-experimental`  
Detector: `game-engine-v2-detectors-2`  
Balance: `game-engine-v2-balance-stage3-r3`

## Arquivos alterados

- `src/game-v2/constants.ts`, `types.ts`, `collector.ts`, `scoring.ts`, `decisions.ts`, `achievements.ts`, `catalogs.ts`, `engine.test.ts`, `invariants.ts` e snapshot experimental.
- `scripts/gameV2Stage3.ts`, `scripts/analyzeGameV2Benchmark.ts` e scripts/comandos V2 já presentes na Etapa 2.
- `artifacts/game-v2-benchmark/` com inputs congelados, R0, R1, R2, R3, final, CSVs, análises e revisão humana.
- `GAME_ENGINE_V2_IMPLEMENTATION.md` e este relatório.

Nenhum arquivo de frontend, Duelo, Chronicle ou V1 foi alterado por esta etapa. Alterações de UI já existentes no worktree foram preservadas e não fazem parte deste trabalho.

## Próximo passo recomendado

Executar uma Etapa 3.1 focada somente em coleta/coverage: persistir cache fora do processo; separar omissions por repo e arquivo; coletar manifests em batch/GraphQL quando autenticado; calcular upper bounds por arquétipo; considerar background/lazy enrichment e stale cache; então repetir exatamente os 10 holdouts sem recalibrá-los.

**A Game Engine V2 está pronta para ser integrada ao produto?**

**NÃO**

---

# Evidence Collector V2.1 Rebenchmark

## Status

Executado em 2026-10-07 sobre os mesmos 40 perfis, com os mesmos 30 de calibração e 10 de holdout. O balanceamento permaneceu `game-engine-v2-balance-stage3-r3`; nenhuma regra foi ajustada com o holdout.

Resultado: **COLLECTOR IMPROVED, BALANCE STILL BLOCKED**.

## Delta OLD → V2.1

| Métrica | Antes | Depois | Delta |
|---|---:|---:|---:|
| Full coverage | 2/40 | 21/40 | +19 |
| Partial coverage | 38/40 | 19/40 | -19 |
| Unavailable | 0/40 | 0/40 | 0 |
| Cold P50 | 27,5 s | 13,5 s | -51,1% |
| Cold P90 | 45,0 s | 33,1 s | -26,3% |
| Cold máximo | 67,3 s | 52,7 s | -21,8% |
| REST P90 | 89 | 31 | -65,2% |
| Tree requests P90 | 30 | 30 | 0 |
| Manifest API requests P90 | ~58 blobs REST | 5 batches GraphQL | mudança de unidade/estratégia |
| Repos inspecionados, média | 23,3 | 23,3 | 0 |
| Schools por perfil | 2,35 | 2,55 | +0,20 |
| Artifacts por perfil | 5,58 | 6,15 | +0,57 |
| Subclasses | 0/40 | 1/40 | +1 |
| Evoluções | 0/40 | 0/40 | 0 |
| Holdout GOOD + ACCEPTABLE | 70% | 90% | +20 p.p. |

Tempos internos V2.1: tree discovery P50 1,75 s/P90 2,65 s; manifest fetch P50 2,36 s/P90 4,54 s; scoring P90 5,63 ms. A diferença entre esses tempos e a latência cold total vem majoritariamente da coleta completa do perfil V1 usada para comparação equivalente.

## Coverage e budget

- Gaps: 21 `none`, 8 `small`, 11 `large`.
- REST: média 24,3; P90 31; máximo 31.
- Tree requests: média 23,3; P90 30.
- Manifest batches: média 2,6; P90 5; máximo 6.
- O objetivo inicial de pelo menos 50% full foi atingido: 52,5%.
- A redução REST de 65,2% atingiu a faixa desejada de 40–60% ou superior.
- O P90 de latência permaneceu acima da meta aproximada de 20 s.

## Framework e tooling

A auditoria usou 12 perfis e somente os manifests/configs coletados como ground truth. Foram confirmados 36/36 itens de Escola e 78/78 itens de Artefato observáveis, sem falso positivo ou falso negativo confirmado nesses arquivos. Cinco perfis da amostra ainda são partial; portanto, não se afirma recall dos arquivos que o budget não leu.

Fixtures agora são excluídas. Docs/examples/demos/playgrounds/templates têm peso 0,5. Lockfiles isolados não criam evidência; `packageManager` é a fonte primária de pnpm/Yarn.

## Subclasses e evoluções

Com os tunables inalterados:

- `sharkdp`: Cronomante strong, score 58,7, margem 20,0, confidence medium, coverage full;
- 18 perfis: coverage ainda poderia mudar o vencedor;
- 12: score abaixo de 55;
- 8: margem abaixo de 5;
- 1: confidence insuficiente;
- 1: strong.

O padrão não justifica reduzir thresholds: vários perfis full têm disputas reais entre arquétipos, enquanto perfis com líderes fortes ainda concentram gaps de coleta. Evoluções permanecem 0/40 porque a única subclasse concedida tem confidence medium e os gates exigem high/full.

## Conquistas e títulos

Nenhuma conquista foi criada ou recalibrada. Três conquistas não apareceram na matriz final (`languages-8`, `ecosystems-3`, `perfect-balance`), sem evidência para alterar seus gates.

Títulos nunca desbloqueados caíram de 17 para 13. `title-practice-chronomancer` passou a ser exercitado pela única subclasse strong; os quatro outros títulos de prática e os títulos híbridos continuam bloqueados. Nenhum título foi alterado.

## Holdout

Revisão técnica sem uso para calibração: GOOD 0, ACCEPTABLE 9, QUESTIONABLE 1, BAD 0. GOOD + ACCEPTABLE = 90%. `antfu` permanece QUESTIONABLE: o líder é forte, mas 67 manifests descobertos ficaram fora do teto global, tornando o `null` seguro porém insatisfatório como entrega de produto.

## Determinismo e decisão

40/40 replays offline foram semanticamente idênticos. O collector atingiu as metas de coverage e request budget, mas não a meta de P90, não demonstrou subclasses em escala e não tornou evoluções atingíveis na matriz. A decisão é **COLLECTOR IMPROVED, BALANCE STILL BLOCKED**. Não iniciar integração de produto.

## Promotion Gate 3B

| Área | Resultado |
|---|---|
| Correctness | PASS |
| Framework detection | PASS |
| Tooling detection | PASS |
| Coverage | PASS |
| Confidence | PASS |
| Subclass | FAIL |
| Evolution | FAIL |
| Achievements | PASS |
| Titles | FAIL |
| Explainability | PASS |
| Determinism | PASS |
| Performance | FAIL |
| Request budget | PASS |
| V1 isolation | PASS |

---

# Evidence Bounds + Subclass Calibration — Etapa 3C

Executada em 2026-10-07 com os mesmos 40 snapshots V2.1 e o mesmo balance `game-engine-v2-balance-stage3-r3`. Foram adicionados lower/upper bounds determinísticos, winner worst-case, rival best-case e guaranteed margin. Nenhum threshold, margem, confidence gate, maturity gate ou peso foi alterado.

Resultado R0: subclasses 1/40 → 2/40. `kentcdodds` tornou-se Guardião sob partial-large porque lower 73,86 preserva margem 6,17 sobre o maior rival upper 67,69. `EvanBacon` permaneceu null: lower 74,85 contra rival upper 70,64 produz margem 4,21, abaixo de 5. Evoluções continuaram 0/40.

Confidence: low 11, medium 25, high 4, unavailable 0. High foi observado em quatro perfis reais e demonstrado por fixture. O audit de margin/threshold/maturity não sustentou nova calibração sem overfit.

Holdout final: GOOD 0, ACCEPTABLE 9, QUESTIONABLE 1, BAD 0; GOOD+ACCEPTABLE 90%. Determinismo 40/40. Bounds adicionaram zero request; REST P90 permaneceu 31 e cold P90 33,146 s. P90 de scoring anterior foi 5,63 ms; engine com bounds mediu 4,53 ms nesta execução.

Decisão: **BOUNDS IMPROVED, CALIBRATION STILL BLOCKED**. Relatório completo: `GAME_ENGINE_V2_BOUNDS_V22.md`. Artefatos: `benchmark-v22-bounds-baseline.json`, `analysis-v22-bounds.json` e `benchmark-v22-holdout.json`.

Gates finais: lint PASS; typecheck PASS; 1.014/1.014 testes PASS; build PASS; V1 12/12; V2 37/37. O suite preserva warnings React preexistentes de `act(...)` em testes de UI.

---

# Archetype Signal Analysis + Calibration — Etapa 3D

A Etapa 3D analisou primeiro somente os 30 perfis de calibration. O R0 encontrou cinco correlações acima de 0,75, 11 sinais compartilhados e 15/30 margens de até quatro pontos. O diagnóstico foi overlap + especificidade fraca, não threshold.

O R1 adicionou specificity weights, generic signal cap 42 e compostos gerais de estrutura, oficina, UI visual, qualidade e automação. Threshold 55, possible 42 e margem 5 foram preservados; R2 não foi necessário. Quatro das cinco correlações excessivas caíram abaixo de 0,75. Calibration produziu 9/30 subclasses: 6 GOOD, 3 ACCEPTABLE, 0 QUESTIONABLE e 0 BAD.

O holdout foi executado uma única vez após fechar R1 e não foi usado para tuning. Resultado: 0/10 subclasses, 8 ACCEPTABLE, 2 QUESTIONABLE, 0 BAD; GOOD+ACCEPTABLE 80%. A diferença 30%→0% na taxa de subclasses e dois vetoes partial-small subinformativos impediram declarar generalização.

Final 40: Artífice 1, Ilusionista 3, Cronomante 5, null 31; Arquiteto e Guardião permanecem alcançáveis por fixtures realistas. Evoluções reais 0. Três títulos de prática e um híbrido foram exercitados. Determinismo 40/40; REST P90 31; zero request novo; V1 12/12; V2 41/41; 1.015/1.015 testes e build PASS.

Decisão: **ARCHETYPES IMPROVED — MORE CALIBRATION NEEDED**. A lógica de subclasses ainda não está pronta para sair da calibração. Relatório completo: `GAME_ENGINE_V2_ARCHETYPE_CALIBRATION_V23.md`.

---

# Independent Generalization Matrix — Etapa 3E

Uma matriz independente de 30 perfis foi definida e congelada antes de ler resultados V2: frontend/UI 6, backend/architecture 6, tooling/library 5, testing/quality 4, automation/devops 4, systems/low-level 3 e mobile/polyglot 2. A interseção com os 40 perfis anteriores é vazia.

O baseline V23, sem tuning, produziu 12/30 subclasses (40%) e 18 nulls. Todos os cinco arquétipos foram top1, passaram score 55 e produziram safe winner; a distribuição concedida foi Architect 1, Artificer 3, Illusionist 2, Guardian 1 e Chronomancer 5. Avaliação humana: GOOD 16, ACCEPTABLE 12, QUESTIONABLE 2, BAD 0 (93.3% GOOD+ACCEPTABLE).

A matriz teve 16 full, 7 partial-small e 7 partial-large. Todos os sete partial-small foram matematicamente unsafe; nenhum foi vetado apenas por cobertura. Correlações >=0.75: zero. Compostos ativaram 84 vezes e em todos os arquétipos. Remover o generic cap 42 offline teve delta absoluto médio 0.01, sem mudança de top score reportada. Não houve evidência para G1; balance e engine permaneceram V23.

O holdout fechado foi repetido apenas depois dessa decisão: 0/10 subclasses, GOOD 0, ACCEPTABLE 8, QUESTIONABLE 2, BAD 0, ou 80% GOOD+ACCEPTABLE. O diagnóstico final é **SIGNIFICANT DISTRIBUTION SHIFT**, não overfit global. Como o holdout não atingiu a referência de 85%, a decisão é **GENERALIZATION IMPROVED — ONE BLOCKER REMAINS** e a calibração de subclasses não é encerrada.

Determinismo da Etapa 3E: independent 30/30 e holdout 10/10. Request budget: REST P90 31, GraphQL P90 4, zero request de calibração. Uma evolução real (`evo-ancestral-forger`) apareceu somente como observação; nenhum gate de evolução, título ou conquista foi calibrado.

Relatórios: `GAME_ENGINE_V2_GENERALIZATION_MATRIX_V24.md`, `GENERALIZATION_ANALYSIS_G0.md`, `GAME_ENGINE_V2_GENERALIZATION_V24.md`. Artefatos: `artifacts/game-v2-generalization/`.

---

# Null Quality Gate + Final Subclass Decision — Etapa 3F

A auditoria offline reexecutou os 70 snapshots existentes sem tuning e sem novos requests. Resultado: 21 subclasses e 49 nulls; subclasses GOOD 13, ACCEPTABLE 7, QUESTIONABLE 1, BAD 0; precisão GOOD + ACCEPTABLE de 95,2%; `INCORRECT_SUBCLASS` 0.

Os nulls foram classificados em 19 `JUSTIFIED_NULL`, 20 `AMBIGUOUS_NULL`, 10 `CONSERVATIVE_NULL` e 0 `INCORRECT_NULL`. Null quality global: 79,6%; incorrect null rate: 0%; conservative null rate: 20,4%. O holdout fechado contém 1 justified, 7 ambiguous, 2 conservative e 0 incorrect: seus 0/10 subclasses não representam 0/10 decisões corretas.

Os dois antigos `QUESTIONABLE`, `diego3g` e `samuelcolvin`, são `CONSERVATIVE_NULL`: ambos têm vencedor provável, mas `partial-small`, `safeWinner=false` e guaranteed margin negativo. O gate é `BOUNDS`; nenhum threshold foi alterado.

Decision Quality: calibration 86,7%; holdout 80,0%; independent 83,3%; total 84,3%. Na amostra pequena, os valores ficam próximos das referências e não há falha confirmada. O replay foi 70/70 determinístico e 70/70 semanticamente idêntico; requests adicionados 0; V1 permaneceu isolado.

Decisão: **SUBCLASS LOGIC ACCEPTABLE WITH CONSERVATIVE NULLS**. A calibração de subclasses pode ser encerrada. Próximo passo elegível: **EVOLUTION VALIDATION**, somente mediante autorização explícita. Relatório: `GAME_ENGINE_V2_NULL_QUALITY_V25.md`. Artefatos: `artifacts/game-v2-null-quality/`.

---

# Evolution Validation — Etapa 3G

Os 70 snapshots congelados foram reexecutados sem coleta. E0: 65 maduros, 19 maduros com subclasse, uma evolução (`developit -> evo-ancestral-forger`), 70/70 determinístico e zero request novo. O unlock foi revisado como GOOD.

Seis evoluções estavam saudáveis. Alto Cronomante era estruturalmente inalcançável porque confidence high exige dois tipos primários de fonte, enquanto Actions, Docker e Terraform são config-only. Uma única E1 mudou apenas a confidence dessa evolução de high para medium; todos os demais gates foram preservados. A distribuição permaneceu 1/70 e o holdout locked permaneceu 0/10, sem comportamento absurdo.

As sete evoluções passaram reachability com fixtures plausíveis, near-miss, incompatibilidade, coverage/confidence, counterfactual, estabilidade, múltipla elegibilidade e ausência de ciclos/título equipado. Decisão: **EVOLUTION SYSTEM READY WITH CONSERVATIVE GATES**. Engine `2.0-experimental-v24-evo`; V2 não promovida. Relatório: `GAME_ENGINE_V2_EVOLUTION_VALIDATION.md`. Artefatos: `artifacts/game-v2-evolution/`.
# Etapa 3H — Performance / Delivery

Baseline preservada: coorte fixa de 15 perfis do benchmark live Collector V2.1. Cold P50/P90: 13,222 s / 47,421 s. Warm collector P50/P90: 805,31 ms / 1.087,78 ms. P1 cache de resultado local P50/P90: 0,01 ms / 0,02 ms, com 15/15 deep-equal no caminho delivery. Cold e request count não mudaram. Artefatos: `artifacts/game-v2-performance/`. Decisão: **LOGIC READY, PERSISTENT CACHE REQUIRED BEFORE INTEGRATION**.

