"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { IconMoon, IconSun, IconFlame, IconBat, IconSnowflake } from "@/components/Icons";

const themes: { id: string; label: string; icon: ReactNode }[] = [
  { id: "one-dark", label: "One Dark", icon: <IconMoon /> },
  { id: "github-light", label: "GitHub Light", icon: <IconSun /> },
  { id: "monokai", label: "Monokai Pro", icon: <IconFlame /> },
  { id: "dracula", label: "Dracula", icon: <IconBat /> },
  { id: "nord", label: "Nord", icon: <IconSnowflake /> },
];

export default function ThemeSwitcher() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("algoarena-theme") || "one-dark";
    const idx = themes.findIndex((t) => t.id === saved);
    setIndex(idx >= 0 ? idx : 0);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const next = (index + 1) % themes.length;
    setIndex(next);
    document.documentElement.setAttribute("data-theme", themes[next].id);
    localStorage.setItem("algoarena-theme", themes[next].id);
  };

  if (!mounted) return null;

  const current = themes[index];

  return (
    <button
      className="theme-cycle-btn"
      onClick={cycleTheme}
      title={`Theme: ${current.label} — Click to switch`}
      aria-label={`Current theme: ${current.label}. Click to cycle.`}
    >
      <span className="theme-cycle-emoji">{current.icon}</span>
      <span className="theme-cycle-label">{current.label}</span>
    </button>
  );
}
