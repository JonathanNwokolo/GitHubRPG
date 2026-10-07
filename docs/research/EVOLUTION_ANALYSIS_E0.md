# Game Engine V2 — Evolution Analysis E0

## Status

Baseline executado sem alterar gates, subclasses, collector, bounds, V1, frontend, API pública, Duel ou Chronicle.

Decisão E0: **ONE TARGETED EVOLUTION CALIBRATION STILL NEEDED**.

## Dataset e denominadores

- snapshots existentes: 70;
- calibration: 30;
- holdout locked: 10;
- independent: 30;
- perfis maduros (`conta >=3 anos` e `>=5 repos próprios`): 65;
- perfis maduros com subclasse concedida: 19;
- evoluções: 1/70, 1/65 maduros e 1/19 maduros com subclasse;
- requests novos: 0;
- replay determinístico: 70/70.

## Catálogo atual

| ID | PT | EN | Classe | Subclasse | Raridade | Gates atuais |
|---|---|---|---|---|---|---|
| `evo-archmage` | Arquimago | Archmage | Mago | Arquiteto ou Ilusionista | Mítica | score 75; afinidade base 70%; 2 Escolas com score 60; Experiência 65; high/full |
| `evo-celestial-guardian` | Guardião Celestial | Celestial Guardian | qualquer | Guardião | Mítica | score 78; reviews full 200; testes em 5 repos; Consistência 70; high/full |
| `evo-rune-master` | Mestre das Runas | Rune Master | Guerreiro ou Paladino | Artífice | Lendária | score 75; 3 Artefatos de build/toolchain/desktop; linguagem de sistemas em 2 repos; high/full |
| `evo-arcane-weaver` | Tecelão Arcano | Arcane Weaver | Bardo, Tecelão ou Mago | Ilusionista | Lendária | score 75; UI em 5 repos; Escola UI score 60; Versatilidade 60; high/full |
| `evo-ancestral-forger` | Forjador Ancestral | Ancestral Forger | qualquer | Artífice | Lendária | score 72; conta 8 anos; histórico anual full; 5 anos ativos; 4 Artefatos; high/full |
| `evo-high-chronomancer` | Alto Cronomante | High Chronomancer | Ladino ou Patrulheiro | Cronomante | Mítica | score 78; CI em 2 repos; Docker/Terraform em 2 repos; Consistência 70; high/full |
| `evo-celestial-architect` | Arquiteto Celestial | Celestial Architect | qualquer | Arquiteto | Mítica | score 80; frontend e backend strong; 2 repos de cada lado; 6 repos estruturais; Experiência 75; high/full |

Todas exigem subclasse `strong`, linguagens full e coverage da subclasse full. Uma subclasse `safe_under_partial_coverage` continua inelegível para evolução, conforme a spec.

## E0 baseline

| Evolução | Unlocks | Melhor candidato real | Distância |
|---|---:|---|---|
| Arquimago | 0 | `joshwcomeau` | falha somente score: 71,62/75 |
| Guardião Celestial | 0 | `paulirish` | score, confidence, coverage e testes |
| Mestre das Runas | 0 | `cassidoo` | score 68,21/75 e confidence medium |
| Tecelão Arcano | 0 | `adamwathan` | score 74,07/75 e Versatilidade 36/60 |
| Forjador Ancestral | 1 | `developit` | nenhum gate faltante |
| Alto Cronomante | 0 | `lizrice` | score 63,46/78 e confidence medium |
| Arquiteto Celestial | 0 | `adamchainz` | score, confidence, coverage e frontend |

Zero ocorrências nas demais seis evoluções não é tratado como falha estatística. A amostra é pequena para raridades lendárias/míticas e o denominador mais informativo é o de 19 perfis maduros já especializados.

## Developit

`developit → evo-ancestral-forger` é **GOOD**.

- classe: Mago, permitida porque a evolução aceita qualquer classe;
- subclasse: Artífice, score 91,91, confidence high, coverage full e margem garantida 27,64;
- idade da conta: 17,23 anos;
- atividade observada: 18 anos com contribuições, coverage anual full;
- diversidade: 12 Artefatos observados; o gate exige 4;
- evidência específica: Webpack em 8 repos, Rollup em 7 e esbuild em 2, além de tooling recorrente;
- requests adicionais: zero.

O resultado não decorre de level alto nem de título. Ele combina uma subclasse forte, longevidade, continuidade e oficina diversa. Não foi encontrado falso positivo confirmado.

## Identidade e overlap

As sete evoluções respondem a jornadas distintas: domínio web arcano, proteção técnica colaborativa, tooling de sistemas, prática visual recorrente, oficina longeva, automação/infra e arquitetura dos dois lados do portal. Remover qualquer uma elimina uma dessas jornadas.

Não existe evolução com o mesmo ID ou nome de título. Há proximidade lexical controlada entre Forjador Ancestral e títulos de forja, e entre Arquiteto Celestial e títulos de arquitetura, mas os títulos medem honraria/identidade equipável; as evoluções exigem combinações compostas. Nenhuma evolução depende de título equipado ou desbloqueado.

Nenhuma evolução depende de conquista. Não há caminho `evolution -> achievement -> evolution` nem outra dependência circular.

## Gate diagnostics

### Gates coerentes

- full coverage é conservador, porém coerente com a spec;
- score da subclasse não substitui evidência específica;
- classe e subclasse compatíveis são bloqueios efetivos;
- gates de Escolas/Artefatos usam evidência por repositório;
- o desempate múltiplo é explícito: maior `minScore`, depois ID canônico.

### Redundâncias aceitáveis

- Arquiteto Celestial combina Escolas strong, recorrência por lado e seis repos. Há correlação, mas cada gate mede força, cobertura estrutural e diversidade, respectivamente.
- Guardião Celestial combina score de Guardião e testes em cinco repos. O segundo gate impede que reviews/atributos de apoio substituam a prática técnica.

### Gates triviais

Nenhum gate essencial foi universal entre os perfis compatíveis. A diversidade de quatro Artefatos de Forjador Ancestral é a mais fácil depois de uma subclasse Artífice forte, mas idade e continuidade continuam separando a evolução da subclasse.

### Contradição objetiva

`evo-high-chronomancer` exige confidence `high`, mas seus sinais específicos de runtime são exclusivamente `github-actions`, `docker` e `terraform`. Os três catálogos têm `packages: []` e são detectados por configuração. Confidence high exige cinco repos e pelo menos dois `sourceKind` primários. Portanto, uma subclasse Cronomante formada somente pelos sinais que definem sua identidade fica limitada a confidence medium.

O teste positivo anterior escondia a contradição ao fabricar alternância entre `config` e `directDependency` para Docker/GitHub Actions, algo que o detector real não produz. Nos casos reais, `kelseyhightower` observou Docker 10/config, Terraform 2/config e Actions 1/config; `lizrice`, Docker 9/config e Actions 2/config. Todos os 10 Cronomantes reais ficaram em confidence medium.

Conclusão: Alto Cronomante é **UNREACHABLE pelo caminho real de evidência**, embora o helper sintético antigo consiga fazê-lo passar.

## Health E0

| Evolution | Reachable | Identity | Rarity | Gate health | Status |
|---|---|---|---|---|---|
| Arquimago | sim | distinta | rara e plausível | coerente | HEALTHY |
| Guardião Celestial | sim | distinta | muito conservadora | coerente | HEALTHY |
| Mestre das Runas | sim | distinta | rara e plausível | coerente | HEALTHY |
| Tecelão Arcano | sim | distinta | conservadora | Versatilidade alta, mas alcançável com perfil plausível | HEALTHY |
| Forjador Ancestral | sim e real | distinta | 1/70 | coerente | HEALTHY |
| Alto Cronomante | não pelo collector real | distinta | impossível no estado atual | confidence contraditória | UNREACHABLE |
| Arquiteto Celestial | sim | distinta | muito conservadora | coerente | HEALTHY |

## E1 autorizado pelo diagnóstico

Uma única correção direcionada é sustentada:

| Evolution | Gate | Antes | Depois proposto | Evidência | Motivo |
|---|---|---|---|---|---|
| Alto Cronomante | confidence | high | medium | sinais reais são config-only; 10/10 Cronomantes reais medium | remover impossibilidade estrutural sem afrouxar score, classe, coverage ou composto CI+infra |

O holdout permanece locked e não será usado para escolher o valor. `medium` já é o teto estrutural produzido pela evidência definidora da evolução. A alteração não busca criar unlock real: `lizrice` e `jesseduffield` continuam abaixo de score; `kelseyhightower` continua sem CI recorrente.

## Decisão E0

**ONE TARGETED EVOLUTION CALIBRATION STILL NEEDED**.

Nenhuma outra threshold será alterada nesta rodada.
