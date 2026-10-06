"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, RpgClassIcon, RpgSparkles, RpgStar, TabPanel, Tabs } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { HERO_CATEGORY_IDS, type HeroCategoryId } from "./featuredHeroes";
import type { HeroSummary } from "./heroSummary";
import { useHeroCategory } from "./useHeroCategory";

const PANEL_ID = "heroes-hall";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

function HeroPortrait({ hero, large = false }: { hero: HeroSummary; large?: boolean }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const initials = hero.displayName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-2 border-rpg-goldDark bg-rpg-void shadow-pixel ${
        large ? "h-28 w-28 sm:h-36 sm:w-36" : "h-16 w-16"
      }`}
    >
      {hero.avatarUrl ? (
        // GitHub avatars are dynamic external URLs; the server already validated this field.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.avatarUrl}
          alt={t.avatarAlt.replace("{name}", hero.displayName)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-pixel text-lg text-rpg-gold" aria-hidden="true">
          {initials}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-rpg-void to-transparent" aria-hidden="true" />
    </div>
  );
}

function ClassMark({ hero }: { hero: HeroSummary }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
      <span className="h-4 w-4" aria-hidden="true">
        <RpgClassIcon classNameType={hero.className} />
      </span>
      {hero.className}
      {hero.subclassName ? ` / ${hero.subclassName}` : ""}
    </span>
  );
}

function FeaturedHero({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;

  return (
    <Link
      href={profileHref(hero.username)}
      className="group relative flex min-h-[360px] flex-col justify-between overflow-hidden border-2 border-rpg-goldDark bg-gradient-to-br from-rpg-surfaceLight via-rpg-surface to-rpg-obsidian p-5 shadow-pixel transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-rpg-gold hover:shadow-pixel-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void sm:p-7"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rotate-45 border border-rpg-goldDark/30 bg-rpg-gold/5" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="font-pixel text-[10px] uppercase tracking-wider text-rpg-gold">{t.featured}</span>
        <span className="border border-rpg-goldDark bg-rpg-void/80 px-2.5 py-1 font-mono text-xs font-bold text-amber-300">
          {t.level} {hero.level}
        </span>
      </div>

      <div className="relative my-7 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <HeroPortrait hero={hero} large />
        <div className="min-w-0 space-y-2">
          <h3 className="break-words font-pixel text-lg leading-relaxed text-slate-50 group-hover:text-rpg-gold sm:text-xl">
            {hero.displayName}
          </h3>
          <p className="font-mono text-sm text-slate-400">@{hero.username}</p>
          <ClassMark hero={hero} />
          <p className="max-w-sm text-sm italic leading-relaxed text-slate-300">{t.flavors[hero.className]}</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 border-t border-rpg-border pt-4 text-left text-xs">
        <div>
          <span className="block uppercase tracking-wider text-slate-500">{t.language}</span>
          <strong className="mt-1 block text-slate-100">{hero.dominantLanguage || "—"}</strong>
        </div>
        <div>
          <span className="block uppercase tracking-wider text-slate-500">{t.titleLabel}</span>
          <strong className="mt-1 block text-slate-100">{hero.title || "—"}</strong>
        </div>
        <div className="col-span-2 flex items-center justify-between border-t border-rpg-border/70 pt-3 font-bold uppercase tracking-wider text-rpg-gold">
          <span className="inline-flex items-center gap-1.5 normal-case text-slate-300">
            <RpgStar className="h-4 w-4 text-amber-400" /> {hero.starsReceived} {t.stars}
          </span>
          <span>{t.viewSheet} &rarr;</span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryHero({ hero }: { hero: HeroSummary }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  return (
    <Link
      href={profileHref(hero.username)}
      className="group flex min-w-0 flex-col border border-rpg-border bg-rpg-surface/80 p-4 shadow-pixel transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-rpg-goldDark hover:bg-rpg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
    >
      <div className="flex min-w-0 items-start gap-3">
        <HeroPortrait hero={hero} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-slate-100 group-hover:text-rpg-gold">{hero.displayName}</h3>
          <p className="truncate font-mono text-xs text-slate-400">@{hero.username}</p>
          <span className="mt-2 inline-block border border-rpg-borderLight bg-rpg-void px-2 py-1 font-mono text-[10px] font-bold text-amber-300">
            {t.level} {hero.level}
          </span>
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-2 border-t border-rpg-border/70 pt-3">
        <ClassMark hero={hero} />
        <p className="truncate text-xs text-slate-400">{hero.dominantLanguage || "—"}</p>
        <p className="text-xs italic leading-relaxed text-slate-300">{t.flavors[hero.className]}</p>
      </div>
      <span className="mt-auto pt-4 text-right text-xs font-bold uppercase tracking-wider text-rpg-gold opacity-80 group-hover:opacity-100">
        {t.viewSheet} &rarr;
      </span>
    </Link>
  );
}

function HallSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-2">
      <span className="sr-only">{label}</span>
      <div className="animate-pulse border-2 border-rpg-border bg-rpg-surface/70 p-6">
        <div className="h-full min-h-[360px] bg-rpg-surfaceLight/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="min-h-[240px] animate-pulse border border-rpg-border bg-rpg-surface/70 p-4">
            <div className="h-16 w-16 bg-rpg-surfaceLight" />
            <div className="mt-5 h-3 w-2/3 bg-rpg-surfaceLight" />
            <div className="mt-3 h-3 w-1/2 bg-rpg-surfaceLight" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroesHall() {
  const router = useRouter();
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;
  const [activeCategory, setActiveCategory] = useState<HeroCategoryId>("legends");
  const { data, status, updating, refreshing, retry } = useHeroCategory(activeCategory);

  const items = HERO_CATEGORY_IDS.map((id) => ({ id, label: t.categories[id] }));
  const heroes = data?.heroes ?? [];
  const retryLabel = getTranslation(language).common.retry;
  const stillArriving = (data?.pending ?? 0) > 0;
  const discoverHero = () => {
    if (heroes.length === 0) return;
    const categoryOffset = HERO_CATEGORY_IDS.indexOf(activeCategory);
    const target = heroes[(categoryOffset + 1) % heroes.length];
    router.push(profileHref(target.username));
  };

  return (
    <section aria-labelledby="heroes-hall-title" className="w-full border-y-2 border-rpg-border bg-rpg-obsidian/70 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-rpg-gold">
            <RpgSparkles className="h-5 w-5" />
            <span className="h-px w-8 bg-rpg-goldDark" aria-hidden="true" />
            <RpgSparkles className="h-5 w-5" />
          </div>
          <h2 id="heroes-hall-title" className="font-pixel text-xl uppercase tracking-wider text-rpg-gold sm:text-3xl">
            {t.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{t.subtitle}</p>
        </div>

        <Tabs
          items={items}
          activeTab={activeCategory}
          onTabChange={(id) => setActiveCategory(id as HeroCategoryId)}
          idPrefix={PANEL_ID}
          aria-label={t.categoriesLabel}
          className="mb-5 justify-center"
        />

        <TabPanel idPrefix={PANEL_ID} tabId={activeCategory}>
          {status === "loading" ? (
            <HallSkeleton label={t.loading} />
          ) : status === "error" ? (
            <div role="alert" className="border border-rpg-crimson bg-red-950/40 p-8 text-center text-slate-200">
              <p>{t.error}</p>
              <Button className="mt-4" size="sm" onClick={retry}>{retryLabel}</Button>
            </div>
          ) : heroes.length === 0 ? (
            <div className="border border-rpg-border bg-rpg-surface p-8 text-center text-slate-300">
              <p role={stillArriving ? "status" : undefined}>{stillArriving ? t.arriving : t.empty}</p>
              {stillArriving ? (
                <>
                  {updating ? <p className="mt-2 text-xs text-slate-400">{t.updating}</p> : null}
                  <Button className="mt-4" size="sm" disabled={refreshing} onClick={retry}>{retryLabel}</Button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {data?.partial ? (
                <p role="status" className="mb-4 text-center text-xs text-amber-300">
                  {stillArriving ? t.arriving : t.partial}
                  {stillArriving && updating ? <span className="ml-1 text-slate-400">{t.updating}</span> : null}
                  {stillArriving ? (
                    <button type="button" disabled={refreshing} onClick={retry} className="ml-2 font-bold underline hover:text-rpg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold disabled:opacity-50">
                      {retryLabel}
                    </button>
                  ) : null}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FeaturedHero hero={heroes[0]} />
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  {heroes.slice(1, 5).map((hero) => <SecondaryHero key={hero.username} hero={hero} />)}
                </div>
              </div>
              <div className="mt-8 text-center">
                <Button variant="primary" size="md" onClick={discoverHero}>
                  <RpgSparkles className="mr-2 inline h-4 w-4" /> {t.discover}
                </Button>
              </div>
            </>
          )}
        </TabPanel>
      </div>
    </section>
  );
}
