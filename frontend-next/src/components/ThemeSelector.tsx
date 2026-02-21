"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { IconMoon, IconSun, IconFlame, IconBat, IconSnowflake } from "@/components/Icons";

export const THEMES: readonly { id: string; label: string; icon: ReactNode; preview: { bg: string; sidebar: string; accent: string; text: string } }[] = [
  { id: "one-dark", label: "One Dark", icon: <IconMoon />, preview: { bg: "#282c34", sidebar: "#21252b", accent: "#61afef", text: "#abb2bf" } },
  { id: "github-light", label: "GitHub Light", icon: <IconSun />, preview: { bg: "#ffffff", sidebar: "#f6f8fa", accent: "#0969da", text: "#656d76" } },
  { id: "monokai", label: "Monokai Pro", icon: <IconFlame />, preview: { bg: "#272822", sidebar: "#1e1f1c", accent: "#a6e22e", text: "#f8f8f2" } },
  { id: "dracula", label: "Dracula", icon: <IconBat />, preview: { bg: "#282a36", sidebar: "#1e1f29", accent: "#bd93f9", text: "#f8f8f2" } },
  { id: "nord", label: "Nord", icon: <IconSnowflake />, preview: { bg: "#2e3440", sidebar: "#3b4252", accent: "#88c0d0", text: "#d8dee9" } },
] as const;

/** Hook to read & set the current theme. SSR-safe. */
export function useTheme() {
  const [themeId, setThemeId] = useState("one-dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("algoarena-theme") || "one-dark";
    setThemeId(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("algoarena-theme", id);
  }, []);

  return { themeId, setTheme, mounted };
}

/** Full theme picker grid — used in profile settings & tutorial */
export function ThemePicker({ onSelect }: { onSelect?: (id: string) => void }) {
  const { themeId, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  const handleSelect = (id: string) => {
    setTheme(id);
    onSelect?.(id);
  };

  return (
    <div className="theme-picker-grid">
      {THEMES.map((t) => {
        const active = themeId === t.id;
        return (
          <button
            key={t.id}
            className={`theme-card${active ? " active" : ""}`}
            onClick={() => handleSelect(t.id)}
            aria-label={`Select ${t.label} theme`}
          >
            {/* Mini preview */}
            <div className="theme-preview" style={{ background: t.preview.bg }}>
              <div className="theme-preview-sidebar" style={{ background: t.preview.sidebar }}>
                <div className="tp-dot" style={{ background: t.preview.accent }} />
                <div className="tp-dot" style={{ background: t.preview.text, opacity: 0.4 }} />
                <div className="tp-dot" style={{ background: t.preview.text, opacity: 0.3 }} />
              </div>
              <div className="theme-preview-editor">
                <div className="tp-line" style={{ background: t.preview.accent, width: "60%" }} />
                <div className="tp-line" style={{ background: t.preview.text, width: "80%", opacity: 0.5 }} />
                <div className="tp-line" style={{ background: t.preview.text, width: "45%", opacity: 0.35 }} />
              </div>
            </div>
            <div className="theme-card-footer">
              <span className="theme-card-emoji">{t.icon}</span>
              <span className="theme-card-name">{t.label}</span>
              {active && (
                <svg className="theme-card-check" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Compact inline theme toggle for navbar — cycles through themes */
export function ThemeToggle() {
  const { themeId, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  const idx = THEMES.findIndex((t) => t.id === themeId);
  const current = THEMES[idx >= 0 ? idx : 0];

  const cycleTheme = () => {
    const next = ((idx >= 0 ? idx : 0) + 1) % THEMES.length;
    setTheme(THEMES[next].id);
  };

  return (
    <button
      className="theme-toggle-btn"
      onClick={cycleTheme}
      title={`Theme: ${current.label}`}
      aria-label={`Current theme: ${current.label}. Click to switch.`}
    >
      <span className="theme-toggle-emoji">{current.icon}</span>
    </button>
  );
}
