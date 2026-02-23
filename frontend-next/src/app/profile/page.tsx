"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { ThemePicker } from "@/components/ThemeSelector";

import { ProfileHero } from "@/components/profile/ProfileHero";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { ProgressSection } from "@/components/profile/ProgressSection";
import { ActivityHeatmap } from "@/components/profile/ActivityHeatmap";
import { BadgesGrid } from "@/components/profile/BadgesGrid";
import { SubmissionHistory } from "@/components/profile/SubmissionHistory";

interface DiffStat {
  total: number;
  solved: number;
}

interface Stats {
  total_problems: number;
  solved: number;
  attempted: number;
  pass_rate: number;
  total_submissions: number;
  by_difficulty?: Record<string, DiffStat>;
  recent_activity?: { date: string; count: number }[];
  current_streak?: number;
  longest_streak?: number;
  active_days?: number;
}

interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    const uname = localStorage.getItem("username");
    const token = localStorage.getItem("token");
    if (!uid || !token) {
      router.push("/login");
      return;
    }
    setUsername(uname || "User");

    const base = getApiBase();
    Promise.all([
      fetchJSON<Stats>(`${base}/api/v1/stats`),
      fetchJSON<Submission[]>(`${base}/api/v1/submissions`),
    ])
      .then(([s, sub]) => {
        setStats(s ?? null);
        setSubmissions(Array.isArray(sub) ? sub : []);
      })
      .catch(() => {});
  }, [router]);

  const initial = username ? username.charAt(0).toUpperCase() : "?";

  const totalProblems = stats?.total_problems ?? 0;
  const solved = stats?.solved ?? 0;
  const rawDiff = stats?.by_difficulty ?? {};
  const byDiff = {
    easy: rawDiff["Easy"]?.solved ?? rawDiff["easy"]?.solved ?? 0,
    medium: rawDiff["Medium"]?.solved ?? rawDiff["medium"]?.solved ?? 0,
    hard: rawDiff["Hard"]?.solved ?? rawDiff["hard"]?.solved ?? 0,
  };
  const byDiffTotal = {
    easy: rawDiff["Easy"]?.total ?? rawDiff["easy"]?.total ?? 0,
    medium: rawDiff["Medium"]?.total ?? rawDiff["medium"]?.total ?? 0,
    hard: rawDiff["Hard"]?.total ?? rawDiff["hard"]?.total ?? 0,
  };

  return (
    <>
      <div className="bg-animated">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>
      <div className="bg-grid" />
      <Navbar />

      <div className="page-body">
        <ProfileHero username={username} initial={initial} />

        <StatsGrid solved={solved} byDiff={byDiff} />

        <ProgressSection
          solved={solved}
          totalProblems={totalProblems}
          byDiff={byDiff}
          byDiffTotal={byDiffTotal}
        />

        <ActivityHeatmap stats={stats} />

        <BadgesGrid
          solved={solved}
          byDiff={byDiff}
          totalProblems={totalProblems}
        />

        <div className="fade-in-up" style={{ animationDelay: "0.5s" }}>
          <h3 className="section-title">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </h3>
          <div className="settings-section stagger">
            <div className="settings-row">
              <div className="settings-info">
                <h4>Theme</h4>
                <p>
                  Choose your preferred editor theme. Applied across all pages.
                </p>
              </div>
            </div>
            <ThemePicker />
          </div>
        </div>

        <SubmissionHistory submissions={submissions} />
      </div>
    </>
  );
}
