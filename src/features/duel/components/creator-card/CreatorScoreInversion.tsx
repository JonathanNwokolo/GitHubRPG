"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RpgCrown, RpgSwords, RpgZap } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

interface CreatorScoreInversionProps {
  creatorUsername: string;
  opponentUsername: string;
  creatorSide: "A" | "B";
  rawScoreA: number;
  rawScoreB: number;
  officialScoreA: number;
  officialScoreB: number;
  onAnimationComplete?: () => void;
  className?: string;
}

/**
 * Visual Scoreboard Inversion:
 * Reality itself is rewritten as the numbers detach, cross the VS axis,
 * and swap positions under the Creator's Root Authority.
 */
export function CreatorScoreInversion({
  creatorUsername,
  opponentUsername,
  creatorSide,
  rawScoreA,
  rawScoreB,
  officialScoreA,
  officialScoreB,
  onAnimationComplete,
  className = "",
}: CreatorScoreInversionProps) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";
  const systemReduced = useReducedMotion();
  const isReduced = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  // States:
  // "impact": 0 to 300ms (reality crack, energy pulse)
  // "swapping": 300ms to 900ms (numbers detach and cross paths)
  // "settled": 900ms+ (numbers land, victory aura transfers to Creator)
  const [stage, setStage] = useState<"impact" | "swapping" | "settled">("impact");

  useEffect(() => {
    if (isReduced) {
      setStage("settled");
      onAnimationComplete?.();
      return;
    }

    const t1 = window.setTimeout(() => setStage("swapping"), 350);
    const t2 = window.setTimeout(() => {
      setStage("settled");
      onAnimationComplete?.();
    }, 1100);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isReduced, onAnimationComplete]);

  const usernameA = creatorSide === "A" ? creatorUsername : opponentUsername;
  const usernameB = creatorSide === "B" ? creatorUsername : opponentUsername;

  // In pre-inversion (impact/early), Side with higher score has winner glow.
  // In settled stage, Creator has the golden winner crown and glow!
  const isCreatorA = creatorSide === "A";
  const isCreatorB = creatorSide === "B";

  const isSwapping = stage === "swapping";
  const isSettled = stage === "settled";

  return (
    <div
      className={`relative mx-auto max-w-xl p-5 sm:p-7 rounded-xl border border-amber-500/70 bg-gradient-to-b from-[#14121d]/95 via-[#0b0a11]/95 to-[#050508]/95 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-center overflow-hidden ${className}`}
      aria-live="polite"
    >
      {/* Shockwave energy ripples */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.25),transparent_70%)] ${
          stage === "impact" ? "animate-ping opacity-75" : "opacity-30"
        }`}
      />

      {/* Dynamic Status Banner */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <RpgZap className="h-4 w-4 text-amber-400 animate-bounce" />
        <span className="font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 drop-shadow">
          {isSettled
            ? tOverride.officialScoreRewritten || (isPt ? "RESULTADO OFICIAL REESCRITO" : "OFFICIAL RESULT REWRITTEN")
            : tOverride.scoreRewritten || (isPt ? "INVERSÃO DO PLACAR EM ANDAMENTO..." : "SCORE INVERSION IN PROGRESS...")}
        </span>
        <RpgZap className="h-4 w-4 text-amber-400 animate-bounce" />
      </div>

      {/* Clash Scoreboard Columns */}
      <div className="relative flex items-center justify-center gap-4 sm:gap-8 my-2">
        {/* Score Column A */}
        <div
          className={`flex-1 min-w-[110px] sm:min-w-[140px] p-3 sm:p-4 rounded-lg border transition-all duration-500 ${
            isSettled && isCreatorA
              ? "border-amber-400 bg-amber-950/50 shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/70"
              : "border-amber-900/40 bg-rpg-void/80"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            {isSettled && isCreatorA && <RpgCrown className="h-3.5 w-3.5 text-amber-300 drop-shadow animate-pulse" />}
            <span className="font-mono text-xs font-bold truncate text-amber-300">
              @{usernameA}
            </span>
          </div>

          {/* Animating Number Box for Side A */}
          <div className="relative h-14 sm:h-16 flex items-center justify-center my-1">
            <motion.div
              animate={
                isSwapping
                  ? {
                      x: 90, // Cross paths towards Side B
                      y: -12,
                      scale: 1.3,
                      filter: "drop-shadow(0 0 15px rgba(245,158,11,0.9))",
                    }
                  : isSettled
                    ? {
                        x: 0,
                        y: 0,
                        scale: 1,
                        filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))",
                      }
                    : { x: 0, y: 0, scale: 1 }
              }
              transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
              className={`font-pixel text-4xl sm:text-5xl font-bold ${
                isSettled && isCreatorA
                  ? "text-amber-200 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  : "text-slate-200"
              }`}
            >
              {isSettled ? officialScoreA : rawScoreA}
            </motion.div>
          </div>

          <span className="font-pixel text-[8px] uppercase tracking-wider text-slate-400">
            {isSettled && isCreatorA ? (isPt ? "VITÓRIA OFICIAL" : "OFFICIAL WINNER") : isPt ? "ROUNDS" : "ROUNDS"}
          </span>
        </div>

        {/* Central Clash Sigil */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-amber-500/60 bg-rpg-void shadow-inner">
            <RpgSwords className="h-5 w-5 text-amber-400 drop-shadow" />
          </div>
          <span className="mt-1 font-pixel text-[9px] uppercase tracking-widest text-amber-500/80">
            VS
          </span>
        </div>

        {/* Score Column B */}
        <div
          className={`flex-1 min-w-[110px] sm:min-w-[140px] p-3 sm:p-4 rounded-lg border transition-all duration-500 ${
            isSettled && isCreatorB
              ? "border-amber-400 bg-amber-950/50 shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/70"
              : "border-amber-900/40 bg-rpg-void/80"
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            {isSettled && isCreatorB && <RpgCrown className="h-3.5 w-3.5 text-amber-300 drop-shadow animate-pulse" />}
            <span className="font-mono text-xs font-bold truncate text-amber-300">
              @{usernameB}
            </span>
          </div>

          {/* Animating Number Box for Side B */}
          <div className="relative h-14 sm:h-16 flex items-center justify-center my-1">
            <motion.div
              animate={
                isSwapping
                  ? {
                      x: -90, // Cross paths towards Side A
                      y: -12,
                      scale: 1.3,
                      filter: "drop-shadow(0 0 15px rgba(245,158,11,0.9))",
                    }
                  : isSettled
                    ? {
                        x: 0,
                        y: 0,
                        scale: 1,
                        filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))",
                      }
                    : { x: 0, y: 0, scale: 1 }
              }
              transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
              className={`font-pixel text-4xl sm:text-5xl font-bold ${
                isSettled && isCreatorB
                  ? "text-amber-200 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                  : "text-slate-200"
              }`}
            >
              {isSettled ? officialScoreB : rawScoreB}
            </motion.div>
          </div>

          <span className="font-pixel text-[8px] uppercase tracking-wider text-slate-400">
            {isSettled && isCreatorB ? (isPt ? "VITÓRIA OFICIAL" : "OFFICIAL WINNER") : isPt ? "ROUNDS" : "ROUNDS"}
          </span>
        </div>
      </div>

      {/* Explanatory Stamp */}
      <p className="mt-3 font-sans text-xs italic text-amber-300/80">
        &ldquo;{tOverride.coreLore}&rdquo;
      </p>
    </div>
  );
}
