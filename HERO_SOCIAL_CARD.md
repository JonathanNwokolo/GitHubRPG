# Carta Social do Herói ("Compartilhar Herói")

Botão **Compartilhar Herói** no cabeçalho da ficha, ao lado de "Desafiar este herói". Abre um diálogo com a **Carta Social do Herói**: uma imagem 4:5 (1080 × 1350 PNG) desenhada para feeds, mais as ações de baixar, copiar o texto da publicação, copiar o link e compartilhar no LinkedIn. **Não toca no Game Engine, no collector nem no datasource**; é só apresentação do que a ficha já mostra.

> Princípio: a carta é uma extensão da ficha, não uma segunda linguagem visual. Mesmas fontes, mesma placa de Level, mesmos ícones de classe, mesmos ornamentos, mesma paleta. Só a escala muda. Uma ficha que não pode ser mostrada com honestidade não gera carta.

## Fluxo

```text
CharacterHeader (botão) -> HeroShareDialog -> GET /api/card/<user>/social[?lang=en][&title=<id>]
                                           -> o PNG é buscado UMA vez: é o preview E o arquivo baixado
```

- **Download**: o mesmo blob do preview (`github-rpg-<Username>.png`, nome sanitizado). Sem segundo request, sem segundo desenhista.
- **Copiar link / texto**: link canônico da ficha (`profileUrl`); texto PT/EN com classe, nível e título (linhas omitidas quando indisponíveis) e 4 hashtags.
- **LinkedIn**: abre `linkedin.com/sharing/share-offsite/?url=<ficha>` em nova aba. O LinkedIn não aceita imagem local por esse fluxo: o diálogo diz que o PNG é anexado à mão. Nada é "enviado" automaticamente.
- O diálogo é montado em `document.body` (portal): a ficha V2 anima o wrapper com `transform`, o que desloca overlays `fixed` filhos dele.

## Quando não há carta (honesto, nunca degradado)

| Situação | Resposta | UI |
| --- | --- | --- |
| `calculatedNumbersPublishable = false` (cobertura parcial) | 503 `no-store` | botão nem aparece; direto na rota: 503 |
| V2 ligado mas ainda não resolvido (`enriching`) | 503 `no-store` + `Retry-After: 5` | "ficha em preparação" + Tentar novamente |
| usuário inexistente | 404 | — |
| sem calendário / sem ano aceso | carta **sem** o painel da Chama (layout recompõe) | — |

A rota lê o V2 **só do cache** (`loadCharacterProduct` sem `scheduleBackground`): nunca inicia enriquecimento. Os dados vêm do mesmo fetch de perfil da ficha (cache da fonte): **0 requests novas ao GitHub**.

## Código

```text
src/features/share/
  heroIdentity.ts          classe/subclasse/evolução/título com a MESMA precedência da ficha (V2 > V1) + ícones
  socialCardContent.ts     buildSocialCardContent(): conteúdo puro (ready | unavailable | pending), top 3 afinidades,
                           ano da Chama, métricas; 1080 x 1350
  SocialCardLayout.tsx     layout next/og (satori): fontes, placa, ícones, heatmap em UM <svg>
  socialPost.ts            texto da publicação, URL do LinkedIn, nome do arquivo, path da imagem
  HeroShareDialog.tsx      diálogo (preview, ações, foco, Escape, live region)
  fonts/                   Press Start 2P + Inter em TTF (mesmas famílias da ficha; ver README da pasta)
src/app/api/card/[username]/social/route.tsx
src/app/api/card/socialCardAssets.ts   arte (frame do avatar, placa, divisor, backdrop) e fontes
public/profile-ui/social/              backdrop assado (ver README da pasta)
scripts/renderSocialCardSamples.ts     npm run social-card:samples -> artifacts/hero-social-card/
```

## Decisões que valem lembrar

- **Heatmap em um `<svg>`**: 371 `div`s com `box-shadow` com blur levaram 18–50 s no renderer; o svg com halos planos leva ~2 s. O mesmo vale para gradientes grandes e `inset` shadows (segundos): o fundo é um **bitmap assado** (`social-card-backdrop.png`).
- **Frames e artes em PNG**: o renderer não decodifica WebP. Cada `.webp` da ficha tem um irmão `.png` (mesma arte, mesma geometria).
- **Caminhos de arquivo literais** em `socialCardAssets.ts`: o file tracing do deploy empacota exatamente os 9 PNGs e os 2 TTFs citados (um caminho calculado puxaria todo `/public`).
- **Peso das fontes**: um peso por família; negrito vem de um contorno fino (`WebkitTextStroke`). Itálico do título é um `skewX`.
- **`≥` não existe na fonte**: limite inferior de sequência é escrito `148+ dias`. Nomes em outros alfabetos caem para o username (fonte Latin).
- **Open Graph**: `og:image` da ficha continua o Hero Card 1200 × 630 (`/api/card/<user>`). A carta 4:5 seria cortada pelas redes que mostram 1.91:1, então **não** foi trocada. Uma variante 1200 × 630 da carta (frame + level + Chama compacta) é uma melhoria separada.

## Fora do escopo desta etapa

QR Code no rodapé (pode ser adicionado ao layout sem mudar contratos); upload de imagem ao LinkedIn (não suportado pelo fluxo web); trocar o `og:image`.
