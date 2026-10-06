"use client";

import React, { useCallback, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { loadCharacter } from "@/data/loadCharacter";
import type { RPGCharacter } from "@/game/types";
import {
  CharacterHeader,
  AttributesPanel,
  ActivitySummary,
} from "@/features/character";
import { CharacterTabs, CharacterActiveTab } from "@/features/character/CharacterTabs";
import { SkillsTree } from "@/features/skills/SkillsTree";
import { AchievementsGrid } from "@/features/achievements/AchievementsGrid";
import { TitlesPanel } from "@/features/titles/TitlesPanel";
import { resolveEquippedTitle } from "@/features/titles/equippedTitle";
import { NextMilestones } from "@/features/progress/NextMilestones";
import { ShareCardModal } from "@/features/share/ShareCardModal";
import { LoadingState, ErrorState, Button, PixelArrowLeft } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { useTitleStore } from "@/stores/useTitleStore";
import { getTranslation } from "@/i18n";

interface CharacterPageProps {
  params: Promise<{ username: string }>;
}

export default function CharacterPage({ params }: CharacterPageProps) {
  const resolvedParams = use(params);
  const decodedUsername = decodeURIComponent(resolvedParams.username);

  const { language } = useUiStore();
  const t = getTranslation(language);

  const savedTitleId = useTitleStore((state) => state.equippedByUser[decodedUsername]);
  const equipTitle = useTitleStore((state) => state.equipTitle);
  const clearEquippedTitle = useTitleStore((state) => state.clearEquippedTitle);

  const [character, setCharacter] = useState<RPGCharacter | null>(null);
  const [activeTab, setActiveTab] = useState<CharacterActiveTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const loadCharacterData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCharacter(await loadCharacter(decodedUsername));
    } catch (err) {
      setCharacter(null);
      setErrorMessage(err instanceof Error ? err.message : "Erro ao consultar os anais mágicos do perfil.");
    } finally {
      setIsLoading(false);
    }
  }, [decodedUsername]);

  useEffect(() => {
    void loadCharacterData();
  }, [loadCharacterData]);

  const equippedTitle = useMemo(
    () => (character ? resolveEquippedTitle(character.titles, savedTitleId, character.defaultTitleId) : null),
    [character, savedTitleId]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LoadingState message={`Invocando pergaminhos de @${decodedUsername}...`} />
      </div>
    );
  }

  if (errorMessage || !character) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <ErrorState
          title="Aventureiro Desconhecido"
          message={errorMessage || t.landing.errorNotFound}
          onRetry={loadCharacterData}
        />
        <div>
          <Link href="/">
            <Button variant="secondary" size="md" className="gap-2">
              <PixelArrowLeft className="w-4 h-4" />
              <span>Voltar à Taverna Inicial</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const unlockedAchievements = character.achievements.filter((a) => a.unlocked).length;
  const unlockedTitles = character.titles.filter((title) => title.unlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans font-semibold text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold px-2 py-1 -ml-2 rounded"
        >
          <PixelArrowLeft className="w-4 h-4" />
          <span>Voltar à busca</span>
        </Link>
      </div>

      {/* Hero Header */}
      <CharacterHeader
        character={character}
        equippedTitle={equippedTitle}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Tabs navigation */}
      <CharacterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unlockedAchievementsCount={unlockedAchievements}
        totalAchievementsCount={character.achievements.length}
        unlockedTitlesCount={unlockedTitles}
        totalTitlesCount={character.titles.length}
      />

      {/* Tab Panels */}
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
      </div>

      <p className="font-sans text-xs text-slate-500 text-center max-w-3xl mx-auto">{t.disclaimer}</p>

      {/* Share Card Modal */}
      <ShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        character={character}
        equippedTitleName={equippedTitle?.name ?? null}
      />
    </div>
  );
}
