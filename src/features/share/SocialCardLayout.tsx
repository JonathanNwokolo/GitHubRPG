import React from "react";
import { fallbackBadge, hasLanguageGlyph, LanguageIcon } from "@/design-system/icons/LanguageIcons";
import { RpgClassIcon } from "@/design-system/icons/RpgClassIcons";
import { RpgSparkles } from "@/design-system/icons/RpgIcons";
import type { FlameLevel } from "@/features/activity-flame/types";
import { StarIcon } from "./cardKit";
import { SOCIAL_CARD_SIZE, type SocialCardContent, type SocialCardFlame } from "./socialCardContent";

/**
 * The Hero Social Card: a 1080 x 1350 (4:5) portrait designed for a feed, not a screenshot of the sheet.
 * It renders through next/og (satori): flex layout, inline styles, no CSS grid, so the two-column header is an
 * explicit pair of fixed-width columns.
 *
 * It is an extension of the character sheet, not a second visual language: the same fonts (Press Start 2P and Inter,
 * see ./fonts), the same level plate artwork, the same class insignia (RpgClassIcon), the same hero-frame ornaments,
 * and the sheet's own palette (profile-ui.css `--pf-*`, tailwind amber/slate). Only the SCALE changes.
 */

export interface SocialCardFrameArt {
  /** Data URI of the avatar frame (the renderer fetches nothing itself). */
  src: string;
  /** Side of the avatar that fits the frame's window, as a fraction of the frame image (see avatarFrames.ts). */
  avatarRatio: number;
  /** Where the artwork ends at the bottom, as a fraction of the frame image (see avatarFrames.ts). */
  visibleBottom: number;
}

/** Decorative artwork of the card. Every piece is optional: a card without it is still a true card. */
export interface SocialCardArt {
  /** The hero's deterministic avatar frame: the avatar then gets a plain rim without it. */
  frame: SocialCardFrameArt | null;
  /** The level plate of the sheet (profile-stat-plate). Without it the level is a plain tinted box. */
  plate: string | null;
  /** The sheet's ornamental divider (profile-divider). */
  divider: string | null;
  /**
   * The whole static backdrop as ONE bitmap: the sheet's stage and hero plate (bronze edge, warm glow) with its
   * corner ornaments and crest. Large gradients are what the renderer is slowest at, so they are baked, not drawn.
   */
  backdrop: string | null;
}

export interface SocialCardLayoutProps {
  content: SocialCardContent;
  /** Data URI of the avatar photo (or the procedural fallback). */
  avatarSrc: string;
  art: SocialCardArt;
  /** What is printed as the link, e.g. "githubrpg.vercel.app/JonathanNwokolo". */
  displayUrl: string;
}

/** Font families registered with the renderer (see cardFonts.ts). Same families as the sheet's `font-pixel` and `font-sans`. */
export const SOCIAL_FONTS = { pixel: "Press Start 2P", sans: "Inter" } as const;

/** The Activity Flame palette (activity-flame.css `--af-l0..l5`): black, bronze, orange, gold, bright gold, white-gold. */
export const SOCIAL_FLAME_PALETTE = ["#0c0908", "#5b3216", "#c2570c", "#d9a441", "#f8c744", "#fff4cb"] as const;
const FLAME_EDGE = "rgba(112, 80, 42, 0.55)";

interface CellArt {
  border: string;
  mark: string | null;
  markSize: number;
  /** A flat, translucent square behind the cell: the glow of the brightest runes. */
  halo: { color: string; spread: number } | null;
}

/** The same carved-rune look as the sheet: the level is told by color AND by the mark inside the cell. */
const CELL_ART: Record<FlameLevel, CellArt> = {
  0: { border: FLAME_EDGE, mark: null, markSize: 0, halo: null },
  1: { border: "#7a4a22", mark: null, markSize: 0, halo: null },
  2: { border: "#e98a2b", mark: "#ffd9a1", markSize: 3, halo: null },
  3: { border: "#f0c466", mark: "#3a2208", markSize: 4, halo: null },
  4: { border: "#ffe08a", mark: "#3a2208", markSize: 6, halo: { color: "rgba(248, 199, 68, 0.28)", spread: 2 } },
  5: { border: "#ffffff", mark: "#b45309", markSize: 6, halo: { color: "rgba(255, 233, 160, 0.45)", spread: 3 } },
};

/**
 * The sheet's tokens, by the name they have there: `--pf-*` (profile-ui.css) and the tailwind classes the header
 * uses (amber-50 name, amber-300 class and title, slate-200 subclass, slate-400 username, purple arcane badge).
 */
const COLORS = {
  gold: "#f7e0aa", // --pf-gold: section titles
  amber: "#f0a43a", // --pf-amber
  muted: "#a99f8c", // --pf-muted
  ink: "#ece3cf", // --pf-ink
  name: "#fffbeb", // text-amber-50
  classText: "#fcd34d", // text-amber-300
  subclass: "#e2e8f0", // text-slate-200
  username: "#94a3b8", // text-slate-400
  plateLabel: "#b9a77e", // .pf-plate__label
  plateValue: "#fae4b5", // .pf-plate__value
  edge: "#70502a", // .pf-hero__edge / .af-panel border
  panel: "#110d0f", // .pf-hero__edge / .af-panel background
  cardBorder: "#483822", // .pf-grimoire-card
  arcaneText: "#e9d5ff", // Badge arcane: purple-200
  arcaneBorder: "#c084fc", // Badge arcane: purple-400
  page: "#0d0b0d",
} as const;

/** One spacing scale for the whole card (the sheet's 4px rhythm, doubled for the larger canvas). */
const SPACE = { xs: 8, sm: 16, md: 24, lg: 32 } as const;

const CARD_WIDTH = SOCIAL_CARD_SIZE.width;
const CARD_HEIGHT = SOCIAL_CARD_SIZE.height;
const EDGE_INSET = 10;
const CONTENT_PADDING_X = 64;
const CONTENT_WIDTH = CARD_WIDTH - CONTENT_PADDING_X * 2;

/** The avatar window is the same for every hero (as on the sheet); each frame is scaled around it. */
const AVATAR_WINDOW = 190;
const AVATAR_WINDOW_ALONE = 230;
const HERO_COLUMN = 400;
const HERO_COLUMN_GAP = 40;
/** The level plate artwork, trimmed to its visible bounds (312 x 203). */
const PLATE_WIDTH = 232;
const PLATE_HEIGHT = Math.round((PLATE_WIDTH * 203) / 312);
/** The sheet's plate is 124px wide for 340px of artwork canvas, of which 312px is visible: its type scale follows. */
const PLATE_SCALE = PLATE_WIDTH / (124 * (312 / 340));
/** The header sits clear of the corner ornaments (120px each). */
const HEADER_INSET = 66;

/**
 * The renderer ships one weight per family, so "bold" text gets its weight from a thin stroke in its own color:
 * what `font-bold` / `font-extrabold` do on the sheet.
 */
const strokeText = (color: string, width: number): React.CSSProperties => ({ color, WebkitTextStroke: `${width}px ${color}` });
const bold = (color: string) => strokeText(color, 0.8);
const extraBold = (color: string) => strokeText(color, 1.4);

function Divider({ src, width }: { src: string | null; width: number }) {
  if (!src) return <div style={{ display: "flex", width, height: 1, background: COLORS.edge }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={width} height={Math.round((width * 80) / 1200)} style={{ opacity: 0.9 }} />
  );
}

/** The hero's frame around the photo, scaled so every frame's window is the same size (as on the sheet). */
function Portrait({
  avatarSrc,
  frame,
  windowSize,
}: {
  avatarSrc: string;
  frame: SocialCardFrameArt | null;
  windowSize: number;
}) {
  const frameSize = frame ? Math.round(windowSize / frame.avatarRatio) : windowSize + 24;
  // The box ends where the artwork ends, so the space under it is real and the same for every frame.
  const boxHeight = frame ? Math.round(frameSize * frame.visibleBottom) : frameSize;
  const windowOffset = (frameSize - windowSize) / 2;
  return (
    <div style={{ position: "relative", display: "flex", width: frameSize, height: boxHeight }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: frameSize,
          height: frameSize,
          backgroundImage: "radial-gradient(circle, rgba(240, 164, 58, 0.26), rgba(240, 164, 58, 0) 66%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: windowOffset,
          top: windowOffset,
          width: windowSize,
          height: windowSize,
          display: "flex",
          overflow: "hidden",
          background: COLORS.panel,
          // satori rejects a style key whose value is undefined: add the plain rim only when there is no frame art.
          ...(frame ? {} : { border: `3px solid ${COLORS.edge}`, boxShadow: "0 0 30px rgba(240, 164, 58, 0.35)" }),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt="" width={windowSize} height={windowSize} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      </div>
      {frame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={frame.src} alt="" width={frameSize} height={frameSize} style={{ position: "absolute", left: 0, top: 0 }} />
      )}
    </div>
  );
}

/** The sheet's level plate (same artwork, label and number typography), plus the tier under it, at the card's scale. */
function LevelBlock({ label, level, tier, plate }: { label: string; level: number; tier: string; plate: string | null }) {
  const scale = PLATE_SCALE;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xs }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: PLATE_WIDTH,
          height: PLATE_HEIGHT,
          paddingTop: Math.round(4 * scale),
          ...(plate
            ? {}
            : { border: `2px solid ${COLORS.edge}`, backgroundImage: "linear-gradient(180deg, #2c1b09, #120b05)" }),
        }}
      >
        {plate && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plate} alt="" width={PLATE_WIDTH} height={PLATE_HEIGHT} style={{ position: "absolute", left: 0, top: 0 }} />
        )}
        <span
          style={{
            fontFamily: SOCIAL_FONTS.sans,
            fontSize: Math.round(9 * scale),
            lineHeight: 1,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            ...bold(COLORS.plateLabel),
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: SOCIAL_FONTS.pixel,
            fontSize: Math.round(22 * scale),
            lineHeight: 1,
            marginTop: Math.round(4 * scale),
            color: COLORS.plateValue,
            textShadow: "0 2px 3px #000",
          }}
        >
          {level}
        </span>
      </div>
      <span
        style={{
          fontFamily: SOCIAL_FONTS.sans,
          fontSize: Math.round(11 * scale),
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          ...bold(COLORS.classText),
        }}
      >
        {tier}
      </span>
    </div>
  );
}

const NAME_SIZES = [44, 40, 36, 32, 28, 24, 20] as const;

/**
 * Fits the display name in at most two lines at the largest size whose widest word fits the column. The font is a
 * fixed-width pixel font (one em per letter), so the fit is exact. The break is chosen, not accidental: the two
 * lines are as even as the words allow ("Guido van" / "Rossum").
 */
export function fitName(name: string, width: number): { size: number; lines: string[] } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const length = (parts: string[]) => parts.join(" ").length;

  for (const size of NAME_SIZES) {
    const perLine = Math.floor(width / size);
    if (words.some((word) => word.length > perLine)) continue;
    if (length(words) <= perLine) return { size, lines: [words.join(" ")] };

    let best: string[] | null = null;
    let bestWidest = Infinity;
    for (let cut = 1; cut < words.length; cut++) {
      const first = words.slice(0, cut);
      const second = words.slice(cut);
      const widest = Math.max(length(first), length(second));
      if (widest <= perLine && widest < bestWidest) {
        best = [first.join(" "), second.join(" ")];
        bestWidest = widest;
      }
    }
    if (best) return { size, lines: best };
  }

  // Nothing fits even at the smallest size: clip to two lines, never overflow.
  const size = NAME_SIZES[NAME_SIZES.length - 1];
  const perLine = Math.floor(width / size);
  const flat = words.join(" ");
  const first = flat.slice(0, perLine).trimEnd();
  const rest = flat.slice(perLine).trimStart();
  if (!rest) return { size, lines: [first] };
  return { size, lines: [first, rest.length > perLine ? `${rest.slice(0, perLine - 1)}…` : rest] };
}

function AffinityIcon({ language }: { language: string }) {
  if (hasLanguageGlyph(language)) {
    return (
      <div style={{ display: "flex", width: 36, height: 36 }}>
        <LanguageIcon language={language} className="" />
      </div>
    );
  }
  // satori cannot draw SVG <text>: a language without a brand glyph gets the same badge made of a div.
  const badge = fallbackBadge(language);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 6,
        background: badge.color,
        color: badge.ink,
        fontFamily: SOCIAL_FONTS.sans,
        fontSize: badge.label.length > 2 ? 14 : 17,
      }}
    >
      {badge.label}
    </div>
  );
}

/** Identity block: name, username, title, then class (with its insignia), subclass and evolution. */
function Identity({ content, stacked, width }: { content: SocialCardContent; stacked: boolean; width: number }) {
  const align = stacked ? "center" : "flex-start";
  const name = fitName(content.displayName, width);
  const classLength = Math.max(1, [...content.className].length);
  const classSize = Math.max(26, Math.min(38, Math.floor((width - 70) / (classLength * 0.82 + 0.1 * classLength))));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, width, gap: SPACE.md }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: SPACE.xs }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: Math.round(name.size * 0.4) }}>
          {name.lines.map((line) => (
            <span
              key={line}
              style={{
                fontFamily: SOCIAL_FONTS.pixel,
                fontSize: name.size,
                lineHeight: 1.1,
                color: COLORS.name,
                textShadow: "0 2px 3px #000",
              }}
            >
              {line}
            </span>
          ))}
        </div>
        <span style={{ fontFamily: SOCIAL_FONTS.sans, fontSize: 26, color: COLORS.username }}>@{content.username}</span>
      </div>

      {content.title && (
        <span
          style={{
            fontFamily: SOCIAL_FONTS.sans,
            fontSize: 32,
            lineHeight: 1.2,
            // The sheet sets the title in italic (text-amber-300): the renderer has no italic face, so it is slanted.
            transform: "skewX(-9deg)",
            textAlign: stacked ? "center" : "left",
            ...bold(COLORS.classText),
          }}
        >
          &laquo; {content.title} &raquo;
        </span>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: SPACE.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <div style={{ display: "flex", width: classSize + 6, height: classSize + 6, color: COLORS.classText }}>
            <RpgClassIcon classNameType={content.classIcon} size={classSize + 6} />
          </div>
          <span
            style={{
              fontFamily: SOCIAL_FONTS.sans,
              fontSize: classSize,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              ...extraBold(COLORS.classText),
            }}
          >
            {content.className}
          </span>
        </div>

        {content.subclassName && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            {content.subclassIcon && (
              <div style={{ display: "flex", width: 30, height: 30, color: COLORS.subclass }}>
                <RpgClassIcon classNameType={content.subclassIcon} size={30} />
              </div>
            )}
            <span style={{ fontFamily: SOCIAL_FONTS.sans, fontSize: 30, ...bold(COLORS.subclass) }}>{content.subclassName}</span>
          </div>
        )}

        {content.evolutionName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: SPACE.xs,
              padding: "6px 14px",
              border: `1px solid ${COLORS.arcaneBorder}`,
              background: "rgba(59, 7, 100, 0.8)",
              color: COLORS.arcaneText,
            }}
          >
            <div style={{ display: "flex", width: 22, height: 22, color: COLORS.arcaneText }}>
              <RpgSparkles size={22} />
            </div>
            <span
              style={{
                fontFamily: SOCIAL_FONTS.sans,
                fontSize: 20,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                ...bold(COLORS.arcaneText),
              }}
            >
              {content.texts.evolution}: {content.evolutionName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The year as columns of weeks (Sunday first), newest to the right: the sheet's heatmap, compact. Drawn as ONE svg
 * (a few hundred rects) instead of a few hundred nested boxes with blurred shadows: the renderer lays out and
 * paints it in a fraction of the time, and the glow of the brightest runes is a flat halo behind them.
 */
function MiniHeatmap({ flame, width }: { flame: SocialCardFlame; width: number }) {
  const gap = 2;
  const weeks = Math.max(1, Math.ceil((flame.startDow + flame.levels.length) / 7));
  const cell = Math.max(6, Math.floor((width - (weeks - 1) * gap) / weeks));
  const step = cell + gap;
  const totalWidth = weeks * cell + (weeks - 1) * gap;
  const totalHeight = 7 * cell + 6 * gap;

  const halos: React.ReactElement[] = [];
  const cells: React.ReactElement[] = [];
  const marks: React.ReactElement[] = [];

  for (let column = 0; column < weeks; column++) {
    for (let row = 0; row < 7; row++) {
      const index = column * 7 + row - flame.startDow;
      if (index < 0 || index >= flame.levels.length) continue;
      const x = column * step;
      const y = row * step;
      const key = `${column}-${row}`;

      if (index < flame.firstDayIndex) {
        // Before the hero existed: carved and unlit, as on the sheet.
        cells.push(
          <rect key={key} x={x + 0.5} y={y + 0.5} width={cell - 1} height={cell - 1} fill="none" stroke="rgba(112, 80, 42, 0.3)" />
        );
        continue;
      }

      const level = flame.levels[index];
      const art = CELL_ART[level];
      if (art.halo) {
        halos.push(
          <rect
            key={key}
            x={x - art.halo.spread}
            y={y - art.halo.spread}
            width={cell + art.halo.spread * 2}
            height={cell + art.halo.spread * 2}
            fill={art.halo.color}
          />
        );
      }
      cells.push(
        <rect
          key={key}
          x={x + 0.5}
          y={y + 0.5}
          width={cell - 1}
          height={cell - 1}
          fill={SOCIAL_FLAME_PALETTE[level]}
          stroke={art.border}
          strokeWidth={1}
        />
      );
      if (art.mark) {
        const side = Math.min(art.markSize, cell - 4);
        marks.push(
          <rect key={key} x={x + (cell - side) / 2} y={y + (cell - side) / 2} width={side} height={side} fill={art.mark} />
        );
      }
    }
  }

  return (
    <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
      {halos}
      {cells}
      {marks}
    </svg>
  );
}

/** Section title as the sheet sets it: pixel font, uppercase, tracked, in --pf-gold. */
function SectionTitle({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <span
      style={{
        fontFamily: SOCIAL_FONTS.pixel,
        fontSize: size,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: COLORS.gold,
      }}
    >
      {children}
    </span>
  );
}

function FlamePanel({ flame, label, inProgress }: { flame: SocialCardFlame; label: string; inProgress: string }) {
  const padX = SPACE.lg;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: SPACE.md,
        padding: `${SPACE.md}px ${padX}px`,
        border: `2px solid ${COLORS.edge}`,
        backgroundColor: COLORS.panel,
        backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(240, 164, 58, 0.1), rgba(240, 164, 58, 0) 70%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionTitle>{label}</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          {flame.inProgress && (
            <span
              style={{
                fontFamily: SOCIAL_FONTS.sans,
                fontSize: 15,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                ...bold(COLORS.classText),
              }}
            >
              {inProgress}
            </span>
          )}
          <span style={{ fontFamily: SOCIAL_FONTS.pixel, fontSize: 22, color: COLORS.plateValue }}>{flame.year}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <MiniHeatmap flame={flame} width={CONTENT_WIDTH - 4 - padX * 2} />
      </div>

      <div style={{ display: "flex" }}>
        {flame.metrics.map((metric, index) => (
          <div
            key={metric.id}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: SPACE.xs,
              paddingLeft: index === 0 ? 0 : SPACE.md,
              ...(index === 0 ? {} : { borderLeft: `1px solid ${COLORS.edge}` }),
            }}
          >
            <span style={{ fontFamily: SOCIAL_FONTS.pixel, fontSize: 24, lineHeight: 1.1, color: COLORS.plateValue }}>
              {metric.value}
            </span>
            <span
              style={{
                fontFamily: SOCIAL_FONTS.sans,
                fontSize: 15,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                ...bold(COLORS.muted),
              }}
            >
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AffinityRow({ content }: { content: SocialCardContent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
      <SectionTitle size={18}>{content.texts.affinities}</SectionTitle>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        {content.affinities.map((affinity) => (
          <div
            key={affinity.name}
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              gap: SPACE.sm,
              padding: SPACE.sm,
              border: `1px solid ${COLORS.cardBorder}`,
              backgroundImage: "linear-gradient(180deg, #181316, #100d0f)",
            }}
          >
            <AffinityIcon language={affinity.name} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span
                style={{
                  fontFamily: SOCIAL_FONTS.sans,
                  fontSize: [...affinity.name].length > 12 ? 22 : 26,
                  lineHeight: 1.15,
                  ...bold("#f1f5f9"),
                }}
              >
                {affinity.name}
              </span>
              {affinity.share && (
                <span style={{ fontFamily: SOCIAL_FONTS.sans, fontSize: 20, ...bold("#fde68a") }}>{affinity.share}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SocialCardLayout: React.FC<SocialCardLayoutProps> = ({ content, avatarSrc, art, displayUrl }) => {
  const { texts } = content;
  // With a flame panel the hero is a row (portrait + level on the left, identity on the right); alone, the same
  // blocks stack and center so the card still fills its canvas.
  const stacked = content.flame === null;
  const identityWidth = stacked ? CONTENT_WIDTH : CONTENT_WIDTH - HERO_COLUMN - HERO_COLUMN_GAP;

  return (
    <div
      style={{
        position: "relative",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        backgroundColor: COLORS.page,
        color: COLORS.ink,
      }}
    >
      {art.backdrop ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art.backdrop}
          alt=""
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
      ) : (
        // Without the artwork: the plate and its bronze edge, flat.
        <div
          style={{
            position: "absolute",
            left: EDGE_INSET,
            top: EDGE_INSET,
            right: EDGE_INSET,
            bottom: EDGE_INSET,
            display: "flex",
            border: `2px solid ${COLORS.edge}`,
            backgroundColor: COLORS.panel,
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: `${SPACE.lg + 28}px ${CONTENT_PADDING_X}px ${SPACE.lg + 8}px`,
          gap: SPACE.md,
        }}
      >
        {/* Branding stays small: the hero is the protagonist. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: HEADER_INSET,
            paddingRight: HEADER_INSET,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
            <StarIcon size={18} color={COLORS.amber} />
            <span style={{ fontFamily: SOCIAL_FONTS.pixel, fontSize: 16, letterSpacing: "0.08em", color: COLORS.gold }}>
              GITHUB RPG
            </span>
          </div>
          <span
            style={{
              fontFamily: SOCIAL_FONTS.sans,
              fontSize: 15,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              ...bold(COLORS.muted),
            }}
          >
            {texts.kicker}
          </span>
        </div>

        {/* Hero: avatar and level share a column, identity is the other. Nothing overlaps. */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: stacked ? "column" : "row",
            alignItems: "center",
            justifyContent: stacked ? "center" : "flex-start",
            gap: stacked ? SPACE.lg : HERO_COLUMN_GAP,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: stacked ? CONTENT_WIDTH : HERO_COLUMN,
              gap: SPACE.md,
            }}
          >
            <Portrait avatarSrc={avatarSrc} frame={art.frame} windowSize={stacked ? AVATAR_WINDOW_ALONE : AVATAR_WINDOW} />
            <LevelBlock label={texts.level} level={content.level} tier={content.tier} plate={art.plate} />
          </div>

          <Identity content={content} stacked={stacked} width={identityWidth} />
        </div>

        <Divider src={art.divider} width={CONTENT_WIDTH} />

        {content.affinities.length > 0 && <AffinityRow content={content} />}

        {content.flame && <FlamePanel flame={content.flame} label={texts.flame} inProgress={texts.flameInProgress} />}

        {/* Link + honesty line */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xs }}>
          <span style={{ fontFamily: SOCIAL_FONTS.pixel, fontSize: 18, letterSpacing: "0.04em", color: COLORS.gold }}>
            {displayUrl}
          </span>
          <span style={{ fontFamily: SOCIAL_FONTS.sans, fontSize: 15, letterSpacing: "0.04em", color: COLORS.muted }}>
            {texts.disclaimer}
          </span>
        </div>
      </div>
    </div>
  );
};
