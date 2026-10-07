# Game Engine V2 — Etapa 3G

## Status

**EVOLUTION SYSTEM READY WITH CONSERVATIVE GATES**.

A validação de Evoluções foi concluída. A V2 continua experimental, isolada e não promovida.

## Engine Version

`2.0-experimental-v24-evo`  
Balance: `game-engine-v2-balance-v24-evolution-confidence`

## Evolutions Catalog

| ID | Nome PT | Nome EN | Classe elegível | Subclasse elegível | Raridade | Gates |
|---|---|---|---|---|---|---|
| `evo-archmage` | Arquimago | Archmage | Mago | Arquiteto/Ilusionista | Mítica | score 75; afinidade 70%; 2 Escolas 60; Experiência 65; high/full |
| `evo-celestial-guardian` | Guardião Celestial | Celestial Guardian | qualquer | Guardião | Mítica | score 78; reviews full 200; testes em 5 repos; Consistência 70; high/full |
| `evo-rune-master` | Mestre das Runas | Rune Master | Guerreiro/Paladino | Artífice | Lendária | score 75; 3 Artefatos build/toolchain/desktop; sistemas em 2 repos; high/full |
| `evo-arcane-weaver` | Tecelão Arcano | Arcane Weaver | Bardo/Tecelão/Mago | Ilusionista | Lendária | score 75; UI em 5 repos; Escola UI 60; Versatilidade 60; high/full |
| `evo-ancestral-forger` | Forjador Ancestral | Ancestral Forger | qualquer | Artífice | Lendária | score 72; 8 anos; histórico anual full; 5 anos ativos; 4 Artefatos; high/full |
| `evo-high-chronomancer` | Alto Cronomante | High Chronomancer | Ladino/Patrulheiro | Cronomante | Mítica | score 78; CI em 2 repos; Docker/Terraform em 2; Consistência 70; medium/full |
| `evo-celestial-architect` | Arquiteto Celestial | Celestial Architect | qualquer | Arquiteto | Mítica | score 80; frontend/backend strong; 2 repos de cada lado; 6 estruturais; Experiência 75; high/full |

Evolução permanece distinta de título: ela é uma forma rara da identidade; títulos são honrarias equipáveis. Nenhuma regra lê título equipado, título desbloqueado ou conquista.

## E0 Baseline

Real evolutions: **1**.  
Mature profiles: **65/70**.  
Subclass-eligible mature profiles: **19**.  
Evolution rate: **1,4% de todos**, **1,5% dos maduros**, **5,3% dos maduros com subclasse**.

Distribuição: Forjador Ancestral 1; demais 0. Zero em uma evolução rara não foi tratado como falha ou quota a preencher.

## developit Analysis

Evolution: `evo-ancestral-forger`.  
Subclass: Artífice, score 91,91, margem garantida 27,64.  
Coverage: full.  
Confidence: high.  
Gates passed: 9/9.  
Maturity: conta 17,23 anos e 18 anos com atividade observada full.  
Specific evidence: Webpack 8 repos, Rollup 7, esbuild 2; 12 Artefatos observados.  
Human evaluation: **GOOD**.

O unlock representa tooling recorrente sustentado ao longo do tempo; não é consequência de level alto, reputação, conquista ou título.

## Evolution Funnels

O funil é cumulativo na ordem classe → subclasse → maturidade → evidência → confidence → coverage → score → unlock.

| Evolution | 70 | Class | Subclass | Maturity | Evidence | Confidence | Coverage | Score | Unlock |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Arquimago | 70 | 33 | 4 | 3 | 1 | 1 | 1 | 0 | 0 |
| Guardião Celestial | 70 | 70 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| Mestre das Runas | 70 | 11 | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| Tecelão Arcano | 70 | 42 | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| Forjador Ancestral | 70 | 70 | 4 | 4 | 4 | 3 | 2 | 1 | 1 |
| Alto Cronomante | 70 | 4 | 3 | 3 | 2 | 2 | 2 | 0 | 0 |
| Arquiteto Celestial | 70 | 70 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |

### Distribuição de blockers

Contagem aplicável: CLASS considera os 70; SUBCLASS considera classes compatíveis; os demais gates contam apenas perfis com classe e subclasse compatíveis.

| Evolution | CLASS | SUBCLASS | SCORE | MATURITY | CONFIDENCE | COVERAGE | ATTRIBUTE | SKILL | JOURNEY | COMPOSITE | OTHER |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Arquimago | 37 | 29 | 4 | 1 | 1 | 0 | 0 | 2 | 0 | 3 | 0 |
| Guardião Celestial | 0 | 69 | 1 | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 0 |
| Mestre das Runas | 59 | 10 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Tecelão Arcano | 28 | 37 | 5 | 0 | 1 | 0 | 5 | 2 | 1 | 0 | 0 |
| Forjador Ancestral | 0 | 66 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| Alto Cronomante | 66 | 1 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| Arquiteto Celestial | 0 | 69 | 1 | 0 | 1 | 1 | 0 | 1 | 0 | 1 | 0 |

## Evolution Health

| Evolution | Reachable | Realistic Fixture | Near Miss | Distinct | Rarity | Status |
|---|---|---|---|---|---|---|
| Arquimago | sim | sim | `joshwcomeau` | sim | conservadora | HEALTHY |
| Guardião Celestial | sim | sim | `paulirish` | sim | muito rara | HEALTHY |
| Mestre das Runas | sim | sim | `cassidoo` | sim | rara | HEALTHY |
| Tecelão Arcano | sim | sim | `adamwathan` | sim | conservadora | HEALTHY |
| Forjador Ancestral | sim | sim | `isaacs`, `yyx990803` | sim | 1 real | HEALTHY |
| Alto Cronomante | sim após E1 | sim, config-only | `lizrice`, `jesseduffield`, `kelseyhightower` | sim | muito rara | HEALTHY |
| Arquiteto Celestial | sim | sim | `adamchainz` | sim | muito rara | HEALTHY |

## Reachability

**7/7** por fixtures plausíveis. Nenhuma usa level 99, todos os atributos em 100, dezenas de frameworks ou volume artificial de reviews. Cada uma possui fixture negativa por um gate principal, incompatibilidade de subclasse, confidence e coverage.

## Real-world Candidates

| Evolution | Candidato 1 | Candidato 2 | Candidato 3 |
|---|---|---|---|
| Arquimago | joshwcomeau: score 71,62/75 | mhevery: score + Escolas | addyosmani: score + afinidade + Escolas |
| Guardião Celestial | paulirish: score/confidence/coverage/testes | kentcdodds: subclasse ambígua/confidence/coverage | developit: identidade Artífice |
| Mestre das Runas | cassidoo: score 68,21 e medium | developit: classe/linguagem incompatíveis | isaacs: classe/score/linguagens coverage |
| Tecelão Arcano | adamwathan: score 74,07 e Versatilidade 36 | joshwcomeau: score e Versatilidade | addyosmani: score e Versatilidade |
| Forjador Ancestral | developit: unlock | isaacs: languages coverage partial | yyx990803: score 67,78/72 |
| Alto Cronomante | lizrice: só score | jesseduffield: só score | kelseyhightower: CI em 1/2 repos |
| Arquiteto Celestial | adamchainz | bradtraversy | loiane |

## Gate Diagnostics

### Class

Compatibilidades restritas são efetivas. Evoluções `any class` permanecem intencionalmente agnósticas; não foi inventada classe incompatível para elas.

### Subclass

Subclasse `strong` é obrigatória. Perfil sem subclasse nunca evolui. O holdout 0/10 subclasses, portanto, permaneceu 0/10 evoluções de forma coerente.

### Maturity

Maturity não é um score global novo. Ela emerge dos gates documentados: Experiência, Consistência, idade/anos ativos e recorrência. O denominador estatístico continua conta >=3 anos e >=5 repos. Não houve alteração de V1 Level/XP ou atributos.

### Confidence

High permanece para seis evoluções. Apenas Alto Cronomante usa medium porque seu conjunto definidor é config-only. Medium não basta sozinho: score 78, classe, full coverage, Consistência e CI+infra continuam obrigatórios.

### Coverage

Full permanece obrigatório. Uma subclasse segura sob bounds partial não evolui enquanto coverage continua partial. `unavailable`, partial-small e partial-large são bloqueados.

### Attributes

Experiência, Consistência e Versatilidade combinam com a fantasia correspondente. Nenhum atributo isolado concede evolução.

### Skills

Escolas/Artefatos exigidos são específicos da identidade. Sinal principal removido bloqueia a evolução nos sete counterfactuals.

### Composite

Os compostos acrescentam combinação rara e coerente, sem criar dez requisitos arbitrários.

Não existe score separado de evolução. A decisão combina o score da subclasse com gates booleanos/compostos; nenhum score novo foi adicionado.

## Redundant Gates

Nenhuma redundância bloqueadora. Arquiteto Celestial mede força por lado, recorrência e diversidade total separadamente. Guardião Celestial exige testes recorrentes para que reviews/Consistência não fabriquem a identidade.

## Contradictory Gates

E0 encontrou uma: confidence high de Alto Cronomante versus detectores config-only. E1 resolveu a contradição. Restante: nenhuma.

## Trivial Gates

Nenhum gate essencial é universal entre os perfis compatíveis. Diversidade de quatro Artefatos é o gate adicional mais comum entre Artífices, mas idade e continuidade preservam a raridade de Forjador Ancestral.

## Semantic Overlap

Não há par com identidade substituível. As jornadas removidas seriam, respectivamente: domínio web arcano, proteção colaborativa, tooling de sistemas, prática visual, oficina longeva, automação/infra e arquitetura frontend+backend.

## Title Overlap

Há proximidade lexical com títulos de forja/arquitetura, sem equivalência de regra ou papel. Nenhum nome de evolução é duplicado por título. Título equipado não influencia a engine.

## Circular Dependencies

**0**. Evoluções não dependem de conquistas ou títulos. Conquistas/títulos downstream não voltam como requisito.

## Rarity Analysis

Profiles: 70.  
Mature: 65.  
Eligible mature: 19.  
Unlocked: 1.  
Rate entre maduros: 1,5%.  
Rate entre maduros especializados: 5,3%.

O alvo de 5–10% não foi usado como quota. Uma ocorrência é plausível numa amostra desta dimensão e a incidência condicionada à subclasse cai dentro da faixa conceitual.

## E1 Calibration

| Evolution | Gate | Antes | Depois | Motivo |
|---|---|---|---|---|
| Alto Cronomante | confidence | high | medium | sinais definidores são config-only; high era estruturalmente inalcançável |

Nenhuma outra alteração de gate ocorreu. O E1 usou calibration + independent para o diagnóstico; o holdout continuou locked.

## Final Evolution Distribution

Forjador Ancestral: 1 (`developit`). Demais: 0. A E1 não fabricou unlock.

## Holdout

10 perfis, 0 evoluções, 10/10 determinístico. O holdout não foi usado para tuning e não houve retorno à calibração após seu replay.

## Evolution Null Quality

JUSTIFIED_NO_EVOLUTION: **63**.  
NEAR_EVOLUTION: **6** (`joshwcomeau`, `isaacs`, `yyx990803`, `lizrice`, `jesseduffield`, `kelseyhightower`).  
INCORRECTLY_BLOCKED: **0**.  
INCORRECT_EVOLUTION: **0**.

O unlock real foi GOOD; não há false positive confirmado.

## Explainability

Reason codes determinísticos e localizados:

- `EVOLUTION_CLASS_MISMATCH`
- `EVOLUTION_SUBCLASS_REQUIRED`
- `EVOLUTION_MATURITY_LOW`
- `EVOLUTION_CONFIDENCE_LOW`
- `EVOLUTION_COVERAGE_INSUFFICIENT`
- `EVOLUTION_ATTRIBUTE_GATE`
- `EVOLUTION_SKILL_GATE`
- `EVOLUTION_COMPOSITE_GATE`
- `EVOLUTION_GRANTED`

As mensagens explicam o tipo de evidência faltante sem expor fórmula detalhada.

## Multiple Eligibility

Quando duas evoluções passam, vence a de maior `minScore`; empate usa ID canônico. A fixture Guerreiro/Artífice elegível a Mestre das Runas e Forjador Ancestral escolhe Mestre das Runas deterministicamente.

## Counterfactual Tests

7/7: remover o sinal principal bloqueia a evolução. Tooling irrelevante não troca o resultado.

## Determinism

**70/70** replays finais e **10/10** no holdout.

## Runtime Cost

New requests: **0**. A avaliação é puramente computacional.

## V1 Regression

`npm run balance:review`: **12/12 PASS**. Diff protegido zero em `src/game`, `src/features/duel`, `balance-snapshot.json` e `balance-snapshot-v1.json`.

## V2 Invariants

46 invariantes executáveis, incluindo catálogo de sete evoluções, localização, ausência de dependência em títulos/conquistas e política de confidence específica de Alto Cronomante.

## Tests

- `npm run lint`: PASS, zero warnings;
- `npm run typecheck`: PASS;
- `npm test`: PASS, 75 arquivos e 1.039/1.039 testes;
- `npm run balance:review`: PASS, 12/12;
- `npm run balance:review:v2`: PASS, 46/46;
- `npm run game:v2:stage3g`: PASS, 70 snapshots e zero requests.

Warnings preexistentes de React `act(...)` continuam no stderr de testes de UI, sem falhas e fora do escopo V2.

## Build

`npm run build`: **PASS** com Next.js 15.5.27.

## Promotion Gate

| Área | Resultado |
|---|---|
| Identity | PASS |
| Reachability | PASS |
| Rarity | PASS |
| Gate coherence | PASS |
| Distinctness | PASS |
| Compatibility | PASS |
| Confidence | PASS |
| Coverage | PASS |
| Near-miss behavior | PASS |
| False positives | PASS |
| Explainability | PASS |
| Determinism | PASS |
| Runtime cost | PASS |
| V1 isolation | PASS |

## Hard Blockers

Nenhum blocker de Evolution Validation permanece. Performance cold continua fora desta etapa e não foi reclassificada.

## Decision

**EVOLUTION SYSTEM READY WITH CONSERVATIVE GATES**.

## Arquivos Alterados

- runtime/testes/snapshot exclusivamente em `src/game-v2`;
- runner `scripts/gameV2Stage3G.ts` e comando V2 em `package.json`;
- artefatos `artifacts/game-v2-evolution/`;
- documentação V2 desta etapa, benchmark e implementação.

Nenhum frontend, API pública, V1, Duel ou Chronicle foi alterado por esta etapa.

## Próximo Passo

Próximo passo elegível: **ETAPA 3H — Performance / Delivery**. Não iniciado automaticamente.

## Conclusão

**O sistema de Evoluções da Game Engine V2 está validado e pode sair da fase de calibração? SIM.**

Isso não promove a V2 nem autoriza integração pública.
