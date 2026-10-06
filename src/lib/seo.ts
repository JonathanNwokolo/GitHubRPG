import type { Metadata } from "next";
import { parseGitHubUsername } from "@/data/github/username";
import { InvalidUsernameError } from "@/data/github/errors";
import { profileCardUrl, profileUrl } from "./profileUrl";
import { duelPath, parseDuelUsername } from "@/features/duel/duelUrl";
import { absoluteUrl, getMetadataBase, type SiteUrlEnv } from "./siteUrl";

/**
 * Metadata builders. Pure (no React, no network): every URL is absolute and comes from the one
 * configured site origin, so the tests can pin the exact strings.
 */

export const SITE_NAME = "GitHub RPG";
export const SITE_TITLE = "GitHub RPG - Ficha Épica de Desenvolvedor";
export const SITE_DESCRIPTION =
  "Transforme dados públicos de atividade do GitHub em uma ficha de personagem de fantasia sombria.";

/** The landing has no card of its own: reuse the logo that already ships in /public (256x256). */
const LANDING_IMAGE = { path: "/logo-personagem.png", width: 256, height: 256 } as const;
const LANDING_IMAGE_ALT = "GitHub RPG";

/** Hero Card dimensions (the image route renders exactly this size). */
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

/** Root layout defaults: the base URL every relative metadata URL resolves against, plus title and description. */
export function buildRootMetadata(env?: SiteUrlEnv): Metadata {
  return {
    metadataBase: getMetadataBase(env),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    icons: { icon: "/favicon.ico" },
  };
}

/** Landing page: canonical "/", Open Graph and Twitter. */
export function buildLandingMetadata(env?: SiteUrlEnv): Metadata {
  const url = absoluteUrl("/", env);
  const image = absoluteUrl(LANDING_IMAGE.path, env);
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "pt_BR",
      url,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: image, width: LANDING_IMAGE.width, height: LANDING_IMAGE.height, alt: LANDING_IMAGE_ALT }],
    },
    // The only landing image is a square logo: "summary" is the honest card type for it.
    twitter: {
      card: "summary",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [image],
    },
  };
}

/**
 * Character sheet: canonical, og:url and the card image all use the normalized username and the
 * configured origin. An invalid username will 404, so it gets neutral, non-indexable metadata
 * (no canonical or card image pointing at a page that does not exist).
 */
export function buildProfileMetadata(rawUsername: string, env?: SiteUrlEnv): Metadata {
  let username: string;
  try {
    username = parseGitHubUsername(rawUsername);
  } catch (error) {
    if (error instanceof InvalidUsernameError) {
      return { title: `Perfil não encontrado | ${SITE_NAME}`, robots: { index: false, follow: false } };
    }
    throw error;
  }

  const title = `@${username} | ${SITE_NAME}`;
  const description = `Ficha RPG de @${username} gerada a partir de dados públicos do GitHub.`;
  const url = profileUrl(username, env);
  const cardUrl = profileCardUrl(username, env);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      locale: "pt_BR",
      url,
      title,
      description,
      images: [
        {
          url: cardUrl,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          alt: `Cartão de Herói de @${username} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardUrl],
    },
  };
}

export function buildDuelMetadata(rawHeroA: string, rawHeroB: string, env?: SiteUrlEnv): Metadata {
  let heroA: string;
  let heroB: string;
  try {
    heroA = parseDuelUsername(rawHeroA);
    heroB = parseDuelUsername(rawHeroB);
  } catch (error) {
    if (error instanceof InvalidUsernameError) {
      return { title: `Duelo não encontrado | ${SITE_NAME}`, robots: { index: false, follow: false } };
    }
    throw error;
  }
  const title = `${heroA} vs ${heroB} | ${SITE_NAME}`;
  const description = `Veja o duelo RPG entre ${heroA} e ${heroB} baseado em suas jornadas públicas no GitHub.`;
  const url = absoluteUrl(duelPath(heroA, heroB), env);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "pt_BR", url, title, description },
    twitter: { card: "summary", title, description },
  };
}
