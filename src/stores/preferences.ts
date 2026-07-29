"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type PreferencesState = {
  cityId: string;
  setCityId: (cityId: string) => void;
};

/** City scope for the catalog, persisted like a real account setting would be. */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      cityId: "city-baku",
      setCityId: (cityId) => set({ cityId }),
    }),
    { name: "iki-preferences" },
  ),
);
