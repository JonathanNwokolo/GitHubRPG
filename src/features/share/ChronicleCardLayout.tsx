import React from "react";
import { CARD_COLORS, CardAvatar, CardFooterBar, CardFrame, CardHeaderBar } from "./cardKit";

export interface ChronicleCardLayoutProps {
  username: string;
  displayName: string;
  avatarSrc: string;
  host: string;
  texts: {
    kicker: string;
    cta: string;
  };
  chapter: {
    year: number;
    title: string;
    /** The sentence of the fact that named the chapter. May be empty. */
    description: string;
    /** "521 commits", "187+ contributions"... at most four. */
    metrics: string[];
    /** Present when part of the history could not be read. */
    note: string | null;
  };
}

export const ChronicleCardLayout: React.FC<ChronicleCardLayoutProps> = ({
  username,
  displayName,
  avatarSrc,
  host,
  texts,
  chapter,
}) => (
  <CardFrame>
    <CardHeaderBar label={texts.kicker} />

    <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "40px", paddingLeft: "10px" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "14px" }}>
        <span style={{ fontSize: "88px", fontWeight: "bold", color: CARD_COLORS.gold, lineHeight: 1 }}>{chapter.year}</span>
        <span
          style={{
            fontSize: "46px",
            fontWeight: "bold",
            color: CARD_COLORS.textPrimary,
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          {chapter.title}
        </span>
        {chapter.description && (
          <span style={{ fontSize: "24px", color: CARD_COLORS.textBody, lineHeight: 1.35 }}>{chapter.description}</span>
        )}
        {chapter.metrics.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
            {chapter.metrics.map((metric) => (
              <div
                key={metric}
                style={{
                  display: "flex",
                  background: CARD_COLORS.innerBg,
                  border: `1px solid ${CARD_COLORS.border}`,
                  borderLeft: `5px solid ${CARD_COLORS.gold}`,
                  padding: "8px 16px",
                  borderRadius: "0 6px 6px 0",
                }}
              >
                <span style={{ fontSize: "22px", fontWeight: "bold", color: CARD_COLORS.textBody }}>{metric}</span>
              </div>
            ))}
          </div>
        )}
        {chapter.note && <span style={{ fontSize: "16px", color: CARD_COLORS.textMuted }}>{chapter.note}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "220px" }}>
        <CardAvatar src={avatarSrc} alt={displayName} size={160} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: "20px", fontWeight: "bold", color: CARD_COLORS.textPrimary }}>{displayName}</span>
          <span style={{ fontSize: "16px", color: CARD_COLORS.textMuted, fontFamily: "monospace" }}>@{username}</span>
        </div>
      </div>
    </div>

    <CardFooterBar cta={texts.cta} host={host} />
  </CardFrame>
);
