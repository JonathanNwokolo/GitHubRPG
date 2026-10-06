# Balanceamento do Jogo, Engine V1 (GAME_BALANCE.md)

Este documento descreve as regras **implementadas** no Game Engine V1. Todos os números vivem em [src/game/constants.ts](src/game/constants.ts); se um valor aqui divergir do código, o código vence.

> O GitHub RPG **não mede** inteligência, talento, qualidade de código, competência ou valor profissional. É uma gamificação da jornada **pública** disponível no GitHub.

Princípios: determinístico, histórico completo (nunca só 12 meses), dados observáveis (sem inventar), funções puras.

---

## 1. Normalização logarítmica

```
logNormalize(value, reference) = clamp01( log1p(value) / log1p(reference) )
```

Retornos decrescentes: os primeiros commits valem muito, os milésimos pouco. Os valores de referência são **âncoras de balanceamento**, não máximos reais.

| Métrica | Referência |
|---|---|
| Commits | 10.000 |
| Pull Requests | 1.000 |
| Reviews | 1.000 |
| Issues | 1.000 |
| Repositórios próprios | 200 |
| Stars recebidas | 5.000 |
| Forks recebidos | 1.000 |
| Seguidores (só Reputation) | 1.000 |
| Repos com estrela (só Reputation) | 50 |
| Dias ativos | 1.000 |
| Maior sequência (dias) | 365 |
| Dias ativos recentes | 150 |
| Idade da conta (linear) | 15 anos |
| Linguagens relevantes | 8 |

## 2. XP e Level

### Progression score (histórico completo)

```
progressionScore = 0,40·commits + 0,20·PRs + 0,15·reviews + 0,10·issues + 0,10·repos + 0,05·impacto
impacto          = 0,5·logN(stars) + 0,5·logN(forks)
curved           = progressionScore ^ 2,5      (V1: 2,1)
totalXp          = round(curved · XP_do_Nível_99)
```

- Nenhum indicador passa de 40% (testado). Followers **não** dão XP. Stars/forks pesam só 5%.
- Só repositórios **próprios** (forks não contam).
- Score 1,0 (todas as referências atingidas) = exatamente Nível 99.

### Curva de nível e a adaptação matemática

A curva conceitual aprovada é `round(100 · level^1,5)`, mas o Level 1 precisa existir com **0 XP**. Aplicamos a curva ao **número de níveis avançados** `n = level − 1`:

```
xpThresholdForLevel(level) = round(100 · (level − 1)^1,5)
```

| Level | XP para alcançar |
|---|---|
| 1 | 0 |
| 2 | 100 (primeiro avanço = `100·1^1,5`) |
| 3 | 283 |
| 10 | 2.700 |
| 50 | 34.300 |
| 98 | 95.534 |
| 99 | 97.015 (máximo) |

Existe uma única função (`xpThresholdForLevel`); a tabela é construída uma vez e o nível sai por busca binária.

`calculateLevelProgress(xp)` retorna `{ totalXp, level, currentLevelXp, nextLevelXp, xpRemaining, progressPercent }`. No Level 99: `xpRemaining = 0`, `progressPercent = 100`. O percentual é arredondado **para baixo** (nunca mostra 100% antes de subir).

### Tiers (não são classe)

1–5 Iniciante · 6–15 Aventureiro · 16–30 Experiente · 31–50 Veterano · 51–70 Mestre · 71–90 Elite · 91–98 Lendário · 99 Ascendente

### Calibração observada (V1 → V1.1)

Na **V1** (expoente 2,1) o início da curva era generoso: ~10 commits davam Nível 5 e um perfil médio chegava a "Mestre". A **V1.1** sobe o expoente para 2,5 sem mexer nos pesos, em `MAX_XP` nem em `xpThresholdForLevel`. Valores reais do engine:

| Perfil | score | XP V1 | Level V1 | XP V1.1 | Level V1.1 |
|---|---|---|---|---|---|
| 1 commit | 0,03 | 62 | 1 | 15 | 1 |
| 10 commits | 0,10 | 839 | 5 | 340 | 3 |
| 42 commits, 1 PR, 1 issue, 2 repos, 3 stars | 0,22 | 3.968 | 12 | 2.158 | 8 |
| 200 commits, 10 PRs, 5 reviews, 10 issues, 8 repos, 10 stars | 0,42 | 16.149 | 30 | 11.211 | 24 |
| 1.000 commits, 50 PRs, 20 reviews, 30 issues, 30 repos, 100 stars | 0,61 | 35.429 | 51 | 27.960 | 43 |
| 5.000 commits, 300 PRs, 200 reviews, 150 issues, 80 repos, 800 stars | 0,83 | 67.864 | 78 | 60.042 | 72 |
| Só 10.000 commits | 0,40 | 14.163 | 28 | 9.817 | 22 |
| Todas as referências | 1,00 | 97.015 | 99 | 97.015 | 99 |

Os botões continuam em `constants.ts` (`PROGRESSION_CURVE_EXPONENT`, referências, tamanho do tier "Iniciante"). A comparação perfil a perfil está em `BALANCE_V1_VS_V1_1.md`.

---

## 3. Cobertura dos dados

`DataCoverage = "full" | "partial" | "unavailable"` em cada métrica importante.

| Cobertura | Regra |
|---|---|
| full | valor exato; mostra `atual / meta` e `faltam X` |
| partial | valor é um **mínimo**. Se já passou a meta, desbloqueia. Se não, mostra "Pelo menos X encontrados" e **nunca** "faltam X" (`remaining` e `progressPercent` = `null`) |
| unavailable | valor 0, nada é inventado; conquistas ficam bloqueadas sem progresso |

Métricas derivadas da lista de repositórios (repos, stars, forks, linguagens) herdam a cobertura da lista. Para XP e atributos, `unavailable` conta como 0 (sem reponderação).

## 4. Atributos (0–100, inteiros)

| Atributo | Composição |
|---|---|
| **Activity** | commits 45% · PRs 20% · reviews 15% · issues 10% · dias ativos 10% (logN). Atividade recente soma no máximo `10% × (1 − base)`: complementa, nunca substitui |
| **Experience** | idade da conta 20% (linear /15 anos; V1: 30%) · repos 25% · PRs 25% (V1: 20%) · reviews 20% (V1: 15%) · issues 10%. Só idade ⇒ no máximo 20 |
| **Reputation** | stars 45% · forks 30% · followers 15% · repos com estrela 10% (logN) |
| **Versatility** | nº de linguagens relevantes (≥5%) 60% (`n/8`) + equilíbrio 40% (entropia de Shannon normalizada por `ln 8`) |
| **Consistency** | dias ativos 40% · distribuição temporal 35% · maior sequência 15% · atividade recente 10% |

**Versatility:** TS 96 / CSS 2 / HTML 1 / Shell 1 ⇒ 1 linguagem relevante ⇒ **8**. TS 40 / Py 30 / Go 20 / CSS 10 ⇒ **~55** (testado: mais de 3× maior). A entropia é normalizada por `ln 8` (não por `ln n`) para que 2 linguagens equilibradas não pareçam tão versáteis quanto 8.

**Distribuição temporal** (série mensal desde a criação da conta): `(0,6·mesesAtivos/meses + 0,4·entropiaNormalizada) × min(1, meses/12)`. Uma rajada isolada pontua perto de 0; regularidade pontua alto; contas com menos de 12 meses são atenuadas.

## 5. Classe e subclasse

Linguagem **dominante** (mais bytes nos repos próprios) define a classe:

| Linguagens | Classe |
|---|---|
| JavaScript, TypeScript | Mago |
| Python | Alquimista |
| Rust, C, C++ | Guerreiro |
| Go | Patrulheiro |
| Java, C# | Paladino |
| HTML, CSS | Bardo |
| Shell, PowerShell | Ladino |
| Ruby | Oráculo |
| PHP | Escriba |
| Kotlin, Swift | Sentinela |
| Dart | Tecelão |
| outras / nenhuma | Aventureiro |

Classe é **identidade, não poder**. **Subclasse:** próxima linguagem relevante com ≥10% do uso relevante (V1: 15%) (renormalizado entre as relevantes) cuja classe seja real e **diferente** da principal (TS + JS continua só Mago). TS 63 / Py 22 / CSS 15 ⇒ Mago / Alquimista. TS 97 / Py 1 ⇒ sem subclasse.

## 6. Skills (linguagens)

Representam **afinidade dentro do GitHub RPG**, não domínio profissional.

```
raw   = 0,25·participação + 0,40·presença + 0,35·volume      (V1: 35 / 35 / 30)
presença = logN(repos com a linguagem, ref 30)
volume   = logN(bytes/10.000, ref 500)        (≈ 5 MB)
nível    = clamp(1 + round(raw^1,5 · 19), 1, 20)
```

Linguagens abaixo de 3% não viram skill. Um único repo pequeno 100% de uma linguagem dá nível ~6, não 20 (V1: ~8). Tiers: 1–4 Aprendiz · 5–8 Adepto · 9–12 Especialista · 13–16 Mestre · 17–19 Arquimestre · 20 Lendário.

## 7. Conquistas (não dão XP)

31 conquistas, todas cumulativas, só repos **próprios**, com `{ id, name, description, rarity, category, current, target, unlocked, progressPercent, remaining }` (+ `unit`, `coverage`).

- **Idade (anos):** 1 Primeiro Capítulo (Comum) · 3 Cronista do Código (Raro) · 5 Antigo Guardião (Épico) · 10 Lenda dos Repositórios (Lendário) · 15 Ancião do Código (Lendário). Idade pela **data completa** (aniversário exato; `ano atual − ano de criação` nunca é usado). Exibida com 1 casa decimal arredondada para baixo; `remaining` arredondado para cima.
- **Repositórios:** 1 Primeiro Repositório · 5 Explorador · 25 Senhor dos Repositórios · 50 Construtor de Reinos · 100 Arquiteto de Mundos
- **Commits:** 100 Primeiros Golpes · 1.000 Código em Chamas · 5.000 Tempestade de Código · 10.000 Forjador Incansável
- **PRs:** 1 Primeiro Aliado · 25 Guardião Open Source · 100 Campeão da Colaboração · 500 Herói da Comunidade
- **Reviews:** 10 Olhar Atento · 50 Vigia do Código · 200 Guardião da Qualidade (participação, não prova de qualidade)
- **Issues:** 10 Caçador de Bugs · 50 Caçador de Recompensas · 200 Exterminador de Bugs
- **Stars:** 1 Primeira Centelha · 25 Brilho Crescente · 100 Constelação · 1.000 Farol dos Reinos
- **Linguagens relevantes:** 2 Primeiro Encantamento · 5 Poliglota · 8 Mestre das Afinidades

"Primeira Masmorra" foi renomeada para **Primeiro Repositório** (o sistema de masmorras foi removido).

**Próximos marcos:** a primeira conquista bloqueada de cada categoria (exceto idade, que não é "trabalhável"), as 3 mais próximas primeiro. Perfil vazio ⇒ Primeiro Repositório 0/1, Primeiros Golpes 0/100, Primeiro Aliado 0/1.

## 8. Títulos

Títulos ≠ conquistas. Vários podem estar desbloqueados; **um** fica equipado. O engine fornece os desbloqueados e um padrão (o mais alto da própria escada; empates por ordem de categoria); a escolha do usuário fica em `localStorage` (store de UI, fora do engine).

- **Reputação (stars):** 10 Portador da Centelha · 50 Caçador de Estrelas · 100 Senhor das Estrelas · 500 Arauto das Constelações · 1.000 Lenda Celestial
- **Atividade (commits):** 500 Forjador de Código · 1.000 Incansável · 5.000 Mestre da Forja · 10.000 Forjador Eterno
- **Colaboração (PRs):** 10 Aliado do Código · 50 Emissário Open Source · 100 Guardião da Comunidade · 500 Campeão dos Reinos Abertos
- **Versatilidade:** 3 Explorador Arcano · 5 Poliglota das Runas · 8 Mestre das Afinidades
- **Longevidade (anos):** 3 Cronista · 5 Guardião Ancestral · 10 Lenda dos Repositórios · 15 Ancião do Código
- **Classe + subclasse** (automáticos, sem aleatoriedade; condições não numéricas ⇒ lista de requisitos ✓/✗, sem percentual): Mago+Alquimista Arcanista do Código · Mago+Guerreiro Cavaleiro Rúnico · Mago+Bardo Tecelão de Interfaces · Alquimista+Guerreiro Ferreiro Arcano · Paladino+Mago Guardião Arcano · Patrulheiro+Alquimista Explorador de Sistemas · Ladino+Mago Ilusionista do Terminal

Nas escadas numéricas, o engine marca `isNext` no primeiro título bloqueado de cada categoria (a UI mostra o progresso dele).

## 9. HP e MP

Representação RPG derivada, **sem combate** na V1: sempre cheios e nunca influenciam XP ou level.

```
maxHp = 100 + 4·level + 2·experience + 2·consistency
maxMp =  50 + 3·level + 2·versatility + 2·activity
```

## 10. Rarity

Comum = primeiro progresso significativo · Raro = dedicação consistente · Épico = trajetória acima do normal · Lendário = marco realmente incomum.

---

## 11. Game Engine Balance V1.1

Ajuste de calibração em cima da V1, medido com `npm run balance:review` + `npm run balance:compare`. O baseline congelado está em `balance-snapshot-v1.json` (não é reescrito); o estado atual em `balance-snapshot.json`; a comparação gerada em `BALANCE_V1_VS_V1_1.md`. Só estas quatro regras mudaram:

| # | Regra | Constante | V1 | V1.1 |
|---|---|---|---|---|
| 1 | Expoente da curva de progressão | `PROGRESSION_CURVE_EXPONENT` | 2,1 | **2,5** |
| 2 | Experience: idade da conta | `STAT_WEIGHTS.experience.accountAge` | 30% | **20%** |
| 2 | Experience: PRs | `STAT_WEIGHTS.experience.pullRequests` | 20% | **25%** |
| 2 | Experience: reviews | `STAT_WEIGHTS.experience.reviews` | 15% | **20%** |
| 3 | Skills: participação | `SKILL.weights.share` | 35% | **25%** |
| 3 | Skills: presença em repositórios | `SKILL.weights.presence` | 35% | **40%** |
| 3 | Skills: volume | `SKILL.weights.volume` | 30% | **35%** |
| 4 | Subclasse: participação mínima | `LANGUAGE_RULES.subclassShare` | 15% | **10%** |

Experience continua somando 100% (repos 25% e issues 10% não mudaram). Os pesos do XP (commits 40 / PRs 20 / reviews 15 / issues 10 / repos 10 / impacto 5), `MAX_XP`, `xpThresholdForLevel`, tiers, Consistency, HP/MP, conquistas e títulos **não** mudaram. A regra de subclasse segue ignorando linguagens da mesma classe da principal e procurando a próxima elegível.

Fixtures novas (internas, fora de `RESERVED_PERSONAS`, sem PRNG): `burst-dev`, `steady-dev`, `weekend-dev`, `inactive-returning-dev` em `src/data/fixtures/balanceFixtures.ts`. Existem para testar a fórmula de Consistency, que não foi alterada.
