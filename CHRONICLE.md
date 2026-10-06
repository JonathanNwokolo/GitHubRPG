# Crônica do Desenvolvedor

Aba **CRÔNICA**: o histórico público do GitHub contado como timeline. Não é missão, masmorra, quest, PvP nem ranking, e **não toca no Game Engine** (XP, nível, classe, skills, conquistas, títulos e balanceamento não leem nada daqui; `balance-snapshot*.json` permanecem idênticos).

> Princípio: toda frase é derivável de um campo real. É melhor mostrar menos eventos verdadeiros do que muitos plausíveis.

## Código

```text
src/features/chronicle/
  types.ts                    modelo (dados puros, sem texto/idioma/UI)
  rules.ts                    TODOS os limiares
  yearStats.ts                histórico anual (anual exato OU derivado da série mensal)
  highlights.ts               um detector por tipo de fato
  buildDeveloperChronicle.ts  buildDeveloperChronicle(profile) -> DeveloperChronicle  (pura)
  chronicleText.ts            frases PT/EN a partir do modelo (pura)
  ChroniclePanel.tsx          UI da aba
  chronicleIcons.tsx          ícones RPG do projeto + estilo por importância
  testing/fixtures.ts         builders de teste (não são personas)
```

`buildDeveloperChronicle` não usa `Date.now`, `new Date()` vazio, `Math.random`, `fetch`, React nem i18n (um teste verifica). "Hoje" é sempre `profile.referenceDate`. A página (servidor) calcula via `loadCharacterWithChronicle`, a partir do **mesmo** `DeveloperProfile` do personagem.

## O que existe historicamente

| Dado | Dimensão temporal? |
|---|---|
| contribuições, commits, PRs, reviews, issues, dias ativos **por ano civil** | **sim** (já lidos pelas requests de contribuições; antes eram somados e descartados) |
| série mensal de contribuições | sim (única fonte das fontes mock) |
| onde ocorreu a maior sequência (início/fim) | sim (derivada do calendário diário já lido) |
| data de criação da conta | sim |
| linguagens, estrelas, forks, repositórios, seguidores | **não: só o estado atual** |

Por isso a Crônica nunca diz "em 2022 TypeScript virou sua linguagem principal". Linguagem e estrelas aparecem só em **"Retrato de hoje"**, no presente ("Atualmente, ...").

Alteração mínima na data layer: `RawGitHubData.activity.yearly` e `longestStreakPeriod` (opcionais), preenchidos em `assemble.ts` com dados que a API **já retornava**. **0 requests adicionais.**

## Contagem

"Contribuições" = tudo no calendário de contribuições do ano (como o GitHub mostra no perfil; inclui privadas só se a pessoa optou por exibi-las). Commits/PRs/reviews/issues são os `contributionsCollection` públicos. As duas medidas não precisam somar.

## Pontuação do ano ("score")

`score = contribuições do ano`. Sem pesos: a fórmula não é nossa e existe sempre que o histórico existe. Só serve à apresentação.

## Regras de eventos (`rules.ts`)

Ano **completo** = nem o de criação (começa no meio do ano) nem o atual (inacabado). Comparações entre anos usam só anos completos com números exatos.

| Evento | Regra |
|---|---|
| Primeiro Capítulo | sempre: data real de criação |
| Primeira Atividade | 1º ano com contribuição, se ≠ ano de criação e todos os anteriores foram lidos e são zero |
| Ano Mais Ativo | maior score; ≥ 100; ≥ 3 anos com atividade; empate → o mais antigo. Se é o ano atual: "até agora"; se parcial: "maior ano conhecido" |
| Recorde de Commits | maior nº de commits; ≥ 100; ≥ 3 anos com commits; exige detalhamento anual |
| Mestre da Colaboração | maior PRs + reviews; ≥ 40; ≥ 3 anos (PRs e reviews juntos para não duplicar eventos) |
| Maior Sequência | período real da maior sequência, no ano em que **terminou**; ≥ 7 dias; só com cobertura `full` e período coerente com o valor. "Em andamento" se alcança hoje/ontem |
| Ritmo em Alta / O Grande Avanço | ano anterior ≥ 20, atual ≥ 1,5× e ≥ +50 contribuições; ≥ 2× vira Grande Avanço. +2% não gera nada |
| Ritmo Mais Calmo | anterior ≥ 100 e atual ≤ 50%. Quedas consecutivas contam como uma história: só a primeira é contada |
| Retorno do Aventureiro | ≥ 2 anos completos seguidos com ≤ 20 contribuições, **depois** de um ano com ≥ 100, e o ano seguinte com ≥ 100. Sem atividade anterior não é retorno |
| Marco Histórico | maior marco acumulado atingido (1k, 2,5k, 5k, 10k, 25k, 50k, 100k), no ano em que foi cruzado; só com histórico completo |

Capítulos (nomes determinísticos): o início é "O Início da Jornada"; o ano atual é "Capítulo Atual"; os demais seguem a prioridade Retorno > Grande Avanço > Ano Lendário > Ritmo Cresce > Era da Colaboração > Temporada de Construção > Marcha Constante > Marco Histórico > Estação Tranquila > Primeiros Passos. Só entram na timeline o início, o ano atual e anos com fato; o resto vira uma linha de "interlúdio" (soma real do período, ou "nenhuma contribuição registrada" só quando todos os anos foram lidos e são zero).

Importância visual (só apresentação): `normal` borda discreta, `important` dourada, `exceptional` (recordes) com brilho.

## Coverage

- `full`: todos os anos da conta lidos.
- `partial`: alguns anos não lidos (ou série mensal parcial). Ano ausente **nunca** vira zero; totais viram "≥"/"histórico conhecido"; não há Primeira Atividade nem Marco; comparações de série parcial são recusadas.
- `unavailable` (sem token): só a data de criação; nenhum número é exibido, nenhum zero é inventado.

## Limitações

- Ano atual nunca gera crescimento/queda (compararia ano inacabado com ano completo).
- Mock: só contribuições por ano (sem commits/PRs/reviews, sem sequência).
- Sem histórico de linguagens, estrelas ou seguidores: não há eventos sobre eles.
