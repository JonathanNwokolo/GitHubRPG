import { describe, it, expect } from "vitest";
import { renderProceduralAvatarSvg, generateAvatarAttributes } from "./proceduralAvatar";
import { fnv1a } from "@/data/seed/hashAndPrng";

describe("Procedural Avatar Engine", () => {
  it("generates deterministic SVG string for a given seed", () => {
    const seed = fnv1a("alden-the-mage");
    const svg1 = renderProceduralAvatarSvg(seed);
    const svg2 = renderProceduralAvatarSvg(seed);

    expect(svg1).toBe(svg2);
    expect(svg1).toContain("<svg");
    expect(svg1).toContain("</svg>");
  });

  it("generates different visual attributes for different seeds", () => {
    const seedA = fnv1a("user-alpha");
    const seedB = fnv1a("user-omega");

    const attrsA = generateAvatarAttributes(seedA);
    const attrsB = generateAvatarAttributes(seedB);

    // At least one visual attribute should differ
    const isDifferent =
      attrsA.bgGradientStart !== attrsB.bgGradientStart ||
      attrsA.skinColor !== attrsB.skinColor ||
      attrsA.headwearType !== attrsB.headwearType;

    expect(isDifferent).toBe(true);
  });
});
