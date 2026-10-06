"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Input,
  Button,
  Badge,
  RpgSearch,
  RpgSparkles,
  RpgSword,
  RpgShield,
  RpgAlert,
} from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { PersonaCard, PersonaItem } from "./PersonaCard";
import { fetchCharacter } from "@/data/api/fetchCharacter";

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
    return summary ? `Nv. ${summary.level} • ${summary.className}` : t.common.demoDataDisclaimer;
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
    const clean = targetUsername.trim().toLowerCase();
    if (!clean) {
      setErrorMessage(t.landing.emptyUsername);
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
    <div className="w-full flex flex-col items-center text-center space-y-12 py-12 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rpg-surface border border-rpg-goldDark text-amber-300 font-sans font-bold text-xs uppercase tracking-widest shadow-pixel">
        <RpgSparkles className="w-4 h-4 text-amber-400" />
        <span>{t.landing.badge}</span>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="font-pixel text-3xl sm:text-5xl lg:text-6xl text-rpg-gold tracking-wider drop-shadow-md">
          {t.landing.title}
        </h1>
        <p className="font-sans text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
          {t.landing.subtitle}
        </p>
      </div>

      {/* Search Input Box */}
      <div className="w-full max-w-xl">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 text-left">
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder={t.landing.searchPlaceholder}
                leftIcon={<RpgSearch className="w-4 h-4 text-amber-400" />}
                disabled={isLoading}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="sm:w-auto w-full whitespace-nowrap min-w-[170px]"
            >
              <RpgSword className="w-4 h-4 mr-2 inline" />
              {t.landing.searchButton}
            </Button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-red-950/90 border border-rpg-crimson text-slate-100 flex items-center gap-2.5 text-left text-xs sm:text-sm animate-fade-in font-sans"
            >
              <RpgAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* Personas Showcase */}
      {showDemoPersonas && (
        <div className="w-full space-y-6 pt-8 border-t border-rpg-border">
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
  );
};
