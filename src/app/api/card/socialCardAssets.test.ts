// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AVATAR_FRAMES } from "@/features/avatar/avatarFrames";
import { FRAME_ASSETS, loadAvatarFrameArt, loadCardFonts, loadSocialCardArt } from "./socialCardAssets";

describe("social card assets", () => {
  it("has a PNG twin for every avatar frame (the renderer cannot decode the WebP the sheet uses)", () => {
    for (const frame of AVATAR_FRAMES) {
      const asset = FRAME_ASSETS[frame.id];
      expect(asset, frame.id).toBeDefined();
      expect(asset.urlPath).toBe(frame.src.replace(/\.webp$/, ".png"));
      expect(existsSync(path.join(process.cwd(), "public", asset.urlPath)), asset.urlPath).toBe(true);
    }
  });

  it("loads the hero's own frame with its geometry, deterministically", async () => {
    const first = await loadAvatarFrameArt("http://localhost:3000/", "JonathanNwokolo");
    const again = await loadAvatarFrameArt("http://localhost:3000/", "jonathannwokolo");
    expect(first).not.toBeNull();
    expect(first?.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(again?.src).toBe(first?.src);
    expect(first?.avatarRatio).toBeGreaterThan(0);
    expect(first?.visibleBottom).toBeGreaterThan(0.9);
  });

  it("loads the sheet's plate, divider and backdrop", async () => {
    const art = await loadSocialCardArt("http://localhost:3000/", "artorias");
    expect(art.frame).not.toBeNull();
    for (const piece of [art.plate, art.divider, art.backdrop]) {
      expect(piece?.startsWith("data:image/png;base64,")).toBe(true);
    }
  });

  it("loads the sheet's two font families", async () => {
    const fonts = await loadCardFonts();
    expect(fonts.map((font) => font.name)).toEqual(["Press Start 2P", "Inter"]);
    for (const font of fonts) expect(font.data.byteLength).toBeGreaterThan(10_000);
  });
});
