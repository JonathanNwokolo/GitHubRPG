# Avatar frames

Every hero is shown inside one decorative frame, chosen from their GitHub username, so the same
hero looks the same on the character sheet, in the Hall of Heroes and in the duel.

- **Production assets:** `public/avatar-frames/avatar-frame-<theme>-<NN>.webp` (transparent, square, window centred, 512px).
  Local source backups may live in the gitignored `design-assets/avatar-frames-source/`; they are not used at runtime or in the build.
- **Catalogue and selection:** `avatarFrames.ts`. `getAvatarFrameForUsername(username)` = `fnv1a(trim + lowercase) % AVATAR_FRAMES.length`.
  No username means the default frame. No `Math.random()`, so server and browser always agree.
- **Rendering:** `<FramedAvatar>` is the only place that puts a photo inside a frame. Everything is sized in percent
  of the slot you give it (`className="h-24 w-24"` or `size={px}`); every frame is scaled so its window is the same
  size, so a hero's photo is as large with one frame as with another (the frame may bleed a little past the slot).
  The frame is decorative (`alt=""`, `aria-hidden`); the photo keeps its own `alt`.

## Adding a frame

1. Export it as a **real** transparent PNG/WebP (a baked-in checkerboard is not transparency).
2. Make the canvas square with the window centred, resize to 512px and save as `public/avatar-frames/avatar-frame-<theme>-01.webp`.
3. Measure `avatarRatio`: the side of the window divided by the side of the image, plus ~0.01 so the photo tucks under the edge.
4. Append it to the **end** of the current `AVATAR_FRAMES` order:
   `[amethyst, obsidian, frost, ruby, sapphire, ember, newFrame]`.
   Do not insert it in the middle, for example `[amethyst, obsidian, newFrame, frost, ...]`. The list order is part of the contract: adding or reordering entries changes
   `hash % length` and therefore the frame assigned to existing usernames. `avatarFrames.test.ts` pins regressions on purpose.

To replace artwork without changing assignments, overwrite the production asset while keeping the exact same file name
and recheck its transparency, centred window and `avatarRatio`.

## Future share-card work

The Hero Social Card (`/api/card/<user>/social`, 1080x1350) renders the frame. The card renderer cannot decode WebP, so
every frame ships a PNG twin (`avatar-frame-<theme>-01.png`, same artwork and geometry) and
`src/app/api/card/socialCardAssets.ts` lists them by frame id (a test keeps it in step with `AVATAR_FRAMES`). **When you
add a frame, add its PNG twin and an entry there.** The separate Hero Card (1200x630), the Duel Card, OG generation and
the Canvas fallback still do not render frames.
