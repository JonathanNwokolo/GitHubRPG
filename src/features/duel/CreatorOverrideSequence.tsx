"use client";

import React from "react";
import { motion } from "motion/react";
import { RpgAlert, RpgCrown, RpgSparkles, RpgZap } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";

export type OverridePhase = "idle" | "apparent_defeat" | "anomaly" | "authority" | "restoration" | "final";

interface CreatorOverrideSequenceProps {
  phase: OverridePhase;
  creatorName: string;
  opponentName: string;
  creatorUsername: string;
  opponentUsername: string;
  creatorSide: "A" | "B";
}

/**
 * Cinematic Dark Fantasy Sequence for the Creator Override easter egg.
 * Plays across dramatic phases:
 * 1. Apparent Defeat: A brief moment of suspense after round 5.
 * 2. Anomaly Detected: Reality glitch, dimensional scanlines, warning protocol.
 * 3. Creator Authority Activated: Divine golden radiance and the central lore phrase:
 *    "O Criador não pode ser derrotado em seu próprio domínio."
 * 4. Restoration: Cosmic HP recharge surge before revealing the final result.
 */
export function CreatorOverrideSequence({
  phase,
  creatorUsername,
  opponentUsername,
}: CreatorOverrideSequenceProps) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const tOverride = t.creatorOverride;
  const isPt = language === "pt-BR";
  const isReduced = reducedMotion === "reduced";

  if (phase === "idle" || phase === "final") {
    return null;
  }

  return (
    <div
      className="relative my-6 w-full transition-all duration-500"
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
          transition={{ duration: isReduced ? 0.1 : 0.4 }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="border border-red-900/40 bg-rpg-void/90 p-4 sm:p-5 shadow-pixel backdrop-blur-sm">
            <div className="mb-2 inline-flex items-center gap-2 border border-red-800/50 bg-red-950/40 px-3 py-0.5 text-[9px] font-pixel uppercase tracking-widest text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>{isPt ? "FIM DOS 5 ROUNDS" : "ALL 5 ROUNDS CONCLUDED"}</span>
            </div>
            <p className="font-pixel text-sm sm:text-base text-slate-300">
              {tOverride.apparentDefeat}
            </p>
            <p className="mt-1 font-sans text-xs italic text-slate-500">
              @{opponentUsername} {isPt ? "parece ter vencido 5×0 contra" : "seemed to have won 5×0 against"} @{creatorUsername}...
            </p>
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 2: ANOMALIA DETECTADA ----------------- */}
      {phase === "anomaly" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.1 : 0.3 }}
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

          <p className="mt-2 font-sans text-xs sm:text-sm text-red-200/90 max-w-lg mx-auto leading-relaxed">
            {tOverride.anomalySubtitle}
          </p>

          <div className="mt-4 border-t border-red-900/40 pt-3">
            <code className="font-mono text-[10px] sm:text-xs text-amber-400/80">
              {tOverride.anomalyCode} &bull; {isPt ? "LEITURA DO TECIDO DA ARENA COMPROMETIDA" : "ARENA FABRIC INTEGRITY DESTABILIZED"}
            </code>
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 3: AUTORIDADE DO CRIADOR ATIVADA ----------------- */}
      {phase === "authority" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReduced ? 0.1 : 0.45 }}
          className="creator-override-authority-backdrop mx-auto max-w-2xl p-7 sm:p-10 text-center"
        >
          {/* Floating celestial rune sparks */}
          <span className="creator-override-rune-particle" style={{ left: "15%", top: "25%" }}>✦</span>
          <span className="creator-override-rune-particle" style={{ right: "18%", top: "30%", animationDelay: "1.2s" }}>✧</span>
          <span className="creator-override-rune-particle" style={{ left: "22%", bottom: "20%", animationDelay: "2.1s" }}>✵</span>
          <span className="creator-override-rune-particle" style={{ right: "20%", bottom: "25%", animationDelay: "0.8s" }}>✦</span>

          {/* Golden Crown of Absolute Authority */}
          <div className="creator-override-glyph-pulse mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-rpg-void shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            <RpgCrown className="h-8 w-8 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 border border-amber-400/60 bg-amber-950/70 px-3.5 py-1">
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-pixel text-[10px] sm:text-xs uppercase tracking-widest text-amber-200">
              {tOverride.authorityActivated}
            </span>
            <RpgSparkles className="h-3.5 w-3.5 text-amber-300" />
          </div>

          {/* The Sacred Core Lore Phrase */}
          <div className="my-5 border-y-2 border-amber-500/40 bg-rpg-void/80 py-6 px-4">
            <blockquote className="creator-override-lore-text font-pixel text-lg sm:text-2xl sm:leading-relaxed tracking-wide">
              &ldquo;{tOverride.coreLore}&rdquo;
            </blockquote>
          </div>

          <p className="font-sans text-xs sm:text-sm text-amber-300/80">
            {tOverride.realityBending}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-amber-400/70">
            <span>ROOT_PRIVILEGE: GRANTED</span>
            <span>&bull;</span>
            <span>DOMAIN_OWNER: @{creatorUsername}</span>
          </div>
        </motion.div>
      )}

      {/* ----------------- FASE 4: RESTAURAÇÃO DE HP / TRANSIÇÃO ----------------- */}
      {phase === "restoration" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: isReduced ? 0.1 : 0.3 }}
          className="creator-override-authority-backdrop mx-auto max-w-xl p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-amber-300">
            <RpgZap className="h-5 w-5 animate-bounce" />
            <span className="font-pixel text-xs sm:text-sm uppercase tracking-widest text-amber-200">
              {isPt ? "RESTAURAÇÃO DA ESSÊNCIA VITAL" : "VITAL ESSENCE RESTORATION"}
            </span>
            <RpgZap className="h-5 w-5 animate-bounce" />
          </div>

          <p className="mt-3 font-pixel text-base sm:text-lg text-amber-100">
            {isPt ? "A VITALIDADE RETORNA AO CRIADOR" : "VITALITY RETURNS TO THE CREATOR"}
          </p>

          <p className="mt-1 font-sans text-xs text-amber-400/90">
            {tOverride.reversalNotice}
          </p>
        </motion.div>
      )}
    </div>
  );
}
