# BALANCE_REVIEW.md

> **Gerado por `npm run balance:review`** a partir do engine atual (`scripts/generateBalanceReview.ts`).
> Nenhum número daqui foi calculado à mão. Engine: **Balance V1.1** (baseline V1 preservado em `balance-snapshot-v1.json`; comparação em `BALANCE_V1_VS_V1_1.md`).
> A seção **Análise** (depois do marcador no fim do arquivo) é escrita à mão e preservada ao regerar.

Data de referência de todos os perfis: `2026-10-01` (fixa, sem relógio). Fixtures de stress: `src/data/fixtures/balanceFixtures.ts` (valores explícitos, sem seed).

## Perfis de stress

- **commit-heavy-dev** — Muitos commits, poucos PRs/reviews/repos/stars, baixa diversidade.
- **star-heavy-dev** — Commits moderados, poucos PRs/reviews/repos, muitas stars e forks recebidos.
- **old-inactive-dev** — Conta de ~13,5 anos, poucos commits/repos, quase nenhuma atividade recente.
- **new-very-active-dev** — Conta com <1 ano, muitos commits, vários PRs/reviews, atividade recente forte.
- **single-language-dev** — Quase só TypeScript (96/2/1/1), muitos commits e repos: Versatility deve ficar baixa.
- **balanced-polyglot-dev** — Mesmos números do single-language-dev, mas TS 40 / Python 30 / Go 20 / CSS 10.
- **collaboration-heavy-dev** — Commits moderados, muitos PRs, reviews e issues.
- **repo-heavy-dev** — 300 repos próprios com poucos commits cada, pouca colaboração e popularidade.
- **extreme-dev** — Números artificialmente altos (100k+ commits, 1.200 repos, 150k stars, 16 anos): clamps e retornos decrescentes.

### Fixtures de Consistency (V1.1)

Valores explícitos mês a mês, sem PRNG, fora de RESERVED_PERSONAS. Aparecem só na seção "Consistency: rajada × regularidade", na tabela mensal, nas invariantes e no snapshot.

- **burst-dev** — ~500 commits concentrados quase todos em 1 mês (450 de 540 contribuições), 4 meses ativos de 12.
- **steady-dev** — Mesmo volume do burst-dev (540), 45 contribuições por mês durante os 12 meses.
- **weekend-dev** — Recorrente nos 12 meses, mas em poucos dias (fins de semana: 96 dias ativos) e sem sequências longas.
- **inactive-returning-dev** — Histórico antigo (24 meses ativos em 2018-2019), 74 meses parado e retorno recente (últimos 8 meses).

Os perfis existentes (rookie, veteran, polyglot, popular, empty) são os mesmos de `src/data/personas`; `missing-dev` é o 404 e não tem personagem.

## Entradas (o que cada perfil tem)

Valores depois de validação e normalização (forks já excluídos de repos/stars/forks/linguagens).

| Profile | Age (y) | Commits | PRs | Reviews | Issues | Repos | Stars | Forks | Followers | Active days | Recent days | Languages (≥5%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| rookie-dev | 0.6 | 42 | 1 | 0 | 1 | 2 | 3 | 0 | 3 | 14 | 14 | 2 |
| veteran-dev | 11.4 | 6,840 | 412 | 530 | 210 | 58 | 2,300 | 410 | 245 | 1,800 | 190 | 3 |
| polyglot-dev | 6.2 | 2,300 | 140 | 60 | 55 | 31 | 85 | 21 | 64 | 640 | 120 | 5 |
| popular-dev | 4.2 | 1,100 | 60 | 25 | 40 | 24 | 437 | 96 | 3,200 | 510 | 140 | 3 |
| empty-dev | 0.1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| commit-heavy-dev | 5.6 | 20,000 | 15 | 3 | 5 | 4 | 8 | 1 | 12 | 1,400 | 220 | 1 |
| star-heavy-dev | 4.7 | 1,500 | 40 | 10 | 30 | 5 | 32,000 | 4,500 | 6,000 | 420 | 110 | 2 |
| old-inactive-dev | 13.5 | 600 | 12 | 2 | 8 | 9 | 40 | 8 | 25 | 180 | 4 | 2 |
| new-very-active-dev | 0.7 | 3,200 | 260 | 180 | 70 | 18 | 120 | 15 | 90 | 250 | 250 | 3 |
| single-language-dev | 7.3 | 8,000 | 120 | 40 | 30 | 20 | 150 | 25 | 80 | 1,100 | 160 | 1 |
| balanced-polyglot-dev | 7.3 | 8,000 | 120 | 40 | 30 | 20 | 150 | 25 | 80 | 1,100 | 160 | 4 |
| collaboration-heavy-dev | 6.4 | 2,000 | 900 | 1,100 | 700 | 14 | 220 | 60 | 300 | 900 | 170 | 2 |
| repo-heavy-dev | 5.7 | 700 | 8 | 0 | 4 | 300 | 15 | 3 | 10 | 260 | 60 | 4 |
| extreme-dev | 16.1 | 150,000 | 12,000 | 15,000 | 12,000 | 1,200 | 150,000 | 25,000 | 120,000 | 5,200 | 365 | 10 |

## Resultado principal

| Profile | Level | XP | Tier | Activity | Experience | Reputation | Versatility | Consistency | Class | Subclass |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| rookie-dev | 8 | 2,158 | Aventureiro | 26 | 10 | 12 | 28 | 39 | Mago | Bardo |
| veteran-dev | 82 | 73,102 | Elite | 93 | 82 | 89 | 40 | 92 | Guerreiro | Mago |
| polyglot-dev | 57 | 42,169 | Mestre | 78 | 60 | 54 | 66 | 88 | Mago | Alquimista |
| popular-dev | 47 | 32,135 | Veterano | 71 | 51 | 74 | 37 | 87 | Patrulheiro | Alquimista |
| empty-dev | 1 | 0 | Iniciante | 0 | 0 | 0 | 0 | 0 | Aventureiro | — |
| commit-heavy-dev | 40 | 24,386 | Veterano | 72 | 32 | 24 | 8 | 97 | Mago | — |
| star-heavy-dev | 44 | 28,274 | Veterano | 68 | 40 | 95 | 26 | 86 | Patrulheiro | Alquimista |
| old-inactive-dev | 28 | 14,697 | Experiente | 52 | 44 | 42 | 26 | 55 | Escriba | Mago |
| new-very-active-dev | 63 | 49,790 | Mestre | 83 | 56 | 55 | 39 | 82 | Mago | Alquimista |
| single-language-dev | 60 | 46,227 | Mestre | 83 | 57 | 58 | 8 | 96 | Mago | — |
| balanced-polyglot-dev | 60 | 46,227 | Mestre | 83 | 57 | 58 | 55 | 96 | Mago | Alquimista |
| collaboration-heavy-dev | 76 | 65,329 | Elite | 92 | 75 | 66 | 26 | 95 | Paladino | Sentinela |
| repo-heavy-dev | 30 | 15,862 | Experiente | 51 | 43 | 31 | 55 | 78 | Mago | Alquimista |
| extreme-dev | 99 | 97,015 | Ascendente | 100 | 100 | 100 | 100 | 100 | Guerreiro | Bardo |

## Skills (até 5 por perfil)

Formato: `linguagem — LVL — tier (participação nos bytes / repos que a contêm)`.

**rookie-dev**

```text
JavaScript — LVL 6 — Adepto (50.8% / 1 repos)
HTML — LVL 5 — Adepto (49.1% / 1 repos)
```

**veteran-dev**

```text
Rust — LVL 17 — Arquimestre (58.7% / 32 repos)
TypeScript — LVL 11 — Especialista (19.9% / 13 repos)
Python — LVL 9 — Especialista (13.7% / 7 repos)
Shell — LVL 5 — Adepto (4.4% / 3 repos)
```

**polyglot-dev**

```text
TypeScript — LVL 10 — Especialista (31.5% / 9 repos)
Python — LVL 10 — Especialista (27.7% / 8 repos)
Go — LVL 8 — Adepto (16.4% / 6 repos)
Rust — LVL 6 — Adepto (12.7% / 3 repos)
CSS — LVL 4 — Aprendiz (5.2% / 1 repos)
```

**popular-dev**

```text
Go — LVL 15 — Mestre (71.1% / 17 repos)
Python — LVL 7 — Adepto (19.3% / 4 repos)
Shell — LVL 5 — Adepto (6.8% / 2 repos)
```

**empty-dev**

```text
(sem skills)
```

**commit-heavy-dev**

```text
TypeScript — LVL 11 — Especialista (100% / 4 repos)
```

**star-heavy-dev**

```text
Go — LVL 9 — Especialista (73.7% / 3 repos)
Python — LVL 5 — Adepto (26.2% / 2 repos)
```

**old-inactive-dev**

```text
PHP — LVL 10 — Especialista (75% / 6 repos)
JavaScript — LVL 5 — Adepto (25% / 3 repos)
```

**new-very-active-dev**

```text
TypeScript — LVL 12 — Especialista (66.6% / 10 repos)
Python — LVL 7 — Adepto (22.2% / 5 repos)
Go — LVL 5 — Adepto (11.1% / 3 repos)
```

**single-language-dev**

```text
TypeScript — LVL 17 — Arquimestre (96% / 20 repos)
```

**balanced-polyglot-dev**

```text
TypeScript — LVL 10 — Especialista (40% / 8 repos)
Python — LVL 8 — Adepto (30% / 6 repos)
Go — LVL 7 — Adepto (20% / 4 repos)
CSS — LVL 5 — Adepto (10% / 2 repos)
```

**collaboration-heavy-dev**

```text
Java — LVL 12 — Especialista (72% / 8 repos)
Kotlin — LVL 6 — Adepto (24% / 4 repos)
Shell — LVL 3 — Aprendiz (4% / 2 repos)
```

**repo-heavy-dev**

```text
JavaScript — LVL 14 — Mestre (40% / 120 repos)
Python — LVL 13 — Mestre (30% / 90 repos)
HTML — LVL 11 — Especialista (20% / 60 repos)
Shell — LVL 10 — Especialista (10% / 30 repos)
```

**extreme-dev**

```text
C++ — LVL 14 — Mestre (10% / 120 repos)
CSS — LVL 14 — Mestre (10% / 120 repos)
Go — LVL 14 — Mestre (10% / 120 repos)
Java — LVL 14 — Mestre (10% / 120 repos)
Kotlin — LVL 14 — Mestre (10% / 120 repos)
```

## De onde vem o XP

Cada coluna é a contribuição do termo para o progression score, em **pontos percentuais** (já multiplicada pelo peso). A soma é o Score; o XP vem de Score^2.5 × 97,015 (XP do Level 99). Os termos foram recompostos a partir das constantes do engine e conferidos contra `calculateProgressionScore`: se divergirem, o gerador falha.

| Profile | Commits | PRs | Reviews | Issues | Repos | Stars+Forks | Score | Score^2.5 | % of max XP | Level |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| rookie-dev | 16.3 | 2.0 | 0.0 | 1.0 | 2.1 | 0.4 | 0.218 | 0.022 | 2.2% | 8 |
| veteran-dev | 38.4 | 17.4 | 13.6 | 7.7 | 7.7 | 4.5 | 0.893 | 0.754 | 75.4% | 82 |
| polyglot-dev | 33.6 | 14.3 | 8.9 | 5.8 | 6.5 | 2.4 | 0.717 | 0.435 | 43.5% | 57 |
| popular-dev | 30.4 | 11.9 | 7.1 | 5.4 | 6.1 | 3.4 | 0.643 | 0.331 | 33.1% | 47 |
| empty-dev | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.000 | 0.000 | 0.0% | 1 |
| commit-heavy-dev | 40.0 | 8.0 | 3.0 | 2.6 | 3.0 | 0.9 | 0.576 | 0.251 | 25.1% | 40 |
| star-heavy-dev | 31.8 | 10.8 | 5.2 | 5.0 | 3.4 | 5.0 | 0.611 | 0.291 | 29.1% | 44 |
| old-inactive-dev | 27.8 | 7.4 | 2.4 | 3.2 | 4.3 | 1.9 | 0.470 | 0.151 | 15.1% | 28 |
| new-very-active-dev | 35.1 | 16.1 | 11.3 | 6.2 | 5.6 | 2.4 | 0.766 | 0.513 | 51.3% | 63 |
| single-language-dev | 39.0 | 13.9 | 8.1 | 5.0 | 5.7 | 2.7 | 0.743 | 0.476 | 47.6% | 60 |
| balanced-polyglot-dev | 39.0 | 13.9 | 8.1 | 5.0 | 5.7 | 2.7 | 0.743 | 0.476 | 47.6% | 60 |
| collaboration-heavy-dev | 33.0 | 19.7 | 15.0 | 9.5 | 5.1 | 3.1 | 0.854 | 0.673 | 67.3% | 76 |
| repo-heavy-dev | 28.5 | 6.4 | 0.0 | 2.3 | 10.0 | 1.3 | 0.485 | 0.163 | 16.4% | 30 |
| extreme-dev | 40.0 | 20.0 | 15.0 | 10.0 | 10.0 | 5.0 | 1.000 | 1.000 | 100.0% | 99 |

## Conquistas, títulos e recursos

| Profile | Achievements | Titles | Default title | Skills | HP | MP |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| rookie-dev | 4/31 | 1/27 | Tecelão de Interfaces | 2 | 230 | 182 |
| veteran-dev | 25/31 | 15/27 | Lenda Celestial | 4 | 776 | 562 |
| polyglot-dev | 19/31 | 12/27 | Arcanista do Código | 6 | 624 | 509 |
| popular-dev | 14/31 | 10/27 | Explorador de Sistemas | 3 | 564 | 407 |
| empty-dev | 0/31 | 0/27 | — | 0 | 104 | 53 |
| commit-heavy-dev | 10/31 | 7/27 | Forjador Eterno | 1 | 518 | 330 |
| star-heavy-dev | 15/31 | 10/27 | Lenda Celestial | 2 | 528 | 370 |
| old-inactive-dev | 11/31 | 6/27 | Lenda dos Repositórios | 2 | 410 | 290 |
| new-very-active-dev | 15/31 | 10/27 | Arcanista do Código | 3 | 628 | 483 |
| single-language-dev | 16/31 | 11/27 | Mestre da Forja | 1 | 646 | 412 |
| balanced-polyglot-dev | 17/31 | 13/27 | Arcanista do Código | 4 | 646 | 506 |
| collaboration-heavy-dev | 21/31 | 11/27 | Campeão dos Reinos Abertos | 3 | 744 | 514 |
| repo-heavy-dev | 12/31 | 6/27 | Arcanista do Código | 4 | 462 | 352 |
| extreme-dev | 31/31 | 20/27 | Lenda Celestial | 10 | 896 | 747 |

## Conquistas

Total desbloqueado / disponível, por raridade. As conquistas são cumulativas e não dão XP.

| Profile | Total | Comum | Raro | Épico | Lendário |
| --- | ---: | ---: | ---: | ---: | ---: |
| rookie-dev | 4/31 | 4/9 | 0/8 | 0/8 | 0/6 |
| veteran-dev | 25/31 | 9/9 | 7/8 | 7/8 | 2/6 |
| polyglot-dev | 19/31 | 9/9 | 8/8 | 2/8 | 0/6 |
| popular-dev | 14/31 | 9/9 | 4/8 | 1/8 | 0/6 |
| empty-dev | 0/31 | 0/9 | 0/8 | 0/8 | 0/6 |
| commit-heavy-dev | 10/31 | 5/9 | 2/8 | 2/8 | 1/6 |
| star-heavy-dev | 15/31 | 9/9 | 4/8 | 1/8 | 1/6 |
| old-inactive-dev | 11/31 | 7/9 | 2/8 | 1/8 | 1/6 |
| new-very-active-dev | 15/31 | 8/9 | 5/8 | 2/8 | 0/6 |
| single-language-dev | 16/31 | 8/9 | 4/8 | 4/8 | 0/6 |
| balanced-polyglot-dev | 17/31 | 9/9 | 4/8 | 4/8 | 0/6 |
| collaboration-heavy-dev | 21/31 | 9/9 | 6/8 | 5/8 | 1/6 |
| repo-heavy-dev | 12/31 | 7/9 | 2/8 | 2/8 | 1/6 |
| extreme-dev | 31/31 | 9/9 | 8/8 | 8/8 | 6/6 |

Detalhe por perfil. Os próximos marcos seguem a regra do engine (`selectNextMilestones`: um por categoria, o mais próximo primeiro, idade excluída). "Faltam" só aparece com coverage `full`; com `partial` o engine só conhece um mínimo e não diz quanto falta.

**rookie-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Primeiro Encantamento (Comum) — Use 2 linguagens relevantes.
  Primeira Centelha (Comum) — Receba sua primeira estrela em um repositório próprio.
  Primeiro Aliado (Comum) — Abra seu primeiro pull request.
  Primeiro Repositório (Comum) — Publique seu primeiro repositório próprio.
Próximos marcos:
  Primeiros Golpes (Comum)
    42 / 100 commits — faltam 58 — coverage: full
  Explorador (Comum)
    2 / 5 repos — faltam 3 — coverage: full
  Poliglota (Raro)
    2 / 5 linguagens — faltam 3 — coverage: full
```

**veteran-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Farol dos Reinos (Lendário) — Receba 1.000 estrelas em seus repositórios.
  Lenda dos Repositórios (Lendário) — Conta no GitHub com 10 anos de história.
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Exterminador de Bugs (Épico) — Abra 200 issues.
  Guardião da Qualidade (Épico) — Participe de 200 code reviews.
Próximos marcos:
  Herói da Comunidade (Lendário)
    412 / 500 PRs — faltam 88 — coverage: full
  Forjador Incansável (Lendário)
    6,840 / 10,000 commits — valor mínimo observado, não dá para dizer quanto falta — coverage: partial
  Poliglota (Raro)
    3 / 5 linguagens — faltam 2 — coverage: full
```

**polyglot-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Campeão da Colaboração (Épico) — Abra 100 pull requests.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Poliglota (Raro) — Use 5 linguagens relevantes.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
  Caçador de Recompensas (Raro) — Abra 50 issues.
Próximos marcos:
  Constelação (Épico)
    85 / 100 stars — faltam 15 — coverage: full
  Mestre das Afinidades (Épico)
    5 / 8 linguagens — faltam 3 — coverage: full
  Construtor de Reinos (Épico)
    31 / 50 repos — faltam 19 — coverage: full
```

**popular-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
  Guardião Open Source (Raro) — Abra 25 pull requests.
  Código em Chamas (Raro) — Alcance 1.000 commits.
  Cronista do Código (Raro) — Conta no GitHub com 3 anos de história.
Próximos marcos:
  Senhor dos Repositórios (Raro)
    24 / 25 repos — faltam 1 — coverage: full
  Caçador de Recompensas (Raro)
    40 / 50 issues — faltam 10 — coverage: full
  Campeão da Colaboração (Épico)
    60 / 100 PRs — faltam 40 — coverage: full
```

**empty-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  (nenhuma)
Próximos marcos:
  Primeiro Repositório (Comum)
    0 / 1 repos — faltam 1 — coverage: full
  Primeiros Golpes (Comum)
    0 / 100 commits — faltam 100 — coverage: full
  Primeiro Aliado (Comum)
    0 / 1 PRs — faltam 1 — coverage: full
```

**commit-heavy-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Forjador Incansável (Lendário) — Alcance 10.000 commits.
  Tempestade de Código (Épico) — Alcance 5.000 commits.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Código em Chamas (Raro) — Alcance 1.000 commits.
  Cronista do Código (Raro) — Conta no GitHub com 3 anos de história.
Próximos marcos:
  Explorador (Comum)
    4 / 5 repos — faltam 1 — coverage: full
  Guardião Open Source (Raro)
    15 / 25 PRs — faltam 10 — coverage: full
  Caçador de Bugs (Comum)
    5 / 10 issues — faltam 5 — coverage: full
```

**star-heavy-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Farol dos Reinos (Lendário) — Receba 1.000 estrelas em seus repositórios.
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
  Guardião Open Source (Raro) — Abra 25 pull requests.
  Código em Chamas (Raro) — Alcance 1.000 commits.
Próximos marcos:
  Caçador de Recompensas (Raro)
    30 / 50 issues — faltam 20 — coverage: full
  Campeão da Colaboração (Épico)
    40 / 100 PRs — faltam 60 — coverage: full
  Poliglota (Raro)
    2 / 5 linguagens — faltam 3 — coverage: full
```

**old-inactive-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Lenda dos Repositórios (Lendário) — Conta no GitHub com 10 anos de história.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
  Cronista do Código (Raro) — Conta no GitHub com 3 anos de história.
  Primeiro Encantamento (Comum) — Use 2 linguagens relevantes.
Próximos marcos:
  Caçador de Bugs (Comum)
    8 / 10 issues — faltam 2 — coverage: full
  Código em Chamas (Raro)
    600 / 1,000 commits — faltam 400 — coverage: full
  Guardião Open Source (Raro)
    12 / 25 PRs — faltam 13 — coverage: full
```

**new-very-active-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Campeão da Colaboração (Épico) — Abra 100 pull requests.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
  Caçador de Recompensas (Raro) — Abra 50 issues.
  Vigia do Código (Raro) — Participe de 50 code reviews.
Próximos marcos:
  Guardião da Qualidade (Épico)
    180 / 200 reviews — faltam 20 — coverage: full
  Senhor dos Repositórios (Raro)
    18 / 25 repos — faltam 7 — coverage: full
  Tempestade de Código (Épico)
    3,200 / 5,000 commits — faltam 1,800 — coverage: full
```

**single-language-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Campeão da Colaboração (Épico) — Abra 100 pull requests.
  Tempestade de Código (Épico) — Alcance 5.000 commits.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
Próximos marcos:
  Senhor dos Repositórios (Raro)
    20 / 25 repos — faltam 5 — coverage: full
  Forjador Incansável (Lendário)
    8,000 / 10,000 commits — faltam 2,000 — coverage: full
  Vigia do Código (Raro)
    40 / 50 reviews — faltam 10 — coverage: full
```

**balanced-polyglot-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Campeão da Colaboração (Épico) — Abra 100 pull requests.
  Tempestade de Código (Épico) — Alcance 5.000 commits.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Brilho Crescente (Raro) — Receba 25 estrelas em seus repositórios.
Próximos marcos:
  Senhor dos Repositórios (Raro)
    20 / 25 repos — faltam 5 — coverage: full
  Forjador Incansável (Lendário)
    8,000 / 10,000 commits — faltam 2,000 — coverage: full
  Vigia do Código (Raro)
    40 / 50 reviews — faltam 10 — coverage: full
```

**collaboration-heavy-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Herói da Comunidade (Lendário) — Abra 500 pull requests.
  Constelação (Épico) — Receba 100 estrelas em seus repositórios.
  Exterminador de Bugs (Épico) — Abra 200 issues.
  Guardião da Qualidade (Épico) — Participe de 200 code reviews.
  Campeão da Colaboração (Épico) — Abra 100 pull requests.
Próximos marcos:
  Senhor dos Repositórios (Raro)
    14 / 25 repos — faltam 11 — coverage: full
  Tempestade de Código (Épico)
    2,000 / 5,000 commits — faltam 3,000 — coverage: full
  Poliglota (Raro)
    2 / 5 linguagens — faltam 3 — coverage: full
```

**repo-heavy-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Arquiteto de Mundos (Lendário) — Publique 100 repositórios próprios.
  Construtor de Reinos (Épico) — Publique 50 repositórios próprios.
  Antigo Guardião (Épico) — Conta no GitHub com 5 anos de história.
  Senhor dos Repositórios (Raro) — Publique 25 repositórios próprios.
  Cronista do Código (Raro) — Conta no GitHub com 3 anos de história.
Próximos marcos:
  Poliglota (Raro)
    4 / 5 linguagens — faltam 1 — coverage: full
  Código em Chamas (Raro)
    700 / 1,000 commits — faltam 300 — coverage: full
  Brilho Crescente (Raro)
    15 / 25 stars — faltam 10 — coverage: full
```

**extreme-dev**

```text
Desbloqueadas (até 5, as mais raras primeiro):
  Farol dos Reinos (Lendário) — Receba 1.000 estrelas em seus repositórios.
  Herói da Comunidade (Lendário) — Abra 500 pull requests.
  Forjador Incansável (Lendário) — Alcance 10.000 commits.
  Arquiteto de Mundos (Lendário) — Publique 100 repositórios próprios.
  Ancião do Código (Lendário) — Conta no GitHub com 15 anos de história.
Próximos marcos:
  (nenhum marco bloqueado)
```

## Títulos

Quantos títulos cada perfil desbloqueou, o título padrão, o título de combinação classe/subclasse e o próximo título quantitativo de cada categoria.

**rookie-dev** — 1/27 títulos · padrão: Tecelão de Interfaces

```text
Classe / subclasse: Mago / Bardo
Título de combinação: Tecelão de Interfaces
Próximos títulos quantitativos (um por categoria):
  Portador da Centelha — 3 / 10 stars — faltam 7 — coverage: full
  Forjador de Código — 42 / 500 commits — faltam 458 — coverage: full
  Aliado do Código — 1 / 10 PRs — faltam 9 — coverage: full
  Explorador Arcano — 2 / 3 linguagens — faltam 1 — coverage: full
  Cronista — 0.6 / 3 anos — faltam 2.4 — coverage: full
```

**veteran-dev** — 15/27 títulos · padrão: Lenda Celestial

```text
Classe / subclasse: Guerreiro / Mago
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Forjador Eterno — 6,840 / 10,000 commits — valor mínimo observado, não dá para dizer quanto falta — coverage: partial
  Campeão dos Reinos Abertos — 412 / 500 PRs — faltam 88 — coverage: full
  Poliglota das Runas — 3 / 5 linguagens — faltam 2 — coverage: full
  Ancião do Código — 11.3 / 15 anos — faltam 3.7 — coverage: full
```

**polyglot-dev** — 12/27 títulos · padrão: Arcanista do Código

```text
Classe / subclasse: Mago / Alquimista
Título de combinação: Arcanista do Código
Próximos títulos quantitativos (um por categoria):
  Senhor das Estrelas — 85 / 100 stars — faltam 15 — coverage: full
  Mestre da Forja — 2,300 / 5,000 commits — faltam 2,700 — coverage: full
  Campeão dos Reinos Abertos — 140 / 500 PRs — faltam 360 — coverage: full
  Mestre das Afinidades — 5 / 8 linguagens — faltam 3 — coverage: full
  Lenda dos Repositórios — 6.1 / 10 anos — faltam 3.9 — coverage: full
```

**popular-dev** — 10/27 títulos · padrão: Explorador de Sistemas

```text
Classe / subclasse: Patrulheiro / Alquimista
Título de combinação: Explorador de Sistemas
Próximos títulos quantitativos (um por categoria):
  Arauto das Constelações — 437 / 500 stars — faltam 63 — coverage: full
  Mestre da Forja — 1,100 / 5,000 commits — faltam 3,900 — coverage: full
  Guardião da Comunidade — 60 / 100 PRs — faltam 40 — coverage: full
  Poliglota das Runas — 3 / 5 linguagens — faltam 2 — coverage: full
  Guardião Ancestral — 4.2 / 5 anos — faltam 0.8 — coverage: full
```

**empty-dev** — 0/27 títulos · padrão: —

```text
Classe / subclasse: Aventureiro / —
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Portador da Centelha — 0 / 10 stars — faltam 10 — coverage: full
  Forjador de Código — 0 / 500 commits — faltam 500 — coverage: full
  Aliado do Código — 0 / 10 PRs — faltam 10 — coverage: full
  Explorador Arcano — 0 / 3 linguagens — faltam 3 — coverage: full
  Cronista — 0 / 3 anos — faltam 3 — coverage: full
```

**commit-heavy-dev** — 7/27 títulos · padrão: Forjador Eterno

```text
Classe / subclasse: Mago / —
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Portador da Centelha — 8 / 10 stars — faltam 2 — coverage: full
  Emissário Open Source — 15 / 50 PRs — faltam 35 — coverage: full
  Explorador Arcano — 1 / 3 linguagens — faltam 2 — coverage: full
  Lenda dos Repositórios — 5.5 / 10 anos — faltam 4.5 — coverage: full
```

**star-heavy-dev** — 10/27 títulos · padrão: Lenda Celestial

```text
Classe / subclasse: Patrulheiro / Alquimista
Título de combinação: Explorador de Sistemas
Próximos títulos quantitativos (um por categoria):
  Mestre da Forja — 1,500 / 5,000 commits — faltam 3,500 — coverage: full
  Emissário Open Source — 40 / 50 PRs — faltam 10 — coverage: full
  Explorador Arcano — 2 / 3 linguagens — faltam 1 — coverage: full
  Guardião Ancestral — 4.7 / 5 anos — faltam 0.3 — coverage: full
```

**old-inactive-dev** — 6/27 títulos · padrão: Lenda dos Repositórios

```text
Classe / subclasse: Escriba / Mago
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Caçador de Estrelas — 40 / 50 stars — faltam 10 — coverage: full
  Incansável — 600 / 1,000 commits — faltam 400 — coverage: full
  Emissário Open Source — 12 / 50 PRs — faltam 38 — coverage: full
  Explorador Arcano — 2 / 3 linguagens — faltam 1 — coverage: full
  Ancião do Código — 13.5 / 15 anos — faltam 1.5 — coverage: full
```

**new-very-active-dev** — 10/27 títulos · padrão: Arcanista do Código

```text
Classe / subclasse: Mago / Alquimista
Título de combinação: Arcanista do Código
Próximos títulos quantitativos (um por categoria):
  Arauto das Constelações — 120 / 500 stars — faltam 380 — coverage: full
  Mestre da Forja — 3,200 / 5,000 commits — faltam 1,800 — coverage: full
  Campeão dos Reinos Abertos — 260 / 500 PRs — faltam 240 — coverage: full
  Poliglota das Runas — 3 / 5 linguagens — faltam 2 — coverage: full
  Cronista — 0.7 / 3 anos — faltam 2.3 — coverage: full
```

**single-language-dev** — 11/27 títulos · padrão: Mestre da Forja

```text
Classe / subclasse: Mago / —
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Arauto das Constelações — 150 / 500 stars — faltam 350 — coverage: full
  Forjador Eterno — 8,000 / 10,000 commits — faltam 2,000 — coverage: full
  Campeão dos Reinos Abertos — 120 / 500 PRs — faltam 380 — coverage: full
  Explorador Arcano — 1 / 3 linguagens — faltam 2 — coverage: full
  Lenda dos Repositórios — 7.3 / 10 anos — faltam 2.7 — coverage: full
```

**balanced-polyglot-dev** — 13/27 títulos · padrão: Arcanista do Código

```text
Classe / subclasse: Mago / Alquimista
Título de combinação: Arcanista do Código
Próximos títulos quantitativos (um por categoria):
  Arauto das Constelações — 150 / 500 stars — faltam 350 — coverage: full
  Forjador Eterno — 8,000 / 10,000 commits — faltam 2,000 — coverage: full
  Campeão dos Reinos Abertos — 120 / 500 PRs — faltam 380 — coverage: full
  Poliglota das Runas — 4 / 5 linguagens — faltam 1 — coverage: full
  Lenda dos Repositórios — 7.3 / 10 anos — faltam 2.7 — coverage: full
```

**collaboration-heavy-dev** — 11/27 títulos · padrão: Campeão dos Reinos Abertos

```text
Classe / subclasse: Paladino / Sentinela
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  Arauto das Constelações — 220 / 500 stars — faltam 280 — coverage: full
  Mestre da Forja — 2,000 / 5,000 commits — faltam 3,000 — coverage: full
  Explorador Arcano — 2 / 3 linguagens — faltam 1 — coverage: full
  Lenda dos Repositórios — 6.4 / 10 anos — faltam 3.6 — coverage: full
```

**repo-heavy-dev** — 6/27 títulos · padrão: Arcanista do Código

```text
Classe / subclasse: Mago / Alquimista
Título de combinação: Arcanista do Código
Próximos títulos quantitativos (um por categoria):
  Caçador de Estrelas — 15 / 50 stars — faltam 35 — coverage: full
  Incansável — 700 / 1,000 commits — faltam 300 — coverage: full
  Aliado do Código — 8 / 10 PRs — faltam 2 — coverage: full
  Poliglota das Runas — 4 / 5 linguagens — faltam 1 — coverage: full
  Lenda dos Repositórios — 5.7 / 10 anos — faltam 4.3 — coverage: full
```

**extreme-dev** — 20/27 títulos · padrão: Lenda Celestial

```text
Classe / subclasse: Guerreiro / Bardo
Título de combinação: nenhum
Próximos títulos quantitativos (um por categoria):
  (todos os quantitativos desbloqueados)
```

### Subclasse e títulos de combinação

A subclasse exige que a linguagem tenha pelo menos 10% do uso relevante (`LANGUAGE_RULES.subclassShare`) e que a classe seja diferente da principal. Os 7 títulos de combinação são fixos por par classe + subclasse.

| Profile | Linguagens ≥5% | Linguagens ≥10% | Classe | Subclasse | Títulos de combinação |
| --- | ---: | ---: | --- | --- | ---: |
| rookie-dev | 2 | 2 | Mago | Bardo | 1/7 |
| veteran-dev | 3 | 3 | Guerreiro | Mago | 0/7 |
| polyglot-dev | 5 | 4 | Mago | Alquimista | 1/7 |
| popular-dev | 3 | 2 | Patrulheiro | Alquimista | 1/7 |
| empty-dev | 0 | 0 | Aventureiro | — | 0/7 |
| commit-heavy-dev | 1 | 1 | Mago | — | 0/7 |
| star-heavy-dev | 2 | 2 | Patrulheiro | Alquimista | 1/7 |
| old-inactive-dev | 2 | 2 | Escriba | Mago | 0/7 |
| new-very-active-dev | 3 | 3 | Mago | Alquimista | 1/7 |
| single-language-dev | 1 | 1 | Mago | — | 0/7 |
| balanced-polyglot-dev | 4 | 4 | Mago | Alquimista | 1/7 |
| collaboration-heavy-dev | 2 | 2 | Paladino | Sentinela | 0/7 |
| repo-heavy-dev | 4 | 4 | Mago | Alquimista | 1/7 |
| extreme-dev | 10 | 10 | Guerreiro | Bardo | 0/7 |

Títulos de combinação bloqueados no extreme-dev (a distribuição mais versátil que as fixtures têm):

- **Arcanista do Código** (Classe Mago + subclasse Alquimista)
- **Cavaleiro Rúnico** (Classe Mago + subclasse Guerreiro)
- **Tecelão de Interfaces** (Classe Mago + subclasse Bardo)
- **Ferreiro Arcano** (Classe Alquimista + subclasse Guerreiro)
- **Guardião Arcano** (Classe Paladino + subclasse Mago)
- **Explorador de Sistemas** (Classe Patrulheiro + subclasse Alquimista)
- **Ilusionista do Terminal** (Classe Ladino + subclasse Mago)

## Progressão de Level

Threshold = XP total para **alcançar** o Level. No Level 99 não existe próximo Level: aparece MAX LEVEL, sem restante nem threshold.

| Profile | Level | XP total | Threshold atual | Threshold próximo | XP restante | Progresso |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rookie-dev | 8 | 2,158 | 1,852 | 2,263 | 105 | 74.4% |
| veteran-dev | 82 | 73,102 | 72,900 | 74,254 | 1,152 | 14.9% |
| polyglot-dev | 57 | 42,169 | 41,907 | 43,034 | 865 | 23.2% |
| popular-dev | 47 | 32,135 | 31,199 | 32,222 | 87 | 91.4% |
| empty-dev | 1 | 0 | 0 | 100 | 100 | 0% |
| commit-heavy-dev | 40 | 24,386 | 24,355 | 25,298 | 912 | 3.2% |
| star-heavy-dev | 44 | 28,274 | 28,197 | 29,186 | 912 | 7.7% |
| old-inactive-dev | 28 | 14,697 | 14,030 | 14,816 | 119 | 84.8% |
| new-very-active-dev | 63 | 49,790 | 48,819 | 50,005 | 215 | 81.8% |
| single-language-dev | 60 | 46,227 | 45,319 | 46,476 | 249 | 78.4% |
| balanced-polyglot-dev | 60 | 46,227 | 45,319 | 46,476 | 249 | 78.4% |
| collaboration-heavy-dev | 76 | 65,329 | 64,952 | 66,255 | 926 | 28.9% |
| repo-heavy-dev | 30 | 15,862 | 15,617 | 16,432 | 570 | 30% |
| extreme-dev | 99 | 97,015 | 97,015 | MAX LEVEL | — | MAX LEVEL |

- Perfis com Level ≥ 90: **1** de 14 (extreme-dev 99).
- Perfis no Level 99: **1** (extreme-dev 99).
- Maior Level sem contar o extreme-dev: **veteran-dev (82)**.

### Score necessário por Level

O XP vem de Score^2.5 × 97,015. Esta tabela inverte a curva do engine: o menor progression score que alcança cada Level. O Score é a soma dos termos ponderados da seção "De onde vem o XP" (máximo 1,000 = todos os termos nas referências).

| Level | XP necessário | Score mínimo | % dos pontos possíveis |
| ---: | ---: | ---: | ---: |
| 2 | 100 | 0.064 | 6.4% |
| 5 | 800 | 0.147 | 14.7% |
| 6 | 1,118 | 0.168 | 16.8% |
| 10 | 2,700 | 0.239 | 23.9% |
| 16 | 5,809 | 0.324 | 32.4% |
| 20 | 8,282 | 0.374 | 37.4% |
| 31 | 16,432 | 0.492 | 49.2% |
| 40 | 24,355 | 0.575 | 57.5% |
| 51 | 35,355 | 0.668 | 66.8% |
| 60 | 45,319 | 0.738 | 73.8% |
| 71 | 58,566 | 0.817 | 81.7% |
| 80 | 70,217 | 0.879 | 87.9% |
| 90 | 83,962 | 0.944 | 94.4% |
| 99 | 97,015 | 1.000 | 100.0% |

### Velocidade da curva: perfis sintéticos

Perfis sintéticos apenas para esta análise (não são personas nem fixtures registradas; só o Level/XP deles é lido). "Só commits" deixa todo o resto em 0. "Proporcional" usa as razões do polyglot-dev, arredondadas: 6% de PRs, 2,6% de reviews, 2,4% de issues e 1,3% de repos por commit.

| Commits | Level só com commits | Level do perfil proporcional | PRs / reviews / issues / repos do proporcional |
| ---: | ---: | ---: | --- |
| 1 | 1 | 1 | 0 / 0 / 0 / 0 |
| 10 | 3 | 4 | 1 / 0 / 0 / 0 |
| 50 | 6 | 10 | 3 / 1 / 1 / 1 |
| 100 | 7 | 15 | 6 / 3 / 2 / 1 |
| 500 | 12 | 32 | 30 / 13 / 12 / 7 |
| 1,000 | 14 | 41 | 60 / 26 / 24 / 13 |
| 5,000 | 19 | 67 | 300 / 130 / 120 / 65 |
| 10,000 | 22 | 79 | 600 / 260 / 240 / 130 |

Perfis mínimos, poucas ações espalhadas entre categorias:

| Perfil mínimo | Level | XP |
| --- | ---: | ---: |
| 1 commit | 1 | 15 |
| 1 commit + 1 PR + 1 issue + 1 repo | 2 | 141 |
| 10 commits | 3 | 340 |
| 10 commits + 1 PR + 1 issue + 1 repo | 5 | 808 |
| 42 commits + 1 PR + 1 issue + 2 repos + 3 stars (≈ rookie-dev) | 8 | 2,158 |
| 100 commits + 5 PRs + 2 reviews + 3 issues + 3 repos | 15 | 5,724 |

### Tetos isolados

Um único termo no valor indicado, todo o resto em 0.

| Termo isolado (todo o resto em 0) | Level |
| --- | ---: |
| Commits: 10.000 | 22 |
| Commits: 150.000 | 22 |
| PRs: 1.000 | 7 |
| Reviews: 1.000 | 5 |
| Issues: 1.000 | 3 |
| Repos: 200 | 3 |
| Repos: 1.200 | 3 |
| Stars 5.000 + forks 1.000 | 1 |
| Stars 150.000 + forks 25.000 | 1 |
| Followers: 120.000 | 1 |

## Distribuição mensal das fixtures

"Uniforme" = todos os meses ativos têm a mesma quantidade (diferença de no máximo 1). Nesses perfis o único sinal que a fórmula de Consistency enxerga é a proporção de meses ativos; perfis totalmente uniformes não servem para avaliar a parte de distribuição (evenness).

| Profile | Meses | Meses ativos | Menor mês ativo | Maior mês ativo | Distribuição |
| --- | ---: | ---: | ---: | ---: | --- |
| rookie-dev | 9 | 6 | 2 | 9 | irregular |
| veteran-dev | 138 | 116 | 17 | 93 | irregular |
| polyglot-dev | 75 | 69 | 9 | 51 | irregular |
| popular-dev | 52 | 46 | 6 | 29 | irregular |
| empty-dev | 2 | 0 | 0 | 0 | sem atividade |
| commit-heavy-dev | 68 | 68 | 294 | 295 | uniforme |
| star-heavy-dev | 58 | 58 | 27 | 28 | uniforme |
| old-inactive-dev | 163 | 61 | 10 | 11 | uniforme nos meses ativos, com meses vazios |
| new-very-active-dev | 10 | 10 | 371 | 371 | uniforme |
| single-language-dev | 89 | 89 | 92 | 93 | uniforme |
| balanced-polyglot-dev | 89 | 89 | 92 | 93 | uniforme |
| collaboration-heavy-dev | 78 | 78 | 60 | 61 | uniforme |
| repo-heavy-dev | 70 | 70 | 10 | 11 | uniforme |
| extreme-dev | 194 | 194 | 974 | 975 | uniforme |
| burst-dev | 12 | 4 | 20 | 450 | irregular |
| steady-dev | 12 | 12 | 45 | 45 | uniforme |
| weekend-dev | 12 | 12 | 40 | 50 | irregular |
| inactive-returning-dev | 106 | 32 | 25 | 50 | irregular |

## Consistency: rajada × regularidade

Os quatro perfis dedicados a testar a fórmula de Consistency (que **não** foi alterada na V1.1). Burst, steady e weekend têm o mesmo volume (540 contribuições, conta de 12 meses); o que muda é como ele se distribui no tempo.

| Profile | Consistency | Meses (ativos/total) | Contribuições | Maior mês (% do total) | Dias ativos | Maior sequência | Dias recentes | Distribuição temporal (0–1) | Forma mensal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| burst-dev | 39 | 4/12 | 540 | 83% | 28 | 14 | 28 | 0.301 | `5×0 · 40 · 450 · 30 · 3×0 · 20` |
| steady-dev | 78 | 12/12 | 540 | 8% | 144 | 5 | 144 | 1.000 | `12×45` |
| weekend-dev | 71 | 12/12 | 540 | 9% | 96 | 2 | 96 | 1.000 | `40 · 50 · 2×45 · 40 · 50 · 2×45 · 40 · 50 · 2×45` |
| inactive-returning-dev | 64 | 32/106 | 1,000 | 5% | 304 | 20 | 100 | 0.474 | `24×25 · 74×0 · 8×50` |

- **steady-dev (78) > burst-dev (39)**: o mesmo volume distribuído ao longo do ano rende mais Consistency.

## Invariantes

| Invariante | Resultado |
| --- | --- |
| Level entre 1 e 99 | OK |
| XP entre 0 e 97,015 (XP do Level 99) | OK |
| Atributos são inteiros entre 0 e 100 | OK |
| Skills entre 1 e 20 | OK |
| Nenhum valor NaN/Infinity no personagem | OK |
| Determinismo (mesmo input, mesmo personagem) | OK |
| progressPercent entre 0 e 100 | OK |
| XP restante nunca negativo | OK |
| Progressão coerente: XP dentro do Level; Level 99 sem próximo Level, sem threshold inexistente e sem restante | OK |
| empty-dev: Level 1, 0 XP, sem skills, sem erro | OK |
| extreme-dev: Level 99 = MAX LEVEL, XP = MAX_XP, sem overflow | OK |
| Forks fora das métricas (extreme-dev: 1.200 repos, 150.000 stars, 25.000 forks) | OK |

<!-- ANALYSIS: hand-written below, preserved by the generator -->

## Observações de balanceamento (V1.1)

> Escrita à mão a partir das tabelas acima e de `BALANCE_V1_VS_V1_1.md`. **As únicas regras alteradas em relação à V1 são as 4 do changelog** (curva 2,1 → 2,5; Experience 30/25/20/15/10 → 20/25/25/20/10; Skills 35/35/30 → 25/40/35; subclasse 15% → 10%). A fórmula de Consistency e as demais constantes não foram tocadas. Os números citados como "V1" vêm do `balance-snapshot-v1.json` (perfis) ou do BALANCE_REVIEW.md da V1 (probes sintéticos, que o snapshot não guarda). A seção é preservada ao regerar, então **reconfira os números se o engine mudar**. Estimativas feitas fora do engine estão marcadas.

### A. Progressão inicial

| Perfil (todo o resto em 0, salvo indicado) | V1 | V1.1 |
| --- | ---: | ---: |
| 1 commit | Level 1 (62 XP) | Level 1 (15 XP) |
| 10 commits | Level 5 | Level 3 |
| 50 commits | Level 9 | Level 6 |
| 100 commits | Level 11 | Level 7 |
| 1 commit + 1 PR + 1 issue + 1 repo | Level 3 | Level 2 |
| 10 commits + 1 PR + 1 issue + 1 repo | Level 7 | Level 5 |
| ≈ rookie-dev (42 commits + 1 PR + 1 issue + 2 repos + 3 stars) | Level 12 | Level 8 |
| 100 commits + 5 PRs + 2 reviews + 3 issues + 3 repos | Level 21 (Experiente) | Level 15 (Aventureiro) |

- **rookie-dev: 12 → 8**, ainda "Aventureiro" (Level 6–15), agora com 2.158 XP. Um commit isolado vale 15% do caminho para o Level 2 (era 62%).
- O Level 2 passou a custar 6,4% dos pontos possíveis (score 0,064; antes 0,038) e o Level 10 custa 23,9% (antes 18,2%).
- 10 commits já não saem do tier "Iniciante" (Level 3). Para 10 commits + uma ação de cada tipo ainda se chega ao Level 5, o último "Iniciante".
- 100 commits + poucas ações em várias categorias deixou de ser "Experiente" (21) e é "Aventureiro" (15, o teto do tier).

### B. Progressão intermediária

| Commits | Só commits (V1 → V1.1) | Proporcional, razões do polyglot-dev (V1 → V1.1) |
| ---: | ---: | ---: |
| 100 | 11 → 7 | 20 → 15 |
| 500 | 16 → 12 | 38 → 32 |
| 1.000 | 19 → 14 | 47 → 41 |
| 5.000 | 25 → 19 | 71 → 67 |
| 10.000 | 28 → 22 | 82 → 79 |

- A queda é **maior nos níveis baixos e médios** (−5 a −6 entre 100 e 1.000 commits proporcionais) e menor no topo (−3 em 10.000), que é o que a curva `score^2,5` faz: o mesmo score de pontos rende menos XP quanto mais longe do máximo.
- **Todos os perfis com atividade caíram** (12 de 12, fora empty-dev e extreme-dev): de −2 (veteran-dev, 84 → 82) a −7 (old-inactive-dev, 35 → 28). Os valores reais batem com as referências do pedido (rookie 8, old-inactive 28, commit-heavy 40, popular 47, polyglot 57, new-very-active 63, collaboration 76, veteran 82), e o extreme-dev segue no 99.
- **Três perfis mudaram de tier:** popular-dev Mestre → Veterano (47); old-inactive-dev Veterano → Experiente (28); repo-heavy-dev Veterano → Experiente (30, o teto do tier).
- O Level 71 ("Elite") agora exige 81,7% dos pontos possíveis (antes 78,6%); um perfil proporcional de 5.000 commits fica no 67 (Mestre) e só o de 10.000 entra em Elite (79). Veteran-dev (6.840 commits, 412 PRs, 530 reviews) segue Elite (82).

### C. Level 99

- Inalterado: só o **extreme-dev** chega ao 99 (1 de 14), XP = MAX_XP = 97.015, MAX LEVEL sem próximo Level. O maior Level sem ele é o veteran-dev (82), 17 níveis abaixo. O Level 90 exige 94,4% dos pontos (antes 93,4%).
- Colaboração × commits: collaboration-heavy 76 × commit-heavy 40 (antes 79 × 46); a diferença cresceu de 33 para 36 níveis, mas continua sendo o comportamento intencional (45% de PRs/reviews/issues contra 40% de commits). Commits sozinhos têm teto de Level 22 (antes 28). Stars e forks no máximo, sozinhos, dão Level 1; followers continuam fora do XP.

### D. Experience (old-inactive-dev × new-very-active-dev)

| | old-inactive | new-very-active |
| --- | ---: | ---: |
| Conta | 13,5 anos | 0,7 ano |
| Experience V1 | 51 | 49 |
| **Experience V1.1** | **44** | **56** |
| Level V1 → V1.1 | 35 → 28 | 68 → 63 |

- **A ordem inverteu**: antes a conta quase parada (4 dias ativos nos últimos 365) superava em Experience o perfil com 260 PRs e 180 reviews; agora o new-very-active tem 56 contra 44.
- A idade deixou de dominar, mas ainda pesa. Estimativa pela fórmula, fora do engine: no old-inactive a idade vale ~18 dos 44 pontos (13,5/15 × 20), cerca de **41%** (na V1 eram ~27 de 51, 53%). Sem idade o old-inactive teria ~26, menos da metade do new-very-active (~55).
- Efeito colateral esperado: quem tem muita colaboração subiu (collaboration-heavy 70 → 75, new-very-active 49 → 56, popular 48 → 51) e quem tem pouca caiu (old-inactive 51 → 44, repo-heavy 45 → 43). commit-heavy não mudou (32).
- HP e MP caem junto com o Level (HP usa Level, Experience e Consistency; MP usa Level, Versatility e Activity). Exemplo: rookie-dev HP 244 → 230, old-inactive 452 → 410. É consequência da curva, não de uma regra de recursos nova.

### E. Skills (single-language-dev × balanced-polyglot-dev × extreme-dev)

| | single-language | balanced-polyglot | extreme-dev (cada uma das 10) |
| --- | --- | --- | --- |
| Share | TypeScript 96% | 40 / 30 / 20 / 10% | 10% |
| Skills V1 | TS 17 | TS 9, Python 8, Go 6, CSS 4 | 12 |
| **Skills V1.1** | **TS 17** | **TS 10, Python 8, Go 7, CSS 5** | **14** |
| Versatility | 8 | 55 | 100 |

- **Especialização continua valorizada:** o TypeScript 96% segue no LVL 17 (Arquimestre). Sondado no próprio engine (presença e volume saturados): com share 10% o teto é **LVL 14**; 30% → 15; 40% → 16; 50% → 17; 80% → 19; só **≥ ~93% chega ao LVL 20** (na V1 o teto de 10% era 12 e o LVL 20 pedia ~95%).
- **Já não se exige quase monocultura:** LVL 17 (Arquimestre) pede ~50% de share (na V1 pedia ~64%, estimativa pela fórmula); o extreme-dev passa de 12 a 14 (Mestre) em todas as 10 linguagens, e os poliglotas ganham +1 ou +2 (polyglot-dev TS/Python 9 → 10; repo-heavy-dev JavaScript 12 → 14).
- O gap single (17) × balanced (TS 10) continua grande (7 níveis), e é esperado: o balanced tem 8 repos e 800 kB de TypeScript, o single tem 20 repos e ~1,9 MB. Skill continua medindo afinidade, não domínio. Single-language, star-heavy e collaboration-heavy não mudaram.
- Todas as skills ficam em 1–20 e nenhuma regra de linguagens residuais (< 3%) ou de tiers mudou.

### F. Subclasse (limite 10%)

- **Só um perfil mudou: extreme-dev, de nenhuma subclasse para Guerreiro / Bardo.** Suas 10 linguagens têm exatamente 10% cada (10/100 do uso relevante, no limite do `>=`). A classe (Guerreiro, de C++) e a subclasse (Bardo, de CSS) saem do desempate alfabético entre linguagens com o mesmo número de bytes.
- **Nenhum título de combinação foi desbloqueado**: Guerreiro + Bardo não existe entre os 7 pares (extreme-dev continua com 0/7). Os outros 13 perfis mantêm classe, subclasse e título de combinação. Veteran-dev (3 linguagens ≥ 10%, antes 2), polyglot-dev (4, antes 3) e repo-heavy-dev (4, antes 3) têm mais linguagens elegíveis mas a subclasse já era a mesma.
- TypeScript + JavaScript continua sem virar Mago/Mago, e a próxima linguagem elegível é procurada (coberto por testes, inclusive uma terceira linguagem exatamente em 10%).

### G. Consistency (a fórmula não foi alterada)

| Perfil | Consistency | Meses ativos | Maior mês | Dias ativos | Maior sequência | Distribuição temporal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| burst-dev | **39** | 4/12 | 83% do total | 28 | 14 | 0,301 |
| steady-dev | **78** | 12/12 | 8% | 144 | 5 | 1,000 |
| weekend-dev | **71** | 12/12 | 9% | 96 | 2 | 1,000 |
| inactive-returning-dev | **64** | 32/106 | 5% | 304 | 20 | 0,474 |

- **steady-dev (78) > burst-dev (39)** com o mesmo volume (540 contribuições, mesmo XP): a fórmula distingue regularidade de rajada, que era a lacuna da V1. O burst-dev ainda ganha 39 pontos com só 28 dias ativos, porque `activeDays` é log-normalizado e vale 40%.
- **weekend-dev (71)** perde só 7 pontos para o steady-dev apesar de ter 33% menos dias ativos e sequência máxima 2: a regularidade mensal (distribuição 1,0) compensa quase tudo.
- **inactive-returning-dev (64)** ficou perto do weekend-dev (71) mesmo com 74 de 106 meses parados: dias ativos e sequência são acumulados de toda a vida, e a janela recente pesa só 10%. Para comparação, o old-inactive-dev (4 dias recentes) tem 55.
- As outras fixtures de stress continuam uniformes (ver tabela mensal), então só estas quatro e as personas exercitam a parte de distribuição.

## Red Flags

Só o que foi observado na V1.1. Os itens "Possível problema" dependem de decisão de produto; os "Intencional" estão aqui para não serem confundidos com problema.

### Possíveis problemas de produto

1. **Consistency tolera longas pausas.** inactive-returning-dev (74 meses parados, 32 de 106 meses ativos) tem 64, a 7 pontos de weekend-dev (71, ativo todos os meses) e acima de old-inactive-dev (55, só 4 dias recentes). Dias ativos e sequência são lifetime; a janela recente vale 10%.
2. **Idade ainda é ~41% do Experience do old-inactive-dev** (estimativa pela fórmula). A inversão com o new-very-active (44 × 56) mostra que o problema principal foi resolvido; o que resta é leve.
3. **Subclasse do extreme-dev depende de um empate exato e do desempate alfabético.** Todas as 10 linguagens têm exatamente 10% e passam o `>=` do limite; uma linguagem com 9,99% ficaria fora. Classe (Guerreiro) e subclasse (Bardo) vêm da ordem de nomes, e o par Guerreiro + Bardo não tem título de combinação (0/7 no perfil mais versátil das fixtures).
4. **Títulos de combinação cobrem só 7 pares ordenados**: 7 de 14 perfis têm um, e 3 perfis com subclasse (veteran-dev, collaboration-heavy-dev, old-inactive-dev) mais o extreme-dev não têm título de combinação. Inalterado em relação à V1.
5. **Repos valem 25% do Experience do repo-heavy-dev** (300 repos, 0 reviews, 8 PRs: Experience 43). Inalterado de propósito.
6. **Perfis com poucos dados ainda chegam rápido ao tier "Iniciante" → "Aventureiro":** 10 commits + 1 PR + 1 issue + 1 repo = Level 5 (último "Iniciante"); rookie-dev com 42 commits = Level 8. Bem menos agressivo que a V1 (12), mas o tier "Iniciante" continua curto (Levels 1–5).

### Comportamento intencional (não é problema)

- Level ignora idade (new-very-active 63 em 0,7 ano × old-inactive 28 em 13,5 anos): "Level = volume de trabalho público".
- Todos os perfis com atividade perderam Level na V1.1 (−2 a −7) e três mudaram de tier; era o objetivo da curva 2,5.
- Followers fora do XP; stars/forks limitados a 5%; commits com teto de 40% (Level 22 sozinhos).
- Colaboração (45%) pesando mais que commits (40%) quando forte (collaboration-heavy 76 × commit-heavy 40).
- Level 99 só com todos os termos nas referências (extreme-dev); 1 de 14 perfis acima de 90.
- Skill mede afinidade (share + presença + volume), não domínio; o LVL 20 ainda exige ~93% de share.
- HP/MP caem junto com o Level.

## Possíveis ajustes

**Nada disto foi implementado.** Os efeitos descritos são estimativas qualitativas; qualquer mudança deve ser feita e medida com `npm run balance:review && npm run balance:compare`, comparando `balance-snapshot-v1.json` (V1) e `balance-snapshot.json`.

**1. Consistency tolera longas pausas (Red Flag 1)**

- Problema: lifetime `activeDays` (40%) e `longestStreak` (15%) escondem anos de inatividade; a janela recente vale 10%.
- Possível ajuste: aumentar o peso de `recent` em `STAT_WEIGHTS.consistency` (tirando de `activeDays`) ou ponderar a distribuição temporal pelos últimos N meses.
- Arquivos afetados: `src/game/constants.ts`, `src/game/attributes/calculateAttributes.ts` (`calculateConsistency`), testes de atributos, `GAME_BALANCE.md`.
- Impacto: inactive-returning-dev e old-inactive-dev caem; perfis ativos quase não mudam.
- Risco: pune pausas legítimas (licença, mudança de emprego) e pode reduzir o Consistency de quem só tem histórico antigo.

**2. Idade em Experience (Red Flag 2)**

- Problema: a idade ainda rende 20 pontos linearmente, mesmo sem atividade recente (~41% do Experience do old-inactive).
- Possível ajuste: multiplicar o termo de idade por um fator de atividade recente (limitado a 1, com piso) ou baixar `STAT_WEIGHTS.experience.accountAge` para 15%.
- Arquivos afetados: `src/game/attributes/calculateAttributes.ts` (`calculateExperience`), `src/game/constants.ts`, testes de atributos.
- Impacto: o Experience do old-inactive cai de 44 para perto de 35; contas ativas não mudam.
- Risco: muda o significado de "Experience" de tempo para tempo ativo; pune quem fez uma pausa longa.

**3. Subclasse do extreme-dev e empates (Red Flag 3)**

- Problema: classe e subclasse de perfis com linguagens empatadas saem da ordem alfabética, e o limite usa comparação exata com 10%.
- Possível ajuste: desempate por presença em repositórios (ou por ordem de uso recente) em `analyzeLanguages`/`determineArchetype`; tolerância numérica na comparação com `subclassShare`.
- Arquivos afetados: `src/game/languages.ts`, `src/game/classes/classMatrix.ts`, testes de classes.
- Impacto: classe/subclasse de perfis empatados passam a ser explicáveis; pode mudar o extreme-dev.
- Risco: baixo, mas muda a classe das personas que dependam do desempate atual (conferir os 14 perfis).

**4. Cobertura de títulos de combinação (Red Flag 4)**

- Problema: 7 pares ordenados cobrem só metade dos perfis.
- Possível ajuste: tratar combinações como pares não ordenados, ampliar `COMBINATION_TITLES` (por exemplo Guerreiro + Bardo, Guerreiro + Mago, Paladino + Sentinela).
- Arquivos afetados: `src/game/titles/titleList.ts`, `src/i18n/dictionaries`, testes de títulos, `GAME_BALANCE.md`.
- Impacto: mais perfis desbloqueiam um título de combinação; muda o título padrão de quem passar a ter um (combinações são "topo da escada").
- Risco: mexe nos títulos padrão das personas existentes e nos snapshots; fora do escopo dos 4 ajustes de balanceamento.

**5. Repositórios no Experience (Red Flag 5)**

- Problema: contar repos sem considerar atividade infla Experience (25% do repo-heavy).
- Possível ajuste: reduzir `STAT_WEIGHTS.experience.repositories` ou contar só repositórios com stars/atividade.
- Arquivos afetados: `src/game/constants.ts`, `calculateAttributes.ts`, possivelmente `src/data/normalize.ts`.
- Impacto: reduz o Experience do repo-heavy (43) sem mexer no Level.
- Risco: baixo; exige definir "repositório relevante".

**6. Tier "Iniciante" curto (Red Flag 6)**

- Problema: Levels 1–5 são alcançados com cerca de 10 commits mais uma ação de cada tipo.
- Possível ajuste: `PROGRESSION_CURVE_EXPONENT` ainda maior (por exemplo 2,8) ou reposicionar `LEVEL_TIERS`.
- Arquivos afetados: `src/game/constants.ts`, testes de XP/Level/personas, e2e que citem Levels, `GAME_BALANCE.md`.
- Impacto: rookie-dev e perfis pequenos descem mais; Level 99 e MAX_XP continuam iguais.
- Risco: evolução inicial pode parecer lenta demais; a V1.1 já tirou 4 a 7 níveis da maioria dos perfis.

## Recomendação

**V1.1 aprovada para seguir para GitHubApiDataSource.** As 4 mudanças fizeram o que se esperava (curva mais lenta em baixo e no meio, Experience menos dependente de idade, Skills menos presas à concentração, subclasse alcançável pelo perfil mais versátil) e o Level 99, o MAX_XP, os clamps, o determinismo e os 12 invariantes seguem OK. Os Red Flags restantes são de calibração/produto, todos ajustáveis por constantes e nenhum bloqueia a integração com dados reais.
