import { describe, expect, it } from "vitest";
import {
  DEVELOPMENT_SITE_URL,
  PRODUCTION_SITE_URL,
  absoluteUrl,
  getMetadataBase,
  getSiteHost,
  getSiteOrigin,
} from "./siteUrl";
import { normalizeProfileUsername, profileCardUrl, profilePath, profileUrl } from "./profileUrl";

describe("site origin", () => {
  it("uses NEXT_PUBLIC_SITE_URL when it is a valid http(s) URL", () => {
    expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "https://example.com", NODE_ENV: "production" })).toBe("https://example.com");
    expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "http://localhost:4000", NODE_ENV: "development" })).toBe("http://localhost:4000");
  });

  it("reduces the configured value to a bare origin (no path, no trailing slash)", () => {
    expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "https://githubrpg.vercel.app/" })).toBe("https://githubrpg.vercel.app");
    expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "  https://githubrpg.vercel.app/some/path?x=1  " })).toBe(
      "https://githubrpg.vercel.app"
    );
  });

  it("falls back to the public deployment in production and to localhost elsewhere", () => {
    expect(PRODUCTION_SITE_URL).toBe("https://githubrpg.vercel.app");
    expect(DEVELOPMENT_SITE_URL).toBe("http://localhost:3000");
    expect(getSiteOrigin({ NODE_ENV: "production" })).toBe(PRODUCTION_SITE_URL);
    expect(getSiteOrigin({ NODE_ENV: "development" })).toBe(DEVELOPMENT_SITE_URL);
    expect(getSiteOrigin({ NODE_ENV: "test" })).toBe(DEVELOPMENT_SITE_URL);
    expect(getSiteOrigin({})).toBe(DEVELOPMENT_SITE_URL);
  });

  it("ignores an empty or invalid value instead of producing a broken base URL", () => {
    for (const bad of ["", "   ", "githubrpg.vercel.app", "javascript:alert(1)", "ftp://example.com", "not a url"]) {
      expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: bad, NODE_ENV: "production" })).toBe(PRODUCTION_SITE_URL);
      expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: bad, NODE_ENV: "development" })).toBe(DEVELOPMENT_SITE_URL);
    }
  });

  it("builds metadataBase, absolute URLs and the card host from the same origin", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "https://githubrpg.vercel.app" };
    expect(getMetadataBase(env).href).toBe("https://githubrpg.vercel.app/");
    expect(absoluteUrl("/foo", env)).toBe("https://githubrpg.vercel.app/foo");
    expect(absoluteUrl("foo", env)).toBe("https://githubrpg.vercel.app/foo");
    expect(getSiteHost(env)).toBe("githubrpg.vercel.app");
    expect(getSiteHost({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toBe("localhost:3000");
  });
});

describe("profile URLs", () => {
  const env = { NEXT_PUBLIC_SITE_URL: "https://githubrpg.vercel.app" };

  it("normalizes the username once: trimmed and lower-cased", () => {
    expect(normalizeProfileUsername("  JonathanNwokolo ")).toBe("jonathannwokolo");
    expect(profilePath("JonathanNwokolo")).toBe("/jonathannwokolo");
  });

  it("the profile URL is the character sheet, the card URL is the image", () => {
    expect(profileUrl("JonathanNwokolo", env)).toBe("https://githubrpg.vercel.app/jonathannwokolo");
    expect(profileCardUrl("JonathanNwokolo", env)).toBe("https://githubrpg.vercel.app/api/card/jonathannwokolo");
  });

  it("encodes unsafe characters so a username can never break out of the path", () => {
    expect(profilePath("a/b?c")).toBe("/a%2Fb%3Fc");
  });
});
