# USAGE_COUNTER_AUDIT — contador público de uso na Home

Auditoria de 2026-10-08. **Nenhum código foi alterado**, nenhuma dependência instalada, nenhum endpoint, banco, Redis ou deploy criado.
Tudo abaixo vem de leitura do repositório; o que vem de fonte externa ou de inferência está marcado.

---

## 1. Current Architecture

Fluxo relevante hoje (Next 15, App Router, Vercel, `force-dynamic` em quase tudo):

| Superfície | Arquivo | O que acontece |
|---|---|---|
| Home `/` | `src/app/page.tsx`, `LandingHero.tsx` | Server component dinâmico. A busca (`handleSummon`) chama **`fetchCharacter` → `GET /api/characters/[username]`** só como *checagem de existência*, e depois `router.push('/<user>')`. |
| Ficha `/[username]` | `src/app/[username]/page.tsx`, `CharacterSheet.tsx` | `ensureProfileExists` **antes** do streaming (404 real) → `<Suspense>` → `CharacterSheet` chama `loadCharacterProduct` (V1 sempre; V2 é opcional). Já usa `after()` e já decide `allowEnrichment = shouldScheduleProfileEnrichment(headers)` (filtra bots/crawlers/preview por User-Agent). |
| V2 polling | `src/app/api/experimental/v2/characters/[username]/route.ts`, `useLiveCharacterPresentation` | Até 20 polls por ficha, `Cache-Control: no-store`. |
| `/api/characters/[username]` | route.ts | Usado por **Home (existência), Duelo (`DuelArena`) e personas demo**. Resposta cacheável em CDN (`s-maxage=900`). |
| `/api/heroes` | route.ts | Hall: chama `loadCharacterProduct` para ~N usernames fixos. Não é intenção do usuário. |
| `/api/badge`, `/api/card/*` | routes | Embeds em READMEs/OG: volume alto e automático. |

Não existe `middleware.ts`. Não existe `@vercel/analytics` nem `@vercel/speed-insights` (`package.json`). Não existe storage persistente: `PRODUCTION_READINESS.md` registra "cache em memória por instância, sem Redis/banco, conforme decisão existente" e `RATE_BUDGET_AND_SHARED_DISCOVERY.md` registra "No PostgreSQL, Redis, queue, worker, VPS, captcha, or new dependency was added".

Restrição de arquitetura relevante: **`process.env` só pode ser lido em `src/data/datasource/config.ts`** (e `siteUrl.ts` para variáveis públicas) — `src/data/serverBoundary.test.ts` falha se outro arquivo ler. Qualquer storage novo precisa passar por lá.

## 2. What Should Be Counted

**Evento contado: "ficha servida"** = uma renderização server-side de `/[username]` que:

1. passou em `ensureProfileExists` (perfil existe; 404 e username inválido ficam de fora por construção);
2. concluiu `loadCharacterProduct` com sucesso (V1 pronto) — independe de V2 estar `ready`, `partial` ou em polling;
3. veio de visitante interativo (mesmo critério `shouldScheduleProfileEnrichment`: sem bot/crawler/preview/curl);
4. está em produção real (`VERCEL_ENV=production`, fonte `github`) — nada de mock, preview ou dev.

**O que NÃO conta, e por quê:**

| Candidato | Conta? | Motivo |
|---|---|---|
| `/api/characters/[username]` | Não | Home usa como pré-checagem e depois navega → contaria 2×; Duelo e personas também chamam; resposta vem de CDN (nem sempre chega à função). |
| Polling V2 | Não | Até 20 requests por ficha. |
| `/api/heroes` (Hall) | Não | Carga automática, não é ficha pedida. |
| `/api/badge`, `/api/card/*` | Não | Embeds em READMEs/OG, volume imprevisível. |
| Duelo | Não (agora) | Duelo carrega via `fetchCharacter` no cliente; não há evento de servidor que o represente sem endpoint novo. Métrica "D" fica fora. |
| `generateMetadata` | Não | Roda na mesma request da página; contar lá duplicaria. |
| 404 / username inválido | Não | `notFound()` ocorre antes do ponto de contagem. |
| Erro 429/5xx na V1 | Não | Vai para `error.tsx`; contagem só após sucesso. |

**Ponto único recomendado de incremento:** `CharacterSheet.tsx`, logo após `loadCharacterProduct` resolver, via `after()` (já importado ali). Ver §8.

## 3. Deduplication Strategy

Opções avaliadas:

| Opção | Evita refresh | Evita bot simples | Privacidade | Complexidade | Veredito |
|---|---|---|---|---|---|
| Sem dedupe | Não | Não | Ótima | Mínima | Inflável por F5 → rejeitada |
| Por sessão/cookie | Parcial | Não | Cria identificador no cliente | Média | Rejeitada (cookie só pelo contador) |
| Por IP hash | Sim | Parcial | **Ruim**: IP (mesmo em hash) é PII indireta | Média | Rejeitada |
| Por username (eterno) | Sim | Sim | Ótima | Baixa | Vira "perfis únicos"; cresce devagar, sem vitalidade |
| **Por username + dia (UTC)** | **Sim** | **Sim (limita a nº de perfis distintos/dia)** | **Ótima: nenhum dado do visitante** | **Baixa** | **Recomendada** |

**Recomendação: `username (lowercase) + dia UTC`.** Chave = `SHA-256(username).slice(0,16)` + dia, `SET NX` com TTL de 48 h. Consequência assumida e documentada: o número mede **"fichas-dia"**, não visitas nem pessoas; um perfil famoso consultado 500× no dia conta 1. Isso é o que torna o número difícil de inflar e honesto com o rótulo "fichas invocadas". Nenhum IP, UA ou identificador de visitante é lido ou gravado — o dedupe não precisa de nada do visitante, então **não há hash de IP, salt, nem retenção de PII a justificar**.

## 4. Existing Infrastructure

Inspecionado, sem assumir:

| Item | Existe? | Reutilizável para o contador? |
|---|---|---|
| Vercel Web Analytics / Speed Insights | **Não instalado** | Ver Opção A. |
| `@vercel/functions` (`getCache`, `waitUntil`) | **Sim** (v3.9.11) | `getCache` = Runtime Cache; API só tem `get/set/delete/expireTag` — **sem incremento atômico**. |
| Runtime Cache em uso | Sim: circuito de GitHub (`protection.ts`) e L2 do V2 (`runtimeCache.ts`) | Cache, não banco (§5-B′). |
| Vercel KV / Upstash / Postgres / Blob / Edge Config | **Não configurado** | — |
| Telemetria | `emitV2Telemetry` → `console.info(JSON)` com `subject_id` (hash 12 hex do username) | Só logs de runtime; nada agrega, nada é legível pelo app. |
| API de eventos / analytics próprio | Não | — |
| Rate limit / proteção | `GitHubProjectProtection` (client key = sha256(IP) em memória do processo, janela 60 s, 30 usernames frios/min; circuito compartilhado via Runtime Cache) e `shouldScheduleProfileEnrichment` (filtro de UA) | **UA filter reutilizável direto.** O limite por cliente só conta *trabalho frio* e é por processo — não protege um contador. |
| WAF / Bot Protection | Citado como camada externa em `RATE_BUDGET_AND_SHARED_DISCOVERY.md` | Opcional, fora do código. |

**EXISTING_INFRA_CAN_BE_REUSED: parcialmente** — o filtro de UA e o padrão "falha silenciosa" são reutilizáveis; **não há storage persistente reutilizável.**

## 5. Options Compared

### A — Vercel Analytics / eventos
- Pacote **não instalado** (nova dependência `@vercel/analytics`).
- Eventos customizados: segundo a [tabela de preços da Vercel](https://vercel.com/docs/analytics/limits-and-pricing) (via busca; confirmar na página), **não existem no plano Hobby**, só no Pro. O plano deste projeto **não está no repositório** — só IDs em `.vercel/project.json`. *Preciso que você confirme o plano no dashboard.*
- Leitura: há uma [Web Analytics API pública](https://vercel.com/changelog/web-analytics-api) (changelog de 2026-05-18), mas exige token de API da Vercel no servidor, e não achei a elegibilidade por plano. É dado agregado, não permite dedupe por `username+dia`.
- `track()` no cliente é bloqueado por ad-blockers (subcontagem) e é trivialmente falsificável; no servidor precisaria do mesmo ponto de incremento de qualquer outra opção.
- Veredito: **inviável como fonte primária** (plano + dependência + segredo de leitura + sem dedupe).

### B — Storage persistente mínimo (Upstash Redis via Vercel Marketplace)
- Vercel KV foi descontinuado em favor de Redis via Marketplace (Upstash); o `INCR`/`SET NX` atômico é exatamente o que falta ao Runtime Cache.
- Plano gratuito Upstash, segundo a [documentação de billing](https://upstash.com/docs/redis/overall/billing) (via busca): **500 K comandos/mês**, 256 MB, 1 banco. Pago: US$ 0,20 / 100 K comandos. (Tabelas antigas de "10 K/dia" circulam em blogs — desatualizadas.)
- Cliente: dá para falar com a API REST do Upstash com `fetch` (sem `@upstash/redis`) — ~40 linhas, sem dependência nova.
- Veredito: **menor solução correta.**

### B′ — Variante: Runtime Cache que já existe (zero infra nova)
- Sem incremento atômico: `get` + `set` perde contagens sob concorrência (o próprio repo documenta "Runtime Cache is not a compare-and-set store").
- Cache regional e sujeito a expiração/LRU (informação de espelhos da skill de Runtime Cache, **não confirmada em doc oficial**) → o total pode **diminuir** ou divergir por região.
- Um contador visível que regride destrói a prova social. Veredito: **rejeitada para total**; aceitável só como cache de *leitura* (§9).

### C — Logs / telemetria
- `console.info` vai para os logs de runtime da Vercel; o app não consegue lê-los, retenção é curta e varia por plano, e Log Drains exigem plano pago (não verifiquei o plano exato). Os `subject_id` são hashes de 12 hex *sem* dia/dedupe de produto. **Inviável** para um número público na Home.

### D — Arquivo/JSON/cache em memória
- Filesystem serverless é efêmero e por instância; `TtlCache` do projeto é por processo. Cada instância teria um número diferente e zeraria em cada cold start/deploy. **Inviável.**

### Outras (descartadas em uma linha)
Edge Config (escrita só pela API de gestão, feito para leitura rara), Blob (sem atômico), Postgres/VPS/fila (vetados pelo escopo).

### Matriz

| Critério | A Analytics | **B Upstash** | B′ Runtime Cache | C Logs | D Arquivo |
|---|---|---|---|---|---|
| Simplicidade | média | **alta** | alta | baixa | alta |
| Custo | Pro? | **US$ 0 (free)** | 0 | pago | 0 |
| Persistência | sim (externa) | **sim** | **não** | curta | **não** |
| Precisão | baixa (ad-block) | **alta** | baixa (races) | n/a | n/a |
| Consistência entre instâncias | sim | **sim** | por região | n/a | **não** |
| Facilidade de deploy | média (dep + plano) | **média (1 integração + 2 env)** | alta | n/a | n/a |
| Privacidade | média (3rd party) | **alta (sem PII)** | alta | média | alta |
| Risco de abuso | alto (cliente) | **baixo-médio** | médio | n/a | n/a |
| Manutenção | baixa | **baixa** | baixa | alta | n/a |
| Dependência nova | sim | **não (fetch)** | não | não | não |
| Compatível Vercel/serverless | sim | **sim** | sim | não | **não** |

## 6. Privacy

- **Não armazenar:** IP, UA, cookies, fingerprint, username em texto claro, nada do visitante.
- **Armazenado:** (a) contador total; (b) contadores diários; (c) chaves de dedupe `SHA-256(username lowercase)[0:16] + dia`, TTL 48 h. O username é dado público do GitHub e ainda assim só persiste como hash por 2 dias. Isso não registra *quem* consultou *quem*.
- Sem hash de IP → **sem salt, sem versionamento de salt, sem política de retenção de PII**. Essa é a razão central de preferir `username+dia`.
- Segredos (`UPSTASH_REDIS_REST_URL/TOKEN`): server-only, lidos apenas em `config.ts`, sem prefixo `NEXT_PUBLIC_`, nunca logados (`serverBoundary.test.ts` já cobre o padrão). Usar um token com escopo limitado se o provedor permitir.
- Atualizar `README`/`.env.example` descrevendo exatamente o que é contado.
- **PRIVACY_RISK: LOW.**

## 7. Abuse Resistance

Contra o que a recomendação protege:

| Vetor | Efeito |
|---|---|
| F5 / refresh / voltar-avançar | Neutralizado (dedupe `username+dia`). |
| Polling V2, retries, Duelo, Hall, badge, cards | Não são o ponto de contagem. |
| Crawlers/previews declarados (Slack, Discord, LinkedIn, WhatsApp, curl, wget, bots) | Filtrados por `shouldScheduleProfileEnrichment` (reuso). |
| 404 e usernames inválidos | Não contam (checagem prévia + validação regex). |
| Preview deploys / dev / mock | Não contam (só produção + fonte `github`). |

Risco residual: um script que se declare navegador e percorra usernames **reais e distintos** pode somar até *N perfis/dia*. Teto de inflação = nº de perfis existentes que ele consiga carregar — cada um custa uma ida ao GitHub (cold) e passa pelo limite de 30 usernames frios/min/IP já existente; perfis em cache não são limitados. Para um contador de vitrine isso é aceitável. Mitigações **opcionais e adiáveis**, nesta ordem de custo: (1) kill switch por env (`USAGE_COUNTER_ENABLED=false`); (2) regra de WAF/Rate Limit na Vercel em log mode; (3) *só se* houver evidência de abuso, beacon do cliente após hidratar (barra scripts sem JS, mas cria endpoint público de escrita — não recomendado de início).

Falha de Redis: nunca afeta a ficha (tudo dentro de `after()` + `try/catch` + timeout curto). **ABUSE_RISK: MEDIUM em probabilidade, impacto baixo** (vaidade, sem efeito financeiro ou de segurança); contra refresh, polling e bots declarados é LOW.

## 8. Best Increment Point

**`src/app/[username]/CharacterSheet.tsx`, após `await loadCharacterProduct(...)`, dentro de `after()` — somente se `allowEnrichment` (visitante interativo) e fonte `github` em produção.**

Por quê este e não os outros:

| Ponto | Problema |
|---|---|
| `page.tsx` após `ensureProfileExists` | Conta antes da V1 concluir (conta quem cai em `error.tsx`). Funciona, mas é menos fiel. |
| `/api/characters/[username]` | Duplicaria Home→ficha; contaria Duelo/personas; parte das respostas nem executa função (CDN). |
| V2 `ready/partial` | Depende de polling, de allowlist e de `GAME_ENGINE_V2_UI_ENABLED`. |
| Home (busca) | Conta tentativa, não ficha; navegação pode falhar depois. |

O `allowEnrichment` já existe e já significa "visitante interativo, não bot" — reaproveitá-lo evita novo parsing de UA. Sugestão de nome para evitar acoplamento semântico confuso: extrair `isInteractiveVisitor` no mesmo módulo (`protection.ts`) em vez de duplicar a regex.

**Pontos a validar na implementação (não verificados aqui):** (a) que `next/link` não pré-busca `/[username]` em rotas sem `loading.tsx` (a rota *não* tem `loading.tsx` de propósito; um E2E com `page.on('request')` confirma); (b) que `after()` dentro do componente em `<Suspense>` roda uma vez por request.

## 9. Public Read Strategy

**Endpoint recomendado: `GET /api/stats` — sim**, porque a Home precisa carregar sem bloquear e a leitura precisa ser absorvida pela CDN.

```json
{ "invocationsTotal": 1284, "invocationsThisWeek": 317 }
```

- Exposição mínima: dois inteiros. Nada de IP, hashes, usernames, telemetria. Falha/sem storage → `{ "invocationsTotal": null, "invocationsThisWeek": null }` (HTTP 200, `s-maxage=60`) para a CDN também proteger o Redis durante uma queda e a UI simplesmente esconder o contador.
- Cache: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (mesmo padrão de `/api/characters` e `/api/heroes`). Número com até ~5 min de atraso é irrelevante para prova social e a UX é instantânea após o primeiro hit.
- Leitura barata: 1 comando `MGET` (total + 7 contadores diários) por miss de CDN.
- Home: componente cliente pequeno (mesmo padrão do `useEffect` das personas em `LandingHero`) que busca **depois da montagem**. A Home não espera nada, não depende de Redis para renderizar. Alternativa descartada: ler Redis no server component da Home — adiciona I/O externo a todo render de uma página `force-dynamic`.

**Modelo de dados (Redis, prefixo versionado `ghrpg:v1:`):**

| Chave | Tipo | Uso | TTL |
|---|---|---|---|
| `seen:{YYYY-MM-DD}:{sha16(username)}` | string, `SET NX` | dedupe | 48 h |
| `total` | int, `INCR` | total acumulado | — |
| `day:{YYYY-MM-DD}` | int, `INCR` | série diária (semana = soma de 7) | 400 d |

Escrita: `SET NX` (1 comando); se novo, `INCR total` + `INCR day` em pipeline (+2). Leitura: `MGET` 8 chaves (1 comando). "Esta semana" = **janela móvel de 7 dias** (evita zerar toda segunda-feira).

## 10. UI Recommendation

**Exibir somente: total acumulado.** Razões: nunca regride (prova social), a semanal oscila e mostra "0" em semana parada (prova social negativa), e o total é o que o dedupe suporta com menos explicação. A semanal fica no payload para trocar a exibição quando fizer sentido (ex.: semanal consistentemente > 100).

- **Métricas internas:** A total ✔, B semanal ✔ (grátis a partir dos contadores diários), C perfis únicos (opcional: `PFADD` em um HyperLogLog, ~12 KB, +1 comando; **não** exibir), D duelos ✘ (sem evento de servidor limpo).
- **Rótulo PT:** `{n} fichas invocadas` — coerente com o botão existente "Invocar Ficha".
- **Rótulo EN:** `{n} sheets summoned` — coerente com "Summon Sheet".
- Evitar: "pessoas", "usuários", "visitantes" (não medimos pessoas). Evitar "jornadas reveladas" (poético, mas não dá para auditar o que significa).
- Visual: uma linha `✦ 1.284 fichas invocadas`, `font-sans text-xs text-amber-200/80`, reusando `RpgSparkles` já importado em `LandingHero`, entre os links secundários (Duelar / Explorar o Salão) e o `RPGDivider`. Formatar com `formatNumber(value, language)` e `fill()` de `src/lib/format.ts`; strings em `landing.*` nos dois dicionários (`en.ts`/`ptBR.ts`).
- Reservar altura da linha (ex.: `min-h-5`) e entrar com `animate-fade-in` já existente para não haver layout shift; respeitar o tratamento de reduced-motion do projeto.
- **Não fabricar:** sem backfill, sem número inicial inventado. Esconder enquanto o total for pequeno (limiar sugerido ≈ 25, constante única) — número baixo é prova social negativa, e esconder é honesto; mostrar antes disso seria igualmente honesto, mas pior de produto.
- Falha/`null`/mock → não renderiza nada.

## 11. Cost

- **Upstash free:** 500 K comandos/mês. Estimativa por 1.000 fichas-dia/dia novas: 1.000 × 3 = 3 K comandos/dia (~90 K/mês); duplicatas custam 1 comando. Leitura: pior caso ~ (nº de regiões de CDN ativas) × (86 400 / 300) ≈ 288/dia por região (~8,6 K/mês por região). Folga confortável até ordem de ~5–10 K fichas-dia/dia.
- **Acima disso:** pay-as-you-go US$ 0,20 / 100 K comandos (fonte: página de billing citada), com orçamento mensal configurável.
- **Vercel:** nenhum custo adicional relevante — o `after()` já é usado; `/api/stats` é uma invocação cacheada.
- **Dependência npm:** 0 (REST via `fetch`). **Infra nova:** 1 banco Redis do Marketplace.
- Observação: não validei preço/limites diretamente no dashboard — confirmar ao provisionar.

## 12. Final Recommendation

**RECOMMENDED_APPROACH:** Redis gerenciado (Upstash via Vercel Marketplace, plano free) acessado por REST/`fetch`; contagem server-side em `CharacterSheet` após V1 bem-sucedida, dedupe `username+dia UTC` por `SET NX`, contadores `total` + diários; `GET /api/stats` cacheado em CDN (5 min); Home exibe só o total, via componente cliente não bloqueante com fallback silencioso.
**WHY:** é a menor solução que dá atomicidade e persistência (o que Runtime Cache, logs e arquivo não dão), sem PII, sem dependência npm e sem tocar no caminho crítico da ficha.
**COST:** US$ 0 no free tier para a escala atual.
**NEW_DEPENDENCY:** nenhuma (`fetch`); `@upstash/redis` seria opcional.
**NEW_INFRA:** sim — 1 banco Redis (Marketplace) + 2 variáveis server-only (+1 flag opcional).
**PRIVACY_IMPACT:** nenhum dado do visitante; só hashes de username por 48 h e inteiros.
**IMPLEMENTATION_COMPLEXITY:** baixa–média (~1 módulo de storage, 1 helper de contagem, 1 rota, 1 componente, 2 strings i18n, mudanças em `config.ts`/`.env.example`/README, testes unitários + 1 E2E).
**EXPECTED_ACCURACY:** alta para "fichas-dia" de visitantes interativos em produção; deliberadamente **não** é contagem de visitas nem de pessoas; subconta fichas famosas (por design) e pode ser inflada, no máximo, até o nº de perfis reais distintos por dia por script que finja navegador.

**Segunda melhor opção:** Vercel Analytics com evento customizado, **somente se** o projeto estiver no plano Pro — menor operação (sem Redis), mas sem dedupe por `username+dia`, com subcontagem por ad-block, dependência nova e leitura via API com token. Para a Home atual, é pior que o Redis.

**Não recomendado:** Runtime Cache como contador (race + escopo regional + pode regredir), logs, arquivo.

### Perguntas em aberto antes de implementar
1. Qual o plano da Vercel do projeto (Hobby/Pro)? Isso define se a segunda opção sequer existe.
2. Aceita provisionar um Redis no Marketplace? É a única infra nova, e contradiz o registro histórico "sem Redis" apenas na letra — o motivo daquela decisão era cache, não contador.
3. Limiar mínimo de exibição (≈ 25) e janela do "semanal" (móvel 7 d) estão ok?

### Fontes externas usadas (verificar antes de decidir)
- [Vercel — limits and pricing (Web Analytics)](https://vercel.com/docs/analytics/limits-and-pricing)
- [Vercel — Public Web Analytics API](https://vercel.com/changelog/web-analytics-api)
- [Upstash — billing / free tier](https://upstash.com/docs/redis/overall/billing)
- Detalhes de Runtime Cache (regional, LRU) vieram de espelhos de terceiros — **não confirmados em documentação oficial**.
