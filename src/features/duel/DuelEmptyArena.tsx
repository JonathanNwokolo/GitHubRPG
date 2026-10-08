"use client";

import React from "react";
import { RpgCastle, RpgSwords } from "@/design-system";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

interface DuelEmptyArenaProps {
  onSummonClick?: () => void;
}

export function DuelEmptyArena({ onSummonClick }: DuelEmptyArenaProps) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const isPt = language === "pt-BR";

  return (
    <RPGPanel
      variant="standard"
      as="article"
      className="mx-auto max-w-4xl px-6 py-10 sm:px-12 sm:py-14 text-center relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(240,164,58,0.08),transparent_70%)]"
      />

      {/* Top arena crest */}
      <div className="relative mx-auto mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-rpg-goldDark/70 bg-gradient-to-b from-rpg-surface via-rpg-obsidian to-rpg-void shadow-[0_0_24px_rgba(240,164,58,0.18)]">
        <div className="absolute inset-1 rounded-full border border-amber-500/20" />
        <RpgSwords className="h-10 w-10 sm:h-12 sm:w-12 text-rpg-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Arena status badge */}
      <div className="inline-flex items-center gap-2 border border-amber-500/40 bg-amber-950/40 px-3.5 py-1 mb-3">
        <RpgCastle className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300">
          {isPt ? "ARENA DE CONFRONTO" : "CONFRONTATION ARENA"}
        </span>
      </div>

      {/* Main heading */}
      <h2 className="font-pixel text-lg sm:text-2xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        {isPt ? "A Arena Aguarda Combatentes" : "The Arena Awaits Champions"}
      </h2>

      {/* Divider */}
      <RPGDivider className="my-5" maxWidth={360} />

      {/* Primary translation copy */}
      <p className="mx-auto max-w-xl text-sm sm:text-base leading-relaxed text-slate-200 font-sans">
        {t.noCurrent}
      </p>

      {/* Evocative flavor hint */}
      <p className="mx-auto mt-2.5 max-w-lg text-xs leading-relaxed text-slate-400 font-sans italic">
        {isPt
          ? "Invoque dois desenvolvedores com perfis públicos no GitHub para confrontar anos de jornada, arsenal de linguagens, repositórios forjados e o legado de suas estrelas."
          : "Summon two developers with public GitHub profiles to compare years of journey, code arsenals, forged repositories, and the legacy of their stars."}
      </p>

      {/* Action to switch to the Summoning tab */}
      {onSummonClick ? (
        <div className="mt-8 flex justify-center">
          <RPGButton
            variant="duel"
            size="lg"
            onClick={onSummonClick}
            className="min-w-[240px] text-xs sm:text-sm tracking-wider"
          >
            <RpgSwords className="h-4 w-4" />
            <span>{isPt ? "Convocar Heróis para a Arena" : "Summon Heroes to Arena"}</span>
          </RPGButton>
        </div>
      ) : null}
    </RPGPanel>
  );
}
