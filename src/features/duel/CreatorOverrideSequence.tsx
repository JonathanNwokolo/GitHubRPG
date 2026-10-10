"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { RpgAlert, RpgCrown, RpgSparkles, RpgZap } from "@/design-system";
import type { RPGCharacter } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { CreatorCard } from "./components/creator-card/CreatorCard";
import { CreatorSummoningCircle } from "./components/creator-card/CreatorSummoningCircle";
import { CreatorScoreInversion } from "./components/creator-card/CreatorScoreInversion";

export type OverridePhase =
  | "idle"
  | "apparent_defeat"
  | "anomaly"
  | "summoning_circle"
  | "card_entrance"
  | "card_reveal"
  | "effect_activation"
  | "score_inversion"
  | "creator_ascension"
  | "card_dissolution"
  | "final";

export interface CreatorOverrideSequenceProps {
  phase: OverridePhase;
  creatorCharacter: RPGCharacter;
  opponentCharacter: RPGCharacter;
  creatorUsername: string;
  opponentUsername: string;
  creatorSide: "A" | "B";
  rawScoreA: number;
  rawScoreB: number;
  officialScoreA: number;
  officialScoreB: number;
}

/**
 * Orchestrates the cinematic sequence of the Legendary Card "O CRIADOR":
 * 1. apparent_defeat: combat seemingly concluded.
 * 2. anomaly: dimensional anomaly & root authority warning.
 * 3. summoning_circle: rotating runic circle manifests.
 * 4. card_entrance: card rises in 3D from the seal (back face).
 * 5. card_reveal: 3D Y-flip reveals "O CRIADOR".
 * 6. effect_activation: "INVERSÃO ABSOLUTA" activates with arcane surge.
 * 7. score_inversion: numbers detach and cross paths to swap.
 * 8. creator_ascension: HP restoration, golden aura, and sovereign lore.
 * 9. card_dissolution: card dissolves into celestial golden energy.
 */
export function CreatorOverrideSequence({
  phase,
  creatorCharacter,
  creatorUsername,
  opponentUsername,
  creatorSide,
  rawScoreA,
  rawScoreB,
  officialScoreA,
  officialScoreB,
}: CreatorOverrideSequenceProps) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";
  const systemReduced = useReducedMotion();
  const isReduced = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  if (phase === "idle" || phase === "final") {
    return null;
  }

  return (
    <div
      className="relative my-6 w-full transition-all duration-500 overflow-hidden"
      aria-live="assertive"
      role="region"
      aria-label={tOverride.authorityActivated}
    >
      {/* ----------------- FASE 1: DERROTA APARENTE ----------------- */}
      {phase === "apparent_defeat" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.35 }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="border border-red-900/40 bg-rpg-void/90 p-5 sm:p-6 shadow-pixel backdrop-blur-sm">
            <div className="mb-2 inline-flex items-center gap-2 border border-red-800/50 bg-red-950/40 px-3 py-0.5 text-[9px] font-pixel uppercase tracking-widest text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>{isPt ? "FIM DOS 5 ROUNDS" : "ALL 5 ROUNDS CONCLUDED"}</span>
            </div>
            <p className="font-pixel text-base sm:text-lg text-slate-300">
              {tOverride.apparentDefeat}
            </p>
            <p className="mt-1 font-sans text-xs italic text-slate-500">
              @{opponentUsername} {isPt ? "parece ter vencido pelos rounds contra" : "seemed to have won by rounds against"} @{creatorUsername}...
            </p>
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 2: ANOMALIA & AUTORIDADE ROOT ----------------- */}
      {phase === "anomaly" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.3 }}
          className={`creator-override-anomaly-backdrop ${isReduced ? "" : "creator-override-anomaly-shake"} mx-auto max-w-2xl p-6 sm:p-8 text-center`}
        >
          {/* Scanline & Glitch header */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <RpgAlert className="h-6 w-6 text-red-400 animate-pulse" />
            <span className="creator-override-glitch-badge font-pixel text-xs sm:text-sm uppercase tracking-widest text-red-400">
              [ ⚠ {tOverride.anomalyDetected} ⚠ ]
            </span>
            <RpgAlert className="h-6 w-6 text-red-400 animate-pulse" />
          </div>

          <h3 className="creator-override-glitch-badge font-pixel text-lg sm:text-2xl uppercase tracking-wider text-amber-200">
            {tOverride.anomalyDetected}
          </h3>

          <div className="my-2 inline-block border border-amber-400/70 bg-amber-950/80 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-amber-300">
            {tOverride.badgeRootDetected || (isPt ? "AUTORIDADE ROOT DETECTADA" : "ROOT AUTHORITY DETECTED")}
          </div>

          <p className="mt-2 font-sans text-xs sm:text-sm text-red-200/90 max-w-lg mx-auto leading-relaxed">
            {tOverride.anomalySubtitle}
          </p>

          <div className="mt-4 border-t border-red-900/40 pt-3">
            <code className="font-mono text-[10px] sm:text-xs text-amber-400/80">
              {tOverride.anomalyCode} &bull; {isPt ? "INTERRUPÇÃO DO TECIDO DA ARENA" : "ARENA FABRIC DESTABILIZED"}
            </code>
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 3: SELO DE INVOCAÇÃO ----------------- */}
      {phase === "summoning_circle" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.4 }}
          className="relative mx-auto flex flex-col items-center justify-center py-6 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 border border-amber-400/60 bg-amber-950/80 px-3.5 py-1">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-200">
              {tOverride.summoningCircle || (isPt ? "INVOCAÇÃO ARCANO DA RAIZ" : "ROOT ARCANE SUMMONING")}
            </span>
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
          </div>

          <CreatorSummoningCircle size={360} />
        </motion.div>
      )}

      {/* ----------------- FASE 4, 5, 6, 9: CARTA LENDÁRIA EMERGE, FLIP & EFEITO ----------------- */}
      {(phase === "card_entrance" ||
        phase === "card_reveal" ||
        phase === "effect_activation" ||
        phase === "card_dissolution") && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.65, ease: "easeOut" }}
          className="relative mx-auto flex flex-col items-center justify-center py-4 text-center"
        >
          {/* Subtle Summoning Circle beneath Card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-35 pointer-events-none">
            <CreatorSummoningCircle size={420} />
          </div>

          {/* Phase Notification Banner */}
          {phase === "effect_activation" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 z-20 inline-flex items-center gap-2 border-2 border-amber-400 bg-amber-950/90 px-4 py-1.5 shadow-[0_0_20px_rgba(245,158,11,0.7)]"
            >
              <RpgZap className="h-4 w-4 text-amber-300 animate-pulse" />
              <span className="font-pixel text-xs sm:text-sm uppercase tracking-widest text-amber-100">
                {tOverride.cardEffectActivated}: {tOverride.effectName}
              </span>
              <RpgZap className="h-4 w-4 text-amber-300 animate-pulse" />
            </motion.div>
          )}

          {/* The 2.5D Legendary Card */}
          <div className="relative z-10">
            <CreatorCard
              character={creatorCharacter}
              isFlipped={phase !== "card_entrance"}
              isActivated={phase === "effect_activation"}
              isDissolving={phase === "card_dissolution"}
              viewportChromeRem={phase === "effect_activation" ? 12 : 7}
            />
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 7: INVERSÃO VISUAL DO PLACAR ----------------- */}
      {phase === "score_inversion" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.5 }}
          className="relative mx-auto py-4"
        >
          <CreatorScoreInversion
            creatorUsername={creatorUsername}
            opponentUsername={opponentUsername}
            creatorSide={creatorSide}
            rawScoreA={rawScoreA}
            rawScoreB={rawScoreB}
            officialScoreA={officialScoreA}
            officialScoreB={officialScoreB}
          />
        </motion.div>
      )}

      {/* ----------------- FASE 8: ASCENSÃO DO CRIADOR ----------------- */}
      {phase === "creator_ascension" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.05 : 0.5 }}
          className="creator-override-authority-backdrop mx-auto max-w-2xl p-7 sm:p-10 text-center"
        >
          {/* Floating celestial rune sparks */}
          <span className="creator-override-rune-particle" style={{ left: "15%", top: "25%" }}>✦</span>
          <span className="creator-override-rune-particle" style={{ right: "18%", top: "30%", animationDelay: "1.2s" }}>✧</span>
          <span className="creator-override-rune-particle" style={{ left: "22%", bottom: "20%", animationDelay: "2.1s" }}>✵</span>
          <span className="creator-override-rune-particle" style={{ right: "20%", bottom: "25%", animationDelay: "0.8s" }}>✦</span>

          {/* Golden Crown of Absolute Authority */}
          <div className="creator-override-glyph-pulse mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-amber-400 bg-rpg-void shadow-[0_0_35px_rgba(245,158,11,0.6)]">
            <RpgCrown className="h-9 w-9 sm:h-11 sm:w-11 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 border border-amber-400/60 bg-amber-950/70 px-3.5 py-1">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-200">
              {tOverride.authorityActivated}
            </span>
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
          </div>

          {/* The Sacred Core Lore Phrase */}
          <div className="my-5 border-y-2 border-amber-500/40 bg-rpg-void/80 py-6 px-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <blockquote className="creator-override-lore-text font-pixel text-lg sm:text-2xl sm:leading-relaxed tracking-wide">
              &ldquo;{tOverride.coreLore}&rdquo;
            </blockquote>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-amber-400/80">
            <span>ROOT_PRIVILEGE: GRANTED</span>
            <span>&bull;</span>
            <span>DOMAIN_OWNER: @{creatorUsername}</span>
            <span>&bull;</span>
            <span>HP: 100% RESTORED</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
