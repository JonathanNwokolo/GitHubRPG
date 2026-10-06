import React from "react";
import type { Rarity } from "@/game/types";
import { CARD_COLORS, CardAvatar, CardFooterBar, CardFrame, CardHeaderBar } from "./cardKit";

export interface AchievementCardLayoutProps {
  username: string;
  displayName: string;
  avatarSrc: string;
  host: string;
  /** Every string below is already in the requested language. */
  texts: {
    kicker: string;
    rarityLabel: string;
    cta: string;
  };
  achievement: {
    name: string;
    description: string;
    rarity: Rarity;
    /** "5+ years", "At least 240 commits found"... */
    progress: string | null;
  };
}

/** Colors per rarity, matching the rarity badges of the sheet. */
const RARITY_COLORS: Record<Rarity, { text: string; background: string; border: string }> = {
  common: { text: "#cbd5e1", background: "#1e293b", border: "#64748b" },
  rare: { text: "#7dd3fc", background: "#0c2340", border: "#0284c7" },
  epic: { text: "#d8b4fe", background: "#2e1065", border: "#9333ea" },
  legendary: { text: "#fcd34d", background: "#451a03", border: "#d97706" },
};

export const AchievementCardLayout: React.FC<AchievementCardLayoutProps> = ({
  username,
  displayName,
  avatarSrc,
  host,
  texts,
  achievement,
}) => {
  const rarity = RARITY_COLORS[achievement.rarity];

  return (
    <CardFrame>
      <CardHeaderBar
        label={texts.kicker}
        right={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: rarity.background,
              border: `1px solid ${rarity.border}`,
              padding: "5px 14px",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "bold", color: rarity.text, letterSpacing: "1px" }}>
              {texts.rarityLabel.toUpperCase()}
            </span>
          </div>
        }
      />

      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "40px", paddingLeft: "10px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "200px" }}>
          <CardAvatar src={avatarSrc} alt={displayName} size={180} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: CARD_COLORS.textPrimary }}>{displayName}</span>
            <span style={{ fontSize: "16px", color: CARD_COLORS.textMuted, fontFamily: "monospace" }}>@{username}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "16px" }}>
          <span
            style={{
              fontSize: "54px",
              fontWeight: "bold",
              color: rarity.text,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {achievement.name}
          </span>
          <span style={{ fontSize: "26px", color: CARD_COLORS.textBody, lineHeight: 1.35 }}>{achievement.description}</span>
          {achievement.progress && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: CARD_COLORS.innerBg,
                border: `1px solid ${CARD_COLORS.border}`,
                borderLeft: `5px solid ${rarity.border}`,
                padding: "8px 16px",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: "bold", color: CARD_COLORS.gold, fontFamily: "monospace" }}>
                {achievement.progress}
              </span>
            </div>
          )}
        </div>
      </div>

      <CardFooterBar cta={texts.cta} host={host} />
    </CardFrame>
  );
};
