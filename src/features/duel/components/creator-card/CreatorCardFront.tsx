"use client";

import React from "react";
import Image from "next/image";
import type { RPGCharacter } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

interface CreatorCardFrontProps {
  character: RPGCharacter;
  isActivated?: boolean;
  className?: string;
}

/**
 * Front face of the Legendary Card "O CRIADOR" ("THE CREATOR").
 * Designed as an ancient imperial dark fantasy artifact:
 * - Monumental obsidian & forged antique gold gothic frame with cathedral spires & spiked corners
 * - Central 55%+ aperture showcasing The Sovereign Creator channeling golden arcane lightning & royal scepter
 * - Top forged gold cartouche with etched title "O CRIADOR" and subtitle "AUTORIDADE ABSOLUTA"
 * - Bottom carved obsidian cartouche with effect "INVERSÃO ABSOLUTA", mechanics and sacred lore
 * - Discrete creator signature tag
 * - Dynamic golden runic surge and solar bloom on effect activation
 */
export function CreatorCardFront({
  character,
  isActivated = false,
  className = "",
}: CreatorCardFrontProps) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";

  const cardTitle = tOverride.cardName || (isPt ? "O CRIADOR" : "THE CREATOR");
  const cardBadge = tOverride.badgeAbsolute || (isPt ? "AUTORIDADE ABSOLUTA" : "ABSOLUTE AUTHORITY");
  const effectTitle = tOverride.cardEffectTitle || (isPt ? "EFEITO" : "EFFECT");
  const effectName = tOverride.effectName || (isPt ? "INVERSÃO ABSOLUTA" : "ABSOLUTE INVERSION");
  const effectDesc = tOverride.effectDescription || (isPt ? "Inverte o resultado do duelo." : "Reverses the outcome of the duel.");
  const loreText = tOverride.coreLore || (isPt ? "O Criador não pode ser derrotado em seu próprio domínio." : "The Creator cannot be defeated within their own domain.");
  const creatorUsername = character.identity.username || "JonathanNwokolo";

  return (
    <article
      className={`creator-card-face relative h-full w-full select-none overflow-hidden text-center transition-all duration-500 ${className}`}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(0deg)",
      }}
      aria-label={`${cardTitle} - ${cardBadge}`}
    >
      {/* ----------------- BASE ARTIFACT ARTWORK & FRAME ----------------- */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/assets/duel/creator/creator-front-base.webp"
          alt=""
          fill
          sizes="(max-width: 640px) 320px, 420px"
          className="object-cover object-center pointer-events-none filter brightness-105 contrast-110 drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)]"
          priority
        />
      </div>

      {/* ----------------- DYNAMIC ACTIVATION SURGE ----------------- */}
      {isActivated && (
        <>
          {/* Internal Arcane Sunburst Bloom */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,rgba(254,240,138,0.35)_0%,rgba(245,158,11,0.25)_40%,transparent_75%)] animate-pulse"
            style={{ animationDuration: "1.8s" }}
          />

          {/* Golden Runic Outer Aura */}
          <div
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_50px_rgba(245,158,11,0.6)] animate-pulse"
            style={{ animationDuration: "1.4s" }}
          />

          {/* Floating Arcane Rune Sparks */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <span
              className="absolute text-amber-200 text-xs animate-ping"
              style={{ top: "35%", left: "30%", animationDuration: "2s" }}
            >
              ✧
            </span>
            <span
              className="absolute text-yellow-300 text-xs animate-ping"
              style={{ top: "42%", right: "28%", animationDuration: "2.4s", animationDelay: "0.5s" }}
            >
              ✦
            </span>
            <span
              className="absolute text-amber-300 text-sm animate-pulse"
              style={{ top: "52%", left: "32%", animationDuration: "1.6s" }}
            >
              ✵
            </span>
          </div>
        </>
      )}

      {/* ----------------- TOP BANNER TEXT: O CRIADOR & AUTORIDADE ABSOLUTA ----------------- */}
      <header
        className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
        style={{
          top: "13.5%",
          height: "8%",
          left: "16%",
          right: "16%",
          transform: "translateZ(25px)",
        }}
      >
        {/* Title: O CRIADOR */}
        <h2 className="creator-card-title whitespace-nowrap font-pixel uppercase font-bold tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-[#fff7d6] via-[#fcd34d] to-[#b45309] drop-shadow-[0_2px_3px_rgba(0,0,0,0.98)] leading-none">
          {cardTitle}
        </h2>

        {/* Subtitle: AUTORIDADE ABSOLUTA */}
        <div className="mt-1 flex items-center justify-center gap-1.5 opacity-95">
          <span className="creator-card-subtitle text-amber-300/80">✦</span>
          <p className="creator-card-subtitle whitespace-nowrap font-mono uppercase font-bold tracking-[0.18em] text-[#fde047] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
            {cardBadge}
          </p>
          <span className="creator-card-subtitle text-amber-300/80">✦</span>
        </div>
      </header>

      {/* ----------------- BOTTOM PLAQUE: EFEITO, INVERSÃO ABSOLUTA & LORE ----------------- */}
      <footer
        className="absolute z-20 flex flex-col items-center justify-center pointer-events-none text-center px-1"
        style={{
          top: "76%",
          height: "15.5%",
          left: "18%",
          right: "18%",
          transform: "translateZ(25px)",
        }}
      >
        {/* Header Tab: ── EFEITO ── */}
        <div className="flex items-center justify-center gap-1">
          <span className="creator-card-kicker text-amber-500/70">──</span>
          <span className="creator-card-kicker font-pixel uppercase tracking-[0.2em] text-[#fcd34d] font-bold">
            {effectTitle}
          </span>
          <span className="creator-card-kicker text-amber-500/70">──</span>
        </div>

        {/* Effect Name: INVERSÃO ABSOLUTA */}
        <p className="creator-card-effect-name mt-0.5 whitespace-nowrap font-pixel uppercase tracking-[0.08em] font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#fde68a] to-[#d97706] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-tight">
          {effectName}
        </p>

        {/* Effect Description: Inverte o resultado do duelo. */}
        <p className="creator-card-description font-sans font-semibold text-amber-200/90 leading-tight">
          {effectDesc}
        </p>

        {/* Delicate divider */}
        <div className="my-0.5 flex items-center justify-center gap-1.5 opacity-60">
          <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-amber-600/70" />
          <span className="text-[5px] sm:text-[6px] text-amber-400">❖</span>
          <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-amber-600/70" />
        </div>

        {/* Sacred Core Lore Phrase */}
        <p className="creator-card-lore mx-auto max-w-[96%] font-serif italic text-slate-300 leading-tight">
          &ldquo;{loreText}&rdquo;
        </p>

        {/* Discrete Sovereign Watermark */}
        <div className="mt-0.5 hidden min-[430px]:block">
          <span className="creator-card-watermark font-mono uppercase tracking-widest text-amber-400/70 drop-shadow">
            @{creatorUsername}
          </span>
        </div>
      </footer>
    </article>
  );
}
