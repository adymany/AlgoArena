"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

interface AdminStats {
  users: { total: number; new_today: number; active_today: number };
  submissions: {
    total: number;
    today: number;
    pass_count: number;
    fail_count: number;
  };
  acceptance_rate: number;
  problems: { total: number; by_difficulty: Record<string, number> };
  hourly_activity: { hour: string; count: number }[];
  language_distribution: Record<string, number>;
  top_problems: {
    slug: string;
    title: string;
    submissions: number;
    acceptance: number;
  }[];
  recent_users: {
    id: number;
    username: string;
    joined: string;
    submissions: number;
    solved: number;
    last_active: string | null;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch(`${getApiBase()}/api/v1/admin/stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load admin stats", err);
        setLoading(false);
      });
  }, [refreshKey]);

  const maxHourly = stats
    ? Math.max(...stats.hourly_activity.map((h) => h.count), 1)
    : 1;

  const totalLang = stats
    ? Object.values(stats.language_distribution).reduce((a, b) => a + b, 0) || 1
    : 1;

  const filteredUsers = stats
    ? stats.recent_users.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : [];

  const diffColors: Record<string, string> = {
    Easy: "#4ade80",
    Medium: "#fbbf24",
    Hard: "#f87171",
  };

  const langColors: Record<string, string> = {
    python: "#3b82f6",
    cpp: "#f59e0b",
    javascript: "#10b981",
    java: "#ef4444",
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <>
        <nav className="navbar">
          <div className="logo">AlgoArena</div>
          <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
            Admin Analytics
          </span>
        </nav>
        <div
          className="main-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "1.2rem" }}>
            Loading analytics...
          </div>
        </div>
      </>
    );
  }

  if (!stats) return null;

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span
            style={{
              color: "var(--accent-purple)",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Admin Analytics
          </span>
          <button onClick={() => router.push("/admin")} className="nav-btn">
            Problem Manager
          </button>
          <button onClick={() => router.push("/problems")} className="nav-btn">
            Back
          </button>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="nav-btn"
            style={{
              background: "rgba(139, 92, 246, 0.15)",
              borderColor: "rgba(139, 92, 246, 0.4)",
              color: "#a78bfa",
            }}
          >
            Refresh
          </button>
        </div>
      </nav>

      <div
        className="main-container"
        style={{ display: "block", overflowY: "auto", padding: "2rem" }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* KPI Cards */}
          <div className="admin-kpi-row">
            {/* Users */}
            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon-styled"
                style={{ background: "rgba(139, 92, 246, 0.15)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="admin-kpi-body">
                <span className="admin-kpi-label">Total Users</span>
                <div className="admin-kpi-value" style={{ color: "#a78bfa" }}>
                  {stats.users.total}
                </div>
                <div className="admin-kpi-meta">
                  <span
                    className="admin-kpi-badge"
                    style={{
                      background: "rgba(74, 222, 128, 0.15)",
                      color: "#4ade80",
                    }}
                  >
                    +{stats.users.new_today} today
                  </span>
                  <span
                    className="admin-kpi-badge"
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                    }}
                  >
                    {stats.users.active_today} active
                  </span>
                </div>
              </div>
            </div>

            {/* Submissions */}
            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon-styled"
                style={{ background: "rgba(59, 130, 246, 0.15)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div className="admin-kpi-body">
                <span className="admin-kpi-label">Submissions Today</span>
                <div className="admin-kpi-value" style={{ color: "#60a5fa" }}>
                  {stats.submissions.today}
                </div>
                <div className="admin-kpi-meta">
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                    }}
                  >
                    {stats.submissions.total} total
                  </span>
                </div>
              </div>
            </div>

            {/* Acceptance Rate */}
            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon-styled"
                style={{ background: "rgba(16, 185, 129, 0.15)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="admin-kpi-body">
                <span className="admin-kpi-label">Acceptance Rate</span>
                <div className="admin-kpi-value" style={{ color: "#4ade80" }}>
                  {stats.acceptance_rate}%
                </div>
                <div className="stats-bar" style={{ marginTop: "0.5rem" }}>
                  <div
                    className="stats-bar-fill"
                    style={{
                      width: `${stats.acceptance_rate}%`,
                      background: "linear-gradient(90deg, #10b981, #4ade80)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.35rem",
                  }}
                >
                  <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>
                    Pass: {stats.submissions.pass_count}
                  </span>
                  <span style={{ color: "#f87171", fontSize: "0.7rem" }}>
                    Fail: {stats.submissions.fail_count}
                  </span>
                </div>
              </div>
            </div>

            {/* Problems */}
            <div className="admin-kpi-card">
              <div
                className="admin-kpi-icon-styled"
                style={{ background: "rgba(251, 191, 36, 0.15)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div className="admin-kpi-body">
                <span className="admin-kpi-label">Problems</span>
                <div className="admin-kpi-value" style={{ color: "#fbbf24" }}>
                  {stats.problems.total}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    marginTop: "0.35rem",
                    flexWrap: "wrap",
                  }}
                >
                  {["Easy", "Medium", "Hard"].map((d) => (
                    <span
                      key={d}
                      style={{
                        fontSize: "0.7rem",
                        color: diffColors[d],
                        background: `${diffColors[d]}18`,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "8px",
                      }}
                    >
                      {d}: {stats.problems.by_difficulty[d] || 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Activity Chart */}
          <div className="admin-chart-card">
            <div className="admin-chart-header">
              <h3 className="admin-chart-title">Today's Activity</h3>
              <span
                style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}
              >
                {stats.submissions.today} submissions today
              </span>
            </div>
            <div className="admin-hourly-chart">
              {stats.hourly_activity.map((h, i) => {
                const pct = (h.count / maxHourly) * 100;
                const currentHour = new Date().getHours();
                const isCurrent = i === currentHour;
                return (
                  <div
                    key={i}
                    className="admin-hourly-col"
                    title={`${h.hour}: ${h.count} submissions`}
                  >
                    <div className="admin-hourly-bar-wrap">
                      <div
                        className="admin-hourly-bar"
                        style={{
                          height: `${Math.max(pct, 3)}%`,
                          background: isCurrent
                            ? "linear-gradient(180deg, #fbbf24, #f59e0b)"
                            : h.count > 0
                              ? "linear-gradient(180deg, #8b5cf6, #3b82f6)"
                              : "#1e293b",
                          boxShadow: isCurrent
                            ? "0 0 8px rgba(251,191,36,0.4)"
                            : "none",
                        }}
                      />
                    </div>
                    {i % 3 === 0 && (
                      <span className="admin-hourly-label">
                        {h.hour.replace(":00", "")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Column: Language + Top Problems */}
          <div className="admin-two-col">
            {/* Language Distribution */}
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Language Distribution</h3>
              {Object.keys(stats.language_distribution).length === 0 ? (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    padding: "2rem",
                    textAlign: "center",
                  }}
                >
                  No submissions yet
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  {/* Stacked bar */}
                  <div
                    style={{
                      display: "flex",
                      borderRadius: "8px",
                      overflow: "hidden",
                      height: "32px",
                    }}
                  >
                    {Object.entries(stats.language_distribution).map(
                      ([lang, count]) => (
                        <div
                          key={lang}
                          style={{
                            width: `${(count / totalLang) * 100}%`,
                            background: langColors[lang] || "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            color: "white",
                            fontWeight: 600,
                            minWidth: "30px",
                            transition: "width 0.5s ease",
                          }}
                        >
                          {Math.round((count / totalLang) * 100)}%
                        </div>
                      ),
                    )}
                  </div>
                  {/* Legend */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {Object.entries(stats.language_distribution).map(
                      ([lang, count]) => (
                        <div
                          key={lang}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background: langColors[lang] || "#64748b",
                              }}
                            />
                            <span
                              style={{
                                color: "white",
                                fontSize: "0.85rem",
                                textTransform: "capitalize",
                              }}
                            >
                              {lang}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.8rem",
                              }}
                            >
                              {count} submissions
                            </span>
                            <span
                              style={{
                                color: langColors[lang] || "#64748b",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                              }}
                            >
                              {Math.round((count / totalLang) * 100)}%
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Top Problems */}
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Top Problems</h3>
              {stats.top_problems.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    padding: "2rem",
                    textAlign: "center",
                  }}
                >
                  No submissions yet
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginTop: "1rem",
                  }}
                >
                  {stats.top_problems.map((p, i) => (
                    <div key={p.slug} className="admin-top-problem-row">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.75rem",
                            minWidth: "18px",
                          }}
                        >
                          #{i + 1}
                        </span>
                        <span
                          style={{
                            color: "white",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                          }}
                        >
                          {p.title}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          minWidth: "160px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div style={{ width: "60px" }}>
                          <div className="stats-bar" style={{ height: "4px" }}>
                            <div
                              className="stats-bar-fill"
                              style={{
                                width: `${p.acceptance}%`,
                                background:
                                  p.acceptance >= 60
                                    ? "#4ade80"
                                    : p.acceptance >= 30
                                      ? "#fbbf24"
                                      : "#f87171",
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color:
                              p.acceptance >= 60
                                ? "#4ade80"
                                : p.acceptance >= 30
                                  ? "#fbbf24"
                                  : "#f87171",
                          }}
                        >
                          {p.acceptance}%
                        </span>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.7rem",
                          }}
                        >
                          {p.submissions} subs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="admin-chart-card" style={{ marginTop: "1rem" }}>
            <div className="admin-chart-header">
              <h3 className="admin-chart-title">Users</h3>
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="search-input"
                style={{
                  maxWidth: "250px",
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.8rem",
                }}
              />
            </div>
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Submissions</th>
                    <th>Solved</th>
                    <th>Acceptance</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const acc =
                      u.submissions > 0
                        ? Math.round((u.solved / u.submissions) * 100)
                        : 0;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background:
                                  "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: "white",
                                flexShrink: 0,
                              }}
                            >
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ color: "white", fontWeight: 500 }}>
                              {u.username}
                            </span>
                          </div>
                        </td>
                        <td>{u.submissions}</td>
                        <td>
                          <span style={{ color: "#a78bfa", fontWeight: 600 }}>
                            {u.solved}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              className="stats-bar"
                              style={{ width: "50px", height: "4px" }}
                            >
                              <div
                                className="stats-bar-fill"
                                style={{
                                  width: `${acc}%`,
                                  background:
                                    acc >= 60
                                      ? "#4ade80"
                                      : acc >= 30
                                        ? "#fbbf24"
                                        : "#f87171",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color:
                                  acc >= 60
                                    ? "#4ade80"
                                    : acc >= 30
                                      ? "#fbbf24"
                                      : "#f87171",
                              }}
                            >
                              {acc}%
                            </span>
                          </div>
                        </td>
                        <td>{u.joined ? formatDate(u.joined) : "—"}</td>
                        <td>{formatDate(u.last_active)}</td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          color: "var(--text-secondary)",
                          padding: "2rem",
                        }}
                      >
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
