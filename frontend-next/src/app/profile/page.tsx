"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
}

interface UserStats {
  total_problems: number;
  solved: number;
  attempted: number;
  pass_rate: number;
  total_submissions: number;
  by_difficulty: Record<string, { total: number; solved: number }>;
  recent_activity: { date: string; count: number }[];
}

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("username");
    const userId = localStorage.getItem("user_id");
    if (!user || !userId) {
      router.push("/login");
      return;
    }
    setUsername(user);

    fetch(`${getApiBase()}/api/v1/submissions?user_id=${userId}`)
      .then((r) => r.json())
      .then(setSubmissions)
      .catch(console.error);

    fetch(`${getApiBase()}/api/v1/stats?user_id=${userId}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, [router]);

  const maxActivity = stats
    ? Math.max(...stats.recent_activity.map((a) => a.count), 1)
    : 1;

  const solvedPct = stats
    ? Math.round((stats.solved / Math.max(stats.total_problems, 1)) * 100)
    : 0;

  return (
    <>
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <button onClick={() => router.push("/problems")} className="nav-btn">
          ← Problems
        </button>
      </nav>

      <div
        className="main-container"
        style={{ display: "block", overflowY: "auto", padding: "2rem" }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Hero Card */}
          <div className="profile-hero">
            <div className="profile-avatar-ring">
              <div className="profile-avatar">
                {username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="profile-hero-info">
              <h2 style={{ color: "white", margin: "0 0 0.5rem" }}>
                {username}
              </h2>
              <div className="profile-chips">
                <span className="profile-chip">
                  {stats?.total_submissions || 0} submissions
                </span>
                <span className="profile-chip">
                  {stats?.solved || 0} solved
                </span>
                <span className="profile-chip">
                  {stats?.pass_rate || 0}% pass rate
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="profile-stats-grid">
              {/* Progress Circle */}
              <div className="profile-stat-card">
                <h3 className="profile-stat-title">Progress</h3>
                <div className="progress-circle-wrap">
                  <svg viewBox="0 0 120 120" className="progress-circle-svg">
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      className="progress-circle-bg"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      className="progress-circle-fill"
                      strokeDasharray={`${solvedPct * 3.27} 327`}
                    />
                  </svg>
                  <div className="progress-circle-text">
                    <span className="progress-circle-pct">{solvedPct}%</span>
                    <span className="progress-circle-sub">
                      {stats.solved}/{stats.total_problems}
                    </span>
                  </div>
                </div>
              </div>

              {/* By Difficulty */}
              <div className="profile-stat-card">
                <h3 className="profile-stat-title">By Difficulty</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {["Easy", "Medium", "Hard"].map((d) => {
                    const data = stats.by_difficulty[d] || {
                      total: 0,
                      solved: 0,
                    };
                    const pct =
                      data.total > 0
                        ? Math.round((data.solved / data.total) * 100)
                        : 0;
                    const colors: Record<string, string> = {
                      Easy: "#4ade80",
                      Medium: "#fbbf24",
                      Hard: "#f87171",
                    };
                    return (
                      <div key={d}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span
                            style={{
                              color: colors[d],
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {d}
                          </span>
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "0.75rem",
                            }}
                          >
                            {data.solved}/{data.total}
                          </span>
                        </div>
                        <div className="stats-bar">
                          <div
                            className="stats-bar-fill"
                            style={{ width: `${pct}%`, background: colors[d] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7-Day Activity */}
              <div
                className="profile-stat-card"
                style={{ gridColumn: "1 / -1" }}
              >
                <h3 className="profile-stat-title">7-Day Activity</h3>
                <div className="activity-chart">
                  {stats.recent_activity.map((a, i) => (
                    <div key={i} className="activity-bar-col">
                      <div className="activity-bar-wrap">
                        <div
                          className="activity-bar"
                          style={{
                            height: `${Math.max((a.count / maxActivity) * 100, 5)}%`,
                            background:
                              a.count > 0
                                ? "linear-gradient(180deg, #8b5cf6, #3b82f6)"
                                : "#1e293b",
                          }}
                        />
                      </div>
                      <span className="activity-bar-label">
                        {new Date(a.date).toLocaleDateString("en", {
                          weekday: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submission History */}
          <div style={{ marginTop: "1.5rem" }}>
            <h3
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "0.75rem",
              }}
            >
              Recent Submissions
            </h3>
            {submissions.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>
                No submissions yet
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {submissions.slice(0, 20).map((s) => (
                  <div
                    key={s.id}
                    className="submission-row"
                    onClick={() => router.push(`/problems/${s.problem_id}`)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        className="status-dot"
                        style={{
                          background:
                            s.status === "Pass" ? "#4ade80" : "#f87171",
                        }}
                      />
                      <span style={{ color: "white", fontWeight: 500 }}>
                        {s.problem_id}
                      </span>
                      <span className="lang-badge">{s.language}</span>
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
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: s.status === "Pass" ? "#4ade80" : "#f87171",
                        }}
                      >
                        {s.status}
                      </span>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString("en", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
