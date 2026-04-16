"use client";

import { useEffect, useState } from "react";

export type AppTheme = "poster" | "dark";

const THEME_STORAGE_KEY = "ch.theme";

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function useThemePreference() {
  const [theme, setTheme] = useState<AppTheme>("poster");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: AppTheme = stored === "dark" ? "dark" : "poster";
    setTheme(nextTheme);
    applyTheme(nextTheme);
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
