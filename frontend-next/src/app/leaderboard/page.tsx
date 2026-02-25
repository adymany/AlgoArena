"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Toast, { showToast } from "@/components/Toast";

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  solved: number;
  total_submissions: number;
  pass_rate: number;
  last_active: string | null;
}

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  earned: boolean;
}

interface AchievementsData {
  achievements: Achievement[];
  stats: {
    solved: number;
    total_problems: number;
    total_submissions: number;
    pass_rate: number;
    current_streak: number;
    longest_streak: number;
    attempted: number;
  };
}

const ICON_MAP: Record<string, JSX.Element> = {
  flag: (
    <svg viewBox="0 0 24 24">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2c1 4-2 6-2 10a4 4 0 1 0 8 0c0-4-3-6-2-10" />
      <path d="M12 22a4 4 0 0 1-4-4c0-2 1-3 2-5" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3 6v3h-8v-3c-1.7-1.3-3-3.5-3-6a7 7 0 0 1 7-7z" />
      <line x1="9" y1="18" x2="9" y2="22" />
      <line x1="15" y1="18" x2="15" y2="22" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M4 22h16" />
      <path d="M10 22V9" />
      <path d="M14 22V9" />
      <rect x="6" y="2" width="12" height="7" rx="1" />
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementsData | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"leaderboard" | "achievements">(
    "leaderboard",
  );
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");
    if (!uid || !token) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(Number(uid));

    const base = getApiBase();
    Promise.all([
      fetchJSON<LeaderboardEntry[]>(`${base}/api/v1/leaderboard`),
      fetchJSON<AchievementsData>(`${base}/api/v1/achievements`),
    ])
      .then(([lb, ach]) => {
        setLeaderboard(Array.isArray(lb) ? lb : []);
        if (ach) setAchievements(ach);
      })
      .catch(() => showToast("Failed to load leaderboard", "error"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const earnedCount =
    achievements?.achievements.filter((a) => a.earned).length ?? 0;
  const totalAch = achievements?.achievements.length ?? 0;

  return (
    <>
      <div className="bg-animated">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>
      <div className="bg-grid" />
      <Toast />
      <Navbar />

      <div className="page-body">
        {/* Tab Switcher */}
        <div className="lb-tabs">
          <button
            className={`lb-tab${activeTab === "leaderboard" ? " active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
              <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
              <rect x="6" y="2" width="12" height="7" rx="1" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 20v2" />
            </svg>
            Leaderboard
          </button>
          <button
            className={`lb-tab${activeTab === "achievements" ? " active" : ""}`}
            onClick={() => setActiveTab("achievements")}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            Achievements
            {earnedCount > 0 && (
              <span className="lb-tab-badge">
                {earnedCount}/{totalAch}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="page-skeleton fade-in">
            {/* Podium skeleton */}
            <div className="skeleton-podium">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton skeleton-podium-card"
                  style={{ height: i === 2 ? 180 : 150 }}
                />
              ))}
            </div>
            {/* Table skeleton */}
            <div className="skeleton-table">
              <div className="skeleton-table-header">
                {[60, 150, 80, 100, 80].map((w, i) => (
                  <div
                    key={i}
                    className="skeleton skeleton-text"
                    style={{ width: w, marginBottom: 0 }}
                  />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-row">
                  <div
                    className="skeleton skeleton-avatar"
                    style={{ width: 28, height: 28 }}
                  />
                  <div
                    className="skeleton skeleton-text md"
                    style={{ marginBottom: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Leaderboard View */}
            {activeTab === "leaderboard" && (
              <div className="fade-in-up">
                <div className="lb-podium">
                  {leaderboard.slice(0, 3).map((entry, i) => {
                    const podiumOrder = [1, 0, 2];
                    const e = leaderboard[podiumOrder[i]];
                    if (!e) return null;
                    const isFirst = podiumOrder[i] === 0;
                    return (
                      <div
                        key={e.user_id}
                        className={`lb-podium-card ${isFirst ? "lb-podium-first" : ""}`}
                        style={{
                          animationDelay: `${0.1 * i}s`,
                          order: i,
                        }}
                      >
                        <div
                          className="lb-podium-rank"
                          style={{ color: RANK_COLORS[podiumOrder[i]] }}
                        >
                          #{e.rank}
                        </div>
                        <div
                          className="lb-podium-avatar"
                          style={{ background: RANK_COLORS[podiumOrder[i]] }}
                        >
                          {e.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="lb-podium-name">{e.username}</div>
                        <div className="lb-podium-stat">{e.solved} solved</div>
                        <div className="lb-podium-sub">
                          {e.pass_rate}% pass rate
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="problems-table" style={{ marginTop: 24 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Rank</th>
                        <th>User</th>
                        <th>Solved</th>
                        <th>Submissions</th>
                        <th>Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody className="stagger">
                      {leaderboard.map((e, i) => (
                        <tr
                          key={e.user_id}
                          className={
                            e.user_id === currentUserId ? "lb-highlight" : ""
                          }
                          style={{ animationDelay: `${0.03 * i}s` }}
                        >
                          <td>
                            <span
                              className="lb-rank"
                              style={{
                                color:
                                  e.rank <= 3
                                    ? RANK_COLORS[e.rank - 1]
                                    : "var(--text-muted)",
                                fontWeight: e.rank <= 3 ? 800 : 600,
                              }}
                            >
                              {e.rank <= 3 ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  style={{
                                    width: 16,
                                    height: 16,
                                    fill: RANK_COLORS[e.rank - 1],
                                    stroke: "none",
                                  }}
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ) : (
                                `#${e.rank}`
                              )}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                className="lb-table-avatar"
                                style={{
                                  background:
                                    e.rank <= 3
                                      ? RANK_COLORS[e.rank - 1]
                                      : "var(--accent-gradient)",
                                }}
                              >
                                {e.username.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>
                                {e.username}
                              </span>
                              {e.user_id === currentUserId && (
                                <span
                                  className="diff-badge diff-easy"
                                  style={{ fontSize: 10, padding: "2px 6px" }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                            }}
                          >
                            {e.solved}
                          </td>
                          <td>{e.total_submissions}</td>
                          <td>
                            <div className="accept-bar" style={{ width: 80 }}>
                              <div
                                className="accept-fill"
                                style={{ width: `${e.pass_rate}%` }}
                              />
                            </div>
                            <span className="accept-text">{e.pass_rate}%</span>
                          </td>
                        </tr>
                      ))}
                      {leaderboard.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              color: "var(--text-muted)",
                              padding: 40,
                            }}
                          >
                            No data yet. Start solving problems!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Achievements View */}
            {activeTab === "achievements" && achievements && (
              <div className="fade-in-up">
                <div className="ach-summary">
                  <div className="ach-progress-ring">
                    <svg viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="var(--border-color)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(earnedCount / totalAch) * 327} 327`}
                        transform="rotate(-90 60 60)"
                        style={{ transition: "stroke-dasharray 0.8s ease" }}
                      />
                    </svg>
                    <div className="ach-progress-text">
                      <span className="ach-progress-num">{earnedCount}</span>
                      <span className="ach-progress-den">/ {totalAch}</span>
                    </div>
                  </div>
                  <div className="ach-summary-info">
                    <h2>Your Achievements</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                      {earnedCount === 0
                        ? "Start solving problems to unlock achievements!"
                        : earnedCount === totalAch
                          ? "Incredible! You've unlocked every achievement! 🏆"
                          : `You've earned ${earnedCount} out of ${totalAch} achievements. Keep going!`}
                    </p>
                    <div className="ach-mini-stats">
                      <span>
                        <strong>{achievements.stats.solved}</strong> solved
                      </span>
                      <span>
                        <strong>{achievements.stats.current_streak}</strong> day
                        streak
                      </span>
                      <span>
                        <strong>{achievements.stats.pass_rate}%</strong> pass
                        rate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ach-grid stagger">
                  {achievements.achievements.map((ach, i) => (
                    <div
                      key={ach.id}
                      className={`ach-card ${ach.earned ? "ach-earned" : "ach-locked"}`}
                      style={{ animationDelay: `${0.06 * i}s` }}
                    >
                      <div className="ach-icon">
                        {ICON_MAP[ach.icon] || ICON_MAP.star}
                      </div>
                      <div className="ach-info">
                        <h4>{ach.title}</h4>
                        <p>{ach.desc}</p>
                      </div>
                      {ach.earned && (
                        <div className="ach-check">
                          <svg viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
