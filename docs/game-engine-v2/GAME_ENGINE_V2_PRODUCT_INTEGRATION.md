# Game Engine V2 — Integração no Produto

> **Historical integration record — this document does not describe the current production state.** See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the canonical operational status.

## Estado

Integração local da Etapa 4. A V1.1 permanece como base e a V2 permanece `2.0-experimental-v24-evo`. Nenhum commit, push, preview ou deploy faz parte desta etapa.

## Fluxo V1/V2

`loadCharacterProduct()` carrega e valida um único `DeveloperProfile`, cria o `RPGCharacter` V1, a Crônica e a explicação V1. Depois, somente quando `GAME_ENGINE_V2_UI_ENABLED` habilita o username, consulta o delivery V2.

- hit `ready`/`partial`: projeta e apresenta V2;
- hit `stale`: apresenta V2 e agenda revalidação pelo serviço;
- miss: retorna V1 e agenda enrichment com `after()`;
- erro/unavailable: retorna V1 sem converter um perfil válido em erro ou 404;
- flag desligada/username fora da allowlist: caminho V1 equivalente ao produto anterior.

O profile não faz polling. Um resultado criado em background aparece na próxima navegação ou reload.

## Modelo de apresentação

`CharacterPresentationModel` centraliza `v2Enabled`, `delivery` e a projeção pública opcional. A UI continua recebendo o personagem V1 completo como base. `projectRPGCharacterV2Public()` remove antes da fronteira client:

- referências de evidence e manifests;
- bounds, margens, rules e alternativas internas;
- request accounting, cache keys, source e diagnostics;
- requisitos/progresso de conquistas secretas bloqueadas.

A projeção mantém apenas identidade, Grimório resumido, catálogos apresentados, título default e razões humanas localizadas.

## Feature flag e rollback

- `GAME_ENGINE_V2_UI_ENABLED=false` por default;
- `GAME_ENGINE_V2_UI_ALLOWLIST=` opcional, CSV case-insensitive;
- allowlist vazia significa todos os perfis quando a flag principal está ligada;
- desligar a flag ou retirar um username restaura V1 sem limpar L1/L2 nem localStorage.

As variáveis são server-only e não usam `NEXT_PUBLIC_`.

## UI

- Hero: classe V2, especialização opcional e evolução opcional; null é ocultado.
- Grimório: até 8 Afinidades, 5 Escolas e 8 Artefatos, sem evidence/bounds na tela.
- Conquistas: 54, incluindo raridade Mítica e seis secretas redigidas quando bloqueadas.
- Títulos: 40; IDs migrados preservam a escolha local, ID inválido usa o default determinístico sem apagar storage.
- Explicabilidade: Classe, Especialização e Evolução com copy humana PT-BR/EN.
- `enriching`: indicação discreta; `stale` é silencioso; `partial` recebe nota discreta; `unavailable` usa V1.

## Fronteiras preservadas

- Duel continua recebendo `RPGCharacter` V1 e sua engine não foi alterada.
- Chronicle continua derivada do perfil V1; nenhum evento retroativo V2 foi criado.
- Badge, Share e metadata continuam no contrato V1 e nunca disparam cold enrichment V2.
- A rota experimental continua diagnóstica, mas agora serializa a mesma projeção pública segura.
- O Hall consulta V2 somente por cache lookup; não agenda enrichment e não cria fan-out V2 cold.

## Mock/test seam

Quando `GITHUB_DATA_SOURCE=mock`, a flag usa evidências V2 determinísticas para as personas existentes. Isso permite E2E de ready, null, subclass, evolution, secret e título sem rede nem espera de collector. O caminho GitHub real continua usando o delivery L1/L2/after().

## Observabilidade

O `V2DeliveryService` mantém contadores de hit L1/L2, miss, stale servido, enrichment iniciado/concluído/falhado/abortado, soft budget e duração. Nenhum serviço externo foi adicionado. O estado/source técnico não aparece na UI.

## Rollout

1. Phase 0: flag OFF.
2. Phase 1: flag ON com allowlist interna.
3. Phase 2: ampliar a lista de perfis; não há percent rollout novo.
4. Phase 3: flag ON e allowlist vazia após validação/aceitação.

Rollback: `GAME_ENGINE_V2_UI_ENABLED=false` é suficiente.

## Preview validation pendente

Requer autorização explícita para deploy preview. Validar cold `202/enriching`, nova navegação ready/partial, L2 entre instâncias, stale + revalidation, profile, Hall e rollback. A limitação aceita permanece: não existe lock distribuído; dois cold misses simultâneos em instâncias diferentes podem duplicar enrichment.
