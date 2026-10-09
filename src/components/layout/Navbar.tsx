"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RpgVolumeOn,
  RpgVolumeOff,
  RpgSparkles,
  RpgCompass,
  RpgCastle,
  RpgSwords,
  RpgSettings,
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
    { href: "/", label: t.nav.home, active: pathname === "/", icon: RpgCompass },
    { href: pathname === "/" ? "#heroes-hall" : "/#heroes-hall", label: t.nav.hall, active: false, icon: RpgCastle },
    { href: "/duel", label: t.nav.duel, active: pathname.startsWith("/duel"), icon: RpgSwords },
    { href: "/settings", label: t.nav.settings, active: pathname === "/settings", icon: RpgSettings },
  ];

  const languageSelector = (compact = false) => (
    <div
      className={`flex items-center ${compact ? "h-9" : "h-[38px]"} p-0.5 rounded-sm border border-[#4a3924] bg-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]`}
      role="group"
      aria-label={t.nav.language}
    >
      {(["pt-BR", "en"] as const).map((value) => {
        const isSelected = language === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            className={`h-full min-w-[34px] px-2 font-sans text-xs font-bold transition-all duration-150 rounded-[2px] ${
              isSelected
                ? "bg-gradient-to-b from-[#d97706] to-[#92400e] text-slate-950 font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_3px_rgba(0,0,0,0.5)] border border-amber-300/60"
                : "text-slate-400 hover:text-amber-100 hover:bg-[#1c2030]/60"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void`}
            aria-label={value === "pt-BR" ? t.nav.portuguese : t.nav.english}
            aria-pressed={isSelected}
          >
            {value === "pt-BR" ? "PT" : "EN"}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#3d2f1d] bg-gradient-to-b from-[#13151f]/98 via-[#0c0d13]/98 to-[#07080c]/98 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
      {/* Subtle Gold Rim Gradient along the bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#b45309]/60 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      {/* Corner / End Decorative Diamond Pips */}
      <span
        className="absolute -bottom-[2px] left-3 sm:left-6 w-1 h-1 rotate-45 bg-amber-500/70 pointer-events-none shadow-[0_0_4px_rgba(245,158,11,0.5)]"
        aria-hidden="true"
      />
      <span
        className="absolute -bottom-[2px] right-3 sm:right-6 w-1 h-1 rotate-45 bg-amber-500/70 pointer-events-none shadow-[0_0_4px_rgba(245,158,11,0.5)]"
        aria-hidden="true"
      />

      <div className="mx-auto flex h-16 sm:h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo / Brand - Crest & Title Lockup */}
        <Link
          href="/"
          className="group relative flex items-center gap-2.5 p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-2 focus-visible:ring-offset-rpg-void"
          aria-label="GitHub RPG"
        >
          {/* Crest / Brasão */}
          <div className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 shrink-0">
            <Image
              src="/logo-personagem.png"
              alt=""
              aria-hidden
              width={88}
              height={88}
              priority
              className="h-8 w-8 sm:h-9 sm:w-9 object-contain pixelated transition-transform duration-200 group-hover:scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Subtle Vertical Ornament / Golden Divider */}
          <div
            className="hidden sm:block h-7 w-px bg-gradient-to-b from-transparent via-[#7a5b32] to-transparent shrink-0 mx-0.5"
            aria-hidden="true"
          />

          {/* Title & Tagline */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[11px] sm:text-xs tracking-wider text-rpg-gold transition-colors duration-200 group-hover:text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                GitHub RPG
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rotate-45 bg-amber-400/60 group-hover:bg-amber-300 transition-colors" aria-hidden="true" />
            </div>
            <span className="font-sans text-[10px] tracking-wide text-rpg-parchmentMuted hidden sm:inline transition-colors duration-200 group-hover:text-amber-100/90 font-medium">
              {t.nav.tagline}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation & Controls */}
        <div className="hidden items-center gap-2.5 xl:gap-3.5 lg:flex">
          {/* RPG Nav Tabs Track */}
          <nav
            className="flex items-center p-0.5 rounded-sm bg-black/45 border border-[#3b2f21]/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] gap-1"
            aria-label={t.nav.mainNavigation}
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={`group relative flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 font-sans text-xs font-bold uppercase tracking-wider transition-all duration-150 rounded-sm min-h-[38px] ${
                    link.active
                      ? "bg-gradient-to-b from-amber-500/20 via-[#1c2030] to-[#121520] text-amber-300 border border-amber-500/80 shadow-[inset_0_1px_0_rgba(251,191,36,0.35),0_2px_6px_rgba(0,0,0,0.5)] font-extrabold"
                      : "bg-[#10131d]/60 text-slate-300 border border-transparent hover:text-white hover:bg-[#181d2c] hover:border-amber-600/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void`}
                >
                  {/* Subtle active golden bottom tab notch */}
                  {link.active && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  {/* Micro-icon */}
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      link.active ? "text-amber-400" : "text-slate-400 group-hover:text-amber-300"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Ornamental Group Divider */}
          <div className="relative flex items-center justify-center h-6 px-1" aria-hidden="true">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-[#634b2c] to-transparent" />
            <span className="absolute w-1 h-1 rotate-45 bg-[#8b6534] border border-[#2b1b0b]" />
          </div>

          {/* Demo Data indicator */}
          {isDemo && (
            <Badge variant="common" size="sm" className="hidden sm:inline-flex gap-1.5" title={t.common.demoDataTooltip}>
              <RpgSparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.common.demoDataDisclaimer}</span>
            </Badge>
          )}

          {/* Right Controls: Sound & Language Cluster */}
          <div className="flex items-center gap-1.5">
            {/* Audio toggle */}
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? t.nav.audioOff : t.nav.audioOn}
              title={audioEnabled ? t.settings.soundOn : t.settings.soundOff}
              className={`group relative flex items-center justify-center h-[38px] w-[38px] rounded-sm border transition-all duration-150 ${
                audioEnabled
                  ? "border-[#78572b] bg-gradient-to-b from-[#1f2233] to-[#11131c] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.4)] hover:border-rpg-gold hover:shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                  : "border-[#3d2f1f] bg-[#0f1118] text-slate-500 hover:text-slate-300 hover:border-[#634b2c]"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void active:translate-y-[1px]`}
            >
              {audioEnabled ? (
                <>
                  <RpgVolumeOn className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)] transition-transform duration-150 group-hover:scale-110" />
                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_4px_#fbbf24]" aria-hidden="true" />
                </>
              ) : (
                <RpgVolumeOff className="w-4 h-4 text-slate-500 transition-transform duration-150 group-hover:scale-110" />
              )}
            </button>

            {/* Segmented language selector */}
            {languageSelector()}
          </div>
        </div>

        {/* Mobile / Tablet Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="hidden min-[430px]:block">{languageSelector(true)}</div>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-[38px] w-[38px] place-items-center rounded-sm border border-[#5b4528] bg-gradient-to-b from-[#191c28] to-[#0f1118] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.4)] hover:border-rpg-gold hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void active:translate-y-[1px] transition-all duration-150"
          >
            <span aria-hidden="true" className="flex w-4 flex-col gap-1.5">
              <span
                className={`h-[2px] w-full bg-current transition-transform duration-200 ${
                  mobileOpen ? "translate-y-[5px] rotate-45 bg-amber-300" : ""
                }`}
              />
              <span
                className={`h-[2px] w-full bg-current transition-opacity duration-150 ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-[2px] w-full bg-current transition-transform duration-200 ${
                  mobileOpen ? "-translate-y-[5px] -rotate-45 bg-amber-300" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="relative border-t border-[#4a3924] bg-gradient-to-b from-[#13151f] via-[#0d0e14] to-[#07080b] px-4 pb-4 pt-3 lg:hidden shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
        >
          {/* Subtle top gold accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2" aria-label={t.nav.mainNavigation}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={link.active ? "page" : undefined}
                  className={`group relative flex min-h-[42px] items-center justify-center gap-2 border px-3 py-2 text-center text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-all duration-150 ${
                    link.active
                      ? "border-amber-500/80 bg-gradient-to-b from-amber-500/20 via-[#1c2030] to-[#121520] text-amber-300 font-extrabold shadow-[inset_0_1px_0_rgba(251,191,36,0.3)]"
                      : "border-[#3b2f21] bg-[#121520]/80 text-slate-300 hover:text-white hover:border-amber-600/50 hover:bg-[#181d2c]"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      link.active ? "text-amber-400" : "text-slate-400 group-hover:text-amber-300"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 border-t border-[#3b2f21]/70 pt-3">
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? t.nav.audioOff : t.nav.audioOn}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-sm border px-3 text-xs font-sans font-bold transition-all duration-150 ${
                audioEnabled
                  ? "border-[#78572b] bg-gradient-to-b from-[#1f2233] to-[#11131c] text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-[#3d2f1f] bg-[#0f1118] text-slate-400 hover:text-slate-200"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold focus-visible:ring-offset-1 focus-visible:ring-offset-rpg-void`}
            >
              {audioEnabled ? (
                <RpgVolumeOn className="h-4 w-4 text-amber-400" />
              ) : (
                <RpgVolumeOff className="h-4 w-4 text-slate-500" />
              )}
              <span>{audioEnabled ? t.settings.soundOn : t.settings.soundOff}</span>
            </button>

            <div className="min-[430px]:hidden">{languageSelector(true)}</div>

            {isDemo && (
              <Badge variant="common" size="sm" className="hidden sm:inline-flex">
                {t.common.demoDataDisclaimer}
              </Badge>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
