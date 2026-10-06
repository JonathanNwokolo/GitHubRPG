# Documentação de Mocks (MOCKS.md)

O `MockDataSource` continua existindo **apenas para demonstração e testes**: é a fonte padrão em desenvolvimento (`GITHUB_DATA_SOURCE` ausente ou `mock`) e a usada pelos testes unitários e e2e. Com `GITHUB_DATA_SOURCE=github` ele **não** é usado e **nunca** é um fallback: se o GitHub falhar, o erro real é exibido. A UI exibe "Dados de demonstração" somente enquanto a fonte configurada no servidor é `mock` (a API real está descrita em [GITHUB_API_INTEGRATION.md](GITHUB_API_INTEGRATION.md)).

## Inventário

| O quê | Onde | Substituído por |
|---|---|---|
| `MockDataSource` | `src/data/datasource/MockDataSource.ts` | `GitHubApiDataSource` (`src/data/github/`), escolhido por `GITHUB_DATA_SOURCE=github`; o mock segue disponível para demo/teste |
| Personas fixas | `src/data/personas/index.ts` | fixtures de teste (continuam existindo) |
| Gerador por hash do username | `src/data/seed/deterministicGenerator.ts` | descartado (ou fallback offline) |
| Data de referência fixa `2026-10-01` | `MOCK_REFERENCE_DATE` | na API real, `fetchedAt` = momento real da consulta |

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

## O que o mock fabrica (e como a API real trata cada item)

Série mensal de contribuições, dias ativos, maior sequência, sequência atual, dias ativos recentes, reviews, bytes por linguagem por repositório. A API real (`GitHubApiDataSource`) marca como `partial` ou `unavailable` o que não consegue obter por completo, e a UI nunca afirma o que falta. Tabela de cobertura por métrica em [GITHUB_API_INTEGRATION.md](GITHUB_API_INTEGRATION.md).

Removido do escopo V1 (e dos mocks): guildas, ranking, masmorras, buffs, duelos.
