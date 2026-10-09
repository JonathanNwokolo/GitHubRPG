import React from "react";
import { clsx } from "clsx";

export type DuelVsBadgeSize = "sm" | "scoreboard" | "md" | "lg";

export interface DuelVsBadgeProps {
  size?: DuelVsBadgeSize;
  className?: string;
  ariaLabel?: string;
  showWings?: boolean;
}

/**
 * Dark Fantasy Duel Confrontation Medallion.
 * Features forged aged iron and antique gold relief, an obsidian core with duel embers,
 * authentic knightly crossed broadswords with fullers, quillons, leather grips and jeweled pommels,
 * and high-contrast, perfectly legible Roman/Gothic imperial "VS" typography.
 */
export function DuelVsBadge({
  size = "md",
  className,
  ariaLabel,
  showWings = false,
}: DuelVsBadgeProps) {
  const sizeClasses = {
    sm: "w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0",
    scoreboard: "w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0",
    md: "w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0",
    lg: "w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0",
  }[size];

  return (
    <div
      className={clsx("relative inline-flex items-center justify-center select-none", className)}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={!ariaLabel}
    >
      {/* Decorative runic wings for desktop confrontation layouts */}
      {showWings ? (
        <div className="hidden lg:flex items-center absolute -inset-x-10 pointer-events-none">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-600/40 to-amber-500/70" />
          <div className="w-20 sm:w-24" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-600/40 to-amber-500/70" />
        </div>
      ) : null}

      {/* Ornate Duel Medallion SVG */}
      <div
        className={clsx(
          "relative flex items-center justify-center transition-transform duration-200",
          sizeClasses
        )}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] filter hover:brightness-110 transition-[filter] duration-200"
          aria-hidden="true"
        >
          <defs>
            {/* Aged Gold Metallic Gradients */}
            <linearGradient id="dvs-gold-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <linearGradient id="dvs-gold-dark" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="45%" stopColor="#78350f" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Steel Runeblade Gradients */}
            <linearGradient id="dvs-steel-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <linearGradient id="dvs-steel-dark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Obsidian & Duel Ember Core */}
            <radialGradient id="dvs-core" cx="50%" cy="48%" r="52%">
              <stop offset="0%" stopColor="#4c0817" />
              <stop offset="35%" stopColor="#240712" />
              <stop offset="75%" stopColor="#0b0810" />
              <stop offset="100%" stopColor="#030205" />
            </radialGradient>

            {/* Ruby Pommel Gem */}
            <radialGradient id="dvs-ruby" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
          </defs>

          {/* ---------------- 1. CROSSED BROADSWORDS (HERALDIC PROPORTIONS) ---------------- */}
          {/* SWORD 1: Top-Left Blade to Bottom-Right Hilt */}
          <g>
            {/* Long Steel Blade: Tapered acute spear-point extending beyond medallion */}
            <polygon points="6,6 36,30 38,38 12,18" fill="url(#dvs-steel-light)" />
            <polygon points="6,6 12,18 18,12 30,36" fill="url(#dvs-steel-dark)" />
            <polygon points="6,6 10,7 7,10" fill="#ffffff" />
            {/* Central Fuller & Razor Edge Specular Line */}
            <line x1="6" y1="6" x2="45" y2="45" stroke="#ffffff" strokeWidth="0.8" opacity="0.95" />
            <line x1="6" y1="6" x2="36" y2="30" stroke="#ffffff" strokeWidth="1.2" opacity="0.9" />

            {/* Knightly Crossguard with Flared Quillons & Ruby Center (Lower section) */}
            <path
              d="M75,90 L90,75 L95,80 L80,95 Z"
              fill="url(#dvs-gold-light)"
              stroke="#451a03"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <circle cx="85" cy="85" r="2.2" fill="url(#dvs-ruby)" />
            <circle cx="76" cy="91" r="1.8" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.6" />
            <circle cx="91" cy="76" r="1.8" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.6" />

            {/* Leather Grip with Gold Wire Binding */}
            <line x1="88" y1="88" x2="106" y2="106" stroke="#1c1917" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="89" y1="89" x2="105" y2="105" stroke="url(#dvs-gold-dark)" strokeWidth="1.2" strokeDasharray="2 2.5" />

            {/* Heavy Octagonal Gold Pommel with Ruby Jewel */}
            <polygon
              points="107,100 114,107 107,114 100,107"
              fill="url(#dvs-gold-light)"
              stroke="#451a03"
              strokeWidth="1"
            />
            <circle cx="107" cy="107" r="2.4" fill="url(#dvs-ruby)" />
          </g>

          {/* SWORD 2: Top-Right Blade to Bottom-Left Hilt */}
          <g>
            {/* Long Steel Blade: Tapered acute spear-point extending beyond medallion */}
            <polygon points="114,6 84,30 82,38 108,18" fill="url(#dvs-steel-light)" />
            <polygon points="114,6 108,18 102,12 90,36" fill="url(#dvs-steel-dark)" />
            <polygon points="114,6 110,7 113,10" fill="#ffffff" />
            {/* Central Fuller & Razor Edge Specular Line */}
            <line x1="114" y1="6" x2="75" y2="45" stroke="#ffffff" strokeWidth="0.8" opacity="0.95" />
            <line x1="114" y1="6" x2="84" y2="30" stroke="#ffffff" strokeWidth="1.2" opacity="0.9" />

            {/* Knightly Crossguard with Flared Quillons & Ruby Center */}
            <path
              d="M45,90 L30,75 L25,80 L40,95 Z"
              fill="url(#dvs-gold-light)"
              stroke="#451a03"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <circle cx="35" cy="85" r="2.2" fill="url(#dvs-ruby)" />
            <circle cx="44" cy="91" r="1.8" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.6" />
            <circle cx="29" cy="76" r="1.8" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.6" />

            {/* Leather Grip with Gold Wire Binding */}
            <line x1="32" y1="88" x2="14" y2="106" stroke="#1c1917" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="31" y1="89" x2="15" y2="105" stroke="url(#dvs-gold-dark)" strokeWidth="1.2" strokeDasharray="2 2.5" />

            {/* Heavy Octagonal Gold Pommel with Ruby Jewel */}
            <polygon
              points="13,100 20,107 13,114 6,107"
              fill="url(#dvs-gold-light)"
              stroke="#451a03"
              strokeWidth="1"
            />
            <circle cx="13" cy="107" r="2.4" fill="url(#dvs-ruby)" />
          </g>

          {/* ---------------- 2. FORGED IRON & AGED GOLD MEDALLION CHASSIS ---------------- */}
          {/* Heavy Forged Iron Rim with 4 Cardinal Battle Spurs */}
          <path
            d="M60 17 L76 24 L89 37 L96 49 L103 60 L96 71 L89 83 L76 96 L60 103 L44 96 L31 83 L24 71 L17 60 L24 49 L31 37 L44 24 Z"
            fill="#120f18"
            stroke="url(#dvs-gold-dark)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Stepped Aged Gold Bevel Ring with Obsidian Core */}
          <path
            d="M60 22 L73 28 L84 39 L91 49 L98 60 L91 71 L84 81 L73 92 L60 98 L47 92 L36 81 L29 71 L22 60 L29 49 L36 39 L47 28 Z"
            fill="url(#dvs-core)"
            stroke="url(#dvs-gold-light)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Inner Decorative Runic Rim */}
          <circle
            cx="60"
            cy="60"
            r="32"
            stroke="url(#dvs-gold-dark)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.8"
          />

          {/* 4 Cardinal Aged-Gold Rivets / Bosses */}
          <circle cx="60" cy="26" r="2.2" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.8" />
          <circle cx="94" cy="60" r="2.2" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.8" />
          <circle cx="60" cy="94" r="2.2" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.8" />
          <circle cx="26" cy="60" r="2.2" fill="url(#dvs-gold-light)" stroke="#451a03" strokeWidth="0.8" />

          {/* ---------------- 3. HEROIC "VS" CONFRONTATION TYPOGRAPHY ---------------- */}
          {/* Deep Extrusion Drop Shadows */}
          <text
            x="60"
            y="69.5"
            textAnchor="middle"
            fontFamily="'Cinzel', 'Trajan Pro', 'Georgia', 'Times New Roman', serif"
            fontWeight="900"
            fontSize="27"
            letterSpacing="3"
            fill="#000000"
            opacity="0.95"
            transform="translate(0, 2)"
          >
            VS
          </text>

          {/* Main Chiseled Gold Face with Antique Stroke */}
          <text
            x="60"
            y="69.5"
            textAnchor="middle"
            fontFamily="'Cinzel', 'Trajan Pro', 'Georgia', 'Times New Roman', serif"
            fontWeight="900"
            fontSize="27"
            letterSpacing="3"
            fill="url(#dvs-gold-light)"
            stroke="#451a03"
            strokeWidth="0.9"
          >
            VS
          </text>
        </svg>
      </div>
    </div>
  );
}

export const DuelVsMedallion = DuelVsBadge;
