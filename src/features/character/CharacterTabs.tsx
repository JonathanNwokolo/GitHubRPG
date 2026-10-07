"use client";

import React from "react";
import { Tabs, TabItem, RpgShield, RpgSparkles, RpgCrown, RpgTrophy, type TabsProps } from "@/design-system";
import "@/features/profile-ui/profile-ui.css";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

export type CharacterActiveTab = "overview" | "skills" | "achievements" | "titles";

/** DOM id prefix shared by the tab list and its panel (see `TabPanel`). */
export const CHARACTER_TABS_ID_PREFIX = "character";

interface CharacterTabsProps {
  activeTab: CharacterActiveTab;
  onTabChange: (tab: CharacterActiveTab) => void;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  unlockedTitlesCount: number;
  totalTitlesCount: number;
}

/** Kit plates for the shared `Tabs` (keyboard handling, ARIA and sounds stay in `Tabs`). */
const PROFILE_TAB_APPEARANCE: NonNullable<TabsProps["appearance"]> = {
  list: "flex flex-wrap items-center justify-center gap-x-1 gap-y-3 sm:gap-x-2",
  tab: (active) => (active ? "pf-tab pf-tab--active" : "pf-tab"),
  badge: () => "pf-tab__badge",
};

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
      icon: <RpgShield className="h-4 w-4" />,
    },
    {
      id: "skills",
      label: t.nav.skills,
      icon: <RpgSparkles className="h-4 w-4" />,
    },
    {
      id: "achievements",
      label: t.nav.achievements,
      icon: <RpgCrown className="h-4 w-4" />,
      badge: `${unlockedAchievementsCount}/${totalAchievementsCount}`,
    },
    {
      id: "titles",
      label: t.nav.titles,
      icon: <RpgTrophy className="h-4 w-4" />,
      badge: `${unlockedTitlesCount}/${totalTitlesCount}`,
    },
  ];

  return (
    <Tabs
      items={tabItems}
      activeTab={activeTab}
      onTabChange={(id) => onTabChange(id as CharacterActiveTab)}
      className="w-full"
      appearance={PROFILE_TAB_APPEARANCE}
      idPrefix={CHARACTER_TABS_ID_PREFIX}
      aria-label={t.character.sections}
    />
  );
};
