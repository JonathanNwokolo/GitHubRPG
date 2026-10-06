import React from "react";

export interface PixelIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

const baseProps = (props: PixelIconProps) => ({
  viewBox: "0 0 16 16",
  width: props.size || "1em",
  height: props.size || "1em",
  fill: "currentColor",
  shapeRendering: "crispEdges" as const,
  "aria-hidden": "true" as const,
  ...props,
});

/**
 * 16x16 Pixel Art RPG Icons inspired by itch.io RPG asset packs.
 * Crisp edges, zero vector blurring, authentic dark-fantasy retro RPG aesthetics.
 */

// 1. Single Sword
export const PixelSword: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Blade */}
    <rect x="12" y="2" width="2" height="2" />
    <rect x="10" y="4" width="2" height="2" />
    <rect x="8" y="6" width="2" height="2" />
    <rect x="7" y="7" width="2" height="2" />
    <rect x="11" y="3" width="2" height="2" opacity="0.6" />
    <rect x="9" y="5" width="2" height="2" opacity="0.6" />
    {/* Guard */}
    <rect x="5" y="8" width="4" height="1" />
    <rect x="7" y="6" width="1" height="4" />
    <rect x="8" y="9" width="1" height="1" />
    <rect x="5" y="6" width="1" height="1" />
    {/* Grip */}
    <rect x="4" y="9" width="2" height="2" />
    <rect x="3" y="10" width="2" height="2" />
    {/* Pommel */}
    <rect x="1" y="12" width="3" height="3" />
  </svg>
);

// 2. Crossed Swords (Duel / Combat)
export const PixelSwords: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Left-to-right sword blade */}
    <rect x="13" y="1" width="2" height="2" />
    <rect x="11" y="3" width="2" height="2" />
    <rect x="9" y="5" width="2" height="2" />
    <rect x="7" y="7" width="2" height="2" />
    <rect x="5" y="9" width="2" height="2" />
    {/* Right-to-left sword blade */}
    <rect x="1" y="1" width="2" height="2" />
    <rect x="3" y="3" width="2" height="2" />
    <rect x="5" y="5" width="2" height="2" />
    <rect x="9" y="9" width="2" height="2" />
    <rect x="11" y="11" width="2" height="2" />
    {/* Guards */}
    <rect x="4" y="10" width="3" height="1" />
    <rect x="9" y="10" width="3" height="1" />
    {/* Grips & Pommels */}
    <rect x="2" y="12" width="2" height="2" />
    <rect x="12" y="12" width="2" height="2" />
    <rect x="1" y="14" width="2" height="2" />
    <rect x="13" y="14" width="2" height="2" />
  </svg>
);

// 3. Shield
export const PixelShield: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Rim */}
    <rect x="2" y="2" width="12" height="2" />
    {/* Sides */}
    <rect x="2" y="4" width="2" height="5" />
    <rect x="12" y="4" width="2" height="5" />
    {/* Lower Curves */}
    <rect x="3" y="9" width="2" height="2" />
    <rect x="11" y="9" width="2" height="2" />
    <rect x="4" y="11" width="2" height="2" />
    <rect x="10" y="11" width="2" height="2" />
    <rect x="6" y="13" width="4" height="1" />
    <rect x="7" y="14" width="2" height="1" />
    {/* Inner Heraldic Boss */}
    <rect x="7" y="4" width="2" height="7" />
    <rect x="4" y="6" width="8" height="2" />
  </svg>
);

// 4. Shield with Check (Verified / Buff)
export const PixelShieldCheck: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Shield Outer */}
    <rect x="2" y="2" width="12" height="2" />
    <rect x="2" y="4" width="2" height="5" />
    <rect x="12" y="4" width="2" height="5" />
    <rect x="3" y="9" width="2" height="2" />
    <rect x="11" y="9" width="2" height="2" />
    <rect x="4" y="11" width="2" height="2" />
    <rect x="10" y="11" width="2" height="2" />
    <rect x="6" y="13" width="4" height="2" />
    {/* Checkmark in center */}
    <rect x="5" y="7" width="2" height="2" />
    <rect x="7" y="9" width="2" height="2" />
    <rect x="9" y="5" width="2" height="4" />
  </svg>
);

// 5. Shield with Alert
export const PixelShieldAlert: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="2" y="2" width="12" height="2" />
    <rect x="2" y="4" width="2" height="5" />
    <rect x="12" y="4" width="2" height="5" />
    <rect x="3" y="9" width="2" height="2" />
    <rect x="11" y="9" width="2" height="2" />
    <rect x="5" y="11" width="6" height="3" />
    {/* Exclamation */}
    <rect x="7" y="5" width="2" height="4" />
    <rect x="7" y="10" width="2" height="2" />
  </svg>
);

// 6. Castle / Dungeon Tower
export const PixelCastle: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Battlements */}
    <rect x="1" y="2" width="3" height="3" />
    <rect x="6" y="2" width="4" height="3" />
    <rect x="12" y="2" width="3" height="3" />
    {/* Upper Wall */}
    <rect x="2" y="5" width="12" height="3" />
    {/* Main Tower Body */}
    <rect x="3" y="8" width="10" height="7" />
    {/* Arch Gate (Negative Space cutout) */}
    <rect x="6" y="10" width="4" height="5" fill="#08090d" />
    <rect x="7" y="9" width="2" height="1" fill="#08090d" />
    {/* Arrow Slits */}
    <rect x="4" y="9" width="1" height="2" fill="#08090d" />
    <rect x="11" y="9" width="1" height="2" fill="#08090d" />
  </svg>
);

// 7. Grimoire / Tome (BookOpen)
export const PixelTome: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Spine */}
    <rect x="7" y="2" width="2" height="12" />
    {/* Left Page Top & Edge */}
    <rect x="2" y="3" width="5" height="1" />
    <rect x="1" y="4" width="1" height="8" />
    <rect x="2" y="12" width="5" height="1" />
    {/* Right Page Top & Edge */}
    <rect x="9" y="3" width="5" height="1" />
    <rect x="14" y="4" width="1" height="8" />
    <rect x="9" y="12" width="5" height="1" />
    {/* Page Fills */}
    <rect x="2" y="4" width="5" height="8" opacity="0.4" />
    <rect x="9" y="4" width="5" height="8" opacity="0.4" />
    {/* Magic Glyphs in Page */}
    <rect x="3" y="6" width="3" height="1" />
    <rect x="3" y="8" width="2" height="1" />
    <rect x="10" y="6" width="3" height="1" />
    <rect x="10" y="8" width="2" height="1" />
  </svg>
);

// 8. Campfire Flame (Streak & Buff)
export const PixelFlame: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Flame Tip */}
    <rect x="7" y="1" width="2" height="2" />
    <rect x="6" y="3" width="3" height="2" />
    {/* Mid Body */}
    <rect x="5" y="5" width="6" height="3" />
    <rect x="4" y="7" width="8" height="4" />
    {/* Flame Base */}
    <rect x="5" y="11" width="6" height="3" />
    <rect x="6" y="14" width="4" height="1" />
    {/* Inner Bright Ember */}
    <rect x="7" y="8" width="2" height="3" fill="#fbbf24" />
    <rect x="6" y="9" width="4" height="2" fill="#fbbf24" />
  </svg>
);

// 9. Gold Coins (Stars / Economy)
export const PixelCoins: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Back Coin */}
    <rect x="7" y="2" width="6" height="1" />
    <rect x="6" y="3" width="8" height="4" />
    <rect x="7" y="7" width="6" height="1" />
    {/* Front Coin Stack */}
    <rect x="3" y="6" width="8" height="2" />
    <rect x="2" y="8" width="10" height="5" />
    <rect x="3" y="13" width="8" height="2" />
    {/* Embossed Rune */}
    <rect x="6" y="9" width="2" height="3" fill="#08090d" opacity="0.7" />
    <rect x="5" y="10" width="4" height="1" fill="#08090d" opacity="0.7" />
  </svg>
);

// 10. Crown (Honor & Prestige)
export const PixelCrown: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Peaks */}
    <rect x="1" y="4" width="2" height="2" />
    <rect x="7" y="2" width="2" height="2" />
    <rect x="13" y="4" width="2" height="2" />
    {/* Diadem Slopes */}
    <rect x="2" y="6" width="3" height="2" />
    <rect x="6" y="4" width="4" height="2" />
    <rect x="11" y="6" width="3" height="2" />
    {/* Crown Base Solid */}
    <rect x="2" y="8" width="12" height="3" />
    <rect x="1" y="11" width="14" height="3" />
    {/* Jewels in base */}
    <rect x="3" y="12" width="2" height="1" fill="#ef4444" />
    <rect x="7" y="12" width="2" height="1" fill="#38bdf8" />
    <rect x="11" y="12" width="2" height="1" fill="#ef4444" />
  </svg>
);

// 11. Trophy / Chalice
export const PixelTrophy: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Cup Rim */}
    <rect x="4" y="2" width="8" height="2" />
    {/* Cup Body */}
    <rect x="3" y="4" width="10" height="4" />
    <rect x="5" y="8" width="6" height="2" />
    {/* Handles */}
    <rect x="1" y="3" width="2" height="4" />
    <rect x="13" y="3" width="2" height="4" />
    {/* Stem */}
    <rect x="7" y="10" width="2" height="3" />
    {/* Base Pedestal */}
    <rect x="4" y="13" width="8" height="2" />
  </svg>
);

// 12. Star (Faceted RPG Star)
export const PixelStar: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="7" y="1" width="2" height="3" />
    <rect x="6" y="4" width="4" height="2" />
    <rect x="1" y="6" width="14" height="2" />
    <rect x="3" y="8" width="10" height="2" />
    <rect x="5" y="10" width="6" height="2" />
    <rect x="3" y="12" width="3" height="3" />
    <rect x="10" y="12" width="3" height="3" />
  </svg>
);

// 13. Sparkles (Magic Arcana)
export const PixelSparkles: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Big Sparkle */}
    <rect x="6" y="1" width="2" height="3" />
    <rect x="6" y="8" width="2" height="3" />
    <rect x="2" y="5" width="3" height="2" />
    <rect x="9" y="5" width="3" height="2" />
    <rect x="5" y="4" width="4" height="4" />
    {/* Little Sparkle */}
    <rect x="12" y="10" width="2" height="1" />
    <rect x="12" y="13" width="2" height="1" />
    <rect x="10" y="11" width="2" height="2" />
    <rect x="13" y="11" width="2" height="2" />
    <rect x="12" y="11" width="1" height="2" fill="#fff" />
  </svg>
);

// 14. Compass (Quests & World Exploration)
export const PixelCompass: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Outer Ring */}
    <rect x="5" y="1" width="6" height="2" />
    <rect x="2" y="4" width="12" height="8" />
    <rect x="5" y="13" width="6" height="2" />
    {/* Hollow Inner */}
    <rect x="4" y="3" width="8" height="10" fill="#08090d" />
    {/* Needle (Diamond) */}
    <rect x="7" y="4" width="2" height="4" fill="#ef4444" />
    <rect x="7" y="8" width="2" height="4" fill="#38bdf8" />
    <rect x="6" y="7" width="4" height="2" fill="#fbbf24" />
  </svg>
);

// 15. Git Commit (Runic Commit Node)
export const PixelGitCommit: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top line */}
    <rect x="7" y="0" width="2" height="4" />
    {/* Bottom line */}
    <rect x="7" y="12" width="2" height="4" />
    {/* Central Rune Orb Ring */}
    <rect x="4" y="4" width="8" height="8" />
    <rect x="6" y="6" width="4" height="4" fill="#08090d" />
    {/* Center Gem Pixel */}
    <rect x="7" y="7" width="2" height="2" />
  </svg>
);

// 16. Git Pull Request (Expedition Merge)
export const PixelGitPullRequest: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Left Stem */}
    <rect x="3" y="2" width="2" height="8" />
    <rect x="2" y="10" width="4" height="4" />
    {/* Right Branch */}
    <rect x="10" y="2" width="4" height="4" />
    <rect x="11" y="6" width="2" height="3" />
    {/* Merge Curve to Left */}
    <rect x="7" y="8" width="4" height="2" />
    <rect x="5" y="6" width="3" height="2" />
  </svg>
);

// 17. Git Fork (Branching Masmorras)
export const PixelGitFork: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Base Node */}
    <rect x="6" y="11" width="4" height="4" />
    <rect x="7" y="8" width="2" height="3" />
    {/* Left Node & Path */}
    <rect x="2" y="2" width="4" height="4" />
    <rect x="3" y="6" width="3" height="2" />
    <rect x="5" y="7" width="2" height="2" />
    {/* Right Node & Path */}
    <rect x="10" y="2" width="4" height="4" />
    <rect x="10" y="6" width="3" height="2" />
    <rect x="9" y="7" width="2" height="2" />
  </svg>
);

// 18. Anvil (The Forge)
export const PixelAnvil: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Horn on left */}
    <rect x="1" y="4" width="3" height="2" />
    {/* Striking Surface */}
    <rect x="3" y="3" width="12" height="3" />
    {/* Waist */}
    <rect x="5" y="6" width="6" height="3" />
    {/* Base Feet */}
    <rect x="4" y="9" width="8" height="2" />
    <rect x="2" y="11" width="12" height="3" />
  </svg>
);

// 19. Blacksmith Hammer
export const PixelHammer: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Heavy Head */}
    <rect x="9" y="1" width="5" height="5" />
    <rect x="8" y="2" width="1" height="3" />
    <rect x="14" y="2" width="1" height="3" />
    {/* Diagonal Handle */}
    <rect x="8" y="5" width="2" height="2" opacity="0.8" />
    <rect x="6" y="7" width="2" height="2" opacity="0.8" />
    <rect x="4" y="9" width="2" height="2" opacity="0.8" />
    <rect x="2" y="11" width="2" height="2" opacity="0.8" />
    <rect x="1" y="13" width="2" height="2" />
  </svg>
);

// 20. Zap (Lightning Bolt / Activity)
export const PixelZap: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="8" y="1" width="5" height="2" />
    <rect x="7" y="3" width="4" height="2" />
    <rect x="6" y="5" width="4" height="2" />
    <rect x="3" y="7" width="9" height="2" />
    <rect x="6" y="9" width="4" height="2" />
    <rect x="5" y="11" width="3" height="2" />
    <rect x="4" y="13" width="2" height="2" />
  </svg>
);

// 21. Layers (Architecture / Versatility)
export const PixelLayers: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Plate */}
    <rect x="6" y="1" width="4" height="2" />
    <rect x="3" y="3" width="10" height="2" />
    <rect x="1" y="5" width="14" height="1" />
    {/* Middle Plate */}
    <rect x="3" y="7" width="10" height="2" />
    <rect x="1" y="9" width="14" height="1" />
    {/* Bottom Plate */}
    <rect x="3" y="11" width="10" height="2" />
    <rect x="1" y="13" width="14" height="2" />
  </svg>
);

// 22. Code Brackets (Arcane Syntax)
export const PixelCode: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Left < */}
    <rect x="4" y="4" width="2" height="2" />
    <rect x="2" y="6" width="2" height="4" />
    <rect x="4" y="10" width="2" height="2" />
    {/* Slash / */}
    <rect x="9" y="3" width="2" height="3" />
    <rect x="7" y="6" width="2" height="4" />
    <rect x="5" y="10" width="2" height="3" />
    {/* Right > */}
    <rect x="10" y="4" width="2" height="2" />
    <rect x="12" y="6" width="2" height="4" />
    <rect x="10" y="10" width="2" height="2" />
  </svg>
);

// 23. Settings Gear
export const PixelSettings: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Outer teeth */}
    <rect x="7" y="1" width="2" height="2" />
    <rect x="7" y="13" width="2" height="2" />
    <rect x="1" y="7" width="2" height="2" />
    <rect x="13" y="7" width="2" height="2" />
    <rect x="3" y="3" width="2" height="2" />
    <rect x="11" y="3" width="2" height="2" />
    <rect x="3" y="11" width="2" height="2" />
    <rect x="11" y="11" width="2" height="2" />
    {/* Wheel */}
    <rect x="4" y="4" width="8" height="8" />
    {/* Axle cutout */}
    <rect x="6" y="6" width="4" height="4" fill="#08090d" />
  </svg>
);

// 24. Volume On
export const PixelVolumeOn: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Horn Cone */}
    <rect x="2" y="6" width="3" height="4" />
    <rect x="5" y="4" width="2" height="8" />
    <rect x="7" y="2" width="2" height="12" />
    {/* Wave 1 */}
    <rect x="10" y="5" width="1" height="6" />
    {/* Wave 2 */}
    <rect x="13" y="3" width="1" height="10" />
  </svg>
);

// 25. Volume Off
export const PixelVolumeOff: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Horn Cone */}
    <rect x="1" y="6" width="3" height="4" />
    <rect x="4" y="4" width="2" height="8" />
    <rect x="6" y="2" width="2" height="12" />
    {/* Mute X */}
    <rect x="10" y="6" width="2" height="2" fill="#ef4444" />
    <rect x="13" y="6" width="2" height="2" fill="#ef4444" />
    <rect x="11.5" y="7.5" width="2" height="2" fill="#ef4444" />
    <rect x="10" y="9" width="2" height="2" fill="#ef4444" />
    <rect x="13" y="9" width="2" height="2" fill="#ef4444" />
  </svg>
);

// 26. Eye (Observer / Vision)
export const PixelEye: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="5" y="3" width="6" height="2" />
    <rect x="2" y="5" width="12" height="6" />
    <rect x="5" y="11" width="6" height="2" />
    {/* Sclera & Iris */}
    <rect x="4" y="5" width="8" height="6" fill="#08090d" />
    <rect x="6" y="5" width="4" height="6" fill="#38bdf8" />
    <rect x="7" y="6" width="2" height="4" fill="#fff" />
  </svg>
);

// 27. Globe (Realm & Languages)
export const PixelGlobe: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="5" y="1" width="6" height="2" />
    <rect x="2" y="3" width="12" height="10" />
    <rect x="5" y="13" width="6" height="2" />
    {/* Cutout continents */}
    <rect x="4" y="3" width="2" height="4" fill="#08090d" />
    <rect x="10" y="5" width="3" height="3" fill="#08090d" />
    <rect x="5" y="8" width="4" height="4" fill="#08090d" />
  </svg>
);

// 28. Adventurers / Users
export const PixelUsers: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Leader Head */}
    <rect x="6" y="2" width="4" height="4" />
    {/* Leader Torso */}
    <rect x="4" y="7" width="8" height="6" />
    {/* Companion Left Head */}
    <rect x="1" y="4" width="3" height="3" opacity="0.6" />
    {/* Companion Left Torso */}
    <rect x="0" y="8" width="4" height="5" opacity="0.6" />
    {/* Companion Right Head */}
    <rect x="12" y="4" width="3" height="3" opacity="0.6" />
    {/* Companion Right Torso */}
    <rect x="12" y="8" width="4" height="5" opacity="0.6" />
  </svg>
);

// 29. Checkmark
export const PixelCheck: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="2" y="8" width="2" height="3" />
    <rect x="4" y="10" width="2" height="3" />
    <rect x="6" y="12" width="2" height="3" />
    <rect x="8" y="9" width="2" height="3" />
    <rect x="10" y="6" width="2" height="3" />
    <rect x="12" y="3" width="2" height="3" />
  </svg>
);

// 30. Padlock
export const PixelLock: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Shackle */}
    <rect x="5" y="2" width="6" height="2" />
    <rect x="4" y="4" width="2" height="3" />
    <rect x="10" y="4" width="2" height="3" />
    {/* Body */}
    <rect x="3" y="7" width="10" height="7" />
    {/* Keyhole */}
    <rect x="7" y="9" width="2" height="2" fill="#08090d" />
    <rect x="7.5" y="11" width="1" height="2" fill="#08090d" />
  </svg>
);

// 31. Close / X
export const PixelX: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="2" y="2" width="3" height="3" />
    <rect x="11" y="2" width="3" height="3" />
    <rect x="5" y="5" width="2" height="2" />
    <rect x="9" y="5" width="2" height="2" />
    <rect x="7" y="7" width="2" height="2" />
    <rect x="5" y="9" width="2" height="2" />
    <rect x="9" y="9" width="2" height="2" />
    <rect x="2" y="11" width="3" height="3" />
    <rect x="11" y="11" width="3" height="3" />
  </svg>
);

// 32. Search / Scrying Glass
export const PixelSearch: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Glass Rim */}
    <rect x="4" y="1" width="6" height="2" />
    <rect x="2" y="3" width="10" height="6" />
    <rect x="4" y="9" width="6" height="2" />
    {/* Hollow Lens */}
    <rect x="4" y="3" width="6" height="6" fill="#08090d" />
    <rect x="5" y="4" width="2" height="2" fill="#fff" opacity="0.6" />
    {/* Handle */}
    <rect x="9" y="9" width="2" height="2" />
    <rect x="11" y="11" width="2" height="2" />
    <rect x="13" y="13" width="2" height="2" />
  </svg>
);

// 33. Alert Triangle
export const PixelAlert: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Tip */}
    <rect x="7" y="1" width="2" height="2" />
    <rect x="6" y="3" width="4" height="2" />
    <rect x="5" y="5" width="6" height="2" />
    <rect x="4" y="7" width="8" height="2" />
    <rect x="3" y="9" width="10" height="2" />
    <rect x="2" y="11" width="12" height="2" />
    <rect x="1" y="13" width="14" height="2" />
    {/* Exclamation Negative Space */}
    <rect x="7" y="5" width="2" height="5" fill="#08090d" />
    <rect x="7" y="11" width="2" height="2" fill="#08090d" />
  </svg>
);

// 34. Map Pin / Banner
export const PixelMapPin: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="5" y="1" width="6" height="2" />
    <rect x="4" y="3" width="8" height="5" />
    <rect x="5" y="8" width="6" height="2" />
    <rect x="6" y="10" width="4" height="2" />
    <rect x="7" y="12" width="2" height="3" />
    {/* Center dot */}
    <rect x="7" y="4" width="2" height="2" fill="#08090d" />
  </svg>
);

// 35. Building / Sanctum
export const PixelBuilding: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Pediment roof */}
    <rect x="7" y="1" width="2" height="2" />
    <rect x="4" y="3" width="8" height="2" />
    <rect x="2" y="5" width="12" height="2" />
    {/* Columns */}
    <rect x="2" y="7" width="2" height="6" />
    <rect x="7" y="7" width="2" height="6" />
    <rect x="12" y="7" width="2" height="6" />
    {/* Base */}
    <rect x="1" y="13" width="14" height="2" />
  </svg>
);

// 36. Hourglass / Clock
export const PixelClock: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Rim */}
    <rect x="2" y="2" width="12" height="2" />
    {/* Upper Cone */}
    <rect x="3" y="4" width="10" height="2" />
    <rect x="5" y="6" width="6" height="2" />
    <rect x="7" y="7" width="2" height="2" />
    {/* Lower Cone */}
    <rect x="5" y="8" width="6" height="2" />
    <rect x="3" y="10" width="10" height="2" />
    {/* Bottom Rim */}
    <rect x="2" y="12" width="12" height="2" />
    {/* Sand in bottom */}
    <rect x="6" y="11" width="4" height="1" fill="#fbbf24" />
  </svg>
);

// 37. Download / Chest Ingot
export const PixelDownload: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Arrow Stem */}
    <rect x="7" y="1" width="2" height="6" />
    {/* Arrow Head */}
    <rect x="5" y="6" width="6" height="2" />
    <rect x="6" y="8" width="4" height="2" />
    <rect x="7" y="10" width="2" height="1" />
    {/* Bottom Tray */}
    <rect x="2" y="12" width="12" height="2" />
    <rect x="2" y="9" width="2" height="3" />
    <rect x="12" y="9" width="2" height="3" />
  </svg>
);

// 38. Share / Send Scroll
export const PixelShare: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Top Right Node */}
    <rect x="11" y="1" width="4" height="4" />
    {/* Bottom Right Node */}
    <rect x="11" y="11" width="4" height="4" />
    {/* Left Central Node */}
    <rect x="1" y="6" width="4" height="4" />
    {/* Connection Struts */}
    <rect x="5" y="5" width="3" height="2" />
    <rect x="8" y="3" width="3" height="2" />
    <rect x="5" y="9" width="3" height="2" />
    <rect x="8" y="11" width="3" height="2" />
  </svg>
);

// 39. Arrow Left
export const PixelArrowLeft: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="6" y="2" width="2" height="2" />
    <rect x="4" y="4" width="2" height="2" />
    <rect x="2" y="6" width="2" height="4" />
    <rect x="4" y="10" width="2" height="2" />
    <rect x="6" y="12" width="2" height="2" />
    {/* Arrow shaft */}
    <rect x="4" y="7" width="10" height="2" />
  </svg>
);

// 40. Ghost (Lost Souls / Empty Dev)
export const PixelGhost: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="5" y="2" width="6" height="2" />
    <rect x="3" y="4" width="10" height="8" />
    {/* Eyes */}
    <rect x="5" y="5" width="2" height="2" fill="#08090d" />
    <rect x="9" y="5" width="2" height="2" fill="#08090d" />
    {/* Tattered Rags Bottom */}
    <rect x="3" y="12" width="2" height="2" />
    <rect x="7" y="12" width="2" height="2" />
    <rect x="11" y="12" width="2" height="2" />
  </svg>
);

// 41. Heart (HP)
export const PixelHeart: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    <rect x="2" y="3" width="4" height="2" />
    <rect x="10" y="3" width="4" height="2" />
    <rect x="1" y="5" width="14" height="4" />
    <rect x="2" y="9" width="12" height="2" />
    <rect x="4" y="11" width="8" height="2" />
    <rect x="6" y="13" width="4" height="1" />
    <rect x="7" y="14" width="2" height="1" />
  </svg>
);

// 42. Potion Flask
export const PixelPotion: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Cork */}
    <rect x="6" y="1" width="4" height="2" fill="#b45309" />
    {/* Bottle Neck */}
    <rect x="6" y="3" width="4" height="3" />
    {/* Body */}
    <rect x="3" y="6" width="10" height="8" />
    <rect x="4" y="14" width="8" height="1" />
    {/* Highlight sheen */}
    <rect x="4" y="8" width="1" height="4" fill="#fff" opacity="0.7" />
  </svg>
);

// 43. Calendar (Consistency)
export const PixelCalendar: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Hooks */}
    <rect x="4" y="1" width="2" height="2" />
    <rect x="10" y="1" width="2" height="2" />
    {/* Top Header */}
    <rect x="2" y="3" width="12" height="3" fill="#ef4444" />
    {/* Body */}
    <rect x="2" y="6" width="12" height="8" />
    {/* Grid Days Cutouts */}
    <rect x="4" y="8" width="2" height="2" fill="#08090d" />
    <rect x="7" y="8" width="2" height="2" fill="#08090d" />
    <rect x="10" y="8" width="2" height="2" fill="#08090d" />
    <rect x="4" y="11" width="2" height="2" fill="#08090d" />
    <rect x="7" y="11" width="2" height="2" fill="#08090d" />
  </svg>
);

// 44. Bow & Arrow (Ranger)
export const PixelBow: React.FC<PixelIconProps> = (props) => (
  <svg {...baseProps(props)}>
    {/* Stave Curve */}
    <rect x="3" y="1" width="2" height="3" />
    <rect x="1" y="4" width="2" height="8" />
    <rect x="3" y="12" width="2" height="3" />
    {/* Bowstring */}
    <rect x="4" y="3" width="1" height="10" opacity="0.6" />
    {/* Arrow */}
    <rect x="4" y="7" width="10" height="2" fill="#fbbf24" />
    <rect x="12" y="6" width="2" height="4" fill="#ef4444" />
  </svg>
);
