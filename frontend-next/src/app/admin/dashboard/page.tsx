"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { IconAtom, IconTerminal, IconContainer, IconDatabase, IconRobot, IconWrench, IconLock, IconPalette, IconLightning, IconBarChart, IconGlobe } from "@/components/Icons";
import type { ReactNode } from "react";


const THEMES = [
  { id: "one-dark", name: "One Dark", bar: "#1e1e2e", bg: "#282a36", accent: "#cba6f7", text: "#a6adc8" },
  { id: "github-light", name: "GitHub Light", bar: "#ffffff", bg: "#f6f8fa", accent: "#0969da", text: "#656d76" },
  { id: "monokai", name: "Monokai Pro", bar: "#1e1f1c", bg: "#272822", accent: "#a6e22e", text: "#a9dc76" },
  { id: "dracula", name: "Dracula", bar: "#282a36", bg: "#1e1f29", accent: "#bd93f9", text: "#6272a4" },
  { id: "nord", name: "Nord", bar: "#2e3440", bg: "#3b4252", accent: "#88c0d0", text: "#7b88a1" },
];

const API_ROUTES = [
  { method: "POST", badge: "post", path: "/api/v1/register", desc: "Create new user account", auth: "No" },
  { method: "POST", badge: "post", path: "/api/v1/login", desc: "Authenticate and receive token", auth: "No" },
  { method: "GET", badge: "get", path: "/api/v1/problems", desc: "List all problems with filters", auth: "Yes" },
  { method: "GET", badge: "get", path: "/api/v1/problems/:slug", desc: "Get problem details by slug", auth: "Yes" },
  { method: "POST", badge: "post", path: "/api/v1/execute", desc: "Run code against test cases", auth: "Yes" },
  { method: "POST", badge: "post", path: "/api/v1/submit", desc: "Submit code for judging", auth: "Yes" },
  { method: "GET", badge: "get", path: "/api/v1/submissions", desc: "Get user submission history", auth: "Yes" },
  { method: "GET", badge: "get", path: "/api/v1/stats", desc: "Get user profile and stats", auth: "Yes" },
  { method: "POST", badge: "post", path: "/api/v1/chat/:id", desc: "Get AI-powered hint for problem", auth: "Yes" },
  { method: "POST", badge: "post", path: "/api/v1/admin/problems", desc: "Create a new problem (admin)", auth: "Admin" },
  { method: "PUT", badge: "put", path: "/api/v1/admin/problems/:slug", desc: "Update a problem (admin)", auth: "Admin" },
  { method: "DELETE", badge: "delete", path: "/api/v1/admin/problems/:id", desc: "Delete a problem (admin)", auth: "Admin" },
];

const STACK: { icon: ReactNode; title: string; sub: string; bg: string; items: string[] }[] = [
  { icon: <IconAtom />, title: "Frontend", sub: "User Interface", bg: "rgba(99,102,241,0.15)", items: ["Next.js 16 (App Router)", "TypeScript 5", "Tailwind CSS 4", "Monaco Editor (Code)"] },
  { icon: <IconTerminal />, title: "Backend", sub: "API Server", bg: "rgba(0,255,136,0.12)", items: ["Python 3.12 + Flask", "Flask-CORS", "psycopg2 PostgreSQL", "Gunicorn WSGI"] },
  { icon: <IconContainer />, title: "Judge System", sub: "Code Execution", bg: "rgba(251,191,36,0.15)", items: ["Docker Containers", "Resource Limits (CPU/Mem)", "Python & C++ Drivers", "Sandboxed Execution"] },
  { icon: <IconDatabase />, title: "Database", sub: "Data Layer", bg: "rgba(236,72,153,0.15)", items: ["PostgreSQL 16", "Users, Problems, Submissions", "Indexed Queries", "Docker Compose Setup"] },
  { icon: <IconRobot />, title: "AI Assistant", sub: "Smart Hints", bg: "rgba(139,92,246,0.15)", items: ["Gemini API", "Context-Aware Prompting", "Hint System", "Code Review"] },
  { icon: <IconWrench />, title: "DevOps", sub: "Infrastructure", bg: "rgba(59,130,246,0.15)", items: ["Docker Compose", "GitHub Actions CI/CD", "Environment Variables", "Health Checks"] },
];

const FEATURES: { icon: ReactNode; title: string; desc: string; bg: string }[] = [
  { icon: <IconLock />, title: "Sandboxed Execution", desc: "User code runs in isolated Docker containers with strict CPU, memory, and time limits.", bg: "rgba(0,255,136,0.12)" },
  { icon: <IconPalette />, title: "5 VS Code Themes", desc: "One Dark, GitHub Light, Monokai Pro, Dracula, and Nord — persisted in localStorage.", bg: "rgba(99,102,241,0.15)" },
  { icon: <IconLightning />, title: "Real-Time Judging", desc: "Instant feedback with test case results, runtime metrics, and memory usage stats.", bg: "rgba(251,191,36,0.15)" },
  { icon: <IconRobot />, title: "AI-Powered Hints", desc: "Contextual AI assistance that provides hints without giving away the full solution.", bg: "rgba(236,72,153,0.15)" },
  { icon: <IconBarChart />, title: "Progress Tracking", desc: "GitHub-style contribution heatmaps, streak counters, badges, and leaderboard rankings.", bg: "rgba(139,92,246,0.15)" },
  { icon: <IconGlobe />, title: "Multi-Language", desc: "Supports Python 3, C++ 17 with syntax-highlighted Monaco editor.", bg: "rgba(59,130,246,0.15)" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTheme, setActiveTheme] = useState("one-dark");

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) { router.push("/login"); return; }
    // Verify admin status from server
    fetchJSON<{ is_admin?: boolean }>(`${getApiBase()}/api/v1/check-admin?user_id=${uid}`)
      .then(data => {
        if (!data?.is_admin) { router.push("/problems"); return; }
        localStorage.setItem("is_admin", "true");
      })
      .catch(() => router.push("/problems"));
    const saved = localStorage.getItem("algoarena-theme") || "one-dark";
    setActiveTheme(saved);
  }, [router]);

  return (
    <>
      <div className="bg-animated"><div className="orb" /><div className="orb" /><div className="orb" /></div>
      <div className="bg-grid" />
      <Navbar />

      <div className="overview-hero fade-in-up">
        <h1>Technical Overview</h1>
        <p>A deep dive into AlgoArena&apos;s architecture, technology stack, API design, and the design system powering the user interface.</p>
      </div>

      <div className="overview-content">
        {/* Architecture */}
        <div className="section fade-in-up">
          <div className="section-heading">
            <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            System Architecture
          </div>
          <div className="arch-diagram">
            <div className="arch-flow">
              <div className="arch-node">
                <div className="arch-node-icon" style={{ background: "rgba(99,102,241,0.15)" }}><IconGlobe /></div>
                <h4>Next.js Frontend</h4>
                <p>React + TypeScript</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-node">
                <div className="arch-node-icon" style={{ background: "rgba(0,255,136,0.12)" }}><IconLightning /></div>
                <h4>Flask API</h4>
                <p>Python Backend</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-node">
                <div className="arch-node-icon" style={{ background: "rgba(251,191,36,0.15)" }}><IconContainer /></div>
                <h4>Docker Judge</h4>
                <p>Sandboxed Executor</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-node">
                <div className="arch-node-icon" style={{ background: "rgba(236,72,153,0.15)" }}><IconDatabase /></div>
                <h4>PostgreSQL</h4>
                <p>Database</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="section fade-in-up">
          <div className="section-heading">
            <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            Technology Stack
          </div>
          <div className="stack-grid stagger">
            {STACK.map((s) => (
              <div key={s.title} className="stack-card">
                <div className="stack-card-header">
                  <div className="stack-card-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div><h4>{s.title}</h4><p>{s.sub}</p></div>
                </div>
                <div className="tech-list">
                  {s.items.map((item) => (
                    <div key={item} className="tech-item"><div className="tech-dot" />{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="section fade-in-up">
          <div className="section-heading">
            <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Key Features
          </div>
          <div className="feature-grid-overview stagger">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card-ov">
                <div className="ft-icon" style={{ background: f.bg }}>{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* API Reference */}
        <div className="section fade-in-up">
          <div className="section-heading">
            <svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            API Endpoints
          </div>
          <div className="api-table-wrap">
            <table className="api-table">
              <thead>
                <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth</th></tr>
              </thead>
              <tbody>
                {API_ROUTES.map((r, i) => (
                  <tr key={i}>
                    <td><span className={`method-badge ${r.badge}`}>{r.method}</span></td>
                    <td className="endpoint-path">{r.path}</td>
                    <td>{r.desc}</td>
                    <td>{r.auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Design System */}
        <div className="section fade-in-up">
          <div className="section-heading">
            <svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.5 10.5h3.7a1.7 1.7 0 0 1 0 3.4h-3.7"/><circle cx="8.5" cy="14.5" r="2.5"/><path d="M2.8 10.5h3.7"/><circle cx="17" cy="18" r="2"/></svg>
            Design System — Themes
          </div>
          <div className="theme-preview-row">
            {THEMES.map((t) => (
              <div
                key={t.id}
                className={`theme-preview-card${activeTheme === t.id ? " active" : ""}`}
                onClick={() => {
                  document.documentElement.setAttribute("data-theme", t.id);
                  localStorage.setItem("algoarena-theme", t.id);
                  setActiveTheme(t.id);
                }}
              >
                <div className="theme-preview-bar" style={{ background: t.bar }}>
                  <div className="theme-preview-dot" style={{ background: "#ff5f57" }} />
                  <div className="theme-preview-dot" style={{ background: "#febc2e" }} />
                  <div className="theme-preview-dot" style={{ background: "#28c840" }} />
                </div>
                <div className="theme-preview-body" style={{ background: t.bg }}>
                  <div className="theme-preview-line" style={{ background: t.accent, width: "60%" }} />
                  <div className="theme-preview-line" style={{ background: t.text, width: "80%" }} />
                  <div className="theme-preview-line" style={{ background: t.text, width: "45%" }} />
                </div>
                <div className="theme-preview-label" style={{ background: t.bar, color: t.accent }}>{t.name}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 20, padding: 20, background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)",
            backdropFilter: "blur(10px)",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 12 }}>
              The design system uses <strong style={{ color: "var(--text-primary)" }}>CSS custom properties</strong> (200+ variables per theme) for instant theme switching without page reload. Themes are persisted via <code style={{ background: "var(--bg-input)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>localStorage</code> under the <code style={{ background: "var(--bg-input)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>algoarena-theme</code> key.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <strong style={{ color: "var(--text-primary)" }}>Typography:</strong> Inter (300–900) for UI, JetBrains Mono (400–700) for code.{" "}
              <strong style={{ color: "var(--text-primary)" }}>Effects:</strong> Glassmorphism with backdrop-filter blur, animated gradient orbs, grid overlays, and staggered entry animations.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
