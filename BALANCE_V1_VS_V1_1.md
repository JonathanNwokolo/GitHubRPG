# BALANCE_V1_VS_V1_1.md

> **Gerado por `npm run balance:compare`** a partir de `balance-snapshot-v1.json` (engine `v1`, baseline congelado) e `balance-snapshot.json` (engine `v1.1`).
> Nenhum número daqui foi digitado à mão. Para regerar: `npm run balance:review && npm run balance:compare`.

## O que mudou entre V1 e V1.1

| Regra | V1 | V1.1 |
| --- | --- | --- |
| Expoente da curva de progressão (`PROGRESSION_CURVE_EXPONENT`) | 2.1 | 2.5 |
| Experience: idade | 30% | 20% |
| Experience: repositórios | 25% | 25% |
| Experience: PRs | 20% | 25% |
| Experience: reviews | 15% | 20% |
| Experience: issues | 10% | 10% |
| Skill: share da linguagem | 35% | 25% |
| Skill: presença em repositórios | 35% | 40% |
| Skill: volume relativo | 30% | 35% |
| Subclasse: share mínimo da 2ª linguagem relevante | 15% | 10% |

Pesos do XP (commits 40 / PRs 20 / reviews 15 / issues 10 / repos 10 / impacto 5), MAX_XP, `xpThresholdForLevel`, tiers, Consistency e demais atributos **não** mudaram.

## Level

| Profile | V1 Level | V1.1 Level | Delta | V1 XP | V1.1 XP | V1 Tier | V1.1 Tier |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| rookie-dev | 12 | 8 | -4 | 3,968 | 2,158 | Aventureiro | = |
| veteran-dev | 84 | 82 | -2 | 76,488 | 73,102 | Elite | = |
| polyglot-dev | 62 | 57 | -5 | 48,183 | 42,169 | Mestre | = |
| popular-dev | 53 | 47 | -6 | 38,349 | 32,135 | Mestre | Veterano |
| empty-dev | 1 | 1 | 0 | 0 | 0 | Iniciante | = |
| commit-heavy-dev | 46 | 40 | -6 | 30,416 | 24,386 | Veterano | = |
| star-heavy-dev | 50 | 44 | -6 | 34,440 | 28,274 | Veterano | = |
| old-inactive-dev | 35 | 28 | -7 | 19,878 | 14,697 | Veterano | Experiente |
| new-very-active-dev | 68 | 63 | -5 | 55,398 | 49,790 | Mestre | = |
| single-language-dev | 65 | 60 | -5 | 52,048 | 46,227 | Mestre | = |
| balanced-polyglot-dev | 65 | 60 | -5 | 52,048 | 46,227 | Mestre | = |
| collaboration-heavy-dev | 79 | 76 | -3 | 69,596 | 65,329 | Elite | = |
| repo-heavy-dev | 36 | 30 | -6 | 21,193 | 15,862 | Veterano | Experiente |
| extreme-dev | 99 | 99 | 0 | 97,015 | 97,015 | Ascendente | = |

- Perfis cujo Level **caiu**: 12 de 12 (sem contar empty-dev e extreme-dev, que não mudam).
- Maior queda: **old-inactive-dev (-7)**. Menor queda: **veteran-dev (-2)**.
- Mudaram de tier: popular-dev (Mestre → Veterano), old-inactive-dev (Veterano → Experiente), repo-heavy-dev (Veterano → Experiente).
- Mudaram de subclasse: extreme-dev (— → Bardo).

Perfis que só existem na V1.1 (fixtures de Consistency, sem equivalente na V1): burst-dev, steady-dev, weekend-dev, inactive-returning-dev. Ver BALANCE_REVIEW.md, seção "Consistency: rajada × regularidade".

## Experience (e HP/MP, que dependem dela e do Level)

| Profile | V1 Experience | V1.1 Experience | Delta | V1 HP | V1.1 HP | V1 MP | V1.1 MP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| rookie-dev | 9 | 10 | +1 | 244 | 230 | 194 | 182 |
| veteran-dev | 81 | 82 | +1 | 782 | 776 | 568 | 562 |
| polyglot-dev | 58 | 60 | +2 | 640 | 624 | 524 | 509 |
| popular-dev | 48 | 51 | +3 | 582 | 564 | 425 | 407 |
| empty-dev | 0 | 0 | 0 | 104 | 104 | 53 | 53 |
| commit-heavy-dev | 32 | 32 | 0 | 542 | 518 | 348 | 330 |
| star-heavy-dev | 39 | 40 | +1 | 550 | 528 | 388 | 370 |
| old-inactive-dev | 51 | 44 | -7 | 452 | 410 | 311 | 290 |
| new-very-active-dev | 49 | 56 | +7 | 634 | 628 | 498 | 483 |
| single-language-dev | 56 | 57 | +1 | 664 | 646 | 427 | 412 |
| balanced-polyglot-dev | 56 | 57 | +1 | 664 | 646 | 521 | 506 |
| collaboration-heavy-dev | 70 | 75 | +5 | 746 | 744 | 523 | 514 |
| repo-heavy-dev | 45 | 43 | -2 | 490 | 462 | 370 | 352 |
| extreme-dev | 100 | 100 | 0 | 896 | 896 | 747 | 747 |

Activity, Reputation, Versatility e Consistency: **idênticos** nos 14 perfis (só Experience mudou, como previsto).

## Skills

| Profile | V1 skills (todas) | V1.1 skills (todas) |
| --- | --- | --- |
| rookie-dev | JavaScript 6, HTML 6 | JavaScript 6, HTML 5 |
| veteran-dev | Rust 16, TypeScript 10, Python 8, Shell 5 | Rust 17, TypeScript 11, Python 9, Shell 5 |
| polyglot-dev | TypeScript 9, Python 9, Go 7, Rust 5, CSS 3, Java 3 | TypeScript 10, Python 10, Go 8, Rust 6, CSS 4, Java 4 |
| popular-dev | Go 15, Python 6, Shell 4 | Go 15, Python 7, Shell 5 |
| commit-heavy-dev | TypeScript 12 | TypeScript 11 |
| old-inactive-dev | PHP 11, JavaScript 5 | PHP 10, JavaScript 5 |
| new-very-active-dev | TypeScript 12, Python 6, Go 4 | TypeScript 12, Python 7, Go 5 |
| balanced-polyglot-dev | TypeScript 9, Python 8, Go 6, CSS 4 | TypeScript 10, Python 8, Go 7, CSS 5 |
| repo-heavy-dev | JavaScript 12, Python 11, HTML 10, Shell 9 | JavaScript 14, Python 13, HTML 11, Shell 10 |
| extreme-dev | C++ 12, CSS 12, Go 12, Java 12, Kotlin 12, Python 12, Ruby 12, Rust 12, Shell 12, TypeScript 12 | C++ 14, CSS 14, Go 14, Java 14, Kotlin 14, Python 14, Ruby 14, Rust 14, Shell 14, TypeScript 14 |

Sem mudança: empty-dev, star-heavy-dev, single-language-dev, collaboration-heavy-dev.

## Classe, subclasse e títulos de combinação

Só aparecem os perfis em que algo mudou. O título de combinação é derivado do par classe + subclasse, pela tabela do próprio engine.

| Profile | V1 classe / subclasse | V1.1 classe / subclasse | V1 título de combinação | V1.1 título de combinação |
| --- | --- | --- | --- | --- |
| extreme-dev | Guerreiro / — | Guerreiro / Bardo | — | — |

## Títulos e conquistas (total)

| Profile | V1 títulos | V1.1 títulos | V1 título padrão | V1.1 título padrão | V1 conquistas | V1.1 conquistas |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| rookie-dev | 1 | 1 | Tecelão de Interfaces | = | 4 | 4 |
| veteran-dev | 15 | 15 | Lenda Celestial | = | 25 | 25 |
| polyglot-dev | 12 | 12 | Arcanista do Código | = | 19 | 19 |
| popular-dev | 10 | 10 | Explorador de Sistemas | = | 14 | 14 |
| empty-dev | 0 | 0 | — | = | 0 | 0 |
| commit-heavy-dev | 7 | 7 | Forjador Eterno | = | 10 | 10 |
| star-heavy-dev | 10 | 10 | Lenda Celestial | = | 15 | 15 |
| old-inactive-dev | 6 | 6 | Lenda dos Repositórios | = | 11 | 11 |
| new-very-active-dev | 10 | 10 | Arcanista do Código | = | 15 | 15 |
| single-language-dev | 11 | 11 | Mestre da Forja | = | 16 | 16 |
| balanced-polyglot-dev | 13 | 13 | Arcanista do Código | = | 17 | 17 |
| collaboration-heavy-dev | 11 | 11 | Campeão dos Reinos Abertos | = | 21 | 21 |
| repo-heavy-dev | 6 | 6 | Arcanista do Código | = | 12 | 12 |
| extreme-dev | 20 | 20 | Lenda Celestial | = | 31 | 31 |
