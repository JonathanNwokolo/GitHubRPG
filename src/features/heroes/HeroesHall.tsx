"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RpgSparkles, TabPanel } from "@/design-system";
import { getTranslation } from "@/i18n";
import { RPGButton, RPGDivider, RPGPanel, RPGSectionOrnament, RPGTabs } from "@/features/rpg-ui";
import { useUiStore } from "@/stores/useUiStore";
import { FeaturedHeroCard } from "./FeaturedHeroCard";
import { HERO_CATEGORY_IDS, type HeroCategoryId } from "./featuredHeroes";
import { HeroMiniCard } from "./HeroMiniCard";
import { useHeroCategory } from "./useHeroCategory";

const PANEL_ID = "heroes-hall";
/** One column (a centered stage) up to wide desktops; the featured hero beside the four others from there. */
const HALL_GRID = "mx-auto grid max-w-3xl grid-cols-1 gap-6 min-[1360px]:max-w-none min-[1360px]:grid-cols-2";

function profileHref(username: string): string {
  return `/${encodeURIComponent(username)}`;
}

function HallSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className={HALL_GRID}>
      <span className="sr-only">{label}</span>
      <div className="min-h-[520px] animate-pulse border border-[#4a3a24] bg-rpg-surface/50 p-6 sm:min-h-[600px]">
        <div className="h-full min-h-[360px] bg-rpg-surfaceLight/40" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex min-h-[300px] animate-pulse flex-col items-center border border-[#4a3a24] bg-rpg-surface/50 p-4">
            <div className="h-24 w-24 bg-rpg-surfaceLight/60 sm:h-28 sm:w-28" />
            <div className="mt-5 h-3 w-2/3 bg-rpg-surfaceLight/60" />
            <div className="mt-3 h-3 w-1/2 bg-rpg-surfaceLight/60" />
            <div className="mt-auto h-9 w-3/4 bg-rpg-surfaceLight/60" />
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
    <section id="heroes-hall" aria-labelledby="heroes-hall-title" className="rpg-hall relative w-full scroll-mt-20 overflow-x-clip px-4 py-14 sm:px-6 sm:py-20 lg:px-20">
      <span aria-hidden="true" className="rpg-embers" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-6 text-center [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
          <RPGSectionOrnament />
          <h2
            id="heroes-hall-title"
            className="mt-1 font-pixel text-xl uppercase tracking-wider text-amber-200 [text-shadow:0_2px_0_#3a2410,0_0_24px_rgba(240,164,58,0.25)] sm:text-3xl"
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{t.subtitle}</p>
          <RPGDivider className="mt-4" maxWidth={440} />
        </div>

        <RPGTabs
          items={items}
          activeTab={activeCategory}
          onTabChange={(id) => setActiveCategory(id as HeroCategoryId)}
          idPrefix={PANEL_ID}
          aria-label={t.categoriesLabel}
          className="mb-8"
        />

        <TabPanel idPrefix={PANEL_ID} tabId={activeCategory}>
          {status === "loading" ? (
            <HallSkeleton label={t.loading} />
          ) : status === "error" ? (
            <div role="alert" className="mx-auto max-w-3xl border border-rpg-crimson/70 bg-red-950/40 p-8 text-center text-slate-200">
              <p>{t.error}</p>
              <RPGButton className="mt-4" size="sm" onClick={retry}>{retryLabel}</RPGButton>
            </div>
          ) : heroes.length === 0 ? (
            <RPGPanel className="mx-auto max-w-3xl p-8 text-center text-slate-300">
              <p role={stillArriving ? "status" : undefined}>{stillArriving ? t.arriving : t.empty}</p>
              {stillArriving ? (
                <>
                  {updating ? <p className="mt-2 text-xs text-slate-400">{t.updating}</p> : null}
                  <RPGButton className="mt-4" size="sm" disabled={refreshing} onClick={retry}>{retryLabel}</RPGButton>
                </>
              ) : null}
            </RPGPanel>
          ) : (
            <>
              {data?.partial ? (
                <p role="status" className="mx-auto mb-6 max-w-3xl text-center text-xs text-amber-300">
                  {stillArriving ? t.arriving : t.partial}
                  {stillArriving && updating ? <span className="ml-1 text-slate-400">{t.updating}</span> : null}
                  {stillArriving ? (
                    <button type="button" disabled={refreshing} onClick={retry} className="ml-2 font-bold underline hover:text-rpg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold disabled:opacity-50">
                      {retryLabel}
                    </button>
                  ) : null}
                </p>
              ) : null}
              <div className={HALL_GRID}>
                <FeaturedHeroCard hero={heroes[0]} />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {heroes.slice(1, 5).map((hero) => <HeroMiniCard key={hero.username} hero={hero} />)}
                </div>
              </div>
              <div className="mt-8 text-center">
                <RPGButton variant="primary" size="md" onClick={discoverHero}>
                  <RpgSparkles className="h-4 w-4" /> {t.discover}
                </RPGButton>
              </div>
            </>
          )}
        </TabPanel>
      </div>
    </section>
  );
}
