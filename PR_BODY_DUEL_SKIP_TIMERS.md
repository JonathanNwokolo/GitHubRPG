## Problema

Em `DuelArena`, "Pular animação" definia `visibleRounds` para o total, mas os timers de revelação (`500 + i * 1800` ms) continuavam armados. O próximo timer antigo chamava `setVisibleRounds(i + 1)`, o resultado final sumia e só voltava no último timer. Bug visual real e causa do flake do Flow 20 (`/venceu o duelo|Empate lendário/i` após o clique).

Não relacionado ao Hotfix 3B (GraphQL); o bug já existia.

## Correção

- Timers de revelação guardados em `useRef` com helper `clearRoundTimers()`.
- Skip cancela todos os timers antes de definir o estado final.
- O efeito limpa timers antes de agendar uma nova sequência e no cleanup (unmount, novo duelo, mudança de dados/`shouldReduce`).
- O botão "Pular" já some quando `visibleRounds >= total`; agora esse estado é estável.

Sem mudanças em lógica do duelo, scoring, rounds, winner, textos, engine, datasource ou timeouts/testes E2E.

## Testes

- Novos testes unitários com fake timers (`DuelArena.test.tsx`): agenda normal, skip mostra resultado e ele permanece estável ao avançar todos os instantes originais, botão continua oculto, nenhum timer pendente após o skip, cleanup no unmount, novo duelo não recebe timers do anterior. O teste de skip falha no código antigo.
- lint, typecheck, `npm test` (1151), build: OK
- E2E completo: 55/55. Flow 20 repetido 40x localmente: 40/40.
