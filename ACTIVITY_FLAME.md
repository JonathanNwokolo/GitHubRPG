# Chama da Atividade

Seção da aba FICHA, **logo abaixo da Crônica da Jornada**: o calendário diário de contribuições do GitHub contado como a "energia vital" do herói. Não é missão, masmorra, buff nem ranking, e **não toca no Game Engine** (XP, nível, classe, atributos, conquistas, títulos e balanceamento não leem nada daqui; `balance-snapshot*.json` permanecem idênticos).

> Princípio: tudo o que aparece é derivável do calendário real. Ano não lido nunca vira zero; sem calendário, estado vazio, nunca erro e nunca número inventado.

## Código

```text
src/features/activity-flame/
  types.ts                    modelo (dados puros, sem texto/idioma/UI)
  rules.ts                    TODOS os limiares (níveis e insights)
  buildActivityFlame.ts       buildActivityFlame({ calendar, createdAt, referenceDate }) -> ActivityFlameModel (pura)
  flameText.ts                datas, níveis, frases PT/EN a partir do modelo (pura)
  ActivityFlameSection.tsx    seção: seletor de ano, 4 números, heatmap, Leitura dos Oráculos, Recordes do Herói
  FlameHeatmap.tsx            grid ARIA de runas + tooltip + legenda
  FlameYearPicker.tsx         "viagem no tempo" (radiogroup)
  activity-flame.css          paleta, runas e animação (prefixo af-*)
  testing/fixtures.ts         builders de teste (não são personas)
```

`buildActivityFlame` não usa `Date.now`, `new Date()` vazio, `Math.random`, `fetch`, React nem i18n. "Hoje" é sempre `referenceDate` (o `fetchedAt` do perfil).

## De onde vêm os dados (0 requests novas)

O calendário diário **já era lido** (`contributionsCollection`, 1 request para até 5 anos) e depois resumido e descartado em `assemble.ts`. Agora ele também é repassado, no mesmo molde de `activity.yearly` do Chronicle:

```text
contributions.ts (já lia os dias)
→ assemble.ts: RawGitHubData.activity.calendar  { years: [{ year, counts[] }], coverage }
→ validação Zod (schemas)
→ loadCharacterProduct: buildActivityFlame(...)  → prop activityFlame
```

- `counts` é denso: índice 0 = 1º de janeiro, até 31/12 (ou até o dia de referência no ano corrente). Cerca de 1 KB por ano.
- **Não entra no `DeveloperProfile`**. Assim o engine não o enxerga e `createProfileFingerprint` (hash do perfil inteiro, usado no cache V2) permanece idêntico: nenhuma invalidação de cache.
- Sem token (REST anônimo): `calendar = { years: [], coverage: "unavailable" }` → estado vazio. O fluxo anônimo continua funcionando.
- Mock/dev: o calendário demo é derivado da série mensal existente (cada mês soma exatamente o valor do mês), com gerador próprio: não desloca nenhum sorteio do perfil.

## Níveis de energia

6 níveis: 0 Adormecido, 1 Brasa, 2 Chama, 3 Fogueira, 4 Incandescente, 5 Lendário.

- Relativo: percentis 25/50/75/95 dos dias ativos do **histórico inteiro** (os anos ficam comparáveis na troca de ano).
- Absoluto: pisos 1/2/4/7/10 contribuições para os níveis 1..5, que limitam o relativo. Um perfil quieto nunca acende "Lendário" com 2 contribuições.

A cor nunca é o único sinal: cada nível tem uma marca própria dentro da runa.

## Números do ano

Todos por ano civil, recalculados na troca de ano (a partir do modelo em memória: sem request, sem recálculo).

| Figura | Regra |
|---|---|
| Maior sequência | maior corrida de dias ativos que toca o ano, contada **até o último dia do ano**. Empate → a mais antiga. Pode começar no ano anterior |
| Sequência atual / no fim do ano | corrida viva no último dia do ano (hoje, ou ontem se hoje ainda está vazio, no ano corrente) |
| Dias ativos / Contribuições | contagem do calendário do ano (dias depois do dia de referência são ignorados) |

Cobertura parcial: uma sequência que começa em 1º de janeiro de um ano cujo anterior **não foi lido** vira "≥ N dias". Anos não lidos não aparecem no seletor.

Recordes: maior sequência (com período), maior dia, maior semana (domingo a sábado, como o heatmap desenha, recortada pelo ano) e maior mês. Empate → o mais antigo.

## Leitura dos Oráculos (regras determinísticas, sem IA)

Primeira que casar vence (`rules.ts`):

| Id | Regra |
|---|---|
| dormant | 0 contribuições no ano |
| unbroken | ≥ 30 dias de jornada no ano e ≥ 80% deles ativos |
| accelerating | últimos 90 dias ≥ 1,5× os 90 anteriores e ≥ 40 contribuições |
| growing | ano e anterior ambos **completos e lidos** (nenhum é o de criação nem o corrente), anterior ≥ 20, ≥ 1,25× e ≥ +50 |
| weekends / weekdays | ≥ 30 contribuições e ≥ 40% nos fins de semana / ≥ 85% em dias úteis |
| singleBlaze | ≥ 40 contribuições e um dia com ≥ 25% do ano |
| embers | ≤ 29 contribuições |
| steady | padrão |

Dias antes da criação da conta (ano de criação) são desenhados como "antes da jornada" e não contam.

## Estados vazios

- Sem calendário (sem token, ou fonte sem calendário): "O fogo desta lenda ainda não foi registrado pelos Oráculos."
- Calendário lido, mas nunca houve contribuição: "Nenhuma chama foi acesa ainda."

## Acessibilidade e movimento

- Heatmap é um `grid` ARIA com **um** tab stop (tabindex rotativo): setas ← → = semana, ↑ ↓ = dia, Home/End = primeiro/último dia, Esc fecha o tooltip. O nome acessível de cada célula tem data, contribuições e nível.
- Tooltip no hover, no foco e no toque; é descartável com Esc e não carrega nada que o nome acessível não diga.
- O seletor de anos é um `radiogroup` (não `tab`), para não competir com as 4 abas da Ficha.
- `prefers-reduced-motion`: runas acesas de imediato, sem animação. Sem `IntersectionObserver`: idem.
- A ignição só acontece uma vez, quando a seção entra na tela; a troca de ano é instantânea (fade curto, só com movimento permitido).

## Limitações

- Estatísticas são por ano civil; não há visão "todos os anos".
- Contribuições privadas aparecem só se a pessoa optou por exibi-las no perfil (como o GitHub expõe).
- O calendário demo (mock) é derivado da série mensal; seus "dias ativos" podem diferir do número escrito à mão em cada persona.
