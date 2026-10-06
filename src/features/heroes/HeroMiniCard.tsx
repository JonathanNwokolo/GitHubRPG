"use client";

import React from "react";
import Link from "next/link";
import { LanguageIcon, RpgClassIcon } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { HeroAvatar } from "./HeroAvatar";
import type { HeroSummary } from "./heroSummary";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

export function HeroMiniCard({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const duel = getTranslation(language).duel;

  return (
    <div
      className="group relative flex min-w-0 flex-col justify-between overflow-hidden border-2 border-rpg-border bg-gradient-to-b from-rpg-surface/90 via-rpg-surface to-rpg-obsidian p-4 shadow-pixel transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-rpg-goldDark hover:shadow-pixel-gold focus-within:border-rpg-gold"
    >
      {/* Decorative corner studs */}
      <span
        className="pointer-events-none absolute -top-[3px] -left-[3px] z-20 h-[5px] w-[5px] bg-rpg-borderLight transition-colors group-hover:bg-amber-400"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -top-[3px] -right-[3px] z-20 h-[5px] w-[5px] bg-rpg-borderLight transition-colors group-hover:bg-amber-400"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[3px] -left-[3px] z-20 h-[5px] w-[5px] bg-rpg-borderLight transition-colors group-hover:bg-amber-400"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[3px] -right-[3px] z-20 h-[5px] w-[5px] bg-rpg-borderLight transition-colors group-hover:bg-amber-400"
        aria-hidden="true"
      />

      {/* Inner subtle rim border */}
      <span
        className="pointer-events-none absolute inset-1 z-10 border border-white/[0.03]"
        aria-hidden="true"
      />

      {/* Header: Avatar + Identity */}
      <div className="relative z-20 flex min-w-0 items-start gap-3">
        <HeroAvatar hero={hero} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="truncate font-bold text-sm text-slate-100 transition-colors group-hover:text-rpg-gold sm:text-base">
              {hero.displayName}
            </h3>
            <span className="shrink-0 border border-rpg-goldDark/70 bg-rpg-void/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
              {t.level} {hero.level}
            </span>
          </div>

          <p className="truncate font-mono text-xs text-slate-400">@{hero.username}</p>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true">
              <RpgClassIcon classNameType={hero.className} />
            </span>
            <span className="truncate text-xs font-semibold text-amber-300/90">
              {hero.className}
              {hero.subclassName ? ` / ${hero.subclassName}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Body: Language & Short Lore Quote */}
      <div className="relative z-20 my-3 min-w-0 space-y-2 border-t border-rpg-border/70 pt-2.5 text-xs">
        {hero.dominantLanguage ? (
          <div className="flex items-center gap-1.5 text-slate-400">
            <LanguageIcon language={hero.dominantLanguage} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{hero.dominantLanguage}</span>
          </div>
        ) : null}

        <p className="line-clamp-2 text-xs italic leading-relaxed text-slate-300/90">
          &ldquo;{t.flavors[hero.className]}&rdquo;
        </p>
      </div>

      {/* Action Footer */}
      <div className="relative z-20 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-rpg-border/60 pt-3 text-xs font-bold uppercase tracking-wider">
        <Link
          href={profileHref(hero.username)}
          className="py-1 text-rpg-gold transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
        >
          {t.viewSheet} &rarr;
        </Link>
        <Link
          href={`/duel?opponent=${encodeURIComponent(hero.username)}`}
          className="inline-flex items-center gap-1 border border-rpg-crimson/80 bg-red-950/40 px-2.5 py-1 text-[11px] text-red-200 transition-colors hover:bg-red-900/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-crimson"
        >
          ⚔ {duel.challenge}
        </Link>
      </div>
    </div>
  );
}
