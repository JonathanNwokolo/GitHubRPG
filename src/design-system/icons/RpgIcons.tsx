import React from "react";

export interface RpgIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

const baseProps = (props: RpgIconProps) => ({
  viewBox: "0 0 24 24",
  width: props.size || "1em",
  height: props.size || "1em",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": "true" as const,
  ...props,
});

/**
 * ============================================================================
 * CHISELED PSEUDO-3D FANTASY RPG ICONS (24x24 Vector Base)
 * ============================================================================
 * Designed for Dark Fantasy Game UI.
 * Features chiseled facets, dual-tone lighting (zenith 45° key light),
 * specular rim strokes, and high-contrast silhouettes.
 */

// 1. Single Sword (Chiseled Runeblade)
export const RpgSword: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Left Face (Shaded) */}
    <polygon points="19,5 7,17 10,17 19,8" fill="currentColor" opacity="0.6" />
    {/* Right Face (Light) */}
    <polygon points="19,5 20,6 8,18 7,17" fill="currentColor" />
    {/* Blade Point & Fuller */}
    <polygon points="21,3 17,7 20,7" fill="currentColor" />
    <line x1="20" y1="4" x2="8" y2="16" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
    {/* Crossguard */}
    <path d="M5 14L10 19L9 20L4 15Z" fill="currentColor" />
    {/* Grip & Gem Pommel */}
    <line x1="6" y1="17" x2="3" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="2.5" cy="21.5" r="1.5" fill="currentColor" />
  </svg>
);

// 2. Crossed Swords (Duel & Combat)
export const RpgSwords: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Blade 1 (Top Left to Bottom Right) */}
    <path d="M21 3L18 3L4 17L7 20L21 6V3Z" fill="currentColor" opacity="0.4" />
    <line x1="20" y1="4" x2="6" y2="18" stroke="#fff" strokeWidth="1" opacity="0.7" />
    <line x1="4" y1="18" x2="2" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    {/* Blade 2 (Top Right to Bottom Left) */}
    <path d="M3 3L6 3L20 17L17 20L3 6V3Z" fill="currentColor" />
    <line x1="4" y1="4" x2="18" y2="18" stroke="#fff" strokeWidth="1" opacity="0.7" />
    <line x1="20" y1="18" x2="22" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    {/* Crossguards */}
    <line x1="7" y1="15" x2="3" y2="19" stroke="currentColor" strokeWidth="2" />
    <line x1="17" y1="15" x2="21" y2="19" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// 3. Shield (Heraldic Crest)
export const RpgShield: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Shield Outer Rim */}
    <path
      d="M4 3H20V12C20 17.5 12 22 12 22C12 22 4 17.5 4 12V3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Left Shaded Half */}
    <path
      d="M5 4.5H12V20.5C7 17 5 13 5 12V4.5Z"
      fill="currentColor"
      opacity="0.25"
    />
    {/* Right Luminous Half */}
    <path
      d="M12 4.5H19V12C19 13 17 17 12 20.5V4.5Z"
      fill="currentColor"
      opacity="0.5"
    />
    {/* Central Runic Boss */}
    <polygon points="12,7 15,11 12,15 9,11" fill="currentColor" />
    <line x1="12" y1="4" x2="12" y2="21" stroke="#fff" strokeWidth="1" opacity="0.4" />
  </svg>
);

// 4. Shield with Check
export const RpgShieldCheck: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path
      d="M4 3H20V12C20 17.5 12 22 12 22C12 22 4 17.5 4 12V3Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M8.5 11.5L11 14L16 9"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M5 4.5H19" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

// 5. Shield with Alert
export const RpgShieldAlert: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path
      d="M4 3H20V12C20 17.5 12 22 12 22C12 22 4 17.5 4 12V3Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.2" fill="currentColor" />
  </svg>
);

// 6. Tome (Grimoire of Experience)
export const RpgTome: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Spine & Pages Outer */}
    <path
      d="M3 5C5.5 4 9 4 12 5.5C15 4 18.5 4 21 5V19C18.5 18 15 18 12 19.5C9 18 5.5 18 3 19V5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Left Page (Shaded) */}
    <path
      d="M4 6C6.5 5 9.5 5 12 6.2V18.2C9.5 17 6.5 17 4 18V6Z"
      fill="currentColor"
      opacity="0.3"
    />
    {/* Right Page (Luminous) */}
    <path
      d="M12 6.2C14.5 5 17.5 5 20 6V18C17.5 17 14.5 17 12 18.2V6.2Z"
      fill="currentColor"
      opacity="0.55"
    />
    {/* Center Spine Crease */}
    <line x1="12" y1="5.5" x2="12" y2="19.5" stroke="#fff" strokeWidth="1" opacity="0.6" />
    {/* Arcane text runes */}
    <line x1="6" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="6" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="14" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="14" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 7. Zap (Lightning Bolt / Activity)
export const RpgZap: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Main Chiseled Bolt Body */}
    <polygon points="13,2 4,13 12,13 11,22 20,11 12,11" fill="currentColor" />
    {/* Light Facet on Upper Edge */}
    <polygon points="13,2 8,11 12,11 13,2" fill="#fff" opacity="0.45" />
    {/* Specular Spine */}
    <line x1="13" y1="3" x2="11" y2="21" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

// 8. Star / Reputation (6-Point Faceted Diamond Star)
export const RpgStar: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Faceted 4-Point + 2-Wing Star */}
    <polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" fill="currentColor" />
    {/* Light Shards (Top-Left facets) */}
    <polygon points="12,2 12,12 9.5,9.5" fill="#fff" opacity="0.45" />
    <polygon points="2,12 12,12 9.5,14.5" fill="#fff" opacity="0.3" />
    {/* Shadow Shards (Bottom-Right facets) */}
    <polygon points="12,22 12,12 14.5,14.5" fill="#08090d" opacity="0.35" />
    <polygon points="22,12 12,12 14.5,9.5" fill="#08090d" opacity="0.25" />
  </svg>
);

// 9. Layers / Versatility (Isometric Floating Arcane Plates)
export const RpgLayers: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Plate (Luminous) */}
    <polygon points="12,2 21,7 12,12 3,7" fill="currentColor" opacity="0.8" />
    <polygon points="12,2 21,7 12,12 3,7" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
    {/* Middle Plate */}
    <path d="M3 11.5L12 16.5L21 11.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="12,11.5 21,16.5 12,16.5 3,11.5" fill="currentColor" opacity="0.4" />
    {/* Bottom Plate */}
    <path d="M3 16.5L12 21.5L21 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 10. Calendar / Consistency (Chiseled Hourglass with Temporal Embers)
export const RpgCalendar: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Rim */}
    <rect x="5" y="2" width="14" height="2.5" rx="0.5" fill="currentColor" />
    {/* Bottom Rim */}
    <rect x="5" y="19.5" width="14" height="2.5" rx="0.5" fill="currentColor" />
    {/* Hourglass Glass Shell */}
    <path
      d="M7 4.5C7 9 10 11 12 12C14 11 17 9 17 4.5H7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M7 19.5C7 15 10 13 12 12C14 13 17 15 17 19.5H7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="currentColor"
      opacity="0.2"
    />
    {/* Golden Sand in Bottom Cone */}
    <polygon points="12,14 15,18.5 9,18.5" fill="currentColor" />
    <circle cx="12" cy="13" r="0.8" fill="#fff" />
    <line x1="12" y1="13.5" x2="12" y2="15.5" stroke="#fff" strokeWidth="0.8" />
  </svg>
);

// 11. Heart (HP - Chiseled Ruby Gem-Cut Heart)
export const RpgHeart: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Gem-Cut Heart Facets */}
    <polygon points="12,21.5 3.5,12 3.5,6.5 7.5,3.5 12,7 16.5,3.5 20.5,6.5 20.5,12" fill="currentColor" />
    {/* Light Facets (Top & Left) */}
    <polygon points="7.5,3.5 12,7 12,12 4.5,8" fill="#fff" opacity="0.45" />
    <polygon points="12,21.5 12,12 3.5,12" fill="#fff" opacity="0.25" />
    {/* Shadow Facets (Right) */}
    <polygon points="16.5,3.5 12,7 12,12 19.5,8" fill="#08090d" opacity="0.3" />
    <polygon points="12,21.5 12,12 20.5,12" fill="#08090d" opacity="0.4" />
    {/* Outer chiseled contour */}
    <path
      d="M12 21.5L3.5 12C2.5 10 2.5 6.5 5 4.5C7.5 2.5 10.5 4 12 7C13.5 4 16.5 2.5 19 4.5C21.5 6.5 21.5 10 20.5 12L12 21.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

// 12. Mana Flame / Potion Fire (MP - Sapphire Spark)
export const RpgMana: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Outer Tear/Flame Contour */}
    <path
      d="M12 2C8 7 5 12 5 15.5C5 19.5 8 22 12 22C16 22 19 19.5 19 15.5C19 12 16 7 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.3"
    />
    {/* Inner Luminous Crystal Core */}
    <polygon points="12,6 8,15 12,19 16,15" fill="currentColor" />
    <polygon points="12,6 8,15 12,19" fill="#fff" opacity="0.4" />
    {/* Ascending mana particle spark */}
    <circle cx="12" cy="11" r="1.5" fill="#fff" />
  </svg>
);

// 13. Crown (Prestige & Titles)
export const RpgCrown: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Crown Body with 3 Peaks */}
    <polygon points="3,18 21,18 20,8 15,13 12,4 9,13 4,8" fill="currentColor" />
    {/* Chiseled Base Band */}
    <rect x="3" y="18" width="18" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="#08090d" opacity="0.4" />
    {/* Specular Highlight along Left Peaks */}
    <polygon points="12,4 9,13 12,13" fill="#fff" opacity="0.4" />
    <polygon points="4,8 7,13 9,13" fill="#fff" opacity="0.3" />
    {/* Center Jewels */}
    <circle cx="12" cy="15" r="1.2" fill="#fff" />
    <circle cx="7" cy="15" r="1" fill="#fff" opacity="0.8" />
    <circle cx="17" cy="15" r="1" fill="#fff" opacity="0.8" />
  </svg>
);

// 14. Trophy / Chalice (Achievements & Glory)
export const RpgTrophy: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Cup Body */}
    <path
      d="M6 3H18V10C18 13.5 15 16 12 16C9 13.5 6 10 6 3Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.3"
    />
    {/* Cup Light Face */}
    <path d="M12 3H18V10C18 13.5 15 16 12 16V3Z" fill="currentColor" opacity="0.5" />
    {/* Handles */}
    <path d="M6 5H3C2 8 3 11 6 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M18 5H21C22 8 21 11 18 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    {/* Stem & Pedestal */}
    <line x1="12" y1="16" x2="12" y2="19.5" stroke="currentColor" strokeWidth="2.5" />
    <polygon points="7,22 17,22 15,19.5 9,19.5" fill="currentColor" />
  </svg>
);

// 15. Padlock (Locked State)
export const RpgLock: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Heavy Shackle */}
    <path
      d="M7 10V6C7 3.5 9 1.5 12 1.5C15 1.5 17 3.5 17 6V10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Chiseled Lock Body */}
    <rect x="4" y="10" width="16" height="12" rx="1.5" fill="currentColor" />
    {/* Keyhole Cutout */}
    <circle cx="12" cy="15" r="1.8" fill="#08090d" />
    <polygon points="11,15.5 13,15.5 12.5,19 11.5,19" fill="#08090d" />
    <line x1="5.5" y1="11.5" x2="18.5" y2="11.5" stroke="#fff" strokeWidth="1" opacity="0.4" />
  </svg>
);

// 16. Unlock (Unlocked State)
export const RpgUnlock: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Open Shackle tilted */}
    <path
      d="M7 9V5C7 2.5 9 1 12 1C15 1 17 2.5 17 5V6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Lock Body */}
    <rect x="4" y="10" width="16" height="12" rx="1.5" fill="currentColor" />
    <circle cx="12" cy="15" r="1.8" fill="#08090d" />
    <polygon points="11,15.5 13,15.5 12.5,19 11.5,19" fill="#08090d" />
    {/* Radiant sparks from unlock */}
    <line x1="19" y1="7" x2="22" y2="5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="18" y1="3" x2="20" y2="1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 17. Search / Scrying Orb
export const RpgSearch: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Crystal Orb (Scrying Glass) */}
    <circle cx="11" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.15" />
    {/* Focal point of light in crystal */}
    <circle cx="9" cy="8" r="2" fill="#fff" opacity="0.6" />
    {/* Runic Hand Stand */}
    <path d="M16 15L21 20" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <line x1="18" y1="17" x2="20" y2="19" stroke="#fff" strokeWidth="1" opacity="0.5" />
  </svg>
);

// 18. Settings (Astrolabe Runic Gear)
export const RpgSettings: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* 6-Toothed Chiseled Gear */}
    <path
      d="M12 1L14 3.5H17V6.5L19.5 8.5L18.5 11.5L20 14.5L17.5 16.5V19.5H14.5L12 22L9.5 19.5H6.5V16.5L4 14.5L5.5 11.5L4.5 8.5L7 6.5V3.5H10L12 1Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="currentColor"
      opacity="0.2"
    />
    {/* Axle Core */}
    <circle cx="12" cy="11.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" />
  </svg>
);

// 19. Volume On (Warhorn / Sound Wave)
export const RpgVolumeOn: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Warhorn Body */}
    <polygon points="3,9 7,9 13,4 13,20 7,15 3,15" fill="currentColor" />
    {/* Sound pulse arcs */}
    <path d="M16.5 8C18 9.5 18 14.5 16.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M19.5 5C22 7.5 22 16.5 19.5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// 20. Volume Off (Muted Horn)
export const RpgVolumeOff: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <polygon points="3,9 7,9 13,4 13,20 7,15 3,15" fill="currentColor" opacity="0.5" />
    {/* Crossed Mute Swords */}
    <line x1="16" y1="9" x2="22" y2="15" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="22" y1="9" x2="16" y2="15" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// 21. Sparkles (Arcane Glint)
export const RpgSparkles: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Big Diamond Star */}
    <polygon points="10,2 12,8 18,10 12,12 10,18 8,12 2,10 8,8" fill="currentColor" />
    <polygon points="10,2 10,10 8,8" fill="#fff" opacity="0.5" />
    {/* Little Sparkle */}
    <polygon points="18,14 19,17 22,18 19,19 18,22 17,19 14,18 17,17" fill="currentColor" opacity="0.8" />
  </svg>
);

// 22. Code (Arcane Syntax Brackets)
export const RpgCode: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6L22 12L16 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// 23. Git Commit (Runic Commit Node)
export const RpgGitCommit: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Central Runic Orb */}
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.25" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <circle cx="11" cy="11" r="1" fill="#fff" opacity="0.8" />
  </svg>
);

// 24. Git Pull Request (Expedition Merge)
export const RpgGitPullRequest: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Left Stem */}
    <line x1="6" y1="9" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.5" />
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    {/* Right Branch */}
    <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    <path d="M18 9V12C18 15 12 15 6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 25. Git Fork (Branching Masmorras)
export const RpgGitFork: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Base Node */}
    <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    <line x1="12" y1="12" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Left Branch */}
    <path d="M12 12C12 9 6 9 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    {/* Right Branch */}
    <path d="M12 12C12 9 18 9 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
  </svg>
);

// 26. Arrow Left (Chiseled Spearhead)
export const RpgArrowLeft: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="12,5 5,12 12,19" fill="currentColor" />
    <polygon points="12,5 5,12 12,12" fill="#fff" opacity="0.4" />
  </svg>
);

// 27. Close / X (Crossed Daggers)
export const RpgClose: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="5" y1="5" x2="19" y2="19" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

// 28. Checkmark (Runic Affirmation)
export const RpgCheck: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M4 12L9.5 17.5L20 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L9.5 16.5L19 6" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// 29. Alert (Warning Stele)
export const RpgAlert: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <polygon points="12,2 22,20 2,20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" opacity="0.2" />
    <line x1="12" y1="8" x2="12" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" />
  </svg>
);

// 30. Map Pin / Banner Marker
export const RpgMapPin: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path
      d="M12 2C7.5 2 4 5.5 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.5 16.5 2 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.2"
    />
    <circle cx="12" cy="10" r="3" fill="currentColor" />
    <circle cx="11" cy="9" r="1" fill="#fff" />
  </svg>
);

// 31. Building / Stone Sanctum
export const RpgBuilding: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <polygon points="12,2 21,7 3,7" fill="currentColor" />
    <line x1="2" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <rect x="5" y="9" width="2.5" height="9" fill="currentColor" opacity="0.8" />
    <rect x="10.5" y="9" width="3" height="9" fill="currentColor" opacity="0.8" />
    <rect x="16.5" y="9" width="2.5" height="9" fill="currentColor" opacity="0.8" />
    <rect x="3" y="19" width="18" height="3" rx="0.5" fill="currentColor" />
  </svg>
);

// 32. Share / Scroll Dispatch
export const RpgShare: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" />
    <line x1="8.5" y1="10.5" x2="15.5" y2="6.5" stroke="currentColor" strokeWidth="2" />
    <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// 33. Ghost / Soul Shade (404 & Empty State)
export const RpgGhost: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path
      d="M5 21V10C5 6 8 3 12 3C16 3 19 6 19 10V21L15.5 19L12 21L8.5 19L5 21Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.25"
    />
    <circle cx="9.5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="14.5" cy="10" r="1.5" fill="currentColor" />
  </svg>
);

// 34. Download / Vault Extraction
export const RpgDownload: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M12 3V15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="12,17 7,11 17,11" fill="currentColor" />
    <path d="M4 17V20C4 20.5 4.5 21 5 21H19C19.5 21 20 20.5 20 20V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 35. Castle Tower
export const RpgCastle: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <polygon points="3,4 7,4 7,7 11,7 11,4 13,4 13,7 17,7 17,4 21,4 21,9 19,10 19,21 5,21 5,10 3,9" fill="currentColor" opacity="0.4" />
    <path d="M10 21V15C10 14 11 13 12 13C13 13 14 14 14 15V21" fill="#08090d" />
  </svg>
);

// 36. Anvil
export const RpgAnvil: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M3 6L6 5H21V8L18 9L15 13H9L7 9L2 8V6H3Z" fill="currentColor" />
    <rect x="7" y="14" width="10" height="3" fill="currentColor" opacity="0.8" />
    <polygon points="5,20 19,20 17,17 7,17" fill="currentColor" />
  </svg>
);

// 37. Hammer
export const RpgHammer: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <polygon points="14,2 21,5 18,9 11,6" fill="currentColor" />
    <rect x="14" y="2" width="7" height="4" rx="0.5" fill="#fff" opacity="0.3" />
    <line x1="13" y1="7" x2="3" y2="21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

// 38. Eye / Vision
export const RpgEye: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M2 12C5 6 19 6 22 12C19 18 5 18 2 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" fill="currentColor" opacity="0.4" />
    <circle cx="12" cy="12" r="1.5" fill="#fff" />
  </svg>
);

// 39. Globe / World Dial
export const RpgGlobe: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <ellipse cx="12" cy="12" rx="4.5" ry="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// 40. Users / Guild Companions
export const RpgUsers: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="9" cy="8" r="3.5" fill="currentColor" />
    <path d="M2 19C2 15.5 5 13 9 13C13 13 16 15.5 16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="9" r="2.5" fill="currentColor" opacity="0.6" />
    <path d="M16 14C18 14.5 21 16 21 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
  </svg>
);

// 41. Potion Flask
export const RpgPotion: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="10" y="2" width="4" height="2" rx="0.5" fill="#b45309" />
    <path d="M10 4V7L5 16C4 18 5 21 7.5 21H16.5C19 21 20 18 19 16L14 7V4H10Z" stroke="currentColor" strokeWidth="2" />
    <polygon points="7,17 17,17 16,20 8,20" fill="currentColor" opacity="0.5" />
  </svg>
);

// 42. Bow
export const RpgBow: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <path d="M6 3C12 6 12 18 6 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="6" y1="3" x2="6" y2="21" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
    <line x1="4" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" />
    <polygon points="20,12 16,9 16,15" fill="currentColor" />
  </svg>
);

// 43. Coins (Gold Stacks)
export const RpgCoins: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <ellipse cx="12" cy="7" rx="7" ry="3.5" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 7V12C5 14 8 15.5 12 15.5C16 15.5 19 14 19 12V7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 12V17C5 19 8 20.5 12 20.5C16 20.5 19 19 19 17V12" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="7" r="1.5" fill="#fff" />
  </svg>
);

// 44. Compass
export const RpgCompass: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <polygon points="12,5 15,12 12,12" fill="currentColor" />
    <polygon points="12,5 9,12 12,12" fill="#fff" opacity="0.5" />
    <polygon points="12,19 9,12 12,12" fill="currentColor" opacity="0.7" />
    <polygon points="12,19 15,12 12,12" fill="#08090d" opacity="0.3" />
    <circle cx="12" cy="12" r="1.5" fill="#fff" />
  </svg>
);

// 45. Clock
export const RpgClock: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <polyline points="12,7 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 46. Flame (Chama da Atividade)
export const RpgFlame: React.FC<RpgIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Outer flame contour */}
    <path
      d="M12 2C13 6 18 8.5 18 14.5C18 18.6 15.3 22 12 22C8.7 22 6 18.6 6 14.5C6 11.8 7.4 10 8.6 8.6C8.9 10.2 9.6 11 10.4 11.4C10.2 7.6 10.8 4.6 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      fill="currentColor"
      opacity="0.35"
    />
    {/* Inner luminous core */}
    <path d="M12 11C13 13.4 15 14.4 15 17C15 19 13.7 20.4 12 20.4C10.3 20.4 9 19 9 17C9 15.2 10.6 14 12 11Z" fill="currentColor" />
    <path d="M12 11C10.6 14 9 15.2 9 17C9 19 10.3 20.4 12 20.4Z" fill="#fff" opacity="0.4" />
  </svg>
);

/**
 * ============================================================================
 * BACKWARD-COMPATIBILITY ALIASES
 * ============================================================================
 * These exports guarantee existing codebase components that import
 * `Pixel*` names immediately receive the upgraded Chiseled RPG Icons.
 */
export const PixelSword = RpgSword;
export const PixelSwords = RpgSwords;
export const PixelShield = RpgShield;
export const PixelShieldCheck = RpgShieldCheck;
export const PixelShieldAlert = RpgShieldAlert;
export const PixelCastle = RpgCastle;
export const PixelTome = RpgTome;
export const PixelFlame = RpgMana;
export const PixelCoins = RpgCoins;
export const PixelCrown = RpgCrown;
export const PixelTrophy = RpgTrophy;
export const PixelStar = RpgStar;
export const PixelSparkles = RpgSparkles;
export const PixelCompass = RpgCompass;
export const PixelGitCommit = RpgGitCommit;
export const PixelGitPullRequest = RpgGitPullRequest;
export const PixelGitFork = RpgGitFork;
export const PixelAnvil = RpgAnvil;
export const PixelHammer = RpgHammer;
export const PixelZap = RpgZap;
export const PixelLayers = RpgLayers;
export const PixelCode = RpgCode;
export const PixelSettings = RpgSettings;
export const PixelVolumeOn = RpgVolumeOn;
export const PixelVolumeOff = RpgVolumeOff;
export const PixelEye = RpgEye;
export const PixelGlobe = RpgGlobe;
export const PixelUsers = RpgUsers;
export const PixelCheck = RpgCheck;
export const PixelLock = RpgLock;
export const PixelX = RpgClose;
export const PixelSearch = RpgSearch;
export const PixelAlert = RpgAlert;
export const PixelMapPin = RpgMapPin;
export const PixelBuilding = RpgBuilding;
export const PixelClock = RpgClock;
export const PixelDownload = RpgDownload;
export const PixelShare = RpgShare;
export const PixelArrowLeft = RpgArrowLeft;
export const PixelGhost = RpgGhost;
export const PixelHeart = RpgHeart;
export const PixelPotion = RpgPotion;
export const PixelCalendar = RpgCalendar;
export const PixelBow = RpgBow;
