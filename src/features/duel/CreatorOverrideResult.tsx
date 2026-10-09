"use client";

import React from "react";
import { motion } from "motion/react";
import {
  RpgCrown,
  RpgShare,
  RpgSparkles,
  RpgSwords,
  RpgZap,
} from "@/design-system";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import type { DuelResult, DuelSide } from "./engine";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

interface CreatorOverrideResultProps {
  duel: DuelResult;
  usernames: Record<DuelSide, string>;
  creatorSide: DuelSide;
  share: () => void;
  shareStatus: "idle" | "copied" | "error";
}

export function CreatorOverrideResult({
  duel,
  usernames,
  creatorSide,
  share,
  shareStatus,
}: CreatorOverrideResultProps) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";
  const isReduced = reducedMotion === "reduced";

  const creatorUsername = usernames[creatorSide];

  return (
    <motion.div
      initial={{ opacity: 0, scale: isReduced ? 1 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: isReduced ? 0.1 : 0.45 }}
      className="mt-6"
    >
      <RPGPanel
        variant="legendary"
        as="section"
        aria-labelledby="duel-result-title"
        className="creator-override-victory-card relative p-7 sm:p-12 text-center overflow-hidden"
      >
        {/* Ambient Heavenly Golden Radiance */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_25%,rgba(245,158,11,0.22),transparent_75%)]"
        />

        {/* Victor Crest of the Creator */}
        <div className="creator-override-victory-crest relative mx-auto mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-b from-amber-950 via-rpg-obsidian to-rpg-void">
          <RpgCrown className="h-10 w-10 sm:h-12 sm:w-12 text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]" />
        </div>

        {/* Root Authority Badges */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-amber-400/70 bg-amber-950/80 px-3.5 py-1 font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-200 shadow">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>{tOverride.badgeOverride}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 border border-amber-500/50 bg-rpg-void px-3 py-1 font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-400">
            <RpgZap className="h-3.5 w-3.5 text-amber-400" />
            <span>{tOverride.badgeRoot}</span>
          </span>
        </div>

        {/* Primary Victory Title */}
        <h2
          id="duel-result-title"
          className="font-pixel text-2xl sm:text-4xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.7)]"
        >
          {tOverride.victoryTitle}
        </h2>

        <p className="mt-1 font-mono text-xs sm:text-sm font-bold text-amber-300/90">
          @{creatorUsername}
        </p>

        {/* Lore Quote Banner */}
        <div className="my-6 mx-auto max-w-2xl border-y-2 border-amber-500/50 bg-rpg-void/90 py-5 px-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <p className="font-pixel text-sm sm:text-lg text-amber-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] leading-relaxed">
            &ldquo;{tOverride.coreLore}&rdquo;
          </p>
        </div>

        {/* Honest War Scoreboard Totem */}
        <div className="mt-8">
          <p className="mb-3 font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">
            {tOverride.roundHistoryTitle}: {duel.scoreA} &times; {duel.scoreB}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {/* Score Side A */}
            <div
              className={`min-w-[120px] sm:min-w-[160px] border p-4 rounded-sm text-center transition-all ${
                creatorSide === "A"
                  ? "border-amber-400 bg-amber-950/40 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50"
                  : "border-amber-900/40 bg-rpg-void/80 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-center gap-1 font-mono text-xs truncate">
                {creatorSide === "A" && <RpgCrown className="h-3 w-3 text-amber-400 inline" />}
                <span>@{usernames.A}</span>
              </div>
              <span className="my-1 block font-pixel text-3xl sm:text-5xl font-bold">
                {duel.scoreA}
              </span>
              <span className="block font-pixel text-[8px] uppercase tracking-wider text-slate-400">
                {duel.scoreA === 1 ? "ROUND" : "ROUNDS"}
              </span>
              {creatorSide === "A" && (
                <span className="mt-1 block font-pixel text-[8px] uppercase tracking-wider text-amber-300">
                  {isPt ? "VENCEDOR OFICIAL" : "OFFICIAL WINNER"}
                </span>
              )}
            </div>

            {/* Clash Divider */}
            <div className="flex flex-col items-center justify-center px-1 sm:px-2">
              <RpgSwords className="h-7 w-7 sm:h-9 sm:w-9 text-rpg-crimson" />
              <span className="font-pixel text-xs text-amber-500/70 mt-1">VS</span>
            </div>

            {/* Score Side B */}
            <div
              className={`min-w-[120px] sm:min-w-[160px] border p-4 rounded-sm text-center transition-all ${
                creatorSide === "B"
                  ? "border-amber-400 bg-amber-950/40 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50"
                  : "border-amber-900/40 bg-rpg-void/80 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-center gap-1 font-mono text-xs truncate">
                {creatorSide === "B" && <RpgCrown className="h-3 w-3 text-amber-400 inline" />}
                <span>@{usernames.B}</span>
              </div>
              <span className="my-1 block font-pixel text-3xl sm:text-5xl font-bold">
                {duel.scoreB}
              </span>
              <span className="block font-pixel text-[8px] uppercase tracking-wider text-slate-400">
                {duel.scoreB === 1 ? "ROUND" : "ROUNDS"}
              </span>
              {creatorSide === "B" && (
                <span className="mt-1 block font-pixel text-[8px] uppercase tracking-wider text-amber-300">
                  {isPt ? "VENCEDOR OFICIAL" : "OFFICIAL WINNER"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reason Stamp */}
        <div className="mt-6 mx-auto max-w-lg border border-amber-500/40 bg-amber-950/30 p-3 sm:p-4 text-center">
          <p className="font-pixel text-xs uppercase tracking-wider text-amber-300">
            {tOverride.reasonLabel}
          </p>
          <p className="mt-1 font-sans text-xs text-slate-300">
            {tOverride.realityBending}
          </p>
        </div>

        <RPGDivider className="my-6" maxWidth={400} />

        {/* Disclaimer */}
        <p className="mx-auto max-w-2xl border border-amber-900/20 bg-rpg-void/60 p-3 sm:p-4 text-xs sm:text-sm font-sans italic leading-relaxed text-slate-400">
          {t.disclaimer}
        </p>

        {/* Post-Duel Actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <RPGButton
            variant="duel"
            size="lg"
            onClick={share}
            aria-label={t.share}
          >
            <RpgShare className="h-4 w-4" />
            <span>{typeof navigator !== "undefined" && "share" in navigator ? t.share : t.copyLink}</span>
          </RPGButton>

          <RPGButton href="/duel" variant="primary" size="lg" aria-label={t.buildAnother}>
            <RpgSwords className="h-4 w-4" />
            <span>{t.buildAnother}</span>
          </RPGButton>
        </div>

        {shareStatus !== "idle" ? (
          <p
            role="status"
            className={`mt-4 font-mono text-sm ${
              shareStatus === "error" ? "text-rpg-crimson" : "text-emerald-300"
            }`}
          >
            {shareStatus === "error" ? t.shareFailed : t.copied}
          </p>
        ) : null}
      </RPGPanel>
    </motion.div>
  );
}
