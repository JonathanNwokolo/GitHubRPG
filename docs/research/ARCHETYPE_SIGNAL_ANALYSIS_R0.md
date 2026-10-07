# Archetype Signal Analysis R0

> Etapa 3D, analysis-only. Fonte: somente os 30 perfis de calibration congelados. O holdout não foi carregado. Nenhum peso, threshold, margem ou gate foi alterado.

## Score distributions

| Arquétipo | Mean | Median | P25 | P50 | P75 | P90 | Min | Max | >=40 | >=50 | >=60 | >=70 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Arquiteto | 38.88 | 43.58 | 23 | 43.58 | 52.02 | 57.02 | 10.81 | 67.39 | 18 | 9 | 2 | 0 |
| Artífice | 38.21 | 40.17 | 22.59 | 40.17 | 53.86 | 59.08 | 12.5 | 60.05 | 15 | 8 | 1 | 0 |
| Ilusionista | 37.75 | 42.27 | 18.38 | 42.27 | 53.89 | 65.58 | 7.2 | 75.76 | 15 | 8 | 5 | 2 |
| Guardião | 46.88 | 46.39 | 35.28 | 46.39 | 60.95 | 64.52 | 17.63 | 74.2 | 17 | 15 | 9 | 1 |
| Cronomante | 45.5 | 46.61 | 36.19 | 46.61 | 58.24 | 62.59 | 20.25 | 64.2 | 19 | 14 | 7 | 0 |

## Correlation matrix

|  | Arquiteto | Artífice | Ilusionista | Guardião | Cronomante |
|---|---|---|---|---|---|
| Arquiteto | 1 | 0.705 | 0.879 | 0.812 | 0.245 |
| Artífice | 0.705 | 1 | 0.821 | 0.812 | 0.486 |
| Ilusionista | 0.879 | 0.821 | 1 | 0.809 | 0.266 |
| Guardião | 0.812 | 0.812 | 0.809 | 1 | 0.521 |
| Cronomante | 0.245 | 0.486 | 0.266 | 0.521 | 1 |

Correlações excessivas (critério diagnóstico >= 0,75): Arquiteto × Ilusionista = 0.879; Arquiteto × Guardião = 0.812; Artífice × Ilusionista = 0.821; Artífice × Guardião = 0.812; Ilusionista × Guardião = 0.809.

## Margin distribution

| Bucket | Quantidade | % |
|---|---|---|
| 0–2 | 7 | 23.3 |
| >2–4 | 8 | 26.7 |
| >4–6 | 1 | 3.3 |
| >6–8 | 2 | 6.7 |
| >8–12 | 5 | 16.7 |
| >12–20 | 2 | 6.7 |
| >20 | 5 | 16.7 |

## Contribution matrix

Coeficientes abaixo são rotas da fórmula, não pontos fixos. Sinal significativo: coeficiente >= 0,10.

| Evidência/componente | Arquiteto | Artífice | Ilusionista | Guardião | Cronomante | Overlap |
|---|---|---|---|---|---|---|
| React | — | — | 0.4875 | — | — | exclusive |
| Vue | — | — | 0.4875 | — | — | exclusive |
| Svelte | — | — | 0.4875 | — | — | exclusive |
| Angular | — | — | 0.4875 | — | — | exclusive |
| Next.js | 0.6 | — | 0.1 | — | — | mostly-specific |
| Nuxt | 0.6 | — | 0.1 | — | — | mostly-specific |
| SvelteKit | 0.6 | — | 0.1 | — | — | mostly-specific |
| Astro | 0.6 | — | 0.1 | — | — | mostly-specific |
| Remix | 0.6 | — | 0.1 | — | — | mostly-specific |
| Express | 0.6 | — | 0.1 | — | — | mostly-specific |
| NestJS | 0.6 | — | 0.1 | — | — | mostly-specific |
| Fastify | 0.6 | — | 0.1 | — | — | mostly-specific |
| Django | 0.6 | — | 0.1 | — | — | mostly-specific |
| Flask | 0.6 | — | 0.1 | — | — | mostly-specific |
| FastAPI | 0.6 | — | 0.1 | — | — | mostly-specific |
| Laravel | 0.6 | — | 0.1 | — | — | mostly-specific |
| Rails | 0.6 | — | 0.1 | — | — | mostly-specific |
| Spring | 0.6 | — | 0.1 | — | — | mostly-specific |
| ASP.NET Core | 0.6 | — | 0.1 | — | — | mostly-specific |
| React Native | — | — | 0.4875 | — | — | exclusive |
| Expo | — | — | 0.4875 | — | — | exclusive |
| Flutter | — | — | 0.4875 | — | — | exclusive |
| Vite | — | 0.6 | — | — | 0.1 | mostly-specific |
| Webpack | — | 0.6 | — | — | 0.1 | mostly-specific |
| Rollup | — | 0.6 | — | — | 0.1 | mostly-specific |
| esbuild | — | 0.6 | — | — | 0.1 | mostly-specific |
| Docker | 0.05 | 0.15 | — | 0.1 | 0.65 | shared |
| GitHub Actions | 0.05 | 0.15 | — | 0.1 | 0.65 | shared |
| Terraform | 0.05 | 0.15 | — | 0.1 | 0.65 | shared |
| Playwright | 0.1 | — | 0.1625 | 0.55 | — | shared |
| Vitest | 0.1 | — | 0.1625 | 0.55 | — | shared |
| Jest | 0.1 | — | 0.1625 | 0.55 | — | shared |
| Cypress | 0.1 | — | 0.1625 | 0.55 | — | shared |
| Storybook | 0.1 | — | 0.1625 | 0.55 | — | shared |
| Tailwind CSS | — | — | 0.1625 | — | — | exclusive |
| Material UI | — | — | 0.1625 | — | — | exclusive |
| Chakra UI | — | — | 0.1625 | — | — | exclusive |
| shadcn/ui | — | — | 0.1625 | — | — | exclusive |
| Electron | — | 0.6 | — | — | 0.1 | mostly-specific |
| Tauri | — | 0.6 | — | — | 0.1 | mostly-specific |
| pnpm | — | 0.6 | — | — | 0.1 | mostly-specific |
| Yarn | — | 0.6 | — | — | 0.1 | mostly-specific |
| ESLint | — | 0.6 | — | — | 0.1 | mostly-specific |
| Prettier | — | 0.6 | — | — | 0.1 | mostly-specific |
| maturity | 0.15 | 0.15 | 0.1 | 0.05 | 0.1 | overly-generic |
| versatility | 0.1 | 0.1 | 0.15 | — | — | shared |
| consistency | — | — | — | 0.15 | 0.15 | shared |
| collaboration | — | — | — | 0.15 | — | exclusive |

## Top 10 ambiguous cases

| Perfil | Top 1 | Score | Top 2 | Score | Margem | Componentes top 1 | Componentes top 2 |
|---|---|---|---|---|---|---|---|
| mdo | Cronomante | 35.54 | Guardião | 35.35 | 0.19 | consistency 13.95; automation 12.69; maturity 8.9 | collaboration 15; consistency 13.95; maturity 4.45 |
| ahejlsberg | Arquiteto | 32.53 | Guardião | 32.3 | 0.23 | structural 20.78; maturity 10.95; versatility 0.8 | collaboration 15; consistency 13.65; maturity 3.65 |
| emilkowalski | Ilusionista | 55.4 | Arquiteto | 55.11 | 0.29 | visual 39.81; structural 6.29; maturity 5.1 | structural 37.75; maturity 7.65; quality 5.58 |
| tiangolo | Guardião | 62.83 | Cronomante | 62.5 | 0.33 | quality 22.36; collaboration 15; consistency 13.5 | automation 40; consistency 13.5; maturity 9 |
| jesseduffield | Guardião | 61.18 | Cronomante | 60.69 | 0.49 | quality 23.19; collaboration 15; consistency 13.35 | automation 35.33; consistency 13.35; maturity 8.4 |
| mhevery | Artífice | 58.45 | Guardião | 57.78 | 0.67 | craft 35.7; maturity 13.95; versatility 4.5 | quality 22.76; collaboration 15; consistency 12 |
| JonathanNwokolo | Ilusionista | 44.87 | Arquiteto | 43.49 | 1.38 | visual 29.53; versatility 7.35; structural 4.8 | structural 28.77; versatility 4.9; maturity 4.8 |
| TaylorOtwell | Cronomante | 51.04 | Arquiteto | 49.03 | 2.01 | automation 26.33; consistency 14.4; maturity 7.8 | structural 30; maturity 11.7; versatility 5.3 |
| sindresorhus | Artífice | 59.04 | Cronomante | 56.76 | 2.28 | craft 32.98; maturity 15; automation 6.27 | automation 27.16; consistency 14.1; maturity 10 |
| mitchellh | Guardião | 62.85 | Cronomante | 60.34 | 2.51 | quality 23.19; collaboration 15; consistency 14.7 | automation 33.22; consistency 14.7; maturity 9.7 |

## Top 10 clear cases

| Perfil | Top 1 | Score | Top 2 | Score | Margem | Componentes top 1 | Componentes top 2 |
|---|---|---|---|---|---|---|---|
| kelseyhightower | Cronomante | 47.17 | Artífice | 19.84 | 27.32 | automation 28.57; consistency 11.1; maturity 7.5 | maturity 11.25; automation 6.59; versatility 2 |
| matz | Cronomante | 52.4 | Guardião | 28.73 | 23.67 | automation 31.9; consistency 14.4; maturity 6.1 | consistency 14.4; collaboration 6.38; automation 4.91 |
| JakeWharton | Cronomante | 64.2 | Guardião | 41.64 | 22.56 | automation 40; consistency 14.4; maturity 9.8 | collaboration 15; consistency 14.4; automation 7.34 |
| mitsuhiko | Cronomante | 62.2 | Guardião | 40.6 | 21.6 | automation 37.35; consistency 14.85; maturity 10 | collaboration 15; consistency 14.85; automation 5.75 |
| sharkdp | Cronomante | 58.73 | Guardião | 38.68 | 20.04 | automation 34.02; consistency 13.8; maturity 9.3 | collaboration 15; consistency 13.8; automation 5.23 |
| iamkun | Guardião | 60.26 | Artífice | 42.2 | 18.06 | quality 25.53; collaboration 15; consistency 14.1 | craft 27.85; maturity 10.2; automation 3.35 |
| torvalds | Cronomante | 33.71 | Guardião | 21.6 | 12.11 | consistency 14.55; automation 13.16; maturity 6 | consistency 14.55; maturity 3; collaboration 2.03 |
| dhh | Guardião | 31.95 | Cronomante | 20.85 | 11.1 | collaboration 15; consistency 13.05; maturity 3.9 | consistency 13.05; maturity 7.8; automation 0 |
| gvanrossum | Arquiteto | 45.69 | Cronomante | 35.62 | 10.07 | structural 27.78; maturity 12.9; versatility 4 | consistency 13.95; automation 13.07; maturity 8.6 |
| kentcdodds | Guardião | 74.2 | Cronomante | 64.15 | 10.05 | quality 33.5; collaboration 15; consistency 14.25 | automation 34.27; consistency 14.25; maturity 9.9 |

## Diagnosis

- A) signal overlap: 11
- B) weak specificity: 2
- C) saturation issue: 0
- D) threshold issue: 2
- E) margin issue: 10
- F) confidence issue: 1
- G) legitimate ambiguity: 7

O modelo atual diferencia famílias amplas, mas reutiliza testing em Arquiteto/Ilusionista/Guardião e infra em quatro arquétipos. Maturidade aparece nos cinco arquétipos e eleva scores sem aumentar identidade técnica. Presence, recurrence, dominance e ecosystem pattern ainda não são componentes explícitos na fórmula de arquétipo. O R1 deve priorizar especificidade e caps de sinais genéricos antes de qualquer ajuste de threshold/margem.
