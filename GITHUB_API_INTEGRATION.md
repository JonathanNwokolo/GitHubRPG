# Integração com a API do GitHub

`GitHubApiDataSource` entrega dados **públicos** reais ao mesmo contrato que o `MockDataSource` já usava (`RawGitHubData`). O Game Engine V1.1 não foi alterado: trocar a fonte não muda uma linha de `src/game/`.

```
Browser ──► GET /api/characters/[username]          (Route Handler, servidor)
              │
              ▼
        createDataSource()  ── GITHUB_DATA_SOURCE = mock | github
              │
              ▼
   GitHubApiDataSource ──► REST (perfil) + GraphQL (repositórios + linguagens, contribuições)  [api.github.com]
              │
              ▼
        RawGitHubData ─► Zod ─► normalizeDeveloperProfile() ─► DeveloperProfile ─► Game Engine V1.1 ─► RPGCharacter (JSON)
```

## Segurança: o token nunca sai do servidor

- Só o servidor fala com o GitHub. O navegador chama `/api/characters/[username]` e recebe o `RPGCharacter` já calculado (ou um erro com mensagem amigável).
- `GITHUB_TOKEN` é lido em **um único arquivo** ([src/data/datasource/config.ts](src/data/datasource/config.ts)), sem prefixo `NEXT_PUBLIC_`. Testes arquiteturais ([src/data/serverBoundary.test.ts](src/data/serverBoundary.test.ts)) garantem: nenhuma variável `NEXT_PUBLIC_*GITHUB*`, `process.env` e `GITHUB_TOKEN` só em `config.ts`, nenhum componente de cliente importa a camada server (`@/data/datasource`, `@/data/github`, `@/data/loadCharacter`).
- Erros tipados nunca carregam headers, corpo de resposta ou token; `describeError` só devolve mensagens fixas. Verificado também no bundle: `grep` em `.next/static` não encontra `api.github.com`, `GITHUB_TOKEN` nem `GitHubApiDataSource`.
- O token só aparece no header `Authorization` de [httpClient.ts](src/data/github/httpClient.ts). Nada é logado com ele.

### Que token usar

1. **Fine-grained personal access token**, com acesso **somente a repositórios públicos** (*Public repositories (read-only)*) e **nenhuma permissão adicional**. Isso é o que o GitHub recomenda para uso pessoal (permissões mínimas) e também impede que dados privados cheguem ao app.
2. Um token clássico sem escopos também funciona, mas é menos restrito.
3. **Cuidado:** se o token for de uma pessoa e você consultar o próprio usuário dela, a API pode contar contribuições privadas nos totais. Use o token somente-público (item 1) para não misturar.

**Evolução recomendada para uma aplicação pública: GitHub App** (token de instalação, limites maiores e escaláveis, sem depender de uma conta pessoal). Não implementado nesta etapa; veja a seção final.

## Variáveis de ambiente

| Variável | Valores | Efeito |
|---|---|---|
| `GITHUB_DATA_SOURCE` | `mock` \| `github` | Escolhe a fonte. Em desenvolvimento/teste, sem valor: `mock`. **Em produção, sem valor: erro explícito** (HTTP 500 `misconfigured` na API); nada de cair em mock sem querer. Valor desconhecido também é erro. |
| `GITHUB_TOKEN` | opcional | Lido só quando a fonte é `github`. O projeto inicia sem ele. |

Os e2e rodam sempre com `GITHUB_DATA_SOURCE=mock` (definido em `playwright.config.ts`).

**Sem fallback silencioso para mock.** Com `github` ativo, uma falha do GitHub vira erro real na UI. O selo "Dados de demonstração" (navbar, rodapé, ficha) aparece só quando a fonte é `mock` (a navbar/rodapé recebem `isDemo` do layout, que roda no servidor; a ficha usa `meta.isDemo`). Com `github` ativo, a seção de personas de demonstração da landing é escondida, porque ela só existe no mock.

## Endpoints e queries

### REST (`X-GitHub-Api-Version: 2022-11-28`, `Accept: application/vnd.github+json`, `User-Agent`)

| Chamada | Para quê |
|---|---|
| `GET /users/{login}` | `login` (com a capitalização oficial), nome, bio, local, empresa, `created_at`, `followers`, `public_repos`, `type`. 404 → perfil inexistente; `type != User` (organização) também. |
| `GET /users/{login}/repos?type=owner&sort=pushed&per_page=100&page=N` | **Só sem token (ou `repositoryTransport: "rest"`).** Repositórios próprios (forks incluídos e marcados), `stargazers_count`, `forks_count`. Paginado, no máximo 10 páginas (1.000 repos). |
| `GET /repos/{owner}/{repo}/languages` | bytes por linguagem. **Com token**, só como fallback por repositório (veja "Language collection optimization"). **Sem token**, uma chamada por repositório **próprio e não-fork**, no máximo 150 por perfil, com concorrência 6. |

### GraphQL (exige token)

**Repositórios + linguagens** (uma consulta por página de 50 repositórios; detalhes em "Language collection optimization") e **contribuições**.

Contribuições: uma consulta por lote de até **5 anos**, usando aliases (`y2024: contributionsCollection(from:, to:)`). **Todo ano civil, do ano de criação da conta até o atual, é pedido**; `contributionYears` não é consultado (veja "Code Review coverage validation").

```graphql
query ($login: String!) {
  user(login: $login) {
    y2026: contributionsCollection(from: "2026-01-01T00:00:00Z", to: "<agora>") {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
    # y2025, y2024, ... até o ano de criação (uma contributionsCollection por ano, no máximo 1 ano cada)
  }
}
```

As consultas geradas foram **validadas contra o schema público do GitHub** (`docs.github.com/public/fpt/schema.docs.graphql`, com o pacote `graphql`) em uma verificação manual; isso não faz parte da suíte (exigiria baixar 1,5 MB e uma dependência). Depois disso foram executadas contra a API real (veja "Limitações").

### Por que REST + GraphQL

- **REST** para o perfil (`/users/{login}`: capitalização oficial, `type`, `public_repos`) e como caminho anônimo (sem token) para repositórios e linguagens.
- **GraphQL** onde o REST não alcança ou custa muito: totais e calendário de contribuições **por ano** (com aliases, 5 anos em 1 requisição) e, com token, **repositórios + linguagens em lote** (50 repositórios por requisição, em vez de 1 requisição `/languages` por repositório).

## Cobertura (`full` / `partial` / `unavailable`)

`full` não significa "a chamada deu 200". Significa que o número representa o que o modelo pede, **segundo a definição abaixo**.

| Métrica | Fonte | `full` quando | `partial` quando | `unavailable` quando |
|---|---|---|---|---|
| `commits` | soma de `totalCommitContributions` de todos os anos | todos os anos civis da conta foram lidos | a conta tem mais de 25 anos (impossível hoje) | sem token |
| `pullRequests` | `totalPullRequestContributions` | idem | idem | sem token |
| `issues` | `totalIssueContributions` | idem | idem | sem token |
| `reviews` | `totalPullRequestReviewContributions` | idem (regra e evidências em "Code Review coverage validation") | idem | sem token |
| `followers` | `GET /users/{login}` | sempre | nunca | nunca |
| `ownRepositories`, `starsReceived`, `forksReceived`, `starredRepositories` | lista de repos (sem forks) | a lista veio inteira e bate com `public_repos` | lista truncada (1.000+ repos) ou menor que `public_repos` | nunca |
| `languages` | GraphQL `languages` (com token) ou `/languages` (sem token) dos repos próprios | todos os repos próprios foram lidos **e** a lista de repos está `full` | mais de 150 repos precisaram de fallback REST (ou, sem token, mais de 150 repos), ou um repo respondeu 404/409/451, ou a lista de repos está `partial` | nunca |
| `activeDays`, `longestStreak`, `currentStreak` | calendário de contribuições | todos os anos lidos | idem commits | sem token |
| `recentActiveDays` | calendário, últimos 365 dias | sempre que há token (os anos mais recentes são lidos primeiro) | nunca | sem token |
| série mensal | calendário | todos os anos lidos | idem commits | sem token |

`languagesCoverage` é um campo **opcional novo** em `RawGitHubData` (o contrato anterior só tinha `repositories.coverage`). Quando ausente (mock), vale o valor de `repositories.coverage`: os mocks e os snapshots de balanceamento não mudam. Ele existe para que um perfil com 200 repositórios mantenha stars/forks `full` mesmo que as linguagens fiquem `partial`. `normalize` usa o pior dos dois.

### O que o sistema chama de cada número

- **commits**: *contribuições públicas de commit* como o GitHub as conta no perfil (commits na branch padrão de repositórios, criados pela pessoa, com e-mail vinculado à conta). **Não** são todos os commits que a pessoa já fez: commits em outras branches, em forks (sem PR aceito) ou com e-mail não vinculado não entram. Soma por ano, em intervalos **disjuntos**, então nunca há contagem dupla. Commits privados **não** entram nos totais.
- **pullRequests / issues / reviews**: idem, campos separados do GraphQL, portanto PR nunca é contado como issue.
- **Atividade (dias ativos, sequências, série mensal)**: vem do calendário de contribuições, que conta todos os tipos de contribuição. O GitHub inclui contribuições privadas **anonimizadas** no calendário quando a própria pessoa ativou "Include private contributions on my profile"; é uma escolha pública dela. Por isso `activeDays` pode ser maior que a soma dos totais tipados.
- **Sequência atual**: dias consecutivos terminando hoje; se hoje ainda não teve contribuição, a sequência continua viva pelo dia anterior. Datas são as do calendário do GitHub, comparadas como dias UTC (um desvio de fuso de ±1 dia na borda é possível).
- **Janela recente**: 365 dias terminando no dia de referência (inclusive), igual à constante do engine (um teste garante a igualdade).

Toda essa lógica pura (`computeLongestStreak`, `computeCurrentStreak`, `summarizeActivity`) está em [contributionStats.ts](src/data/github/contributionStats.ts), testada para: nenhum dia, 1 dia, sequência contínua, quebra, várias sequências, virada de ano e ano bissexto.

### Sem token

REST anônimo funciona e entrega repositórios, stars, forks, seguidores e linguagens reais. Commits, PRs, issues, reviews e toda a atividade ficam **`unavailable`** (o GraphQL não aceita requisições anônimas), e o engine trata isso como sempre tratou: nada inventado. Um perfil sem token é bem mais pobre; serve para desenvolvimento casual (60 req/h por IP).

## Code Review coverage validation

Pergunta: `totalPullRequestReviewContributions` representa **todo o histórico público** de reviews, a ponto de `reviews` poder ser `full`? Resposta curta: **sim, no sentido definido abaixo** (a contagem do GitHub, sem truncamento, ano a ano), com três ressalvas de **definição** que não são lacunas de histórico.

### Fonte e como reviews são contadas

- Fonte: GraphQL `user.contributionsCollection(from, to).totalPullRequestReviewContributions`, uma janela por **ano civil** (UTC, `01-01T00:00:00Z` a `12-31T23:59:59Z`; o ano corrente termina em "agora"), do ano de criação da conta ao ano atual. A API recusa janelas maiores que 1 ano (`The total time spanned by 'from' and 'to' must not exceed 1 year`, verificado). Janelas explícitas são respeitadas ao segundo (`startedAt`/`endedAt` devolvidos idênticos aos pedidos), então anos consecutivos são **disjuntos e sem lacuna**.
- O número é a soma dos anos (`assessReviews()` em [reviewCoverage.ts](src/data/github/reviewCoverage.ts), usado por `assemble.ts`). Nada de `reviews` vem do calendário, de comentários, de PRs criados, de issues nem de review requests: são campos GraphQL separados.
- **Uma contribuição por PR distinto revisado dentro da janela** (não por review submetida). Evidência: paginando todos os nós de um ano, `nós == IDs de review distintos == PRs distintos == total`; e, para o mesmo ano, a soma dos 12 meses é **maior** que o total anual (`mcollina` 2023: 2.016 no ano × 2.094 nos meses; `gaearon` 2017: 686 × 727), porque um PR revisado em dois meses conta nos dois. A união dos PRs dos 12 meses de `gaearon` 2017 é exatamente o conjunto do ano (686). A janela de 1 ano (o máximo permitido) é o agrupamento que mais se aproxima de "PRs distintos".

### Evidências (API real, token somente-leitura, 05/10/2026)

Comando: `npm run github:reviews -- <usuario> [--verify] [--audit]` (manual, fora da suíte e do CI). `--verify` compara, ano a ano, o total com `pullRequestReviewContributions.totalCount` (a conexão paginável), confere o review mais antigo e roda o `GitHubApiDataSource` completo para checar que ele concorda com a fatia de reviews. `--audit` pagina **todos** os reviews (1 requisição por 100) para medir reviews em PR próprio e PRs contados em 2+ anos.

| Perfil (papel no teste) | Criado | Reviews | Anos lidos | Coverage | Requisições (REST + GraphQL) | Duração |
|---|---|---:|---:|---|---|---:|
| `JonathanNwokolo` (conta do projeto, sem reviews) | 2025 | 0 | 2 | full | 1 + 1 | 0,9 s |
| `torvalds` (antigo, atividade longa, poucos reviews) | 2011 | 27 | 16 | full | 1 + 4 | 1,6 s |
| `rwaldron` (antigo, 2008) | 2008 | 1.420 | 19 | full | 1 + 4 | 3,8 s |
| `sebmarkbage` (muitos reviews) | 2009 | 2.042 | 18 | full | 1 + 4 | 3,6 s |
| `gaearon` (muitos reviews, longo) | 2011 | 3.669 | 16 | full | 1 + 4 | 5,0 s |
| `mcollina` (o maior testado) | 2009 | 19.969 | 18 | full | 1 + 4 | 9,1-9,6 s |
| `yumiaura` (conta nova, reviews recentes) | 2025 | 29 | 2 | full | 1 + 1 | 1,2 s |

Reviews por ano (em **todos** os anos de **todos** os perfis verificados a soma bate com o total da conexão; nenhuma divergência):

| Ano | torvalds | sebmarkbage | gaearon | yumiaura |
|---|---:|---:|---:|---:|
| 2009-2015 | 0 | 0 | 0 | - |
| 2016 | 0 | 91 | 162 | - |
| 2017 | 0 | 269 | 686 | - |
| 2018 | 3 | 242 | 687 | - |
| 2019 | 1 | 188 | 263 | - |
| 2020 | 6 | 181 | 388 | - |
| 2021 | 6 | 68 | 217 | - |
| 2022 | 7 | 174 | 192 | - |
| 2023 | 1 | 220 | 197 | - |
| 2024 | 1 | 348 | 753 | - |
| 2025 | 0 | 253 | 84 | 13 |
| 2026 | 2 | 8 | 40 | 16 |
| **Soma** | **27** | **2.042** | **3.669** | **29** |

1. **Anos antigos retornam dados; não há lacuna inesperada.** Dos 44 perfis consultados com reviews anteriores a 2025 (maintainers de Node.js, React, Rails, Next.js...), o review mais antigo é **2016-09-14**, o lançamento dos *pull request reviews* no GitHub; nenhum é anterior. Zeros antes disso são reais, não buracos (o script avisa se algum review for anterior a essa data).
2. **Sem truncamento:** `totalPullRequestReviewContributions == pullRequestReviewContributions.totalCount` em todos os anos, até 2.745 reviews em um único ano.
3. **Privados nunca entram nos totais:** `restrictedContributionsCount` vem à parte (ex.: `JonathanNwokolo` em 2026: 344 contribuições privadas, 0 reviews públicos). O token deve ser somente-público de qualquer forma.
4. **`contributionYears` inclui anos só com reviews?** **Não foi possível provar diretamente:** nenhum dos 43 perfis em que isso foi procurado tem um ano com reviews e sem commit/PR/issue. O que se observou: `contributionYears` lista **todo ano desde a criação da conta, inclusive anos vazios** (40 contas aleatórias: 320 anos vazios listados, 0 omitidos; nos 46 perfis comparados, 0 exceções). Por isso **o código deixou de depender dessa lista**: lê todo ano civil de `created_at` ao ano atual (mesmo número de requisições, `ceil(anos/5)`). "Full" não herda uma suposição sobre uma lista que não controlamos.
5. **Comparação independente (Search API `type:pr reviewed-by:X -author:X`):** descontados os reviews em PR próprio, as contribuições ficam entre -4,2% e +0,2% do Search nos perfis com milhares de reviews (`gaearon` 3.261 × 3.403, -4,2%; `sebmarkbage` 1.705 × 1.760, -3,1%; `sindresorhus` 4.550 × 4.543, +0,2%; `torvalds` 25 × 27). Em `gaearon`, dos 245 PRs criados em 2019 que o Search aponta, 229 (93,5%) estão nas contribuições. **O resíduo não foi explicado** (o GitHub não documenta); é a única evidência de que a API pode omitir alguns reviews que o Search enxerga.
6. **Auditoria (`--audit`)** do que o número inclui além de "reviews em PRs de outras pessoas":

| Perfil | Contribuições | PRs distintos | Em PR próprio | Contados em 2+ anos |
|---|---:|---:|---:|---:|
| `torvalds` | 27 | 27 | 2 (7,4%) | 0 |
| `sebmarkbage` | 2.042 | 2.034 | 329 (16,1%) | 8 (0,4%) |
| `gaearon` | 3.669 | 3.644 | 384 (10,5%) | 25 (0,7%) |
| `sindresorhus` | 4.780 | 4.679 | 129 (2,7%) | 101 (2,1%) |
| `yumiaura` | 29 | 29 | 11 (37,9%) | 0 |

(`sindresorhus` foi auditado com uma sonda equivalente ao `--audit`; os demais, pelo próprio script.)

### Regra final de cobertura

| Coverage | Quando |
|---|---|
| `full` | há token **e** todo ano civil de `created_at` ao ano atual foi lido (uma janela disjunta de 1 ano cada). Não depende de `contributionYears`. Zero reviews com todos os anos lidos é `full` com valor 0. |
| `partial` | algum ano da conta **não** foi lido (hoje só se a conta tiver mais de 25 anos): o valor é um piso. |
| `unavailable` | sem token (`value: null`; o GraphQL não aceita acesso anônimo). |

Uma falha de requisição (timeout, rate limit, erro GraphQL, resposta fora do formato) **não vira `partial`**: é erro tipado e o perfil inteiro falha, como no resto da camada ("sem fallback silencioso"). Ou o perfil foi lido por inteiro, ou é um erro.

### Decisão

`reviews` **permanece `full`** nas condições acima: o histórico é completo e sem truncamento *para o que o GitHub chama de review contribution*, e não há evidência de que anos antigos sejam subestimados. `reviews.value` e o Game Engine não mudaram; a mudança na Data Layer foi ler todo ano da conta (em vez de confiar em `contributionYears`) e tornar a regra de cobertura explícita e testada.

### Limitações restantes (definição, não cobertura)

- **Reviews em PR próprio contam** (2,7% a 37,9% nos perfis auditados; são reviews de comentário que a pessoa deixa no próprio PR). Não dá para excluí-los sem paginar todos os nós (1 requisição por 100 reviews; `mcollina` custaria ~200). O número é **superestimado** em relação a "reviews em PRs de outras pessoas". No XP isso é pequeno (escala logarítmica: +10% em reviews move ~1,4% do `reviewScore`, que pesa 15-20%), mas as conquistas `reviews-10/50/200` desbloqueiam ao atingir o alvo: quem tem poucos reviews, quase todos no próprio PR, pode desbloquear "Olhar Atento" sem ter revisado ninguém.
- **Um PR revisado em dois anos civis conta nos dois** (0 a 2,1%).
- **O GitHub pode omitir parte dos reviews que o Search vê** (0 a ~7% nos perfis testados; causa não documentada).
- Reviews em repositórios privados não entram (por desenho).
- **Latência:** o lote de 5 anos de um contribuidor muito ativo (`mcollina`) levou 7,9-9,4 s contra um timeout de 10 s (≈2,5 s por ano). É risco de `GitHubTimeoutError` (504) para os maiores perfis; não é problema de cobertura e **não foi alterado** nesta etapa (`CONTRIBUTION_YEARS_PER_REQUEST` em [limits.ts](src/data/github/limits.ts)).
- Amostra: 47 perfis (a maioria de maintainers conhecidos, escolhidos por critério técnico, **não** são personas da UI) + 40 contas aleatórias para `contributionYears`.

## Cache, deduplicação e timeout

- **Cache** em memória do processo: TTL **15 min**, até 500 usernames (descarta o mais antigo), chave = username em minúsculas (`Torvalds` e `torvalds` são a mesma entrada). Perfis inexistentes (404) ficam 60 s em cache negativo. Erros (rate limit, timeout, 5xx) **não** são cacheados.
- **Deduplicação**: requisições simultâneas ao mesmo username compartilham **uma** busca externa (as outras aguardam a mesma promessa; se falhar, todas recebem o mesmo erro e a próxima tenta de novo).
- **Cache HTTP**: a rota responde `Cache-Control: public, s-maxage=900, stale-while-revalidate=300` em sucesso (CDN/proxy compartilhado) e `no-store` em erro.
- **Timeout**: 10 s por requisição externa (`AbortController`, inclui a leitura do corpo). Estouro → `GitHubTimeoutError`, sem retry.
- **Sem Redis, sem banco**. O cache é por instância: em serverless cada instância tem o seu. É suficiente para esta etapa; veja "Próximos passos".

## Paginação e concorrência

- Repositórios via GraphQL (com token): `first: 50` com `pageInfo.endCursor`/`hasNextPage`, limite de segurança de 20 páginas (1.000 repos). Até 150 repos públicos as páginas são **sequenciais** (cada `after` vem da página anterior); acima disso, um percurso só de cursores (`edges { cursor }`, 100 por chamada) libera as mesmas páginas de 50 para rodarem em paralelo (3 por vez), com as mesmas queries, a mesma ordem e a mesma cobertura (ver `docs/game-engine-v2/RATE_BUDGET_AND_SHARED_DISCOVERY.md`); repositório repetido entre páginas (push no meio da paginação) é contado uma vez; `hasNextPage` sem cursor encerra a leitura e marca `partial`.
- Repositórios via REST (sem token): `per_page=100`, páginas **sequenciais** pedidas por número (nunca seguindo URLs vindas da resposta), limite de 10 páginas; `Link: rel="next"` é a fonte da verdade (fallback: página cheia).
- `/languages` (REST sem token, ou fallback do GraphQL): concorrência **6** por perfil (`mapWithConcurrency`), teto de 150 repos por perfil, e um limitador global de **6 requisições simultâneas por instância** no cliente HTTP (vale entre perfis diferentes).
- Anos de contribuição: lotes de 5 anos, concorrência 3.
- Repositórios/linguagens e contribuições rodam em paralelo; se um falha, o `AbortSignal` cancela o outro (não ficam requisições órfãs gastando limite).

## Rate limit

- Cada resposta atualiza um *snapshot* de `x-ratelimit-limit/remaining/reset`. Se uma resposta bem-sucedida informa `remaining: 0`, o cliente **para de enviar** requisições daquele tipo (REST e GraphQL têm orçamentos separados) até `reset`.
- **Primário**: 403/429 com `x-ratelimit-remaining: 0` → `GitHubRateLimitError` (`limitKind: "primary"`, `resetAt`, `remaining`).
- **Secundário**: 403/429 com `Retry-After`, 429 sem cabeçalhos, ou mensagem "secondary rate limit" → `limitKind: "secondary"`, `resetAt = agora + Retry-After` (padrão 60 s).
- Depois de um rate limit, as chamadas seguintes **falham imediatamente, sem tocar a rede** (portanto nenhum refetch em loop) até `resetAt`. GraphQL `RATE_LIMITED` (HTTP 200 com `errors`) segue a mesma regra.
- **Nenhum retry** em rate limit nem em timeout. Único retry: **1** tentativa, após 500 ms fixos, para erro de rede e 502/503/504. Cada tentativa conta nas estatísticas.
- A API devolve 429, `Retry-After` quando `resetAt` é conhecido e `{ error: { code: "rate_limited", message: "Limite temporário da API do GitHub atingido. Tente novamente mais tarde.", retryAfterSeconds } }`. Nada de headers do GitHub.

## Erros

| Erro | HTTP | `code` |
|---|---|---|
| `InvalidUsernameError` (antes de qualquer requisição) | 400 | `invalid_username` |
| `ProfileNotFoundError` | 404 | `not_found` |
| `GitHubRateLimitError` | 429 (+ `Retry-After`) | `rate_limited` |
| `GitHubUnavailableError` 5xx/422/... do GitHub | 502 | `github_unavailable` |
| `GitHubUnavailableError` rede, 401 (token inválido), 403 (sem permissão) | 503 | `github_unavailable` (detalhe só no log do servidor) |
| `GitHubTimeoutError` | 504 | `timeout` |
| `GitHubDataValidationError` / `ZodError` (resposta fora do formato) | 502 | `invalid_data` |
| `DataSourceConfigError` | 500 | `misconfigured` |
| qualquer outro | 500 | `internal` (mensagem genérica; log só com o nome do erro) |

O username é validado antes de formar qualquer URL: 1-39 caracteres, letras/números/hífens simples, sem hífen no início ou fim. Entradas como `../x`, `a?b`, `a%2Fb` são rejeitadas com 400.

## Instrumentação (interna)

Cada `getProfile` gera um `ProfileFetchReport`: `cache` (`hit` / `miss` / `coalesced` / `not-found-hit`), requisições REST, GraphQL e total (cada tentativa conta), duração e se estava autenticado. Ficam em memória (últimos 50, `getReports()`), aparecem em uma linha de log **somente em desenvolvimento** (`[github] torvalds cache=miss rest=11 graphql=0 1003ms ok`) e no `npm run github:smoke`. Nada é enviado a lugar algum nem mostrado ao usuário.

## Estimativa de requisições por perfil

Com token (caminho padrão): `REST = 1 (usuário) + fallbacks de linguagem (normalmente 0)`; `GraphQL = ceil(repos/50) (repositórios + linguagens) + ceil(anos/5) (contribuições)`.

| Perfil | REST | GraphQL | Total |
|---|---|---|---|
| Pequeno (5 repos próprios, conta de 2 anos) | 1 | 2 | **3** |
| Médio (30 repos, 1 ano de conta) — medido: `JonathanNwokolo` | 1 | 2 | **3** (eram 29) |
| Médio (12 repos, 20 anos) — medido: `torvalds` | 1–2 | 5 | **6–7** (eram 15) |
| Grande (198 repos, ~12 anos) — medido: `yyx990803` | 1 | 8 | **9** (eram 82) |
| Muitos repos (1.000 repos, 15 anos) | 1 | 20 + 3 | **~24** (antes ~157, com languages `partial`) |
| Anônimo (sem token, REST) | `1 + ceil(repos/100) + repos próprios (≤150)` | 0 | medido: `torvalds` = 11 |

Com 5.000 pontos/h de GraphQL (1 ponto por página de repositórios) e 5.000 req/h de REST, cabem centenas de perfis médios por hora **sem cache**. Veja "Language collection optimization".

## Language collection optimization

**Problema.** As linguagens custavam 1 requisição REST `/languages` por repositório: `JonathanNwokolo` (26 repos próprios) gastava 29 requisições (28 REST + 1 GraphQL), e um perfil com 150+ repos passava de 150.

### O que o engine precisa (e o que foi preservado)

`normalizeDeveloperProfile` soma, sobre os repositórios **próprios e não-fork**, `bytes` por linguagem e conta em quantos repositórios cada linguagem aparece (`bytes > 0`). O engine (`analyzeLanguages`) só usa isso: **participação** (`bytes / total`), **presença em repos** (`repoCount`) e **volume relativo** (ordem e relevância por `bytes`). Logo, `primaryLanguage` **não** serve de substituto: seria 1 linguagem por repo, sem bytes. A otimização entrega exatamente o mesmo `Record<linguagem, bytes>` por repositório que o `/languages` entregava.

### Estratégia anterior

| Passo | Requisições |
|---|---|
| `GET /users/{login}` | 1 |
| `GET /users/{login}/repos` (100 por página) | `ceil(repos/100)` |
| `GET /repos/{owner}/{repo}/languages`, um por repo próprio (≤150) | 1 por repo |
| GraphQL de contribuições | `ceil(anos/5)` |

### Estratégia nova (com token)

| Passo | Requisições |
|---|---|
| `GET /users/{login}` (REST; inalterado: `type`, capitalização oficial, `public_repos`) | 1 |
| **GraphQL `user.repositories`** com `languages { totalCount edges { size node { name } } }`, **50 repos por página**, cursor (`pageInfo.endCursor`) | `ceil(repos/50)` |
| Fallback REST `/languages` só para repos cujas linguagens o GraphQL não devolveu por inteiro | normalmente 0 |
| GraphQL de contribuições (inalterado) | `ceil(anos/5)` |

- **Investigação.** O GraphQL do GitHub entrega, em lote: repositórios próprios (`ownerAffiliations: OWNER`, `privacy: PUBLIC`, `orderBy: PUSHED_AT DESC`, mesma seleção e ordem do REST `type=owner&sort=pushed`), `isFork`, `stargazerCount`, `forkCount` e **`languages(first:, orderBy: SIZE)` com `size` em bytes**, equivalente ao `/languages`. Verificado ao vivo: bytes idênticos aos do REST em todos os repositórios dos 3 perfis testados.
- **Custo no limite de GraphQL:** 1 ponto por página (medido via `rateLimit.cost`; `nodeCount` ≈ 1.550 por página, bem abaixo do teto de 500.000).
- **Tamanho de página:** 50, não 100. A latência cresce linearmente com a página (medido: ~5,4 s para 100 repos com linguagens, ~3 s para 50), e o timeout é de 10 s por requisição.
- **Fallback híbrido (determinístico):** um repo **não-fork** cujo `languages` veio `null` ou com `totalCount` maior que as 30 linguagens pedidas é lido por `GET /repos/{owner}/{repo}/languages`, **na ordem da lista** (push mais recente primeiro), **no máximo 150 por perfil**. Os que passarem do teto ou falharem (404/409/451) marcam `languagesCoverage = partial`. Medido: o `linux` (25 linguagens) cabe nas 30 e não precisa de fallback; com o limite anterior (20) ele disparava 1 chamada REST.
- **Sem token** nada muda: continua o caminho REST anônimo (usuário + repos + `/languages`). Também pode ser forçado com `repositoryTransport: "rest"` (e `npm run github:smoke -- <user> --rest`), útil para comparar.
- **Erros não viram REST silenciosamente:** rate limit, timeout ou payload inválido do GraphQL propagam como erro tipado; o fallback é só por repositório, nunca "se o GraphQL falhar, refaz tudo".

### Coverage

| Dado | `full` quando | `partial` quando |
|---|---|---|
| lista de repos (`stars`, `forks`, `ownRepositories`) | toda a lista foi lida e bate com `public_repos` | passou de 20 páginas (1.000 repos), `hasNextPage` sem cursor, ou lista menor que `public_repos` |
| `languages` (participação, presença, volume) | todo repo próprio teve as linguagens lidas por inteiro (GraphQL, ou fallback REST) **e** a lista está `full` | algum repo ficou sem linguagens (fallback acima de 150, ou 404/409/451) ou a lista está `partial` |

Nenhum dos três (participação, presença, volume) é aproximado: ou vem exato, ou o perfil inteiro de linguagens vira `partial` e o engine já trata isso (`Skill` e conquistas seguem a mesma regra de `partial` de antes).

### Requisições antes × depois (medido ao vivo, com token)

| Perfil | Antes | Depois | REST depois | GraphQL depois |
|---|---|---|---|---|
| `JonathanNwokolo` (30 repos, 27 próprios) | 29 (28 REST + 1 GraphQL) | **3** | 1 | 2 |
| `torvalds` (12 repos, 20 anos) | 15 (11 REST + 4 GraphQL) | **6** | 1 | 5 |
| `yyx990803` (198 repos) | 82 (78 REST + 4 GraphQL) | **9** | 1 | 8 |

Os dados resultantes (repositórios, bytes por linguagem, stars, forks, linguagens normalizadas e o personagem completo) foram **idênticos** entre as duas estratégias nos três perfis, rodando uma logo após a outra.

### Correção encontrada no caminho

O caminho REST antigo pulava `/languages` para repositórios com `size == 0`, supondo "repositório vazio". Mas o `size` do REST **atrasa** depois de um push: o `GitHubRPG` (criado e enviado no mesmo dia) aparecia com `size: 0` e `/languages` já respondia `TypeScript 419618 / CSS 1324 / JavaScript 1284`. Resultado: o REST perdia essas linguagens **e ainda dizia `full`**. O GraphQL não depende de `size`, então já lê certo; o filtro foi removido do caminho REST também (custo: 1 chamada a mais por repositório realmente vazio). Efeito visível: o personagem de `JonathanNwokolo` mudou em relação à linha de base anterior (TypeScript 54,2% → 58,2% e L9 → L10, versatilidade 51 → 50), **porque os dados passaram a estar corretos**, não por causa do GraphQL; nível, XP, classe, subclasse, conquistas e títulos permaneceram iguais.

### Limitações

- **Tempo de relógio em perfis grandes:** até 150 repos as páginas são sequenciais (cursor); acima disso elas rodam em paralelo limitado (percurso de cursores à frente), o que levou `sindresorhus` (1.000 repos) de ~62 s para ~31 s. Antes disso: `yyx990803` (198 repos): ~9–12 s com GraphQL contra ~7 s com REST, apesar de 9 contra 82 requisições. Perfis de até 50 repos não pioram (1 página). O cache de 15 min mitiga; o timeout é por requisição (10 s), não por perfil, mas um host serverless com limite de execução curto pode cortar perfis de 200+ repos.
- Mais de 1.000 repositórios: lista e linguagens `partial`.
- Repositórios com mais de 30 linguagens ou `languages: null`: fallback REST, limitado a 150 por perfil.
- Sem token: continua custando 1 requisição por repositório (limite 150, `partial` acima disso).
- O fallback e a paginação foram testados offline com um GitHub simulado; ao vivo, o fallback só foi exercitado indiretamente (o `linux` com limite 20) e a paginação com `yyx990803` (4 páginas).

## Limitações conhecidas

- **GraphQL executado ao vivo** com token (`npm run github:smoke`: contribuições e repositórios+linguagens; perfis `JonathanNwokolo`, `torvalds`, `yyx990803`). As consultas de contribuições foram originalmente validadas contra o schema público e uma API simulada; a de repositórios, contra a API real.
- **Reviews** (premissa verificada ao vivo): histórico completo e sem truncamento, mas com a definição do GitHub (inclui reviews em PR próprio, um PR revisado em dois anos conta nos dois, privados fora). Números em "Code Review coverage validation".
- **Contas muito ativas podem estourar o timeout de 10 s nas contribuições:** um lote de 5 anos de `mcollina` (~20 mil reviews, calendário denso) levou 7,9-9,4 s (≈2,5 s por ano). Nunca vira `partial`: é `GitHubTimeoutError` (504).
- **Commits ≠ todos os commits** (definição acima). É consistente com o que o GitHub mostra no perfil, mas é um piso do que a pessoa de fato commitou.
- **Cache por instância**: em ambiente com várias instâncias/serverless, cada uma busca por conta própria.
- **Sem token**, mais de 150 repositórios próprios: as linguagens dos demais não são lidas (`languages: partial`; os repos mais recentemente alterados têm prioridade). **Com token**, repositórios com mais de 30 linguagens ou com `languages` nulo vão para o fallback REST (máx. 150 por perfil; o excedente é `partial`). Mais de 1.000 repositórios: lista `partial`.
- Datas do calendário são tratadas como dias UTC; pode haver ±1 dia na borda por fuso. Contribuições anteriores ao mês de criação da conta são ignoradas na série mensal.
- A conta consultada com o token da mesma pessoa pode incluir contribuições privadas nos totais; use token somente-público.

## Histórico anual (Crônica do Desenvolvedor)

As requests de contribuições já retornam, por ano civil, commits, PRs, reviews, issues e o calendário diário. Antes só os totais eram guardados; agora `assembleRawProfile` também mantém `activity.yearly` (por ano: contribuições, commits, PRs, reviews, issues, dias ativos) e `activity.longestStreakPeriod` (início/fim da maior sequência). **Nenhuma request adicional** (testado: mesmas contagens). Sem token: `yearly = { years: [], coverage: "unavailable" }`. Consumido apenas pela Crônica; ver `CHRONICLE.md`.

## Próximos passos (para produção pública)

1. ~~Linguagens via GraphQL~~ **feito** (veja "Language collection optimization").
2. **Cache compartilhado** (ex.: Redis/KV) para que todas as instâncias dividam o resultado.
3. **GitHub App** no lugar do PAT: token de instalação com limites maiores e sem ligação a uma conta pessoal. Migração: trocar apenas a obtenção do token. `GitHubHttpClient` recebe `token` por construtor; um GitHub App passaria a gerar o *installation token* (JWT assinado com a chave privada → `POST /app/installations/{id}/access_tokens`, válido por 1 h) e renová-lo antes de expirar. O restante da camada (queries, cobertura, cache, erros) não muda.
4. Verificação ao vivo dos itens listados em "Limitações" e ajuste de cobertura se necessário.
