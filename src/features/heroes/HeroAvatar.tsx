"use client";

import React from "react";
import { FramedAvatar } from "@/features/avatar";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import type { HeroSummary } from "./heroSummary";

/** A hero's framed portrait: same frame as on the character sheet, initials when there is no photo. */
export function HeroAvatar({ hero, large = false }: { hero: HeroSummary; large?: boolean }) {
  const { language } = useUiStore();
  const t = getTranslation(language).heroesHall;

  return (
    <FramedAvatar
      username={hero.username}
      avatarUrl={hero.avatarUrl}
      alt={t.avatarAlt.replace("{name}", hero.displayName)}
      className={large ? "h-40 w-40 sm:h-48 sm:w-48" : "h-24 w-24 sm:h-28 sm:w-28"}
      priority={large}
      fallback={
        <span
          className={`font-pixel text-rpg-gold ${large ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
          aria-hidden="true"
        >
          {hero.displayName.slice(0, 2).toUpperCase()}
        </span>
      }
    />
  );
}
