# Contribuindo com o GitHub RPG

Obrigado pelo interesse em contribuir! Correções, melhorias de documentação e novas ideias são bem-vindas. Procure manter cada contribuição pequena, focada e coerente com a arquitetura e a experiência existentes.

## Fluxo sugerido

1. Faça um fork do projeto.
2. Crie uma branch para a alteração.
3. Implemente a mudança.
4. Rode as verificações aplicáveis.
5. Crie um commit claro e descritivo.
6. Envie a branch para o seu fork.
7. Abra um Pull Request.

Nomes de branch simples ajudam a identificar o objetivo da mudança. Por exemplo:

- `feature/nome-da-feature`
- `fix/nome-do-bug`
- `docs/nome-da-mudanca`

Esses formatos são sugestões, não regras rígidas.

## Commits

Prefira commits objetivos e descritivos. O padrão usado no projeto pode servir como referência, sem a exigência formal de Conventional Commits:

- `feat: add hero feature`
- `fix: correct character loading state`
- `docs: improve contribution guide`

## Antes de enviar um Pull Request

Instale as dependências e execute as verificações disponíveis no projeto:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Os testes end-to-end exigem o ambiente do Playwright configurado. Na primeira execução, pode ser necessário instalar o navegador indicado na documentação do projeto.

## Pull Requests

Ao abrir um Pull Request:

- explique o que mudou e por que a mudança é necessária;
- mantenha o PR focado em um único objetivo;
- inclua screenshots quando houver alteração visual;
- evite misturar refactors não relacionados;
- confirme que as verificações e a CI estão verdes.

PRs podem passar por revisão e receber pedidos de ajuste antes do merge.

## Issues

Antes de implementar uma alteração grande, recomendamos abrir uma Issue para discutir a proposta. Isso ajuda a alinhar escopo e abordagem antes do trabalho começar. Pequenas correções não precisam de uma Issue prévia.

Ao relatar um bug, inclua quando possível:

- comportamento esperado;
- comportamento atual;
- passos para reproduzir;
- screenshots ou logs relevantes, sem dados sensíveis.

## Decisões importantes do projeto

As contribuições devem preservar:

- o determinismo do Game Engine;
- a separação entre V1 e V2, quando aplicável;
- a segurança de secrets, sem expor o `GITHUB_TOKEN`;
- a compatibilidade responsiva;
- a acessibilidade;
- o comportamento existente sem regressões.

Alterações no Game Engine ou no balanceamento devem explicar claramente a motivação e adicionar ou ajustar os testes correspondentes.

## Licença das contribuições

Ao contribuir para este projeto, sua contribuição será disponibilizada sob a mesma licença [GNU AGPLv3](LICENSE) do repositório.
