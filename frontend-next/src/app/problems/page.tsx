"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { ThemePicker, THEMES } from "@/components/ThemeSelector";
import Toast, { showToast } from "@/components/Toast";
import {
  IconPalette,
  IconBarChart,
  IconSearch,
  IconClipboard,
  IconCompass,
  IconRocket,
} from "@/components/Icons";
import type { ReactNode } from "react";

interface Problem {
  slug: string;
  title: string;
  difficulty: string;
  tags?: string[];
  acceptance?: number;
}

interface Stats {
  total_problems: number;
  solved: number;
  attempted: number;
  pass_rate: number;
  total_submissions: number;
}

interface Submission {
  problem_id: string;
  status: string;
}

// Tutorial step definitions
const TUTORIAL_STEPS: {
  icon: ReactNode;
  title: string;
  desc: string;
  target: string | null;
  isThemeStep: boolean;
}[] = [
  {
    icon: <IconPalette />,
    title: "Pick Your Theme",
    desc: "Choose a theme that feels right. You can always change it later in your profile settings.",
    target: null,
    isThemeStep: true,
  },
  {
    icon: <IconBarChart />,
    title: "Your Progress at a Glance",
    desc: "These cards show your coding stats — problems solved, success rate, and submission count. Watch them grow!",
    target: ".stats-row",
    isThemeStep: false,
  },
  {
    icon: <IconSearch />,
    title: "Search & Filter",
    desc: "Find problems by name or filter by difficulty. Use the toolbar to narrow down exactly what you want to practice.",
    target: ".toolbar",
    isThemeStep: false,
  },
  {
    icon: <IconClipboard />,
    title: "Problem Table",
    desc: "Browse all available problems here. Click any row to open the IDE and start coding. Green dots indicate solved problems.",
    target: ".problems-table",
    isThemeStep: false,
  },
  {
    icon: <IconCompass />,
    title: "Navigation",
    desc: "Use the navbar to jump between Problems, your Profile, and Admin panel (if you're an admin). You're all set!",
    target: ".navbar",
    isThemeStep: false,
  },
];

export default function ProblemsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 15;

  // Tutorial state
  const [showWelcome, setShowWelcome] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");
    if (!uid || !token) {
      router.push("/login");
      return;
    }
    setUserId(uid);

    // Check if tutorial was seen
    const seen = localStorage.getItem("algoarena-tutorial-seen");
    if (!seen) setShowWelcome(true);

    // Fetch data (JWT auth via fetchJSON headers)
    const base = getApiBase();
    Promise.all([
      fetchJSON<Problem[]>(`${base}/api/v1/problems`),
      fetchJSON<Stats>(`${base}/api/v1/stats`),
      fetchJSON<Submission[]>(`${base}/api/v1/submissions`),
    ])
      .then(([p, s, sub]) => {
        setProblems(Array.isArray(p) ? p : []);
        setStats(s ?? null);
        setSubmissions(Array.isArray(sub) ? sub : []);
      })
      .catch(() => showToast("Failed to load data", "error"));
  }, [router]);

  // Derived sets
  const solvedSet = new Set(
    submissions.filter((s) => s.status === "accepted").map((s) => s.problem_id),
  );
  const attemptedSet = new Set(submissions.map((s) => s.problem_id));

  // Filter
  const filtered = problems.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchDiff =
      difficulty === "all" || p.difficulty?.toLowerCase() === difficulty;
    return matchSearch && matchDiff;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // Tutorial
  const startTutorial = () => {
    setShowWelcome(false);
    setTutorialActive(true);
    setTutorialStep(0);
    localStorage.setItem("algoarena-tutorial-seen", "1");
  };

  const dismissTutorial = () => {
    setShowWelcome(false);
    setTutorialActive(false);
    localStorage.setItem("algoarena-tutorial-seen", "1");
  };

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setTutorialActive(false);
    }
  };

  // Position spotlight on current step target
  const positionSpotlight = useCallback(() => {
    if (!tutorialActive) return;
    const step = TUTORIAL_STEPS[tutorialStep];

    // Theme step has no target — hide spotlight, center card
    if (!step.target) {
      if (spotlightRef.current) {
        spotlightRef.current.style.width = "0";
        spotlightRef.current.style.height = "0";
        spotlightRef.current.style.opacity = "0";
      }
      if (cardRef.current) {
        const cardW = 440;
        cardRef.current.style.left = `${Math.max(16, (window.innerWidth - cardW) / 2)}px`;
        cardRef.current.style.top = `${Math.max(80, window.innerHeight * 0.18)}px`;
      }
      return;
    }

    if (spotlightRef.current) spotlightRef.current.style.opacity = "1";
    const el = document.querySelector(step.target);
    if (!el || !spotlightRef.current || !cardRef.current) return;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    spotlightRef.current.style.top = `${rect.top - pad}px`;
    spotlightRef.current.style.left = `${rect.left - pad}px`;
    spotlightRef.current.style.width = `${rect.width + pad * 2}px`;
    spotlightRef.current.style.height = `${rect.height + pad * 2}px`;

    // Position card below or above
    const cardW = 380;
    let cx = rect.left + rect.width / 2 - cardW / 2;
    cx = Math.max(16, Math.min(cx, window.innerWidth - cardW - 16));
    let cy = rect.bottom + pad + 16;
    if (cy + 260 > window.innerHeight) cy = rect.top - pad - 260;
    cardRef.current.style.left = `${cx}px`;
    cardRef.current.style.top = `${cy}px`;
  }, [tutorialActive, tutorialStep]);

  useEffect(() => {
    positionSpotlight();
    window.addEventListener("resize", positionSpotlight);
    return () => window.removeEventListener("resize", positionSpotlight);
  }, [positionSpotlight]);

  const difficultyLabel = (d: string) => {
    const dl = d?.toLowerCase();
    if (dl === "easy")
      return <span className="diff-badge diff-easy">Easy</span>;
    if (dl === "medium")
      return <span className="diff-badge diff-medium">Medium</span>;
    return <span className="diff-badge diff-hard">Hard</span>;
  };

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
        {/* Stats */}
        <div className="stats-row stagger">
          <div className="stat-card">
            <div className="stat-label">Problems Solved</div>
            <div className="stat-value accent">{stats?.solved ?? 0}</div>
            <div className="stat-sub">
              <span className="stat-up">↑</span> out of{" "}
              {stats?.total_problems ?? 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Success Rate</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>
              {stats?.pass_rate != null
                ? `${Math.round(stats.pass_rate)}%`
                : "0%"}
            </div>
            <div className="stat-sub">across all submissions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Submissions</div>
            <div className="stat-value">{stats?.total_submissions ?? 0}</div>
            <div className="stat-sub">keep going!</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Attempted</div>
            <div className="stat-value" style={{ color: "var(--warning)" }}>
              {stats?.attempted ?? 0}
            </div>
            <div className="stat-sub">problems tried so far</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {["all", "easy", "medium", "hard"].map((d) => (
            <button
              key={d}
              className={`filter-btn${difficulty === d ? " active" : ""}`}
              onClick={() => {
                setDifficulty(d);
                setCurrentPage(1);
              }}
            >
              {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Problems Table */}
        <div className="problems-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Status</th>
                <th style={{ width: 50 }}>#</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Acceptance</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {paginated.map((p, i) => {
                const idx = (currentPage - 1) * perPage + i + 1;
                const solved = solvedSet.has(p.slug);
                const attempted = attemptedSet.has(p.slug);
                const acceptance =
                  p.acceptance ?? Math.floor(Math.random() * 40 + 30);
                return (
                  <tr
                    key={p.slug}
                    onClick={() => router.push(`/problems/${p.slug}`)}
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    <td className="status-cell">
                      {solved ? (
                        <div className="status-dot-solved">
                          <svg viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : attempted ? (
                        <div
                          className="status-dot-solved"
                          style={{ background: "rgba(249,226,175,0.15)" }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{ stroke: "var(--warning)" }}
                          >
                            <circle cx="12" cy="12" r="5" />
                          </svg>
                        </div>
                      ) : null}
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {idx}
                    </td>
                    <td>
                      <div className="problem-title-cell">
                        <span className="problem-title">{p.title}</span>
                        {p.tags && p.tags.length > 0 && (
                          <div className="problem-tags">
                            {p.tags.map((t) => (
                              <span key={t} className="ptag">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{difficultyLabel(p.difficulty)}</td>
                    <td>
                      <div className="accept-bar">
                        <div
                          className="accept-fill"
                          style={{ width: `${acceptance}%` }}
                        />
                      </div>
                      <div className="accept-text">{acceptance}%</div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: 40,
                    }}
                  >
                    No problems found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                className={`page-btn${currentPage === pg ? " active" : ""}`}
                onClick={() => setCurrentPage(pg)}
              >
                {pg}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      {/* Tutorial Welcome Modal */}
      {showWelcome && (
        <div className="tutorial-overlay active">
          <div className="tutorial-welcome">
            <div className="welcome-card">
              <div className="welcome-icon">
                <IconRocket />
              </div>
              <h2>Welcome to AlgoArena!</h2>
              <p>
                Let&apos;s take a quick tour to help you get started. We&apos;ll
                show you the key features of the problems dashboard.
              </p>
              <div className="welcome-actions">
                <button className="welcome-start" onClick={startTutorial}>
                  <svg viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Tour
                </button>
                <button className="welcome-dismiss" onClick={dismissTutorial}>
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {tutorialActive && (
        <div className="tutorial-overlay active">
          <div className="tutorial-spotlight" ref={spotlightRef} />
          <div
            className={`tutorial-card${TUTORIAL_STEPS[tutorialStep].isThemeStep ? " tutorial-card-wide" : ""}`}
            ref={cardRef}
          >
            <div className="tutorial-step-indicator">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`tutorial-step-dot${i === tutorialStep ? " active" : ""}${i < tutorialStep ? " done" : ""}`}
                />
              ))}
            </div>
            <div className="tutorial-icon">
              {TUTORIAL_STEPS[tutorialStep].icon}
            </div>
            <h3>{TUTORIAL_STEPS[tutorialStep].title}</h3>
            <p>{TUTORIAL_STEPS[tutorialStep].desc}</p>
            {TUTORIAL_STEPS[tutorialStep].isThemeStep && (
              <div className="tutorial-theme-picker">
                <ThemePicker />
              </div>
            )}
            <div className="tutorial-actions">
              <button className="tutorial-skip" onClick={dismissTutorial}>
                Skip tour
              </button>
              <button className="tutorial-next" onClick={nextStep}>
                {tutorialStep < TUTORIAL_STEPS.length - 1 ? "Next" : "Finish"}
                <svg viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
