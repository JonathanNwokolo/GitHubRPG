"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, RpgSwords } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { duelPath, parseDuelUsername } from "./duelUrl";

interface DuelBuilderProps {
  initialHeroA?: string;
  compact?: boolean;
}

export function DuelBuilder({ initialHeroA = "", compact = false }: DuelBuilderProps) {
  const router = useRouter();
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const [heroA, setHeroA] = useState(initialHeroA);
  const [heroB, setHeroB] = useState("");
  const [errors, setErrors] = useState<{ heroA?: string; heroB?: string; form?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let parsedA: string | undefined;
    let parsedB: string | undefined;
    const nextErrors: typeof errors = {};
    try {
      parsedA = parseDuelUsername(heroA);
    } catch {
      nextErrors.heroA = t.invalidUsername;
    }
    try {
      parsedB = parseDuelUsername(heroB);
    } catch {
      nextErrors.heroB = t.invalidUsername;
    }
    if (parsedA && parsedB && parsedA.toLowerCase() === parsedB.toLowerCase()) nextErrors.form = t.sameHero;
    setErrors(nextErrors);
    if (parsedA && parsedB && Object.keys(nextErrors).length === 0) router.push(duelPath(parsedA, parsedB));
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className={`mx-auto w-full border-2 border-rpg-goldDark bg-gradient-to-br from-rpg-surface via-rpg-obsidian to-rpg-void shadow-pixel-gold ${compact ? "max-w-4xl p-4 sm:p-6" : "max-w-5xl p-5 sm:p-8"}`}
    >
      <div className="mb-6 text-center">
        <RpgSwords className="mx-auto mb-3 h-9 w-9 text-rpg-gold" />
        <h1 className="font-pixel text-xl uppercase leading-relaxed text-rpg-gold sm:text-3xl">{t.title}</h1>
        {!compact ? <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{t.subtitle}</p> : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
        <Input
          label={t.heroA}
          value={heroA}
          onChange={(event) => setHeroA(event.target.value)}
          placeholder={t.inputPlaceholder}
          helperText={t.inputHint}
          error={errors.heroA}
          autoComplete="off"
        />
        <div className="flex h-12 items-center justify-center self-center font-pixel text-lg text-rpg-crimson sm:mt-5" aria-label={t.versus}>
          VS
        </div>
        <Input
          label={t.heroB}
          value={heroB}
          onChange={(event) => setHeroB(event.target.value)}
          placeholder={t.inputPlaceholder}
          helperText={t.inputHint}
          error={errors.heroB}
          autoComplete="off"
        />
      </div>

      {errors.form ? <p role="alert" className="mt-4 text-center text-sm text-rpg-crimson">{errors.form}</p> : null}
      <div className="mt-7 text-center">
        <Button type="submit" size="lg" variant="danger">
          <RpgSwords className="h-5 w-5" /> {t.start}
        </Button>
      </div>
    </form>
  );
}

