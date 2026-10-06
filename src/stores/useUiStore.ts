import { create } from "zustand";
import { SupportedLanguage } from "@/i18n";

export type ReducedMotionOption = "system" | "reduced" | "standard";

interface UiState {
  language: SupportedLanguage;
  audioEnabled: boolean;
  reducedMotion: ReducedMotionOption;

  setLanguage: (lang: SupportedLanguage) => void;
  setAudioEnabled: (enabled: boolean) => void;
  toggleAudio: () => void;
  setReducedMotion: (option: ReducedMotionOption) => void;
}

export const useUiStore = create<UiState>((set) => ({
  language: "pt-BR",
  audioEnabled: false, // Default is strictly OFF as per spec
  reducedMotion: "system",

  setLanguage: (language) => set({ language }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
