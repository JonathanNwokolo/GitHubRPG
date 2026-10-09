"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  RpgSparkles,
  RpgSword,
  RpgSwords,
  RpgShield,
  RpgAlert,
} from "@/design-system";
import { RPGButton, RPGDivider, RPGSectionOrnament } from "@/features/rpg-ui";
import { RunicSummonInput } from "./RunicSummonInput";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { PersonaCard, PersonaItem } from "./PersonaCard";
import { InvokedProfilesCounter } from "./InvokedProfilesCounter";
import { fetchCharacter } from "@/data/api/fetchCharacter";
import { parseGitHubProfileInput } from "@/lib/profileUrl";
import { playClickSound } from "@/lib/audio/soundEffects";

/** What the landing needs to know about each persona once the engine has run. */
interface PersonaSummary {
  level: number;
  className: string;
  tier: string;
}

const PERSONA_IDS = ["rookie-dev", "veteran-dev", "polyglot-dev", "popular-dev", "empty-dev"] as const;

interface LandingHeroProps {
  /** Demo personas are mock profiles: shown only while the server runs the mock data source. */
  showDemoPersonas: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ showDemoPersonas }) => {
  const router = useRouter();
  const { language } = useUiStore();
  const t = getTranslation(language);

  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, PersonaSummary>>({});

  // Persona badges come from the Game Engine, never from hard-coded numbers.
  useEffect(() => {
    if (!showDemoPersonas) return;
    let cancelled = false;
    Promise.all(
      PERSONA_IDS.map(async (id) => {
        const character = await fetchCharacter(id);
        const summary: PersonaSummary = {
          level: character.progression.level,
          className: character.archetype.className,
          tier: character.progression.tier,
        };
        return [id, summary] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setSummaries(Object.fromEntries(entries));
      })
      .catch(() => {
        /* badges are decorative: the cards still work without them */
      });
    return () => {
      cancelled = true;
    };
  }, [showDemoPersonas]);

  const personaBadge = (id: string): string => {
    const summary = summaries[id];
    return summary ? `${t.character.levelShort} ${summary.level} • ${summary.className}` : t.common.demoDataDisclaimer;
  };
  const personaRole = (id: string): string => summaries[id]?.tier ?? t.landing.personaRoleDefault;

  const personas: PersonaItem[] = [
    {
      id: "rookie-dev",
      name: t.landing.rookie,
      role: personaRole("rookie-dev"),
      description: t.landing.rookieDesc,
      badge: personaBadge("rookie-dev"),
      badgeVariant: "common",
      icon: "rookie",
    },
    {
      id: "veteran-dev",
      name: t.landing.veteran,
      role: personaRole("veteran-dev"),
      description: t.landing.veteranDesc,
      badge: personaBadge("veteran-dev"),
      badgeVariant: "legendary",
      icon: "veteran",
    },
    {
      id: "polyglot-dev",
      name: t.landing.polyglot,
      role: personaRole("polyglot-dev"),
      description: t.landing.polyglotDesc,
      badge: personaBadge("polyglot-dev"),
      badgeVariant: "epic",
      icon: "polyglot",
    },
    {
      id: "popular-dev",
      name: t.landing.popular,
      role: personaRole("popular-dev"),
      description: t.landing.popularDesc,
      badge: personaBadge("popular-dev"),
      badgeVariant: "rare",
      icon: "popular",
    },
    {
      id: "empty-dev",
      name: t.landing.emptyDev,
      role: personaRole("empty-dev"),
      description: t.landing.emptyDevDesc,
      badge: personaBadge("empty-dev"),
      badgeVariant: "common",
      icon: "empty",
    },
    {
      id: "missing-dev",
      name: t.landing.missingDev,
      role: t.landing.personaRoleDefault,
      description: t.landing.missingDevDesc,
      badge: t.landing.personaMissing,
      badgeVariant: "crimson",
      icon: "missing",
    },
  ];

  const handleSummon = async (targetUsername: string) => {
    if (!targetUsername.trim()) {
      setErrorMessage(t.landing.emptyUsername);
      return;
    }

    let clean: string;
    try {
      clean = parseGitHubProfileInput(targetUsername).toLowerCase();
    } catch {
      setErrorMessage(t.landing.invalidUsername);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Existence check only: the character page loads it again (the server caches the GitHub fetch).
      await fetchCharacter(clean);
      router.push(`/${encodeURIComponent(clean)}`);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t.landing.errorGeneric);
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSummon(username);
  };

  return (
    <section id="home" aria-labelledby="landing-title" className="rpg-portal relative w-full overflow-hidden px-4 pb-12 pt-10 text-center sm:px-6 sm:pb-14 sm:pt-14 lg:pb-16 lg:pt-16">
      <span aria-hidden="true" className="rpg-portal__glow" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
        <div className="rpg-crest-badge shadow-pixel sm:shadow-lg">
          <span className="h-1.5 w-1.5 rotate-45 border border-amber-400/80 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" aria-hidden="true" />
          <RpgSparkles className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
          <span>{t.landing.badge}</span>
          <span className="h-1.5 w-1.5 rotate-45 border border-amber-400/80 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" aria-hidden="true" />
        </div>

        <RPGSectionOrnament width={104} className="mt-4 opacity-75 sm:mt-5" />

        <div className="mt-3 max-w-4xl [text-shadow:0_2px_14px_rgba(0,0,0,0.9)] sm:mt-4">
          <h1 id="landing-title" className="font-pixel text-3xl leading-tight tracking-wide text-rpg-gold [text-shadow:0_3px_0_#3a2410,0_6px_22px_rgba(0,0,0,0.85),0_0_28px_rgba(240,164,58,0.22)] sm:text-5xl lg:text-6xl">
            {t.landing.title}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-balance font-sans text-xl font-semibold leading-snug text-slate-100 sm:text-2xl lg:text-[1.75rem]">
            {t.landing.headline}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-balance font-sans text-sm leading-relaxed text-slate-300 sm:text-base">
            {t.landing.subtitle}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 w-full max-w-3xl" noValidate>
          <label htmlFor="hero-profile-input" className="sr-only">{t.landing.searchLabel}</label>
          <div className="rpg-summon-form flex flex-col gap-3 p-2.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 text-left">
              <RunicSummonInput
                id="hero-profile-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t.landing.searchPlaceholder}
                disabled={isLoading}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                aria-describedby="hero-profile-feedback"
                aria-invalid={Boolean(errorMessage)}
                error={Boolean(errorMessage)}
              />
            </div>
            <RPGButton
              type="submit"
              size="lg"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full min-w-[210px] sm:w-auto"
            >
              {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <RpgSword className="h-4 w-4" />}
              <span>{isLoading ? t.landing.searchLoading : t.landing.searchButton}</span>
            </RPGButton>
          </div>
          <div id="hero-profile-feedback" className="min-h-6 pt-2" aria-live="polite">
            {errorMessage ? (
              <div role="alert" className="mx-auto flex max-w-2xl items-center justify-center gap-2 text-left text-xs text-red-300 sm:text-sm">
                <RpgAlert className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </form>

        <nav aria-label={t.landing.secondaryActions} className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
          <Link
            href="/duel"
            onClick={() => playClickSound()}
            className="rpg-action-chip rpg-action-chip--duel group"
          >
            <span className="h-1 w-1 rotate-45 bg-red-400/70 shadow-[0_0_4px_rgba(239,68,68,0.8)]" aria-hidden="true" />
            <RpgSwords className="h-4 w-4 text-red-400 transition-transform duration-200 group-hover:scale-110 group-hover:text-red-300 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
            <span>{t.landing.duelAction}</span>
            <span className="text-[10px] text-red-400/70 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">⚔</span>
          </Link>
          <a
            href="#heroes-hall"
            onClick={() => playClickSound()}
            className="rpg-action-chip rpg-action-chip--hall group"
          >
            <span className="h-1 w-1 rotate-45 bg-amber-400/70 shadow-[0_0_4px_rgba(245,158,11,0.8)]" aria-hidden="true" />
            <span aria-hidden="true" className="text-amber-400 font-bold transition-transform duration-200 group-hover:translate-y-0.5 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]">↓</span>
            <span>{t.landing.hallAction}</span>
            <span className="h-1 w-1 rotate-45 bg-amber-400/70 shadow-[0_0_4px_rgba(245,158,11,0.8)]" aria-hidden="true" />
          </a>
        </nav>

        <InvokedProfilesCounter />

        <RPGDivider maxWidth={520} className="mt-3 opacity-70" />

        {showDemoPersonas && (
          <div className="mt-9 w-full space-y-6 border-t border-rpg-border/70 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <RpgShield className="w-5 h-5 text-amber-400" />
              <h2 className="font-sans font-bold text-sm sm:text-base text-slate-200 uppercase tracking-wider">
                {t.landing.personasTitle}
              </h2>
            </div>
            <Badge variant="common" size="sm">
              {t.common.demoDataDisclaimer}
            </Badge>
          </div>

          {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop (6 personas = 2 tidy rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                actionLabel={t.landing.summonPersona}
                onSelect={(user) => {
                  setUsername(user);
                  handleSummon(user);
                }}
              />
            ))}
          </div>
          </div>
        )}
      </div>
    </section>
  );
};
