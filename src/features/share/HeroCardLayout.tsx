import React from "react";
import type { RPGCharacter } from "@/game/types";
import { pluralize } from "@/lib/format";
import { getSiteHost } from "@/lib/siteUrl";
import { CardFooterBar, CardFrame, CardHeaderBar } from "./cardKit";

export interface HeroCardLayoutProps {
  character: RPGCharacter;
  equippedTitleName?: string | null;
  summaryText: string;
  avatarSrc: string;
  shareUrl?: string;
  socialCta?: string;
}

function SwordIcon({ size = 18, color = "#fbbf24" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

function ShieldIcon({ size = 18, color = "#c084fc" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CrownIcon({ size = 18, color = "#38bdf8" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  );
}

function SparklesIcon({ size = 18, color = "#34d399" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </svg>
  );
}

function TrophyIcon({ size = 20, color = "#fbbf24" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
      <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  );
}

export const HeroCardLayout: React.FC<HeroCardLayoutProps> = ({
  character,
  equippedTitleName = null,
  summaryText,
  avatarSrc,
  socialCta = "Transforme seu GitHub em um personagem RPG.",
  shareUrl = getSiteHost(),
}) => {
  const { identity, progression, archetype, stats, skills, achievements } = character;
  const displayName = identity.displayName || identity.username || "Aventureiro";
  const topSkill = skills[0];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const gold = "#f59e0b";
  const innerBg = "#060912";
  const borderColor = "#202c44";

  const statItems = [
    { label: "Atividade", val: stats.activity, col: "#fbbf24", icon: <SwordIcon color="#fbbf24" /> },
    { label: "Experiência", val: stats.experience, col: "#c084fc", icon: <ShieldIcon color="#c084fc" /> },
    { label: "Reputação", val: stats.reputation, col: "#38bdf8", icon: <CrownIcon color="#38bdf8" /> },
    { label: "Versatilidade", val: stats.versatility, col: "#34d399", icon: <SparklesIcon color="#34d399" /> },
  ];

  return (
    <CardFrame>
      <CardHeaderBar
        label="CARTÃO DE HERÓI OFICIAL"
        right={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#1e1b4b",
              border: "1px solid #6366f1",
              padding: "5px 14px",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#c7d2fe", letterSpacing: "1px" }}>
              TIER: {progression.tier.toUpperCase()}
            </span>
          </div>
        }
      />

        {/* 3-Column Body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "24px",
          }}
        >
          {/* Column 1: Portrait & Level */}
          <div
            style={{
              width: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: innerBg,
              border: `1px solid ${borderColor}`,
              padding: "16px 14px",
              borderRadius: "8px",
            }}
          >
            {/* Avatar frame */}
            <div
              style={{
                width: "140px",
                height: "140px",
                border: `3px solid ${gold}`,
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                background: "#0f172a",
                marginBottom: "12px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt={displayName}
                width={140}
                height={140}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>

            {/* Level badge */}
            <div
              style={{
                display: "flex",
                background: "linear-gradient(90deg, #b45309, #d97706)",
                padding: "6px 22px",
                borderRadius: "5px",
                border: "2px solid #fbbf24",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#ffffff", letterSpacing: "1px" }}>
                NÍVEL {progression.level}
              </span>
            </div>

            {/* Class & Subclass */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <span style={{ fontSize: "22px", fontWeight: "bold", color: "#ffffff" }}>
                {archetype.className}
              </span>
              {archetype.subclassName && (
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#94a3b8" }}>
                  Subclasse: {archetype.subclassName}
                </span>
              )}
            </div>

            {/* XP Info at bottom */}
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                paddingTop: "12px",
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <span style={{ fontSize: "14px", color: "#fbbf24", fontWeight: "bold" }}>
                {progression.totalXp.toLocaleString("pt-BR")} XP TOTAL
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                {progression.nextLevel
                  ? `Faltam ${progression.xpRemaining.toLocaleString("pt-BR")} XP para Nv ${progression.nextLevel}`
                  : "Nível Máximo"}
              </span>
            </div>
          </div>

          {/* Column 2: Center - Identity, Lore, Dominant Skill */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Identity */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold", color: "#ffffff", lineHeight: 1.15 }}>
                {displayName}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "17px", color: "#94a3b8", fontFamily: "monospace" }}>
                  @{identity.username}
                </span>
                {equippedTitleName && (
                  <span style={{ fontSize: "18px", color: gold, fontStyle: "italic", fontWeight: "bold" }}>
                    &laquo; {equippedTitleName} &raquo;
                  </span>
                )}
              </div>
            </div>

            {/* RPG Lore Summary */}
            <div
              style={{
                display: "flex",
                background: "#080c18",
                borderLeft: `5px solid ${gold}`,
                borderTop: `1px solid ${borderColor}`,
                borderRight: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                padding: "12px 18px",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <span style={{ fontSize: "16px", fontStyle: "italic", color: "#f1f5f9", lineHeight: 1.45 }}>
                &ldquo;{summaryText}&rdquo;
              </span>
            </div>

            {/* Dominant Skill */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: innerBg,
                border: `1px solid ${borderColor}`,
                borderRadius: "8px",
                padding: "14px 18px",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: gold, fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase" }}>
                  Habilidade Dominante
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    color: "#38bdf8",
                    fontWeight: "bold",
                    background: "#0c2340",
                    border: "1px solid #0284c7",
                    padding: "3px 10px",
                    borderRadius: "4px",
                  }}
                >
                  {topSkill ? `${topSkill.tier} (Nv ${topSkill.level})` : "Iniciante (Nv 1)"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>
                  {topSkill?.name || "Código Primordial"}
                </span>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#cbd5e1" }}>
                  {topSkill ? `${topSkill.sharePercent}% de presença` : "Em descoberta"}
                </span>
              </div>

              {/* Affinity Progress bar */}
              <div
                style={{
                  width: "100%",
                  height: "12px",
                  background: "#1e293b",
                  borderRadius: "6px",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(5, topSkill?.sharePercent || 10))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #0284c7, #38bdf8)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Column 3: Right - Technical Attributes & Achievements */}
          <div
            style={{
              width: "330px",
              display: "flex",
              flexDirection: "column",
              background: innerBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              padding: "16px 18px",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: gold, letterSpacing: "1px", textTransform: "uppercase" }}>
                Atributos Técnicos
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>
                ESCALA 0–100
              </span>
            </div>

            {/* 4 Attributes */}
            {statItems.map((attr) => (
              <div key={attr.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {attr.icon}
                    <span style={{ color: "#f1f5f9", fontWeight: "bold" }}>{attr.label}</span>
                  </div>
                  <span style={{ color: attr.col, fontWeight: "bold", fontSize: "16px", fontFamily: "monospace" }}>
                    {attr.val}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    background: "#1e293b",
                    borderRadius: "5px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(2, attr.val))}%`,
                      height: "100%",
                      background: attr.col,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Achievements Counter */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#0e1628",
                border: "1px solid #202e48",
                padding: "10px 14px",
                borderRadius: "6px",
                marginTop: "auto",
              }}
            >
              <TrophyIcon size={20} color={gold} />
              <span style={{ fontSize: "15px", fontWeight: "bold", color: "#ffffff" }}>
                {`${unlockedCount} ${pluralize(unlockedCount, { one: "Conquista Desbloqueada", other: "Conquistas Desbloqueadas" })}`}
              </span>
            </div>
          </div>
        </div>

        <CardFooterBar cta={socialCta} host={shareUrl} />
    </CardFrame>
  );
};
