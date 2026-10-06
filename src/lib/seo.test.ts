import { describe, expect, it } from "vitest";
import { buildDuelMetadata, buildLandingMetadata, buildProfileMetadata, buildRootMetadata } from "./seo";

const PRODUCTION = { NEXT_PUBLIC_SITE_URL: "https://githubrpg.vercel.app", NODE_ENV: "production" };

describe("root metadata", () => {
  it("sets metadataBase to the configured origin, not a hard-coded domain", () => {
    expect(buildRootMetadata(PRODUCTION).metadataBase?.href).toBe("https://githubrpg.vercel.app/");
    expect(buildRootMetadata({ NODE_ENV: "development" }).metadataBase?.href).toBe("http://localhost:3000/");
    expect(buildRootMetadata({ NEXT_PUBLIC_SITE_URL: "https://example.org" }).metadataBase?.href).toBe("https://example.org/");
    expect(JSON.stringify(buildRootMetadata(PRODUCTION))).not.toContain("githubrpg.com");
  });
});

describe("landing metadata", () => {
  const meta = buildLandingMetadata(PRODUCTION);

  it("has title, description, canonical, Open Graph and Twitter card", () => {
    expect(meta.title).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe("https://githubrpg.vercel.app/");
    expect(meta.openGraph).toMatchObject({ type: "website", url: "https://githubrpg.vercel.app/", title: meta.title });
    expect(meta.twitter).toMatchObject({ title: meta.title, description: meta.description });
  });

  it("reuses the shipped logo (absolute URL) and does not invent a user card", () => {
    const image = "https://githubrpg.vercel.app/logo-personagem.png";
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: image, width: 256, height: 256 })]);
    expect(meta.twitter?.images).toEqual([image]);
    // A square logo is a "summary" card; "summary_large_image" is reserved for the profile's 1200x630 Hero Card.
    expect((meta.twitter as { card?: string }).card).toBe("summary");
    expect(JSON.stringify(meta)).not.toContain("/api/card/");
  });

  it("follows the configured host", () => {
    const local = buildLandingMetadata({ NODE_ENV: "development" });
    expect(local.alternates?.canonical).toBe("http://localhost:3000/");
    expect(local.openGraph?.url).toBe("http://localhost:3000/");
  });
});

describe("profile metadata", () => {
  const meta = buildProfileMetadata("JonathanNwokolo", PRODUCTION);
  const url = "https://githubrpg.vercel.app/jonathannwokolo";
  const card = "https://githubrpg.vercel.app/api/card/jonathannwokolo";

  it("has a per-profile title and description", () => {
    expect(meta.title).toBe("@JonathanNwokolo | GitHub RPG");
    expect(meta.description).toBe("Ficha RPG de @JonathanNwokolo gerada a partir de dados públicos do GitHub.");
  });

  it("uses a single canonical URL with the normalized username", () => {
    expect(meta.alternates?.canonical).toBe(url);
    expect(meta.openGraph?.url).toBe(url);
    // Same canonical whatever the casing/whitespace of the requested path.
    expect(buildProfileMetadata("jonathannwokolo", PRODUCTION).alternates?.canonical).toBe(url);
    expect(buildProfileMetadata("JONATHANNWOKOLO", PRODUCTION).alternates?.canonical).toBe(url);
    expect(buildProfileMetadata("  JonathanNwokolo ", PRODUCTION).alternates?.canonical).toBe(url);
  });

  it("points og:image and twitter:image at /api/card/{username} on the configured origin", () => {
    expect(meta.openGraph).toMatchObject({ type: "profile", title: meta.title, description: meta.description });
    expect(meta.openGraph?.images).toEqual([
      { url: card, width: 1200, height: 630, alt: "Cartão de Herói de @JonathanNwokolo - GitHub RPG" },
    ]);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [card],
    });
  });

  it("uses the same origin everywhere (host is configurable)", () => {
    const local = buildProfileMetadata("torvalds", { NEXT_PUBLIC_SITE_URL: "http://localhost:3005" });
    expect(local.alternates?.canonical).toBe("http://localhost:3005/torvalds");
    expect(local.openGraph?.url).toBe("http://localhost:3005/torvalds");
    expect(local.openGraph?.images).toEqual([expect.objectContaining({ url: "http://localhost:3005/api/card/torvalds" })]);
    expect(local.twitter?.images).toEqual(["http://localhost:3005/api/card/torvalds"]);
    expect(JSON.stringify(local)).not.toContain("githubrpg");
  });

  it("gives an invalid username neutral, non-indexable metadata (no canonical, no card)", () => {
    for (const invalid of ["", "   ", "-bad", "bad-", "a b", "foo/bar", "x".repeat(40)]) {
      const invalidMeta = buildProfileMetadata(invalid, PRODUCTION);
      expect(invalidMeta.robots).toMatchObject({ index: false });
      expect(invalidMeta.alternates).toBeUndefined();
      expect(invalidMeta.openGraph).toBeUndefined();
      expect(JSON.stringify(invalidMeta)).not.toContain("/api/card/");
    }
  });
});

describe("duel metadata", () => {
  it("describes both heroes and uses a normalized canonical URL", () => {
    const meta = buildDuelMetadata("JonathanNwokolo", "AHEJLSBERG", PRODUCTION);
    expect(meta.title).toBe("JonathanNwokolo vs AHEJLSBERG | GitHub RPG");
    expect(meta.description).toContain("JonathanNwokolo e AHEJLSBERG");
    expect(meta.alternates?.canonical).toBe("https://githubrpg.vercel.app/duel/jonathannwokolo/vs/ahejlsberg");
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  it("does not index invalid duel paths", () => {
    const meta = buildDuelMetadata("../admin", "valid-user", PRODUCTION);
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(meta.alternates).toBeUndefined();
  });
});
