# Visão geral do projeto

Este projeto é um GitHub RPG, uma aplicação web que transforma dados públicos de perfis do GitHub em uma experiência visual inspirada em RPG.

O projeto utiliza principalmente:
- React
- TypeScript
- Next.js
- Tailwind CSS
- GitHub REST API
- GitHub GraphQL API

O objetivo é manter a aplicação rápida, visualmente consistente, responsiva e fácil de evoluir.

## Regras gerais para agentes

Ao modificar este projeto:
1. Preserve a arquitetura existente sempre que possível.
2. Não reescreva arquivos inteiros sem necessidade.
3. Prefira mudanças pequenas, isoladas e fáceis de revisar.
4. Não adicione novas dependências sem necessidade real.
5. Não remova funcionalidades existentes sem solicitação explícita.
6. Preserve compatibilidade com o fluxo REST sem token.
7. Não exponha tokens, chaves ou segredos no frontend.
8. Antes de concluir uma alteração, verifique TypeScript, lint e build.
9. Não altere o design global quando a tarefa envolver apenas um componente.
10. Reutilize componentes, hooks, helpers e estilos existentes antes de criar novos.

## Produto

A interface deve parecer um perfil de personagem de RPG baseado na atividade real do usuário no GitHub.

Os elementos visuais podem incluir:
- avatar;
- nível;
- XP;
- classe;
- atributos;
- linguagens;
- repositórios;
- estrelas;
- forks;
- conquistas;
- estatísticas gerais.

Evite adicionar elementos como missões ou masmorras se eles não estiverem ligados a dados reais do GitHub ou se já tiverem sido removidos da interface.

A experiência deve continuar centrada no perfil GitHub transformado em ficha de RPG.

## Stack e padrões

### React

- Use componentes funcionais.
- Prefira composição a componentes muito grandes.
- Extraia lógica reutilizável para hooks ou helpers.
- Evite estados derivados desnecessários.
- Evite `useEffect` quando o valor puder ser calculado diretamente.
- Mantenha componentes de apresentação separados da lógica de obtenção de dados quando isso melhorar a clareza.

### TypeScript

- Não use `any` sem justificativa.
- Prefira tipos explícitos para dados vindos da API.
- Reutilize interfaces e tipos existentes.
- Trate campos opcionais e respostas incompletas da API.
- Nunca assuma que dados externos sempre estarão presentes.

### Tailwind CSS

- Reutilize padrões visuais já existentes.
- Evite valores arbitrários quando existir uma utility equivalente.
- Preserve responsividade.
- Não introduza estilos globais para corrigir problemas locais.
- Mantenha a identidade visual de RPG já usada no projeto.

## Integração com GitHub

### Perfil

Os dados principais do perfil podem continuar sendo carregados via REST.

Evite aumentar a quantidade de requests REST sem necessidade.

### Repositórios com token

Quando existir token GitHub, prefira GraphQL para buscar repositórios e linguagens em lote.

Consulta esperada:
- `user.repositories`
- paginação por cursor;
- 50 repositórios por página.

Para cada repositório, utilize quando necessário:
- `isFork`
- `stargazerCount`
- `forkCount`
- `languages`
- `languages.totalCount`
- `languages.edges.size`
- `languages.edges.node.name`

O campo `languages.edges.size` deve ser tratado como quantidade de bytes da linguagem no repositório.

Não utilize `primaryLanguage` para calcular distribuição geral de linguagens.

### Paginação

Utilize páginas de 50 repositórios por requisição GraphQL.

Não altere para 100 apenas para reduzir o número de páginas sem validar o impacto de latência.

### Fallback REST

O projeto deve manter fallback para `/languages` quando necessário.

Utilize fallback principalmente quando:
- `languages` vier nulo;
- o repositório possuir mais linguagens do que o limite retornado pela consulta GraphQL.

O fallback deve:
- considerar apenas repositórios relevantes;
- respeitar a ordem original;
- possuir limite para evitar centenas de requests;
- marcar a cobertura como parcial quando nem todos os repositórios puderem ser analisados.

### Sem token

Sem token GitHub, preserve o fluxo REST anônimo existente.

Não faça o funcionamento básico do projeto depender obrigatoriamente de autenticação.

Se existir configuração semelhante a:
```ts
repositoryTransport: "rest"
```

ela deve continuar permitindo forçar o fluxo REST.

## Performance

Performance é prioridade.

Ao trabalhar com a API do GitHub:
- evite request por repositório sempre que houver alternativa em lote;
- evite chamadas duplicadas;
- reutilize resultados já carregados;
- mantenha paginação;
- trate rate limits;
- evite bloquear a interface durante grandes carregamentos;
- apresente estados de loading apropriados;
- considere cache quando fizer sentido.

Não introduza uma otimização que torne o código muito mais complexo sem ganho mensurável.

## Dados de linguagens

A distribuição de linguagens deve ser baseada em bytes reais retornados pelo GitHub.

Exemplo:
```ts
{
  name: "TypeScript",
  size: 125000
}
```

Ao combinar vários repositórios:
1. some os bytes por linguagem;
2. calcule o total;
3. derive a porcentagem;
4. ordene da maior para a menor participação.

Não atribua o repositório inteiro à `primaryLanguage`.

## Forks

Quando estatísticas representarem trabalho próprio do usuário, prefira ignorar forks.

Exemplo:
```ts
repo.isFork === false
```

Não remova forks automaticamente de toda a aplicação se alguma tela precisar exibi-los.

## Tratamento de erros

A aplicação deve lidar corretamente com:
- usuário inexistente;
- perfil privado ou indisponível;
- rate limit;
- token inválido;
- erro GraphQL;
- erro REST;
- timeout;
- resposta incompleta;
- lista de repositórios vazia.

Nunca deixe erro bruto da API aparecer diretamente para o usuário.

Use mensagens amigáveis e mantenha detalhes técnicos disponíveis apenas onde fizer sentido para debug.

## Segurança

Nunca:
- faça commit de token GitHub;
- coloque token diretamente no código;
- registre tokens em logs;
- envie segredos para analytics;
- exponha variáveis privadas no bundle do frontend.

Use variáveis de ambiente apropriadas.

Arquivos `.env` com dados reais não devem ser versionados.

## UI/UX

A interface deve:
- funcionar bem em desktop e mobile;
- manter boa legibilidade;
- evitar excesso de elementos;
- ter hierarquia visual clara;
- preservar a estética RPG;
- apresentar skeleton/loading quando necessário;
- mostrar estados vazios de forma elegante.

Evite adicionar cards apenas para preencher espaço.

Cada elemento deve comunicar alguma informação útil sobre o perfil GitHub.

## Ícones e assets

Ao adicionar ícones:
- mantenha o mesmo estilo visual;
- prefira SVG;
- evite misturar muitos conjuntos diferentes;
- preserve tamanhos e alinhamentos consistentes;
- não adicione assets pesados sem necessidade.

Assets de RPG devem complementar os dados reais, não competir com eles.

## Estrutura de código

Antes de criar um novo arquivo, procure se já existe:
- componente semelhante;
- helper;
- hook;
- tipo;
- constante;
- utilitário de API.

Evite duplicação.

Nomes devem deixar claro o propósito.

Exemplos:
```text
components/
hooks/
services/
lib/
types/
utils/
```

Respeite a estrutura existente do repositório, mesmo que seja diferente deste exemplo.

## Alterações de API

Ao modificar código relacionado ao GitHub:
1. preserve compatibilidade REST;
2. preserve paginação;
3. preserve tratamento de rate limit;
4. valide usuários com muitos repositórios;
5. valide usuários com poucos repositórios;
6. valide usuários sem repositórios;
7. valide repositórios com muitas linguagens;
8. valide comportamento sem token;
9. valide comportamento com token.

## Validação antes de finalizar

Sempre que possível execute:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Se houver testes end-to-end aplicáveis:
```bash
npm run test:e2e
```

Ou use os comandos equivalentes do projeto.

Não considere uma alteração concluída se o lint, typecheck, testes ou build estiverem quebrados.

## Política de dependências

Antes de instalar uma biblioteca:
1. verifique se o projeto já possui solução equivalente;
2. avalie se a funcionalidade pode ser implementada de forma simples;
3. considere impacto no bundle;
4. confirme compatibilidade com a stack atual.

Evite dependências apenas para funcionalidades triviais.

## Escopo das tarefas

Faça apenas o que foi solicitado.

Se durante a tarefa identificar melhorias adicionais:
- não implemente automaticamente mudanças grandes;
- mencione-as separadamente;
- mantenha o PR focado.

Correções pequenas diretamente relacionadas à tarefa podem ser feitas quando forem necessárias para o funcionamento correto.

## Prioridades do projeto

Em caso de conflito entre soluções, priorize nesta ordem:
1. funcionamento correto;
2. dados corretos;
3. performance;
4. experiência do usuário;
5. simplicidade de manutenção;
6. consistência visual;
7. quantidade de funcionalidades.

## Resultado esperado

Toda alteração deve deixar o GitHub RPG:
- funcional;
- rápido;
- visualmente consistente;
- responsivo;
- fácil de manter;
- fiel aos dados reais do GitHub.
