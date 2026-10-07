import { fnv1a } from "@/data/seed/hashAndPrng";

/** One decorative avatar frame: a transparent WebP with a see-through window in the middle. */
export interface AvatarFrame {
  /** Stable name, also the theme in the file name (`avatar-frame-<id>-01.webp`). */
  id: string;
  src: string;
  /**
   * Side of the avatar that fits the frame's window, as a fraction of the frame image
   * (the image is a square with the window centred). Slightly larger than the window so
   * the avatar tucks under the frame edge. Measure it again when you add a frame.
   */
  avatarRatio: number;
  /** Where the artwork ends at the bottom, as a fraction of the frame image (it is not always the image edge). */
  visibleBottom: number;
}

/**
 * Every available frame. The ORDER IS PART OF THE CONTRACT: a username maps to
 * `hash % AVATAR_FRAMES.length`, so reordering or adding frames reshuffles who gets which one.
 * Append new frames at the end to keep existing assignments as stable as possible.
 */
export const AVATAR_FRAMES: readonly AvatarFrame[] = [
  { id: "amethyst", src: "/avatar-frames/avatar-frame-amethyst-01.webp", avatarRatio: 0.6, visibleBottom: 0.971 },
  { id: "obsidian", src: "/avatar-frames/avatar-frame-obsidian-01.webp", avatarRatio: 0.76, visibleBottom: 0.977 },
  { id: "frost", src: "/avatar-frames/avatar-frame-frost-01.webp", avatarRatio: 0.53, visibleBottom: 0.971 },
  { id: "ruby", src: "/avatar-frames/avatar-frame-ruby-01.webp", avatarRatio: 0.65, visibleBottom: 0.984 },
  { id: "sapphire", src: "/avatar-frames/avatar-frame-sapphire-01.webp", avatarRatio: 0.6, visibleBottom: 0.936 },
  { id: "ember", src: "/avatar-frames/avatar-frame-ember-01.webp", avatarRatio: 0.5, visibleBottom: 0.930 },
];

/** Used when there is no username to hash (a stable choice, never random). */
export const DEFAULT_AVATAR_FRAME: AvatarFrame = AVATAR_FRAMES[0];

/** GitHub logins are case-insensitive, so "Torvalds " and "torvalds" are the same hero. */
export function normalizeFrameUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Same username, same frame: on the server, in the browser, on every page. */
export function getAvatarFrameForUsername(username?: string | null): AvatarFrame {
  const normalized = normalizeFrameUsername(username ?? "");
  if (!normalized) return DEFAULT_AVATAR_FRAME;
  return AVATAR_FRAMES[fnv1a(normalized) % AVATAR_FRAMES.length];
}
