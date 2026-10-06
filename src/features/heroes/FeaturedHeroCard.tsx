"use client";

import React from "react";
import Link from "next/link";
import {
  LanguageIcon,
  RpgClassIcon,
  RpgCrown,
  RpgStar,
  RpgSwords,
  RpgZap,
} from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { HeroAvatar } from "./HeroAvatar";
import type { HeroSummary } from "./heroSummary";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

export function FeaturedHeroCard({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const duel = getTranslation(language).duel;

  return (
    <div
      className="group relative flex min-h-[400px] flex-col justify-between overflow-hidden border-2 border-rpg-goldDark bg-gradient-to-br from-rpg-surfaceLight via-rpg-surface to-rpg-obsidian p-5 shadow-pixel transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-rpg-gold hover:shadow-pixel-gold focus-within:border-rpg-gold sm:p-7"
    >
      {/* Decorative corner brackets (heraldic filigree) */}
      <span
        className="pointer-events-none absolute -top-1 -left-1 z-20 h-3.5 w-3.5 border-l-2 border-t-2 border-amber-300"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -top-1 -right-1 z-20 h-3.5 w-3.5 border-r-2 border-t-2 border-amber-300"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-1 -left-1 z-20 h-3.5 w-3.5 border-b-2 border-l-2 border-amber-300"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-1 -right-1 z-20 h-3.5 w-3.5 border-b-2 border-r-2 border-amber-300"
        aria-hidden="true"
      />

      {/* Inner ornamental double border */}
      <span
        className="pointer-events-none absolute inset-1.5 z-10 border border-amber-400/20"
        aria-hidden="true"
      />

      {/* Atmospheric ambient golden glows */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/15 via-amber-600/5 to-transparent blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-amber-700/10 to-transparent blur-xl"
        aria-hidden="true"
      />

      {/* Top Banner: Champion Ribbon & Legendary Level Badge */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        {/* Ribbon "Herói em destaque" */}
        <div className="relative inline-flex items-center gap-2 border border-amber-400/80 bg-gradient-to-r from-amber-950/90 via-rpg-void to-amber-950/60 px-3 py-1 shadow-pixel">
          <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <RpgCrown className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300 sm:text-[11px]">
            {t.featured}
          </span>
        </div>

        {/* Level badge */}
        <div className="relative inline-flex items-center gap-1.5 border border-amber-400/80 bg-gradient-to-r from-amber-950 via-amber-900/90 to-rpg-void px-3 py-1 shadow-pixel">
          <span className="pointer-events-none absolute -top-0.5 -left-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-1 w-1 bg-amber-300" aria-hidden="true" />
          <RpgZap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="font-mono text-xs font-bold text-amber-200">
            {t.level} {hero.level}
          </span>
        </div>
      </div>

      {/* Main Showcase: Avatar + Identity cluster */}
      <div className="relative z-20 my-6 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <div className="relative shrink-0">
          <div
            className="pointer-events-none absolute -inset-2 rounded-lg bg-gradient-to-tr from-amber-500/25 via-amber-400/10 to-transparent blur-md"
            aria-hidden="true"
          />
          <HeroAvatar hero={hero} large />
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="space-y-0.5">
            <h3 className="break-words font-pixel text-lg leading-snug text-slate-50 transition-colors group-hover:text-rpg-gold sm:text-xl">
              {hero.displayName}
            </h3>
            <p className="font-mono text-xs text-slate-400 sm:text-sm">@{hero.username}</p>
          </div>

          {/* Class, Subclass & Optional Title */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 sm:justify-start">
            <div className="inline-flex items-center gap-1.5 border border-rpg-goldDark/70 bg-rpg-void/90 px-2.5 py-1 text-xs shadow-sm">
              <span className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true">
                <RpgClassIcon classNameType={hero.className} />
              </span>
              <span className="font-bold text-amber-300">{hero.className}</span>
              {hero.subclassName && (
                <>
                  <span className="text-slate-600" aria-hidden="true">&bull;</span>
                  <span className="font-medium text-slate-300">{hero.subclassName}</span>
                </>
              )}
            </div>

            {hero.title && (
              <span className="inline-flex items-center gap-1 border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 font-sans text-xs font-bold text-amber-300 shadow-sm">
                &laquo; {hero.title} &raquo;
              </span>
            )}
          </div>

          {/* Lore quote */}
          <p className="max-w-md border-l-2 border-rpg-goldDark/80 bg-rpg-void/40 px-3 py-1.5 text-xs italic leading-relaxed text-slate-300 sm:text-sm">
            &ldquo;{t.flavors[hero.className]}&rdquo;
          </p>
        </div>
      </div>

      {/* Stats Summary Shelf: Dominant Language & Stars Received */}
      <div className="relative z-20 mb-5 grid grid-cols-2 gap-3 border-y border-rpg-border/80 bg-rpg-void/50 p-3 text-xs sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rpg-borderLight bg-rpg-surface shadow-pixel">
            <LanguageIcon language={hero.dominantLanguage || ""} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.language}
            </span>
            <strong className="block truncate text-xs font-semibold text-slate-100 sm:text-sm">
              {hero.dominantLanguage || "—"}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-amber-500/50 bg-amber-950/50 shadow-pixel">
            <RpgStar className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t.stars}
            </span>
            <strong className="block font-mono text-xs font-bold text-amber-300 sm:text-sm">
              {hero.starsReceived.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* Action Footer: Primary Combat CTA (Desafiar) & Secondary Sheet CTA (Ver ficha) */}
      <div className="relative z-20 flex flex-col items-stretch justify-between gap-3 pt-1 sm:flex-row sm:items-center">
        <Link
          href={`/duel?opponent=${encodeURIComponent(hero.username)}`}
          className="group/duel relative inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 border-2 border-rpg-crimson bg-gradient-to-r from-red-950 via-rpg-crimsonDark to-red-900 px-5 py-2.5 font-bold uppercase tracking-wider text-xs text-red-100 shadow-pixel transition-all motion-safe:duration-150 hover:brightness-110 hover:shadow-pixel-crimson active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-crimson sm:text-sm"
        >
          <RpgSwords className="h-4 w-4 text-red-300 transition-transform motion-safe:group-hover/duel:scale-110" />
          <span>⚔ {duel.challenge}</span>
        </Link>

        <Link
          href={profileHref(hero.username)}
          aria-label={`${t.viewSheet}: ${hero.displayName}`}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border border-rpg-goldDark/80 bg-rpg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-200/90 shadow-pixel transition-all motion-safe:duration-150 hover:border-rpg-gold hover:bg-rpg-surfaceLight hover:text-amber-300 hover:shadow-pixel-gold active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
        >
          <span>{t.viewSheet}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
