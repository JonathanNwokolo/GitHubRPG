# GitHub RPG

Transforma a jornada **pública** de uma pessoa no GitHub em uma ficha de personagem de RPG: nível, XP, atributos, classe, skills, conquistas e títulos.

> O GitHub RPG **não mede** inteligência, talento, qualidade de código, competência ou valor profissional. É uma gamificação do que está visível publicamente no GitHub, feita para ser divertida.

## Estado do projeto

- **Game Engine V2 ativa em produção**, com V1.1 preservada como base e fallback. O estado operacional canônico, flags, cache, polling, consumidores V1 e rollback estão em [PRODUCTION_STATUS.md](docs/game-engine-v2/PRODUCTION_STATUS.md).
- **CI e release protegidos** por lint, typecheck, testes, build e a suíte E2E completa. O fluxo operacional e os checks obrigatórios estão em [docs/operations/CI.md](docs/operations/CI.md).
- **Duas fontes de dados**, escolhidas no servidor por `GITHUB_DATA_SOURCE`: `mock` (padrão em desenvolvimento; perfis de demonstração determinísticos, a interface avisa "Dados de demonstração") e `github` (`GitHubApiDataSource`: perfis **públicos** reais via REST + GraphQL, com cache, timeout e tratamento de rate limit). Em produção a escolha é obrigatória. Veja [GITHUB_API_INTEGRATION.md](GITHUB_API_INTEGRATION.md), [ENGINE_ARCHITECTURE.md](docs/architecture/ENGINE_ARCHITECTURE.md) e [MOCKS.md](MOCKS.md).
- Projeto **open source** sob licença MIT. Contribuições e ideias são bem-vindas (veja abaixo).

## Como rodar

Requisitos: Node.js 24 e npm (mesma major usada na Vercel e no CI).

```bash
npm install
npm run dev        # http://localhost:3000
```

Sem login e sem chave de API (fonte `mock`): digite um usuário na página inicial. Os perfis de demonstração fixos são `rookie-dev`, `veteran-dev`, `polyglot-dev`, `popular-dev` e `empty-dev`; `missing-dev` simula um perfil inexistente (404). Qualquer outro nome gera um personagem determinístico a partir do próprio nome.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção e servidor |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | Testes unitários e de integração (Vitest) |
| `npm run test:e2e` | Testes e2e (Playwright). Rode `npm run build` antes: eles sobem o app com `next start` |
| `npm run balance:review` | Regera [BALANCE_REVIEW.md](docs/game-engine-v1/BALANCE_REVIEW.md) e `balance-snapshot.json` a partir do engine real |
| `npm run github:smoke -- <usuario>` | Consulta a API real do GitHub e imprime um resumo seguro (opcional, fora da suíte de testes e do CI) |
| `npm run balance:compare` | Compara `balance-snapshot-v1.json` com o snapshot atual em [BALANCE_V1_VS_V1_1.md](docs/game-engine-v1/BALANCE_V1_VS_V1_1.md) |

Na primeira vez que rodar os e2e, instale o navegador: `npx playwright install chromium`.

### Usando perfis reais do GitHub

```bash
cp .env.example .env.local   # depois edite:
# GITHUB_DATA_SOURCE=github
# GITHUB_TOKEN=<fine-grained PAT, somente repositórios públicos, sem permissões extras>
npm run dev
```

O token é opcional (sem ele só o REST anônimo funciona, 60 req/h, e as métricas de contribuição ficam indisponíveis) e **nunca** chega ao navegador: só o servidor fala com o GitHub. Verificação manual contra a API real: `npm run github:smoke -- torvalds`. Detalhes, limites e cobertura por métrica em [GITHUB_API_INTEGRATION.md](GITHUB_API_INTEGRATION.md).

## Deployment

Plataforma recomendada: Vercel, com framework detectado como Next.js. O build de produção usa:

```bash
npm run build
```

Variáveis de produção:

```bash
GITHUB_DATA_SOURCE=github
GITHUB_TOKEN=<fine-grained PAT server-only>
NEXT_PUBLIC_SITE_URL=https://githubrpg.vercel.app
```

`NEXT_PUBLIC_SITE_URL` é a URL pública do **site** (não é segredo). Ela alimenta `metadataBase`, os canonicals, as imagens Open Graph/Twitter e o link do botão "Compartilhar perfil". Sem ela, builds de produção usam `https://githubrpg.vercel.app` e desenvolvimento/testes usam `http://localhost:3000`; defina-a em outro domínio ou em um domínio próprio. Nunca coloque o token (nem qualquer segredo) em variável `NEXT_PUBLIC_*`.

`GITHUB_TOKEN` não deve usar prefixo `NEXT_PUBLIC_`. Sem `GITHUB_DATA_SOURCE`, produção falha explicitamente; com `GITHUB_DATA_SOURCE=github` e sem token, o app usa REST anônimo, mantém o básico funcional e deixa métricas de contribuição indisponíveis, com risco maior de rate limit.

O datasource V1 mantém cache em memória por instância. A entrega V2 adiciona Vercel Runtime Cache para o personagem final, mas evidências e deduplicação continuam limitadas por instância; veja as limitações exatas em [PRODUCTION_STATUS.md](docs/game-engine-v2/PRODUCTION_STATUS.md).

## Compartilhamento e SEO

- **Compartilhar perfil** (no modal do Cartão de Herói) compartilha o link da ficha, `{site}/{usuario}`, e não a URL da imagem. Usa a Web Share API quando o navegador a tem; senão copia o link ("Link copiado!") e, se nem a área de transferência estiver disponível, mostra o link para copiar à mão. Fechar a folha nativa não é erro.
- **Baixar Cartão de Herói** continua baixando o PNG 1200x630 (`/api/card/{usuario}`).
- Cada ficha tem `canonical` em `/{usuario-em-minusculas}` e Open Graph/Twitter (`summary_large_image`) apontando para `/api/card/{usuario}`. A landing tem seu próprio canonical e metadados.
- Um usuário inexistente continua sendo um **HTTP 404 real** (com `noindex`). Por isso `/[username]` não tem `loading.tsx`: ele faria o Next transmitir a resposta antes da página rodar e o 404 viraria 200. O esqueleto de carregamento é o `fallback` de um `<Suspense>` dentro da página, depois de uma checagem barata de existência.
- Falhas ao buscar o perfil caem em `error.tsx` (mensagem amigável, "Tentar novamente", volta à landing; sem stack, JSON ou token).

### Identidade e distribuição

- **Por que esta classe?** (botão ao lado da classe): explica a classe e a subclasse com os bytes reais de linguagem. É só leitura: usa o arquétipo que o engine já decidiu, `classForLanguage` e `LANGUAGE_RULES` (nada é copiado) e não faz nenhuma requisição nova ao GitHub (`src/features/character/classExplanation.ts`).
- **Badge para README** (`/api/badge/{usuario}`, SVG de ~0,9 kB, sem script, com todo texto escapado). O botão **Adicionar ao README** mostra o Markdown pronto:

  ```md
  [![GitHub RPG](https://githubrpg.vercel.app/api/badge/USUARIO)](https://githubrpg.vercel.app/USUARIO)
  ```

  Cache: `public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400`. Usuário inexistente é 404 (sem badge falso).
- **Compartilhar conquista / capítulo da Crônica**: `/api/card/{usuario}/achievement/{id}` e `/api/card/{usuario}/chronicle/{ano}` (PNG 1200x630, `?lang=en` opcional). O id só *seleciona*: a rota carrega o personagem real e responde 404 se a conquista não estiver desbloqueada (ou o capítulo não existir/não for compartilhável), 400 se o id for malformado. Os três cards (Herói, Conquista, Crônica) usam as mesmas primitivas de `src/features/share/cardKit.tsx`.
- O compartilhamento (Web Share → área de transferência → link para copiar à mão) envia o **link do perfil**: a ficha ainda não tem URL própria por conquista ou capítulo, e um link mais profundo só abriria a página genérica. A imagem (baixar) é o conteúdo específico.
- Limitação conhecida: o cache de dados do GitHub é por instância do servidor (em memória). Um badge muito acessado depende do CDN (`s-maxage`) para não gerar um fetch por instância fria. Se isso não bastar em escala real, o próximo passo é infraestrutura de cache compartilhado (fora deste ciclo).

## Como funciona

O fluxo de dados é unidirecional e cada camada tem uma responsabilidade:

```
GitHubDataSource  →  validação (Zod)  →  normalização  →  Game Engine  →  RPGCharacter  →  UI
```

- `src/data/`: fontes de dados (hoje o mock), contratos, validação e normalização.
- `src/game/`: o **Game Engine**. É puro: sem React, sem Next, sem rede, sem relógio. Mesmo input, mesmo personagem. Toda regra de balanceamento mora em [src/game/constants.ts](src/game/constants.ts).
- `src/features/`, `src/components/`, `src/design-system/`: interface (Next.js App Router, Tailwind, tema pixel art). Nenhuma fórmula de jogo fica na UI.
- `src/i18n/`: textos da interface em pt-BR e en.

As regras do jogo (XP, atributos, classes, skills, conquistas, títulos) estão descritas em [GAME_BALANCE.md](docs/architecture/GAME_BALANCE.md). Em caso de divergência, o código vence.

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
- **Decisões de arquitetura** ficam registradas em [DECISIONS.md](docs/architecture/DECISIONS.md).

Boas primeiras contribuições: o `GitHubApiDataSource`, novas linguagens/classes, novos casos para as fixtures de balanceamento e traduções.

## Licença

[MIT](LICENSE).
