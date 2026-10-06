import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/design-system/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rpg: {
          void: "#08090d",
          obsidian: "#0e111a",
          surface: "#161b29",
          surfaceLight: "#20273a",
          border: "#29324b",
          borderLight: "#3d4b70",
          gold: "#f59e0b",
          goldLight: "#fbbf24",
          goldDark: "#b45309",
          arcane: "#a855f7",
          arcaneLight: "#c084fc",
          arcaneDark: "#7e22ce",
          crimson: "#ef4444",
          crimsonDark: "#991b1b",
          azure: "#06b6d4",
          azureDark: "#0e7490",
          emerald: "#10b981",
          emeraldDark: "#047857",
          parchment: "#f1e5c8",
          parchmentMuted: "#b8a88a",
        },
        rarity: {
          common: "#94a3b8",
          rare: "#38bdf8",
          epic: "#c084fc",
          legendary: "#fbbf24",
        },
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pixel: "2px 2px 0px 0px rgba(0, 0, 0, 0.8)",
        "pixel-gold": "0 0 15px rgba(245, 158, 11, 0.3), inset 0 0 8px rgba(245, 158, 11, 0.1)",
        "pixel-arcane": "0 0 15px rgba(168, 85, 247, 0.3), inset 0 0 8px rgba(168, 85, 247, 0.1)",
        "pixel-crimson": "0 0 15px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.1)",
        "pixel-azure": "0 0 15px rgba(6, 182, 212, 0.3), inset 0 0 8px rgba(6, 182, 212, 0.1)",
      },
      keyframes: {
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        glow: "glow 2.5s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "fade-rise": "fade-rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
