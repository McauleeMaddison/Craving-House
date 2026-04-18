"use client";

import { useEffect, useState } from "react";

export type AppTheme = "poster" | "dark";

const THEME_STORAGE_KEY = "ch.theme";

function applyTheme(theme: AppTheme) {
  if (document.documentElement.dataset.theme === theme) return;
  document.documentElement.dataset.theme = theme;
}

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "poster";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark") return "dark";
  if (stored === "poster") return "poster";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "poster";
}

export function useThemePreference() {
  const [theme, setTheme] = useState<AppTheme>("poster");

  useEffect(() => {
    const nextTheme = readStoredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);

    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const synced = readStoredTheme();
      setTheme(synced);
      applyTheme(synced);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setThemePreference(nextTheme: AppTheme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function toggleTheme() {
    setThemePreference(theme === "poster" ? "dark" : "poster");
  }

  return { theme, toggleTheme };
}
