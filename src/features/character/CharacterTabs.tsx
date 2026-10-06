"use client";

import React from "react";
import {
  Tabs,
  TabItem,
  PixelShield,
  PixelSparkles,
  PixelCrown,
  PixelTrophy,
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
      icon: <PixelShield className="w-4 h-4 text-amber-400" />,
    },
    {
      id: "skills",
      label: t.nav.skills,
      icon: <PixelSparkles className="w-4 h-4 text-purple-400" />,
    },
    {
      id: "achievements",
      label: t.nav.achievements,
      icon: <PixelCrown className="w-4 h-4 text-yellow-400" />,
      badge: `${unlockedAchievementsCount}/${totalAchievementsCount}`,
    },
    {
      id: "titles",
      label: t.nav.titles,
      icon: <PixelTrophy className="w-4 h-4 text-sky-400" />,
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
