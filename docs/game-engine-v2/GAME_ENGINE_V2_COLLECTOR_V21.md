# Game Engine V2 — Evidence Collector V2.1

> **Historical record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

> Status: collector experimental validado na Etapa 3B. Não altera V1, frontend, Duel, Chronicle ou API pública. O balanceamento continua `game-engine-v2-balance-stage3-r3`.

## Decisão arquitetural

O collector usa duas fases explícitas:

1. **Repository discovery:** seleciona deterministicamente até 30 repositórios próprios, ativos e não vazios; busca a Git Tree recursiva com concorrência limitada a seis.
2. **Targeted manifest fetch:** classifica os caminhos localmente, distribui manifests primários entre projetos/módulos e busca o conteúdo em batches GraphQL de até 30 objetos, com no máximo dois batches simultâneos. REST por blob é apenas fallback.

Git Trees foi escolhida porque entrega a estrutura completa observável em uma chamada por repositório. Contents API multiplicaria tentativas cegas por diretório. GraphQL é usado depois da descoberta porque agrega blobs conhecidos sem transformar cada manifest em um request REST. Árvores `truncated` nunca recebem coverage `full`.

## Seleção de repositórios

- forks, repositórios arquivados e vazios têm peso zero e não entram no universo de scoring;
- a ordem continua determinística por `pushedAt desc`, `stars desc`, `name asc`;
- o universo de scoring continua limitado a 30 repositórios, conforme a spec;
- `reposCandidates` preserva a quantidade anterior ao corte, sem transformar repos fora do universo declarado em falsa omissão de manifest;
- repositórios arquivados continuam disponíveis como histórico nos metadados, mas não produzem identidade V2.

## Ranking de manifests

- **Tier A:** manifests primários (`package.json`, `pyproject.toml`, `requirements*.txt`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle[.kts]`, `*.csproj`, `pubspec.yaml`).
- **Tier B:** workspaces, estrutura multi-project e configs inequívocos.
- **Tier C:** lockfiles, somente corroborativos.

A utilidade combina tier, contexto e profundidade. O primeiro Tier A de cada raiz de projeto é selecionado antes de manifests adicionais. A ordem final usa `utility desc`, `projectId asc`, `path asc`.

Budget final medido:

- até 10 arquivos por repositório;
- até 180 arquivos por perfil;
- até 256 KiB por arquivo;
- 30 objetos por batch GraphQL;
- dois batches de conteúdo em paralelo;
- seis árvores em paralelo;
- timeout de 10 segundos por operação experimental.

## Monorepos

`ProjectEvidence` registra raiz e manifests de cada projeto. npm/yarn workspaces, `pnpm-workspace.yaml`, apps/packages/services/libs, Maven, Gradle, .NET, Python e Flutter aninhados são descobertos pela árvore, sem glob remoto ilimitado.

Recorrência continua deduplicada por `(repoId, itemId)`: dez módulos React fortalecem a observação local, mas `evidenceRepoCount` continua igual a um. `projectsDiscovered` mede módulos separadamente.

## Paths contextuais e falsos positivos

- `vendor`, `third_party`, `external`, `upstream`, `node_modules`, `dist`, `build`, `generated`, `coverage` e `fixtures` são excluídos.
- `docs`, `example(s)`, `demo(s)`, `playground` e `template(s)` não eliminam o repositório; evidência nesses caminhos recebe peso 0,5.
- lockfile isolado não cria Escola nem Artefato.
- pnpm/Yarn são reconhecidos por `packageManager` no `package.json`; seus lockfiles apenas corroboram.
- configs em subprojetos usam o basename para aliases ancorados, preservando o caminho completo na explicação.

## Coverage

Coverage é calculado sobre o universo determinístico selecionado:

- `full`: árvores não truncadas, todos os manifests relevantes selecionados lidos, zero falha e zero skip por budget;
- `partial`: árvore truncada, falha HTTP ou manifest relevante conhecido e omitido;
- `unavailable`: nenhuma coleta utilizável.

Metadados adicionais distinguem `gap: none | small | large`, árvores truncadas, manifests descobertos/lidos/omitidos e coverage por domínio. O enum público permanece compatível. Um gap parcial ainda não concede decisão forte sem um upper bound seguro.

## Cache

- profile evidence: namespace V2 existente e versionado;
- tree: `repo identity + tree SHA + detector version`, com ponte de branch apenas no cache em memória;
- manifest: `repo + path + blob SHA + detector version`.

Mudança de SHA ou detector invalida a entrada. A implementação usa `Map`, sem infraestrutura adicional, mas as chaves permitem um backend persistente futuro. O cache V1 não é lido ou alterado.

## Instrumentação

São registrados separadamente: REST, GraphQL, árvores, batches de manifests, fallbacks REST, hits de tree/manifest, repos candidatos/inspecionados, projetos descobertos, manifests descobertos/lidos/omitidos, rate-limit restante e tempos de seleção, árvores, conteúdo e parsing. Token nunca é serializado.

## Resultado da Etapa 3B

- coverage `full`: 2/40 → 21/40;
- REST P90: 89 → 31;
- latência cold P50: 27,5 s → 13,5 s;
- latência cold P90: 45,0 s → 33,1 s;
- uma subclasse forte em 40; evoluções continuam 0;
- 40/40 replays offline determinísticos;
- detector precision/recall nos arquivos observados: 36/36 Escolas e 78/78 Artefatos na amostra de 12, sem falso positivo confirmado.

O collector atingiu a meta de coverage e requests. A latência melhorou, mas não atingiu P90 abaixo de 20 s, e a camada de balanceamento/decisão permanece bloqueada.
