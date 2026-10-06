import React from "react";

/**
 * The shared building blocks of every 1200 x 630 share card (Hero, Achievement, Chronicle): size, palette,
 * frame, header bar, footer bar and the avatar frame. They render through next/og (satori), so everything is
 * plain flex layout with inline styles. Each card layout only adds its own body, which keeps the cards
 * visually consistent and stops each new card from becoming one more independent implementation.
 */

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export const CARD_COLORS = {
  page: "#05070d",
  cardBg: "#0b101c",
  innerBg: "#060912",
  border: "#202c44",
  gold: "#f59e0b",
  borderGold: "#d97706",
  textPrimary: "#ffffff",
  textBody: "#f1f5f9",
  textSoft: "#cbd5e1",
  textMuted: "#94a3b8",
} as const;

export const CARD_FONT_FAMILY = "sans-serif";

export function StarIcon({ size = 16, color = CARD_COLORS.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
    </svg>
  );
}

/** Page background + the golden frame with its four corner runes. The card body goes inside. */
export const CardFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: `${CARD_SIZE.width}px`,
      height: `${CARD_SIZE.height}px`,
      display: "flex",
      flexDirection: "column",
      background: CARD_COLORS.page,
      padding: "18px",
      fontFamily: CARD_FONT_FAMILY,
      color: CARD_COLORS.textPrimary,
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `2px solid ${CARD_COLORS.borderGold}`,
        background: CARD_COLORS.cardBg,
        padding: "24px 30px",
        position: "relative",
      }}
    >
      {/* Decorative corner runes */}
      <div style={{ position: "absolute", top: 5, left: 5, width: 9, height: 9, background: CARD_COLORS.gold }} />
      <div style={{ position: "absolute", top: 5, right: 5, width: 9, height: 9, background: CARD_COLORS.gold }} />
      <div style={{ position: "absolute", bottom: 5, left: 5, width: 9, height: 9, background: CARD_COLORS.gold }} />
      <div style={{ position: "absolute", bottom: 5, right: 5, width: 9, height: 9, background: CARD_COLORS.gold }} />
      {children}
    </div>
  </div>
);

/** "★ GITHUB RPG | <label>" on the left, anything (a tier, a rarity) on the right. */
export const CardHeaderBar: React.FC<{ brand?: string; label: string; right?: React.ReactNode }> = ({
  brand = "GITHUB RPG",
  label,
  right,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      borderBottom: `1px solid ${CARD_COLORS.border}`,
      paddingBottom: "14px",
      marginBottom: "16px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <StarIcon size={18} color={CARD_COLORS.gold} />
      <span style={{ fontSize: "18px", fontWeight: "bold", color: CARD_COLORS.gold, letterSpacing: "2px" }}>{brand}</span>
      <span style={{ fontSize: "14px", color: CARD_COLORS.textMuted, letterSpacing: "1px", marginLeft: "6px" }}>
        | {label}
      </span>
    </div>
    {right}
  </div>
);

/** The call to action on the left and the site host on the right. */
export const CardFooterBar: React.FC<{ cta: string; host: string }> = ({ cta, host }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      borderTop: `1px solid ${CARD_COLORS.border}`,
      paddingTop: "14px",
      marginTop: "16px",
    }}
  >
    <span style={{ fontSize: "15px", fontWeight: "600", color: CARD_COLORS.textBody }}>&ldquo;{cta}&rdquo;</span>
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "15px", fontWeight: "bold", color: CARD_COLORS.gold, letterSpacing: "1px" }}>{host}</span>
    </div>
  </div>
);

/** The golden avatar frame. `src` must be a data URI: the renderer does no network fetch of its own. */
export const CardAvatar: React.FC<{ src: string; alt: string; size?: number }> = ({ src, alt, size = 140 }) => (
  <div
    style={{
      width: `${size}px`,
      height: `${size}px`,
      border: `3px solid ${CARD_COLORS.gold}`,
      borderRadius: "8px",
      overflow: "hidden",
      display: "flex",
      background: "#0f172a",
    }}
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
  </div>
);
