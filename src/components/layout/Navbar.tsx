"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RpgVolumeOn,
  RpgVolumeOff,
  RpgSparkles,
} from "@/design-system";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // /design-system is a development page: reachable by URL, deliberately not linked here.
  const navLinks = [
    { href: "/", label: t.nav.home, active: pathname === "/" },
    { href: pathname === "/" ? "#heroes-hall" : "/#heroes-hall", label: t.nav.hall, active: false },
    { href: "/duel", label: t.nav.duel, active: pathname.startsWith("/duel") },
    { href: "/settings", label: t.nav.settings, active: pathname === "/settings" },
  ];

  const languageSelector = (compact = false) => (
    <div className="flex items-center border border-[#5b4528] bg-black/35 p-0.5" aria-label={t.nav.language}>
      {(["pt-BR", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLanguage(value)}
          className={`min-h-9 min-w-10 px-2 font-sans text-xs font-bold transition-colors ${
            language === value
              ? "bg-rpg-goldDark text-slate-950"
              : "text-slate-300 hover:bg-rpg-surface hover:text-white"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold ${compact ? "sm:min-h-10" : ""}`}
          aria-label={value === "pt-BR" ? t.nav.portuguese : t.nav.english}
          aria-pressed={language === value}
        >
          {value === "pt-BR" ? "PT" : "EN"}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#5b4528] bg-[#0b0b0f]/95 shadow-[0_8px_28px_rgba(0,0,0,0.42)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
        >
          <Image
            src="/logo-personagem.png"
            alt=""
            aria-hidden
            width={88}
            height={88}
            priority
            className="h-14 w-14 object-contain pixelated transition-transform group-hover:scale-105 sm:h-[72px] sm:w-[72px]"
          />
          <div className="flex flex-col">
            <span className="font-pixel text-[11px] tracking-wider text-rpg-gold transition-colors group-hover:text-rpg-goldLight sm:text-sm">
              GitHub RPG
            </span>
            <span className="font-sans text-[10px] text-rpg-parchmentMuted hidden sm:inline">
              {t.nav.tagline}
            </span>
          </div>
        </Link>

        {/* Navigation & Controls */}
        <div className="hidden items-center gap-3 lg:flex">
          <nav className="flex items-center gap-1" aria-label={t.nav.mainNavigation}>
            {navLinks.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`min-h-11 border px-3 py-3 font-sans text-xs font-bold uppercase tracking-wider transition-colors ${
                    link.active
                      ? "text-rpg-gold border-rpg-goldDark bg-rpg-surface"
                      : "text-slate-300 border-transparent hover:text-white hover:bg-rpg-surface/60"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-6 w-px bg-[#5b4528]" />

          {/* Demo Data indicator */}
          {isDemo && (
            <Badge variant="common" size="sm" className="hidden sm:inline-flex gap-1.5" title={t.common.demoDataTooltip}>
              <RpgSparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.common.demoDataDisclaimer}</span>
            </Badge>
          )}

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? t.nav.audioOff : t.nav.audioOn}
            title={audioEnabled ? t.settings.soundOn : t.settings.soundOff}
            className="min-h-11 min-w-11 border border-rpg-border bg-rpg-surface p-2 text-slate-200 transition-colors hover:border-rpg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
          >
            {audioEnabled ? (
              <RpgVolumeOn className="w-4 h-4 text-amber-400" />
            ) : (
              <RpgVolumeOff className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {languageSelector()}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="hidden min-[430px]:block">{languageSelector(true)}</div>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMobileOpen((open) => !open)}
            className="grid min-h-11 min-w-11 place-items-center border border-[#5b4528] bg-rpg-surface text-rpg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
          >
            <span aria-hidden="true" className="flex w-5 flex-col gap-1.5">
              <span className={`h-px w-full bg-current transition-transform ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-px w-full bg-current transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`h-px w-full bg-current transition-transform ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-navigation" className="border-t border-[#3f3222] bg-[#0b0b0f] px-4 pb-4 pt-3 lg:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2" aria-label={t.nav.mainNavigation}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-11 items-center justify-center border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold ${
                  link.active ? "border-rpg-goldDark bg-rpg-surface text-rpg-gold" : "border-rpg-border text-slate-200"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 border-t border-rpg-border pt-3">
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? t.nav.audioOff : t.nav.audioOn}
              className="inline-flex min-h-11 items-center gap-2 border border-rpg-border bg-rpg-surface px-3 text-xs font-bold text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold"
            >
              {audioEnabled ? <RpgVolumeOn className="h-4 w-4 text-amber-400" /> : <RpgVolumeOff className="h-4 w-4" />}
              <span>{audioEnabled ? t.settings.soundOn : t.settings.soundOff}</span>
            </button>
            <div className="min-[430px]:hidden">{languageSelector(true)}</div>
            {isDemo ? <Badge variant="common" size="sm" className="hidden sm:inline-flex">{t.common.demoDataDisclaimer}</Badge> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
};
