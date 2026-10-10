## perf: reduce large profile graphql latency

### Causa raiz
Em produção, `sindresorhus` (frio) levou `v2_base_loaded` = 56,6 s (1 REST, 24 GraphQL) e o runtime matou a invocação aos 60 s antes de o collector V2 terminar. O collector não era a causa.

As 20 páginas de `user.repositories` (50 repos, com linguagens) eram **encadeadas por cursor**: ~3,1 s cada, uma esperando a anterior = ~62 s. As contribuições já rodavam em paralelo e terminavam ~55 s antes.

### Decomposição dos 24 GraphQL (medida, não suposta)
| Tipo | Qtd | Sequencial? | Paralelizável? | Compartilhável? | Necessário p/ V1? |
|---|---:|---|---|---|---|
| `user.repositories` (50/pág, languages) | 20 (teto de 1000 repos → `partial`) | Sim (cursor), ~3,1 s cada | Só depois de conhecer os cursores | Alimenta V1 e o snapshot de discovery do V2 | Sim |
| `contributionsCollection` (5 anos/req; reviews vêm aqui) | 4 | Não (3 por vez), ~6,5 s no total | Já era | Não | Sim |
| Reviews como query separada | 0 | – | – | – | – |

Probe real: uma chamada só com cursores (`edges { cursor }`, 100 repos) ainda custa ~2,5 s (a enumeração da connection é o custo, não as languages); `edges[i].cursor` é idêntico ao `endCursor` que a página sequencial produziria; 4 páginas completas em paralelo levaram 3,5 s no total.

### Mudança
Acima de 150 repos públicos, `fetchRepositoryPagesPipelined` percorre os cursores (10 chamadas p/ 1000 repos) e pede cada página de 50, **inalterada**, assim que o cursor aparece, 3 por vez. A primeira página sai imediatamente e a próxima chamada do percurso entra na fila antes das páginas que ela libera.
- Mesma query, mesmo tamanho de página, mesma ordem, mesmo dedupe, mesmo teto de 20 páginas, mesmas regras de cobertura, mesmo fallback `/languages`.
- Todo request continua passando pelo `GitHubHttpClient` (limiter de 6, gate de rate limit/Retry-After, retry transitório, timeout, abort) e pelo circuit breaker em torno de `getProfile`.
- Qualquer falha rejeita o fetch inteiro e aborta os irmãos; nunca devolve lista parcial.
- Até 150 repos o caminho sequencial é o de antes (perfis pequenos não pagam nada). Sem token / `repositoryTransport: "rest"` o fluxo REST é intocado.
- Collector V2, balance, limites de timeout: **não alterados**.
- Telemetria (`v2_base_loaded`): `graphql_repository_requests`, `graphql_cursor_requests`, `graphql_contribution_requests`, `graphql_other_requests`, tempo somado por categoria e tempos de parede por fase (`user_ms`, `repositories_ms`, `contributions_ms`). Só números.

### Antes / depois (execução real local, mesmo perfil)
| Métrica | Antes | Depois |
|---|---:|---:|
| base total | 62,7 s local (56,6 s prod) | 32,4 s |
| REST | 1 | 1 |
| GraphQL total | 24 | 34 |
| páginas de repos / cursores / contributions | 20 / 0 / 4 | 20 / 10 / 4 |
| A/B concorrente (mesmo processo) | 61,3 s | 30,7 s |

+10 requests GraphQL (≈ +10 pontos de 5000/h); o ganho é de relógio, não de contagem.

### Prova de equivalência
- Dados reais, as duas implementações lado a lado em `sindresorhus`: mesmos 1000 repos, mesma ordem, mesmos flags/linguagens/discovery/cobertura (`partial`, teto de 1000); contributions, reviews e atividade idênticos. Única diferença: 1 contagem de estrelas viva (`awesome` 516240 vs 516241) e `fetchedAt`.
- Testes: `repositoryPipeline.test.ts` compara o pipeline com o caminho sequencial (dica `public_repos`) até o `RPGCharacter`; cobre fronteiras de página, teto 1000/1010, dedupe, concorrência ≤ 3 e ≤ 6 no total, ordem das chamadas, fallback `/languages`, rate limit no meio do lote, circuit breaker, falha parcial, retry 503, timeout/abort (sem requests depois da falha), perfil pequeno inalterado, fallback anônimo (quota 60/h não abre o circuito) e `repositoryTransport: "rest"`.
- lint, typecheck, 1147 testes, build e E2E (55/55) verdes.

### Riscos
- Margem: a base fica ~30 s; o collector precisa caber nos ~28 s restantes dos 60 s. Só a validação pós-deploy prova isso.
- `hardMs` do enrichment (55 s) é contado desde o início do enrichment, não da invocação; não alterado aqui.
- Uma troca de ordem entre o percurso e as páginas (push no meio) pode deslocar um limite de página; é o mesmo risco da cadeia sequencial (janela menor aqui), com dedupe e `partial` se a contagem ficar abaixo de `public_repos`.
- `repository_discovery=reused` só é logado no fim do collector (`v2_collector_finished`/`v2_enrichment_summary`), que o timeout impediu de rodar; o snapshot é passado por closure na mesma invocação e chega ao `after()`.
