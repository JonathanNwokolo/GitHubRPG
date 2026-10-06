"use client";

import React, { useRef, useEffect, useState } from "react";
import type { ClassName, RPGCharacter } from "@/game/types";
import { Dialog, Button, RpgDownload } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

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

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw card dimensions: 800 x 480
    const w = 800;
    const h = 480;
    canvas.width = w;
    canvas.height = h;

    // 1. Dark fantasy background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#161b29");
    bgGrad.addColorStop(1, "#08090d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Pixel Border
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.strokeStyle = "#29324b";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Corner decorative squares
    ctx.fillStyle = "#fbbf24";
    const corners = [
      [10, 10],
      [w - 22, 10],
      [10, h - 22],
      [w - 22, h - 22],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 12, 12);
    });

    // 3. Header title
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillText("GITHUB RPG  ✦  FICHA DE AVENTUREIRO", 40, 56);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText("Cartão gerado deterministicamente através de dados públicos", 40, 78);

    // 4. Hero Portrait frame
    ctx.fillStyle = "#0e111a";
    ctx.fillRect(40, 110, 130, 130);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 110, 130, 130);

    // Character simple emblem inside frame
    const { identity, progression, archetype, resources, stats: attributes } = character;
    ctx.fillStyle = CLASS_COLORS[archetype.className];
    ctx.fillRect(60, 130, 90, 90);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText(archetype.className[0], 105, 190);
    ctx.textAlign = "left";

    // 5. Hero Identity
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillText(identity.displayName ?? identity.username, 195, 140);

    if (equippedTitleName) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "italic 16px 'Inter', sans-serif";
      ctx.fillText(`« ${equippedTitleName} »`, 195, 166);
    }

    const classLabel = archetype.subclassName
      ? `${archetype.className} / ${archetype.subclassName}`
      : archetype.className;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px monospace";
    ctx.fillText(`@${identity.username}  •  ${classLabel}  •  Nv ${progression.level} (${progression.tier})`, 195, 194);

    ctx.fillStyle = "#f1e5c8";
    ctx.font = "13px 'Inter', sans-serif";
    ctx.fillText(`${resources.hp} HP  |  ${resources.mp} MP  |  ${progression.totalXp.toLocaleString("pt-BR")} XP`, 195, 222);

    // 6. Attributes Section
    ctx.strokeStyle = "#29324b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 265);
    ctx.lineTo(w - 40, 265);
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillText("ATRIBUTOS TÉCNICOS (0 - 100)", 40, 295);

    const stats = [
      { label: "Atividade", val: attributes.activity, col: "#fbbf24" },
      { label: "Experiência", val: attributes.experience, col: "#c084fc" },
      { label: "Reputação", val: attributes.reputation, col: "#38bdf8" },
      { label: "Versatilidade", val: attributes.versatility, col: "#34d399" },
      { label: "Consistência", val: attributes.consistency, col: "#f87171" },
    ];

    stats.forEach((s, i) => {
      const colX = 40 + i * 144;
      const barY = 325;

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px monospace";
      ctx.fillText(s.label, colX, barY);

      ctx.fillStyle = "#f1e5c8";
      ctx.font = "bold 14px monospace";
      ctx.fillText(String(s.val), colX, barY + 20);

      // Bar bg
      ctx.fillStyle = "#08090d";
      ctx.fillRect(colX, barY + 28, 120, 10);
      // Bar fill
      ctx.fillStyle = s.col;
      ctx.fillRect(colX, barY + 28, (s.val / 100) * 120, 10);
    });

    // 7. Footer watermark
    ctx.fillStyle = "#64748b";
    ctx.font = "11px monospace";
    ctx.fillText(
      character.meta.isDemo
        ? "GITHUB RPG  ✦  DADOS DE DEMONSTRAÇÃO"
        : "GITHUB RPG  ✦  GAMIFICAÇÃO DE ATIVIDADE PÚBLICA",
      40,
      430
    );
    ctx.font = "10px monospace";
    ctx.fillText("Gamificação da atividade pública; não é uma avaliação de habilidade profissional.", 40, 448);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [isOpen, character, equippedTitleName]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `github-rpg-${character.identity.username}.png`;
    a.click();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t.share.titleCard}
      description="Gerado nativamente via Canvas sem requisições a serviços externos."
      className="max-w-3xl"
    >
      <div className="space-y-4 py-2">
        <div className="w-full overflow-hidden border-2 border-rpg-border flex justify-center bg-black/60 p-2">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-w-[720px] aspect-[800/480] shadow-pixel"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <span className="font-mono text-xs text-slate-400 font-medium">
            Resolução: 800 x 480 &bull; Formato: PNG
          </span>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              {t.share.close}
            </Button>
            <Button size="sm" variant="primary" onClick={handleDownload} className="gap-2">
              <RpgDownload className="w-4 h-4" />
              <span>{t.share.downloadImage}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
