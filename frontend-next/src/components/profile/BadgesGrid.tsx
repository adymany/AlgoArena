import {
  IconFlag,
  IconFlame,
  IconLightning,
  IconBrain,
  IconDiamond,
  IconTrophy,
} from "@/components/Icons";
import type { ReactNode } from "react";

const BADGES: {
  icon: ReactNode;
  title: string;
  desc: string;
  color: string;
}[] = [
  {
    icon: <IconFlag />,
    title: "First Steps",
    desc: "Solved your first problem",
    color: "var(--diff-easy)",
  },
  {
    icon: <IconFlame />,
    title: "On Fire",
    desc: "3 day streak",
    color: "var(--diff-medium)",
  },
  {
    icon: <IconLightning />,
    title: "Speed Demon",
    desc: "Solved in under 5 min",
    color: "var(--accent-primary)",
  },
  {
    icon: <IconBrain />,
    title: "Big Brain",
    desc: "Solved a hard problem",
    color: "var(--diff-hard)",
  },
  {
    icon: <IconDiamond />,
    title: "Perfectionist",
    desc: "100% on first try",
    color: "var(--accent-secondary)",
  },
  {
    icon: <IconTrophy />,
    title: "Champion",
    desc: "All problems solved",
    color: "var(--warning)",
  },
];

interface BadgesGridProps {
  solved: number;
  byDiff: { easy: number; medium: number; hard: number };
  totalProblems: number;
}

export function BadgesGrid({ solved, byDiff, totalProblems }: BadgesGridProps) {
  return (
    <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
      <h3 className="section-title">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
        Badges &amp; Achievements
      </h3>
      <div className="badges-grid stagger">
        {BADGES.map((b, i) => {
          const earned =
            (i === 0 && solved > 0) ||
            (i === 3 && byDiff.hard > 0) ||
            (i === 5 && solved >= totalProblems && totalProblems > 0);
          return (
            <div
              key={i}
              className="badge-card"
              style={{ opacity: earned ? 1 : 0.4 }}
            >
              <div
                className="badge-icon"
                style={{ background: `${b.color}15`, fontSize: 26 }}
              >
                {b.icon}
              </div>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
