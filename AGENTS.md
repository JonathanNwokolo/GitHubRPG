# AGENTS.md

## 1. Visão geral do projeto

GitHubRPG é uma aplicação web que transforma dados públicos de perfis do GitHub em uma experiência visual inspirada em RPG.

O projeto utiliza principalmente:

- Next.js
- React
- TypeScript
- Tailwind CSS
- GitHub REST API
- GitHub GraphQL API
- Vitest
- Playwright
- Vercel

A experiência é uma forma de gamificação.

Level, classe, atributos, conquistas, títulos e demais elementos de RPG **não devem ser apresentados como uma avaliação objetiva da competência profissional de uma pessoa**.

O objetivo é manter a aplicação:

- funcional;
- rápida;
- determinística;
- visualmente consistente;
- responsiva;
- segura;
- fácil de manter;
- fiel aos dados reais disponíveis no GitHub.

---

## 2. Princípios obrigatórios para agentes

Ao trabalhar neste repositório:

1. Preserve a arquitetura existente sempre que possível.
2. Prefira alterações pequenas, isoladas e fáceis de revisar.
3. Não reescreva arquivos inteiros sem necessidade.
4. Não adicione dependências sem necessidade real.
5. Reutilize componentes, hooks, helpers, tipos e padrões existentes.
6. Não altere sistemas não relacionados à tarefa.
7. Não remova funcionalidades sem solicitação explícita.
8. Não introduza mudanças arquiteturais por conveniência.
9. Não altere comportamento de produção incidentalmente.
10. Não trate uma oportunidade de refatoração como autorização para executá-la.
11. Se encontrar um problema fora do escopo, relate separadamente.
12. Não esconda limitações ou falhas com fallback silencioso.
13. Preserve determinismo onde ele já existe.
14. Preserve compatibilidade com o fluxo GitHub REST sem token.
15. Nunca exponha segredos ou tokens no frontend.
16. Nunca introduza infraestrutura paga sem autorização explícita.
17. Antes de concluir uma alteração, execute as validações aplicáveis.

Faça apenas o que foi solicitado.

---

## 3. Hierarquia de decisões

Ao tomar decisões, siga esta ordem:

1. solicitação explícita do usuário para a tarefa atual;
2. este `AGENTS.md`;
3. especificações arquiteturais do projeto;
4. contratos e testes existentes;
5. padrões já utilizados no código;
6. solução mais simples que preserve o comportamento esperado.

Se houver conflito relevante entre essas fontes:

- não tome uma decisão destrutiva sozinho;
- não invente uma nova arquitetura;
- explique o conflito;
- peça confirmação quando necessário.

---

## 4. Arquitetura principal

O pipeline conceitual principal do projeto deve permanecer previsível.

A arquitetura V1 segue aproximadamente:

```text
GitHubDataSource
→ RawGitHubData
→ validação Zod
→ normalizeDeveloperProfile()
→ DeveloperProfile
→ createRPGCharacter()
→ RPGCharacter
→ Frontend
```

A seleção de fonte de dados deve permanecer centralizada.

Não crie caminhos paralelos de carregamento do GitHub dentro de componentes de UI apenas para resolver uma tarefa local.

Não misture:

- coleta de dados;
- normalização;
- regras de jogo;
- apresentação;

quando a arquitetura já possui separação para essas responsabilidades.

---

## 5. Game Engine V1

O Game Engine V1 é considerado estável/congelado.

Não altere incidentalmente:

- fórmula de XP;
- fórmula de Level;
- pesos;
- atributos;
- classes;
- subclasses;
- tiers;
- achievements;
- títulos;
- regras de idade;
- mapeamentos de linguagens;
- thresholds;
- balanceamento.

Alterações nesses pontos exigem solicitação explícita.

O engine deve permanecer:

- puro;
- determinístico;
- independente de React;
- independente de DOM;
- independente de fetch;
- independente de localStorage;
- independente de relógio global;
- independente de `Math.random()`.

Não use `Math.random()` em lógica do engine.

Quando precisar de data de referência, utilize os dados fornecidos pelo perfil/entrada do sistema.

Não introduza comportamento dependente do horário atual sem uma referência explícita.

---

## 6. Game Engine V2

O V2 deve permanecer separado do V1.

Não transforme o V1 em V2 progressivamente através de patches incidentais.

O V2 utiliza uma interpretação mais rica de evidências tecnológicas.

Conceitos principais incluem:

```text
DeveloperProfile
+
RawRepositoryEvidence
→ TechnologyEvidenceProfile
→ Afinidades
→ Escolas
→ Artefatos
→ Scores
→ Classe
→ Subclasse
→ Evolução
→ Conquistas
→ Títulos
→ Explicações
```

Hierarquia conceitual:

```text
Linguagens
→ Frameworks / Escolas
→ Tooling / Artefatos
```

Regras importantes:

- Linguagens têm prioridade conceitual sobre frameworks.
- Frameworks têm prioridade conceitual sobre tooling.
- Presença simples não deve automaticamente implicar especialização.
- Evidência deve considerar recorrência, cobertura e confiança.
- Subclasse e evolução podem ser nulas.
- Ausência de evidência é preferível a uma inferência fraca.
- Forks devem possuir peso zero nas métricas de trabalho próprio.
- Não transforme V2 em um sistema de avaliação profissional.

Alterações em:

- scoring;
- confiança;
- thresholds;
- arquétipos;
- evoluções;
- conquistas;
- títulos;

devem ser tratadas como mudanças de Game Engine e não como refatorações comuns.

---

## 7. Forks

Quando estatísticas representarem trabalho próprio do usuário, forks devem ser ignorados.

Exemplo conceitual:

```ts
repo.isFork === false
```

Forks não devem contribuir para:

- linguagens próprias;
- stars próprias;
- forks recebidos;
- contagem de repositórios próprios;
- evidência tecnológica própria;
- scoring de engine.

Não remova forks automaticamente de telas ou contextos onde eles possam ser relevantes para apresentação.

A regra é sobre métricas de trabalho próprio, não sobre esconder forks de toda a aplicação.

---

## 8. Integração com GitHub

### Perfil

Dados básicos do perfil podem continuar sendo carregados via REST.

Evite aumentar o número de requests REST sem necessidade.

### Repositórios

Quando existir token GitHub, prefira GraphQL para carregamento em lote.

O fluxo atual utiliza paginação por cursor.

A paginação padrão de repositórios deve permanecer em 50 por página, salvo mudança explicitamente validada.

Não altere para 100 apenas para reduzir a quantidade de páginas sem benchmark.

Para repositórios, preserve suporte aos campos necessários, como:

- `isFork`
- `stargazerCount`
- `forkCount`
- `languages`
- `languages.totalCount`
- `languages.edges.size`
- `languages.edges.node.name`

`languages.edges.size` representa bytes por linguagem.

Não use `primaryLanguage` como base para distribuição geral de linguagens.

---

## 9. Fallback REST de linguagens

O fallback REST `/languages` deve continuar existindo quando necessário.

Ele é utilizado principalmente quando:

- `languages` vier nulo;
- a cobertura GraphQL for insuficiente;
- houver mais linguagens do que o limite retornado;
- uma situação equivalente exigir recuperação adicional.

O fallback deve:

- considerar apenas repositórios relevantes;
- respeitar a ordem existente;
- possuir limite;
- evitar centenas de requests;
- preservar cobertura parcial quando apropriado.

Não transforme ausência de dados em números aparentemente exatos.

---

## 10. Fluxo sem token

O projeto deve continuar funcional sem token GitHub.

Preserve o fluxo REST anônimo.

Não faça o funcionamento básico do GitHubRPG depender obrigatoriamente de:

- login;
- token;
- OAuth;
- GraphQL autenticado.

Se existir opção como:

```ts
repositoryTransport: "rest"
```

ela deve continuar funcionando como mecanismo para forçar o transporte REST.

---

## 11. Coverage e dados incompletos

O projeto trabalha com estados de cobertura.

Quando os dados não forem completos, preserve a distinção entre estados como:

- full;
- partial;
- unavailable;

ou equivalentes atuais.

Não apresente cobertura parcial como exata.

Não invente valores para preencher lacunas.

Uma resposta incompleta corretamente marcada é preferível a uma resposta falsa ou silenciosamente estimada.

---

## 12. Performance

Performance é prioridade, mas não justifica complexidade arbitrária.

Ao trabalhar com GitHub:

- evite request por repositório quando houver alternativa em lote;
- evite chamadas duplicadas;
- reutilize dados já carregados;
- preserve paginação;
- preserve cache;
- trate rate limits;
- preserve timeouts;
- preserve retry policy;
- evite bloquear a interface durante carregamentos grandes;
- preserve estados de loading apropriados.

Não introduza uma otimização complexa sem ganho mensurável.

Não remova proteções de performance apenas para simplificar código.

---

## 13. Large profiles

Perfis com muitos repositórios são um caso crítico.

Mudanças relacionadas a grandes perfis devem preservar cuidadosamente:

- paginação;
- cursor traversal;
- limites de concorrência;
- fallback REST;
- manifest collection;
- tree collection;
- cache;
- timeouts;
- delivery state;
- rate limiting.

Antes de declarar uma melhoria de performance, valide com perfis grandes.

Não considere apenas perfis pequenos como evidência suficiente.

---

## 14. Collector V2

O collector V2 é um sistema sensível.

Não altere incidentalmente:

- descoberta de repositórios;
- manifests;
- tree scanning;
- workspace detection;
- SHA cache;
- batching GraphQL;
- limites de evidência;
- bounds;
- incerteza.

Mudanças no collector podem alterar o resultado do Game Engine.

Trate-as como alterações arquiteturais.

---

## 15. Polling, delivery e enrichment

Não altere incidentalmente o fluxo V2 de entrega.

Preserve conceitos atuais como:

- pending;
- enriching;
- ready;
- partial;
- stale;
- unavailable;
- timed_out;
- rate_limited;
- failed;

ou equivalentes existentes.

Não transforme timeout individual de request em falha terminal se o sistema atual diferencia timeout de request e timeout global.

Não introduza polling sobreposto.

Preserve:

- backoff;
- abort;
- stale protection;
- visibility behavior;
- global timeout;
- delivery semantics.

Alterações nessas áreas exigem validação cuidadosa.

---

## 16. Cache

Não modifique estratégia de cache incidentalmente.

Antes de alterar cache, entenda:

- cache local;
- cache versionado;
- cache final;
- stale behavior;
- TTL;
- LRU;
- single-flight;
- runtime cache;
- limites de payload.

Não transforme Redis em cache geral sem decisão arquitetural explícita.

Não aumente responsabilidade de uma camada de cache apenas porque ela já existe.

---

## 17. Rate limiting e circuit breaker

Preserve as proteções existentes contra:

- GitHub rate limit;
- abuso;
- excesso de requests;
- falhas repetidas;
- indisponibilidade externa.

Não remova:

- `Retry-After`;
- circuit breaker;
- project budget;
- client budget;
- concurrency protections;

sem uma justificativa e validação explícitas.

---

## 18. Produto

A experiência deve permanecer centrada no perfil GitHub convertido em ficha de RPG.

Elementos válidos incluem:

- avatar;
- level;
- XP;
- classe;
- subclasse;
- evolução;
- atributos;
- linguagens;
- escolas;
- artefatos;
- repositórios;
- conquistas;
- títulos;
- Chronicle;
- Duel;
- Hall.

Não reintroduza sem solicitação explícita:

- Guild;
- Dungeons / Masmorras;
- Buffs;
- ranking global.

Duelo de Heróis é uma funcionalidade válida do produto.

Chronicle é uma funcionalidade válida.

Salão dos Heróis é uma experiência de descoberta/curadoria e não deve virar ranking global sem solicitação explícita.

---

## 19. Duelo

O sistema de Duelo deve permanecer separado do Game Engine principal.

Não use o Duelo como justificativa para mudar:

- XP;
- atributos;
- classe;
- progressão;
- balanceamento do perfil.

Preserve determinismo.

Não introduza desempate oculto.

Não utilize aleatoriedade.

---

## 20. Avatar frames

Frames de avatar devem permanecer determinísticos.

O mesmo username deve receber o mesmo frame onde essa regra estiver em uso.

Não utilize `Math.random()` para escolher frames.

Preserve consistência entre:

- Profile;
- Hall;
- Duel;

quando aplicável.

---

## 21. UI/UX

A interface deve:

- funcionar bem em desktop;
- funcionar bem em mobile;
- preservar hierarquia visual;
- manter boa legibilidade;
- evitar excesso de elementos;
- preservar estética dark fantasy / RPG;
- usar skeleton/loading quando apropriado;
- apresentar estados vazios de forma elegante;
- evitar layout shift desnecessário.

Não adicione cards apenas para preencher espaço.

Cada elemento deve comunicar algo útil.

Não altere design global quando a tarefa envolver apenas um componente.

---

## 22. Loading V2

Preserve a experiência de carregamento V2.

Evite flash de V1 enquanto V2 ainda está sendo resolvido.

Estados iniciais devem preferir loading temático/skeleton quando esse for o comportamento atual.

Fallback para V1 deve ocorrer apenas quando o sistema realmente determinar que V2 não pode ser apresentado.

Não transforme V1 em placeholder de loading.

---

## 23. React

- Use componentes funcionais.
- Prefira composição.
- Evite componentes excessivamente grandes.
- Extraia lógica reutilizável quando isso melhorar clareza.
- Evite estado derivado desnecessário.
- Evite `useEffect` quando um valor puder ser calculado diretamente.
- Preserve fronteiras client/server.
- Não mova lógica server-only para client por conveniência.

---

## 24. TypeScript

- Não use `any` sem justificativa.
- Reutilize tipos existentes.
- Trate dados externos como potencialmente incompletos.
- Não confie cegamente em resposta de API.
- Preserve strictness do projeto.
- Prefira contratos explícitos.
- Não contorne erros de tipo com casts arbitrários.

---

## 25. Tailwind CSS

- Reutilize padrões existentes.
- Preserve responsividade.
- Evite valores arbitrários sem necessidade.
- Não crie CSS global para corrigir problema local.
- Não quebre identidade visual.
- Evite duplicação de classes complexas quando já houver abstração apropriada.

---

## 26. i18n

Preserve o sistema atual de internacionalização.

Se uma string de UI possuir tradução PT/EN, não introduza texto hardcoded fora do padrão existente.

Ao adicionar novas strings:

- atualize PT;
- atualize EN;
- preserve naming convention;
- evite duplicação.

---

## 27. Acessibilidade

Preserve acessibilidade existente.

Considere:

- semântica;
- foco;
- teclado;
- aria labels;
- `aria-live`;
- reduced motion;
- contraste;
- estados visuais.

Não remova suporte a reduced motion para simplificar animações.

---

## 28. Tratamento de erros

A aplicação deve lidar corretamente com:

- usuário inexistente;
- perfil indisponível;
- rate limit;
- token inválido;
- erro GraphQL;
- erro REST;
- timeout;
- resposta incompleta;
- repositórios vazios;
- falha de cache;
- falha de serviços auxiliares.

Nunca mostre erro bruto da API diretamente ao usuário.

Detalhes técnicos devem ficar em contexto apropriado de debug/log.

---

## 29. Segurança

Nunca:

- faça commit de token GitHub;
- coloque token diretamente no código;
- registre tokens em logs;
- exponha tokens em screenshots;
- envie secrets para analytics;
- coloque secrets em `NEXT_PUBLIC_*`;
- exponha variáveis privadas no bundle client;
- versione arquivos `.env` reais.

Use apenas variáveis de ambiente privadas para secrets.

Nunca copie valores reais de secrets para:

- README;
- AGENTS.md;
- testes;
- fixtures;
- comentários;
- documentação.

Documentação deve mencionar apenas nomes das variáveis.

---

## 30. Leitura de environment variables

Preserve o boundary central de configuração do projeto.

Não espalhe novos acessos a:

```ts
process.env
```

pelo código.

Se o projeto possui arquivo central como:

```text
src/data/datasource/config.ts
```

novas configurações devem respeitar esse boundary.

Não introduza leitura direta de env em componentes ou módulos aleatórios sem justificativa arquitetural.

---

## 31. Infraestrutura

Vercel é o ambiente principal atual de deploy.

Não introduza sem autorização explícita:

- VPS;
- PostgreSQL;
- outro Redis;
- worker;
- queue;
- cron;
- background server;
- serviço de terceiros pago;
- banco adicional;
- nova camada de infraestrutura.

Não contrate nem provisione recursos pagos sem autorização explícita.

Se uma solução exigir billing:

- pare;
- explique;
- aguarde aprovação.

---

## 32. Upstash Redis

Existe um Redis Upstash dedicado ao contador global de fichas únicas.

Ele deve ser tratado como infraestrutura isolada dessa feature.

Não reutilize automaticamente esse Redis para:

- cache geral;
- cache V2;
- cache do GitHub;
- rate limiting;
- sessions;
- distributed locks;
- queues;
- persistence principal;
- analytics;
- polling state.

Qualquer expansão de responsabilidade do Redis exige uma decisão arquitetural explícita.

---

## 33. Contador global de fichas

Modelo:

```text
UNIQUE_PROFILE_LIFETIME_SET
```

Objetivo:

contar quantos perfis GitHub únicos tiveram uma ficha validamente invocada pelo menos uma vez.

Invariantes:

- deduplicação global;
- case insensitive;
- Set persistente;
- sem TTL;
- sem seed;
- sem backfill artificial;
- sem contador falso;
- username não armazenado em plaintext;
- não armazenar IP;
- não armazenar fingerprint;
- não associar visitante ao perfil;
- falha do Redis nunca pode quebrar uma ficha;
- Redis deve ser best effort;
- prefetched pages não devem incrementar;
- bots não devem incrementar;
- preview não deve incrementar;
- mock/dev não devem incrementar;
- chamadas internas de Hall não devem incrementar;
- polling V2 não deve incrementar;
- Duel não deve incrementar por carregamento interno;
- badge/card/metadata não devem incrementar.

A Home deve ocultar o contador enquanto estiver abaixo do threshold configurado.

Não altere o threshold incidentalmente.

Não inserir manualmente perfis para “testar visualmente”.

---

## 34. API pública de stats

A API de stats deve permanecer resiliente.

Falha do Redis não deve causar erro fatal na Home.

A resposta deve preservar o contrato público atual.

Não exponha:

- hashes;
- usernames;
- tokens;
- dados internos do Redis.

---

## 35. Dependências

Antes de instalar uma biblioteca:

1. verifique se já existe solução equivalente;
2. avalie se a funcionalidade pode ser implementada com APIs nativas;
3. considere impacto no bundle;
4. considere manutenção;
5. considere compatibilidade com Next.js/Vercel;
6. verifique se a dependência é realmente necessária.

Não adicione dependência apenas para resolver uma função trivial.

---

## 36. Estrutura de código

Antes de criar um arquivo novo, procure por:

- componente semelhante;
- hook existente;
- helper;
- tipo;
- constante;
- utilitário;
- serviço;
- adapter.

Evite duplicação.

Respeite a estrutura real do repositório.

Não reorganize diretórios inteiros sem necessidade.

---

## 37. Escopo das tarefas

Faça apenas o que foi solicitado.

Se encontrar melhorias adicionais:

- relate separadamente;
- não implemente automaticamente mudanças grandes;
- não aumente o escopo do PR;
- não transforme uma correção em refatoração geral.

Correções pequenas diretamente necessárias à tarefa podem ser feitas.

---

## 38. Git

Por padrão, agentes estão autorizados a editar arquivos e executar testes necessários à tarefa.

Por padrão, agentes **NÃO** devem:

- criar commit;
- fazer push;
- criar branch;
- abrir PR;
- fazer merge;
- disparar deploy;

sem autorização explícita do usuário.

Se o usuário autorizar essas ações, preserve o fluxo normal do repositório.

Nunca:

- use force push;
- reescreva histórico;
- bypass branch protection;
- use privilégio administrativo para ignorar checks;
- apague mudanças do usuário;
- faça reset destrutivo sem autorização;
- inclua arquivos não relacionados no commit.

Antes de commit:

- revise `git status`;
- revise diff;
- confirme que não existem secrets;
- confirme que `.env` não será incluído;
- remova artifacts temporários da seleção;
- mantenha o commit focado.

---

## 39. Pull Requests

Quando autorizado a criar PR:

- mantenha escopo pequeno;
- descreva objetivo;
- descreva impacto;
- informe testes executados;
- informe riscos;
- não misture refatorações não relacionadas.

Não mergeie com CI quebrado.

Não utilize bypass de proteção.

---

## 40. Deploy

Vercel é o sistema de deploy principal.

Não:

- altere Production desnecessariamente;
- redeploye apenas para testar algo que pode ser testado localmente;
- altere domínio;
- mude secrets sem autorização;
- crie infraestrutura paralela;
- substitua Vercel por VPS incidentalmente.

Quando um merge em `main` já dispara deploy automaticamente, prefira o fluxo normal.

---

## 41. Testes

Descubra e utilize os comandos reais definidos em `package.json` e CI.

Comandos comuns atualmente incluem:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Quando aplicável:

```bash
npm run test:e2e
```

Não invente comandos inexistentes.

Nem toda mudança trivial exige necessariamente toda a suíte E2E, salvo se CI ou contexto exigir.

Por outro lado, mudanças críticas devem receber validação mais ampla.

---

## 42. Validação por tipo de mudança

### Mudança pequena de UI

Normalmente valide:

- lint;
- typecheck;
- testes relacionados;
- build quando necessário;
- comportamento visual.

### Mudança de API/data layer

Valide:

- lint;
- typecheck;
- unit tests;
- contratos;
- casos de erro;
- build;
- E2E aplicável.

### Mudança de Game Engine

Valide:

- testes do engine;
- invariantes;
- fixtures;
- determinismo;
- regressões V1/V2;
- suíte completa relevante.

### Mudança de collector/performance

Valide:

- testes;
- perfis pequenos;
- perfis grandes;
- cache;
- timeouts;
- rate limits;
- cobertura;
- métricas de performance quando possível.

### Mudança de infraestrutura

Valide:

- configuração;
- segurança;
- falha segura;
- ambiente local;
- Production apenas quando autorizado.

---

## 43. E2E

Preserve testes E2E focados em fluxos reais.

Evite criar dezenas de testes E2E redundantes para detalhes que podem ser validados por testes unitários/componentes.

Use E2E para comportamentos como:

- navegação;
- integração entre sistemas;
- loading/fallback;
- Duel;
- contador real/fake;
- regressões críticas de UI.

---

## 44. Não mascarar falhas

Não silencie erros apenas para deixar testes verdes.

Não substitua falha real por:

- `try/catch` vazio;
- `return null` arbitrário;
- fallback mock;
- dados inventados;
- retry infinito.

Se um sistema puder falhar com segurança, implemente fail-safe explícito e testável.

---

## 45. Assets e ícones

Ao adicionar assets:

- preserve estilo RPG;
- prefira formatos apropriados;
- evite arquivos pesados;
- mantenha consistência;
- não misture estilos visuais sem necessidade.

SVG é preferível para ícones vetoriais quando apropriado.

Assets decorativos não devem competir com informação principal.

---

## 46. Documentação

Use documentos especializados para detalhes.

Este arquivo existe para orientar agentes.

Não transforme `AGENTS.md` em uma cópia de todas as especificações.

Quando necessário, consulte documentação específica, como:

```text
GAME_ENGINE_V2_SPEC.md
```

ou outros documentos técnicos existentes.

Regra conceitual:

```text
AGENTS.md
= como trabalhar no repositório

SPEC
= como um sistema específico funciona

README
= como o projeto é apresentado e utilizado
```

---

## 47. Decisões que não devem ser revertidas incidentalmente

Sem solicitação explícita, não reverta decisões como:

- V1 separado de V2;
- forks com peso zero em trabalho próprio;
- engine determinístico;
- REST anônimo funcionando;
- GraphQL em lote quando autenticado;
- Vercel como deploy atual;
- ausência de ranking global;
- Duel válido;
- Chronicle válido;
- Guild removida;
- Dungeons removidas;
- Buffs removidos;
- share/card podem permanecer internamente mesmo se UI estiver oculta;
- Redis exclusivo do contador;
- contador sem seed/backfill;
- UI de loading V2 sem flash desnecessário de V1.

---

## 48. Critérios de conclusão

Uma tarefa só deve ser considerada concluída quando:

- o comportamento solicitado foi implementado;
- o escopo foi respeitado;
- não foram introduzidas regressões conhecidas;
- TypeScript está válido;
- lint aplicável passa;
- testes aplicáveis passam;
- build aplicável passa;
- nenhum secret foi exposto;
- nenhuma infraestrutura indevida foi criada;
- mudanças não relacionadas não foram incluídas.

Se alguma validação não puder ser executada:

- informe claramente;
- não diga que foi validado se não foi.

---

## 49. Prioridades do projeto

Quando houver conflito entre soluções, priorize:

1. funcionamento correto;
2. dados corretos;
3. segurança;
4. determinismo;
5. performance;
6. experiência do usuário;
7. simplicidade de manutenção;
8. consistência visual;
9. quantidade de funcionalidades.

---

## 50. Resultado esperado

Toda alteração deve deixar o GitHubRPG:

- funcional;
- rápido;
- previsível;
- determinístico;
- visualmente consistente;
- responsivo;
- seguro;
- fácil de manter;
- fiel aos dados públicos do GitHub;
- fiel à arquitetura existente;
- sem complexidade desnecessária.
