# Game Engine V2 — Etapa 3F

> **Historical record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

## Status

Auditoria final de qualidade das decisões de subclasse concluída em 2026-10-07. A análise foi offline, usou somente os 70 snapshots existentes e não alterou runtime, pesos, thresholds, collector, frontend, API pública, V1, Duel, Chronicle ou evoluções.

## Objective

Separar ausência correta de subclasse, ambiguidade legítima, conservadorismo e falso negativo real. Taxa de subclasses não foi usada como proxy de sucesso.

## Datasets

- Calibration: 30 perfis.
- Holdout: 10 perfis, locked e não usado para tuning.
- Independent: 30 perfis.
- Total: 70 perfis.

## Subclass Decisions

Total subclasses: **21**. Total nulls: **49**.

## Subclass Precision

| Qualidade | Contagem |
|---|---:|
| GOOD | 13 |
| ACCEPTABLE | 7 |
| QUESTIONABLE | 1 |
| BAD | 0 |

Precision, contando GOOD + ACCEPTABLE: **20/21 = 95,2%**. Calibration: **9/9 = 100%**. Independent: **11/12 = 91,7%**. Holdout não concedeu subclasses. O único `QUESTIONABLE`, `paulirish`, permanece em revisão sem evidência suficiente para declará-lo falso positivo. `INCORRECT_SUBCLASS`: **0/21 (0%)**.

## Null Quality — Global

| Tipo | Contagem |
|---|---:|
| JUSTIFIED_NULL | 19 |
| AMBIGUOUS_NULL | 20 |
| CONSERVATIVE_NULL | 10 |
| INCORRECT_NULL | 0 |

Null quality: **39/49 = 79,6%**. Conservative null rate: **10/49 = 20,4%**. Incorrect null rate: **0/49 = 0%**.

O valor global fica 0,4 ponto percentual abaixo da referência inferior de 80%, diferença de um perfil numa amostra pequena. Como não há falso negativo confirmado, falso positivo confirmado ou padrão de `INCORRECT_NULL`, isso é tratado como aceitável com conservadorismo explícito, não como justificativa para reduzir gates.

## Original Calibration Null Quality

11 `JUSTIFIED_NULL`, 6 `AMBIGUOUS_NULL`, 4 `CONSERVATIVE_NULL`, 0 `INCORRECT_NULL`. Null quality: **81,0%**. Decision Quality: **86,7%**.

## Original Holdout Null Quality

1 `JUSTIFIED_NULL`, 7 `AMBIGUOUS_NULL`, 2 `CONSERVATIVE_NULL`, 0 `INCORRECT_NULL`. Null quality: **80,0%**.

| User | Top Archetype | Score | Margin | Coverage | Confidence | Null Type | Reason |
|---|---|---:|---:|---|---|---|---|
| antfu | Ilusionista | 91,39 | 1,15 | partial-large | medium | AMBIGUOUS_NULL | Ilusionista e Artífice são fortes e separados por apenas 1,15. |
| beatrizmilz | Cronomante | 36,82 | 1,15 | full | medium | JUSTIFIED_NULL | Automação recorrente, mas sem padrão específico forte. |
| diego3g | Ilusionista | 76,02 | 11,53 | partial-small | medium | CONSERVATIVE_NULL | Vencedor provável; guaranteed margin -22,58 ainda permite inversão. |
| filipedeschamps | Arquiteto | 53,39 | 1,03 | partial-large | medium | AMBIGUOUS_NULL | Score abaixo de strong e práticas quase empatadas. |
| loiane | Cronomante | 67,12 | 0,47 | full | medium | AMBIGUOUS_NULL | Cronomante e Arquiteto praticamente empatados. |
| maykbrito | Artífice | 73,44 | 1,10 | full | high | AMBIGUOUS_NULL | Artífice e Ilusionista têm evidência forte e equivalente. |
| omariosouto | Arquiteto | 72,26 | 0,89 | partial-small | medium | AMBIGUOUS_NULL | Arquiteto e Ilusionista permanecem indistinguíveis. |
| samuelcolvin | Artífice | 73,48 | 11,40 | partial-small | medium | CONSERVATIVE_NULL | Vencedor provável; guaranteed margin -28,94 mantém veto de bounds. |
| swyxio | Ilusionista | 72,16 | 4,81 | full | high | AMBIGUOUS_NULL | Ilusionista e Guardião ficam dentro da margem mínima de 5. |
| ThePrimeagen | Arquiteto | 62,98 | 2,69 | partial-large | medium | AMBIGUOUS_NULL | Arquiteto e Cronomante próximos, com gap grande. |

### Auditoria profunda do holdout

- `antfu`: prática dominante não é única; Vue/Storybook sustentam Ilusionista, enquanto ESLint/pnpm/Vitest/Vite sustentam Artífice. Evidência específica existe para ambos; margem 1,15 não é significativa; bounds permitem inversão; confidence medium é coerente; o null evita escolha arbitrária. **AMBIGUOUS_NULL**.
- `beatrizmilz`: não há prática dominante forte; GitHub Actions é recorrente, porém genérico e sem composto específico; margem é irrelevante diante de score 36,82; full/medium é coerente; o null evita transformar um único sinal em especialização. **JUSTIFIED_NULL**.
- `diego3g`: Ilusionista é provável por React recorrente, React Native, Expo e sinais visuais; a margem 11,53 é material; partial-small ainda permite inversão e derruba guaranteed margin para -22,58; medium é coerente; o null é prudente, mas subinformativo. **CONSERVATIVE_NULL**.
- `filipedeschamps`: não há prática dominante defensável; Arquiteto, Cronomante e outras leituras permanecem próximas; sinais estruturais são majoritariamente genéricos; score 53,39 não chega a strong; partial-large permite ampla inversão; o null protege contra preenchimento artificial. **AMBIGUOUS_NULL**.
- `loiane`: Angular/Spring e Docker/Actions sustentam mais de uma prática; diferença 0,47 não é significativa; em full coverage os próprios scores confirmam a ambiguidade; medium é coerente; o null é necessário. **AMBIGUOUS_NULL**.
- `maykbrito`: Electron/Webpack favorecem Artífice, enquanto React/Astro/Tailwind favorecem Ilusionista; diferença 1,10 não é significativa; full/high torna a ambiguidade mais confiável, não menos real; o null evita escolher arbitrariamente. **AMBIGUOUS_NULL**.
- `omariosouto`: React/Next/Express sustentam Arquiteto e o conjunto UI sustenta Ilusionista; diferença 0,89 não é significativa; partial-small amplia a inversão possível; medium é coerente; o null é protetivo. **AMBIGUOUS_NULL**.
- `samuelcolvin`: Webpack/esbuild e tooling recorrente favorecem Artífice; margem 11,40 é material; partial-small produz guaranteed margin -28,94; medium é coerente; o null é prudente, porém merece observação de bounds. **CONSERVATIVE_NULL**.
- `swyxio`: Svelte/UI e testing sustentam Ilusionista e Guardião; margem 4,81 está abaixo do gate; full/high confirma que a disputa não decorre de baixa qualidade da coleta; o null evita escolha instável. **AMBIGUOUS_NULL**.
- `ThePrimeagen`: sinais estruturais e automação são próximos; margem 2,69 não é significativa; partial-large permite inversão; medium é coerente; o null evita inferir uma prática por fama externa. **AMBIGUOUS_NULL**.

## Holdout Decision Quality

Decisões corretas: **8/10 = 80%**. Revisão conservadora: **2/10 = 20%**. Falhas: **0/10**. Assim, `0/10 subclasses` não é blocker por si só: oito nulls são semanticamente corretos e dois são prudentes, sem `INCORRECT_NULL`.

## Independent Null Quality

7 `JUSTIFIED_NULL`, 7 `AMBIGUOUS_NULL`, 4 `CONSERVATIVE_NULL`, 0 `INCORRECT_NULL`. Null quality: **77,8%**. Decision Quality: **83,3%**; inclui também uma subclasse `QUESTIONABLE` em revisão.

## Nulls by Archetype

| Archetype | Justified | Ambiguous | Conservative | Incorrect |
|---|---:|---:|---:|---:|
| Arquiteto | 2 | 5 | 0 | 0 |
| Artífice | 4 | 3 | 2 | 0 |
| Ilusionista | 3 | 8 | 3 | 0 |
| Guardião | 2 | 3 | 1 | 0 |
| Cronomante | 8 | 1 | 4 | 0 |

Cronomante concentra 4/10 conservadores, todos ligados a sinais de automação com bounds parciais, mas também concentra oito nulls justificados por score baixo. Não há `INCORRECT_NULL` sistemático por arquétipo.

## Nulls by Coverage

| Coverage | Justified | Ambiguous | Conservative | Incorrect | Null quality |
|---|---:|---:|---:|---:|---:|
| full | 11 | 4 | 1 | 0 | 93,8% |
| partial-small | 5 | 5 | 5 | 0 | 66,7% |
| partial-large | 3 | 11 | 4 | 0 | 77,8% |

`partial-small` gera conservadorismo em excesso relativo: 5/15. Isso é um diagnóstico de bounds/coverage, não evidência para baixar o gate nesta etapa.

## Nulls by Confidence

| Confidence | Justified | Ambiguous | Conservative | Incorrect |
|---|---:|---:|---:|---:|
| low | 8 | 1 | 1 | 0 |
| medium | 10 | 17 | 9 | 0 |
| high | 1 | 2 | 0 | 0 |

Não existe high-confidence `INCORRECT_NULL`.

## Nulls by Margin

| Margin | Justified | Ambiguous | Conservative | Incorrect |
|---|---:|---:|---:|---:|
| 0–2 | 3 | 5 | 0 | 0 |
| >2–5 | 3 | 5 | 0 | 0 |
| >5–8 | 3 | 3 | 0 | 0 |
| >8–12 | 3 | 5 | 3 | 0 |
| >12 | 7 | 2 | 7 | 0 |

O conservadorismo aparece somente quando há margem observada relevante; nulls de margem curta são corretamente justificados ou ambíguos.

## Two Previous QUESTIONABLE Holdouts

`diego3g` e `samuelcolvin` são **CONSERVATIVE_NULL**, não `INCORRECT_NULL`. Ambos têm score forte, evidência específica e margem observada defensável, mas são `partial-small`, não são safe winners e têm guaranteed margins negativos. O gate responsável é `BOUNDS`. Como os gates objetivos não estão todos satisfeitos, classificá-los como falsos negativos seria mais forte que a evidência.

## False Positives

`INCORRECT_SUBCLASS`: **0**. False positive rate: **0/21 = 0%**. `paulirish` permanece `QUESTIONABLE`, não `BAD` nem falso positivo confirmado.

## False Negatives

`INCORRECT_NULL`: **0**. Incorrect null rate: **0/49 = 0%**.

## Conservative Gate Diagnostics

| Gate | Count |
|---|---:|
| BOUNDS | 9 |
| CONFIDENCE | 1 |

Não há três `INCORRECT_NULL` causados pelo mesmo gate nem problema estrutural recorrente comprovado. Portanto, o critério da etapa para recomendar nova calibração não foi atingido.

## Decision Matrix

| Evidência | Resultado diagnóstico |
|---|---|
| Strong score + safe winner + sufficient confidence + mature | SUBCLASS |
| Strong score + unsafe winner + práticas plausíveis concorrentes | AMBIGUOUS_NULL |
| Weak score | JUSTIFIED_NULL |
| Safe/probable winner + um gate conservador | CONSERVATIVE_NULL |
| Todos os gates objetivamente satisfeitos + null | INCORRECT_NULL |

## Explainability

As explicações são determinísticas e podem permanecer internas:

| Tipo | PT-BR | EN |
|---|---|---|
| JUSTIFIED_NULL | Seu perfil ainda não apresenta uma prática técnica dominante o suficiente para definir uma especialização. | Your profile does not yet show a technical practice dominant enough to define a specialization. |
| AMBIGUOUS_NULL | Há sinais fortes de mais de uma especialização, sem evidência suficiente para escolher uma delas com segurança. | There are strong signals for more than one specialization, without enough evidence to choose one safely. |
| CONSERVATIVE_NULL | Existe uma especialização provável, mas a evidência disponível ainda não atinge o nível de confiança necessário. | There is a likely specialization, but the available evidence does not yet reach the required confidence level. |
| SUBCLASS | As evidências observadas sustentam esta especialização mesmo considerando a incerteza restante. | The observed evidence supports this specialization even after accounting for the remaining uncertainty. |

Nenhuma dessas mensagens foi conectada à UI ou à API pública.

## Evolution Observation

`developit → evo-ancestral-forger` permanece apenas uma observação. Não houve tuning ou validação de evolução nesta etapa.

## Determinism

**70/70** reexecuções offline idênticas e **70/70** resultados semanticamente idênticos aos artefatos anteriores. As invariantes diagnósticas confirmam exclusividade entre subclasse/null, coerência de `safeWinner` e ausência de impacto no runtime.

## Performance Regression

Nenhuma otimização e nenhuma mudança de runtime. No replay local final, scoring P90 foi **2,14 ms** e máximo **9,57 ms**. Não houve coleta cold nem alteração que possa sustentar uma nova conclusão de performance.

## Requests

Esperado: 0 novos requests da engine. Observado: **0**.

## V1 Regression

`npm run balance:review`: **12/12 PASS**. Diff protegido zero em `src/game`, `src/features/duel`, `balance-snapshot.json` e `balance-snapshot-v1.json`.

## Tests

`npm run lint`: PASS. `npm run typecheck`: PASS. `npm test`: **74 arquivos e 1.015/1.015 testes PASS**. `npm run balance:review:v2`: **41/41 invariantes PASS**. `npm run game:v2:stage3f`: PASS. Permanecem apenas warnings preexistentes de React `act(...)` em testes de UI.

## Build

`npm run build`: **PASS** com Next.js 15.5.27.

`npm run test:e2e` não foi executado: a etapa não alterou UI, rotas, API pública ou comportamento de runtime.

## Promotion Gate

| Área | Resultado |
|---|---|
| Subclass precision | PASS — 95,2% |
| Null quality | PASS WITH SAMPLE CAVEAT — 79,6%, 0,4 p.p. abaixo da referência |
| Incorrect null rate | PASS — 0% |
| False positive rate | PASS — 0% confirmado |
| Holdout decision quality | PASS WITH CONSERVATIVE NULLS — 80% corretos, 20% revisão, 0 falhas |
| Independent generalization | PASS |
| Archetype reachability | PASS |
| Bounds | PASS WITH CONSERVATISM |
| Confidence | PASS |
| Explainability | PASS |
| Determinism | PASS — 70/70 |
| V1 isolation | PASS |

## Hard Blockers

Nenhum blocker de subclass calibration permanece. `partial-small` e os dez conservadores são itens observacionais para futura evolução do modelo, não falhas que autorizem tuning nesta etapa. Performance cold continua fora do escopo desta decisão e não foi reclassificada.

## Decision

**SUBCLASS LOGIC ACCEPTABLE WITH CONSERVATIVE NULLS**.

## Engine Version

Permanece `2.0-experimental-v23`. O runtime não mudou; não existe versão V25 de engine. `V25` identifica somente este relatório diagnóstico.

## Arquivos Alterados

- `scripts/gameV2Stage3F.ts`
- `package.json`
- `GAME_ENGINE_V2_NULL_QUALITY_V25.md`
- `GAME_ENGINE_V2_BENCHMARK.md`
- `artifacts/game-v2-null-quality/null-quality-all.json`
- `artifacts/game-v2-null-quality/null-quality-holdout.json`
- `artifacts/game-v2-null-quality/decision-quality-summary.json`

## Próximo Passo

**EVOLUTION VALIDATION**, somente quando explicitamente autorizada. Ainda não iniciar performance, promoção, integração ou tuning.

## Conclusão

**A calibração do sistema de subclasses pode ser encerrada? SIM.**

O holdout 0/10 deixa de ser blocker porque contém oito nulls corretos, dois conservadores e zero nulls incorretos. A decisão respeita a preferência por false negative moderado sobre false positive e não reduz nenhum gate para preencher personagens artificialmente.
