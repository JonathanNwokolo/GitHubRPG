"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelVolumeOn, PixelVolumeOff, PixelShield, PixelSparkles } from "@/design-system";
import { useUiStore } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { Badge } from "@/design-system/components/Badge";

interface NavbarProps {
  /** True when the server is configured with the mock data source. Decided on the server. */
  isDemo: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isDemo }) => {
  const pathname = usePathname();
  const { language, audioEnabled, setLanguage, toggleAudio } = useUiStore();
  const t = getTranslation(language);

  const navLinks = [
    { href: "/settings", label: t.nav.settings },
    { href: "/design-system", label: t.nav.designSystem },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-rpg-obsidian/95 border-b-2 border-rpg-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold p-1"
        >
          <div className="w-8 h-8 bg-rpg-surface border border-rpg-goldDark flex items-center justify-center text-rpg-gold group-hover:scale-105 transition-transform shadow-pixel">
            <PixelShield className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="font-pixel text-xs sm:text-sm text-rpg-gold tracking-wider group-hover:text-rpg-goldLight transition-colors">
              GitHub RPG
            </span>
            <span className="font-sans text-[10px] text-rpg-parchmentMuted hidden sm:inline">
              Ficha Rúnica de Herói
            </span>
          </div>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação Principal">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-sans font-bold text-xs sm:text-sm uppercase tracking-wider px-3.5 py-2 transition-colors border ${
                    isActive
                      ? "text-rpg-gold border-rpg-goldDark bg-rpg-surface"
                      : "text-slate-300 border-transparent hover:text-white hover:bg-rpg-surface/60"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-5 w-[1px] bg-rpg-border hidden md:block" />

          {/* Demo Data indicator */}
          {isDemo && (
            <Badge variant="common" size="sm" className="hidden sm:inline-flex gap-1.5" title={t.common.demoDataTooltip}>
              <PixelSparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.common.demoDataDisclaimer}</span>
            </Badge>
          )}

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
            title={audioEnabled ? t.settings.soundOn : t.settings.soundOff}
            className="p-2 border border-rpg-border bg-rpg-surface hover:border-rpg-gold text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
          >
            {audioEnabled ? (
              <PixelVolumeOn className="w-4 h-4 text-amber-400" />
            ) : (
              <PixelVolumeOff className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Language selector */}
          <div className="flex items-center border border-rpg-border bg-rpg-surface p-0.5">
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`font-sans font-bold text-xs px-2.5 py-1 transition-colors ${
                language === "pt-BR"
                  ? "bg-rpg-goldDark text-slate-950 font-extrabold"
                  : "text-slate-400 hover:text-white"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
              aria-label="Mudar para Português"
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`font-sans font-bold text-xs px-2.5 py-1 transition-colors ${
                language === "en"
                  ? "bg-rpg-goldDark text-slate-950 font-extrabold"
                  : "text-slate-400 hover:text-white"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
              aria-label="Switch to English"
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
