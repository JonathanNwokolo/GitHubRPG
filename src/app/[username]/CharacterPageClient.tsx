"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { RPGCharacter } from "@/game/types";
import { CharacterHeader, AttributesPanel, ActivitySummary } from "@/features/character";
import { CharacterTabs, CharacterActiveTab } from "@/features/character/CharacterTabs";
import { SkillsTree } from "@/features/skills/SkillsTree";
import { AchievementsGrid } from "@/features/achievements/AchievementsGrid";
import { TitlesPanel } from "@/features/titles/TitlesPanel";
import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { ChroniclePanel } from "@/features/chronicle/ChroniclePanel";
import type { DeveloperChronicle } from "@/features/chronicle/types";
import { NextMilestones } from "@/features/progress/NextMilestones";
import { ShareCardModal } from "@/features/share/ShareCardModal";
import { PixelArrowLeft } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { useTitleStore } from "@/stores/useTitleStore";
import { getTranslation } from "@/i18n";

interface CharacterPageProps {
  character: RPGCharacter;
  chronicle: DeveloperChronicle;
  username: string;
}

export default function CharacterPage({ character, chronicle, username }: CharacterPageProps) {
  const { language } = useUiStore();
  const t = getTranslation(language);

  const savedTitleId = useTitleStore((state) => state.equippedByUser[username]);
  const equipTitle = useTitleStore((state) => state.equipTitle);
  const clearEquippedTitle = useTitleStore((state) => state.clearEquippedTitle);

  const [activeTab, setActiveTab] = useState<CharacterActiveTab>("overview");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const equippedTitle = useMemo(
    () => resolveEquippedTitle(character.titles, savedTitleId, character.defaultTitleId),
    [character, savedTitleId]
  );

  const unlockedAchievements = character.achievements.filter((a) => a.unlocked).length;
  const unlockedTitles = character.titles.filter((title) => title.unlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 animate-fade-in">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans font-semibold text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 -ml-2 rounded"
        >
          <PixelArrowLeft className="w-4 h-4" />
          <span>Voltar à busca</span>
        </Link>
      </div>

      <CharacterHeader character={character} equippedTitle={equippedTitle} onOpenShareModal={() => setIsShareModalOpen(true)} />

      <CharacterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unlockedAchievementsCount={unlockedAchievements}
        totalAchievementsCount={character.achievements.length}
        unlockedTitlesCount={unlockedTitles}
        totalTitlesCount={character.titles.length}
      />

      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <NextMilestones milestones={character.nextMilestones} />
            <AttributesPanel stats={character.stats} />
            <ActivitySummary summary={character.summary} />
          </div>
        )}

        {activeTab === "skills" && (
          <div className="animate-fade-in">
            <SkillsTree skills={character.skills} />
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="animate-fade-in">
            <AchievementsGrid achievements={character.achievements} />
          </div>
        )}

        {activeTab === "titles" && (
          <div className="animate-fade-in">
            <TitlesPanel
              titles={character.titles}
              equippedTitleId={equippedTitle?.id ?? null}
              defaultTitleId={character.defaultTitleId}
              hasCustomPick={savedTitleId !== undefined && savedTitleId === equippedTitle?.id}
              onEquip={(titleId) => equipTitle(character.identity.username, titleId)}
              onUseDefault={() => clearEquippedTitle(character.identity.username)}
            />
          </div>
        )}

        {activeTab === "chronicle" && (
          <div className="animate-fade-in">
            <ChroniclePanel chronicle={chronicle} />
          </div>
        )}
      </div>

      <p className="font-sans text-xs text-slate-500 text-center max-w-3xl mx-auto">{t.disclaimer}</p>

      <ShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        character={character}
        equippedTitleName={equippedTitle?.name ?? null}
      />
    </div>
  );
}
