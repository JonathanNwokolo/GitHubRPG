"use client";

import React from "react";
import { LanguageIcon, RpgClassIcon, RpgCrown, RpgStar } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import { HeroAvatar } from "./HeroAvatar";
import type { HeroSummary } from "./heroSummary";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

const STAT_LABEL = "block text-[10px] font-bold uppercase tracking-wider text-slate-400";

export function FeaturedHeroCard({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const duel = getTranslation(language).duel;
  const localized = language === "pt-BR" ? "pt" : "en";
  const subclass = hero.subclassV2?.[localized] ?? hero.subclassName;

  return (
    <RPGPanel variant="legendary" interactive className="flex h-full flex-col px-6 pb-7 pt-8 sm:px-10 sm:pb-9 sm:pt-10">
      {/* Ribbon and level */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between sm:px-8">
        <div className="inline-flex items-center gap-2 border border-amber-500/50 bg-amber-950/50 px-3 py-1">
          <RpgCrown className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300 sm:text-[11px]">
            {t.featured}
          </span>
        </div>
        <span className="border border-rpg-goldDark/70 bg-rpg-void/80 px-3 py-1 font-mono text-xs font-bold text-amber-200">
          {t.level} {hero.level}
        </span>
      </div>

      {/* Portrait and identity */}
      <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
        <div className="rpg-avatar-glow">
          <HeroAvatar hero={hero} large />
        </div>

        <h3 className="mt-2 max-w-full break-words font-pixel text-lg leading-snug text-amber-50 transition-colors sm:text-2xl">
          {hero.displayName}
        </h3>
        <p className="mt-1 font-mono text-xs text-slate-400 sm:text-sm">@{hero.username}</p>

        <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 border border-rpg-goldDark/60 bg-rpg-void/70 px-3 py-1 text-xs">
          <span className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true">
            <RpgClassIcon classNameType={hero.className} />
          </span>
          <span className="font-bold uppercase tracking-wider text-amber-300">{hero.className}</span>
          {subclass && (
            <>
              <span className="text-slate-600" aria-hidden="true">&bull;</span>
              <span className="font-medium text-slate-300">{subclass}</span>
            </>
          )}
          {hero.evolutionV2 && <span className="font-semibold text-purple-200">{hero.evolutionV2[localized]}</span>}
        </div>

        <p className="mt-3 max-w-md text-xs italic leading-relaxed text-slate-300 sm:text-sm">
          &ldquo;{t.flavors[hero.className]}&rdquo;
        </p>
      </div>

      <RPGDivider className="my-5" maxWidth={400} />

      {/* Facts */}
      <dl className="flex flex-wrap items-start justify-center gap-x-8 gap-y-3 text-center">
        <div className="min-w-0">
          <dt className={STAT_LABEL}>{t.language}</dt>
          <dd className="mt-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-100">
            {hero.dominantLanguage ? <LanguageIcon language={hero.dominantLanguage} className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{hero.dominantLanguage || "—"}</span>
          </dd>
        </div>
        {hero.title ? (
          <div className="min-w-0">
            <dt className={STAT_LABEL}>{t.titleLabel}</dt>
            <dd className="mt-1 text-sm font-semibold text-amber-300">{hero.title}</dd>
          </div>
        ) : null}
        <div className="min-w-0">
          <dt className={STAT_LABEL}>{t.stars}</dt>
          <dd className="mt-1 inline-flex items-center justify-center gap-1.5 font-mono text-sm font-bold text-amber-300">
            <RpgStar className="h-4 w-4 text-amber-400" />
            {hero.starsReceived.toLocaleString()}
          </dd>
        </div>
      </dl>

      <RPGDivider className="my-5" maxWidth={400} />

      {/* Actions: the sheet is the quiet one, the duel is the gameplay call to action. */}
      <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-3">
        <RPGButton
          href={profileHref(hero.username)}
          variant="primary"
          size="lg"
          aria-label={`${t.viewSheet}: ${hero.displayName}`}
        >
          <span>{t.viewSheet}</span>
          <span aria-hidden="true">&rarr;</span>
        </RPGButton>
        <RPGButton href={`/duel?opponent=${encodeURIComponent(hero.username)}`} variant="duel" size="lg">
          <span aria-hidden="true">⚔</span>
          <span>{duel.challengeHero}</span>
        </RPGButton>
      </div>
    </RPGPanel>
  );
}
