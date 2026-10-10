import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAvatarFrameForUsername } from "@/features/avatar/avatarFrames";
import type { SocialCardArt, SocialCardFrameArt } from "@/features/share/SocialCardLayout";
import type { CardFont } from "./cardResponse";

/**
 * What the Hero Social Card draws besides text: the sheet's own artwork and fonts, loaded as bytes (the renderer
 * fetches nothing itself). Every piece is decoration: when one cannot be read the card is still drawn, without it.
 *
 * The renderer cannot decode WebP, so each piece the sheet serves as WebP ships a PNG twin next to it
 * (`x.webp` -> `x.png`, same artwork).
 */

/**
 * Public URL path of an asset and how to read it from disk. The disk paths are LITERAL on purpose: the deployment's
 * file tracing bundles exactly the files it can see named here (a computed path would pull in all of /public).
 */
interface PublicAsset {
  urlPath: string;
  read: () => Promise<Buffer>;
}

const root = () => process.cwd();

const PLATE: PublicAsset = {
  urlPath: "/profile-ui/stats/profile-stat-plate.png",
  read: () => readFile(path.join(root(), "public/profile-ui/stats/profile-stat-plate.png")),
};
const DIVIDER: PublicAsset = {
  urlPath: "/profile-ui/dividers/profile-divider.png",
  read: () => readFile(path.join(root(), "public/profile-ui/dividers/profile-divider.png")),
};
/** The sheet's stage, hero plate, corners and crest, baked into one 1080 x 1350 bitmap (see the folder's README). */
const BACKDROP: PublicAsset = {
  urlPath: "/profile-ui/social/social-card-backdrop.png",
  read: () => readFile(path.join(root(), "public/profile-ui/social/social-card-backdrop.png")),
};

/** One entry per avatar frame (keyed by `AvatarFrame.id`); a test keeps this in step with AVATAR_FRAMES. */
export const FRAME_ASSETS: Record<string, PublicAsset> = {
  amethyst: {
    urlPath: "/avatar-frames/avatar-frame-amethyst-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-amethyst-01.png")),
  },
  obsidian: {
    urlPath: "/avatar-frames/avatar-frame-obsidian-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-obsidian-01.png")),
  },
  frost: {
    urlPath: "/avatar-frames/avatar-frame-frost-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-frost-01.png")),
  },
  ruby: {
    urlPath: "/avatar-frames/avatar-frame-ruby-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-ruby-01.png")),
  },
  sapphire: {
    urlPath: "/avatar-frames/avatar-frame-sapphire-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-sapphire-01.png")),
  },
  ember: {
    urlPath: "/avatar-frames/avatar-frame-ember-01.png",
    read: () => readFile(path.join(root(), "public/avatar-frames/avatar-frame-ember-01.png")),
  },
};

/** From disk first (`next start`, local, traced bundle) and fetched from this site's static assets otherwise. */
async function readAsset(requestUrl: string, asset: PublicAsset | undefined): Promise<Buffer | null> {
  if (!asset) return null;
  try {
    return await asset.read();
  } catch {
    // Not on disk (the function bundle has no /public): fall through to the static asset URL.
  }
  try {
    const response = await fetch(new URL(asset.urlPath, requestUrl), { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

const dataUri = (bytes: Buffer | null): string | null =>
  bytes ? `data:image/png;base64,${bytes.toString("base64")}` : null;

/** The hero's deterministic avatar frame: same username, same frame as on the sheet. */
export async function loadAvatarFrameArt(requestUrl: string, username: string): Promise<SocialCardFrameArt | null> {
  const frame = getAvatarFrameForUsername(username);
  const src = dataUri(await readAsset(requestUrl, FRAME_ASSETS[frame.id]));
  return src ? { src, avatarRatio: frame.avatarRatio, visibleBottom: frame.visibleBottom } : null;
}

export async function loadSocialCardArt(requestUrl: string, username: string): Promise<SocialCardArt> {
  const [frame, plate, divider, backdrop] = await Promise.all([
    loadAvatarFrameArt(requestUrl, username),
    readAsset(requestUrl, PLATE),
    readAsset(requestUrl, DIVIDER),
    readAsset(requestUrl, BACKDROP),
  ]);
  return { frame, plate: dataUri(plate), divider: dataUri(divider), backdrop: dataUri(backdrop) };
}

/**
 * The sheet's two font families (`font-pixel` = Press Start 2P, `font-sans` = Inter), as TTF: the renderer reads TTF,
 * OTF and WOFF but not the WOFF2 the site serves. Both are SIL OFL fonts (see ./../../../features/share/fonts).
 * The paths are literal so the deployment's file tracing bundles the files with this route.
 */
let fontsPromise: Promise<CardFont[]> | null = null;

function toArrayBuffer(bytes: Buffer): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function loadCardFonts(): Promise<CardFont[]> {
  fontsPromise ??= (async () => {
    const [pixel, sans] = await Promise.all([
      readFile(path.join(process.cwd(), "src/features/share/fonts/PressStart2P-Regular.ttf")),
      readFile(path.join(process.cwd(), "src/features/share/fonts/Inter-Regular.ttf")),
    ]);
    return [
      { name: "Press Start 2P", data: toArrayBuffer(pixel), weight: 400, style: "normal" },
      { name: "Inter", data: toArrayBuffer(sans), weight: 400, style: "normal" },
    ] satisfies CardFont[];
  })().catch((error: unknown) => {
    // Not cached: the next request tries again. The card falls back to the renderer's own face meanwhile.
    fontsPromise = null;
    console.error(`[github-rpg card] fonts unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
    return [];
  });
  return fontsPromise;
}
