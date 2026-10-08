"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, RpgAlert, RpgShield, RpgSword, RpgSwords } from "@/design-system";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { DuelVsBadge } from "./DuelVsBadge";
import { duelPath, parseDuelUsername } from "./duelUrl";

interface DuelBuilderProps {
  initialHeroA?: string;
  compact?: boolean;
}

export function DuelBuilder({ initialHeroA = "", compact = false }: DuelBuilderProps) {
  const router = useRouter();
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const isPt = language === "pt-BR";

  const [heroA, setHeroA] = useState(initialHeroA);
  const [heroB, setHeroB] = useState("");
  const [errors, setErrors] = useState<{ heroA?: string; heroB?: string; form?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let parsedA: string | undefined;
    let parsedB: string | undefined;
    const nextErrors: typeof errors = {};

    try {
      parsedA = parseDuelUsername(heroA);
    } catch {
      nextErrors.heroA = t.invalidUsername;
    }

    try {
      parsedB = parseDuelUsername(heroB);
    } catch {
      nextErrors.heroB = t.invalidUsername;
    }

    if (parsedA && parsedB && parsedA.toLowerCase() === parsedB.toLowerCase()) {
      nextErrors.form = t.sameHero;
    }

    setErrors(nextErrors);
    if (parsedA && parsedB && Object.keys(nextErrors).length === 0) {
      router.push(duelPath(parsedA, parsedB));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto w-full">
      <RPGPanel
        variant="legendary"
        as="section"
        className={`mx-auto w-full relative overflow-hidden ${
          compact ? "max-w-4xl p-5 sm:p-7" : "max-w-5xl p-6 sm:p-10"
        }`}
      >
        {/* Subtle ambient lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(240,164,58,0.09),transparent_70%)]"
        />

        {/* Header Section */}
        <div className="relative mb-6 text-center">
          {/* Top Emblem */}
          <div className="mx-auto mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-rpg-goldDark/70 bg-gradient-to-b from-rpg-surface via-rpg-obsidian to-rpg-void shadow-[0_0_18px_rgba(240,164,58,0.2)]">
            <RpgSwords className="h-7 w-7 sm:h-8 sm:w-8 text-rpg-gold" />
          </div>

          <div className="inline-flex items-center gap-2 border border-amber-500/40 bg-amber-950/40 px-3 py-1 mb-2.5">
            <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300">
              {isPt ? "ALTAR DE CONVOCAÇÃO" : "SUMMONING ALTAR"}
            </span>
          </div>

          <h1 className="font-pixel text-xl sm:text-3xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {t.title}
          </h1>

          {!compact ? (
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300 font-sans">
              {t.subtitle}
            </p>
          ) : null}

          <RPGDivider className="my-6" maxWidth={compact ? 320 : 420} />
        </div>

        {/* Summoning Dais Grid: Hero 1 vs Hero 2 */}
        <div className="relative grid grid-cols-1 items-center gap-5 sm:gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Summoning Slot A */}
          <div className="group relative border border-amber-900/50 bg-gradient-to-b from-rpg-surface/80 via-rpg-obsidian to-rpg-void p-5 sm:p-6 shadow-inner transition-colors hover:border-amber-700/60">
            {/* Corner Runes */}
            <span
              aria-hidden="true"
              className="absolute left-1.5 top-1.5 select-none font-mono text-[10px] text-amber-600/40"
            >
              ◤
            </span>
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 select-none font-mono text-[10px] text-amber-600/40"
            >
              ◥
            </span>

            {/* Dais Header */}
            <div className="mb-4 flex items-center justify-between border-b border-amber-900/40 pb-2">
              <span className="flex items-center gap-1.5 font-pixel text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-300">
                <RpgSword className="h-3.5 w-3.5 text-amber-400" />
                {isPt ? "CAMPEÃO I" : "CHAMPION I"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {isPt ? "Desafiante" : "Challenger"}
              </span>
            </div>

            <Input
              label={t.heroA}
              value={heroA}
              onChange={(event) => setHeroA(event.target.value)}
              placeholder={t.inputPlaceholder}
              helperText={t.inputHint}
              error={errors.heroA}
              autoComplete="off"
              leftIcon={<RpgSword className="h-4 w-4 text-amber-500/70" />}
            />
          </div>

          {/* Central VS Medallion */}
          <div className="flex flex-col items-center justify-center py-1 sm:py-0">
            <DuelVsBadge size="md" ariaLabel={t.versus} showWings={true} />
            <span className="mt-2 font-pixel text-[9px] uppercase tracking-widest text-rpg-crimson" aria-hidden="true">
              {t.versus}
            </span>
          </div>

          {/* Summoning Slot B */}
          <div className="group relative border border-amber-900/50 bg-gradient-to-b from-rpg-surface/80 via-rpg-obsidian to-rpg-void p-5 sm:p-6 shadow-inner transition-colors hover:border-amber-700/60">
            {/* Corner Runes */}
            <span
              aria-hidden="true"
              className="absolute left-1.5 top-1.5 select-none font-mono text-[10px] text-amber-600/40"
            >
              ◤
            </span>
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 select-none font-mono text-[10px] text-amber-600/40"
            >
              ◥
            </span>

            {/* Dais Header */}
            <div className="mb-4 flex items-center justify-between border-b border-amber-900/40 pb-2">
              <span className="flex items-center gap-1.5 font-pixel text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-300">
                <RpgShield className="h-3.5 w-3.5 text-amber-400" />
                {isPt ? "CAMPEÃO II" : "CHAMPION II"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {isPt ? "Oponente" : "Opponent"}
              </span>
            </div>

            <Input
              label={t.heroB}
              value={heroB}
              onChange={(event) => setHeroB(event.target.value)}
              placeholder={t.inputPlaceholder}
              helperText={t.inputHint}
              error={errors.heroB}
              autoComplete="off"
              leftIcon={<RpgShield className="h-4 w-4 text-amber-500/70" />}
            />
          </div>
        </div>

        {/* Form Alert Message */}
        {errors.form ? (
          <div
            role="alert"
            className="mt-6 flex items-center justify-center gap-2 border border-rpg-crimson bg-red-950/40 px-4 py-3 text-center text-sm font-semibold text-red-200 shadow-pixel"
          >
            <RpgAlert className="h-4 w-4 shrink-0 text-rpg-crimson" />
            <span>{errors.form}</span>
          </div>
        ) : null}

        {/* Battle Summon CTA */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center">
          <RPGButton
            type="submit"
            variant="duel"
            size="lg"
            className="min-w-[260px] text-xs sm:text-sm tracking-widest"
          >
            <RpgSwords className="h-5 w-5 mr-1" />
            <span>{t.start}</span>
          </RPGButton>

          <p className="mt-2 text-[11px] font-sans text-slate-400">
            {isPt
              ? "O combate calcula 5 rodadas com base nas métricas públicas de código."
              : "Battle calculates 5 rounds based on public code metrics."}
          </p>
        </div>
      </RPGPanel>
    </form>
  );
}
