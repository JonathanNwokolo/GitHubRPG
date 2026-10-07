"use client";

import React from "react";
import { Card } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import "@/features/profile-ui/profile-ui.css";

/** A grey block of the skeleton. Decorative: the status text below carries the meaning. */
function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`bg-rpg-surfaceLight/60 animate-pulse ${className}`} />;
}

/**
 * Shown while the character sheet is fetched on the server. It mirrors the real page's frame
 * (same container, header card, tab row and content area) so nothing jumps when the sheet arrives,
 * and it shows no data: no name, no level, no numbers.
 *
 * It is the fallback of the <Suspense> in page.tsx, NOT a `loading.tsx`: Next wraps the whole page in a
 * `loading.tsx` boundary and starts streaming before the page runs, so notFound() could no longer send HTTP 404.
 */
export function CharacterLoading() {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <div className="pf-stage w-full flex-1">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8"
      >
        <Bone className="h-7 w-36 rounded" />

        <Card variant="rune" className="p-6 md:p-8 space-y-6" aria-hidden="true">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-[100px] h-[100px] flex-shrink-0 border-2 border-rpg-goldDark/60 bg-rpg-surface flex items-center justify-center">
              <Bone className="w-16 h-16 rounded-full" />
            </div>
            <div className="flex-1 w-full space-y-3 flex flex-col items-center md:items-start">
              <div className="flex gap-2">
                <Bone className="h-7 w-24" />
                <Bone className="h-7 w-24" />
                <Bone className="h-7 w-28" />
              </div>
              <Bone className="h-7 w-2/3 max-w-sm" />
              <Bone className="h-4 w-1/3 max-w-[12rem]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-rpg-border/70">
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
          </div>
        </Card>

        <div aria-hidden="true" className="flex gap-1.5 p-1 bg-rpg-void border-2 border-rpg-border">
          <Bone className="h-[44px] w-32" />
          <Bone className="h-[44px] w-36" />
          <Bone className="h-[44px] w-36" />
          <Bone className="h-[44px] w-32" />
        </div>

        <div className="min-h-[400px] flex flex-col items-center gap-6">
          <p className="font-sans font-semibold text-sm sm:text-base text-amber-400 tracking-wide text-center">
            {t.common.loading}
          </p>
          <div aria-hidden="true" className="w-full space-y-4">
            <Bone className="h-24 w-full" />
            <Bone className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
