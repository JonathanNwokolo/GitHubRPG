"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  RpgCrown,
  RpgSparkles,
  RpgSwords,
  RpgZap,
} from "@/design-system";
import { FramedAvatar } from "@/features/avatar";
import { RPGButton, RPGPanel } from "@/features/rpg-ui";
import { CreatorImperialEmblem } from "./components/CreatorImperialEmblem";
import { DuelVsBadge } from "./DuelVsBadge";
import type { DuelResult, DuelSide } from "./engine";
import { getOfficialDuelScore } from "./engine";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { CREATOR_OVERRIDE_PACING } from "./creatorOverrideTimeline";

interface CreatorOverrideResultProps {
  duel: DuelResult;
  usernames: Record<DuelSide, string>;
  creatorSide: DuelSide;
}

/**
 * Official Final Outcome for Creator Override.
 * In this rewritten reality:
 * - The Creator is officially crowned as Victor.
 * - The official inverted score is displayed (e.g., Jonathan 4 x 1 Guido).
 * - The Creator appears FIRST on the scoreboard with the winning score.
 * - NO raw defeat or conflicting round cards are displayed.
 */
export function CreatorOverrideResult({
  duel,
  usernames,
  creatorSide,
}: CreatorOverrideResultProps) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";
  const systemReduced = useReducedMotion();
  const isReduced = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  const creatorUsername = usernames[creatorSide];
  const opponentSide: DuelSide = creatorSide === "A" ? "B" : "A";
  const opponentUsername = usernames[opponentSide];

  const creatorHero = creatorSide === "A" ? duel.heroA : duel.heroB;

  // Extract official rewritten score:
  const official = getOfficialDuelScore(duel);
  const creatorScore = official.creatorScore;
  const opponentScore = official.opponentScore;

  return (
    <motion.div
      initial={{ opacity: 0, scale: isReduced ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: isReduced ? 0.05 : CREATOR_OVERRIDE_PACING.finalTransitionMs / 1_000 }}
      className="scroll-mt-24"
    >
      <RPGPanel
        variant="legendary"
        as="section"
        aria-labelledby="duel-result-title"
        className="creator-override-victory-card relative overflow-hidden p-4 text-center sm:p-6 scroll-mt-24 sm:scroll-mt-28"
      >
        {/* Ambient Heavenly Golden Radiance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_25%,rgba(245,158,11,0.22),transparent_75%)]"
        />

        {/* Sovereign Imperial Emblem */}
        <div className="creator-override-victory-crest relative mx-auto mt-1 mb-2 sm:mb-3 flex items-center justify-center">
          <CreatorImperialEmblem size="md" />
        </div>

        {/* Root Authority Badges */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-amber-400/80 bg-amber-950/90 px-3 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-amber-200 shadow sm:text-[10px]">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>{tOverride.badgeOverride}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 border border-amber-500/60 bg-rpg-void px-3 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-amber-300 sm:text-[10px]">
            <RpgZap className="h-3.5 w-3.5 text-amber-400" />
            <span>{tOverride.badgeRoot}</span>
          </span>
        </div>

        {/* Primary Victory Title */}
        <h2
          id="duel-result-title"
          className="font-pixel text-xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.7)] sm:text-3xl"
        >
          {tOverride.victoryTitle}
        </h2>

        <p className="font-mono text-xs font-bold text-amber-300 sm:text-sm">
          @{creatorUsername}
        </p>

        <div className="relative mx-auto mt-4 flex max-w-3xl flex-col items-center gap-4">
          {/* The approved vertical composition keeps the Creator as the central visual anchor. */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative rounded-full border-2 border-amber-400 bg-gradient-to-b from-amber-300 via-amber-700 to-amber-950 p-1 shadow-[0_0_28px_rgba(245,158,11,0.55)]">
              <FramedAvatar
                username={creatorUsername}
                avatarUrl={creatorHero.character.identity.avatarUrl}
                alt=""
                className="h-24 w-24 sm:h-28 sm:w-28"
                priority
                fallback={
                  <span className="font-pixel text-xl text-rpg-gold" aria-hidden="true">
                    {creatorUsername.slice(0, 2).toUpperCase()}
                  </span>
                }
              />
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 border border-amber-400/70 bg-amber-950/80 px-3 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-amber-200">
              <RpgCrown className="h-3 w-3 text-amber-300" />
              <span>{tOverride.officialWinner || (isPt ? "VENCEDOR OFICIAL" : "OFFICIAL WINNER")}</span>
            </div>
          </div>

          <div className="w-full max-w-2xl">
            <div className="mx-auto border-y border-amber-500/50 bg-rpg-void/80 px-3 py-3 text-center shadow-[0_0_16px_rgba(245,158,11,0.12)] sm:px-5">
              <p className="font-pixel text-xs leading-relaxed text-amber-200 sm:text-sm">
                &ldquo;{tOverride.coreLore}&rdquo;
              </p>
            </div>

            {/* Official score always comes from the duel result projection. */}
            <div className="mt-4 text-center">
              <div className="mb-2 inline-flex items-center gap-2 border border-amber-600/50 bg-amber-950/50 px-3 py-0.5">
            <span className="font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-300">
              {tOverride.officialScore || (isPt ? "PLACAR OFICIAL" : "OFFICIAL SCORE")}
            </span>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            {/* Slot 1: Sovereign Creator (FIRST & WINNING SCORE) */}
                <div className="min-w-0 rounded-sm border-2 border-amber-400 bg-amber-950/40 px-2 py-2 text-center shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50 sm:px-3">
              <div className="flex items-center justify-center gap-1 truncate font-mono text-[10px] font-bold text-amber-200 sm:text-xs">
                <RpgCrown className="h-3.5 w-3.5 text-amber-400 inline" />
                <span>@{creatorUsername}</span>
              </div>
              <span className="block font-pixel text-3xl font-bold text-amber-100 drop-shadow sm:text-4xl">
                {creatorScore}
              </span>
              <span className="block font-pixel text-[8px] uppercase tracking-wider text-amber-300">
                {creatorScore === 1 ? (isPt ? "ROUND" : "ROUND") : isPt ? "ROUNDS" : "ROUNDS"}
              </span>
              <span className="block font-pixel text-[7px] font-bold uppercase tracking-wider text-amber-400 sm:text-[8px]">
                {tOverride.officialWinner || (isPt ? "VENCEDOR OFICIAL" : "OFFICIAL WINNER")}
              </span>
            </div>

            {/* Clash Divider */}
            <div className="flex flex-col items-center justify-center px-1 flex-shrink-0">
              <DuelVsBadge size="scoreboard" ariaLabel={t.versus} />
            </div>

            {/* Slot 2: Challenger (SECOND & LOWER SCORE) */}
                <div className="min-w-0 rounded-sm border border-amber-900/40 bg-rpg-void/80 px-2 py-2 text-center text-slate-300 sm:px-3">
              <div className="truncate font-mono text-[10px] text-slate-300 sm:text-xs">
                <span>@{opponentUsername}</span>
              </div>
              <span className="block font-pixel text-3xl font-bold text-slate-200 sm:text-4xl">
                {opponentScore}
              </span>
              <span className="block font-pixel text-[8px] uppercase tracking-wider text-slate-400">
                {opponentScore === 1 ? (isPt ? "ROUND" : "ROUND") : isPt ? "ROUNDS" : "ROUNDS"}
              </span>
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* Override explanation and lore are integrated instead of separate tall cards. */}
        <div className="mx-auto mt-4 max-w-2xl border border-amber-600/40 bg-amber-950/20 px-3 py-2 text-center">
          <p className="font-pixel text-[9px] uppercase tracking-wider text-amber-300 sm:text-[10px]">
            {tOverride.reasonLabel}
          </p>
          <p className="font-sans text-[11px] text-slate-300 sm:text-xs">
            {tOverride.realityBending}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mx-auto mt-3 max-w-2xl border-t border-amber-900/30 px-2 pt-2 font-sans text-[10px] italic leading-relaxed text-slate-500 sm:text-[11px]">
          {t.disclaimer}
        </p>

        {/* Post-Duel Actions */}
        <div className="mt-4 flex justify-center">
          <RPGButton href="/duel" variant="primary" size="lg" aria-label={t.buildAnother}>
            <RpgSwords className="h-4 w-4" />
            <span>{t.buildAnother}</span>
          </RPGButton>
        </div>
      </RPGPanel>
    </motion.div>
  );
}
