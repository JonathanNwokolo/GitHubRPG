# Game Engine V2 — Etapa 3H

> Atualização Etapa 3H-B: o Runtime Cache persistente, o delivery assíncrono e a rota experimental foram implementados. Resultado: **DELIVERY INFRA READY WITH DOCUMENTED MULTI-INSTANCE LIMITATION**. O relatório e as provas estão em `GAME_ENGINE_V2_PERSISTENT_DELIVERY.md` e `artifacts/game-v2-delivery-proof/`.

## Status

**LOGIC READY, PERSISTENT CACHE REQUIRED BEFORE INTEGRATION**.

A engine permanece `2.0-experimental-v24-evo`, experimental, isolada e sem integração pública. A Etapa 3H não alterou collector semântico, classes, subclasses, evoluções, conquistas, títulos, thresholds, V1, Duel, Chronicle, frontend ou API pública.

## Objective

Definir como entregar a V2 sem trocar correctness por latência. A P1 adiciona apenas uma fronteira experimental server-only de delivery: cache versionado de evidence/resultado, L1 limitado por TTL/LRU e single-flight por perfil. O collector e a engine continuam produzindo o mesmo resultado.

## Baseline

A P0 usa uma coorte fixa de 15 perfis do benchmark live preservado do Collector V2.1: pequeno, médio/grande, huge, frontend, backend, tooling, mobile, low-level, long-lived, full e partial. Isso preserva o requisito de medir antes de otimizar. A evolução V2.4 é computacional, adiciona zero requests e não muda a orquestração do collector.

### Cold

- P50: 13,222 s
- P75: 30,245 s
- P90: 47,421 s
- P95: 52,658 s
- Max: 52,658 s

### Warm

- P50: 805,31 ms
- P90: 1.087,78 ms

O warm P0 ainda fazia a listagem de repositórios antes de aproveitar tree/manifest cache. Ele não era um cache de resultado final.

## Latency Breakdown

| Stage | Avg | P90 | % médio do total |
|---|---:|---:|---:|
| profile + V1 data | 14.893 ms | 40.868 ms | 74,9% |
| repos/selection V2 | 838 ms | 1.511 ms | 4,2% |
| trees | 1.759 ms | 3.023 ms | 8,8% |
| manifests | 2.389 ms | 4.539 ms | 12,0% |
| parsing | 0,07 ms | 0 ms | <0,1% |
| scoring | 4,06 ms | 8,36 ms | <0,1% |
| serialization P1 | 0,31 ms | 0,50 ms | <0,1% |
| cache lookup P1 | 0,01 ms | 0,02 ms | <0,1% |

Limitação de instrumentação: o artefato original mediu o fetch V1 completo como uma unidade. `profile + V1 data` inclui profile, repos/languages, contribution history e overhead não atribuído; não deve ser interpretado como somente `GET /users`. Já listagem/seleção V2, trees, manifests, parsing e scoring foram instrumentados separadamente.

## Request Economics

| Tipo | Mean | P50 | P90 | Max |
|---|---:|---:|---:|---:|
| REST V2 | 23,93 | 31 | 31 | 31 |
| GraphQL V2 | 2,40 | 2 | 5 | 5 |
| Trees | 22,93 | 30 | 30 | 30 |
| Manifest batches | 2,40 | 2 | 5 | 5 |

Estimativa linear, não previsão de tráfego: 10 perfis cold consomem em média ~239 REST e 24 GraphQL calls; 100, ~2.393 e 240; 1.000, ~23.930 e 2.400. Pelo P90 seriam 310/50, 3.100/500 e 31.000/5.000. GraphQL é limitado por pontos, não por simples contagem de calls; o custo real deve ser lido dos headers. Rajadas ainda podem acionar limites secundários antes do limite primário.

Quando `x-ratelimit-remaining` estiver baixo, não iniciar fan-out cold: servir V1 ou V2 stale, respeitar `retry-after`/`x-ratelimit-reset` e permitir retry posterior. Nunca repetir imediatamente o timeout máximo.

## Cache Audit

### Current L1

- Scope: um processo Node / uma instância warm.
- Evidence e character: TTL + stale window, máximo default de 250 entradas e eviction LRU.
- Trees: TTL 6 h, máximo 2.000 entradas; chave inclui detector, repo e tree SHA (com head por branch para reuso warm).
- Manifests: TTL 24 h, máximo 5.000 entradas; chave inclui detector, repo, path e blob SHA.
- Final identity: namespace, engine, schema, detector, catalog, balance, username normalizado, source fingerprint e `referenceDate`.
- Failed/unavailable enrichment não é cacheado como sucesso.

### Hit behavior

Na P1, o cache final evita repo listing, tree discovery, manifest fetch, parsing e scoring. P50/P90 local: **0,01/0,02 ms**. O primeiro build local a partir de evidence preservada ficou na ordem de poucos milissegundos; ele não representa rede cold.

### Invalidation

- Engine/schema/detector/catalog/balance: invalidação por chave versionada.
- Profile/result: `sourceFingerprint` e `referenceDate`.
- Tree/manifest: branch/head refresh + tree/blob SHA.
- Expiração temporal: TTL por camada.
- Mudança de default branch precisa produzir nova resolução de head; uma L2 futura deve guardar branch no freshness marker.

### Multi-instance limitation

L1 não é compartilhado, não é durável e pode desaparecer quando a instância for reciclada. Na simulação de duas instâncias, o mesmo perfil causou novo enrichment. Portanto, hit local não é um SLA de produção.

## Optimization P1

Mudanças:

- `EvidenceCacheAdapter` assíncrono, substituível por L2 futuro;
- L1 bounded TTL/LRU para evidence e character;
- caches bounded para tree/manifest;
- cache final versionado;
- single-flight por identidade completa;
- estados internos `ready`, `stale`, `enriching`, `partial`, `unavailable`;
- testes de hit, miss, expiry, version/SHA invalidation, retry, unavailable e concurrent dedupe.

Resultados:

- semantic equivalence: 15/15 no caminho delivery;
- três chamadas simultâneas/repetidas do mesmo perfil: um enrichment e dois hits/coalesced;
- perfil individual depois do Hall: hit, zero novo enrichment na mesma instância;
- cold GitHub: inalterado por desenho.

## Optimization P2

**NÃO NECESSÁRIO nesta etapa.** Não há gargalo CPU/parsing/scoring material. A próxima melhoria útil não é micro-otimização: é L2 compartilhado e scheduling de background no momento da integração.

## Delta

| Métrica | Antes | Depois | Delta |
|---|---:|---:|---:|
| P50 cold | 13,222 s | 13,222 s | 0 (collector não mudou) |
| P90 cold | 47,421 s | 47,421 s | 0 |
| P50 warm/result hit | 805,31 ms | 0,01 ms local | -99,999% |
| P90 warm/result hit | 1.087,78 ms | 0,02 ms local | -99,998% |
| REST P90 cold | 31 | 31 | 0 |
| GraphQL P90 cold | 5 | 5 | 0 |
| manifest batch P90 cold | 5 | 5 | 0 |

Os deltas warm são microbenchmarks locais de replay e provam eliminação de trabalho, não latência de rede/CDN/L2 em produção.

## Semantic Equivalence

- Delivery P1: 15/15 deep-equal contra execução direta atual.
- Suite V2 completa após a mudança: 70/70 snapshots reexecutados pela Etapa 3G.
- Nenhuma regra da engine ou collector semântico foi alterada.

## Single-flight / Dedupe

Single-flight cobre o enrichment final do mesmo identity key. Isso impede duas requests concorrentes na mesma instância de dispararem dois collectors. O mesmo flight protege evidence + character; tree/manifest reutilizam chaves SHA. Cross-instance dedupe continua dependente de L2/lock/job durável futuro.

## Failure Recovery

- exceção de collector não é cacheada e pode ser retentada;
- evidence `unavailable` não vira sucesso cacheado;
- stale é explicitamente distinguido de ready;
- V1 não importa nem chama a fronteira V2;
- o caller futuro deve aplicar budget, abort e retry com backoff;
- cache corrompido em L2 futuro deve ser tratado como miss e removido, não entregue como character válido.

## Vercel Reality

Em outubro de 2026, a documentação oficial informa Fluid Compute com duração default de 300 s e `waitUntil` para trabalho após a resposta. Isso comporta o cold observado tecnicamente, mas não o torna UX aceitável nem garante conclusão durável. A própria arquitetura de instâncias não torna memória local compartilhada; estado reutilizável deve sair da memória de processo. O Runtime Cache oficial fornece cache regional entre Functions e aceita TTL, com item máximo de 2 MB.

Fontes:

- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/fluid-compute
- https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package

Não foi criado endpoint, `waitUntil`, dependência Vercel nem L2 nesta etapa.

## Delivery Modes

| Mode | First load | Repeat load | Complexity | Correctness | Cost | Recommended |
|---|---|---|---|---|---|---|
| A — Synchronous | 13–53 s observados | rápido só com hit local | baixa | full | alta | não |
| B — Cache-first | cold lento no miss | sub-segundo | média | full/stale rotulado | média | não sozinho |
| C — V1-first async V2 | V1 não bloqueia | V2 após enrich | média-alta | full | média | parte da solução |
| D — Hybrid | V1 em cold desconhecido; V2 em hit | V2 cacheado | média-alta | full/stale rotulado | controlado | **sim** |

## Recommended Delivery Architecture

**HYBRID**:

1. request sempre pode obter V1 pelo caminho atual;
2. lookup V2 em L2 compartilhado e depois L1;
3. `ready/partial` conhecido pode ser entregue imediatamente;
4. `stale` pode ser servido rotulado enquanto uma revalidação single-flight é agendada;
5. miss cold retorna V1 e inicia enrichment separado sob budget;
6. resultado só fica `ready` depois de coleta completa/partial explícita e engine determinística;
7. falha V2 nunca muda status nem dados V1.

## Profile Strategy

Perfil individual: lookup cache-first; budget síncrono de lookup de 500 ms. Miss cold não deve prender a resposta por 47 s P90. Cold enrichment tem budget alvo de 20 s; excedido o budget, retornar/manter V1 ou stale e marcar retry.

## Hall Strategy

Os cinco heróis editoriais devem ser prewarmed. Servir cache-first, limitar globalmente cold enrichments e permitir conclusão tardia. Não disparar `5 × 30` trees sem um limitador global. Perfil visitado depois do Hall deve reutilizar o mesmo result key.

## Badge / Share Strategy

Badge e share image usam V1 ou V2 já cacheada. Nunca executam cold V2 no caminho de renderização.

## Cache Persistence

**Required? YES, antes da integração pública assíncrona/cache-first.**

O adapter está pronto, mas L1 sozinho não assegura que o resultado produzido em background será encontrado por outra instância. A opção mínima compatível com a Vercel atual é um adapter para Runtime Cache; não é necessário Redis, PostgreSQL, queue ou VPS agora.

## Future VPS Compatibility

`EvidenceCacheAdapter.get/set/delete` permite trocar o L2 regional por PostgreSQL/cache persistente e adicionar job runner durável no futuro sem alterar collector/engine. Chaves e payloads continuam versionados.

## SLA Recommendation

- Cached L2: P90 alvo < 500 ms.
- Warm L1: P90 alvo < 50 ms (microbenchmark local observado 0,02 ms).
- Cold enrichment: alvo P90 < 20 s; baseline 47,421 s **FAIL**.
- Error: falhar/retornar estado em até 2 s após erro conhecido; não encadear novos timeouts máximos.

## Performance Gate

| Área | Resultado |
|---|---|
| Cold latency | FAIL — P90 47,421 s |
| Warm latency | PASS — P90 P0 1,088 s; result hit local 0,02 ms |
| Request count | FAIL para fan-out cold; 31 REST P90 |
| Cache | PARTIAL — L1 correto, L2 ausente |
| Dedupe | PASS single-instance; cross-instance pendente |
| Failure recovery | PASS unitário; runtime integration pendente |
| Semantic equivalence | PASS — 15/15 delivery e 70/70 replay |
| Determinism | PASS |
| V1 isolation | PASS |

## Hard Blockers

1. L2 compartilhado/persistente ainda não implementado.
2. Cold P90 47,421 s não atende o target de 20 s.
3. Background scheduling/timeout budget ainda não está integrado a uma rota experimental.
4. Não há global limiter cross-instance para o Hall.

## Decision

**LOGIC READY, PERSISTENT CACHE REQUIRED BEFORE INTEGRATION**.

## Engine Version

Permanece `2.0-experimental-v24-evo`.

## Files Changed

- `src/game-v2/cache.ts`
- `src/game-v2/delivery.ts`
- `src/game-v2/delivery.test.ts`
- `src/game-v2/collectorV21.ts` (somente tipo de cache compatível com adapter; sem semântica)
- `src/game-v2/index.ts`
- `scripts/gameV2Stage3H.ts`
- `package.json`
- documentação e artefatos de performance da Etapa 3H

## Next Step

Não iniciar a Etapa 4 ainda. O próximo passo técnico é uma subetapa curta de delivery infrastructure: adapter do Vercel Runtime Cache, budget/abort, scheduling com `waitUntil` e prova multi-instance em endpoint experimental não público. Depois disso, reavaliar o gate de integração.

## Conclusion

**A Game Engine V2 está pronta, do ponto de vista de performance e delivery, para iniciar a integração no produto? NÃO.**

A lógica está pronta e o caminho warm está resolvido. A entrega multi-instância ainda precisa de cache compartilhado e o cold não pode bloquear V1.

## Persistent L2 + Async Delivery Proof

A Etapa 3H-B resolve os blockers locais acima sem reescrever o histórico da P0/P1:

- `VercelRuntimeEvidenceCache<V>` implementa o adapter compartilhado com envelope versionado, validação, fresh/stale e rejeição explícita acima de 2 MiB;
- a medição de 70 perfis encontrou 8 evidences acima de 2 MiB e zero characters acima do limite, portanto o L2 final é **character-only**;
- `MultiLayerEvidenceCache` faz L1 → L2 → hidratação de L1, com falha de L2 tratada como otimização indisponível;
- a rota isolada `/api/experimental/v2/characters/[username]` usa `after()` para retornar cold miss como `202/enriching` e completar V2 após a resposta;
- soft/hard budgets são 20/55 s; hard abort é propagado às requests e nunca vira partial automaticamente;
- single-flight e background dedupe produziram um collector para 10 requests cold e uma revalidation para 10 requests stale;
- a simulação com L1-A/L1-B isolados e L2 comum terminou com collector A = 1, collector B = 0 e `source=l2`;
- cache roundtrip e determinismo passaram em 70/70;
- a prova real em Vercel não foi executada porque não houve autorização de preview/deploy.

Decisão atual: **DELIVERY INFRA READY WITH DOCUMENTED MULTI-INSTANCE LIMITATION**. O Runtime Cache não oferece lock atômico documentado para este fluxo; duas instâncias em miss simultâneo ainda podem duplicar um enrichment. O relatório completo está em `GAME_ENGINE_V2_PERSISTENT_DELIVERY.md`.
