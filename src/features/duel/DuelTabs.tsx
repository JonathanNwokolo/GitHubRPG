"use client";

import React, { useState } from "react";
import { RpgSwords, TabPanel } from "@/design-system";
import { RPGTabs } from "@/features/rpg-ui";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { DuelBuilder } from "./DuelBuilder";
import { DuelEmptyArena } from "./DuelEmptyArena";

const ID_PREFIX = "duel-navigation";

interface DuelTabsProps {
  initialHeroA?: string;
  arena?: React.ReactNode;
}

export function DuelTabs({ initialHeroA, arena }: DuelTabsProps) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const [activeTab, setActiveTab] = useState(arena ? "current" : "build");
  const items = [
    { id: "build", label: t.buildTab, icon: <RpgSwords className="h-4 w-4" /> },
    { id: "current", label: t.currentTab },
  ];

  return (
    <div className="w-full space-y-8">
      <RPGTabs
        items={items}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        idPrefix={ID_PREFIX}
        aria-label={t.title}
        className="mx-auto max-w-5xl justify-center"
      />
      {activeTab === "build" ? (
        <TabPanel idPrefix={ID_PREFIX} tabId="build">
          <DuelBuilder initialHeroA={initialHeroA} />
        </TabPanel>
      ) : (
        <TabPanel idPrefix={ID_PREFIX} tabId="current">
          {arena ?? <DuelEmptyArena onSummonClick={() => setActiveTab("build")} />}
        </TabPanel>
      )}
    </div>
  );
}
