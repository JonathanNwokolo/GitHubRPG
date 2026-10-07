"use client";

import React from "react";
import { LanguageIcon, RpgClassIcon } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import { HeroAvatar } from "./HeroAvatar";
import type { HeroSummary } from "./heroSummary";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

/** An adventurer's portrait: framed avatar first, then who they are, then what to do about it. */
export function HeroMiniCard({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const duel = getTranslation(language).duel;
  const localized = language === "pt-BR" ? "pt" : "en";
  const subclass = hero.subclassV2?.[localized] ?? hero.subclassName;

  return (
    <RPGPanel variant="standard" interactive className="flex flex-col items-center px-4 pb-5 pt-5 text-center">
      <div className="rpg-avatar-glow">
        <HeroAvatar hero={hero} />
      </div>

      <h3 className="mt-1 max-w-full truncate text-sm font-bold text-amber-50 sm:text-base">{hero.displayName}</h3>
      <p className="max-w-full truncate font-mono text-xs text-slate-400">@{hero.username}</p>

      <span className="mt-2 border border-rpg-goldDark/70 bg-rpg-void/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
        {t.level} {hero.level}
      </span>

      <div className="mt-2 flex max-w-full items-center justify-center gap-1.5">
        <span className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true">
          <RpgClassIcon classNameType={hero.className} />
        </span>
        <span className="truncate text-xs font-semibold text-amber-300/90">
          {hero.className}
          {subclass ? ` / ${subclass}` : ""}
        </span>
      </div>
      {hero.evolutionV2 && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-purple-200">{hero.evolutionV2[localized]}</p>}

      {hero.dominantLanguage ? (
        <div className="mt-1 flex max-w-full items-center justify-center gap-1.5 text-xs text-slate-400">
          <LanguageIcon language={hero.dominantLanguage} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium">{hero.dominantLanguage}</span>
        </div>
      ) : null}

      <p className="mt-2 line-clamp-2 text-xs italic leading-relaxed text-slate-300/90">
        &ldquo;{t.flavors[hero.className]}&rdquo;
      </p>

      <RPGDivider className="mb-3 mt-auto pt-3" maxWidth={220} />

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <RPGButton href={profileHref(hero.username)} variant="primary" size="sm">
          <span>{t.viewSheet}</span>
          <span aria-hidden="true">&rarr;</span>
        </RPGButton>
        <RPGButton href={`/duel?opponent=${encodeURIComponent(hero.username)}`} variant="duel" size="sm">
          <span aria-hidden="true">⚔</span>
          <span>{duel.challenge}</span>
        </RPGButton>
      </div>
    </RPGPanel>
  );
}
