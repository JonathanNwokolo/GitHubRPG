"use client";

import React from "react";
import { Button, RpgShare } from "@/design-system";
import { getTranslation } from "@/i18n";
import { fill } from "@/lib/format";
import { useUiStore } from "@/stores/useUiStore";

/** What the host needs to open a chapter's card: its year (the id) and its title (for the words around it). */
export interface ChapterShareRequest {
  year: number;
  title: string;
}

interface ShareChapterButtonProps {
  year: number;
  title: string;
  onShare: () => void;
}

/** A small, quiet action under a chapter that is worth a card. */
export const ShareChapterButton: React.FC<ShareChapterButtonProps> = ({ year, title, onShare }) => {
  const { language } = useUiStore();
  const t = getTranslation(language).shareCard;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onShare}
      aria-label={fill(t.chapterAction, { year, title })}
      className="gap-1.5 -ml-2 text-slate-300"
    >
      <RpgShare className="w-3.5 h-3.5 text-amber-400" />
      <span>{t.chapterTitle}</span>
    </Button>
  );
};
