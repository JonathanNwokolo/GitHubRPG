# Documentação de Mocks (MOCKS.md)

Tudo que o app mostra hoje vem de dados **simulados e determinísticos**. A UI exibe "Dados de demonstração" enquanto `createDataSource().kind === "mock"`.

## Inventário

| O quê | Onde | Substituído por |
|---|---|---|
| `MockDataSource` | `src/data/datasource/MockDataSource.ts` | `GitHubApiDataSource` (uma troca em `createDataSource()`) |
| Personas fixas | `src/data/personas/index.ts` | fixtures de teste (continuam existindo) |
| Gerador por hash do username | `src/data/seed/deterministicGenerator.ts` | descartado (ou fallback offline) |
| Data de referência fixa `2026-10-01` | `MOCK_REFERENCE_DATE` | `fetchedAt` = momento real da consulta |

## Determinismo

Sem `Math.random()` nem relógio. `username → FNV-1a → seed → Mulberry32`. O mesmo username dá o mesmo `RawGitHubData`, o mesmo personagem, a mesma classe, atributos e conquistas (testado em `src/data/seed/deterministic.test.ts`). A data de referência é fixa para a idade da conta não mudar com o tempo.

## Personas

| username | Cenário |
|---|---|
| `rookie-dev` | conta de 7 meses, 42 commits, 2 repos. Mago / Bardo |
| `veteran-dev` | conta de 11,4 anos (tem 1/3/5/10 anos, falta 15), Rust. **Commits com cobertura `partial`** |
| `polyglot-dev` | 6 linguagens relevantes e equilibradas. Mago / Alquimista |
| `popular-dev` | 437 stars (Farol dos Reinos 437/1.000), 4,2 anos de conta (Antigo Guardião 4,2/5), 3.200 seguidores |
| `empty-dev` | conta válida sem histórico. Level 1, Aventureiro |
| `missing-dev` | 404 (`ProfileNotFoundError`) |

Repositórios das personas incluem **forks com números altos** de propósito: eles não podem contar.

## O que o mock fabrica (e a API real terá de fornecer)

Série mensal de contribuições, dias ativos, maior sequência, sequência atual, dias ativos recentes, reviews, bytes por linguagem por repositório. Na API real, qualquer um desses que não puder ser obtido por completo deve ser marcado com `coverage: "partial"` ou `"unavailable"`, e a UI nunca afirma o que falta.

Removido do escopo V1 (e dos mocks): guildas, ranking, masmorras, buffs, duelos.
