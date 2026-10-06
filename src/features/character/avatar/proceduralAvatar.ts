import { createMulberry32, randChoice, randInt } from "@/data/seed/hashAndPrng";

export interface AvatarAttributes {
  bgGradientStart: string;
  bgGradientEnd: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  armorColor: string;
  accentColor: string;
  headwearType: number; // 0 to 4
  facialHairType: number; // 0 to 3
  runeType: number; // 0 to 3
}

export function generateAvatarAttributes(seed: number): AvatarAttributes {
  const rng = createMulberry32(seed);

  const BG_STARTS = ["#1e1b4b", "#14532d", "#7f1d1d", "#4c1d95", "#0c4a6e", "#3f2c13"];
  const BG_ENDS = ["#09090b", "#022c22", "#450a0a", "#2e1065", "#082f49", "#1c1917"];
  const SKINS = ["#fbcfe8", "#fed7aa", "#fde047", "#f5d0fe", "#bae6fd", "#d1d5db"];
  const HAIRS = ["#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#e2e8f0", "#78716c", "#10b981"];
  const EYES = ["#38bdf8", "#fbbf24", "#a855f7", "#ef4444", "#34d399"];
  const ARMORS = ["#334155", "#475569", "#78350f", "#581c87", "#1e293b", "#3b0764"];
  const ACCENTS = ["#fbbf24", "#38bdf8", "#c084fc", "#f87171", "#4ade80"];

  return {
    bgGradientStart: randChoice(rng, BG_STARTS),
    bgGradientEnd: randChoice(rng, BG_ENDS),
    skinColor: randChoice(rng, SKINS),
    hairColor: randChoice(rng, HAIRS),
    eyeColor: randChoice(rng, EYES),
    armorColor: randChoice(rng, ARMORS),
    accentColor: randChoice(rng, ACCENTS),
    headwearType: randInt(rng, 0, 4),
    facialHairType: randInt(rng, 0, 3),
    runeType: randInt(rng, 0, 3),
  };
}

export function renderProceduralAvatarSvg(seed: number, size: number = 96): string {
  const attrs = generateAvatarAttributes(seed);

  return `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar procedural de aventureiro">
  <defs>
    <linearGradient id="avatar-bg-${seed}" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${attrs.bgGradientStart}" />
      <stop offset="100%" stop-color="${attrs.bgGradientEnd}" />
    </linearGradient>
    <filter id="pixel-shadow-${seed}">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Background Shield/Plate -->
  <rect x="4" y="4" width="92" height="92" fill="url(#avatar-bg-${seed})" stroke="${attrs.accentColor}" stroke-width="3" filter="url(#pixel-shadow-${seed})" />

  <!-- Corner Runes -->
  <rect x="6" y="6" width="4" height="4" fill="${attrs.accentColor}" />
  <rect x="90" y="6" width="4" height="4" fill="${attrs.accentColor}" />
  <rect x="6" y="90" width="4" height="4" fill="${attrs.accentColor}" />
  <rect x="90" y="90" width="4" height="4" fill="${attrs.accentColor}" />

  <!-- Shoulder Armor / Cloak -->
  <path d="M20 92 L20 74 L32 68 L50 72 L68 68 L80 74 L80 92 Z" fill="${attrs.armorColor}" stroke="#000000" stroke-width="2" />
  <rect x="36" y="74" width="28" height="18" fill="${attrs.accentColor}" opacity="0.8" />
  <!-- Armor Clasp -->
  <circle cx="50" cy="74" r="4" fill="#fbbf24" stroke="#000000" stroke-width="1.5" />

  <!-- Neck -->
  <rect x="44" y="58" width="12" height="14" fill="${attrs.skinColor}" stroke="#000000" stroke-width="1.5" />

  <!-- Face / Head Base -->
  <rect x="32" y="30" width="36" height="34" fill="${attrs.skinColor}" stroke="#000000" stroke-width="2" />

  <!-- Hair / Ears -->
  <rect x="28" y="40" width="4" height="8" fill="${attrs.skinColor}" stroke="#000000" stroke-width="1" />
  <rect x="68" y="40" width="4" height="8" fill="${attrs.skinColor}" stroke="#000000" stroke-width="1" />

  <!-- Eyes (Pixelated Glow) -->
  <rect x="38" y="42" width="6" height="4" fill="#000000" />
  <rect x="39" y="43" width="4" height="2" fill="${attrs.eyeColor}" />
  <rect x="56" y="42" width="6" height="4" fill="#000000" />
  <rect x="57" y="43" width="4" height="2" fill="${attrs.eyeColor}" />

  <!-- Eyebrows -->
  <rect x="37" y="38" width="8" height="2" fill="${attrs.hairColor}" />
  <rect x="55" y="38" width="8" height="2" fill="${attrs.hairColor}" />

  <!-- Mouth -->
  <rect x="46" y="54" width="8" height="2" fill="#7f1d1d" />

  <!-- Headwear / Helmet based on headwearType -->
  ${
    attrs.headwearType === 0
      ? `<!-- Wizard Hood -->
         <path d="M26 30 L50 12 L74 30 L68 38 L32 38 Z" fill="${attrs.armorColor}" stroke="#000000" stroke-width="2" />
         <circle cx="50" cy="14" r="3" fill="${attrs.accentColor}" />`
      : attrs.headwearType === 1
      ? `<!-- Knight Helm -->
         <rect x="30" y="22" width="40" height="14" fill="${attrs.armorColor}" stroke="#000000" stroke-width="2" />
         <rect x="46" y="16" width="8" height="8" fill="${attrs.accentColor}" stroke="#000000" stroke-width="1" />
         <rect x="34" y="32" width="32" height="4" fill="#000000" />`
      : attrs.headwearType === 2
      ? `<!-- Alchemist Goggles -->
         <rect x="30" y="24" width="40" height="8" fill="${attrs.hairColor}" />
         <circle cx="41" cy="34" r="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
         <circle cx="59" cy="34" r="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />`
      : attrs.headwearType === 3
      ? `<!-- Circlet / Crown -->
         <path d="M30 28 L36 18 L44 26 L50 16 L56 26 L64 18 L70 28 Z" fill="#fbbf24" stroke="#000000" stroke-width="2" />
         <circle cx="50" cy="22" r="2" fill="${attrs.accentColor}" />`
      : `<!-- Rogue Bandana -->
         <rect x="30" y="26" width="40" height="8" fill="${attrs.accentColor}" stroke="#000000" stroke-width="2" />
         <rect x="42" y="52" width="16" height="8" fill="${attrs.accentColor}" opacity="0.9" />`
  }

  <!-- Facial Hair / Adornment -->
  ${
    attrs.facialHairType === 1
      ? `<path d="M42 58 L50 66 L58 58 Z" fill="${attrs.hairColor}" />`
      : attrs.facialHairType === 2
      ? `<rect x="40" y="56" width="20" height="4" fill="${attrs.hairColor}" />`
      : ""
  }
</svg>
  `.trim();
}
