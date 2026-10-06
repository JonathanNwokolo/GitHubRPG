import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Which title each user chose to equip. Local to this browser (no backend in V1).
 * The engine never reads this: it only provides the unlocked titles and a default.
 */
interface TitleState {
  equippedByUser: Record<string, string>;
  equipTitle: (username: string, titleId: string) => void;
  clearEquippedTitle: (username: string) => void;
}

export const useTitleStore = create<TitleState>()(
  persist(
    (set) => ({
      equippedByUser: {},
      equipTitle: (username, titleId) =>
        set((state) => ({ equippedByUser: { ...state.equippedByUser, [username]: titleId } })),
      clearEquippedTitle: (username) =>
        set((state) => {
          const next = { ...state.equippedByUser };
          delete next[username];
          return { equippedByUser: next };
        }),
    }),
    {
      name: "github-rpg:equipped-titles",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ equippedByUser: state.equippedByUser }),
    }
  )
);
