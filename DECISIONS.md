# Registro de Decisões de Arquitetura (DECISIONS.md)

Este documento registra as decisões de arquitetura de software, design de sistemas e resolução de ambiguidades do projeto **GitHub RPG**.

---

## ADR 001: Isolamento e Pureza da Game Engine

### Contexto
O projeto requer transformar métricas técnicas do GitHub em um universo de RPG com classes, masmorras, missões e atributos, com garantia de facilidade de testes e futura migração para uma API real.

### Decisão
Toda a lógica de RPG reside exclusivamente dentro de `src/game/`. Nenhum arquivo dentro de `src/game/` pode importar módulos de `react`, `next`, `@testing-library`, ou depender de variáveis de ambiente do navegador.
O fluxo de dados é estritamente unidirecional:
`GitHubDataSource -> Zod Validation -> NormalizedDeveloperProfile -> Game Engine -> RPGCharacter -> UI Component`.

### Consequências
- A Game Engine pode ser testada com 100% de cobertura unitária sem necessidade de montar componentes React.
- Componentes React tornam-se puramente declarativos ("burros"), focados unicamente em renderização, layout, acessibilidade e interatividade.

---

## ADR 002: Algoritmo de Hashing e PRNG Determinístico

### Contexto
O mock de dados precisa ser estritamente determinístico: o mesmo `username` deve gerar rigorosamente o mesmo perfil, atributos, masmorras e avatar em qualquer execução ou navegador, sem recorrer a `Math.random()`.

### Decisão
Implementamos um gerador baseado em:
1. **Hash de String**: Algoritmo FNV-1a de 32 bits, que mapeia qualquer string de username para um inteiro unsigned de 32 bits.
2. **PRNG (Gerador de Números Pseudoaleatórios)**: Algoritmo **Mulberry32**, reconhecido por sua distribuição uniforme, velocidade e ciclo de 2³².

### Consequências
- Zero dependências externas para geração determinística.
- Garantia de paridade absoluta entre execuções para qualquer nome de usuário informado.

---

## ADR 003: Abstração da Camada de Dados (Data Source)

### Contexto
Atualmente o projeto opera exclusivamente com dados simulados (frontend-only), mas deve estar arquitetado para que uma futura integração com a API do GitHub substitua os mocks sem alterar a interface nem as regras de negócio.

### Decisão
Definiu-se a interface `GitHubDataSource` contendo:
- `fetchDeveloperProfile(username: string): Promise<NormalizedDeveloperProfile>`
- `searchProfiles(query: string): Promise<DeveloperSummary[]>`

A factory `createDataSource(): GitHubDataSource` instancia `MockDataSource`. No futuro, a factory poderá avaliar uma variável de ambiente ou configuração e instanciar `GitHubApiDataSource`.

### Consequências
- Nenhuma tela ou hook importa diretamente `MockDataSource`.
- A validação de esquema via Zod assegura que qualquer retorno respeite o contrato estrito de `NormalizedDeveloperProfile`.

---

## ADR 004: Sistema de Som via Web Audio API Sintetizada

### Contexto
O jogo se beneficia de feedback tátil e sonoro retrô (level up, clique de botão, vitória de duelo), porém o escopo proíbe dependências pesadas e ativos externos.

### Decisão
Criou-se um sintetizador leve em `lib/audio/soundEffects.ts` utilizando a `Web Audio API` nativa do navegador (osciladores `square` e `sine` com envelopes ADSR). O áudio é estritamente **desativado por padrão**, com toggle de ativação explícito nas configurações e no cabeçalho.

### Consequências
- Zero kilobytes em arquivos de áudio externos (.mp3/.wav).
- Controle absoluto de volume e respeito à acessibilidade.

---

## ADR 005: Avatar Procedural SVG Determinístico

### Contexto
Não podemos utilizar o avatar real do GitHub nem APIs externas de imagem ou IA. O avatar deve ter tema dark fantasy / pixel art retrô e ser gerado determinísticamente a partir do hash do usuário.

### Decisão
Construção de um gerador procedural em SVG (`game/avatar/proceduralAvatar.ts`) que combina:
- Cor de fundo e aura elemental derivada da classe.
- Formato do elmo/chapéu baseado na classe principal.
- Tom de pele e olhos estilizados em grade de pixel.
- Acessório/adereço de classe (cajado, espada, runas, frasco de alquimia, etc.).
- Moldura de raridade baseada no nível do herói.

### Consequências
- Renderização instantânea, escalável e sem requisições HTTP adicionais.
- Acessibilidade garantida com `<svg role="img" aria-label="...">`.

---

## ADR 006: Internacionalização Tipada sem Overhead de Bibliotecas

### Contexto
O sistema deve suportar `pt-BR` (padrão) e `en`. Não é permitido nenhum texto hardcoded na interface de produto.

### Decisão
Implementou-se um sistema enxuto de dicionários TypeScript tipados em `i18n/`, garantindo que chaves inexistentes ou divergências entre línguas gerem erro em tempo de compilação do TypeScript.

### Consequências
- Bundle leve e ausência de dependências de runtime como `react-i18next`.
- Tipagem estrita de todas as mensagens do sistema.

---

## ADR 007: Geração de Share Card Cliente via Canvas HTML5

### Contexto
O usuário deve poder gerar e baixar o cartão de herói sem requisições a serviços externos de renderização gráfica.

### Decisão
Utilização da API nativa de `<canvas>` 2D no navegador, desenhando o card com a moldura de fantasia sombria, avatar procedural, atributos em barras estilizadas e QR code/badge local. Exportação nativa via `toDataURL('image/png')`.

### Consequências
- Geração instantânea, offline e gratuita.
- Zero dependências de headless browsers em servidor.

---

## ADR 008: Exclusão do Sistema de Guilda e Ranking Coletivo

### Contexto
Por decisão de produto expressa do usuário, o sistema coletivo de guilda e ranking global não é necessário nesta etapa da aplicação.

### Decisão
- Remoção completa da rota `/guild`.
- Remoção do método `fetchGuildMembers()` da interface `GitHubDataSource` e de `MockDataSource`.
- Remoção dos links de navegação correspondentes no `Navbar` e `Footer`.
- Remoção dos termos correspondentes nos dicionários de internacionalização (`ptBR` e `en`).

### Consequências
- Escopo mais enxuto e focado na experiência primária do usuário com sua própria ficha de herói, masmorras, conquistas e duelo.
- Redução de complexidade e menor pegada de código no bundle de produção.

---

## ADR 009: Padronização de Componentes, Legibilidade Tipográfica e Responsividade

### Contexto
O usuário apontou dificuldade de leitura em textos com fonte pixelada pequena, além de esmagamento de cards em resoluções intermediárias (como os 5 cards de personas na landing page e cards de masmorras/habilidades/missões). Textos com caracteres acentuados em português tornavam-se ilegíveis quando renderizados com `Press Start 2P` em tamanhos menores que 14px.

### Decisão
1. **Regra de Ouro Tipográfica**:
   - `font-pixel` restrita exclusivamente a títulos temáticos de alto impacto (Hero "GitHub RPG", títulos de seções principais) e números de grande escala.
   - Todo conteúdo interativo e textual (botões, badges, abas, inputs, títulos de cards, descrições, lore, valores estatísticos, modais e logs de batalha) migrado para tipografia padrão de alta legibilidade (`font-sans` / `font-mono`) com contraste WCAG AA/AAA (`text-slate-100` a `text-slate-300`).
2. **Responsividade de Grids**:
   - Persona Cards na Landing migrados de `grid-cols-5` rígido para grid responsivo inteligente (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4`).
   - Masmorras e Missões adaptadas com layouts flexíveis que evitam quebra ou corte de nomes de repositórios longos.
   - Atributos e Resumo de Atividades com quebra adaptativa e valores numéricos monoespaçados anti-overflow.
3. **Acessibilidade e Usabilidade Mobile**:
   - Áreas de toque aumentadas para o padrão mínimo de 44px em botões e tabs.
   - Diálogos com contenção vertical (`max-h-[90vh] overflow-y-auto`) prevenindo transbordamento em telas pequenas de smartphones.

### Consequências
- Aumento drástico na legibilidade e experiência do usuário (especialmente em telas mobile e tablets).
- Manutenção completa da identidade visual *dark fantasy* sem comprometer os padrões de acessibilidade moderna.
- Conformidade integral com WCAG AA.

---

## ADR 010: Sistema de Ícones Pixel Art RPG 16x16 (Estilo Itch.io)

### Contexto
O usuário relatou que os ícones anteriores (linhas vetoriais suaves do Lucide) pareciam deslocados e destoavam da proposta de RPG de fantasia sombria retrô. Foi solicitada a substituição por ícones inspirados nos pacotes de assets pixel art 16x16 consagrados do itch.io (`itch.io/game-assets/free/genre-rpg/tag-icons`).

### Decisão
Criou-se uma biblioteca de ícones em `src/design-system/icons/PixelIcons.tsx` contendo mais de 44 ícones 16x16 genuínos em SVG com renderização pixelada precisa:
- **Técnica de Renderização**: Uso de `viewBox="0 0 16 16"` com `shapeRendering="crispEdges"`, renderizando cada pixel através de coordenadas exatas de grade (sem anti-aliasing / desfoque vetorial).
- **Categorias Implementadas**:
  - *Armas & Equipamentos*: Espadas, Escudos, Arco, Martelo, Bigorna.
  - *Magia & Lore*: Tomo Arcano, Chamas, Centelhas, Poção, Raios.
  - *Mundo & Exploração*: Castelo/Masmorra, Bússola, Marcadores, Globo, Olho de Observação.
  - *Dev Rúnico*: Git Commit rúnico, Pull Request, Fork, Código, Camadas.
  - *Economia & Conquistas*: Moedas de Ouro, Coroa, Troféu, Estrela, Download, Compartilhar.
  - *Sistema & Acessibilidade*: Som On/Off, Engrenagem, Usuários, Validações (Check, X, Alerta, Tranca), Busca, Relógio, Coração, Fantasma, Seta.
- **Substituição Completa**: 100% dos ícones vetoriais de linha em componentes de produto, design system e páginas foram substituídos pelos respectivos `PixelIcons`.
- **Zero Dependências Externas**: Todos os ícones são componentes React nativos, com suporte a cores temáticas via `fill="currentColor"` (Tailwind CSS) e compatibilidade total com leitores de tela via `aria-hidden="true"`.

### Consequências
- Estética 100% alinhada com jogos retrô de fantasia sombria, remetendo diretamente aos packs de assets do itch.io.
- Eliminação da dependência visual de ícones corporativos modernos de SaaS/dashboard.
- Fidelidade visual nítida em qualquer densidade de pixels (resoluções retina, mobile e desktop).


---

## ADR 010: Game Engine V1 (substitui o engine V0)

### Decisão
O engine V0 (XP linear, janela de 12 meses, masmorras, missões, buffs, duelo) foi substituído pelo Game Engine V1: histórico completo, cobertura de dados (`full`/`partial`/`unavailable`), XP com retornos decrescentes, conquistas e títulos como camadas independentes. Fluxo: `GitHubDataSource → RawGitHubData → validação → DeveloperProfile → RPGCharacter → UI`.

### Consequências
- Guilda, Masmorras, Buffs e Duelo saem da V1 (ADR 008 estendido).
- `fetchDeveloperProfile`/`searchProfiles` e `NormalizedDeveloperProfile` deixam de existir; ver ENGINE_ARCHITECTURE.md e GAME_BALANCE.md.
- ADRs 001–003 continuam válidos no princípio; os nomes de tipos/métodos citados neles são os do V0.
