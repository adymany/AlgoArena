"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { ThemePicker } from "@/components/ThemeSelector";
import { IconFlag, IconFlame, IconLightning, IconBrain, IconDiamond, IconTrophy, IconTerminal, IconCode, IconCalendar } from "@/components/Icons";
import type { ReactNode } from "react";

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

const BADGES: { icon: ReactNode; title: string; desc: string; color: string }[] = [
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

  // Donut chart calculations
  const circumference = 2 * Math.PI * 70;
  const easyLen =
    totalProblems > 0 ? (byDiff.easy / totalProblems) * circumference : 0;
  const medLen =
    totalProblems > 0 ? (byDiff.medium / totalProblems) * circumference : 0;
  const hardLen =
    totalProblems > 0 ? (byDiff.hard / totalProblems) * circumference : 0;

  // Heatmap — real data from backend (365 days → columns of 7)
  const heatmapData = useMemo(() => {
    const ra = stats?.recent_activity;
    if (!ra || ra.length === 0) return { cells: [] as { count: number; date: string }[], months: [] as { label: string; col: number }[] };

    // The API returns 365 entries (oldest first).
    // We need to align so the grid starts on a Sunday.
    const firstDate = new Date(ra[0].date + "T00:00:00");
    const padBefore = firstDate.getDay(); // 0=Sun..6=Sat
    const padded: { count: number; date: string }[] = [];
    for (let i = 0; i < padBefore; i++) padded.push({ count: -1, date: "" }); // -1 = empty
    for (const entry of ra) padded.push({ count: entry.count, date: entry.date });
    // Pad end to full week
    while (padded.length % 7 !== 0) padded.push({ count: -1, date: "" });

    // Compute month labels (at first occurrence of each month)
    const months: { label: string; col: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let lastMonth = -1;
    for (let i = 0; i < padded.length; i++) {
      if (!padded[i].date) continue;
      const m = new Date(padded[i].date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        months.push({ label: monthNames[m], col: Math.floor(i / 7) });
      }
    }

    return { cells: padded, months };
  }, [stats]);

  const heatmapLevel = (v: number) => {
    if (v <= 0) return "";
    if (v === 1) return "l1";
    if (v === 2) return "l2";
    if (v === 3) return "l3";
    return "l4";
  };

  const totalWeeks = Math.ceil(heatmapData.cells.length / 7);
  // Progress bar counts — use actual totals from backend
  const easyTotal = Math.max(byDiffTotal.easy, 1);
  const medTotal = Math.max(byDiffTotal.medium, 1);
  const hardTotal = Math.max(byDiffTotal.hard, 1);

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
        {/* Profile Hero */}
        <div className="profile-hero fade-in-up">
          <div className="avatar-ring">
            <div className="avatar-inner">{initial}</div>
            <div className="avatar-status" />
          </div>
          <h2 className="profile-name">{username}</h2>
          <p className="profile-handle">@{username.toLowerCase()}</p>
          <p className="profile-bio">
            Competitive programmer | Algorithm enthusiast | Learning something
            new every day
          </p>
          <div className="profile-tags">
            <span className="profile-tag"><IconTerminal style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} /> Python</span>
            <span className="profile-tag"><IconCode style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} /> C++</span>
            <span className="profile-tag"><IconCalendar style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} /> Joined 2025</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid stagger">
          <div className="stat-box">
            <div className="stat-big accent">{solved}</div>
            <div className="stat-label-sm">Solved</div>
          </div>
          <div className="stat-box">
            <div className="stat-big easy">{byDiff.easy}</div>
            <div className="stat-label-sm">Easy</div>
          </div>
          <div className="stat-box">
            <div className="stat-big medium">{byDiff.medium}</div>
            <div className="stat-label-sm">Medium</div>
          </div>
          <div className="stat-box">
            <div className="stat-big hard">{byDiff.hard}</div>
            <div className="stat-label-sm">Hard</div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="progress-row">
          <div className="donut-wrap">
            <svg viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--bg-input)"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--diff-easy)"
                strokeWidth="12"
                strokeDasharray={`${easyLen} ${circumference - easyLen}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--diff-medium)"
                strokeWidth="12"
                strokeDasharray={`${medLen} ${circumference - medLen}`}
                strokeDashoffset={`${-easyLen}`}
                strokeLinecap="round"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="var(--diff-hard)"
                strokeWidth="12"
                strokeDasharray={`${hardLen} ${circumference - hardLen}`}
                strokeDashoffset={`${-(easyLen + medLen)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="donut-center">
              <div className="donut-count">{solved}</div>
              <div className="donut-total">/ {totalProblems}</div>
            </div>
          </div>

          <div className="progress-bars">
            <div className="prog-item">
              <label>
                <span>Easy</span>
                <span>
                  {byDiff.easy} / {Math.round(easyTotal)}
                </span>
              </label>
              <div className="prog-track">
                <div
                  className="prog-fill easy"
                  style={{ width: `${(byDiff.easy / easyTotal) * 100}%` }}
                />
              </div>
            </div>
            <div className="prog-item">
              <label>
                <span>Medium</span>
                <span>
                  {byDiff.medium} / {Math.round(medTotal)}
                </span>
              </label>
              <div className="prog-track">
                <div
                  className="prog-fill medium"
                  style={{ width: `${(byDiff.medium / medTotal) * 100}%` }}
                />
              </div>
            </div>
            <div className="prog-item">
              <label>
                <span>Hard</span>
                <span>
                  {byDiff.hard} / {Math.round(hardTotal)}
                </span>
              </label>
              <div className="prog-track">
                <div
                  className="prog-fill hard"
                  style={{ width: `${(byDiff.hard / hardTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <h3 className="section-title">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Activity Heatmap
        </h3>

        {/* Streak / calendar stats */}
        <div className="heatmap-stats">
          <div className="hm-stat">
            <span className="hm-stat-value">{stats?.total_submissions ?? 0}</span>
            <span className="hm-stat-label">Total submissions</span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-value">{stats?.active_days ?? 0}</span>
            <span className="hm-stat-label">Active days</span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-value">{stats?.current_streak ?? 0}</span>
            <span className="hm-stat-label">Current streak</span>
          </div>
          <div className="hm-stat">
            <span className="hm-stat-value">{stats?.longest_streak ?? 0}</span>
            <span className="hm-stat-label">Max streak</span>
          </div>
        </div>

        <div className="heatmap-card">
          {/* Month labels */}
          <div className="hm-months" style={{ gridTemplateColumns: `24px repeat(${totalWeeks}, 1fr)` }}>
            <span />
            {Array.from({ length: totalWeeks }, (_, col) => {
              const m = heatmapData.months.find((x) => x.col === col);
              return <span key={col} className="hm-month-label">{m ? m.label : ""}</span>;
            })}
          </div>

          <div className="hm-grid-wrap">
            {/* Day labels */}
            <div className="hm-day-labels">
              <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
            </div>

            {/* Grid */}
            <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${totalWeeks}, 1fr)` }}>
              {heatmapData.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`hm-cell ${cell.count < 0 ? "hm-empty" : heatmapLevel(cell.count)}`}
                  title={cell.date ? `${cell.date}: ${cell.count} submission${cell.count !== 1 ? "s" : ""}` : ""}
                />
              ))}
            </div>
          </div>

          <div className="heatmap-footer">
            <span>
              {stats?.total_submissions ?? 0} submissions in the past year
            </span>
            <div className="hm-legend">
              <span>Less</span>
              <div className="hm-cell" />
              <div className="hm-cell l1" />
              <div className="hm-cell l2" />
              <div className="hm-cell l3" />
              <div className="hm-cell l4" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Badges */}
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

        {/* Settings — Theme */}
        <h3 className="section-title">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </h3>
        <div className="settings-section">
          <div className="settings-row">
            <div className="settings-info">
              <h4>Theme</h4>
              <p>Choose your preferred editor theme. Applied across all pages.</p>
            </div>
          </div>
          <ThemePicker />
        </div>

        {/* Submission History */}
        <h3 className="section-title">
          <svg viewBox="0 0 24 24">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Recent Submissions
        </h3>
        <div className="heatmap-card" style={{ overflow: "auto" }}>
          <table className="sub-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Language</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 20).map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {s.problem_id}
                  </td>
                  <td>{s.language}</td>
                  <td>
                    <span
                      className={`sub-status ${
                        s.status === "Pass"
                          ? "accepted"
                          : s.status === "TLE"
                            ? "tle"
                            : "wrong"
                      }`}
                    >
                      {s.status === "Pass"
                        ? "Accepted"
                        : s.status === "TLE"
                          ? "Time Limit Exceeded"
                          : "Wrong Answer"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: 32,
                    }}
                  >
                    No submissions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
