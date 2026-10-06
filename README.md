# GitHub RPG

Transforma a jornada **pública** de uma pessoa no GitHub em uma ficha de personagem de RPG: nível, XP, atributos, classe, skills, conquistas e títulos.

> O GitHub RPG **não mede** inteligência, talento, qualidade de código, competência ou valor profissional. É uma gamificação do que está visível publicamente no GitHub, feita para ser divertida.

## Estado do projeto

- **Frontend e Game Engine V1.1 prontos**, com testes unitários e e2e.
- **Ainda não usa a API real do GitHub.** Hoje tudo vem de dados simulados e determinísticos (`MockDataSource`), e a interface avisa "Dados de demonstração". A integração (`GitHubApiDataSource`) é o próximo passo, e o desenho da camada de dados já foi pensado para que seja uma troca em um único lugar. Veja [ENGINE_ARCHITECTURE.md](ENGINE_ARCHITECTURE.md) e [MOCKS.md](MOCKS.md).
- O projeto pretende virar **open source**. Contribuições e ideias são bem-vindas (veja abaixo). A licença ainda será definida.

## Como rodar

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

Sem login e sem chave de API: digite um usuário na página inicial. Os perfis de demonstração fixos são `rookie-dev`, `veteran-dev`, `polyglot-dev`, `popular-dev` e `empty-dev`; `missing-dev` simula um perfil inexistente (404). Qualquer outro nome gera um personagem determinístico a partir do próprio nome.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção e servidor |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | Testes unitários e de integração (Vitest) |
| `npm run test:e2e` | Testes e2e (Playwright). Rode `npm run build` antes: eles sobem o app com `next start` |
| `npm run balance:review` | Regera [BALANCE_REVIEW.md](BALANCE_REVIEW.md) e `balance-snapshot.json` a partir do engine real |
| `npm run balance:compare` | Compara `balance-snapshot-v1.json` com o snapshot atual em [BALANCE_V1_VS_V1_1.md](BALANCE_V1_VS_V1_1.md) |

Na primeira vez que rodar os e2e, instale o navegador: `npx playwright install chromium`.

## Como funciona

O fluxo de dados é unidirecional e cada camada tem uma responsabilidade:

```
GitHubDataSource  →  validação (Zod)  →  normalização  →  Game Engine  →  RPGCharacter  →  UI
```

- `src/data/`: fontes de dados (hoje o mock), contratos, validação e normalização.
- `src/game/`: o **Game Engine**. É puro: sem React, sem Next, sem rede, sem relógio. Mesmo input, mesmo personagem. Toda regra de balanceamento mora em [src/game/constants.ts](src/game/constants.ts).
- `src/features/`, `src/components/`, `src/design-system/`: interface (Next.js App Router, Tailwind, tema pixel art). Nenhuma fórmula de jogo fica na UI.
- `src/i18n/`: textos da interface em pt-BR e en.

As regras do jogo (XP, atributos, classes, skills, conquistas, títulos) estão descritas em [GAME_BALANCE.md](GAME_BALANCE.md). Em caso de divergência, o código vence.

## Balanceamento

O balanceamento é medido, não chutado. `npm run balance:review` roda o engine real sobre perfis de teste fixos (personas e fixtures de estresse em `src/data/fixtures/`) e gera o relatório e um snapshot JSON. Antes de mexer em qualquer peso ou constante:

1. rode `npm run balance:review` e `npm run balance:compare` antes e depois;
2. descreva a mudança e o efeito no PR;
3. não edite `balance-snapshot-v1.json`, que é o baseline congelado da V1.

## Contribuindo

Ideias, bugs e PRs são bem-vindos. Antes de abrir um PR:

```bash
npm run lint && npm run typecheck && npm test
```

Algumas regras do projeto:

- **O engine é puro.** Nada em `src/game/` importa `react`, `next` ou depende do navegador (há um teste que garante isso).
- **Sem fórmulas na UI.** A interface só mostra o que o engine devolve.
- **Dados honestos.** Se um dado não puder ser obtido por completo, ele é marcado como parcial ou indisponível e a UI não afirma o que falta.
- **Decisões de arquitetura** ficam registradas em [DECISIONS.md](DECISIONS.md).

Boas primeiras contribuições: o `GitHubApiDataSource`, novas linguagens/classes, novos casos para as fixtures de balanceamento e traduções.

## Licença

A definir.
