"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, RpgSparkles, TabPanel, Tabs } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { FeaturedHeroCard } from "./FeaturedHeroCard";
import { HERO_CATEGORY_IDS, type HeroCategoryId } from "./featuredHeroes";
import { HeroMiniCard } from "./HeroMiniCard";
import { useHeroCategory } from "./useHeroCategory";

const PANEL_ID = "heroes-hall";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
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
                <FeaturedHeroCard hero={heroes[0]} />
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  {heroes.slice(1, 5).map((hero) => <HeroMiniCard key={hero.username} hero={hero} />)}
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
