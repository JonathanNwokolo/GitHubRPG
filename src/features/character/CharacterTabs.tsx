"use client";

import React from "react";
import {
  Tabs,
  TabItem,
  RpgIconFrame,
  RpgShield,
  RpgSparkles,
  RpgCrown,
  RpgTrophy,
} from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

export type CharacterActiveTab = "overview" | "skills" | "achievements" | "titles";

interface CharacterTabsProps {
  activeTab: CharacterActiveTab;
  onTabChange: (tab: CharacterActiveTab) => void;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  unlockedTitlesCount: number;
  totalTitlesCount: number;
}

export const CharacterTabs: React.FC<CharacterTabsProps> = ({
  activeTab,
  onTabChange,
  unlockedAchievementsCount,
  totalAchievementsCount,
  unlockedTitlesCount,
  totalTitlesCount,
}) => {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const tabItems: TabItem[] = [
    {
      id: "overview",
      label: t.nav.character,
      icon: (
        <RpgIconFrame size="xs" shape="slate" rarity="gold">
          <RpgShield className="w-3.5 h-3.5" />
        </RpgIconFrame>
      ),
    },
    {
      id: "skills",
      label: t.nav.skills,
      icon: (
        <RpgIconFrame size="xs" shape="slate" rarity="arcane">
          <RpgSparkles className="w-3.5 h-3.5" />
        </RpgIconFrame>
      ),
    },
    {
      id: "achievements",
      label: t.nav.achievements,
      icon: (
        <RpgIconFrame size="xs" shape="slate" rarity="legendary">
          <RpgCrown className="w-3.5 h-3.5" />
        </RpgIconFrame>
      ),
      badge: `${unlockedAchievementsCount}/${totalAchievementsCount}`,
    },
    {
      id: "titles",
      label: t.nav.titles,
      icon: (
        <RpgIconFrame size="xs" shape="slate" rarity="rare">
          <RpgTrophy className="w-3.5 h-3.5" />
        </RpgIconFrame>
      ),
      badge: `${unlockedTitlesCount}/${totalTitlesCount}`,
    },
  ];

  return (
    <Tabs
      items={tabItems}
      activeTab={activeTab}
      onTabChange={(id) => onTabChange(id as CharacterActiveTab)}
      className="w-full justify-start overflow-x-auto"
    />
  );
};
