# Social card artwork

Derived from the character sheet's own kit (`/public/profile-ui`) for the Hero Social Card
(`/api/card/<user>/social`, 1080 x 1350), which is drawn server-side by `next/og`.

- `social-card-backdrop.png`: the sheet's stage and hero plate (bronze edge, warm glow) with the four corner
  ornaments and the crest cropped from `hero/profile-hero-frame.webp` at the sheet's own crop sizes (240 px corners,
  400 x 112 crest) and scaled 0.5. It is one opaque bitmap on purpose: large gradients and inset shadows are what the
  renderer is slowest at (seconds), a bitmap is a few hundred milliseconds.
- `../stats/profile-stat-plate.png`: PNG twin of `profile-stat-plate.webp`, trimmed to its artwork (the renderer
  cannot decode WebP).
- `../dividers/profile-divider.png`: PNG twin of `profile-divider.webp`.
- `../../avatar-frames/*.png`: PNG twins of the avatar frames (same artwork and geometry as the `.webp` files).

The `.webp` files stay the source of truth for the sheet; regenerate a twin whenever its `.webp` changes.
