"use client";

import type { AppTheme } from "@/components/nav/useThemePreference";

export function ThemeToggleSwitch(props: {
  theme: AppTheme;
  onToggle: () => void;
  compact?: boolean;
}) {
  const isDark = props.theme === "dark";

  return (
    <button
      className={`themeToggle ${isDark ? "themeToggleDark" : "themeTogglePoster"} ${props.compact ? "themeToggleCompact" : ""}`}
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={props.onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="themeToggleTrack" aria-hidden="true">
        <span className="themeToggleOrb">
          <span className="themeToggleSun" />
          <span className="themeToggleMoon" />
          <span className="themeToggleSpark themeToggleSparkA" />
          <span className="themeToggleSpark themeToggleSparkB" />
        </span>
      </span>
      <span className="themeToggleText">
        <span className="themeToggleTitle">{isDark ? "Dark mode" : "Light mode"}</span>
        <span className="themeToggleSub">{isDark ? "Midnight glow" : "Golden glow"}</span>
      </span>
    </button>
  );
}
