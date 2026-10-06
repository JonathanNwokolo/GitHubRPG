"use client";

import React, { useState } from "react";
import { RpgSwords, TabPanel, Tabs } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { DuelBuilder } from "./DuelBuilder";

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
    { id: "build", label: t.buildTab, icon: <RpgSwords /> },
    { id: "current", label: t.currentTab },
  ];

  return (
    <div className="w-full space-y-6">
      <Tabs items={items} activeTab={activeTab} onTabChange={setActiveTab} idPrefix={ID_PREFIX} aria-label={t.title} className="mx-auto max-w-5xl justify-center" />
      {activeTab === "build" ? (
        <TabPanel idPrefix={ID_PREFIX} tabId="build"><DuelBuilder initialHeroA={initialHeroA} /></TabPanel>
      ) : (
        <TabPanel idPrefix={ID_PREFIX} tabId="current">
          {arena ?? <div className="mx-auto max-w-3xl border border-rpg-border bg-rpg-surface p-8 text-center text-slate-300">{t.noCurrent}</div>}
        </TabPanel>
      )}
    </div>
  );
}

