"use client";

import React from "react";
import Image from "next/image";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

interface CreatorCardBackProps {
  className?: string;
}

/**
 * Ancient Obsidian & Gold Grimoire Card Back for "O CRIADOR".
 * Features:
 * - Carved obsidian stone slab with glowing molten amber veins
 * - Antique forged gold filigree borders and gothic corner brackets
 * - Monumental central sovereign crown seal with concentric runic rings
 * - Discrete embossed "GITHUB RPG" and "RELÍQUIA LENDÁRIA" typography
 */
export function CreatorCardBack({ className = "" }: CreatorCardBackProps) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";

  const brandTitle = tOverride.cardBackBrand || "GITHUB RPG";
  const brandSub = isPt ? "RELÍQUIA LENDÁRIA" : "LEGENDARY RELIC";

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden text-center transition-all duration-500 ${className}`}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
      aria-hidden="true"
    >
      {/* Background Graphic Asset */}
      <Image
        src="/assets/duel/creator/creator-card-back.webp"
        alt=""
        fill
        sizes="(max-width: 640px) 320px, 420px"
        className="object-cover object-center pointer-events-none select-none filter brightness-100 contrast-105 drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]"
        priority
      />

      {/* Ambient Internal Glow & Obsidian Bloom */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.16)_0%,transparent_70%)]" />

      {/* Subtle Bottom Gold Stamp */}
      <div
        className="pointer-events-none absolute bottom-[6%] inset-x-0 flex flex-col items-center justify-center text-center z-10"
        style={{ transform: "translateZ(20px)" }}
      >
        <span className="font-pixel text-[8.5px] sm:text-[10px] tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#fffbeb] via-[#fde047] to-[#d97706] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] font-bold">
          {brandTitle}
        </span>
        <span className="font-mono text-[6.5px] sm:text-[8px] uppercase tracking-[0.25em] text-amber-400/80 drop-shadow mt-0.5">
          {brandSub}
        </span>
      </div>
    </div>
  );
}
