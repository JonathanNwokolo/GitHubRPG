import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AVATAR_FRAMES,
  DEFAULT_AVATAR_FRAME,
  getAvatarFrameForUsername,
  normalizeFrameUsername,
} from "./avatarFrames";

describe("avatar frame catalogue", () => {
  it("has unique ids and unique files that follow the naming convention", () => {
    const ids = AVATAR_FRAMES.map((frame) => frame.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const frame of AVATAR_FRAMES) {
      expect(frame.src).toBe(`/avatar-frames/avatar-frame-${frame.id}-01.webp`);
    }
  });

  it("points every frame at an existing file with a sane window ratio", () => {
    for (const frame of AVATAR_FRAMES) {
      expect(fs.existsSync(path.join(process.cwd(), "public", frame.src))).toBe(true);
      expect(frame.avatarRatio).toBeGreaterThan(0.3);
      expect(frame.avatarRatio).toBeLessThan(0.9);
    }
  });
});

describe("getAvatarFrameForUsername", () => {
  it("always returns the same frame for the same username", () => {
    for (const username of ["torvalds", "JonathanNwokolo", "ahejlsberg"]) {
      const first = getAvatarFrameForUsername(username);
      for (let i = 0; i < 5; i++) expect(getAvatarFrameForUsername(username)).toBe(first);
    }
  });

  it("pins known usernames to known frames (guards against accidental reshuffling)", () => {
    expect(getAvatarFrameForUsername("torvalds").id).toBe("frost");
    expect(getAvatarFrameForUsername("JonathanNwokolo").id).toBe("ruby");
    expect(getAvatarFrameForUsername("ahejlsberg").id).toBe("amethyst");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(normalizeFrameUsername("  TorValds ")).toBe("torvalds");
    expect(getAvatarFrameForUsername("TORVALDS")).toBe(getAvatarFrameForUsername("torvalds"));
    expect(getAvatarFrameForUsername("  torvalds\n")).toBe(getAvatarFrameForUsername("torvalds"));
  });

  it("spreads different usernames across the frames", () => {
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) used.add(getAvatarFrameForUsername(`user-${i}`).id);
    expect(used.size).toBe(AVATAR_FRAMES.length);
  });

  it("falls back to the default frame when there is no username", () => {
    expect(getAvatarFrameForUsername()).toBe(DEFAULT_AVATAR_FRAME);
    expect(getAvatarFrameForUsername(null)).toBe(DEFAULT_AVATAR_FRAME);
    expect(getAvatarFrameForUsername("   ")).toBe(DEFAULT_AVATAR_FRAME);
  });
});
