"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type FavoritesState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

/**
 * Saved listings. Persisted to localStorage so a demo survives a page reload —
 * the closest stand-in for a real account without building one.
 */
export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((value) => value !== id)
            : [id, ...state.ids],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: "iki-favorites" },
  ),
);
