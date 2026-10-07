# GitHub RPG Game Engine V2

> Status: especificação de produto e engenharia para implementação futura. Nenhum item deste documento altera a V1.1, seus snapshots, seu balanceamento, sua API ou sua UI.
>
> Regra de leitura: valores marcados **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE** são implementáveis como defaults versionados, mas só podem ser promovidos a balanceamento V2.0 após o benchmark da seção 22.

## 1. Princípios

1. O fluxo causal é sempre `dados reais -> evidências -> interpretação -> personagem`; nunca parte de um personagem desejado.
2. O produto descreve atividade pública observável e gamificada, não competência, senioridade, qualidade profissional nem empregabilidade.
3. A V2 é pura e determinística: o mesmo input normalizado, a mesma versão de regras e a mesma `referenceDate` produzem bytes semanticamente equivalentes.
4. Ausência de dado, zero observado e cobertura parcial são estados diferentes.
5. Linguagens definem a identidade base; frameworks/meta-frameworks refinam prática; tooling apenas complementa. A hierarquia é **Afinidades > Escolas > Artefatos**.
6. Fork não é criação própria. Evidência em fork não desbloqueia identidade, evolução, conquista ou título na V2 inicial.
7. A especificidade é conquistada por evidência. Todo perfil recebe uma classe base; subclasse e evolução podem ser `null`.
8. Level/XP, cinco atributos e seus pesos permanecem congelados na V1.1 nesta fase. A V2 apenas os consome.
9. Resultados importantes carregam explicação, confiança, cobertura, evidências positivas e motivos de não concessão.
10. A V2 experimental roda ao lado da V1.1. Não reutiliza snapshots, IDs de snapshot nem namespace de cache da V1.1.

### Escopo fechado

- Projetar taxonomia, detecção, decisões, catálogos e contratos V2.
- Não redesenhar Level/XP, atributos ou Duelo.
- Não criar classes híbridas. `Classe / Subclasse / Evolução + Título` já fornece composição suficiente.
- Não usar IA generativa, aleatoriedade, sinais privados ou métricas de uso do próprio GitHub RPG.

## 2. Taxonomia

### Afinidades

Afinidade é uma linguagem reconhecida pelo GitHub Linguist, agregada por bytes reais em repositórios próprios. Cada afinidade guarda bytes, presença em repositórios, participação e cobertura. HTML e CSS continuam válidos porque o GitHub os fornece como linguagens, embora sejam marcação/estilo; a explicação não deve chamá-los de linguagem de programação.

### Escolas

Escola é framework ou meta-framework diretamente declarado e corroborado em um repositório. Catálogo inicial: **22**.

| Família | Escolas | Fronteira |
|---|---|---|
| UI web | React, Vue, Svelte, Angular | Framework/biblioteca estrutural de UI; CSS libraries não entram. |
| Meta-framework web | Next.js, Nuxt, SvelteKit, Astro, Remix | Orquestra aplicação, rotas/renderização/build sobre a camada web. |
| Node backend | Express, NestJS, Fastify | Runtime Node sozinho não é Escola. |
| Python web | Django, Flask, FastAPI | Bibliotecas auxiliares não contam. |
| Ecossistemas server | Laravel, Rails, Spring, ASP.NET Core | Exige pacote/plugin estrutural direto. |
| Mobile/multiplataforma | React Native, Expo, Flutter | Expo pode coexistir com React Native; evidências não são fundidas. |

Aliases (`next` -> Next.js, `@nestjs/core` -> NestJS etc.) pertencem a um registro versionado. Pacotes adaptadores só corroboram; não criam Escola sozinhos.

### Artefatos

Artefato é ferramenta, plataforma de build/teste/entrega, biblioteca visual ou runtime de empacotamento. Catálogo inicial: **22**.

| Família | Artefatos |
|---|---|
| Build/bundle | Vite, Webpack, Rollup, esbuild |
| Entrega/infra | Docker, GitHub Actions, Terraform |
| Testes/qualidade | Playwright, Vitest, Jest, Cypress, Storybook |
| UI/estilo | Tailwind CSS, Material UI, Chakra UI, shadcn/ui |
| Desktop | Electron, Tauri |
| Gestão/toolchain | pnpm, Yarn, ESLint, Prettier |

Fronteiras: Tailwind/MUI/Chakra/shadcn são Artefatos, não Escolas; Docker/GitHub Actions/Terraform são tooling operacional; Electron/Tauri são shells de aplicação; gerenciador de pacotes sozinho nunca decide subclasse.

## 3. Fontes de evidência

Ordem de autoridade por repositório:

1. Manifesto direto (`package.json`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle[.kts]`, `*.csproj`).
2. Arquivo de configuração inequívoco (`next.config.*`, `vite.config.*`, workflow YAML, `Dockerfile`, etc.).
3. Lockfile, apenas para corroborar dependência direta já identificada; dependência transitiva nunca conta.
4. Linguagens em bytes e metadados do repositório para contexto; nome, descrição e tópicos nunca são prova suficiente.

### Unidade e seleção

- A unidade de evidência é `(repoId, detectorId, artifactId, sourcePath, sourceKind, observedAt)`; duplicatas no mesmo repo contam uma vez por item.
- Apenas repositórios próprios, não arquivados e não vazios entram no scoring inicial. Arquivado pode aparecer na explicação histórica, com peso 0.
- **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE:** examinar no máximo 30 repositórios próprios, ordenados por `pushedAt desc`, com desempate `stars desc`, `name asc`. A cobertura registra elegíveis, examinados e falhas.
- Conteúdo remoto deve ser coletado server-side, com cache e orçamento explícito. O fluxo REST anônimo continua funcional; se conteúdo suficiente não puder ser lido, Escolas/Artefatos ficam `unavailable`, não zero.
- Um repo pode provar várias Escolas/Artefatos; monorepo conta como um repo para recorrência, ainda que tenha vários manifests.
- Linguagens preservam o contrato atual: GraphQL pagina `user.repositories` em blocos de 50 e agrega `languages.edges.size`; quando `languages` for nulo ou `totalCount` exceder as edges recebidas, o fallback REST `/languages` atende apenas repos relevantes, na ordem original e sob cap, marcando coverage partial quando não cobrir todos. `repositoryTransport: "rest"` continua podendo forçar o caminho REST sem token.

## 4. Classes base

As 12 classes da V1 permanecem como arquétipos de afinidade/fallback. O mapeamento atual é preservado; expansões são aditivas e devem ser benchmarkadas.

| Classe | Linguagens V1 preservadas | Expansão V2 candidata | Identidade |
|---|---|---|---|
| Mago | JavaScript, TypeScript | CoffeeScript | fluxos dinâmicos e ecossistema web |
| Alquimista | Python | R, Jupyter Notebook* | dados, scripts e transformação |
| Guerreiro | Rust, C, C++ | Assembly, Zig | sistemas, metal e memória |
| Patrulheiro | Go | Elixir, Erlang | concorrência, serviços e redes |
| Paladino | Java, C# | Scala | contratos e ecossistemas estruturados |
| Bardo | HTML, CSS | SCSS, Less | composição visual e apresentação |
| Ladino | Shell, PowerShell | Batchfile, Fish | terminal e automação |
| Oráculo | Ruby | — | expressividade e convenção |
| Escriba | PHP | Hack | tradição e publicação web |
| Sentinela | Kotlin, Swift | Objective-C | plataformas móveis nativas |
| Tecelão | Dart | — | interfaces multiplataforma |
| Aventureiro | fallback | toda linguagem não mapeada ou ausência | identidade inicial sem inferência falsa |

\* `Jupyter Notebook` só pode ser mapeado se a fonte normalizada o tratar como linguagem Linguist com bytes; a presença de arquivo `.ipynb` isolada não basta. Todas as expansões são **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE**. Linguagem desconhecida nunca é aproximada por nome: resulta em Aventureiro, mas permanece visível como Afinidade.

Decisão de migração: todos os mapeamentos V1 permanecem, nenhum é removido. O catálogo apenas propõe expansões. O que deixa de fazer sentido na V2 é usar a segunda linguagem como subclasse; ela continua como Afinidade secundária e ainda pode participar de títulos híbridos.

## 5. Arquétipos de prática

Há exatamente cinco arquétipos de prática. Somados aos 12 acima, o catálogo tem **17 arquétipos**. “Engenheiro Rúnico” sobrepõe Artífice + título/evolução; “Invocador” sobrepõe Arquiteto/Artífice e depende de metáfora, não de evidência distinta. Portanto, não entram como arquétipos.

| Arquétipo | Evidência dominante | Evidência de apoio | Anti-sinal | Papel narrativo |
|---|---|---|---|---|
| Arquiteto | meta-frameworks, backend estrutural, camadas frontend+backend | diversidade de Escolas, repos próprios maduros, Experiência | pacote isolado, template único | organiza sistemas e portais |
| Artífice | build/bundle, desktop, toolchain, automação de projeto | repos próprios, diversidade de Artefatos, Versatilidade | só formatador/linter | constrói as ferramentas da oficina |
| Ilusionista | UI web/mobile recorrente e tooling visual | CSS/Bardo, Storybook, testes E2E de UI, Versatilidade | UI em um único starter | transforma interfaces em experiência |
| Guardião | testes recorrentes, reviews e colaboração | consistência, cobertura de qualidade/CI | reviews indisponíveis sem substituto | protege contratos e colaboração |
| Cronomante | CI/CD, automação, infra e Shell recorrentes | consistência temporal, workflows, containers | um workflow gerado isolado | rege ciclos, pipelines e entrega |

## 6. Subclasses

Na V2, “subclasse” significa especialização de prática, nunca simplesmente a segunda linguagem.

1. Calcular os cinco `ArchetypeAffinity` sem olhar a classe desejada.
2. Candidato precisa de cobertura de Escola/Artefato ao menos `partial`, evidência em pelo menos dois repositórios próprios e confiança `medium` ou `high`.
3. Conceder somente decisão `strong`: **INITIAL BALANCE CANDIDATE:** score >= 60 e margem >= 8 sobre o segundo colocado.
4. Score >= 45 sem todos os gates é `possible`: aparece na explicação, mas `subclass.value = null`.
5. Abaixo disso é `insufficient`. Com dados essenciais indisponíveis, é `unavailable`, não `insufficient`.
6. Empate ou margem curta: comparar, nesta ordem, (a) maior número de repos de evidência primária, (b) maior confiança, (c) maior score sem atributos, (d) ordem estável `Arquiteto, Artífice, Ilusionista, Guardião, Cronomante`. Mesmo vencendo o desempate, a margem mínima continua obrigatória; sem margem, não há subclasse.

Não existe híbrido próprio. `Mago / Arquiteto`, por exemplo, é o formato canônico. O resultado V1.1 pode ser mostrado em ferramentas de comparação, mas nunca substitui silenciosamente uma subclasse V2 ausente.

## 7. Scoring

Todos os componentes são normalizados em 0..100, arredondados apenas na apresentação. Cálculos internos usam precisão completa e clamp final.

### Afinidade de Escola

`FrameworkAffinity = 0,35*repoPresence + 0,25*recurrence + 0,20*recency + 0,20*dependencyStrength`

- `repoPresence = 100 * min(evidenceRepos / 8, 1)`.
- `recurrence = 100 * evidenceRepos / examinedRelevantRepos`, exigindo denominador >= 1.
- `recency`: média ponderada por repo: <=1 ano 100; <=2 anos 75; <=4 anos 45; >4 anos 20.
- `dependencyStrength`: direta de produção 100; direta de peer 80; direta de desenvolvimento 60; config inequívoca 55; lockfile corroborante +5, limitado a 100; transitiva 0.

### Afinidade de Artefato

Mesmos quatro componentes, mas `ToolAffinity = 0,30*repoPresence + 0,20*recurrence + 0,15*recency + 0,35*declarationStrength`. O teto de contribuição de todos os Artefatos para um arquétipo é 30% do score: tooling refina, não domina.

### Componentes de prática

- `structural`: Escolas estruturais/meta-frameworks e diversidade de camadas.
- `craft`: build, bundling, desktop e toolchain.
- `visual`: UI, estilo, Storybook e E2E visual.
- `quality`: testing, reviews e colaboração.
- `collaboration`: PRs, reviews e issues com coverage explícita, normalizados pelos mesmos anchors V1 congelados usados pelos atributos quando disponíveis.
- `automation`: CI/CD, infra, containers e Shell.
- `maturity`: Experiência e recorrência em repos próprios.
- `consistency`: atributo V1 congelado.
- `versatility`: atributo V1 congelado.

| Arquétipo | Fórmula inicial 0..100 |
|---|---|
| Arquiteto | `0,45 structural + 0,20 maturity + 0,15 versatility + 0,10 quality + 0,10 automation` |
| Artífice | `0,50 craft + 0,20 automation + 0,15 versatility + 0,15 maturity` |
| Ilusionista | `0,55 visual + 0,15 structural + 0,15 versatility + 0,15 maturity` |
| Guardião | `0,40 quality + 0,20 collaboration + 0,20 consistency + 0,10 maturity + 0,10 automation` |
| Cronomante | `0,50 automation + 0,20 consistency + 0,15 craft + 0,15 maturity` |

Pesos, saturações, janelas de recência, score 60, faixa possible 45 e margem 8 são **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE**. Nenhum atributo isolado pode contribuir mais de 20 pontos; nenhuma subclasse nasce apenas de atributos.

## 8. Confidence

`score` responde “quanto o padrão combina”; `confidence` responde “quão confiável é a observação”. Não são intercambiáveis.

| Confidence | Regra inicial |
|---|---|
| high | cobertura `full`, >=5 repos próprios de evidência, >=2 tipos de fonte primária e nenhuma ambiguidade material |
| medium | cobertura `full/partial`, >=2 repos próprios e ao menos uma fonte primária direta |
| low | 1 repo, fonte somente de configuração, ou cobertura parcial que pode mudar a liderança |
| unavailable | fonte necessária não foi obtida; não equivale a low nem a score zero |

Cada afinidade inclui `score`, `confidence`, `evidenceRepoCount`, `eligibleRepoCount`, `examinedRepoCount`, `coverage`, `lastEvidenceAt`, fontes e warnings. Os limites 5/2 são **BALANCE TUNABLE**.

## 9. Framework detection specification

| Ecossistema | Manifestos | Declarações diretas | Corroboração/config |
|---|---|---|---|
| JS/TS | `package.json` | dependencies > peerDependencies > devDependencies | lockfiles, configs com nome inequívoco |
| Python | `pyproject.toml`, `requirements*.txt` | project/Poetry/PDM deps ou linha direta | `poetry.lock` apenas corrobora |
| Ruby | `Gemfile` | gem direta | `Gemfile.lock` corrobora |
| PHP | `composer.json` | require > require-dev | `composer.lock` corrobora |
| Java/Kotlin | `pom.xml`, `build.gradle[.kts]` | dependency/plugin direto | lock/catalog só corrobora |
| C# | `*.csproj`, `Directory.Packages.props` | PackageReference/FrameworkReference | assets gerados não contam |
| Dart | `pubspec.yaml` | dependencies > dev_dependencies | lock corrobora |

Regras antífalso-positivo:

- Match por identidade exata de pacote/plugin, nunca substring solta.
- Pacote adaptador não prova o core sem declaração/config correspondente.
- Lockfile sozinho e dependência transitiva valem zero.
- Template, exemplo, fixture, vendored code e diretório gerado são ignorados por globs versionados.
- React Native e React são evidências distintas; Expo pode corroborar React Native, mas não fabricar React web.
- Next/Nuxt/SvelteKit implicam a Escola-base apenas para explicação de ecossistema; não duplicam o repo na recorrência da base sem dependência direta.
- Toda regra possui `detectorVersion` e testes positivos/negativos.

## 10. Tooling detection specification

Usa o mesmo pipeline, com registro separado e peso menor. Evidências inequívocas incluem configs de build/teste, `Dockerfile`, Compose, `.github/workflows/*.yml`, arquivos Terraform, configs ESLint/Prettier, package manager declarado e dependência direta. Um arquivo genérico `yaml`, script com palavra “docker” ou badge de README não conta. GitHub Actions conta uma vez por repo, não por workflow. shadcn/ui requer `components.json` ou dependências/componentes corroborantes; cópia visual isolada não conta.

## 11. Evoluções

Uma evolução é um reconhecimento raro acima de classe/subclasse. Exige subclasse `strong`, confidence `high`, cobertura suficiente e combinação de sinais; nunca somente level.

| ID / Evolução | Elegibilidade | Requisitos conceituais iniciais | Raridade-alvo | Explicação e razão |
|---|---|---|---|---|
| `evo-archmage` / Arquimago | Mago + Arquiteto ou Ilusionista | afinidade base >=70; subclasse >=75; >=2 Escolas strong; Experiência >=65 | mítica, ~1–3% | domínio recorrente do ecossistema, não apenas volume JS |
| `evo-celestial-guardian` / Guardião Celestial | qualquer classe + Guardião | Guardião >=78; reviews full >=200; testing em >=5 repos; Consistência >=70 | mítica, ~1–3% | une proteção técnica e colaboração observada |
| `evo-rune-master` / Mestre das Runas | Guerreiro/Paladino + Artífice | Artífice >=75; >=3 build/tool artifacts; >=2 repos de sistemas | lendária, ~3–5% | tooling recorrente próximo ao sistema |
| `evo-arcane-weaver` / Tecelão Arcano | Bardo/Tecelão/Mago + Ilusionista | Ilusionista >=75; UI em >=5 repos; Escola UI strong; Versatilidade >=60 | lendária, ~3–5% | linguagem visual mais prática comprovada |
| `evo-ancestral-forger` / Forjador Ancestral | qualquer classe + Artífice | conta >=8 anos; Artífice >=72; atividade observada em >=5 anos; >=4 Artefatos | lendária, ~3–5% | criação de ferramentas sustentada no tempo |
| `evo-high-chronomancer` / Alto Cronomante | Ladino/Patrulheiro + Cronomante | Cronomante >=78; CI + container/infra recorrentes; Consistência >=70 | mítica, ~1–3% | automação e cadência convergem |
| `evo-celestial-architect` / Arquiteto Celestial | qualquer classe + Arquiteto | Arquiteto >=80; frontend+backend strong; >=6 repos; Experiência >=75 | mítica, ~1–3% | diversidade estrutural madura e recorrente |

**Meta estatística inicial:** alguma evolução em 5–10% dos perfis maduros (conta >=3 anos e >=5 repos próprios examináveis); cada evolução mítica em 1–3%. Todos os números desta tabela são **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE**. “Lenda Viva” fica como conquista/título secreto, não evolução, evitando duplicação semântica.

## 12. Conquistas V2

Catálogo fechado inicial: **54 conquistas**, sendo **31 migradas da V1.1** com IDs preservados e **23 novas**. “Cumulativa” significa que degraus anteriores permanecem desbloqueados; conquistas compostas são booleanas e não cumulativas. Requisitos numéricos V1 são preservados. Requisitos novos são **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE**.

| ID / origem | Nome PT / EN | Lore PT / EN | Categoria; raridade | Requisito conceitual | Dados necessários | Cum.; secreta | Justificativa |
|---|---|---|---|---|---|---|---|
| `age-1` V1 | Primeiro Capítulo / First Chapter | A jornada ganhou seu primeiro tomo. / The journey earned its first volume. | Jornada; COMUM | conta >=1 ano | createdAt, referenceDate | sim; não | primeiro marco de longevidade |
| `age-3` V1 | Cronista do Código / Code Chronicler | Três anos já cabem na crônica. / Three years now fill the chronicle. | Jornada; RARO | conta >=3 anos | idade da conta | sim; não | consolida história observável |
| `age-5` V1 | Antigo Guardião / Elder Guardian | Cinco invernos protegendo o repositório. / Five winters guarding the repository. | Jornada; ÉPICO | conta >=5 anos | idade da conta | sim; não | maturidade temporal |
| `age-10` V1 | Lenda dos Repositórios / Repository Legend | Uma década gravada em commits. / A decade etched in commits. | Jornada; LENDÁRIO | conta >=10 anos | idade da conta | sim; não | marco raro de permanência |
| `age-15` V1 | Ancião do Código / Code Elder | Quinze anos atravessaram estas runas. / Fifteen years have crossed these runes. | Jornada; LENDÁRIO | conta >=15 anos | idade da conta | sim; não | preserva ápice V1 |
| `repos-1` V1 | Primeiro Repositório / First Repository | O primeiro domínio próprio foi erguido. / The first domain of your own was raised. | Repositórios; COMUM | >=1 repo próprio | ownRepositories full/partial | sim; não | inicia criação própria |
| `repos-5` V1 | Explorador / Explorer | Cinco caminhos foram abertos. / Five paths were opened. | Repositórios; COMUM | >=5 repos próprios | repos não-fork | sim; não | variedade inicial |
| `repos-25` V1 | Senhor dos Repositórios / Keeper of Repositories | Vinte e cinco domínios respondem ao chamado. / Twenty-five domains answer the call. | Repositórios; RARO | >=25 repos próprios | repos não-fork | sim; não | volume autoral recorrente |
| `repos-50` V1 | Construtor de Reinos / Realm Builder | Muitos reinos nasceram da mesma oficina. / Many realms rose from one workshop. | Repositórios; ÉPICO | >=50 repos próprios | repos não-fork | sim; não | escala autoral |
| `repos-100` V1 | Arquiteto de Mundos / Architect of Worlds | Cem mundos sustentam a cartografia. / One hundred worlds uphold the map. | Repositórios; LENDÁRIO | >=100 repos próprios | repos não-fork | sim; não | extremo de criação própria |
| `commits-100` V1 | Primeiros Golpes / First Strikes | A forja reconhece os primeiros golpes. / The forge knows its first strikes. | Atividade; COMUM | >=100 commits | commits | sim; não | atividade inicial |
| `commits-1000` V1 | Código em Chamas / Code Ablaze | Mil marcas acendem a forja. / A thousand marks ignite the forge. | Atividade; RARO | >=1.000 commits | commits | sim; não | atividade sustentada |
| `commits-5000` V1 | Tempestade de Código / Code Storm | A atividade troveja sobre o mapa. / Activity thunders across the map. | Atividade; ÉPICO | >=5.000 commits | commits | sim; não | grande volume histórico |
| `commits-10000` V1 | Forjador Incansável / Tireless Forger | Dez mil golpes sem abandonar a bigorna. / Ten thousand strikes without leaving the anvil. | Atividade; LENDÁRIO | >=10.000 commits | commits | sim; não | preserva ápice V1 |
| `prs-1` V1 | Primeiro Aliado / First Ally | A primeira ponte foi aberta. / The first bridge was opened. | PRs; COMUM | >=1 PR | pullRequests | sim; não | entrada em colaboração |
| `prs-25` V1 | Guardião Open Source / Open Source Guardian | Vinte e cinco pontes unem os reinos. / Twenty-five bridges join the realms. | PRs; RARO | >=25 PRs | pullRequests | sim; não | recorrência colaborativa |
| `prs-100` V1 | Campeão da Colaboração / Collaboration Champion | Cem propostas cruzaram fronteiras. / One hundred proposals crossed borders. | PRs; ÉPICO | >=100 PRs | pullRequests | sim; não | colaboração expressiva |
| `prs-500` V1 | Herói da Comunidade / Community Hero | Quinhentas alianças deixaram vestígios. / Five hundred alliances left their mark. | PRs; LENDÁRIO | >=500 PRs | pullRequests | sim; não | extremo colaborativo |
| `reviews-10` V1 | Olhar Atento / Watchful Eye | Dez passagens receberam atenção. / Ten passages received attention. | Reviews; COMUM | >=10 reviews | reviews | sim; não | participação, não qualidade |
| `reviews-50` V1 | Vigia do Código / Code Watcher | Cinquenta revisões sob a vigília. / Fifty reviews under watch. | Reviews; RARO | >=50 reviews | reviews | sim; não | recorrência de revisão |
| `reviews-200` V1 | Guardião da Qualidade / Quality Guardian | Duzentas revisões reforçam os portões. / Two hundred reviews reinforce the gates. | Reviews; ÉPICO | >=200 reviews | reviews | sim; não | participação intensa |
| `issues-10` V1 | Caçador de Bugs / Bug Hunter | Dez rastros foram registrados. / Ten trails were recorded. | Issues; COMUM | >=10 issues | issues | sim; não | investigação inicial |
| `issues-50` V1 | Caçador de Recompensas / Bounty Hunter | Cinquenta pistas chegaram ao mapa. / Fifty clues reached the map. | Issues; RARO | >=50 issues | issues | sim; não | contribuição investigativa |
| `issues-200` V1 | Exterminador de Bugs / Bug Exterminator | Duzentas ameaças foram nomeadas. / Two hundred threats were named. | Issues; ÉPICO | >=200 issues | issues | sim; não | grande volume de issues |
| `stars-1` V1 | Primeira Centelha / First Spark | Um viajante acendeu a primeira luz. / A traveler lit the first light. | Impacto; COMUM | >=1 estrela recebida | stars em repos próprios | sim; não | primeiro sinal externo |
| `stars-25` V1 | Brilho Crescente / Growing Radiance | Vinte e cinco luzes cercam a obra. / Twenty-five lights surround the work. | Impacto; RARO | >=25 estrelas | stars em repos próprios | sim; não | impacto acumulado |
| `stars-100` V1 | Constelação / Constellation | Cem estrelas formam um desenho. / One hundred stars form a pattern. | Impacto; ÉPICO | >=100 estrelas | stars em repos próprios | sim; não | reconhecimento amplo |
| `stars-1000` V1 | Farol dos Reinos / Beacon of the Realms | Mil estrelas orientam viajantes. / One thousand stars guide travelers. | Impacto; LENDÁRIO | >=1.000 estrelas | stars em repos próprios | sim; não | extremo de impacto público |
| `languages-2` V1 | Primeiro Encantamento / First Enchantment | Duas afinidades respondem ao chamado. / Two affinities answer the call. | Linguagens; COMUM | >=2 linguagens relevantes | afinidades >=5%, coverage | sim; não | diversidade inicial |
| `languages-5` V1 | Poliglota / Polyglot | Cinco afinidades dividem o grimório. / Five affinities share the grimoire. | Linguagens; RARO | >=5 linguagens relevantes | afinidades >=5% | sim; não | variedade comprovada |
| `languages-8` V1 | Mestre das Afinidades / Master of Affinities | Oito correntes percorrem o grimório. / Eight currents run through the grimoire. | Linguagens; ÉPICO | >=8 linguagens relevantes | afinidades >=5% | sim; não | ápice de variedade V1 |
| `active-days-30` V2 | Trilha Desperta / Awakened Trail | Trinta dias deixaram pegadas. / Thirty days left footprints. | Jornada; COMUM | >=30 dias ativos | activeDays | sim; não | mede presença, não volume bruto |
| `active-days-365` V2 | Calendário das Runas / Calendar of Runes | Um ano inteiro de dias ativos foi reunido. / A full year of active days was gathered. | Jornada; ÉPICO | >=365 dias ativos históricos | activeDays | sim; não | persistência distribuída |
| `streak-30` V2 | Chama Contínua / Unbroken Flame | A chama resistiu por trinta dias. / The flame endured for thirty days. | Jornada; RARO | longestStreak >=30 | longestStreakDays | não; não | reconhece sequência real |
| `consistent-years-5` V2 | Cinco Eras / Five Eras | Cinco anos responderam com atividade. / Five years answered with activity. | Jornada; ÉPICO | >=100 contribuições em cada um de 5 anos distintos | yearly activity full/partial | não; não | distingue idade de continuidade |
| `forks-received-10` V2 | Ecos da Forja / Echoes of the Forge | Dez derivações levaram a obra adiante. / Ten forks carried the work onward. | Impacto; RARO | >=10 forks recebidos | forks em repos próprios | sim; não | usa impacto já coletável |
| `starred-repos-5` V2 | Cinco Faróis / Five Beacons | Cinco obras receberam sua própria luz. / Five works earned a light of their own. | Impacto; RARO | >=5 repos próprios com estrela | starredRepositories | sim; não | evita concentração em um repo |
| `collaboration-triad-25` V2 | Pacto dos Três Selos / Pact of Three Seals | Propor, revisar e relatar formaram um pacto. / Proposing, reviewing and reporting formed a pact. | Colaboração; ÉPICO | PRs, reviews e issues >=25 cada | três métricas com coverage | não; não | conquista composta de colaboração |
| `reviews-500` V2 | Sentinela dos Portões / Sentinel of the Gates | Quinhentas passagens foram observadas. / Five hundred passages were watched. | Reviews; LENDÁRIO | >=500 reviews | reviews | sim; não | prolonga ladder sem alegar qualidade |
| `issues-500` V2 | Cartógrafo das Falhas / Cartographer of Faults | Quinhentas anomalias ganharam lugar no mapa. / Five hundred anomalies gained a place on the map. | Issues; LENDÁRIO | >=500 issues | issues | sim; não | prolonga ladder investigativa |
| `languages-balanced-3` V2 | Tríade de Afinidades / Triad of Affinities | Três correntes dividem o poder sem desaparecer. / Three currents share power without fading. | Linguagens; ÉPICO | >=3 afinidades com >=15% cada | bytes por linguagem full | não; não | diversidade real, não cauda longa |
| `language-specialist-70` V2 | Especialista Absoluto / Absolute Specialist | Uma afinidade domina o grimório. / One affinity rules the grimoire. | Linguagens; MÍTICO | afinidade líder >=70%, >=5 repos, coverage full | bytes/presença | não; sim | padrão raro e verificável |
| `schools-first` V2 | Primeiro Círculo / First Circle | A primeira Escola revelou seus símbolos. / The first School revealed its symbols. | Frameworks; COMUM | 1 Escola confidence >=medium | FrameworkAffinity | não; não | introduz nova camada |
| `schools-3` V2 | Conclave das Escolas / Conclave of Schools | Três tradições dividem a biblioteca. / Three traditions share the library. | Frameworks; RARO | 3 Escolas score >=45, confidence >=medium | afinidades de Escola | não; não | variedade recorrente |
| `school-recurring-5` V2 | Discípulo Recorrente / Recurring Disciple | A mesma Escola reaparece em cinco domínios. / The same School returns in five domains. | Frameworks; ÉPICO | uma Escola em >=5 repos próprios, score >=60 | evidências por repo | não; não | diferencia uso isolado de recorrência |
| `schools-fullstack` V2 | Ponte Entre Mundos / Bridge Between Worlds | Dois lados do portal foram sustentados. / Both sides of the portal were sustained. | Frameworks; MÍTICO | Escola frontend e backend strong, >=2 repos cada | famílias de Escola | não; sim | combinação incomum sem dizer “full-stack profissional” |
| `artifacts-3` V2 | Cinto do Artífice / Artificer's Belt | Três ferramentas encontraram lugar na oficina. / Three tools found a place in the workshop. | Tooling; RARO | 3 Artefatos confidence >=medium | ToolAffinity | não; não | reconhece ecossistema sem dominar classe |
| `testing-recurring-3` V2 | Círculo de Provas / Circle of Trials | As provas retornam em três domínios. / Trials return across three domains. | Tooling; ÉPICO | ferramenta de testes em >=3 repos próprios | manifests/configs de teste | não; não | prática recorrente, não pacote isolado |
| `automation-ci-3` V2 | Roda Automática / Self-Turning Wheel | Três oficinas movem-se por runas automáticas. / Three workshops move by automated runes. | Tooling; ÉPICO | GitHub Actions/CI inequívoco em >=3 repos | workflows/configs CI | não; não | automação verificável |
| `containers-3` V2 | Frascos do Vazio / Vessels of the Void | Três obras viajam em recipientes próprios. / Three works travel in vessels of their own. | Tooling; ÉPICO | Docker/containers em >=3 repos | Dockerfiles/Compose | não; não | tooling operacional recorrente |
| `ecosystems-3` V2 | Herói dos Três Reinos / Hero of Three Realms | Três ecossistemas reconheceram o viajante. / Three ecosystems recognized the traveler. | Composta; MÍTICO | Escolas strong em >=3 famílias de ecossistema | famílias, scores, coverage full | não; sim | amplitude estrutural rara |
| `five-paths` V2 | Herói dos Cinco Caminhos / Hero of Five Paths | Jornada, criação, impacto, colaboração e afinidade convergiram. / Journey, creation, impact, collaboration and affinity converged. | Composta; MÍTICO | gates maduros nas 5 dimensões | idade, repos, stars, PR/review, afinidades | não; sim | combinação transversal |
| `perfect-balance` V2 | Equilíbrio Perfeito / Perfect Balance | Cinco atributos permaneceram no mesmo círculo. / Five attributes stayed within one circle. | Composta; MÍTICO | 5 atributos >=55 e amplitude max-min <=10; perfil maduro | stats V1, maturidade | não; sim | raridade por equilíbrio, não magnitude única |
| `living-legend` V2 | Lenda Viva / Living Legend | A crônica, a obra e os aliados contam a mesma lenda. / Chronicle, craft and allies tell the same legend. | Composta; MÍTICO | idade>=10, repos>=50, stars>=100, PRs>=100, subclasse strong | métricas + decisão V2 | não; sim | ápice composto derivado de dados |

### Segredos e apresentação

Há **6 secretas**. Bloqueada, a API de apresentação expõe somente `id`, `rarity`, `unlocked:false`, `secret:true`, `name:"???"`, `description:"Conquista desconhecida"` (EN: `Unknown achievement`) e nenhuma condição/progresso. O requisito permanece apenas no catálogo server-side/engine. Depois do unlock, conteúdo e evidências são revelados. Nenhuma conquista concede XP.

## 13. Títulos V2

Catálogo fechado inicial: **40 títulos**, sendo **27 IDs migrados da V1.1** e **13 novos**. Título descreve “quem o herói se tornou”; conquista registra “o que fez”. Três nomes V1 que duplicavam conquistas recebem copy V2 nova, preservando o ID. O usuário pode desbloquear vários e equipar um localmente; a V2 não muda o store nem transforma a escolha local em dado do engine.

| ID / origem | PT / EN | Lore PT / EN | Requisito | Raridade | Explicação; classes associadas |
|---|---|---|---|---|---|
| `title-stars-10` V1 | Portador da Centelha / Spark Bearer | Leva consigo as primeiras luzes recebidas. / Carries the first lights received. | stars >=10 | COMUM | identidade de impacto; qualquer |
| `title-stars-50` V1 | Caçador de Estrelas / Star Hunter | Segue constelações deixadas por viajantes. / Follows constellations left by travelers. | stars >=50 | RARO | impacto crescente; qualquer |
| `title-stars-100` V1 | Senhor das Estrelas / Keeper of Stars | Mantém uma constelação ao redor da obra. / Keeps a constellation around the craft. | stars >=100 | ÉPICO | impacto distribuído; qualquer |
| `title-stars-500` V1 | Arauto das Constelações / Herald of Constellations | Sua obra anuncia mapas celestes. / Their work heralds celestial maps. | stars >=500 | LENDÁRIO | grande impacto; qualquer |
| `title-stars-1000` V1 | Lenda Celestial / Celestial Legend | Viajantes reconhecem seu brilho de longe. / Travelers know their light from afar. | stars >=1.000 | MÍTICO | ápice de impacto; qualquer |
| `title-commits-500` V1 | Forjador de Código / Code Forger | A bigorna conhece seu ritmo. / The anvil knows their rhythm. | commits >=500 | COMUM | identidade de atividade; Guerreiro, Artífice |
| `title-commits-1000` V1 | Incansável / Tireless | O caminho continua depois do primeiro cansaço. / The road continues past the first fatigue. | commits >=1.000 | RARO | atividade sustentada; qualquer |
| `title-commits-5000` V1 | Mestre da Forja / Master of the Forge | Milhares de golpes deram forma à obra. / Thousands of strikes shaped the craft. | commits >=5.000 | ÉPICO | grande atividade; Guerreiro, Artífice |
| `title-commits-10000` V1 | Forjador Eterno / Eternal Forger | A forja parece nunca silenciar. / The forge seems never to fall silent. | commits >=10.000 | LENDÁRIO | ápice de atividade; qualquer |
| `title-prs-10` V1 | Aliado do Código / Ally of Code | Cruza fronteiras para construir em conjunto. / Crosses borders to build together. | PRs >=10 | COMUM | colaboração; Guardião |
| `title-prs-50` V1 | Emissário Open Source / Open Source Envoy | Leva propostas entre reinos abertos. / Carries proposals between open realms. | PRs >=50 | RARO | colaboração recorrente; Guardião |
| `title-prs-100` V1 | Guardião da Comunidade / Guardian of the Community | Protege pontes entre muitos aliados. / Guards bridges among many allies. | PRs >=100 | ÉPICO | colaboração intensa; Guardião, Paladino |
| `title-prs-500` V1 | Campeão dos Reinos Abertos / Champion of Open Realms | Seu estandarte atravessa comunidades. / Their banner crosses communities. | PRs >=500 | LENDÁRIO | ápice colaborativo; Guardião |
| `title-languages-3` V1 | Explorador Arcano / Arcane Explorer | Percorre três correntes do código. / Travels three currents of code. | 3 afinidades relevantes | COMUM | variedade; Aventureiro |
| `title-languages-5` V1 | Poliglota das Runas / Polyglot of Runes | Lê cinco alfabetos no grimório. / Reads five alphabets in the grimoire. | 5 afinidades relevantes | RARO | variedade ampla; Aventureiro |
| `title-languages-8` V1 | Voz das Oito Runas / Voice of Eight Runes | Oito afinidades respondem à mesma voz. / Eight affinities answer one voice. | 8 afinidades relevantes | ÉPICO | copy V2 evita duplicar conquista; qualquer |
| `title-years-3` V1 | Cronista / Chronicler | Já possui história suficiente para narrar. / Holds enough history to tell. | conta >=3 anos | COMUM | longevidade; qualquer |
| `title-years-5` V1 | Guardião Ancestral / Ancestral Guardian | Preserva uma jornada de muitas estações. / Preserves a journey of many seasons. | conta >=5 anos | RARO | longevidade; Guardião, Paladino |
| `title-years-10` V1 | Memória dos Reinos / Memory of the Realms | Carrega uma década sem ser a própria conquista. / Carries a decade without being the deed itself. | conta >=10 anos | ÉPICO | copy V2 distinta; qualquer |
| `title-years-15` V1 | Testemunha das Eras / Witness of Ages | Viu ferramentas e reinos nascerem e mudarem. / Saw tools and realms rise and change. | conta >=15 anos | LENDÁRIO | copy V2 distinta; qualquer |
| `title-class-mago-alquimista` V1 | Arcanista do Código / Code Arcanist | Éter e transmutação convivem no grimório. / Aether and transmutation share the grimoire. | classe Mago + afinidade Alquimista secundária >=10% | RARO | combinação de afinidades; Mago |
| `title-class-mago-guerreiro` V1 | Cavaleiro Rúnico / Runic Knight | Runas dinâmicas encontram o metal. / Dynamic runes meet metal. | Mago + afinidade Guerreiro >=10% | RARO | combinação de afinidades; Mago |
| `title-class-mago-bardo` V1 | Tecelão de Interfaces / Weaver of Interfaces | Código e forma dividem o mesmo tear. / Code and form share one loom. | Mago + afinidade Bardo >=10% | RARO | combinação de afinidades; Mago |
| `title-class-alquimista-guerreiro` V1 | Ferreiro Arcano / Arcane Smith | Fórmulas temperam o metal da máquina. / Formulae temper the machine's metal. | Alquimista + afinidade Guerreiro >=10% | RARO | combinação de afinidades; Alquimista |
| `title-class-paladino-mago` V1 | Guardião Arcano / Arcane Guardian | Contratos firmes contêm o éter. / Firm contracts contain the aether. | Paladino + afinidade Mago >=10% | RARO | combinação de afinidades; Paladino |
| `title-class-patrulheiro-alquimista` V1 | Explorador de Sistemas / Systems Explorer | Serviços e fórmulas cruzam territórios. / Services and formulae cross territories. | Patrulheiro + afinidade Alquimista >=10% | RARO | combinação de afinidades; Patrulheiro |
| `title-class-ladino-mago` V1 | Ilusionista do Terminal / Terminal Illusionist | O terminal move fluxos sem ser visto. / The terminal moves flows unseen. | Ladino + afinidade Mago >=10% | RARO | combinação de afinidades; Ladino |
| `title-practice-architect` V2 | Mestre dos Alicerces / Master of Foundations | Sistemas distintos sustentam a mesma planta. / Distinct systems uphold one plan. | subclasse Arquiteto strong | ÉPICO | identidade estrutural; qualquer |
| `title-practice-artificer` V2 | Senhor da Oficina / Keeper of the Workshop | Ferramentas respondem à sua bancada. / Tools answer to their workbench. | subclasse Artífice strong | ÉPICO | identidade de tooling; qualquer |
| `title-practice-illusionist` V2 | Moldador do Véu / Shaper of the Veil | Interfaces ganham ritmo, forma e presença. / Interfaces gain rhythm, form and presence. | subclasse Ilusionista strong | ÉPICO | identidade visual; Mago, Bardo, Tecelão |
| `title-practice-guardian` V2 | Sentinela dos Contratos / Sentinel of Contracts | Testes e revisões vigiam as fronteiras. / Tests and reviews watch the borders. | subclasse Guardião strong | ÉPICO | identidade de proteção; qualquer |
| `title-practice-chronomancer` V2 | Regente dos Ciclos / Regent of Cycles | Pipelines obedecem a uma cadência precisa. / Pipelines obey a precise cadence. | subclasse Cronomante strong | ÉPICO | identidade de automação; Ladino, Patrulheiro |
| `title-school-ui` V2 | Arauto das Interfaces / Herald of Interfaces | Uma Escola visual retorna em muitos domínios. / A visual School returns across many domains. | Escola UI score>=70, >=5 repos | ÉPICO | ecossistema sem “Mestre do React”; Mago, Bardo, Tecelão |
| `title-school-portals` V2 | Arquiteto dos Portais / Architect of Portals | Rotas e renderização abrem passagens. / Routes and rendering open passages. | meta-framework web score>=70 | ÉPICO | meta-frameworks; Mago, Arquiteto |
| `title-school-services` V2 | Guardião dos Serviços / Warden of Services | Serviços recorrentes mantêm os portões ativos. / Recurring services keep the gates alive. | Escola backend score>=70, >=4 repos | ÉPICO | backend estrutural; Alquimista, Paladino, Patrulheiro |
| `title-school-mobile` V2 | Sentinela dos Caminhos Móveis / Sentinel of Mobile Paths | A jornada atravessa telas e dispositivos. / The journey crosses screens and devices. | Escola mobile score>=70 | ÉPICO | ecossistema mobile; Sentinela, Tecelão, Mago |
| `title-hybrid-bridgekeeper` V2 | Guardião da Ponte Dupla / Keeper of the Twin Bridge | Sustenta as duas margens do portal. / Upholds both shores of the portal. | frontend + backend strong | LENDÁRIO | identidade híbrida sem classe híbrida; Arquiteto |
| `title-hybrid-rune-engineer` V2 | Engenheiro Rúnico / Runic Engineer | Runas de build movem mecanismos reais. / Build runes drive tangible mechanisms. | Guerreiro/Paladino + Artífice >=70 | LENDÁRIO | conceito recusado como classe vira título preciso |
| `title-hybrid-pipeline-seer` V2 | Oráculo das Engrenagens / Oracle of Gears | Prevê o próximo ciclo pelas runas da entrega. / Foresees the next cycle through delivery runes. | Cronomante >=70 + CI e infra recorrentes | LENDÁRIO | tooling e cadência; Ladino, Oráculo, Patrulheiro |
| `title-living-legend` V2 | Aquele de Quem Falam / The One They Speak Of | A jornada tornou-se identidade antes de virar mito. / The journey became identity before myth. | conquista `living-legend` desbloqueada | MÍTICO | título derivado sem repetir o nome; qualquer |

Raridades e thresholds novos de títulos são **BALANCE TUNABLE**. O título default continua sendo escolhido deterministicamente entre desbloqueados; a ordem V2 de desempate é `mítico > lendário > épico > raro > comum`, depois categoria `evolução > prática > híbrido > ecossistema > impacto > colaboração > jornada > afinidade`, depois ID ascendente.

## 14. Raridades

Raridade descreve a natureza da combinação, não apenas um número maior.

| Raridade | Semântica | Alvo inicial entre perfis com dados elegíveis |
|---|---|---|
| COMUM | primeiro padrão claro, geralmente uma dimensão | 35–70% |
| RARO | recorrência ou marco menos frequente | 15–35% |
| ÉPICO | maturidade forte ou combinação de duas dimensões | 5–15% |
| LENDÁRIO | extremo histórico ou combinação sustentada rara | 1–5% |
| MÍTICO | convergência excepcional de múltiplas evidências | 0,2–2% |

Alvos são **BALANCE TUNABLE** e medidos por item, não como promessa individual. Um threshold alto não é automaticamente MÍTICO; uma combinação incomum pode sê-lo com números moderados.

## 15. Grimório do Herói

Escolha conceitual única: Escolas usam **Afinidade 0–100 + rótulo**, não estrelas, para manter precisão e compartilhar o contrato de explicabilidade. Rótulos iniciais: `Traço 1–24`, `Familiar 25–44`, `Forte 45–69`, `Dominante 70–84`, `Emblemática 85–100`; todos **BALANCE TUNABLE** e nunca equivalem a proficiência profissional.

Ordem e limites:

1. **Afinidades:** até 8, por bytes desc; mostrar nome, Skill Level V1 congelado, tier, participação, repos e coverage.
2. **Escolas:** até 5 com score >=25, por score desc/confidence/evidenceRepos/nome; mostrar score, rótulo, confidence, repos e evidência principal.
3. **Artefatos:** até 8 com score >=25 na mesma ordem; mostrar score, confidence e repos, sem tier de maestria.

Se não houver Escola com cobertura full: “Nenhuma Escola foi identificada nos repositórios analisados.” Se coverage partial: “Nenhuma Escola foi confirmada na parte analisada.” Se unavailable: “Escolas indisponíveis com os dados atuais.” A seção nunca inventa placeholders. Scores abaixo do corte continuam na explicação técnica, não na lista principal.

## 16. Explicabilidade

Toda decisão retorna `value`, `status`, `score`, `confidence`, `coverage`, evidências, regras aplicadas, alternativas e `reasonCode`. Explicações são geradas por templates localizados, nunca por texto generativo em runtime.

Exemplo PT:

> **Por que Mago?** TypeScript representa 47% e JavaScript 24% dos bytes observados em repositórios próprios; ambas apontam para Mago. Cobertura de linguagens: completa.  
> **Por que Arquiteto?** React e Next.js aparecem diretamente em 9 repositórios próprios, com evidência recente e score 78. A alternativa Ilusionista marcou 61; a margem foi suficiente.  
> **Por que não houve evolução?** Arquimago exige confiança alta e Experiência inicial candidata de 65; a evidência atual chegou a 58.

Exemplo EN:

> **Why Mage?** TypeScript accounts for 47% and JavaScript for 24% of the observed bytes in owned repositories; both map to Mage. Language coverage: full.  
> **Why Architect?** React and Next.js are directly present in 9 owned repositories, with recent evidence and a score of 78. Illusionist scored 61; the margin was sufficient.  
> **Why no evolution?** Archmage requires high confidence and an initial candidate Experience score of 65; current evidence reached 58.

Nomes de classe podem ser localizados na UI, mas IDs canônicos não. Percentuais e contagens devem indicar “ao menos” em cobertura parcial.

## 17. Fallbacks

| Condição | Resultado V2 | O que não fazer |
|---|---|---|
| linguagem dominante não mapeada | classe Aventureiro; afinidade real visível | aproximar por nome/ecossistema |
| nenhuma linguagem forte, mas há bytes | maior afinidade decide classe somente se >=20%; caso contrário Aventureiro | forçar classe pela menor diferença |
| nenhuma linguagem | Aventureiro, class confidence `unavailable` ou `low` conforme coverage | tratar ausência como linguagem zero “real” |
| nenhuma Escola confirmada com full coverage | subclasse `null`, status `insufficient` | usar segundo lugar automaticamente |
| Escola sem confidence medium | subclasse `null`, status `possible/insufficient` | promover pacote isolado |
| Escolas/Artefatos indisponíveis | subclasse `null`, status `unavailable` | substituir silenciosamente pela regra V1 |
| tooling indisponível | recalcular somente arquétipos cujo limite superior não depende dele; senão unavailable | tooling=0 |
| conta <90 dias ou <2 repos próprios | classe simples; subclasse/evolução `null`, reason `profile_immature` | bônus artificial para perfil pequeno |
| perfil quase vazio | Aventureiro, progressão V1 real, Grimório vazio elegante | dados demo/fallback misturados ao perfil real |

O corte de 20%, 90 dias e 2 repos é **INITIAL BALANCE CANDIDATE / BALANCE TUNABLE**. Perfil pequeno continua divertido por copy, progressão real e próximos marcos; não recebe especificidade não sustentada.

## 18. Partial coverage

Cada domínio (`languages`, `repositories`, `schools`, `artifacts`, `reviews`, `activity`) mantém coverage independente.

- `full`: denominador conhecido e todos os elegíveis dentro do contrato foram examinados.
- `partial`: valor é limite inferior; unlock monotônico já atingido pode ser concedido, mas “faltam X” e proporções exatas são proibidos.
- `unavailable`: não há observação utilizável; score/decision dependente é `null`, não 0.
- Subclasse sob coverage partial só pode ser `strong` se o líder conservar score mínimo e margem mesmo no cenário superior determinístico dos repos não examinados. Caso contrário, `possible`, `value:null`, reason `coverage_could_change_winner`.
- Conquista monotônica (`>=N`) pode desbloquear com partial se o observado já alcança N. Conquista de proporção/equilíbrio exige full.
- Evolução exige full em linguagens e no conjunto de evidências que a define; métricas auxiliares podem ser partial apenas quando o gate já foi inequivocamente satisfeito.
- Explicação lista `observed`, `eligible`, `examined`, `failed` e `omittedByBudget`.

## 19. Invariantes

Os **30 invariantes obrigatórios** da V2 são:

1. Todo score finito está em 0..100.
2. Todo score possui confidence e coverage explícitos.
3. `unavailable` nunca é convertido silenciosamente em zero.
4. Valor partial é sempre apresentado como limite inferior quando aplicável.
5. Fork nunca conta como repositório próprio.
6. Fork tem peso zero em classe, subclasse, evolução, conquista e título V2 inicial.
7. Dependência transitiva tem peso zero.
8. Framework/Artefato não existe sem evidência estruturada.
9. Uma evidência é deduplicada por repo/item.
10. Linguagens são agregadas por bytes, nunca por `primaryLanguage` do repo.
11. Mesmo input + version + referenceDate produz mesmo output.
12. Não há random, seed oculto ou IA generativa runtime.
13. Toda ordenação possui desempate estável documentado.
14. Exatamente uma classe base é emitida.
15. Subclasse pode ser `null`.
16. Evolução pode ser `null`.
17. No máximo uma subclasse é emitida.
18. No máximo uma evolução é emitida.
19. Subclasse não é concedida apenas por ser o maior score.
20. Evolução não é concedida apenas por level.
21. Classe híbrida não é criada implicitamente.
22. Nenhum resultado afirma competência profissional.
23. Título só desbloqueia com requisitos satisfeitos.
24. Conquista secreta bloqueada não revela nome, lore, requisito nem progresso.
25. Conquista não concede XP.
26. Level/XP e atributos V1.1 não mudam nesta versão de regras.
27. V1.1 e V2 não compartilham snapshots/caches sem namespace e schemaVersion.
28. Catálogo e detector possuem versão explícita.
29. Top 5 Escolas e Top 8 Artefatos são limites de apresentação, não perda de evidência interna.
30. Erros brutos de GitHub/manifests nunca chegam à copy do personagem.

Limites recomendados: `1 classe`, `0..1 subclasse`, `0..1 evolução`, `até 8 Afinidades`, `5 Escolas`, `8 Artefatos`, todos os títulos desbloqueados mas apenas 1 equipado. Diversidade vem dos cinco scores independentes, recorrência, ecossistemas, atributos e colaboração; não de bônus por classe, quotas ou randomização.

## 20. Data model conceptual

Pseudo-tipos orientam a Etapa 2; não são implementação pronta:

```ts
type Coverage = "full" | "partial" | "unavailable";
type Confidence = "low" | "medium" | "high" | "unavailable";
type DecisionStatus = "strong" | "possible" | "insufficient" | "unavailable";
type PracticeArchetype = "architect" | "artificer" | "illusionist" | "guardian" | "chronomancer";

interface EvidenceRef {
  repoId: string;
  repoName: string;
  sourcePath: string;
  sourceKind: "manifest" | "directDependency" | "config" | "lockCorroboration" | "metric";
  strength: number; // 0..100
  observedAt: string;
  detectorVersion: string;
}

interface TechnologyAffinity {
  id: string;
  kind: "school" | "artifact";
  score: number | null;
  confidence: Confidence;
  coverage: Coverage;
  evidenceRepoCount: number;
  eligibleRepoCount: number;
  examinedRepoCount: number;
  lastEvidenceAt: string | null;
  evidence: EvidenceRef[];
  warnings: string[];
}

interface ArchetypeAffinity {
  archetype: PracticeArchetype;
  score: number | null;
  confidence: Confidence;
  coverage: Coverage;
  components: Record<string, number | null>;
  evidence: EvidenceRef[];
}

interface Decision<T> {
  value: T | null;
  status: DecisionStatus;
  score: number | null;
  confidence: Confidence;
  coverage: Coverage;
  reasonCode: string;
  evidence: EvidenceRef[];
  alternatives: Array<{ value: T; score: number | null; reasonCode: string }>;
  rulesVersion: "game-engine-v2-experimental";
}

type ClassDecision = Decision<string> & { value: string }; // classe nunca null
type SubclassDecision = Decision<PracticeArchetype>;
type EvolutionDecision = Decision<string>;

interface AchievementV2 {
  id: string; nameKey: string; loreKey: string; category: string; rarity: string;
  cumulative: boolean; secret: boolean; unlocked: boolean; coverage: Coverage;
  progress: number | null; target: number | null; evidence: EvidenceRef[];
}

interface TitleV2 {
  id: string; nameKey: string; loreKey: string; category: string; rarity: string;
  unlocked: boolean; requirements: Array<{ id: string; met: boolean | null }>;
}

interface CharacterExplanation {
  class: ClassDecision;
  subclass: SubclassDecision;
  evolution: EvolutionDecision;
  schools: TechnologyAffinity[];
  artifacts: TechnologyAffinity[];
  coverageWarnings: string[];
}
```

O input V2 precisa estender o perfil normalizado com repositórios identificáveis, `pushedAt`, archived/fork, manifests/configs observados e relatório de coleta. Tokens permanecem server-only. O output V1 não é alterado; a V2 tem tipos e adaptador próprios.

## 21. Versioning

- V1.1 continua congelada e é a experiência oficial durante as Etapas 2–3.
- Pacote/regras V2 inicia como `game-engine-v2-experimental`; catálogos usam `catalogVersion`, detectores `detectorVersion`, balance `balanceVersion` e output `schemaVersion`.
- Execução paralela recebe o mesmo perfil-base, mas escreve apenas em namespace `v2-experimental/*`.
- Snapshots: `balance-snapshot-v1.json` permanece intocado; V2 usa arquivos novos como `v2/balance-snapshot-v2-experimental.json` e inclui todas as versões no cabeçalho.
- Cache key inclui username, source fingerprint, schemaVersion, detectorVersion, catalogVersion, balanceVersion e referenceDate relevante.
- IDs V1 migrados são preservados nos catálogos V2, mas estados/unlocks são recalculados no namespace V2; nunca copiar unlock por posição de array.
- Promoção para `2.0.0` exige benchmark aceito, migration/read compatibility documentada e feature flag explícita. Rollback seleciona V1.1 sem converter dados.

## 22. Benchmark plan

Não executar nesta etapa. Matriz primária de **40 perfis**, com tags secundárias livres:

| Grupo primário | Qtde. | Cobertura obrigatória |
|---|---:|---|
| frontend/UI | 5 | React, Vue/Angular/Svelte, meta-framework, UI sem meta-framework |
| backend | 5 | Node, Python, JVM/.NET/PHP/Ruby |
| low-level | 4 | C/C++/Rust/Zig ou equivalentes, poucos frameworks |
| tooling | 4 | bundlers, CLIs, desktop/toolchain |
| DevOps/automação | 4 | CI, container, infra, Shell |
| long-lived | 4 | >=10 anos, padrões históricos distintos |
| new accounts | 4 | <1 ano, zero/poucos repos |
| huge profiles | 3 | paginação, caps, partial coverage |
| small profiles | 4 | 0–4 repos e evidência ambígua |
| polyglots | 3 | >=5 afinidades relevantes |
| **Total** | **40** | — |

Metade pode ser fixture determinística cobrindo bordas; metade, perfil público congelado por fixture de entrada, sem depender da rede durante assert. Cada caso registra expectativa de classe (exata), subclasses aceitáveis (`0..n` antes da calibração), absurdos proibidos, cobertura esperada e rationale humano.

Métricas de aceitação:

- 100% dos invariantes; 0 resultado impossível/sem evidência.
- Classe base explicável em 100%; divergência da expectativa humana revisada caso a caso, nunca “corrigida” por override de usuário.
- Subclasse em alvo inicial de 45–70% dos perfis maduros; evolução 5–10% deles.
- Nenhuma subclasse >45% do conjunto maduro e `Mago/Arquiteto` <35% dos perfis JS/TS maduros, sem quota runtime.
- Precisão manual de detecção >=95% em amostra de evidências; falso positivo crítico = 0.
- Estabilidade: mudanças pequenas fora de thresholds não alteram decisões; mudança de catálogo/balance altera snapshot explicitamente.
- Coleta dentro do orçamento definido na Etapa 2 e comportamento anônimo preservado.

Todos os percentuais são **BALANCE TUNABLE**. O benchmark ajusta thresholds/pesos globais, nunca regras por username.

## 23. Riscos

| Risco | Impacto | Mitigação especificada |
|---|---|---|
| API de Contents causar muitas requests/rate limit | latência e partial coverage | cap, cache, seleção determinística, manifestos-alvo e relatório de cobertura |
| monorepos inflarem evidência | subclasse excessiva | recorrência por repo, não por manifesto/workspace |
| starters/templates gerarem falso positivo | Ilusionista/Arquiteto excessivos | recorrência mínima, diretórios ignorados, confiança e margem |
| tooling dominar identidade | Artífice/Cronomante excessivos | teto de 30% e gates de fonte |
| perfis JS convergirem em Mago/Arquiteto | pouca diversidade | cinco vetores independentes e gate de margem, sem quota |
| catálogos envelhecerem | detecção incompleta | registro versionado e mudança revisável |
| cobertura parcial parecer certeza | confiança indevida | upper-bound stability e copy de limite inferior |
| Duelo assumir apenas `ClassName` V1 | quebra ou balance implícito | V2 não entra no Duelo na Etapa 2; adaptador ignora subclasse/evolução V2 até fase própria |
| evolução/títulos alterarem poder | balance acidental | todos são identidade/cosmética; nenhum modificador de combate |
| Chronicle alegar história inexistente | narrativa falsa | “primeira Escola” só após primeira observação V2 persistida; mudança de especialização exige dois snapshots versionados; nunca inferir retroativamente de estado atual |
| catálogo bilíngue divergir | UX inconsistente | IDs + translation keys, teste de completude PT/EN |

Impacto futuro no Duelo: novas subclasses/evoluções não recebem afinidades, dano ou habilidades nesta especificação. Qualquer uso exige uma fase separada de balanceamento e snapshot. Impacto futuro no Chronicle: eventos possíveis são `school_first_observed`, `specialization_changed` e `evolution_unlocked`, sempre datados pela observação do GitHub RPG, não apresentados como data histórica do GitHub.

## 24. Decisões abertas

Restam somente decisões que dependem de medição, sem impedir a Etapa 2 experimental:

1. **Calibração:** confirmar pesos, saturações, thresholds, margem, maturidade, raridades e alvos estatísticos com os 40 perfis. Até lá, usar os INITIAL BALANCE CANDIDATE deste documento.
2. **Orçamento de coleta:** escolher após protótipo medido quantos arquivos/bytes/requests cabem no caminho tokenizado e anônimo, mantendo o cap lógico inicial de 30 repos e coverage honesta.
3. **Expansões de linguagem:** aceitar/rejeitar CoffeeScript, R, Jupyter Notebook, Assembly, Zig, Elixir, Erlang, Scala, SCSS, Less, Batchfile, Fish, Hack e Objective-C depois de medir distribuição e falsos agrupamentos. O mapeamento V1 continua seguro enquanto isso.

Nenhuma decisão aberta autoriza mudar catálogos, V1.1 ou UX automaticamente.

## 25. Recomendação para Etapa 2

Implementar uma fatia vertical experimental, atrás de flag e sem UI oficial:

1. Criar tipos/registro V2 em namespace novo e testes dos 30 invariantes.
2. Estender coleta interna com relatório de coverage, mantendo REST anônimo e GraphQL paginado em 50 repos; token apenas server-side.
3. Implementar detectores puros por ecossistema, fixtures positivas/negativas e deduplicação por repo.
4. Calcular School/Tool affinities e cinco ArchetypeAffinity com constantes V2 isoladas.
5. Implementar decisões + explicações PT/EN, inclusive upper bounds para partial coverage.
6. Implementar os 7 gates de evolução, 54 conquistas e 40 títulos por dados declarativos versionados.
7. Gerar snapshots exclusivamente V2 e executar a matriz de 40 perfis na Etapa 3.
8. Somente após aceitação humana do benchmark, planejar integração do Grimório/UI. Duelo e Chronicle permanecem fora.

### Registro completo de Balance Tunables

- seleção/cap de 30 repos e orçamento de arquivos/bytes/requests;
- afinidade: referências de 8 repos, pesos 35/25/20/20 e pesos Tool 30/20/15/35;
- recência: janelas 1/2/4 anos e valores 100/75/45/20;
- força por source kind e bônus de lockfile;
- fórmulas dos cinco arquétipos e teto de 30% de Tooling;
- confidence high/medium: 5/2 repos e quantidade de tipos de fonte;
- subclass strong 60, possible 45, margem 8 e maturidade 90 dias/2 repos;
- classe forte 20% quando nenhuma afinidade domina;
- labels do Grimório 25/45/70/85 e cortes visíveis 25;
- todos os requisitos numéricos das 7 evoluções e 23 conquistas/13 títulos novos;
- targets de raridade, evolução e distribuição de subclasses;
- mapeamentos de linguagem candidatos da seção 4.

Parâmetros V1.1 não estão nesta lista porque permanecem congelados.
