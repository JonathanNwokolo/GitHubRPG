# Game Engine V2 — implementação experimental

## Estado

A V2 vive em `src/game-v2` e não substitui a V1.1. O entrypoint é `createRPGCharacterV2({ profile, evidence })`. A V1 continua responsável por Level/XP, cinco atributos, recursos e Skill Level; a V2 consome esses resultados sem alterar as regras existentes.

Versões atuais:

- engine: `2.0-experimental-v24-evo`
- schema: `game-engine-v2-schema-2`
- detector: `game-engine-v2-detectors-3-collector-v21`
- catálogo: `game-engine-v2-catalog-1`
- balance: `game-engine-v2-balance-v24-evolution-confidence`
- cache namespace: `v2-experimental`

## Pipeline

`RawRepositoryEvidence -> normalizeRepositoryEvidence() -> TechnologyEvidenceProfile -> createRPGCharacterV2()`

A sequência dentro da engine é:

`dados GitHub -> evidências -> afinidades -> Escolas -> Artefatos -> scores -> classe -> subclasse -> evolução -> conquistas -> títulos -> explicações`.

O fetch não pertence à engine. `collectGitHubEvidenceV2()` é um adaptador experimental server-only e separado do datasource V1; falhas tornam coverage `partial`/`unavailable`, sem bloquear a V1.

## Catálogos e decisões

- 22 Escolas e 22 Artefatos, conforme a especificação.
- Cinco arquétipos de prática: Arquiteto, Artífice, Ilusionista, Guardião e Cronomante.
- Sete evoluções com gates compostos, compatibilidade e motivo quando bloqueadas.
- 54 conquistas: 31 IDs V1 preservados, 23 novas, 6 secretas.
- 40 títulos: 27 IDs V1 preservados e 13 novos.
- Título equipado não faz parte da engine; apenas o default determinístico é sugerido.
- Grimório: até 8 Afinidades, 5 Escolas e 8 Artefatos.

Conquistas secretas bloqueadas são redigidas pela função `presentAchievementV2()`: nome `???`, placeholder localizado e nenhuma condição/progresso.

## Coleta e request budget

O orçamento inicial implementado é:

- até 30 repositórios próprios, não arquivados e não vazios;
- ordenação `pushedAt desc`, `stars desc`, `name asc`;
- até 90 requests REST no enriquecimento;
- até 256 KiB por arquivo;
- contadores separados de REST, GraphQL, manifest fetch, repos examinados e cache hits;
- cache separado sob `v2-experimental`.

O coletor consulta a árvore dos repositórios selecionados e lê apenas manifests/configs reconhecidos. Token, quando usado pelo runner server-side, fica somente em headers e não é serializado ou logado.

## Comandos

```bash
npm run balance:review:v2
npm run game:v2:benchmark -- username [username...]
npm run game:v2:benchmark -- username --rest
```

O benchmark imprime V1/V2, evolução, Escolas, Artefatos, confidence, latência, requests e coverage. Ele não promove a V2 nem grava estado de produção.

## Calibração da Etapa 3

A matriz real de 40 perfis foi executada em 30 perfis de calibração e 10 de holdout. O resultado técnico foi **DO NOT PROMOTE**; a engine permanece `2.0-experimental` e não foi integrada ao frontend.

Valores calibrados nesta rodada:

- subclasse strong: `60 -> 55`;
- subclasse possible: `45 -> 42`;
- margem: `8 -> 5`;
- teto de tooling no arquétipo: `30 -> 40`;
- fórmulas de arquétipo reponderadas para tornar Escola/Artefato dominante e maturidade/consistência apenas apoio;
- craft e automation recebem multiplicador de diversidade com alvo de duas tecnologias, evitando Vite ou GitHub Actions isolados como identidade;
- `language-specialist-70`: gate final de `>=85%` e `>=10 repos` (ID preservado);
- `five-paths`: 10 anos, 50 repos, 1.000 estrelas, 500 PRs, 500 reviews e 5 afinidades.

Correções de bug:

- paths vendorizados (`vendor`, `third_party`, `external`, `upstream` e variantes) não geram evidência;
- configurações diretas recorrentes podem atingir confidence medium;
- médias de família usam de fato os três maiores itens, sem somar itens extras e dividir por três.

Permanecem não promovidos e sujeitos a nova rodada: cap/orçamento de coleta, upper-bound real para coverage parcial, recência, saturações de afinidade, maturidade, cortes do Grimório, gates de evolução e expansões de linguagens.

## Resultado e blockers após a Etapa 3

- Coverage de manifests ficou partial em 38/40 perfis; a decisão atual veta toda subclasse partial com omissão, sem calcular o upper bound determinístico prescrito pela spec.
- Nenhuma subclasse e nenhuma evolução foram concedidas nos 40 perfis.
- GOOD + ACCEPTABLE foi 76,7% na calibração e 70,0% no holdout; BAD foi 0%.
- Latência cold: P50 27,5 s, P75 35,9 s, P90 45,0 s e máximo 67,3 s.
- Requests REST V2: média 53,5, P90 89 e máximo 90 por perfil.
- O cache em memória eliminou requests na repetição, mas não constitui estratégia persistente de entrega.
- O coletor inicial usa a listagem REST experimental; o datasource V1 continua com GraphQL paginado em 50 quando autenticado. Uma futura otimização V2 pode coletar manifestos via GraphQL, sem alterar o contrato da engine.
- A análise de monorepos deduplica recorrência por repositório; o budget de dois arquivos por repo ainda pode omitir manifests/configs relevantes.
- Não há endpoint, UI, Duelo ou Chronicle V2 nesta etapa.
- Próxima etapa recomendada: redesenhar somente a coleta/coverage (batch, cache persistente e upper-bound por repo) e repetir o mesmo holdout antes de qualquer integração.

## Etapa 3B — Evidence Collector V2.1

O collector foi separado em discovery por Git Tree e fetch direcionado de manifests por batches GraphQL. A seleção agora distribui Tier A entre projetos de monorepo, admite até 10 arquivos por repositório e 180 por perfil, preserva skips reais e distingue gaps `none`, `small` e `large`. Cache de tree usa repo/tree SHA/detector; cache de manifest usa repo/path/blob SHA/detector.

O rebenchmark manteve exatamente `game-engine-v2-balance-stage3-r3`. Coverage full passou de 2/40 para 21/40, REST P90 caiu de 89 para 31 e P50 cold caiu de 27,5 s para 13,5 s. O P90 cold ainda ficou em 33,1 s. Houve uma subclasse forte e nenhuma evolução; portanto, nenhum threshold, margem, peso ou gate foi alterado na Etapa 3B.

Resultado: **COLLECTOR IMPROVED, BALANCE STILL BLOCKED**. A V2 permanece experimental e sem integração pública. Detalhes em `GAME_ENGINE_V2_COLLECTOR_V21.md` e na seção de rebenchmark de `GAME_ENGINE_V2_BENCHMARK.md`.

## Etapa 3C — Evidence Bounds V2.2

`bounds.ts` calcula lower/upper bounds pelas fórmulas reais de tecnologia e arquétipo. Evidência omitida respeita repos incertos, saturação, recorrência deduplicada, força/recência e cap de tooling. Como médias podem cair com evidência antiga/fraca, o lower bound não presume sempre `observedScore`.

Uma subclasse partial só é concedida quando `winnerLowerBound - max(rivalUpperBound) >= 5`, além dos gates existentes de score, confidence, maturity e dois repos de evidência. Os tunables da Etapa 3B não mudaram. Resultado offline: 2/40 subclasses (kentcdodds/Guardião e sharkdp/Cronomante), 0 evoluções, 37/37 invariantes e 40/40 replays. Detalhes em `GAME_ENGINE_V2_BOUNDS_V22.md`.

## Etapa 3D — Archetype Signal Calibration V2.3

`archetypeModel.ts` centraliza a mesma fórmula usada pelo score observado e pelos bounds. Cada tecnologia possui especificidade por arquétipo; sinais genéricos têm cap 42; padrões compostos usam papéis sem regra por username ou repositório. Presence isolada continua pequena, enquanto recorrência já incorporada na afinidade, diversidade específica e combinações semânticas formam o componente dominante.

Os cinco componentes primários agora pesam 78%/80%/80%/75%/80% para Arquiteto/Artífice/Ilusionista/Guardião/Cronomante. Threshold 55, possible 42, margem 5, confidence, maturity, collector e gates de evolução não mudaram. Fixtures pareadas garantem alcance realista, queda contrafactual e bloqueio de React/Next/Vite/Jest/Actions isolados.

Resultado final: 9/30 subclasses na calibração, 0/10 no holdout, 40/40 determinístico, 41/41 invariantes e zero request novo. A discriminação melhorou, mas a utilidade não generalizou; decisão **ARCHETYPES IMPROVED — MORE CALIBRATION NEEDED**. Detalhes em `GAME_ENGINE_V2_ARCHETYPE_CALIBRATION_V23.md`.

## Etapa 3G — Evolution Validation V2.4

Os 70 snapshots existentes foram reexecutados offline. O E0 confirmou uma evolução real (`developit -> evo-ancestral-forger`), 65 perfis maduros, 19 maduros com subclasse e replay 70/70 determinístico. A incidência foi 1/65 entre maduros e 1/19 entre maduros com subclasse.

O E0 encontrou uma contradição estrutural isolada: Alto Cronomante exigia confidence high, mas seus sinais definidores (`github-actions`, Docker e Terraform) são detectores config-only, incapazes de produzir os dois tipos primários de fonte exigidos por high. A única E1 alterou somente esse gate para medium; score 78, classe, full coverage, Consistência 70 e o composto CI + container/infra permaneceram inalterados. Nenhum novo unlock foi criado na matriz real.

As sete evoluções possuem fixtures positivas plausíveis, negative-by-one-gate, incompatibilidade, coverage/confidence, counterfactual e múltipla elegibilidade. Reason codes de evolução agora são específicos e localizados. Resultado: **EVOLUTION SYSTEM READY WITH CONSERVATIVE GATES**. A V2 permanece experimental; performance/delivery não foi iniciada. Detalhes em `GAME_ENGINE_V2_EVOLUTION_VALIDATION.md`.
# Etapa 3H — Performance / Delivery

Status: **LOGIC READY, PERSISTENT CACHE REQUIRED BEFORE INTEGRATION**.

A fronteira experimental `V2DeliveryService` adiciona cache de evidence/character, TTL/stale window, bounds de memória e single-flight sem alterar a engine ou o collector semântico. O contrato `EvidenceCacheAdapter` permite um L2 futuro. A implementação atual é somente L1 por processo e não está ligada à UI ou API pública. Detalhes e gates: `GAME_ENGINE_V2_PERFORMANCE_DELIVERY.md`.

## Etapa 4 — Integração local no produto

A integração usa `loadCharacterProduct()` e `CharacterPresentationModel`: V1 permanece base, V2 é cache-first e opcional. A flag server-only `GAME_ENGINE_V2_UI_ENABLED` é OFF por default e aceita `GAME_ENGINE_V2_UI_ALLOWLIST`. Cold miss retorna V1 e agenda enrichment com `after()`; não há polling na primeira integração.

`projectRPGCharacterV2Public()` é a fronteira de minimização. O client não recebe raw evidence, bounds, diagnostics, request accounting ou requisitos de conquistas secretas bloqueadas. Hero, Grimório, 54 conquistas, 40 títulos e explicabilidade usam essa projeção. Hall faz lookup-only; Duel, Chronicle, Badge, Share e metadata continuam V1.

Detalhes, rollout, rollback e checklist de preview: `GAME_ENGINE_V2_PRODUCT_INTEGRATION.md`.

