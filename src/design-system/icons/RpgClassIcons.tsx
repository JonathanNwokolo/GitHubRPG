import React from "react";
import type { ClassName } from "@/game/types";
import type { RpgIconProps } from "./RpgIcons";

const baseProps = (props: RpgIconProps) => ({
  viewBox: "0 0 24 24",
  width: props.size || "100%",
  height: props.size || "100%",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true" as const,
  ...props,
});

/**
 * 1. Mago (Wizard - JavaScript / TypeScript)
 * Arcane staff with chiseled crystal orb and orbiting curly syntax brackets { }.
 */
export const RpgIconMago: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Staff pole with chiseled edge */}
    <path d="M12 7V22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M11 9V20" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
    {/* Floating Arcane Gem Core */}
    <polygon points="12,2 14.5,5.5 12,9 9.5,5.5" fill="currentColor" />
    <polygon points="12,2 14.5,5.5 12,9" fill="#fff" opacity="0.4" />
    {/* Left Arcane Syntax Bracket { */}
    <path
      d="M7 3C5.5 3 5 4 5 5V6.5C5 7.5 4 8 3 8C4 8 5 8.5 5 9.5V11C5 12 5.5 13 7 13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    {/* Right Arcane Syntax Bracket } */}
    <path
      d="M17 3C18.5 3 19 4 19 5V6.5C19 7.5 20 8 21 8C20 8 19 8.5 19 9.5V11C19 12 18.5 13 17 13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    {/* Orbital rings */}
    <ellipse cx="12" cy="6" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
  </svg>
);

/**
 * 2. Alquimista (Alchemist - Python)
 * Transmutation alembic flask wrapped by an ouroboros serpentine rune.
 */
export const RpgIconAlquimista: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Flask Neck & Lip */}
    <rect x="9.5" y="2" width="5" height="2" rx="0.5" fill="currentColor" />
    <path d="M10.5 4V8.5L5.5 18C4.5 19.8 5.8 22 7.8 22H16.2C18.2 22 19.5 19.8 18.5 18L13.5 8.5V4H10.5Z" stroke="currentColor" strokeWidth="1.8" />
    {/* Bubbling Elixir volume */}
    <path d="M6.8 16.5L6 18C5.5 19 6.2 20.5 7.5 20.5H16.5C17.8 20.5 18.5 19 18 18L17.2 16.5C15 17.5 9 17.5 6.8 16.5Z" fill="currentColor" opacity="0.6" />
    {/* Serpentine Ouroboros head & eye */}
    <path d="M8 12C9 10 13 9 15 11C17 13 16 16 13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="18.5" r="1.2" fill="#fff" opacity="0.8" />
    <circle cx="9.5" cy="15.5" r="0.8" fill="#fff" opacity="0.7" />
  </svg>
);

/**
 * 3. Guerreiro (Warrior - Rust / C / C++)
 * Heavy broadsword with chiseled fuller and gear-guard of metal & memory.
 */
export const RpgIconGuerreiro: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Blade Left Face (Shaded) */}
    <polygon points="12,1 8.5,14 12,14" fill="currentColor" opacity="0.65" />
    {/* Blade Right Face (Light) */}
    <polygon points="12,1 15.5,14 12,14" fill="currentColor" />
    {/* Central Fuller specular highlight */}
    <line x1="12" y1="2" x2="12" y2="13" stroke="#fff" strokeWidth="1" opacity="0.7" />
    {/* Gear-guard crossguard */}
    <rect x="4" y="14" width="16" height="3" rx="1" fill="currentColor" />
    <circle cx="12" cy="15.5" r="1.5" fill="#08090d" />
    {/* Grip & Heavy Pommel */}
    <rect x="10.5" y="17" width="3" height="4" fill="currentColor" opacity="0.8" />
    <circle cx="12" cy="22" r="1.8" fill="currentColor" />
  </svg>
);

/**
 * 4. Patrulheiro (Ranger - Go)
 * Composite recurve bow with twin parallel concurrency arrow paths.
 */
export const RpgIconPatrulheiro: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Bow Limbs */}
    <path
      d="M6 3C11 5 13 8 13 12C13 16 11 19 6 21"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Bowstring */}
    <line x1="6" y1="3" x2="6" y2="21" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.6" />
    {/* Primary Arrow */}
    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <polygon points="21,12 17,9.5 17.8,12 17,14.5" fill="currentColor" />
    {/* Parallel Arrow Channel (Goroutines) */}
    <line x1="8" y1="8.5" x2="18" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <polygon points="19,8.5 16,6.5 16.5,8.5 16,10.5" fill="currentColor" opacity="0.6" />
  </svg>
);

/**
 * 5. Paladino (Paladin - Java / C#)
 * Heavy knight tower shield embossed with strict silver architectural cross.
 */
export const RpgIconPaladino: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Shield Outer Body */}
    <path
      d="M4 3H20V12C20 17.5 12 22 12 22C12 22 4 17.5 4 12V3Z"
      fill="currentColor"
      opacity="0.25"
    />
    <path
      d="M4 3H20V12C20 17.5 12 22 12 22C12 22 4 17.5 4 12V3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Heraldic Cross (Strict Contracts) */}
    <rect x="10.5" y="5" width="3" height="13" rx="0.5" fill="currentColor" />
    <rect x="6" y="8" width="12" height="3" rx="0.5" fill="currentColor" />
    {/* Specular rim */}
    <path d="M5 4.5H19" stroke="#fff" strokeWidth="1" opacity="0.4" />
  </svg>
);

/**
 * 6. Bardo (Bard - HTML / CSS)
 * Visual prism lute radiating spectrum waves of layout and aesthetics.
 */
export const RpgIconBardo: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Lute Body */}
    <ellipse cx="9" cy="15" rx="6" ry="6" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="9" cy="15" rx="3.5" ry="3.5" fill="currentColor" opacity="0.3" />
    {/* Lute Neck */}
    <path d="M13.5 10.5L20 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Pegbox */}
    <circle cx="20" cy="4" r="1.5" fill="currentColor" />
    {/* Harmonic Spectrum Waves */}
    <path d="M14 14C16 12 18 13 20 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <path d="M16 17C18 15 20 16 22 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    {/* Strings */}
    <line x1="8" y1="18" x2="19" y2="5" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

/**
 * 7. Ladino (Rogue - Shell / Bash / PowerShell)
 * Curved damascus trench dagger etched with terminal prompt glyph >_.
 */
export const RpgIconLadino: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Curved Dagger Blade */}
    <path
      d="M19 2C15 3 9 7 6 12L10 16C15 13 19 7 20 3L19 2Z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M19 2C15 3 9 7 6 12L10 16C15 13 19 7 20 3L19 2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Terminal prompt symbol etched into blade > */}
    <path d="M12 7L14.5 9L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="12" x2="16.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Guard & Grip */}
    <line x1="4.5" y1="10.5" x2="11.5" y2="17.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="7" y1="15" x2="3" y2="19" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="2" cy="20" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * 8. Oráculo (Oracle - Ruby)
 * Scrying silver mirror bearing a faceted Ruby crystal with prophesied runes.
 */
export const RpgIconOraculo: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Mirror Frame */}
    <circle cx="12" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M12 19V23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M9 22H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Faceted Ruby Gemstone */}
    <polygon points="12,5.5 15.5,8 15.5,12 12,15 8.5,12 8.5,8" fill="currentColor" />
    <polygon points="12,5.5 15.5,8 12,10 8.5,8" fill="#fff" opacity="0.4" />
    <polygon points="12,10 15.5,12 12,15 8.5,12" fill="#08090d" opacity="0.3" />
  </svg>
);

/**
 * 9. Escriba (Scribe - PHP)
 * Steel feather quill dipped into an octagonal inkwell of enduring web records.
 */
export const RpgIconEscriba: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Feather Quill */}
    <path
      d="M20 3C16 3.5 11 7 8 13L10 15C15 12 19 8 20 3Z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M20 3C16 3.5 11 7 8 13L10 15C15 12 19 8 20 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {/* Shaft to ink */}
    <line x1="8" y1="13" x2="6" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    {/* Octagonal Inkwell */}
    <path
      d="M3 18L5 16H11L13 18V21L11 23H5L3 21V18Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="currentColor"
      opacity="0.2"
    />
    <line x1="5" y1="19" x2="11" y2="19" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/**
 * 10. Sentinela (Sentinel - Kotlin / Swift)
 * Great horned helm with illuminated widescreen visor of mobile domains.
 */
export const RpgIconSentinela: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Helm Dome */}
    <path
      d="M5 9C5 5.5 8 3 12 3C16 3 19 5.5 19 9V17C19 19 17 21 12 21C7 21 5 19 5 17V9Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.15"
    />
    {/* Chiseled crest horn */}
    <path d="M12 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Screen Visor Slot (Mobile device viewport aspect) */}
    <rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor" />
    <rect x="8.5" y="11" width="7" height="2" fill="#fff" opacity="0.6" />
    {/* Jaw guard slits */}
    <line x1="10" y1="16.5" x2="14" y2="16.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="11" y1="18.5" x2="13" y2="18.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/**
 * 11. Tecelão (Weaver - Dart / Flutter)
 * Magic loom shuttle intertwining multiplatform threads of dynamic light.
 */
export const RpgIconTecelao: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Loom Shuttle Body */}
    <path
      d="M3 12C7 8 17 8 21 12C17 16 7 16 3 12Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.25"
    />
    {/* Bobbin opening */}
    <ellipse cx="12" cy="12" rx="3.5" ry="1.8" fill="currentColor" />
    {/* Intertwined Cross Threads */}
    <path d="M6 5C10 7 14 17 18 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 19C10 17 14 7 18 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    {/* Spindle point highlights */}
    <circle cx="3" cy="12" r="1.2" fill="#fff" opacity="0.7" />
    <circle cx="21" cy="12" r="1.2" fill="#fff" opacity="0.7" />
  </svg>
);

/**
 * 12. Aventureiro (Adventurer - Polyglot / General)
 * Traveler's navigational compass crossed with an adventurer's short blade.
 */
export const RpgIconAventureiro: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Compass Dial Outer */}
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
    {/* Cardinal ticks */}
    <line x1="12" y1="3.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.8" />
    <line x1="12" y1="18.5" x2="12" y2="20.5" stroke="currentColor" strokeWidth="1.8" />
    <line x1="3.5" y1="12" x2="5.5" y2="12" stroke="currentColor" strokeWidth="1.8" />
    <line x1="18.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="1.8" />
    {/* Chiseled Compass Needle (Diamond Cut) */}
    <polygon points="12,6 14.5,12 12,12" fill="currentColor" />
    <polygon points="12,6 9.5,12 12,12" fill="#fff" opacity="0.5" />
    <polygon points="12,18 9.5,12 12,12" fill="currentColor" opacity="0.7" />
    <polygon points="12,18 14.5,12 12,12" fill="#08090d" opacity="0.3" />
    <circle cx="12" cy="12" r="1.5" fill="#fff" />
  </svg>
);

/**
 * Helper component: Dynamically render class insignia by ClassName string.
 */
export const RpgClassIcon: React.FC<{
  classNameType: ClassName;
  size?: number | string;
  className?: string;
}> = ({ classNameType, size, className }) => {
  switch (classNameType) {
    case "Mago":
      return <RpgIconMago size={size} className={className} />;
    case "Alquimista":
      return <RpgIconAlquimista size={size} className={className} />;
    case "Guerreiro":
      return <RpgIconGuerreiro size={size} className={className} />;
    case "Patrulheiro":
      return <RpgIconPatrulheiro size={size} className={className} />;
    case "Paladino":
      return <RpgIconPaladino size={size} className={className} />;
    case "Bardo":
      return <RpgIconBardo size={size} className={className} />;
    case "Ladino":
      return <RpgIconLadino size={size} className={className} />;
    case "Oráculo":
      return <RpgIconOraculo size={size} className={className} />;
    case "Escriba":
      return <RpgIconEscriba size={size} className={className} />;
    case "Sentinela":
      return <RpgIconSentinela size={size} className={className} />;
    case "Tecelão":
      return <RpgIconTecelao size={size} className={className} />;
    case "Aventureiro":
    default:
      return <RpgIconAventureiro size={size} className={className} />;
  }
};
