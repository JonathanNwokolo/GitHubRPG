# Auditoria da pasta `artifacts/`

Data da auditoria: 2026-10-08  
Escopo: leitura estática de `artifacts/`, código, testes, scripts, documentação, configuração, histórico Git e referências textuais.  
Não executado: scripts geradores, build, testes, remoção, movimentação, alteração de `.gitignore`, commit, push, deploy ou limpeza de histórico.

## 1. Executive Summary

`artifacts/` contém **167 arquivos, todos versionados**, somando **123.142.378 bytes (117,438 MiB)**. Isso representa **94,89%** dos **129.779.609 bytes (123,767 MiB)** presentes nos arquivos versionados do working tree atual.

Conclusões principais:

- Nenhum arquivo de `artifacts/` é importado ou lido pelo build Next.js, pelo runtime, pelas APIs, pela UI, por V1, Duel, Chronicle, Badge, Hero Card ou Salão.
- Nenhum teste unitário ou E2E lê `artifacts/`; a CI não contém workflow versionado que o consuma.
- Há consumo real por scripts offline da Game Engine V2. Os consumidores mais fortes são os inputs congelados `inputs-v21/` e `inputs-v24/`, além de alguns snapshots intermediários.
- A documentação técnica referencia vários artifacts como evidência, matriz congelada ou relatório canônico. Portanto, “sem import de runtime” não significa “sem valor”.
- O melhor corte arquitetural é manter no Git resumos, avaliações humanas, matrizes congeladas e provas pequenas; armazenar raw inputs e snapshots pesados fora do Git, com hashes e recuperação documentada.
- Classificação de destino: **0,915 MiB KEEP_IN_GIT**, **110,022 MiB KEEP_OUTSIDE_GIT** e **6,501 MiB SAFE_TO_DELETE**.
- `SAFE_TO_DELETE` está limitado a três duplicações comprovadas. Nenhuma remoção foi feita.
- A migração dos itens `KEEP_OUTSIDE_GIT` **não pode ser feita como simples exclusão**: scripts usam caminhos fixos e precisam antes de manifesto, archive imutável e mecanismo de restore/download.
- Recomendação final: **C) LIMPEZA RECOMENDADA**, em duas fases e somente após autorização específica.

### Estado inicial do working tree

Antes da auditoria, `git status --short` já mostrava `?? AUDIT_REPORT.md`. Esse arquivo preexistente não foi alterado nem removido. Assim, a condição final de haver literalmente apenas `ARTIFACTS_AUDIT.md` como arquivo novo não pode ser satisfeita sem mexer em trabalho alheio/preexistente.

## 2. Total Size

| Métrica | Valor |
|---|---:|
| Arquivos em `artifacts/` | 167 |
| Arquivos rastreados em `artifacts/` | 167 |
| Arquivos não rastreados em `artifacts/` | 0 |
| Tamanho de `artifacts/` | 123.142.378 bytes / 117,438 MiB |
| Arquivos versionados no working tree | 572 |
| Tamanho dos arquivos versionados no working tree | 129.779.609 bytes / 123,767 MiB |
| Participação de `artifacts/` | 94,89% |
| Arquivos de `artifacts/` maiores que 1 MiB | 32 arquivos / 94,170 MiB |
| Git object store local, não compactado | 115,95 MiB (`git count-objects -vH`) |

Os horários abaixo são mtimes do filesystem. No histórico Git atual, `game-v2-delivery-proof`, `evolution`, `integration`, `null-quality` e `performance` aparecem introduzidos em `d69d6d5` (2026-10-07); `benchmark`, `generalization` e `preview`, em `706bc96` (2026-10-08). Isso é evidência do histórico atual, não autoria individual.

## 3. Directory Breakdown

| Diretório | Arquivos | Tamanho | Mtime observado | Tipo predominante | Finalidade provável |
|---|---:|---:|---|---|---|
| `artifacts/game-v2-benchmark/` | 107 | 87,200 MiB | 2026-10-07 01:47–11:23 | JSON/CSV | Coleta, calibração, bounds, holdout e avaliação V2.0–V2.3 |
| `artifacts/game-v2-generalization/` | 35 | 28,754 MiB | 2026-10-07 18:11–18:29 | JSON | Matriz independente V2.4, raw inputs, resultados e avaliação humana |
| `artifacts/game-v2-evolution/` | 6 | 1,292 MiB | 2026-10-07 18:55–20:06 | JSON | Baseline, funis, near misses e holdout de evoluções |
| `artifacts/game-v2-null-quality/` | 3 | 0,157 MiB | 2026-10-07 18:43 | JSON | Auditoria de qualidade de `null`/subclasses |
| `artifacts/game-v2-performance/` | 4 | 0,019 MiB | 2026-10-07 19:19 | JSON | Baseline P0, P1 e decisões de cache/delivery |
| `artifacts/game-v2-preview/` | 5 | 0,008 MiB | 2026-10-07 21:33 | JSON/Markdown | Evidência histórica do rollout Preview e placeholder de screenshots |
| `artifacts/game-v2-integration/` | 2 | 0,004 MiB | 2026-10-07 20:08 | JSON | Matriz e smoke de integração do produto |
| `artifacts/game-v2-delivery-proof/` | 5 | 0,003 MiB | 2026-10-07 20:06 | JSON | Provas pequenas de cache/delivery e limitações multi-instância |

### Inventário lógico completo

| Path/grupo | Arquivos | Tamanho | RAW/SUMMARY | Consumidor/referência real | Finalidade e autoridade | Classificação | Confiança |
|---|---:|---:|---|---|---|---|---|
| `game-v2-benchmark/inputs/*.json` | 40 | 7,586 MiB | RAW | `gameV2Stage3.ts` lê como cache; sem docs/test/runtime | Coleta V2 inicial; reproduzível apenas de forma aproximada via GitHub externo | KEEP_OUTSIDE_GIT | HIGH |
| `game-v2-benchmark/inputs-v21/*.json` | 40 | 30,764 MiB | RAW | Lidos por Stage 3B/C/D/E/F/G/H/HB e finalize | Input congelado central para replay histórico; autoridade de reprodução, mas grande | KEEP_OUTSIDE_GIT | MEDIUM |
| `benchmark-r0-baseline.json`, `benchmark-r1-detectors.json`, `benchmark-r2-balance.json` | 3 | 19,297 MiB | RAW snapshot | Gerados por Stage 3; análise aceita JSON arbitrário; sem teste/runtime | Rodadas históricas superseded, preservam evolução da calibração | KEEP_OUTSIDE_GIT | HIGH |
| `benchmark-final.json` | 1 | 6,495 MiB | RAW snapshot | Lido por `gameV2Stage3B.ts` | Último snapshot da etapa inicial; perfis iguais a `benchmark-r3-final.json` | KEEP_OUTSIDE_GIT | MEDIUM |
| `benchmark-r3-final.json` | 1 | 6,495 MiB | RAW snapshot | Sem leitor nominal | Duplicata semântica de `benchmark-final.json`; difere apenas em `generatedAt` e `round` | SAFE_TO_DELETE | HIGH |
| `benchmark-v21-collector.json` | 1 | 6,889 MiB | RAW snapshot | Lido por Stage 3C/H; citado por performance | Baseline completo do collector 2.1 | KEEP_OUTSIDE_GIT | MEDIUM |
| `benchmark-v22-bounds-baseline.json` | 1 | 7,140 MiB | RAW snapshot | Lido por finalize Stage 3D; doc V2.2 | Baseline completo dos bounds | KEEP_OUTSIDE_GIT | MEDIUM |
| `benchmark-v22-holdout.json` | 1 | 2,105 MiB | RAW + avaliação | Doc V2.2; sem consumidor posterior nominal | Holdout V2.2, superseded pelo V2.3 mas historicamente relevante | KEEP_OUTSIDE_GIT | HIGH |
| `benchmark-v23-holdout.json` | 1 | 27,084 KiB | SUMMARY/authority | Stage 3E/F e finalize; guard contra segunda execução | Holdout bloqueado/final V2.3 | KEEP_IN_GIT | HIGH |
| `benchmark-v23-r0-analysis.json`, `benchmark-v23-r1-signals.json` | 2 | 171,399 KiB | SUMMARY/matrix | Stage 3D R1, finalize, Stage 3E/F; docs | Autoridade de análise e calibração de sinais | KEEP_IN_GIT | HIGH |
| `holdout-evaluation-v23.json` | 1 | 29,063 KiB | SUMMARY/human authority | Stage 3E/F; gerado no finalize | Julgamento congelado do holdout; não reproduzível automaticamente | KEEP_IN_GIT | HIGH |
| `human-evaluations.json`, `human-evaluations-v21.json` | 2 | 10,910 KiB | SUMMARY/human authority | Docs e análise histórica | Avaliações humanas; não substituíveis por reexecução | KEEP_IN_GIT | HIGH |
| `analysis-*.json` (7 arquivos) | 7 | 175,812 KiB | SUMMARY | V2.2 doc cita canônico; demais docs/histórico | Resumos compactos das rodadas e decisão final | KEEP_IN_GIT | HIGH |
| `benchmark-final.csv`, `benchmark-r0-baseline.csv`, `benchmark-r1-detectors.csv` | 3 | 10,361 KiB | SUMMARY | Sem consumidor; leitura humana | Projeções tabulares compactas; `benchmark-final.csv` é a autoridade compacta final | KEEP_IN_GIT | MEDIUM |
| `benchmark-r2-balance.csv`, `benchmark-r3-final.csv` | 2 | 6,863 KiB | SUMMARY duplicado | Sem referência | Byte a byte idênticos a `benchmark-final.csv` | SAFE_TO_DELETE | HIGH |
| `precision-recall-v21.json` | 1 | 1,308 KiB | SUMMARY | Histórico Stage 3B | Resumo pequeno de precisão/recall do collector | KEEP_IN_GIT | HIGH |
| `game-v2-generalization/inputs-v24/*.json` | 30 | 28,589 MiB | RAW | Stage 3E coleta/lê; Stage 3F/G/HB lê | Coorte independente congelada; raw não reproduzível exatamente após drift do GitHub | KEEP_OUTSIDE_GIT | MEDIUM |
| `matrix-v24.json` | 1 | 4,905 KiB | SUMMARY/fixture authority | Stage 3E; doc prova freeze anterior ao resultado | Golden de seleção da coorte independente | KEEP_IN_GIT | HIGH |
| `g0-results.json`, `g0-analysis.json` | 2 | 142,614 KiB | SUMMARY/matrix | Stage 3F lê results; docs de generalização | Resultado e análise independente compactos | KEEP_IN_GIT | HIGH |
| `g0-human-evaluation.json` | 1 | 5,480 KiB | SUMMARY/human authority | Stage 3F | Julgamento humano não reproduzível automaticamente | KEEP_IN_GIT | HIGH |
| `holdout-v24-final.json` | 1 | 16,598 KiB | SUMMARY/holdout authority | Docs/histórico | Replay final do holdout após matriz independente | KEEP_IN_GIT | HIGH |
| `game-v2-evolution/e0-baseline.json` | 1 | 1,040 MiB | RAW snapshot | Stage 3G o gera; não é lido por código | Matriz completa de 70 perfis, derivável dos inputs congelados | KEEP_OUTSIDE_GIT | HIGH |
| Outros 5 JSON de `game-v2-evolution/` | 5 | 258,171 KiB | SUMMARY/authority | Docs; outputs Stage 3G | Análise E0/E1, funnels, near misses e holdout final | KEEP_IN_GIT | HIGH |
| `game-v2-null-quality/null-quality-all.json` | 1 | 112,443 KiB | RAW matrix | Gerado por Stage 3F; docs | Matriz derivada de 70 perfis, resumida por `decision-quality-summary.json` | KEEP_OUTSIDE_GIT | HIGH |
| `null-quality-holdout.json`, `decision-quality-summary.json` | 2 | 48,661 KiB | SUMMARY/authority | Docs; outputs Stage 3F | Holdout e decisão final de qualidade | KEEP_IN_GIT | HIGH |
| `game-v2-performance/*.json` | 4 | 19,832 KiB | SUMMARY/benchmark authority | Docs; outputs Stage 3H | Baseline P0/P1 e decisões de cache/delivery | KEEP_IN_GIT | HIGH |
| `game-v2-delivery-proof/*.json` | 5 | 3,441 KiB | SUMMARY/proof | Doc persistent delivery; outputs Stage 3HB | Provas pequenas e limitações explícitas | KEEP_IN_GIT | HIGH |
| `game-v2-integration/*.json` | 2 | 3,589 KiB | SUMMARY/proof | Histórico; sem runtime/test | Matriz e smoke de integração | KEEP_IN_GIT | HIGH |
| `game-v2-preview/*.json` | 4 | 7,448 KiB | SUMMARY/historical proof | Doc Preview Validation | Evidência temporal de deploy, cache, smoke e decisão de rollout | KEEP_IN_GIT | HIGH |
| `game-v2-preview/screenshots/README.md` | 1 | 300 bytes | SUMMARY/placeholder | Diretório referenciado pela evidência de Preview | Registra ausência/expectativa de screenshots; pequeno, evita esconder gap | KEEP_IN_GIT | MEDIUM |

Todos os 167 arquivos estão cobertos pelos grupos acima; as exceções com classificação diferente foram separadas nominalmente.

## 4. Top 20 Largest Files

| # | Path | Tamanho | Finalidade/referência | Classificação | Recomendação |
|---:|---|---:|---|---|---|
| 1 | `game-v2-benchmark/benchmark-v22-bounds-baseline.json` | 7,140 MiB | Baseline V2.2; lido pelo finalize 3D | KEEP_OUTSIDE_GIT | Arquivar com hash; adaptar restore antes de remover |
| 2 | `game-v2-benchmark/benchmark-v21-collector.json` | 6,889 MiB | Baseline collector; lido por Stage 3C/H | KEEP_OUTSIDE_GIT | Arquivar com hash; manter summary no Git |
| 3 | `game-v2-benchmark/benchmark-r3-final.json` | 6,495 MiB | Perfis idênticos a `benchmark-final.json` | SAFE_TO_DELETE | Remover apenas em limpeza autorizada |
| 4 | `game-v2-benchmark/benchmark-final.json` | 6,495 MiB | Snapshot final; lido por Stage 3B | KEEP_OUTSIDE_GIT | Autoridade da dupla duplicada; arquivar fora |
| 5 | `game-v2-benchmark/benchmark-r2-balance.json` | 6,483 MiB | Rodada histórica R2 | KEEP_OUTSIDE_GIT | Archive histórico, não Git corrente |
| 6 | `game-v2-benchmark/benchmark-r0-baseline.json` | 6,414 MiB | Baseline inicial | KEEP_OUTSIDE_GIT | Archive histórico, não Git corrente |
| 7 | `game-v2-benchmark/benchmark-r1-detectors.json` | 6,408 MiB | Rodada de detectores | KEEP_OUTSIDE_GIT | Archive histórico, não Git corrente |
| 8 | `game-v2-generalization/inputs-v24/isaacs.json` | 3,659 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |
| 9 | `game-v2-generalization/inputs-v24/adamwathan.json` | 3,226 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |
| 10 | `game-v2-benchmark/inputs-v21/diego3g.json` | 2,959 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 11 | `game-v2-benchmark/inputs-v21/antfu.json` | 2,777 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 12 | `game-v2-generalization/inputs-v24/joshwcomeau.json` | 2,768 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |
| 13 | `game-v2-benchmark/inputs-v21/addyosmani.json` | 2,273 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 14 | `game-v2-generalization/inputs-v24/bradtraversy.json` | 2,165 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |
| 15 | `game-v2-benchmark/inputs-v21/mhevery.json` | 2,126 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 16 | `game-v2-benchmark/benchmark-v22-holdout.json` | 2,105 MiB | Holdout V2.2 histórico | KEEP_OUTSIDE_GIT | Archive; V2.3 mantém autoridade corrente compacta |
| 17 | `game-v2-benchmark/inputs-v21/maykbrito.json` | 1,884 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 18 | `game-v2-generalization/inputs-v24/wesbos.json` | 1,791 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |
| 19 | `game-v2-benchmark/inputs-v21/omariosouto.json` | 1,727 MiB | Raw congelado do collector 2.1 | KEEP_OUTSIDE_GIT | Archive; hoje é lido por vários scripts |
| 20 | `game-v2-generalization/inputs-v24/developit.json` | 1,726 MiB | Raw GitHub da coorte independente | KEEP_OUTSIDE_GIT | Archive imutável da coorte |

Os 32 arquivos acima de 1 MiB somam 94,170 MiB. Nenhum deles é necessário para produção.

## 5. Runtime/Test References

### Referências por tipo

| Tipo | Resultado | Evidência |
|---|---|---|
| REFERÊNCIA DE RUNTIME | Nenhuma | Nenhum `src/` lê/importa caminhos de `artifacts/`; “artifacts” no domínio V2 significa ferramentas RPG, não a pasta |
| REFERÊNCIA DE TESTE | Nenhuma | Nenhum `*.test.*`, `tests/` ou `e2e/` referencia a pasta ou seus basenames |
| REFERÊNCIA DE SCRIPT | Sim, extensa | Stage 3B–3HB, finalize e analyzer leem/geram arquivos em caminhos fixos |
| REFERÊNCIA DE DOCUMENTAÇÃO | Sim | Docs V2.2–Preview citam diretórios e arquivos canônicos |
| REFERÊNCIA HISTÓRICA | Sim | Integration/Preview e rodadas antigas registram decisões e resultados temporais |
| SEM REFERÊNCIA | Alguns outputs individuais | Principalmente CSVs duplicados e snapshots somente gerados; isso não foi tratado automaticamente como inutilidade |

### Necessidade por área

| Área | Necessário? | Observação |
|---|---|---|
| Build Next.js | NÃO | `next.config` não inclui artifacts e não há import/read |
| Runtime/servidor | NÃO | Nenhuma rota ou serviço lê a pasta |
| API | NÃO | APIs usam datasource/cache/runtime V2, não artifacts de benchmark |
| V1 | NÃO | Nenhuma referência |
| V2 em produção/preview | NÃO | O engine usa `src/game-v2`; artifacts são evidência offline |
| V2 scripts de pesquisa/replay | SIM | Inputs congelados e snapshots são lidos diretamente |
| Duel | NÃO | Nenhuma referência |
| Chronicle | NÃO | Nenhuma referência |
| Badge | NÃO | Nenhuma referência |
| Hero Card/share | NÃO | Nenhuma referência |
| Salão | NÃO | Nenhuma referência |
| Testes unitários/E2E | NÃO | Testes usam fixtures de `src/`, não `artifacts/` |

`package.json` expõe os scripts V2, mas `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` não chamam esses scripts. Não há workflow em `.github/` no checkout atual.

## 6. KEEP_IN_GIT

| Grupo | Arquivos | Tamanho | Motivo |
|---|---:|---:|---|
| Resumos/avaliações/matrizes compactas de benchmark | 17 | 425,718 KiB | Autoridade técnica, humana ou documental; custo pequeno |
| Generalization summaries e matriz congelada | 5 | 169,597 KiB | Prova de independência, resultados, avaliação humana e holdout |
| Evolution summaries/holdout | 5 | 258,171 KiB | Decisão final e evidência compacta |
| Null-quality summary/holdout | 2 | 48,661 KiB | Autoridade da decisão conservadora |
| Performance | 4 | 19,832 KiB | Benchmark authority pequeno |
| Preview | 5 | 7,448 KiB | Evidência histórica pequena, inclusive gap de screenshot |
| Integration | 2 | 3,589 KiB | Smoke/matriz pequenos |
| Delivery proof | 5 | 3,441 KiB | Provas pequenas diretamente documentadas |
| **Total** | **45** | **959.232 bytes / 0,915 MiB** | **0,78% de `artifacts/`** |

Observação: manter esses arquivos no Git não torna seus resultados “atuais”; Preview, latência e integração são evidências datadas.

## 7. KEEP_OUTSIDE_GIT

| Grupo | Arquivos | Tamanho | Reproduzibilidade | Condição antes de retirar do Git |
|---|---:|---:|---|---|
| `benchmark/inputs-v21/*` | 40 | 30,764 MiB | Exato só com o raw congelado; nova coleta sofre drift; requer GitHub/token em muitos casos | Archive imutável + SHA-256 + restore para scripts |
| `generalization/inputs-v24/*` | 30 | 28,589 MiB | Exato só com o raw congelado; externa/token | Archive imutável + SHA-256 + restore |
| `benchmark/inputs/*` | 40 | 7,586 MiB | Recoletável com custo, externa/token, não idêntico no tempo | Archive opcional de longo prazo |
| Snapshots grandes de benchmark, exceto duplicata R3 | 7 | 42,806 MiB | Deriváveis/replayáveis se raw, código e versões forem preservados | Archive por release/fase + manifesto |
| `evolution/e0-baseline.json` | 1 | 1,040 MiB | Derivável dos inputs congelados e engine correspondente | Archive ou regenerar sob demanda |
| `null-quality/null-quality-all.json` | 1 | 0,110 MiB | Derivável; summary e holdout ficam no Git | Pode ir junto ao bundle bruto da fase |
| **Total** | **119** | **115.366.142 bytes / 110,022 MiB** |  | **Não remover antes de migrar consumidores** |

Destino recomendado: GitHub Release anexada à versão/fase, Actions artifact com retenção adequada apenas para outputs efêmeros, ou storage externo versionado. Para autoridade de longo prazo, Release/storage imutável é superior a Actions artifact expirável.

## 8. SAFE_TO_DELETE

| Path | Tamanho | Confiança | Evidência |
|---|---:|---|---|
| `game-v2-benchmark/benchmark-r3-final.json` | 6.809.976 bytes | HIGH | 40/40 objetos `profiles` são idênticos aos de `benchmark-final.json`; somente `generatedAt` e `round` diferem; nenhum leitor nominal |
| `game-v2-benchmark/benchmark-r2-balance.csv` | 3.514 bytes | HIGH | SHA-256 idêntico a `benchmark-final.csv` |
| `game-v2-benchmark/benchmark-r3-final.csv` | 3.514 bytes | HIGH | SHA-256 idêntico a `benchmark-final.csv` |
| **Total** | **6.817.004 bytes / 6,501 MiB** |  | **5,54% de `artifacts/`** |

Nada foi apagado. `benchmark-final.json` foi escolhido como autoridade da dupla JSON porque é lido pelo Stage 3B; `benchmark-final.csv` foi escolhido como autoridade das três cópias CSV por ser o nome canônico final.

## 9. Low Confidence Items

Não há item classificado com confiança LOW. Há itens MEDIUM que exigem confirmação operacional:

| Item | Por que não é HIGH | Confirmação necessária |
|---|---|---|
| `inputs-v21/*` e `inputs-v24/*` como KEEP_OUTSIDE_GIT | São raw apropriados para storage externo, mas vários scripts os leem em caminhos fixos | Definir storage durável, checksums e comando de restore; provar replay offline |
| `benchmark-final.json`, `benchmark-v21-collector.json`, `benchmark-v22-bounds-baseline.json` | São grandes e arquiváveis, porém ainda são entradas diretas de scripts | Adaptar scripts ou restaurar bundle antes da execução |
| `game-v2-preview/screenshots/README.md` | É apenas placeholder, mas documenta uma ausência de evidência visual | Confirmar se o gap deve continuar explícito; não apagar silenciosamente |
| CSVs compactos mantidos | Não são consumidos por código | Confirmar se revisão manual tabular continua desejada; custo é desprezível |

## 10. Duplicate/Superseded Data

| Arquivo A | Arquivo B | Diferença real | Autoridade provável |
|---|---|---|---|
| `benchmark-r3-final.json` | `benchmark-final.json` | Apenas `generatedAt` e `round`; 40/40 profiles idênticos | `benchmark-final.json`, pois Stage 3B o lê |
| `benchmark-r2-balance.csv` | `benchmark-r3-final.csv` | Nenhuma; SHA-256 igual | Nenhum dos dois |
| Os dois CSV acima | `benchmark-final.csv` | Nenhuma; SHA-256 igual | `benchmark-final.csv` |
| `benchmark-r2-balance.json` | `benchmark-r3-final.json`/`benchmark-final.json` | Não são duplicatas; nenhum profile inteiro é byte-idêntico | Cada rodada preserva mudança de output; archive histórico |
| `analysis-r2-balance.json` | `analysis-final.json` | 30/30 profiles de resumo idênticos; quatro diferenças agregadas (`round` e contagens de achievements/raridade) | Ambos pequenos; preservar como evolução da decisão |
| `inputs/<user>.json` | `inputs-v21/<user>.json` | `profile` é igual nos 40 pares, mas raw/evidence e métricas diferem; V2.1 é muito mais completo | `inputs-v21` para replay atual; `inputs` é histórico |
| Docs V2 | JSON summaries | Docs repetem conclusões, mas não todas as matrizes/decomposições | JSON é autoridade de dados; docs são narrativa/decisão |

Não foram encontradas outras duplicatas byte a byte. “Quase igual” foi verificado por conteúdo de profiles/subárvores, não apenas por nome ou tamanho.

## 11. Regression Authorities

| Autoridade | Papel | Valor histórico | Permanência |
|---|---|---|---|
| `matrix-v24.json` | Golden da coorte independente congelada antes dos resultados | HIGH | Git |
| `benchmark-v23-r1-signals.json` | Matriz de calibração de subclasses | HIGH | Git |
| `benchmark-v23-holdout.json` + `holdout-evaluation-v23.json` | Holdout bloqueado e julgamento final | HIGH | Git |
| `g0-human-evaluation.json` + `g0-results.json` | Avaliação independente e resultado | HIGH | Git |
| `holdout-v24-final.json` | Replay final do holdout | HIGH | Git |
| `decision-quality-summary.json` + `null-quality-holdout.json` | Decisão conservadora sobre nulls | HIGH | Git |
| `e1-final.json` + `evolution-holdout.json` | Autoridade final de evolução | HIGH | Git |
| `performance-p0-baseline.json` + `performance-p1.json` | Benchmark authority P0/P1 | HIGH | Git |
| `delivery-proof/*`, `integration/*`, `preview/*` | Evidência de infraestrutura/rollout datada | MEDIUM–HIGH | Git, com data/caveat |
| `inputs-v21/*`, `inputs-v24/*` | Fixture raw para reprodução exata | HIGH | Fora do Git, mas em archive imutável |
| Snapshots R0/R1/R2/V2.1/V2.2 | Histórico de calibração | MEDIUM | Fora do Git |
| Duplicatas R3/CSV | Nenhuma autoridade exclusiva | NONE | Candidato a exclusão |

Os testes atuais não tratam esses arquivos como golden files automatizados. A autoridade é de pesquisa, reprodução e decisão, não uma regressão executada por CI.

## 12. Historical Value

| Grupo | Valor | Justificativa |
|---|---|---|
| Matrizes congeladas, avaliações humanas e holdouts | HIGH | Sustentam a legitimidade da calibração sem tuning posterior |
| Raw `inputs-v21`/`inputs-v24` | HIGH | Única forma de replay exato contra dados GitHub que mudam |
| Rodadas R0/R1/R2 e V2.1/V2.2 completas | MEDIUM | Explicam evolução, mas a maior parte pode viver em archive |
| Null/evolution raw matrices | MEDIUM | Deriváveis, mas úteis para investigação detalhada |
| Performance/delivery/preview | MEDIUM–HIGH | Justificaram decisões; resultados são ambientais e datados |
| Duplicatas comprovadas | NONE | Não contêm dados exclusivos |

### Reprodutibilidade

| Grupo | Classificação de reprodução |
|---|---|
| Summaries derivados, com raw + commit correto | Reproduzível facilmente/moderadamente |
| Raw GitHub coletado | Reproduzível apenas com GitHub externo e frequentemente token; não idêntico após drift |
| Benchmarks frios/performance | Reproduzível com custo e ambiente externo; latências exatas não são reproduzíveis |
| Avaliações humanas | Não reproduzível automaticamente |
| Preview/deployment smoke | Não reproduzível como fato histórico; apenas nova medição |
| Duplicatas | Reproduzível pela cópia autoridade |

## 13. Sensitive Data Check

**SENSITIVE_DATA_FOUND: YES** — no sentido de dados pessoais públicos e payloads brutos, não de segredo confirmado.

Resultados:

- Não foi encontrado valor com padrão de GitHub token, bearer token ou private key nos JSONs.
- `game-v2-preview/deployment.json` contém chaves chamadas `GITHUB_TOKEN`, mas os valores armazenados não têm formato de token; aparentam ser estados descritivos. Os valores não são reproduzidos neste relatório.
- Os 110 raw inputs e vários snapshots grandes contêm usernames e metadados públicos de perfil como localização/empresa, além de URLs e conteúdo público de repositórios. Caminhos afetados: `game-v2-benchmark/inputs/*`, `game-v2-benchmark/inputs-v21/*`, `game-v2-generalization/inputs-v24/*` e snapshots que incorporam perfis.
- Mesmo públicos, esses dados ampliam exposição, envelhecem e podem divergir da vontade atual do titular; isso reforça mantê-los em archive controlado, com retenção definida, em vez do Git corrente.
- A inspeção foi estrutural e por padrões conhecidos; não é garantia criptográfica de ausência de todo segredo possível.

## 14. Proposed Artifacts Policy

### Git

Manter:

- summaries pequenos;
- avaliações humanas e decisões;
- matrizes de seleção congeladas;
- holdouts compactos/golden authorities;
- provas pequenas de performance, integração e rollout;
- um manifesto por bundle externo: URL/Release, SHA-256, bytes, data, commit do engine, schema e comando de restore.

### GitHub Releases ou storage externo imutável

Armazenar:

- raw GitHub payloads;
- inputs congelados;
- snapshots completos de benchmark;
- matrizes derivadas grandes;
- bundles de reprodução por fase.

Evitar usar somente Actions artifacts para autoridade de longo prazo, pois retenção/expiração pode destruir a reprodutibilidade histórica.

### GitHub Actions artifacts

Usar para:

- outputs temporários de CI;
- logs e relatórios intermediários;
- resultados reproduzíveis que não são autoridade permanente.

### Não persistir

- duplicatas byte a byte;
- cópias sem dado exclusivo;
- logs temporários;
- caches locais;
- dumps reproduzíveis sem valor decisório;
- screenshots ou outputs de CI sem vínculo com uma decisão.

### Convenção sugerida

Cada fase deveria produzir `summary.json` versionado e um `manifest.json` versionado apontando para `raw-<phase>.tar.zst` externo, com checksums por arquivo. Scripts devem aceitar `ARTIFACTS_RAW_DIR` ou um comando explícito de restore, mantendo o default atual somente durante a migração.

## 15. Potential Size Reduction

| Cenário | Remoção do working tree | % de `artifacts/` | Tamanho versionado corrente estimado após remoção |
|---|---:|---:|---:|
| Apenas SAFE_TO_DELETE | 6.817.004 bytes / 6,501 MiB | 5,54% | 117,266 MiB |
| Apenas KEEP_OUTSIDE_GIT, após migração | 115.366.142 bytes / 110,022 MiB | 93,69% | 13,745 MiB |
| KEEP_OUTSIDE_GIT + SAFE_TO_DELETE | 122.183.146 bytes / 116,523 MiB | 99,22% | 7,244 MiB |
| Artifacts que permanecem no Git | 959.232 bytes / 0,915 MiB | 0,78% | — |

Os números são sobre os arquivos da revisão atual. Não incluem compressão Git, objetos históricos, `node_modules`, `.next` ou arquivos ignorados.

## 16. Git History Note

Há três efeitos diferentes:

### A) Redução do working tree

Remover arquivos em um commit futuro reduz imediatamente o checkout daquela revisão em até 116,523 MiB. Também reduz o tamanho lógico da branch atual.

### B) Redução do clone futuro sem reescrever histórico

Um clone normal ainda baixa os blobs presentes em commits antigos. Portanto, um commit que remove os arquivos **não elimina** o principal custo histórico do clone. Clone raso, filtros parciais e sparse checkout podem reduzir transferência/checkout, mas não limpam o repositório.

### C) Limpeza de histórico com `git filter-repo`/BFG

Para remover os blobs dos commits antigos e reduzir o clone completo, seria necessária reescrita de histórico, seguida de force-push coordenado e reclone/rebase dos colaboradores. Isso muda hashes de commits e é operacionalmente destrutivo.

**Não é necessário reescrever histórico para corrigir a política futura.** Primeiro deve-se parar de adicionar raw ao Git, publicar archives verificáveis e remover da branch corrente. Uma reescrita só deve ser considerada separadamente se o custo real de clone justificar a coordenação. Nenhum `filter-repo`, BFG, prune ou GC foi executado.

## 17. Recommended Next Step

Recomendação: **C) LIMPEZA RECOMENDADA**.

Sequência segura, sujeita a autorização futura:

1. Criar manifesto versionado dos 119 itens `KEEP_OUTSIDE_GIT`, com SHA-256, bytes, schema, fase e commit do engine.
2. Publicar bundles imutáveis por fase em Release/storage e testar download + checksum + replay.
3. Adaptar os scripts que hoje leem caminhos fixos, ou fornecer comando explícito de restore para recriar exatamente a árvore esperada.
4. Em commit separado, remover somente os três itens `SAFE_TO_DELETE`.
5. Em outro commit revisável, retirar do Git corrente os bundles externos, mantendo os 45 summaries/authorities.
6. Medir clone/checkout após a limpeza corrente; decidir separadamente se uma reescrita histórica compensa o custo.

### Decisão final objetiva

1. **`artifacts/` é necessário para produção?** Não.
2. **Quanto precisa ficar no Git?** 959.232 bytes (0,915 MiB), 45 arquivos, 0,78% da pasta, segundo esta política.
3. **Quanto pode ir para fora do Git?** 115.366.142 bytes (110,022 MiB), 119 arquivos, 93,69%, depois de archive/manifest/restore.
4. **Quanto parece seguro apagar?** 6.817.004 bytes (6,501 MiB), 3 arquivos, 5,54%, por duplicação comprovada.
5. **Existe algo que não pode ser removido?** Sim: avaliações humanas, matrizes congeladas, holdouts e summaries de decisão não devem desaparecer; raw congelado também não deve ser perdido, apenas migrado para storage durável.
6. **Vale a pena fazer limpeza agora?** Vale iniciar a migração agora; não vale executar exclusão em massa antes de provar o archive e o replay. A pequena remoção de duplicatas pode ser feita isoladamente após autorização.

### Verificação de não alteração

- Nenhum arquivo dentro de `artifacts/` foi modificado, criado, movido ou removido.
- Nenhum arquivo existente do projeto foi alterado por esta auditoria.
- Nenhum commit, push, deploy, instalação ou comando destrutivo foi executado.
- A única escrita desta tarefa é `ARTIFACTS_AUDIT.md`.
- Ressalva de estado: `AUDIT_REPORT.md` já era untracked antes da tarefa e foi preservado.
