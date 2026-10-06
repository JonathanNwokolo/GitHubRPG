# Arquitetura do Game Engine V1 (ENGINE_ARCHITECTURE.md)

## Fluxo de dados

```
GitHubDataSource            src/data/contracts + datasource/MockDataSource
      ↓  getProfile(username)
RawGitHubData               src/data/contracts/index.ts
      ↓
validação (Zod)             src/data/schemas/index.ts      validateRawGitHubData()
      ↓
normalizeDeveloperProfile() src/data/normalize.ts
      ↓
DeveloperProfile            src/game/types/index.ts
      ↓
createRPGCharacter()        src/game/createCharacter.ts
      ↓
RPGCharacter                src/game/types/index.ts
      ↓
Frontend (só apresenta)     src/app, src/features, src/components
```

`src/data/loadCharacter.ts` encadeia as 5 etapas; é o único ponto que a UI chama. `createDataSource()` ([src/data/datasource/index.ts](src/data/datasource/index.ts)) é o **único** lugar que escolhe a fonte; hoje devolve `MockDataSource`.

## Arquivos

Adaptei à estrutura que já existia em vez de adotar a árvore sugerida (`game/xp.ts`, `data/schemas.ts`...). Os nomes mudam, as responsabilidades são as mesmas.

### `src/game/` (puro: sem React, DOM, rede, relógio, `Math.random`)

| Arquivo | Responsabilidade |
|---|---|
| `types/index.ts` | `DeveloperProfile` (entrada), `RPGCharacter` (saída), `DataCoverage`, `Metric` |
| `constants.ts` | **todos** os números de balanceamento |
| `math.ts` | `logNormalize`, `normalizedEntropy`, `clamp`, `floorTo/ceilTo`, `toStat` |
| `age.ts` | idade da conta pela data completa (aniversário exato) |
| `languages.ts` | agregação de linguagens, feita **uma vez** por personagem |
| `progression/xp.ts` | progression score, curva ^2,1, XP total |
| `progression/level.ts` | `xpThresholdForLevel`, nível por busca binária, tiers |
| `attributes/calculateAttributes.ts` | os 5 atributos |
| `classes/classMatrix.ts` | classe e subclasse |
| `skills/calculateSkills.ts` | skills de linguagem (nível 1–20) |
| `progress.ts` | regra única de progresso (cobertura full/partial/unavailable) |
| `achievements/achievementList.ts` | 31 conquistas + próximos marcos |
| `titles/titleList.ts` | títulos numéricos, combinações, título padrão |
| `resources.ts` | HP/MP |
| `createCharacter.ts` | orquestra tudo: `createRPGCharacter(profile)` |
| `engine.ts` | barrel público |

### `src/data/`

| Arquivo | Responsabilidade |
|---|---|
| `contracts/index.ts` | `RawGitHubData`, `GitHubDataSource`, `ProfileNotFoundError` |
| `schemas/index.ts` | schema Zod + `validateRawGitHubData` |
| `normalize.ts` | Raw → `DeveloperProfile` (forks fora, agregações, cobertura) |
| `datasource/MockDataSource.ts`, `datasource/index.ts` | mock e `createDataSource()` |
| `seed/` | FNV-1a, Mulberry32, gerador determinístico |
| `personas/index.ts` | rookie, veteran, polyglot, popular, empty (missing-dev = 404) |
| `loadCharacter.ts` | pipeline completo |

### Frontend

| Arquivo | Papel |
|---|---|
| `features/progress/progressView.ts` | traduz o progresso do engine em texto (tenho/meta/falta, "pelo menos X") |
| `features/progress/ProgressDetail.tsx`, `NextMilestones.tsx` | apresentação |
| `features/titles/TitlesPanel.tsx`, `equippedTitle.ts` | lista de títulos e escolha |
| `stores/useTitleStore.ts` | título equipado em `localStorage` (fora do engine) |

## Garantias (testadas)

`src/game/architecture.test.ts` varre os fontes e falha se o engine importar React/Next/UI/camada de dados, usar `Math.random`, `Date.now`, `new Date()` sem argumento, `fetch`, `localStorage`, DOM ou `any`. A UI não pode importar `MockDataSource` nem as personas.

Complexidade após a normalização: **O(linguagens + conquistas + títulos)**. Cada agregação (idade, linguagens, métricas de progresso) é calculada uma vez e reaproveitada. Um personagem é processado de forma independente: sem ranking, sem estado global.

**Determinismo:** o engine nunca lê o relógio. A "data de hoje" é `profile.referenceDate`, que vem de `RawGitHubData.fetchedAt`. O mock usa uma data fixa (`2026-10-01`), então o mesmo username gera sempre o mesmo personagem, em qualquer dia.

## Decisões (ambiguidades pequenas)

1. **Estrutura existente mantida** (ver acima). Testes ficam ao lado do código (`*.test.ts`), padrão do projeto, e não em `src/tests/`.
2. **Curva de nível:** `round(100·(level−1)^1,5)`, para Level 1 = 0 XP (detalhes em GAME_BALANCE.md).
3. **Subclasse ignora linguagens da mesma classe** da principal (TS + JS não vira "Mago/Mago").
4. **Métricas `unavailable` contam 0** em XP e atributos (sem reponderar pesos).
5. **Forks** não entram em repos, stars, forks nem linguagens. O mock inclui forks com números altos de propósito, para provar isso.
6. **Impacto** = média simples de stars e forks (50/50). Followers ref. 1.000 e repos-com-estrela ref. 50 (a spec não fixou).
7. **Atividade recente** soma no máximo 10% do espaço restante em Activity.
8. **Idade** exibida com 1 casa arredondada **para baixo** e `remaining` **para cima**, para uma meta bloqueada nunca parecer completa.
9. **Próximos marcos** excluem idade (não é "trabalhável"), 1 por categoria.
10. **Título padrão:** o mais alto da própria escada; combinações contam como topo de escada.
11. **Conteúdo do jogo** (nomes de conquistas/títulos/classes) é PT-BR; só o chrome da UI é traduzido (pt-BR/en).
12. **HP/MP** sempre cheios.
13. **Avatar procedural** saiu de `game/` para `features/character/avatar/` (é apresentação).

## Como trocar para a API real

1. Criar `src/data/datasource/GitHubApiDataSource.ts` com `readonly kind = "github"` e `getProfile(username): Promise<RawGitHubData>`.
2. Mapear REST/GraphQL para `RawGitHubData`: `createdAt`, `fetchedAt = new Date().toISOString()`, `isDemo: false`, contadores e `repositories.items` com `languages` em bytes. Para cada métrica, preencher `coverage` com honestidade (`full`, `partial` ou `unavailable`).
3. Lançar `ProfileNotFoundError` no 404.
4. Em `createDataSource()` trocar `new MockDataSource()` pela nova classe. **Mais nada muda**: a validação Zod, `normalizeDeveloperProfile`, o engine, os componentes e as regras de balanceamento ficam intactos; o selo "Dados de demonstração" some sozinho (`kind !== "mock"`).
5. Colocar cache/rate-limit na camada da API (o engine é puro e barato).
