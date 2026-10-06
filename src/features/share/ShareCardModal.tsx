"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { ClassName, RPGCharacter } from "@/game/types";
import { Dialog, Button, RpgDownload, RpgSparkles } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { fnv1a } from "@/data/seed/hashAndPrng";
import { renderProceduralAvatarSvg } from "@/features/character/avatar/proceduralAvatar";
import { generateHeroSummary } from "./heroSummary";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: RPGCharacter;
  /** Title chosen for display, if any. */
  equippedTitleName?: string | null;
}

/** Emblem color per class (cosmetic only). */
const CLASS_COLORS: Record<ClassName, string> = {
  Mago: "#a855f7",
  Alquimista: "#10b981",
  Guerreiro: "#ef4444",
  Patrulheiro: "#06b6d4",
  Paladino: "#f59e0b",
  Bardo: "#ec4899",
  Ladino: "#64748b",
  Oráculo: "#8b5cf6",
  Escriba: "#84cc16",
  Sentinela: "#0ea5e9",
  Tecelão: "#14b8a6",
  Aventureiro: "#38bdf8",
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function drawSwordIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#fbbf24") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  // Blade
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 16);
  ctx.lineTo(x + 16, y + 2);
  ctx.stroke();
  // Crossguard
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 10);
  ctx.lineTo(x + 10, y + 17);
  ctx.stroke();
  // Pommel
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 17.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#c084fc") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + 16, y + 2);
  ctx.lineTo(x + 16, y + 9);
  ctx.quadraticCurveTo(x + 16, y + 17, x + 9, y + 18);
  ctx.quadraticCurveTo(x + 2, y + 17, x + 2, y + 9);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 9, y + 9, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrownIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#38bdf8") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 16);
  ctx.lineTo(x + 16, y + 16);
  ctx.lineTo(x + 16, y + 6);
  ctx.lineTo(x + 12.5, y + 10.5);
  ctx.lineTo(x + 9, y + 4);
  ctx.lineTo(x + 5.5, y + 10.5);
  ctx.lineTo(x + 2, y + 6);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawSparklesIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#34d399") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 1);
  ctx.lineTo(x + 9, y + 17);
  ctx.moveTo(x + 1, y + 9);
  ctx.lineTo(x + 17, y + 9);
  ctx.moveTo(x + 3.5, y + 3.5);
  ctx.lineTo(x + 14.5, y + 14.5);
  ctx.moveTo(x + 14.5, y + 3.5);
  ctx.lineTo(x + 3.5, y + 14.5);
  ctx.stroke();
  ctx.restore();
}

function drawTrophyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#fbbf24") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Cup body
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 3);
  ctx.lineTo(x + 16, y + 3);
  ctx.lineTo(x + 15, y + 10);
  ctx.quadraticCurveTo(x + 10, y + 14, x + 10, y + 14);
  ctx.quadraticCurveTo(x + 5, y + 10, x + 5, y + 10);
  ctx.closePath();
  ctx.stroke();
  // Stem & base
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 14);
  ctx.lineTo(x + 10, y + 18);
  ctx.moveTo(x + 5, y + 18);
  ctx.lineTo(x + 15, y + 18);
  ctx.stroke();
  // Handles
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 5);
  ctx.lineTo(x + 2, y + 5);
  ctx.lineTo(x + 2, y + 9);
  ctx.lineTo(x + 5, y + 9);
  ctx.moveTo(x + 16, y + 5);
  ctx.lineTo(x + 18, y + 5);
  ctx.lineTo(x + 18, y + 9);
  ctx.lineTo(x + 15, y + 9);
  ctx.stroke();
  ctx.restore();
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen,
  onClose,
  character,
  equippedTitleName = null,
}) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);

  const { identity, progression, archetype, stats, skills, achievements } = character;
  const displayName = identity.displayName || identity.username || "Aventureiro";
  const summaryText = generateHeroSummary(character);
  const topSkill = skills[0];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Preload real avatar photo or procedural avatar
  useEffect(() => {
    let active = true;

    if (identity.avatarUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = identity.avatarUrl;
      img.onload = () => {
        if (active) setAvatarImg(img);
      };
      img.onerror = () => {
        if (!active) return;
        // Fallback to procedural avatar
        const seed = fnv1a(identity.username.toLowerCase());
        const svg = renderProceduralAvatarSvg(seed, 140);
        const fallback = new Image();
        fallback.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
        fallback.onload = () => {
          if (active) setAvatarImg(fallback);
        };
      };
    } else {
      const seed = fnv1a(identity.username.toLowerCase());
      const svg = renderProceduralAvatarSvg(seed, 140);
      const fallback = new Image();
      fallback.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
      fallback.onload = () => {
        if (active) setAvatarImg(fallback);
      };
    }

    return () => {
      active = false;
    };
  }, [identity.avatarUrl, identity.username]);

  const renderCanvas = useCallback(
    (loadedAvatar: HTMLImageElement | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Full social card dimensions: 1200 x 630
      const w = 1200;
      const h = 630;
      canvas.width = w;
      canvas.height = h;

      // 1. Dark fantasy clean background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, "#080c14");
      bgGrad.addColorStop(0.5, "#0d1424");
      bgGrad.addColorStop(1, "#06080e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Double Golden Runic Frame
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(26, 26, w - 52, h - 52);

      // Corner decorative diamonds
      ctx.fillStyle = "#fbbf24";
      const cornerSize = 10;
      const corners = [
        [16, 16],
        [w - 26, 16],
        [16, h - 26],
        [w - 26, h - 26],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx, cy, cornerSize, cornerSize);
      });

      // 3. Header Top Bar
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillText("✦  GITHUB RPG", 46, 58);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillText("|  CARTÃO DE HERÓI OFICIAL", 205, 57);

      // Tier badge top right
      const tierText = `TIER: ${progression.tier.toUpperCase()}`;
      ctx.font = "bold 13px monospace";
      const tierWidth = ctx.measureText(tierText).width;
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(w - 76 - tierWidth, 38, tierWidth + 28, 30);
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w - 76 - tierWidth, 38, tierWidth + 28, 30);
      ctx.fillStyle = "#c7d2fe";
      ctx.fillText(tierText, w - 62 - tierWidth, 58);

      // Header divider line
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(46, 78);
      ctx.lineTo(w - 46, 78);
      ctx.stroke();

      // 4. Left Column: Portrait & Archetype (X: 46, Width: 260)
      const col1X = 46;
      const col1W = 260;
      const bodyY = 98;
      const bodyH = 456;

      ctx.fillStyle = "#060912";
      ctx.fillRect(col1X, bodyY, col1W, bodyH);
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.strokeRect(col1X, bodyY, col1W, bodyH);

      // Portrait frame (140 x 140)
      const portraitSize = 140;
      const portraitX = col1X + (col1W - portraitSize) / 2;
      const portraitY = bodyY + 18;

      // Draw portrait photo with rounded clip
      ctx.save();
      drawRoundedRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 8);
      ctx.clip();

      if (loadedAvatar && loadedAvatar.complete && loadedAvatar.naturalWidth > 0) {
        ctx.drawImage(loadedAvatar, portraitX, portraitY, portraitSize, portraitSize);
      } else {
        const classColor = CLASS_COLORS[archetype.className] || "#f59e0b";
        ctx.fillStyle = classColor;
        ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 56px monospace";
        ctx.textAlign = "center";
        ctx.fillText(archetype.className[0], portraitX + portraitSize / 2, portraitY + portraitSize / 2 + 20);
        ctx.textAlign = "left";
      }
      ctx.restore();

      // Portrait gold border
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, portraitX, portraitY, portraitSize, portraitSize, 8);
      ctx.stroke();

      // Level Badge
      const lvlY = portraitY + portraitSize + 14;
      const lvlGrad = ctx.createLinearGradient(portraitX - 8, lvlY, portraitX + portraitSize + 8, lvlY);
      lvlGrad.addColorStop(0, "#b45309");
      lvlGrad.addColorStop(1, "#d97706");
      ctx.fillStyle = lvlGrad;
      ctx.fillRect(portraitX - 10, lvlY, portraitSize + 20, 36);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.strokeRect(portraitX - 10, lvlY, portraitSize + 20, 36);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`NÍVEL ${progression.level}`, col1X + col1W / 2, lvlY + 25);
      ctx.textAlign = "left";

      // Class & Subclass label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(archetype.className, col1X + col1W / 2, lvlY + 70);

      if (archetype.subclassName) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 15px 'Inter', sans-serif";
        ctx.fillText(`Subclasse: ${archetype.subclassName}`, col1X + col1W / 2, lvlY + 94);
      }
      ctx.textAlign = "left";

      // XP Info (Bottom of Col 1)
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(col1X + 16, bodyY + bodyH - 68);
      ctx.lineTo(col1X + col1W - 16, bodyY + bodyH - 68);
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${progression.totalXp.toLocaleString("pt-BR")} XP TOTAL`, col1X + col1W / 2, bodyY + bodyH - 42);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Inter', sans-serif";
      const xpHint = progression.nextLevel
        ? `Faltam ${progression.xpRemaining.toLocaleString("pt-BR")} XP para Nv ${progression.nextLevel}`
        : "Nível Máximo";
      ctx.fillText(xpHint, col1X + col1W / 2, bodyY + bodyH - 22);
      ctx.textAlign = "left";

      // 5. Center Column: Identity, Lore, Dominant Skill (X: 330, Width: 494)
      const col2X = 330;
      const col2W = 494;

      // User Display Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px 'Inter', sans-serif";
      const maxNameW = col2W - 10;
      let nameText = displayName;
      if (ctx.measureText(nameText).width > maxNameW) {
        while (nameText.length > 3 && ctx.measureText(nameText + "...").width > maxNameW) {
          nameText = nameText.slice(0, -1);
        }
        nameText += "...";
      }
      ctx.fillText(nameText, col2X, bodyY + 36);

      // Username & Equipped Title
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 17px monospace";
      ctx.fillText(`@${identity.username}`, col2X, bodyY + 66);

      if (equippedTitleName) {
        ctx.fillStyle = "#f59e0b";
        ctx.font = "italic bold 18px 'Georgia', serif";
        const userW = ctx.measureText(`@${identity.username}   `).width;
        ctx.fillText(`« ${equippedTitleName} »`, col2X + userW, bodyY + 66);
      }

      // Lore Summary Quote Box
      const loreY = bodyY + 88;
      const loreH = 68;
      ctx.fillStyle = "#080c18";
      ctx.fillRect(col2X, loreY, col2W, loreH);
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.strokeRect(col2X, loreY, col2W, loreH);

      // Golden accent left border
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(col2X, loreY, 5, loreH);

      ctx.fillStyle = "#f1f5f9";
      ctx.font = "italic 16px 'Inter', sans-serif";
      ctx.fillText(`“${summaryText}”`, col2X + 18, loreY + 40);

      // Dominant Skill Box
      const skillBoxY = loreY + 84;
      const skillBoxH = 142;
      ctx.fillStyle = "#060912";
      ctx.fillRect(col2X, skillBoxY, col2W, skillBoxH);
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.strokeRect(col2X, skillBoxY, col2W, skillBoxH);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 13px monospace";
      ctx.fillText("HABILIDADE DOMINANTE", col2X + 18, skillBoxY + 30);

      const skillTierText = topSkill ? `${topSkill.tier} (Nv ${topSkill.level})` : "Iniciante (Nv 1)";
      ctx.font = "bold 14px monospace";
      const sBadgeW = ctx.measureText(skillTierText).width + 20;
      ctx.fillStyle = "#0c2340";
      ctx.fillRect(col2X + col2W - 18 - sBadgeW, skillBoxY + 14, sBadgeW, 26);
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1;
      ctx.strokeRect(col2X + col2W - 18 - sBadgeW, skillBoxY + 14, sBadgeW, 26);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(skillTierText, col2X + col2W - 8 - sBadgeW, skillBoxY + 32);

      // Language Name & Presence
      const langName = topSkill?.name || "Código Primordial";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Inter', sans-serif";
      ctx.fillText(langName, col2X + 18, skillBoxY + 72);

      const presenceText = topSkill ? `${topSkill.sharePercent}% de presença` : "Em descoberta";
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(presenceText, col2X + col2W - 18, skillBoxY + 72);
      ctx.textAlign = "left";

      // Skill Bar
      const sBarX = col2X + 18;
      const sBarY = skillBoxY + 96;
      const sBarW = col2W - 36;
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(sBarX, sBarY, sBarW, 12);

      const skillPercent = Math.min(100, Math.max(5, topSkill?.sharePercent || 10));
      const sFillGrad = ctx.createLinearGradient(sBarX, sBarY, sBarX + sBarW, sBarY);
      sFillGrad.addColorStop(0, "#0284c7");
      sFillGrad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = sFillGrad;
      ctx.fillRect(sBarX, sBarY, (skillPercent / 100) * sBarW, 12);

      // 6. Right Column: Attributes & Achievements (X: 846, Width: 308)
      const col3X = 846;
      const col3W = 308;

      ctx.fillStyle = "#060912";
      ctx.fillRect(col3X, bodyY, col3W, bodyH);
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.strokeRect(col3X, bodyY, col3W, bodyH);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 14px monospace";
      ctx.fillText("ATRIBUTOS TÉCNICOS", col3X + 18, bodyY + 32);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px monospace";
      ctx.textAlign = "right";
      ctx.fillText("ESCALA 0–100", col3X + col3W - 18, bodyY + 32);
      ctx.textAlign = "left";

      // 4 Attributes with icons
      const statItems = [
        { label: "Atividade", val: stats.activity, col: "#fbbf24", drawIcon: drawSwordIcon },
        { label: "Experiência", val: stats.experience, col: "#c084fc", drawIcon: drawShieldIcon },
        { label: "Reputação", val: stats.reputation, col: "#38bdf8", drawIcon: drawCrownIcon },
        { label: "Versatilidade", val: stats.versatility, col: "#34d399", drawIcon: drawSparklesIcon },
      ];

      statItems.forEach((st, idx) => {
        const aY = bodyY + 70 + idx * 64;

        // Draw icon
        st.drawIcon(ctx, col3X + 18, aY - 14, st.col);

        // Label
        ctx.fillStyle = "#f1f5f9";
        ctx.font = "bold 15px 'Inter', sans-serif";
        ctx.fillText(st.label, col3X + 44, aY);

        // Value
        ctx.fillStyle = st.col;
        ctx.font = "bold 17px monospace";
        ctx.textAlign = "right";
        ctx.fillText(String(st.val), col3X + col3W - 18, aY);
        ctx.textAlign = "left";

        // Attribute bar
        const barX = col3X + 18;
        const barY = aY + 8;
        const barW = col3W - 36;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(barX, barY, barW, 10);

        ctx.fillStyle = st.col;
        ctx.fillRect(barX, barY, (Math.min(100, Math.max(2, st.val)) / 100) * barW, 10);
      });

      // Unlocked Achievements counter box
      const achY = bodyY + bodyH - 74;
      ctx.fillStyle = "#0e1628";
      ctx.fillRect(col3X + 16, achY, col3W - 32, 48);
      ctx.strokeStyle = "#202e48";
      ctx.lineWidth = 1;
      ctx.strokeRect(col3X + 16, achY, col3W - 32, 48);

      // Trophy icon
      drawTrophyIcon(ctx, col3X + 28, achY + 14, "#fbbf24");

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.fillText(`${unlockedCount} Conquistas Desbloqueadas`, col3X + 56, achY + 30);

      // 7. Footer Bar: Social CTA & Branding
      ctx.strokeStyle = "#202c44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(46, h - 50);
      ctx.lineTo(w - 46, h - 50);
      ctx.stroke();

      ctx.fillStyle = "#f1f5f9";
      ctx.font = "600 15px 'Inter', sans-serif";
      ctx.fillText("“Transforme seu GitHub em um personagem RPG.”", 46, h - 25);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "right";
      ctx.fillText("githubrpg.com", w - 46, h - 25);
      ctx.textAlign = "left";

      try {
        setDataUrl(canvas.toDataURL("image/png"));
      } catch {
        // Fallback for tainted canvas
      }
    },
    [
      archetype.className,
      archetype.subclassName,
      displayName,
      equippedTitleName,
      identity.username,
      progression.level,
      progression.nextLevel,
      progression.tier,
      progression.totalXp,
      progression.xpRemaining,
      stats,
      summaryText,
      topSkill,
      unlockedCount,
    ]
  );

  useEffect(() => {
    if (isOpen) {
      renderCanvas(avatarImg);
    }
  }, [isOpen, renderCanvas, avatarImg]);

  const handleDownload = async () => {
    setIsDownloading(true);
    const filename = `github-rpg-${character.identity.username}.png`;

    try {
      // 1. Try downloading server-generated 1200x630 PNG from API
      const titleParam = equippedTitleName ? `?title=${encodeURIComponent(equippedTitleName)}` : "";
      const apiUrl = `/api/card/${encodeURIComponent(character.identity.username)}${titleParam}`;
      const res = await fetch(apiUrl);

      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        setIsDownloading(false);
        return;
      }
    } catch {
      // Server fetch failed, proceed to local canvas fallback
    }

    // 2. Fallback: Download from high-resolution canvas
    try {
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    const cardUrl = `${window.location.origin}/api/card/${encodeURIComponent(character.identity.username)}`;
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t.share.titleCard}
      description={t.share.cardSubtitle}
      className="max-w-4xl"
    >
      <div className="space-y-4 py-2">
        {/* Card Canvas Preview (1200x630 scale) */}
        <div className="w-full overflow-hidden border-2 border-rpg-border rounded-md flex justify-center bg-black/80 p-2 sm:p-3">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-w-[840px] aspect-[1200/630] shadow-pixel rounded"
          />
        </div>

        {/* Action Controls & Metadata */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400 font-medium">
              {t.share.resolution}
            </span>
            {copiedLink && (
              <span className="text-xs text-amber-400 font-mono font-semibold flex items-center gap-1 animate-fade-in">
                <RpgSparkles className="w-3.5 h-3.5" />
                {t.share.copiedLink}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCopyLink} title="Copiar URL da imagem">
              {t.share.copyLink}
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              {t.share.close}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <RpgDownload className="w-4 h-4" />
              <span>{isDownloading ? t.share.downloading : t.share.downloadImage}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
