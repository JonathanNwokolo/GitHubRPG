# Game Engine V2 — Etapa 3H-B

> **Historical delivery record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

## Status

**DELIVERY INFRA READY WITH DOCUMENTED MULTI-INSTANCE LIMITATION**.

A infraestrutura experimental está implementada e validada localmente. A V2 continua experimental, a V1.1 continua congelada e nenhuma UI ou API pública foi conectada à V2.

## Objective

Retirar o enrichment cold da V2 do caminho crítico, usando L1 local, L2 compartilhado, stale-while-revalidate, execução pós-resposta e isolamento completo de falhas da V1.

## Runtime Cache Adapter

### Provider

Vercel Runtime Cache por `getCache()` de `@vercel/functions` 3.9.11. A documentação oficial descreve o cache como isolado por projeto/ambiente, disponível entre Functions na região e persistente entre deployments. A validação real em preview não foi executada.

### Adapter

`VercelRuntimeEvidenceCache<V>` implementa `EvidenceCacheAdapter<V>`. O adapter guarda envelope com versão, tipo, timestamps fresh/stale e payload validado. Entrada corrompida é removida e tratada como miss. A engine e o collector não importam APIs Vercel.

### Keys

`namespace / engineVersion / schemaVersion / detectorVersion / catalogVersion / balanceVersion / username normalizado / sourceFingerprint / referenceHour`.

O fingerprint é SHA-256 dos dados normalizados do perfil sem o timestamp volátil. `referenceDate` usa bucket UTC de uma hora, coerente com o TTL do character; assim, timestamps diferentes por milissegundos não anulam reutilização entre instâncias, enquanto mudança real nos dados altera o fingerprint.

### TTL

- Character: 1 h fresh.
- Evidence L1: 6 h fresh.
- Tree L1: 6 h por SHA/head.
- Manifest L1: 24 h por blob SHA.
- 404: mantém o negative cache V1 existente de 60 s; 502 e timeout não viram 404.

### Stale window

- Character: mais 23 h.
- Evidence L1: mais 18 h.
- O TTL enviado ao Runtime Cache cobre fresh + stale; o envelope distingue os estados.

### Versioning

Mudança de engine, schema, detector, catálogo ou balance produz miss seguro. V1 usa namespace separado.

### Payload limits

Limite atual confirmado: 2 MiB por item. O adapter mede UTF-8 antes de escrever e rejeita excesso com `CachePayloadTooLargeError`; não há truncamento.

Fontes oficiais:

- https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/functions/configuring-functions/duration

## Cache Strategy

L1:

- evidence normalizada;
- character final;
- trees e manifests granulares por SHA;
- tudo limitado por TTL/LRU e local à instância.

L2:

- **character final somente**.

A preferência inicial `evidence + character` foi rejeitada pela medição: 8/70 evidences excederam 2 MiB. Persistir trees/manifests multiplicaria itens; fragmentar evidence aumentaria complexidade e risco. Character-only entrega o benefício de produto com um item, uma escrita e uma leitura repetida por perfil.

## Payload Size

Valores incluem o envelope do Runtime Cache.

| Object | Median | P90 | Max |
|---|---:|---:|---:|
| Evidence | 420.649 B | 2.158.478 B | 3.715.281 B |
| Character | 100.686 B | 160.682 B | 183.412 B |
| Metadata dos dois envelopes | 294 B | 294 B | 294 B |

Todos os 70 characters ficaram abaixo de 2 MiB. Evidence teve 8/70 excessos.

## L1 → L2 Flow

`L1 hit → return`; `L1 miss → L2`; `L2 hit → hydrate L1 → return`; `L2 miss/failure → background enrichment`. L1 não participa da correctness e pode começar vazio.

## Stale-While-Revalidate

Character stale é devolvido imediatamente e uma única revalidation local é registrada. Falha mantém o stale utilizável até `staleUntil`. Após a janela, a entrada é removida e o fluxo volta a `enriching` com V1 pública preservada.

## Async Enrichment

### Mechanism

`after()` de `next/server`, recomendado pela Vercel para Next.js 15.1+. A rota usa Next.js 15.5 e `maxDuration = 60`; o hard budget é 55 s.

### Durability

`after()` mantém a Function ativa depois da resposta, mas continua limitado à duração da invocação. É lifecycle-supported background execution, não uma fila durável. A conclusão real em Vercel não foi validada sem preview autorizado.

### Failure behavior

O task captura falhas; a resposta já encerrada não cai. Resultado unavailable, erro, hard abort, payload inválido ou serialização excessiva não é gravado como sucesso.

## Budget / Abort

- Soft: 20 s, métrica `softBudgetExceeded`; não muda semântica.
- Hard: 55 s, `AbortController` propagado aos requests do collector.
- Hard abort descarta o enrichment; não converte cancelamento global em `partial` automaticamente.
- Concorrência local default: 2 perfis; demais aguardam slot.

## Experimental Route

Path: `/api/experimental/v2/characters/[username]`

States: `ready`, `stale`, `enriching`, `partial`, `unavailable`.

Public UI linked? **NO**.

A rota valida username, usa o datasource V1 para existência/perfil, retorna `202 enriching` no cold miss, agenda V2 após a resposta e expõe apenas estado, fonte, character quando disponível, coverage e timing de lookup. Token, payload de evidence e detalhes internos não são retornados.

## Multi-Instance Simulation

### Instance A

L1-A vazio, coleta 1 vez e grava character no L2 compartilhado.

### Instance B

L1-B vazio, consulta o mesmo L2 e recebe `source=l2`.

### Shared L2

Simulado com adapters isolados e store compartilhado.

### Result

**PASS**: collector A = 1; collector B = 0.

## Real Vercel Validation

**NÃO EXECUTADA — requer preview/deploy autorizado.**

Checklist de preview:

1. Request cold deve retornar `202/enriching` antes do fim do collector.
2. Após conclusão, nova request deve retornar `ready|partial` e `X-GitHubRPG-V2-Cache: l1|l2`.
3. Nova instância/região, quando controlável, deve confirmar o escopo real do L2.
4. Entrada stale deve ser servida antes da revalidation.
5. Falha GitHub/L2 deve deixar `/api/characters/[username]` V1 íntegra.

## Delivery Latency

Microbenchmarks abaixo são locais; não são latência Vercel. O full enrichment usa os tempos live preservados nos inputs congelados.

| Scenario | P50 | P90 | Max |
|---|---:|---:|---:|
| L1 hit | 0,01 ms | 0,01 ms | 0,04 ms |
| L2 adapter hit local | 0,01 ms | 0,01 ms | 0,04 ms |
| cold initial response, sem fetch V1 | 0,03 ms | 0,05 ms | 0,48 ms |
| background enrichment live preservado | 17.344 ms | 37.153 ms | 67.092 ms |

SLA candidato: L1 P90 10 ms; L2 P90 250 ms; lookup cold inicial P90 500 ms, além do fetch V1; background P90 55 s.

## Collector Requests

L1 hit: **0**.

L2 hit: **0**.

Cold: mantém os contadores do collector V2.1; não foram feitas novas chamadas live nesta etapa.

## Single-Flight

10 requests cold simultâneas na mesma instância produziram 1 collector. Dez requests stale registraram 1 revalidation. O mesmo flight cobre evidence + character.

## Cross-Instance Limitation

Runtime Cache não oferece lock/compare-and-set documentado para este uso. Duas instâncias em miss simultâneo podem executar dois enrichments. Nenhum lock distribuído frágil foi criado. O resultado convergente e determinístico torna essa duplicação rara aceitável inicialmente.

## Failure Matrix

| Failure | User-facing effect | Cache effect |
|---|---|---|
| GitHub/GraphQL 502 | V1 pública não muda; experimental permanece sem V2 pronta | sem character de sucesso |
| Tree/manifest timeout | task isolado; partial somente se o collector produzir partial válido | partial válido pode ser cacheado |
| Hard timeout | resposta inicial já entregue | nenhuma escrita |
| L2 read | fallback L1/enrichment | safe miss |
| L2 write | resposta/enrichment local preservado | outra instância pode perder o hit |
| Payload > 2 MiB | sem truncamento | escrita rejeitada |
| Payload corrompido | safe miss | entrada removida |

## Semantic Cache Roundtrip

**70/70 PASS**.

## Determinism

**70/70 PASS**.

## Security

Token leak: **não**.

Cache sensitive data: somente character derivado de dados públicos; sem token, headers ou raw payload GitHub.

Logs: sem payload completo e sem credenciais. A rota usa mensagens de erro sanitizadas existentes.

Dependency audit: `npm audit --omit=dev` reportou 2 advisories no grafo de produção, ambos pela cópia de PostCSS embutida em Next.js 15.5.27; `@vercel/functions` não apareceu como vulnerável. O caminho descrito exige processamento de CSS/source maps controlados pelo atacante e não é exposto pela rota experimental. Nenhum `audit fix --force` ou upgrade major foi aplicado fora do escopo.

## V1 Regression

12/12: **PASS**.

Diff zero em `src/game`, `src/features/duel`, `balance-snapshot.json` e snapshots V1: **SIM**.

## V2 Invariants

46/46 invariantes executáveis: **PASS**.

## Tests

- 1.068/1.068 testes: PASS.
- Cache/route focados: 27/27.
- Lint: PASS.
- TypeScript: PASS.

## Build

Next.js production build: **PASS**. A rota experimental aparece como dinâmica e não altera rotas públicas.

## Delivery Promotion Gate

| Área | Resultado |
|---|---|
| L1 | PASS |
| L2 | PASS local/adapter; preview pendente |
| Versioning | PASS |
| SWR | PASS |
| Async enrichment | PASS local/API oficial; preview pendente |
| Budget/abort | PASS |
| Local single-flight | PASS |
| Multi-instance L2 reuse | PASS simulado |
| Failure isolation | PASS |
| Semantic equivalence | PASS 70/70 |
| Determinism | PASS 70/70 |
| Security | PASS |
| V1 isolation | PASS |
| Experimental route | PASS |

## Hard Blockers

Nenhum blocker de código/local. Restam duas limitações honestas: ausência de lock cross-instance e ausência de prova real em preview. Nenhuma delas autoriza integração ou deploy automático.

## Decision

**DELIVERY INFRA READY WITH DOCUMENTED MULTI-INSTANCE LIMITATION**.

## Etapa 3

ETAPA 3 pode ser considerada encerrada? **SIM**, para implementação local e avanço controlado à Etapa 4. A aceitação de produção continua condicionada à checklist de preview.

## Engine Version

`2.0-experimental-v24-evo` — não alterada.

## Files Changed

- `src/game-v2/cache.ts`
- `src/game-v2/runtimeCache.ts`
- `src/game-v2/runtimeDelivery.ts`
- `src/game-v2/delivery.ts`
- `src/game-v2/collectorV21.ts`
- testes V2 e da rota experimental
- `src/app/api/experimental/v2/characters/[username]/route.ts`
- `src/data/serverBoundary.test.ts`
- `scripts/gameV2Stage3HB.ts`
- `artifacts/game-v2-delivery-proof/*`
- `package.json`, `package-lock.json`
- documentação desta etapa

## Next Step

ETAPA 4 — Integração da Game Engine V2 no produto, **não iniciada**.

## Conclusion

A infraestrutura de performance/delivery da Game Engine V2 está pronta para iniciar a integração no produto? **SIM, COM LIMITAÇÃO DOCUMENTADA**.
