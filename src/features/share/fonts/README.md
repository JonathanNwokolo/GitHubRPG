# Card fonts

The Hero Social Card (`/api/card/<user>/social`) is drawn by `next/og`, which reads TTF/OTF/WOFF but not WOFF2.
These two files are the **same families the site already ships** through `next/font/google` (see `app/layout.tsx`),
so the card is typeset in the character sheet's own fonts:

| File | Family | Used on the sheet as |
| --- | --- | --- |
| `PressStart2P-Regular.ttf` | Press Start 2P (latin subset) | `font-pixel`: names, level number, section titles |
| `Inter-Regular.ttf` | Inter (latin subset, default instance of the variable font) | `font-sans`: labels, class, subclass, title |

Both are licensed under the SIL Open Font License 1.1 (Press Start 2P: © 2012 The Press Start 2P Project Authors;
Inter: © The Inter Project Authors). They were converted from the WOFF2 files `next/font` produces for the latin
subset; for Inter the variation tables (`fvar`, `gvar`, ...) were dropped, leaving the regular instance. Heavier
weights on the card come from a thin text stroke (see `SocialCardLayout.tsx`).

`cardFonts` are loaded by `src/app/api/card/socialCardAssets.ts`. If they cannot be read the card falls back to the
renderer's built-in face and is still drawn.
