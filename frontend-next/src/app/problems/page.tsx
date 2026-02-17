"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

interface Problem {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface UserStats {
  total_problems: number;
  solved: number;
  attempted: number;
  pass_rate: number;
  total_submissions: number;
  recent_activity: { date: string; count: number }[];
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set());
  const [attemptedSlugs, setAttemptedSlugs] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<string>("All");
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("username");
    const userId = localStorage.getItem("user_id");

    if (!user || !userId) {
      router.push("/login");
      return;
    }
    setUsername(user);

    fetch(`${getApiBase()}/api/v1/problems`)
      .then((r) => r.json())
      .then(setProblems)
      .catch(console.error);

    // Fetch stats
    fetch(`${getApiBase()}/api/v1/stats?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
      })
      .catch(console.error);

    // Fetch solved/attempted
    fetch(`${getApiBase()}/api/v1/submissions?user_id=${userId}`)
      .then((r) => r.json())
      .then((subs: any[]) => {
        const solved = new Set<string>();
        const attempted = new Set<string>();
        subs.forEach((s) => {
          attempted.add(s.problem_id);
          if (s.status === "Pass") solved.add(s.problem_id);
        });
        setSolvedSlugs(solved);
        setAttemptedSlugs(attempted);
      })
      .catch(console.error);
  }, [router]);

  const filtered = problems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchDiff = diffFilter === "All" || p.difficulty === diffFilter;
    return matchSearch && matchDiff;
  });

  const maxActivity = stats
    ? Math.max(...stats.recent_activity.map((a) => a.count), 1)
    : 1;

  return (
    <>
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            Hey, {username}
          </span>
          <button onClick={() => router.push("/profile")} className="nav-btn">
            Profile
          </button>
          <button onClick={() => router.push("/admin")} className="nav-btn">
            Admin
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              router.push("/login");
            }}
            className="nav-btn"
          >
            Logout
          </button>
        </div>
      </nav>

      <div
        className="main-container"
        style={{ display: "block", overflowY: "auto", padding: "2rem" }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Stats Row */}
          {stats && (
            <div className="stats-row">
              <div className="stats-card">
                <div className="stats-card-label">Solved</div>
                <div className="stats-card-value">
                  <span style={{ color: "#a78bfa" }}>{stats.solved}</span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                    }}
                  >
                    /{stats.total_problems}
                  </span>
                </div>
              </div>
              <div className="stats-card">
                <div className="stats-card-label">Pass Rate</div>
                <div className="stats-card-value" style={{ color: "#4ade80" }}>
                  {stats.pass_rate}%
                </div>
              </div>
              <div className="stats-card">
                <div className="stats-card-label">Recent</div>
                <div className="stats-sparkline">
                  {stats.recent_activity.map((a, i) => (
                    <div
                      key={i}
                      className="stats-spark-bar"
                      style={{
                        height: `${Math.max((a.count / maxActivity) * 100, 8)}%`,
                        background:
                          a.count > 0
                            ? "linear-gradient(180deg, #8b5cf6, #3b82f6)"
                            : "#1e293b",
                      }}
                      title={`${a.date}: ${a.count}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter */}
          <div className="search-filter-row">
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <div className="filter-btns">
              {["All", "Easy", "Medium", "Hard"].map((d) => (
                <button
                  key={d}
                  className={`filter-btn ${diffFilter === d ? "active" : ""}`}
                  data-diff={d}
                  onClick={() => setDiffFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Problem List */}
          <div className="problem-list">
            {filtered.map((p, i) => {
              const isSolved = solvedSlugs.has(p.slug);
              const isAttempted = attemptedSlugs.has(p.slug);
              return (
                <div
                  key={p.slug}
                  className="problem-row"
                  onClick={() => router.push(`/problems/${p.slug}`)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span className="problem-num">{i + 1}</span>
                    {isSolved ? (
                      <span className="problem-status solved"></span>
                    ) : isAttempted ? (
                      <span className="problem-status attempted"></span>
                    ) : (
                      <span className="problem-status none"></span>
                    )}
                    <span className="problem-title">{p.title}</span>
                  </div>
                  <span
                    className={`difficulty-pill ${p.difficulty.toLowerCase()}`}
                  >
                    {p.difficulty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
