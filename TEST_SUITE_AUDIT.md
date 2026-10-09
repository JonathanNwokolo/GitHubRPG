# GitHub RPG — Auditoria da suíte de testes

Data da auditoria: 2026-10-08  
Baseline final auditada: `16c2fa7` (`feature/profile-ux-polish`)  
Escopo: análise somente; nenhum teste, código de produção, engine, CI, timeout ou configuração de workers foi alterado.

## 1. Executive Summary

A suíte atual tem **1.240 testes em 94 arquivos**:

- **Vitest:** 1.190 testes, 93 arquivos, 1.190 aprovados.
- **Playwright:** 50 testes, 1 arquivo, 50 aprovados, 23,3 s de wall time com 4 workers.
- **Build de produção:** aprovado; incluiu a checagem de tipos e lint executada pelo Next.js.
- **Código de testes:** aproximadamente 12.835 linhas.
- **Snapshots:** 0.
- **Testes `skip`/`todo`/`only`:** 0.

Conclusão: a suíte está **parcialmente supertestada**, mas não no Game Engine. O volume de V1, V2, invariants, normalização, cobertura parcial, transporte REST/GraphQL, rate limit e fallback é justificado. A maior oportunidade está em três pontos:

1. E2E muito atomizado: 50 fluxos em um arquivo de 788 linhas, vários repetindo contratos já provados por unit/integration.
2. UI de perfil/compartilhamento: muitas renderizações completas, mocks e consultas assíncronas para variações próximas.
3. Matrizes expressas como testes manuais: Chronicle, HTTP/GitHub, classes, estados de cobertura e mensagens bilíngues podem usar tabelas sem perder cenários.

Não há evidência suficiente para chamar blocos inteiros de testes de obsoletos. V1 ainda protege fallback e contratos usados por Chronicle, Duelo, Badge, Card, Share e metadata. Testes de funcionalidades removidas continuam úteis como regressão de produto, embora estejam repetidos em mais de um fluxo.

Estimativa central, usada apenas para orientar priorização e não como contagem matemática de cobertura:

| Classe primária | Estimativa | Interpretação |
|---|---:|---|
| Essenciais | 760 | Contratos, engines, invariants, dados, erros, segurança, fallback e jornadas críticas |
| Úteis | 389 | Regressões de UI, copy, acessibilidade e casos secundários |
| Redundantes/consolidáveis | 66 | Comportamento já coberto em outro nível ou cenários atomizados |
| Frágeis/caros | 25 | Classificação primária; mais testes vivem em arquivos caros, mas continuam essenciais/úteis |
| Obsoletos | 0 | Nenhum caso provadamente sem comportamento atual protegido |
| **Total** | **1.240** | Categorias primárias exclusivas; fragilidade também é tratada como sinal transversal |

Recomendação: manter aproximadamente **1.185 testes**, com faixa saudável de **1.168–1.194**, desde que as asserções críticas sejam preservadas. Isso é uma redução conservadora de cerca de 4–6%, não uma meta artificial.

## 2. Current Test Inventory

### Metodologia

- Inventário por `rg` e pela descoberta real dos runners.
- Vitest executado com reporter JSON para obter contagem, resultado e duração por arquivo/teste.
- Playwright executado uma vez na baseline final, após build atual, com reporter JSON.
- Tempos são de uma única execução e devem ser lidos como aproximações. Vitest e Playwright executam trabalho em paralelo; duração por arquivo/teste inclui contenção e não deve ser somada para inferir wall time.
- A baseline mudou externamente durante a coleta: quatro commits foram criados por outro processo e um teste não versionado de 6 casos foi removido por reset. A coleta anterior foi descartada e a HEAD final foi medida novamente. Nenhum desses commits foi criado por esta auditoria.

### Inventário por área

| Área | Arquivos | Testes | Observação |
|---|---:|---:|---|
| GitHub datasource/repositories | 9 | 201 | Maior concentração; REST, GraphQL, paginação, cobertura e custo |
| Game Engine V1 core/invariants | 7 | 109 | Matemática, atributos, progressão, arquitetura e criação |
| Game Engine V2 | 9 | 108 | Invariants, bounds, evolução, delivery, cache, projeção e telemetria |
| Chronicle | 5 | 106 | Regras, texto, UI, preview e compartilhamento |
| Share/Badge/Card | 6 | 76 | Conteúdo, modal, badge, share e targets |
| Classes/subclasses | 3 | 73 | Mapeamento, limiares, explicação e i18n |
| Normalização/fixtures | 3 | 65 | Cobertura, schema, determinismo e fixtures de balance |
| Profile page integration | 6 | 59 | Fallback V1/V2, sharing, 404, boundaries e tabs |
| API routes | 7 | 58 | Character, Hall, cards, badge e V2 experimental |
| Character UI/V2 loading | 8 | 45 | Header, modal, loading, estado e apresentação live |
| Data loading/contracts | 3 | 37 | Load, boundary e error mapping |
| Duel | 5 | 32 | Engine, arena, builder, tabs e URL |
| Protection/rate limit/circuit breaker | 2 | 31 | Cliente HTTP, budgets, retry e circuit breaker |
| Hall of Heroes/cache | 3 | 28 | Hook, UI, budget e cache de sessão |
| Achievements V1 | 1 | 26 | Catálogo, thresholds, parcial e próximos objetivos |
| SEO/URLs | 3 | 25 | Canonical, OG, paths e host público |
| Titles | 2 | 24 | Unlock, progress, escolha e persistência |
| Grimório/skills | 1 | 23 | Afinidades e thresholds |
| Design system components | 2 | 17 | Dialog e Tabs |
| Avatar | 3 | 15 | Frames, apresentação e consistência |
| Navbar/Footer/i18n/layout | 3 | 13 | Navegação, idioma do documento e 404 |
| Progress/UI | 1 | 12 | Valores cobertos e mensagens |
| Profile UI | 1 | 7 | Semântica e decoração acessível |
| E2E | 1 | 50 | Jornadas de browser, layout e endpoints |
| **Total** | **94** | **1.240** | 93 Vitest + 1 Playwright |

As quatro maiores áreas — GitHub/data, V1, V2 e Chronicle — concentram 524 testes (42,3%). Esse volume é coerente com o risco de dados incompletos, determinismo, thresholds e fallback. O problema de quantidade não está concentrado nessas áreas.

## 3. Coverage by Area

### Cobertura forte e proporcional ao risco

- **V1 e V2:** determinismo, bounds, catálogo, reachability, thresholds, redaction, cobertura parcial/unavailable, cache key e evolução.
- **GitHub data:** REST anônimo, GraphQL autenticado, 50 repos/página, paginação, fallback `/languages`, forks, deduplicação, concorrência, rate limit, timeout e payload malformado.
- **Normalização:** bytes reais de linguagem, ausência versus zero, cópia defensiva, datas e schemas.
- **Erros/API:** 404 real, 429/Retry-After, indisponibilidade amigável e respostas sanitizadas.
- **Chronicle:** invariants narrativos, partial data, anos não lidos, thresholds de crescimento/declínio/retorno, determinismo e i18n.

### Cobertura útil, porém mais densa do que o risco exige

- Compartilhamento de achievement/Chronicle/README cobre muitas combinações próximas em `CharacterPageSharing.test.tsx` e repete parte de `ShareCardModal.test.tsx`, rotas de card e E2E.
- Consistência de classe V1/V2 é testada no helper, header/modal, página e browser. Um teste por camada é justificado; todas as variações em todas as camadas não são.
- i18n é verificada por dicionário/helper, componente e múltiplos fluxos de browser. O E2E precisa provar a troca global, não cada sentença.
- Layout mobile tem valor de browser, mas pode ser incorporado à própria jornada da feature em vez de existir como fluxo separado.

### Lacunas não detectadas por quantidade

- A execução local prova a baseline mockada, não GitHub/Vercel em produção.
- Não há medição de cobertura de linhas/branches nesta auditoria; o pacote de coverage não foi adicionado.
- Uma execução aprovada não prova ausência de flake. O risco foi estimado por código e dependências de timing.
- Os 50 E2E ficam em um único arquivo, o que dificulta ownership, seleção e diagnóstico, apesar de não reduzir a cobertura funcional.

## 4. Essential Tests

### P0 — NÃO MEXER no comportamento protegido

Game Engine V1:

- `src/game/architecture.test.ts`
- `src/game/createCharacter.test.ts`
- `src/game/math.test.ts`
- `src/game/age.test.ts`
- `src/game/attributes/attributes.test.ts`
- `src/game/classes/classes.test.ts`
- `src/game/progression/level.test.ts`
- `src/game/progression/xp.test.ts`
- `src/game/achievements/achievements.test.ts`
- `src/game/titles/titles.test.ts`
- `src/game/skills/skills.test.ts`

Game Engine V2:

- `src/game-v2/bounds.test.ts`
- `src/game-v2/collectorV21.test.ts`
- `src/game-v2/delivery.test.ts`
- `src/game-v2/engine.test.ts`
- `src/game-v2/evolution.test.ts`
- `src/game-v2/publicProjection.test.ts`
- `src/game-v2/runtimeCache.test.ts`
- `src/game-v2/runtimeDelivery.test.ts`
- `src/game-v2/telemetry.test.ts`

Dados e GitHub:

- `src/data/normalize.test.ts`
- `src/data/loadCharacter.test.ts`
- `src/data/datasourceContract.test.ts`
- `src/data/datasource/config.test.ts`
- `src/data/sharedDiscovery.test.ts`
- `src/data/serverBoundary.test.ts`
- `src/data/fixtures/balanceFixtures.test.ts`
- `src/data/seed/deterministic.test.ts`
- `src/data/github/GitHubApiDataSource.test.ts`
- `src/data/github/graphqlRepositories.test.ts`
- `src/data/github/repositoryPipeline.test.ts`
- `src/data/github/httpClient.test.ts`
- `src/data/github/protection.test.ts`
- `src/data/github/contributionStats.test.ts`
- `src/data/github/reviewCoverage.test.ts`

Contratos de produto/API que merecem pelo menos uma prova em cada camada relevante:

- `src/app/[username]/page.test.tsx`
- `src/app/[username]/CharacterSheet.test.tsx`
- `src/app/[username]/boundaries.test.tsx`
- `src/app/api/characters/[username]/route.test.ts`
- `src/app/api/experimental/v2/characters/[username]/route.test.ts`
- `src/app/api/heroes/route.test.ts`
- `src/app/api/badge/[username]/route.test.ts`
- `src/app/api/card/[username]/route.test.ts`
- `src/app/api/card/[username]/achievement/[achievementId]/route.test.ts`
- `src/app/api/card/[username]/chronicle/[eventId]/route.test.ts`
- `src/features/duel/engine/createDuel.test.ts`
- `src/features/chronicle/buildDeveloperChronicle.test.ts`

“P0” significa preservar a matriz semântica. Isso não impede uma parametrização mecânica que mantenha cada caso e cada asserção reconhecível.

## 5. Redundant Coverage

### A. Duplicação justificada

| Comportamento | Camadas | Por que manter |
|---|---|---|
| 404 de usuário inexistente | datasource, page/route, E2E | Erro tipado, status HTTP real e ausência de ficha são contratos diferentes |
| V1-first/V2 fallback | delivery, projection, CharacterPageClient, E2E | Engine isolada não prova adoção assíncrona nem rollback visual |
| Rate limit/proteção | HTTP client, datasource/pipeline, API | Mapeamento, circuit breaker e resposta pública são responsabilidades distintas |
| Partial/unavailable | normalização, engine, UI, E2E representativo | Evita zero silencioso e afirmações falsas em cada boundary |
| Share/card | conteúdo, rota PNG, UI, um E2E | Cada camada protege autorização, render do asset e ação real do browser |

### B. Possivelmente redundante

- `classExplanation.test.ts`, `classExplanationText.test.ts`, `HeaderModalConsistency.test.tsx`, `CharacterPageSharing.test.tsx` e flows 16/16b cobrem muitas das mesmas combinações classe/subclasse/idioma.
- `HeroesHall.test.tsx`, `useHeroCategory.test.tsx`, `api/heroes/route.test.ts` e flow 0b repetem partial/loading/retry. O E2E deve manter somente a jornada que não pode ser provada em jsdom.
- `equippedTitle.test.ts`, `CharacterPageClient.test.tsx`, V2 H e flow 9 cobrem persistência de título duas vezes no browser.
- `badgeSvg.test.ts`, rota badge e flow 17b repetem formato/status. O browser acrescenta pouco ao contrato HTTP de SVG.
- Persona rookie/veteran/empty em E2E repete cálculos do engine; um smoke normal e um edge vazio são suficientes.

### C. Claramente redundante como teste autônomo

- Flow 10 e flow 17 provam separadamente que ações README não aparecem; `CharacterPageHiddenActions.test.tsx` já cobre a regra em integração. Manter uma única asserção E2E dentro da jornada de perfil.
- Flow 5 e flow 5c abrem o mesmo usuário inexistente. As asserções de página, status e `noindex` podem estar em um único fluxo; flow 5b continua separado porque protege estado residual.
- Flow 10b repete a rota PNG em `src/app/api/card/[username]/route.test.ts`. Se um smoke HTTP E2E for desejado, incorporá-lo ao flow 18 em vez de manter uma jornada própria.
- Flows 18b e 19b repetem autorização/404 já coberta nas rotas de achievement e Chronicle. Podem virar integration HTTP ou ser incorporados aos flows 18/19.
- Ausência de Guilda/Masmorras/Buffs aparece nos flows 4, 13 e 15. A regra de produto é útil; três jornadas separadas não são.

## 6. Fragile Tests

### HIGH

| Arquivo/caso | Evidência | Risco |
|---|---|---|
| `e2e/flows.spec.ts` — V2 cold polling | `waitForTimeout(500)`, route gate, polling, 10,48 s | Dependência de janela temporal real e CPU/browser |
| `e2e/flows.spec.ts` — arquivo inteiro | porta 3005, build `.next`, servidor real, 4 workers, 50 flows | Falha de ambiente pode parecer regressão; diagnóstico é caro |
| `src/data/github/repositoryPipeline.test.ts` | sleeps reais de 8/60 ms para concorrência/cancelamento | Sensível a scheduler e carga da máquina |
| `src/data/github/utils.test.ts` | tick real de 2 ms | Margem pequena para provar concorrência |

### MEDIUM

| Arquivo/caso | Evidência | Risco |
|---|---|---|
| `CharacterPageSharing.test.tsx` | 26 testes, 38 sinais de mock, 10 `waitFor`, 25 `findBy`, render completo | Alto acoplamento e custo; fake timer em timeout ajuda, mas a UI ainda é pesada |
| `HeroesHall.test.tsx` | fetch sequencial, cache, `waitFor`, fake timers e auto-retry | Várias filas assíncronas precisam permanecer alinhadas |
| `useHeroCategory.test.tsx` | fake timers, visibility global e requests in-flight | Estado global/documento e ordem de microtasks |
| `DuelArena.test.tsx` | animação controlada por fake timers | Baixo risco de relógio real, médio acoplamento ao choreography |
| `game-v2/delivery.test.ts` | concorrência, AbortController e fake hard budget | Semântica crítica; ordem de microtasks exige cuidado |
| Rotas de card PNG | renderização de imagem real | Caras, mas estáveis; falhas podem vir do renderer/ambiente |

### LOW

- Engines puras, normalização, catálogos, thresholds e serialização determinística.
- Testes com fake timers corretamente restaurados são menos frágeis do que os que esperam tempo real.
- Testes de filesystem são leituras do repositório, sem diretórios temporários compartilhados e sem escrita observada.

Resultado observado: nenhum timeout, retry ou flake na execução final. Isso reduz a urgência, mas não elimina o risco estrutural.

## 7. Slowest Tests

### Top 20 arquivos

| # | Arquivo | Tempo aprox. | Motivo provável | Justificável/ação |
|---:|---|---:|---|---|
| 1 | `e2e/flows.spec.ts` | 23,30 s wall | browser + servidor + 50 jornadas | Sim, mas reduzir para 34–38 e dividir por domínio depois |
| 2 | `CharacterPageSharing.test.tsx` | 25,31 s | renders completos, cards, dialogs, queries async | Parcial; separar lógica e parametrizar variações |
| 3 | `CharacterPageClient.test.tsx` | 13,13 s | página completa, V1/V2, tabs e modal | Parcial; manter contratos, reduzir montagens duplicadas |
| 4 | `HeaderModalConsistency.test.tsx` | 8,11 s | seis renders pesados para matriz pequena | Consolidar com `it.each`/setup reutilizável |
| 5 | `HeroesHall.test.tsx` | 7,21 s | polling, cache, teclado e loading | Justificável; remover só repetição de copy |
| 6 | `DuelArena.test.tsx` | 3,66 s | animação + timers + duas fichas | Justificável; manter fake timers |
| 7 | `GitHubApiDataSource.test.ts` | 3,27 s | 49 pipelines completos com fake GitHub | Justificável; parametrizar erros/cobertura |
| 8 | `ChronicleSection.test.tsx` | 3,05 s | timeline e interação DOM | Útil; fundir variações de apresentação |
| 9 | `repositoryPipeline.test.ts` | 2,98 s | concorrência e sleeps reais | Essencial, mas trocar tempo real em etapa futura |
| 10 | `api/card/[username]/route.test.ts` | 2,92 s | PNG 1200×630 | Manter um render real; demais casos podem mockar renderer |
| 11 | `profileUi.test.tsx` | 2,18 s | vários componentes em jsdom | Parametrizar sem remover semântica |
| 12 | `graphqlRepositories.test.ts` | 2,03 s | paginação/fallback completos | Essencial; tabelar casos próximos |
| 13 | rota Chronicle card | 1,85 s | PNG real | Manter um happy path real |
| 14 | `ShareCardModal.test.tsx` | 1,76 s | muitos mocks de browser/fallback | Consolidar matriz Web Share/clipboard |
| 15 | `CharacterPageHiddenActions.test.tsx` | 1,75 s | página completa por uma regra de visibilidade | Mover a regra para integração menor ou compartilhar render |
| 16 | `Dialog.test.tsx` | 1,73 s | foco/portal/interações | Útil; custo aceitável |
| 17 | rota achievement card | 1,71 s | PNG real | Manter um happy path real |
| 18 | `not-found.test.tsx` | 1,59 s | bootstrap React/jsdom desproporcional a 2 casos | Custo de arquivo/setup, não lógica lenta |
| 19 | `Tabs.test.tsx` | 1,42 s | jsdom e teclado | Útil; custo aceitável |
| 20 | `Navbar.test.tsx` | 0,77 s | menu mobile/idioma | Útil; custo aceitável |

Observação: a duração de arquivo Vitest inclui setup e contenção paralela; por isso um arquivo pode ter tempo maior que uma soma intuitiva de seus testes.

### Testes individuais mais lentos observados

| Teste | Tempo aprox. |
|---|---:|
| E2E V2 cold polling/stale response | 10,48 s |
| E2E V2 responsive em 6 larguras | 6,82 s |
| E2E persistência de título | 3,76 s |
| E2E ausência de features removidas | 3,62 s |
| E2E compartilhar achievement | 3,30 s |
| Header/modal sem subclass | 3,23 s |
| E2E catálogo V2/redaction | 3,09 s |
| E2E Chronicle mobile | 2,81 s |
| E2E ações mobile | 2,62 s |
| CharacterPage tab/panel | 2,31 s |

## 8. E2E Audit

### Avaliação por grupo

| Fluxos | Recomendação | Motivo |
|---|---|---|
| V2 cold polling | KEEP | Prova troca assíncrona e descarte de resposta antiga; risco crítico |
| V2 A/I rollback | KEEP | Fallback/allowlist é contrato de rollout |
| V2 B/C/E/F, D e G | KEEP, com possível merge parcial | Cobrem ready, null conservador e redaction; não substituir por engine-only |
| V2 H + flow 9 | MERGE WITH OTHER FLOW | Mesma persistência de título em browser |
| V2 responsive + loading | KEEP | Layout e ausência de flash V1 precisam de browser |
| flows 0 + 0a | MERGE WITH OTHER FLOW | Hall mobile e navegação podem compor uma jornada |
| flow 0b | KEEP | Atualização incremental/sem reload é comportamento real de browser |
| flow 1 | KEEP | Jornada primária da landing até a ficha |
| flows 2 + 3 | MOVE TO INTEGRATION ou manter só um smoke | Repetem resultado do engine para personas normais |
| flow 4 | KEEP | Empty profile é edge de alto valor; remover checks duplicados de feature drop |
| flows 5 + 5c | MERGE WITH OTHER FLOW | Um fluxo pode provar 404, ausência de ficha e noindex |
| flow 5b | KEEP | Protege vazamento de estado entre navegações |
| flows 6 + 6b + 16b | MERGE WITH OTHER FLOW | Uma jornada bilíngue pode provar nav, `<html lang>`, footer e modal |
| flow 6c | MOVE TO INTEGRATION | Apenas ausência de link para uma rota ainda existente |
| flow 6d | KEEP | Teclado e ARIA integrados têm valor de browser |
| flow 6e | MOVE TO INTEGRATION | Metadata já é coberta por helpers/page; browser acrescenta pouco |
| flows 7 + 8 | KEEP | Reduced motion e teclado são interações reais |
| flows 10 + 17 + parte do 13 | MERGE WITH OTHER FLOW | Mesmo contrato de ações/features ocultas |
| flow 10b | MOVE TO INTEGRATION | Endpoint PNG já tem route test; incorporar smoke ao share se necessário |
| flow 11 | MOVE TO INTEGRATION | Texto de progressão já é determinístico e coberto |
| flow 12 | KEEP | “missing evidence is not zero” merece um smoke público |
| flow 13 | REMOVE EVENTUALLY como fluxo isolado | Preservar uma asserção de regressão, não a jornada separada |
| flow 14 | MOVE TO INTEGRATION | Presença de texto estático |
| flows 15 + 15a + 15c | MERGE WITH OTHER FLOW | Estrutura, teclado e mobile cabem numa jornada Chronicle |
| flow 15b | MOVE TO INTEGRATION | Regra do perfil novo já está fortemente coberta |
| flow 16 | KEEP | Liga dados reais mockados à explicação pública |
| flow 17b | MOVE TO INTEGRATION | Contrato HTTP/SVG, não comportamento de browser |
| flow 18 | KEEP | Share/download e lock combinam browser + asset |
| flow 18b | MOVE TO INTEGRATION | Autorização/404 já pertence à rota |
| flow 19 | KEEP | Jornada real de Chronicle share/download |
| flow 19b | MOVE TO INTEGRATION | Validação de capítulo já pertence à rota |
| flow 19c | MERGE WITH OTHER FLOW | Incorporar layout mobile ao flow 18 ou 19 |
| flows 20 + 20d | MERGE WITH OTHER FLOW | Jornada principal pode validar mobile |
| flow 20a | KEEP | Erros independentes e retry são críticos |
| flows 20b + 20c | MERGE WITH OTHER FLOW | Uma origem representativa de prefill basta em E2E; outra fica em integração |

Contagem atual: **50**.  
Contagem recomendada: **34–38**.  
Não remover de uma vez: primeiro criar/confirmar a cobertura de integração equivalente e então reduzir o browser.

## 9. Engine Test Assessment

### V1

Os testes V1 continuam essenciais. V2 não substituiu V1 como fonte universal: fallback, Chronicle, Duelo, Badge, Card, Share e metadata ainda dependem de contratos V1. Portanto, “V1 onde V2 já é fonte de verdade” não descreve o estado atual.

Separação observada:

- **Invariants críticos:** arquitetura, ranges, pesos, thresholds, ausência versus zero.
- **Fixtures de regressão:** `balanceFixtures.test.ts`, builders e personas determinísticas.
- **Balance/reachability:** atributos, classes, subclasses, achievements, títulos e skills.
- **Determinismo:** seed, criação de personagem e seleção de título.

### V2

O conjunto V2 é compacto em tempo e alto em valor: 108 testes em 9 arquivos. `engine.test.ts` tem invariants executáveis, catálogo, redaction, reachability, counterfactuals, null conservador e determinismo. `evolution.test.ts` protege gates e compatibilidade. Delivery/cache/projection protegem o fallback V1 e o boundary público.

Separação observada:

- **Invariants:** `engine.test.ts`, `bounds.test.ts`.
- **Fixtures/regressão:** golden fixtures usadas no engine e UI.
- **Reachability/calibração:** engine/evolution/collector.
- **Semantic equivalence e fallback:** delivery/publicProjection/CharacterPageClient.
- **Determinism:** engine, runtimeDelivery e cache key.

Recomendação: **não reduzir os testes de engine**. Parametrização é aceitável somente se preservar a identidade de cada invariant/fixture e a qualidade da falha.

## 10. Obsolete Tests

Nenhum teste foi classificado como comprovadamente obsoleto.

Casos suspeitos e decisão:

- **Guilda/Masmorras/Buffs/Missões:** funcionalidades removidas. Os testes de ausência ainda protegem uma decisão explícita de produto; o problema é repetição em 3 E2E, não obsolescência da regra.
- **README/share oculto:** comportamento atual e intencional. Um teste de integração + um check E2E são úteis; os demais são consolidáveis.
- **Design System fora da navegação:** a rota ainda existe. É um contrato atual, porém baixo valor para E2E; mover para integração.
- **V1:** não obsoleto, pois ainda é resposta/fallback e alimenta consumidores públicos.
- **Rotas de card/badge:** atuais e usadas pelo compartilhamento, apesar de parte do smoke HTTP estar duplicada no browser.

Antes de qualquer remoção futura, exigir uma das evidências: rota/feature realmente inexistente, requisito de produto revogado ou cobertura equivalente confirmada em camada mais barata.

## 11. Consolidation Opportunities

### Parametrização segura — mesma cobertura, menos código

| Arquivo/grupo | Oportunidade |
|---|---|
| `buildDeveloperChronicle.test.ts` | Tabelar growth/decline/return thresholds, partial/unavailable e invariants de mutação |
| `chronicleText.test.ts` | `it.each` por idioma, highlight kind e singular/plural |
| `GitHubApiDataSource.test.ts` | Matriz para 404/401/403/429/500/timeout/malformed e cobertura full/partial/unavailable |
| `httpClient.test.ts` | Tabela de status, retryability, rate-limit source e error class |
| `graphqlRepositories.test.ts` | Tabela para truncation/null/too-many-languages/fallback failure |
| `HeaderModalConsistency.test.tsx` | `it.each` por `{class, subclass, evolution, source}` com um render helper |
| `CharacterPageSharing.test.tsx` | Matrizes Web Share/clipboard/manual e achievement/Chronicle |
| `ShareCardModal.test.tsx` | Tabela por disponibilidade/falha de Web Share e clipboard |
| `classes.test.ts` | Agrupar limiares 9,99/10/10+ e same-class skipping |
| `attributes.test.ts` | Tabela empty/normal/extreme/hostile por atributo/range |
| `achievements.test.ts` e `titles.test.ts` | Expandir uso de tabelas já existente para ladders e partial/unavailable |
| Rotas API | Helper comum de matriz de erro/status/headers, sem fundir responsabilidades das rotas |

Parametrizar não precisa reduzir a contagem reportada: cada linha de `it.each` ainda deve aparecer como caso separado. O benefício esperado é reduzir aproximadamente **500–900 linhas** e tornar novos cenários mais baratos.

### P1 — CONSOLIDAR

- `src/app/[username]/CharacterPageSharing.test.tsx`
- `src/app/[username]/CharacterPageClient.test.tsx`
- `src/features/character/HeaderModalConsistency.test.tsx`
- `src/features/character/classExplanation.test.ts`
- `src/features/character/classExplanationText.test.ts`
- `src/features/share/ShareCardModal.test.tsx`
- `src/features/share/shareProfile.test.ts`
- `src/features/share/cardContent.test.ts`
- `src/features/chronicle/buildDeveloperChronicle.test.ts`
- `src/features/chronicle/chronicleText.test.ts`
- `src/features/chronicle/ChronicleSection.test.tsx`
- `src/data/github/GitHubApiDataSource.test.ts`
- `src/data/github/graphqlRepositories.test.ts`
- `src/data/github/httpClient.test.ts`
- `src/game/classes/classes.test.ts`
- `src/game/attributes/attributes.test.ts`
- `src/game/achievements/achievements.test.ts`
- `src/game/titles/titles.test.ts`
- `src/features/profile-ui/profileUi.test.tsx`
- `src/design-system/components/Dialog.test.tsx`
- `src/design-system/components/Tabs.test.tsx`
- `e2e/flows.spec.ts` nos merges descritos na seção 8

Consolidar esses arquivos não autoriza remover seus contratos essenciais.

### P2 — REVISAR DEPOIS

Arquivos com timing/custo/manutenção altos:

- `e2e/flows.spec.ts`
- `src/data/github/repositoryPipeline.test.ts`
- `src/data/github/utils.test.ts`
- `src/app/[username]/CharacterPageSharing.test.tsx`
- `src/features/heroes/HeroesHall.test.tsx`
- `src/features/heroes/useHeroCategory.test.tsx`
- `src/features/heroes/collectWithinBudget.test.ts`
- `src/features/duel/DuelArena.test.tsx`
- `src/game-v2/delivery.test.ts`
- `src/app/api/card/[username]/route.test.ts`
- `src/app/api/card/[username]/achievement/[achievementId]/route.test.ts`
- `src/app/api/card/[username]/chronicle/[eventId]/route.test.ts`

Baixo valor relativo para a camada atual, a mover ou incorporar em outra jornada:

- E2E flows 6c, 6e, 10b, 11, 13, 14, 15b, 17b, 18b e 19b.
- E2E flow 17 como caso separado do flow 10.

## 12. Suggested Cleanup Plan

Nenhuma etapa abaixo foi implementada.

1. **Congelar a matriz P0:** documentar os casos de engine/dados/API que não podem desaparecer e capturar a contagem por domínio.
2. **Parametrizar sem reduzir cobertura:** Chronicle, HTTP/GitHub, classes, attributes, achievements/titles e mensagens bilíngues.
3. **Extrair helpers de render/fakes:** reduzir montagem repetida em CharacterPage, share e Hall; não criar abstrações que escondam a intenção do teste.
4. **Substituir tempo real:** introduzir relógio/gates determinísticos nos três unit tests com `setTimeout` real. Não aumentar timeout.
5. **Reorganizar E2E por jornadas:** manter busca, 404, V2 rollout, accessibility, partial data, sharing, Chronicle, Hall e Duel; incorporar layout na jornada correspondente.
6. **Mover contratos HTTP/texto:** badge/card/status/metadata/disclaimer para integration quando o browser não acrescenta comportamento.
7. **Só então remover casos autônomos:** confirmar que a asserção equivalente continua visível no runner e revisar o diff de nomes de teste.
8. **Medir novamente:** uma execução Vitest e uma E2E, comparando wall time, falhas e nomes; sem mudar workers/timeouts na mesma alteração.

## 13. Estimated Test Count After Cleanup

Baseline: **1.240**.

- Consolidação segura com redução de casos autônomos: **40–60**.
- Remoção futura segura, depois de provar equivalência: **6–12**.
- E2E recomendado: **34–38**, contra 50 atuais.
- Faixa final recomendada: **1.168–1.194**.
- Ponto central: **aproximadamente 1.185 testes**.

Essa estimativa pressupõe que parametrizações puras continuam contando cada linha/caso. A redução vem principalmente de jornadas E2E fundidas e de testes de UI que hoje repetem o mesmo contrato com montagens completas.

## 14. Risks

- **Remover por contagem:** uma meta numérica pode apagar invariants raros. A regra deve ser equivalência de comportamento, não quantidade.
- **Confundir E2E com unit:** layout, foco, download, Web Share, status HTTP real e navegação não são totalmente substituídos por jsdom.
- **Diluir diagnostics:** tabelas grandes demais podem produzir nomes ruins; cada caso precisa de label explícito.
- **Ocultar partial/unavailable:** fundir casos não pode transformar ausência em zero nem reduzir a matriz full/partial/unavailable.
- **Reduzir V1 prematuramente:** V2 ainda não é fonte única para todos os consumidores.
- **Mascarar flake:** o fato de a suíte ter passado uma vez não prova estabilidade; trocar timing por determinismo deve ocorrer antes de eliminar testes.
- **Baseline concorrente:** a árvore mudou externamente durante a auditoria. Os números finais são da HEAD `16c2fa7`; qualquer nova mudança exige atualizar o inventário.
- **Produção não validada:** resultados são locais e mockados; não são evidência de GitHub/Vercel real.

## Resultado objetivo

```text
TOTAL_TESTS: 1240
TOTAL_TEST_FILES: 94

ESSENTIAL_ESTIMATE: 760
USEFUL_ESTIMATE: 389
REDUNDANT_ESTIMATE: 66
FRAGILE_ESTIMATE: 25
OBSOLETE_ESTIMATE: 0

SAFE_CONSOLIDATION_ESTIMATE: 40-60
SAFE_REMOVAL_ESTIMATE: 6-12

RECOMMENDED_FINAL_TEST_RANGE: 1168-1194

E2E_CURRENT_COUNT: 50
E2E_RECOMMENDED_COUNT: 34-38

ENGINE_TESTS_SHOULD_BE_REDUCED: NO
TEST_SUITE_OVERTESTED: PARTIALLY
CLEANUP_RECOMMENDED: YES
```

Frase final: **Eu manteria aproximadamente 1.185 testes.**
