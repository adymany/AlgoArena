"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBase, fetchJSON, authHeaders } from "@/lib/api";
import Navbar from "@/components/Navbar";

import { showToast } from "@/components/Toast";

interface Problem {
  slug: string;
  title: string;
  difficulty: string;
}

interface AdminStats {
  users: { total: number; new_today: number; active_today: number };
  submissions: { total: number; today: number; pass_count: number; fail_count: number };
  acceptance_rate: number;
  problems: { total: number; by_difficulty: Record<string, number> };
  hourly_activity: { hour: string; count: number }[];
  language_distribution: Record<string, number>;
  top_problems: { slug: string; title: string; submissions: number; acceptance: number }[];
  recent_users: { id: number; username: string; joined: string; submissions: number; solved: number; last_active: string | null }[];
}

type SidebarView = "dashboard" | "problems" | "users" | "submissions";

const SYS_LINKS = [
  { label: "Servers", icon: <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
  { label: "Security", icon: <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { label: "Settings", icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06"/></svg> },
];

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarView, setSidebarView] = useState<SidebarView>("dashboard");
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    difficulty: "Easy",
    description: "",
    python_template: "class Solution:\n    def solve(self):\n        ",
    cpp_template: 'class Solution {\npublic:\n    void solve() {\n        \n    }\n};',
    driver_python: "",
    driver_cpp: "",
    test_data: "",
  });

  const [problems, setProblems] = useState<Problem[]>([]);
  const [viewMode, setViewMode] = useState<"create" | "edit">("create");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    // Verify admin status from server (JWT auth)
    fetchJSON<{ is_admin?: boolean }>(`${getApiBase()}/api/v1/check-admin`)
      .then(data => {
        if (!data?.is_admin) { router.push("/problems"); return; }
        localStorage.setItem("is_admin", "true");
        fetchProblems();
        fetchStats();
      })
      .catch(() => router.push("/problems"));
  }, [router]);

  async function fetchStats() {
    try {
      const data = await fetchJSON<AdminStats>(`${getApiBase()}/api/v1/admin/stats`);
      if (data) setAdminStats(data);
    } catch { /* ignore */ }
  }

  async function fetchProblems() {
    try {
      const data = await fetchJSON<Problem[]>(`${getApiBase()}/api/v1/problems`);
      if (Array.isArray(data)) setProblems(data);
    } catch { /* ignore */ }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setViewMode("create");
    setFormData({
      slug: "", title: "", difficulty: "Easy", description: "",
      python_template: "class Solution:\n    def solve(self):\n        ",
      cpp_template: 'class Solution {\npublic:\n    void solve() {\n        \n    }\n};',
      driver_python: "", driver_cpp: "", test_data: "",
    });
    setMessage(""); setIsError(false); setTestOutput("");
  };

  const handleEditClick = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/problems/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFormData({
        slug: data.slug,
        title: data.title,
        difficulty: data.difficulty,
        description: data.description,
        python_template: data.templates?.python || "",
        cpp_template: data.templates?.cpp || "",
        driver_python: data.driver_python || "",
        driver_cpp: data.driver_cpp || "",
        test_data: data.test_data || "",
      });
      setViewMode("edit");
      setShowModal(true);
      setMessage("");
    } catch {
      showToast("Failed to load problem", "error");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${formData.title}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/admin/problems/${formData.slug}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        showToast("Problem deleted", "success");
        fetchProblems(); resetForm(); setShowModal(false);
      } else throw new Error();
    } catch { showToast("Delete failed", "error"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage("");
    const url = viewMode === "create"
      ? `${getApiBase()}/api/v1/admin/problems`
      : `${getApiBase()}/api/v1/admin/problems/${formData.slug}`;
    const method = viewMode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(viewMode === "create" ? `"${formData.title}" created!` : "Problem updated!", "success");
        fetchProblems();
        if (viewMode === "create") { resetForm(); setShowModal(false); }
      } else {
        setMessage(`Error: ${data.error}`); setIsError(true);
      }
    } catch {
      setMessage("Connection failed"); setIsError(true);
    } finally { setLoading(false); }
  };

  /* ── Gemini AI Generation ── */
  const generateWithAI = async () => {
    if (!aiPrompt.trim() && !formData.title) {
      setMessage("Enter a prompt or title first"); setIsError(true); return;
    }
    setIsGenerating(true); setMessage("");

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const prompt = `You are an expert competitive programming problem generator for the AlgoArena platform.

${formData.title ? `Title: "${formData.title}"` : ""}
Difficulty: "${formData.difficulty}"

${aiPrompt.trim() ? `=== ADMIN INSTRUCTIONS ===\n${aiPrompt.trim()}\n=== END ADMIN INSTRUCTIONS ===` : ""}

Generate a JSON object with these EXACT keys:

1. "slug": kebab-case URL identifier (e.g. "two-sum")
2. "title": Human readable title (e.g. "Two Sum")
3. "description": HTML problem statement. MUST include:
   - Problem explanation in <p> tags
   - Input/Output format in <p> or <pre> tags
   - At least 2 examples with <strong>Example 1:</strong> format
   - Constraints section
4. "python_template": A Python class stub. Format:
   class Solution:
       def methodName(self, param1: type, ...) -> returnType:
           pass
5. "cpp_template": A C++ class stub. Format:
   class Solution {
   public:
       returnType methodName(paramType param1, ...) {
           
       }
   };
6. "driver_python": Python test driver that reads stdin line by line. CRITICAL FORMAT:
   - Each line from stdin is a JSON object: {"input": {...}, "expected": ...}
   - Must print EXACTLY this pipe-delimited format for EACH test case:
     CASE|<number>|PASS|<input_summary>|<actual_output>|<expected_output>
     CASE|<number>|FAIL|<input_summary>|<actual_output>|<expected_output>
   - There must be exactly 6 pipe-separated fields, no spaces around pipes
   - Must import: from solution import Solution
   - Must read from stdin (NOT from a file)
7. "driver_cpp": C++ test driver. Same output format as Python driver. Must #include "solution.cpp". Read from stdin.
8. "test_data": Array of objects, each with "input" and "expected" keys. 3-5 diverse test cases.

=== EXAMPLE driver_python (follow this EXACT pattern) ===
import sys
import json
sys.path.append("/home/sandbox")
from solution import Solution

sol = Solution()
case_id = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    case_id += 1
    try:
        data = json.loads(line)
        inp = data["input"]
        expected = data["expected"]
        result = sol.twoSum(inp["nums"], inp["target"])
        status = "PASS" if result == expected else "FAIL"
        print(f"CASE|{case_id}|{status}|{inp}|{result}|{expected}")
    except Exception as e:
        print(f"CASE|{case_id}|FAIL|ERROR|{e}|N/A")
=== END EXAMPLE ===

CRITICAL RULES:
- Output format MUST be: CASE|number|PASS or FAIL|input|actual|expected (6 fields, pipe-separated)
- Driver reads JSON from STDIN, one test case per line
- Use \\n for newlines inside JSON string values, never literal newlines
- description MUST be properly formatted HTML, not plain text`;

      const response = await fetch(
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No data received from AI");

      let jsonStr = rawText.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      let generated: Record<string, unknown>;
      try { generated = JSON.parse(jsonStr); }
      catch {
        const fixed = jsonStr.replace(/[\x00-\x1f]/g, (ch: string) => {
          if (ch === "\n") return "\\n";
          if (ch === "\r") return "\\r";
          if (ch === "\t") return "\\t";
          return "";
        });
        generated = JSON.parse(fixed);
      }

      let testDataStr = generated.test_data as string;
      if (Array.isArray(generated.test_data)) {
        testDataStr = (generated.test_data as Array<unknown>).map((item) => JSON.stringify(item)).join("\n");
      }

      setFormData((prev) => ({
        ...prev,
        slug: (generated.slug as string) || prev.slug,
        title: (generated.title as string) || prev.title,
        description: (generated.description as string) || prev.description,
        python_template: (generated.python_template || generated.pythonTemplate || generated.python_starter) as string || prev.python_template,
        cpp_template: (generated.cpp_template || generated.cppTemplate || generated.cpp_starter) as string || prev.cpp_template,
        driver_python: (generated.driver_python || generated.driverPython || generated.python_driver) as string || prev.driver_python,
        driver_cpp: (generated.driver_cpp || generated.driverCpp || generated.cpp_driver) as string || prev.driver_cpp,
        test_data: testDataStr || prev.test_data,
      }));

      setMessage("Content generated successfully!"); setIsError(false);
    } catch (err) {
      console.error(err);
      setMessage(`AI Generation failed: ${err}`); setIsError(true);
    } finally { setIsGenerating(false); }
  };

  const testProblem = async () => {
    if (!formData.driver_python || !formData.python_template || !formData.test_data) {
      setMessage("Need driver code, template, and test data to test"); setIsError(true); return;
    }
    setIsTesting(true); setTestOutput(""); setMessage("");

    try {
      const res = await fetch(`${getApiBase()}/api/v1/execute`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          language: "python",
          code: formData.python_template,
          problem_id: formData.slug || "__test__",
          driver_code: formData.driver_python,
          test_data: formData.test_data,
        }),
      });
      const data = await res.json();
      const output = data.output || "No output";
      setTestOutput(output);

      if (data.exit_code === 0 && output.includes("CASE|")) {
        const hasFailures = output.includes("|FAIL|");
        if (hasFailures) { setMessage("Some cases failed — check output below"); setIsError(true); }
        else { setMessage("All test cases passed!"); setIsError(false); }
      } else if (data.status === "TLE") {
        setMessage("Time Limit Exceeded"); setIsError(true);
      } else { setMessage("Execution failed — check output below"); setIsError(true); }
    } catch (err) {
      setMessage(`Test failed: ${err}`); setIsError(true);
    } finally { setIsTesting(false); }
  };

  /* ── Computed values from stats ── */
  const hourlyData = adminStats?.hourly_activity ?? [];
  const barMax = Math.max(...hourlyData.map(h => h.count), 1);
  
  const diffCounts = adminStats?.problems?.by_difficulty ?? {};
  const totalProblemCount = adminStats?.problems?.total ?? problems.length;
  const easyCount = diffCounts["Easy"] ?? 0;
  const mediumCount = diffCounts["Medium"] ?? 0;
  const hardCount = diffCounts["Hard"] ?? 0;
  const easyPct = totalProblemCount > 0 ? Math.round((easyCount / totalProblemCount) * 100) : 0;
  const mediumPct = totalProblemCount > 0 ? Math.round((mediumCount / totalProblemCount) * 100) : 0;
  const hardPct = totalProblemCount > 0 ? 100 - easyPct - mediumPct : 0;
  const easyDeg = Math.round((easyPct / 100) * 360);
  const mediumDeg = Math.round((mediumPct / 100) * 360);

  const filteredProblems = problems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const diffColor = (d: string) =>
    d === "Easy" ? "diff-easy" : d === "Medium" ? "diff-medium" : "diff-hard";

  return (
    <>
      <div className="bg-animated"><div className="orb" /><div className="orb" /><div className="orb" /></div>
      <div className="bg-grid" />
      <Navbar />

      <div className="admin-layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Main</div>
            <a className={`sidebar-link${sidebarView === "dashboard" ? " active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setSidebarView("dashboard"); }}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> Dashboard
            </a>
            <a className={`sidebar-link${sidebarView === "problems" ? " active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setSidebarView("problems"); }}>
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Problems
              <span className="sidebar-count">{problems.length}</span>
            </a>
            <a className={`sidebar-link${sidebarView === "users" ? " active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setSidebarView("users"); }}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Users
              {adminStats && <span className="sidebar-count">{adminStats.users.total}</span>}
            </a>
            <a className={`sidebar-link${sidebarView === "submissions" ? " active" : ""}`} href="#" onClick={(e) => { e.preventDefault(); setSidebarView("submissions"); }}>
              <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Submissions
              {adminStats && <span className="sidebar-count">{adminStats.submissions.total}</span>}
            </a>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">System</div>
            {SYS_LINKS.map((l, i) => (
              <a key={i} className="sidebar-link" href="#">{l.icon} {l.label}</a>
            ))}
          </div>
          <div className="sidebar-spacer" />
          <div className="sidebar-section">
            <a
              className="sidebar-link"
              href="#"
              style={{ color: "var(--diff-hard)" }}
              onClick={(e) => { e.preventDefault(); localStorage.clear(); router.push("/login"); }}
            >
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </a>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <main className="admin-main">
          <div className="admin-header fade-in-up">
            <h1>{sidebarView === "dashboard" ? "Dashboard" : sidebarView === "problems" ? "Manage Problems" : sidebarView === "users" ? "Users" : "Submissions"}</h1>
            <div className="admin-header-actions">
              <button
                className="header-btn header-btn-outline"
                onClick={() => router.push("/admin/dashboard")}
              >
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Analytics
              </button>
              <button
                className="header-btn header-btn-primary"
                onClick={() => { resetForm(); setShowModal(true); setSidebarView("problems"); }}
              >
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Problem
              </button>
            </div>
          </div>

          {/* ── Metrics ── */}
          {(sidebarView === "dashboard") && (<>
          <div className="metric-grid stagger">
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-icon" style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)" }}>
                  <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                {adminStats && adminStats.users.new_today > 0 && <span className="metric-change up">+{adminStats.users.new_today} today</span>}
              </div>
              <div className="metric-value">{adminStats?.users.total ?? "..."}</div>
              <div className="metric-label">Total Users</div>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-icon" style={{ background: "rgba(0,255,136,0.12)", color: "var(--diff-easy)" }}>
                  <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                {adminStats && <span className="metric-change up">{adminStats.submissions.today} today</span>}
              </div>
              <div className="metric-value">{adminStats?.submissions.total ?? "..."}</div>
              <div className="metric-label">Total Submissions</div>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-icon" style={{ background: "rgba(251,191,36,0.15)", color: "var(--diff-medium)" }}>
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span className="metric-change up">{problems.length} total</span>
              </div>
              <div className="metric-value">{problems.length}</div>
              <div className="metric-label">Total Problems</div>
            </div>
            <div className="metric-card">
              <div className="metric-top">
                <div className="metric-icon" style={{ background: "rgba(255,85,85,0.12)", color: "var(--diff-hard)" }}>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="metric-change up">{adminStats?.acceptance_rate ?? 0}%</span>
              </div>
              <div className="metric-value">{adminStats?.acceptance_rate ?? 0}%</div>
              <div className="metric-label">Acceptance Rate</div>
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="chart-row fade-in-up">
            <div className="chart-card">
              <h3>Submissions &mdash; Today (Hourly)</h3>
              <div className="bar-chart">
                {(hourlyData.length > 0 ? hourlyData : Array.from({length: 24}, (_, i) => ({hour: `${i}:00`, count: 0}))).map((h, i) => (
                  <div className="bar-group" key={i} title={`${h.hour}: ${h.count} submissions`}>
                    <div
                      className="bar"
                      style={{
                        height: `${Math.max((h.count / barMax) * 140, h.count > 0 ? 4 : 0)}px`,
                        background: "var(--accent-gradient)",
                        opacity: h.count > 0 ? 0.6 + (h.count / barMax) * 0.4 : 0.15,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
                {["00", "04", "08", "12", "16", "20", "23"].map((d) => (
                  <span key={d} style={{ fontSize: 11, color: "var(--text-muted)" }}>{d}:00</span>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <h3>Problem Difficulty Split</h3>
              <div
                className="pie-chart"
                style={{
                  width: 160, height: 160, borderRadius: "50%",
                  margin: "0 auto 16px",
                  background: totalProblemCount > 0
                    ? `conic-gradient(var(--diff-easy) 0deg ${easyDeg}deg, var(--diff-medium) ${easyDeg}deg ${easyDeg + mediumDeg}deg, var(--diff-hard) ${easyDeg + mediumDeg}deg 360deg)`
                    : "var(--bg-input)",
                }}
              />
              <div className="pie-legend">
                {[
                  { label: "Easy", color: "var(--diff-easy)", pct: `${easyPct}%`, count: easyCount },
                  { label: "Medium", color: "var(--diff-medium)", pct: `${mediumPct}%`, count: mediumCount },
                  { label: "Hard", color: "var(--diff-hard)", pct: `${hardPct}%`, count: hardCount },
                ].map((p) => (
                  <div key={p.label} className="pie-legend-item">
                    <div className="pie-legend-dot" style={{ background: p.color }} />
                    {p.label} ({p.count}) <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--text-primary)" }}>{p.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Top Problems ── */}
          {adminStats && adminStats.top_problems.length > 0 && (
            <div className="table-card fade-in-up">
              <div className="table-header">
                <h3>Top Problems by Submissions</h3>
              </div>
              <table className="admin-table">
                <thead>
                  <tr><th>Problem</th><th>Submissions</th><th>Acceptance</th></tr>
                </thead>
                <tbody>
                  {adminStats.top_problems.map((tp) => (
                    <tr key={tp.slug}>
                      <td className="table-title">{tp.title}</td>
                      <td>{tp.submissions}</td>
                      <td><span style={{ color: tp.acceptance >= 50 ? "var(--diff-easy)" : tp.acceptance >= 30 ? "var(--diff-medium)" : "var(--diff-hard)" }}>{tp.acceptance}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>)}

          {/* ── Problems View ── */}
          {(sidebarView === "dashboard" || sidebarView === "problems") && (
          <div className="table-card fade-in-up">
            <div className="table-header">
              <h3>Manage Problems</h3>
              <input
                type="text"
                className="table-search"
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Title</th><th>Difficulty</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((p, i) => (
                  <tr key={p.slug}>
                    <td>#{i + 1}</td>
                    <td className="table-title">{p.title}</td>
                    <td><span className={`diff-badge ${diffColor(p.difficulty)}`}>{p.difficulty}</span></td>
                    <td>
                      <button className="action-btn" title="Edit" onClick={() => handleEditClick(p.slug)}>
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProblems.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>No problems found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* ── Users View ── */}
          {sidebarView === "users" && (
            <div className="table-card fade-in-up">
              <div className="table-header">
                <h3>All Users</h3>
              </div>
              <table className="admin-table">
                <thead>
                  <tr><th>ID</th><th>Username</th><th>Submissions</th><th>Solved</th><th>Joined</th><th>Last Active</th></tr>
                </thead>
                <tbody>
                  {adminStats?.recent_users?.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td className="table-title">{u.username}</td>
                      <td>{u.submissions}</td>
                      <td><span style={{ color: "var(--diff-easy)", fontWeight: 700 }}>{u.solved}</span></td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.joined ? new Date(u.joined).toLocaleDateString() : "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.last_active ? new Date(u.last_active).toLocaleString() : "Never"}</td>
                    </tr>
                  )) ?? (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>Loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Submissions View ── */}
          {sidebarView === "submissions" && (
            <>
              <div className="metric-grid stagger">
                <div className="metric-card">
                  <div className="metric-value">{adminStats?.submissions.total ?? "..."}</div>
                  <div className="metric-label">Total Submissions</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{adminStats?.submissions.today ?? "..."}</div>
                  <div className="metric-label">Today</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: "var(--diff-easy)" }}>{adminStats?.submissions.pass_count ?? "..."}</div>
                  <div className="metric-label">Passed</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: "var(--diff-hard)" }}>{adminStats?.submissions.fail_count ?? "..."}</div>
                  <div className="metric-label">Failed</div>
                </div>
              </div>

              {/* Language Distribution */}
              {adminStats?.language_distribution && (
                <div className="table-card fade-in-up">
                  <div className="table-header"><h3>Language Distribution</h3></div>
                  <div style={{ padding: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {Object.entries(adminStats.language_distribution).map(([lang, count]) => {
                      const total = adminStats.submissions.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={lang} style={{
                          flex: "1 1 200px", padding: 16,
                          background: "var(--bg-input)", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)",
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>{lang}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{count} submissions ({pct}%)</div>
                          <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-gradient)", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Problems in submissions view */}
              {adminStats && adminStats.top_problems.length > 0 && (
                <div className="table-card fade-in-up">
                  <div className="table-header"><h3>Problems by Submission Count</h3></div>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Problem</th><th>Submissions</th><th>Acceptance</th></tr>
                    </thead>
                    <tbody>
                      {adminStats.top_problems.map((tp) => (
                        <tr key={tp.slug}>
                          <td className="table-title">{tp.title}</td>
                          <td>{tp.submissions}</td>
                          <td><span style={{ color: tp.acceptance >= 50 ? "var(--diff-easy)" : tp.acceptance >= 30 ? "var(--diff-medium)" : "var(--diff-hard)" }}>{tp.acceptance}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ width: 640, maxHeight: "90vh", overflowY: "auto" }}>
            <h2>{viewMode === "create" ? "Create New Problem" : "Edit Problem"}</h2>

            {/* AI Prompt */}
            <div style={{
              marginBottom: 18, padding: 16, borderRadius: 8,
              background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))",
              border: "1px solid rgba(139,92,246,0.3)",
            }}>
              <div className="modal-form-group">
                <label style={{ color: "#a78bfa" }}>AI Prompt (describe the problem to generate)</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Generate a medium difficulty problem about finding the longest palindromic substring."
                  style={{ minHeight: 80, borderColor: "rgba(139,92,246,0.3)" }}
                />
              </div>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isGenerating}
                className="header-btn header-btn-primary"
                style={{ opacity: isGenerating ? 0.7 : 1 }}
              >
                {isGenerating ? "Generating..." : "Generate with AI"}
              </button>
            </div>

            {message && (
              <div style={{
                padding: 12, borderRadius: 6, marginBottom: 16,
                background: isError ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)",
                color: isError ? "#f87171" : "#4ade80",
                border: `1px solid ${isError ? "#f87171" : "#4ade80"}`,
                fontSize: 13,
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="modal-form-group">
                  <label>Slug</label>
                  <input type="text" name="slug" value={formData.slug} onChange={handleChange} placeholder="two_sum" required />
                </div>
                <div className="modal-form-group">
                  <label>Title</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Two Sum" required />
                </div>
              </div>

              <div className="modal-form-group">
                <label>Difficulty</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="modal-form-group">
                <label>Description (HTML)</label>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="<p>Given an array...</p>" style={{ minHeight: 140 }} />
              </div>

              <div className="form-row">
                <div className="modal-form-group">
                  <label>Python Template</label>
                  <textarea name="python_template" value={formData.python_template} onChange={handleChange} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
                </div>
                <div className="modal-form-group">
                  <label>C++ Template</label>
                  <textarea name="cpp_template" value={formData.cpp_template} onChange={handleChange} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
                </div>
              </div>

              <div className="modal-form-group">
                <label>Driver Code (Python)</label>
                <textarea name="driver_python" value={formData.driver_python} onChange={handleChange} placeholder="import sys&#10;from solution import Solution..." style={{ minHeight: 160, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
              </div>

              <div className="modal-form-group">
                <label>Driver Code (C++)</label>
                <textarea name="driver_cpp" value={formData.driver_cpp} onChange={handleChange} placeholder='#include "solution.cpp"&#10;int main() {...}' style={{ minHeight: 160, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
              </div>

              <div className="modal-form-group">
                <label>Test Data</label>
                <textarea name="test_data" value={formData.test_data} onChange={handleChange} placeholder='{"input": {...}, "expected": ...}' style={{ minHeight: 120, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
              </div>

              <div className="modal-actions">
                {viewMode === "edit" && (
                  <button type="button" className="header-btn" style={{ background: "rgba(248,113,113,0.2)", border: "1px solid #f87171", color: "#f87171" }} onClick={handleDelete}>
                    Delete
                  </button>
                )}
                <button type="button" className="header-btn" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid #3b82f6", color: "#60a5fa" }} onClick={testProblem} disabled={isTesting}>
                  {isTesting ? "Testing..." : "Test Driver"}
                </button>
                <button type="button" className="header-btn header-btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="header-btn header-btn-primary" disabled={loading}>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  {loading ? "Saving..." : viewMode === "create" ? "Create" : "Update"}
                </button>
              </div>

              {testOutput && (
                <div style={{
                  marginTop: 16, padding: 14, borderRadius: 6,
                  background: "var(--bg-input)", border: "1px solid var(--border-color)",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: "var(--text-secondary)", whiteSpace: "pre-wrap",
                  maxHeight: 200, overflowY: "auto",
                }}>
                  <div style={{ color: "var(--text-muted)", marginBottom: 6, fontSize: 11 }}>Test Output:</div>
                  {testOutput}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
