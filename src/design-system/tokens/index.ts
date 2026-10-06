export const tokens = {
  colors: {
    bg: {
      void: "#08090d",
      obsidian: "#0e111a",
      surface: "#161b29",
      surfaceLight: "#20273a",
    },
    border: {
      default: "#29324b",
      light: "#3d4b70",
      gold: "#b45309",
      arcane: "#7e22ce",
    },
    text: {
      parchment: "#f1e5c8",
      parchmentMuted: "#b8a88a",
      white: "#ffffff",
      muted: "#94a3b8",
    },
    accent: {
      gold: "#f59e0b",
      goldLight: "#fbbf24",
      goldDark: "#b45309",
      arcane: "#a855f7",
      arcaneLight: "#c084fc",
      arcaneDark: "#7e22ce",
      crimson: "#ef4444",
      azure: "#06b6d4",
      emerald: "#10b981",
    },
    rarity: {
      common: "#94a3b8",
      rare: "#38bdf8",
      epic: "#c084fc",
      legendary: "#fbbf24",
    },
  },
  typography: {
    fontPixel: "var(--font-pixel), monospace",
    fontSans: "var(--font-sans), system-ui, sans-serif",
  },
  borders: {
    pixel: "2px solid #29324b",
    pixelGold: "2px solid #b45309",
    pixelArcane: "2px solid #7e22ce",
  },
} as const;
