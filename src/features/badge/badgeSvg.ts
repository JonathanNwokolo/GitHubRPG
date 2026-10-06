/**
 * README badge: one small SVG with the brand, the level and the class (plus subclass when there is one).
 * Pure (no React, no clock, no network): the same input always gives the same bytes, which is what makes
 * the response safe to cache. The markup is built from a fixed template; the ONLY dynamic text is escaped
 * (`escapeXml`), the rest are numbers computed here, so no GitHub data can reach the XML as markup.
 */

export interface BadgeInput {
  username: string;
  level: number;
  className: string;
  subclassName?: string;
}

const HEIGHT = 26;
const FONT_SIZE = 11;
const FONT_FAMILY = "Verdana, Geneva, DejaVu Sans, sans-serif";

const COLORS = {
  background: "#0b101c",
  border: "#d97706",
  gold: "#f59e0b",
  onGold: "#0b101c",
  text: "#f1f5f9",
} as const;

/** Control characters the XML 1.0 spec forbids: they would make the SVG unparseable. */
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Makes any text safe for XML element content and attribute values (double or single quoted). */
export function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Rough glyph widths (in em) of Verdana, enough to size the segments. `textLength` pins the real width. */
function glyphWidth(char: string): number {
  if (char === " ") return 0.35;
  if ("il.,:;|'!".includes(char)) return 0.32;
  if ("fjrtI()[]/-".includes(char)) return 0.45;
  if ("mwMW".includes(char)) return 0.92;
  if (/[0-9]/.test(char)) return 0.64;
  if (/[A-Z]/.test(char)) return 0.7;
  return 0.6;
}

function textWidth(text: string, letterSpacing = 0): number {
  let width = 0;
  for (const char of text) width += glyphWidth(char) * FONT_SIZE + letterSpacing;
  return Math.ceil(width);
}

/** A whole, positive level: whatever arrives, the badge never prints "NaN" or a negative number. */
function safeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1;
}

/** "Mago" or "Mago / Bardo". */
export function badgeClassLabel(className: string, subclassName?: string): string {
  return subclassName ? `${className} / ${subclassName}` : className;
}

/** What assistive technology reads (also used as the <title> tooltip). */
export function badgeDescription({ username, level, className, subclassName }: BadgeInput): string {
  return `GitHub RPG: @${username}, LV.${safeLevel(level)}, ${badgeClassLabel(className, subclassName)}`;
}

export function buildBadgeSvg(input: BadgeInput): string {
  const brand = "GITHUB RPG";
  const levelText = `LV.${safeLevel(input.level)}`;
  const classText = badgeClassLabel(input.className, input.subclassName);

  const padding = 10;
  const diamond = 8;
  const brandSpacing = 1;
  const brandWidth = textWidth(brand, brandSpacing);
  const levelWidth = textWidth(levelText);
  const classWidth = textWidth(classText);

  const brandSegment = padding + diamond + 6 + brandWidth + padding;
  const levelSegment = padding + levelWidth + padding;
  const classSegment = padding + classWidth + padding;
  const width = brandSegment + levelSegment + classSegment;

  const textY = 17;
  const levelX = brandSegment;
  const classX = brandSegment + levelSegment;
  const diamondCenterX = padding + diamond / 2;
  const diamondCenterY = HEIGHT / 2;
  const description = escapeXml(badgeDescription(input));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label="${description}">`,
    `<title>${description}</title>`,
    `<rect width="${width}" height="${HEIGHT}" rx="4" fill="${COLORS.background}"/>`,
    `<rect x="${levelX}" y="1" width="${levelSegment}" height="${HEIGHT - 2}" fill="${COLORS.gold}"/>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${HEIGHT - 1}" rx="3.5" fill="none" stroke="${COLORS.border}"/>`,
    `<polygon points="${diamondCenterX},${diamondCenterY - diamond / 2} ${diamondCenterX + diamond / 2},${diamondCenterY} ${diamondCenterX},${diamondCenterY + diamond / 2} ${diamondCenterX - diamond / 2},${diamondCenterY}" fill="${COLORS.gold}"/>`,
    `<g font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold">`,
    `<text x="${padding + diamond + 6}" y="${textY}" fill="${COLORS.gold}" textLength="${brandWidth}" lengthAdjust="spacingAndGlyphs">${escapeXml(brand)}</text>`,
    `<text x="${levelX + padding}" y="${textY}" fill="${COLORS.onGold}" textLength="${levelWidth}" lengthAdjust="spacingAndGlyphs">${escapeXml(levelText)}</text>`,
    `<text x="${classX + padding}" y="${textY}" fill="${COLORS.text}" textLength="${classWidth}" lengthAdjust="spacingAndGlyphs">${escapeXml(classText)}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}
