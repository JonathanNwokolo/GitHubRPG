"use client";

import React from "react";
import Link from "next/link";
import { Button, RpgArrowLeft, RpgGhost, RpgIconFrame } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";

export default function NotFound() {
  const { language } = useUiStore();
  const t = getTranslation(language);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <RpgIconFrame size="xl" shape="circle" rarity="epic" glow>
        <RpgGhost className="w-8 h-8 text-purple-300 animate-pulse" />
      </RpgIconFrame>
      <h2 className="font-pixel text-2xl text-rpg-gold">{t.notFound.title}</h2>
      <p className="font-sans text-sm text-slate-300 max-w-md">
        {t.notFound.message}
      </p>
      <Link href="/">
        <Button variant="primary" size="md" className="gap-2">
          <RpgArrowLeft className="w-4 h-4" />
          <span>{t.notFound.back}</span>
        </Button>
      </Link>
    </div>
  );
}
