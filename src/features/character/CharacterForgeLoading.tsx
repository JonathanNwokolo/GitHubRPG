"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/design-system";
import { getTranslation, type SupportedLanguage } from "@/i18n";

export const CHARACTER_FORGE_MESSAGE_TIMES_MS = [0, 4_000, 10_000, 20_000, 35_000, 50_000] as const;

export function characterForgeMessageIndex(elapsedMs: number): number {
  for (let index = CHARACTER_FORGE_MESSAGE_TIMES_MS.length - 1; index >= 0; index -= 1) {
    if (elapsedMs >= CHARACTER_FORGE_MESSAGE_TIMES_MS[index]) return index;
  }
  return 0;
}

function ForgeBone({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden border border-rpg-goldDark/20 bg-gradient-to-r from-rpg-surface via-rpg-surfaceLight/70 to-rpg-surface motion-safe:animate-pulse motion-reduce:animate-none ${className}`}
    />
  );
}

function ForgeSigil() {
  return (
    <div aria-hidden="true" className="relative h-14 w-14 shrink-0">
      <div className="absolute inset-0 rotate-45 border border-rpg-goldDark/80 shadow-pixel-gold motion-safe:animate-spin motion-reduce:animate-none [animation-duration:8s]" />
      <div className="absolute inset-2 rounded-full border border-rpg-gold/70 motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="absolute inset-[18px] rotate-45 border border-rpg-arcane/70 bg-rpg-arcane/10" />
    </div>
  );
}

export interface CharacterForgeLoadingProps {
  language: SupportedLanguage;
}

export function CharacterForgeLoading({ language }: CharacterForgeLoadingProps) {
  const t = getTranslation(language).gameV2;
  const messages = t.forgeMessages;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const timers = CHARACTER_FORGE_MESSAGE_TIMES_MS.slice(1).map((threshold) => setTimeout(() => {
      setMessageIndex(characterForgeMessageIndex(performance.now() - startedAt));
    }, threshold));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="pf-stage w-full flex-1">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:space-y-8">
        <ForgeBone className="h-7 w-36 rounded" />

        <div role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
          <Card variant="rune" className="overflow-hidden border-rpg-goldDark/50 p-5 shadow-pixel-gold sm:p-6">
            <div className="flex items-center justify-center gap-4 text-center sm:gap-5">
              <ForgeSigil />
              <div className="max-w-xl text-left">
                <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-rpg-gold sm:text-xs">
                  {t.forgeTitle}
                </p>
                <p className="mt-2 font-sans text-sm text-rpg-parchmentMuted sm:text-base" data-testid="forge-message">
                  {messages[messageIndex]}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div aria-hidden="true" className="space-y-6">
          <Card variant="rune" className="space-y-6 p-5 sm:p-6 md:p-8">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-rpg-goldDark/50 bg-rpg-surface sm:h-28 sm:w-28">
                <ForgeBone className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
              </div>
              <div className="flex w-full flex-1 flex-col items-center space-y-3 md:items-start">
                <div className="flex w-full flex-wrap justify-center gap-2 md:justify-start">
                  <ForgeBone className="h-6 w-20" />
                  <ForgeBone className="h-6 w-24" />
                  <ForgeBone className="h-6 w-28" />
                </div>
                <ForgeBone className="h-8 w-3/4 max-w-sm" />
                <ForgeBone className="h-4 w-1/2 max-w-56" />
                <ForgeBone className="h-4 w-2/3 max-w-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-rpg-border/70 pt-5 sm:grid-cols-3">
              <ForgeBone className="h-11 w-full" />
              <ForgeBone className="h-11 w-full" />
              <ForgeBone className="h-11 w-full" />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 border-2 border-rpg-border bg-rpg-void p-1.5 sm:grid-cols-4">
            <ForgeBone className="h-11 w-full" />
            <ForgeBone className="h-11 w-full" />
            <ForgeBone className="h-11 w-full" />
            <ForgeBone className="h-11 w-full" />
          </div>

          <div className="grid min-h-[300px] grid-cols-1 gap-4 md:grid-cols-3">
            <ForgeBone className="h-28 w-full md:col-span-3" />
            <ForgeBone className="h-40 w-full" />
            <ForgeBone className="h-40 w-full" />
            <ForgeBone className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
