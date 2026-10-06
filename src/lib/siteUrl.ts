/**
 * The public origin of the site (OG tags, canonical URLs and the link people share).
 *
 * Single source of truth: nothing else in the project hard-codes the domain.
 * `NEXT_PUBLIC_SITE_URL` only ever holds a PUBLIC URL (it is inlined in the bundle at build time).
 * Never put a secret (a GitHub token or anything else private) in a NEXT_PUBLIC_ variable.
 */

/** Public deployment, used when the build is a production build and no override is set. */
export const PRODUCTION_SITE_URL = "https://githubrpg.vercel.app";

/** Local development / test fallback. */
export const DEVELOPMENT_SITE_URL = "http://localhost:3000";

export interface SiteUrlEnv {
  NEXT_PUBLIC_SITE_URL?: string;
  NODE_ENV?: string;
}

/**
 * Next only inlines a NEXT_PUBLIC_ variable when it is read with its literal name, so the default is
 * built here instead of passing the whole environment object around.
 */
function readProcessEnv(): SiteUrlEnv {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
}

/** Reduces a configured value to a bare origin ("https://host"), or null when it is not an http(s) URL. */
function toOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origin without a trailing slash: `NEXT_PUBLIC_SITE_URL` when it is a valid http(s) URL,
 * otherwise the production domain (production builds) or localhost (everything else).
 */
export function getSiteOrigin(env: SiteUrlEnv = readProcessEnv()): string {
  const configured = toOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  return env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
}

/** `metadataBase` for Next's Metadata API. */
export function getMetadataBase(env?: SiteUrlEnv): URL {
  return new URL(getSiteOrigin(env));
}

/** Absolute URL for a site path ("/foo" -> "https://host/foo"). */
export function absoluteUrl(path: string, env?: SiteUrlEnv): string {
  return `${getSiteOrigin(env)}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Host shown to people (card footer), e.g. "githubrpg.vercel.app". */
export function getSiteHost(env?: SiteUrlEnv): string {
  return new URL(getSiteOrigin(env)).host;
}
