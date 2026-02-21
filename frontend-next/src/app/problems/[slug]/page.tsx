"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getApiBase, fetchJSON } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AISidebarSkeleton from "@/components/AISidebarSkeleton";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false });
const AISidebar = dynamic(() => import("@/components/AISidebar"), {
  ssr: false,
  loading: () => <AISidebarSkeleton />,
});

interface ProblemData {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  templates?: Record<string, string>;
}

interface TestCase {
  id: string;
  passed: boolean;
  input: string;
  output: string;
  expected: string;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<"testcases" | "output">("testcases");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [rawOutput, setRawOutput] = useState("");
  const [bottomHeight, setBottomHeight] = useState(200);
  const [activePanelTab, setActivePanelTab] = useState<"description" | "editorial">("description");

  const isResizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (!uid) { router.push("/login"); return; }
    setUserId(Number(uid));

    fetchJSON<ProblemData>(`${getApiBase()}/api/v1/problems/${slug}`)
      .then((data) => {
        if (!data) return;
        setProblem(data);
        if (data.templates) {
          setCode(data.templates.python || data.templates.cpp || "");
        }
      })
      .catch(() => {});
  }, [slug, router]);

  useEffect(() => {
    if (!problem?.templates) return;
    const lang = language === "python" ? "python" : "cpp";
    const savedKey = `code_${slug}_${lang}`;
    const saved = localStorage.getItem(savedKey);
    if (saved) { setCode(saved); return; }
    setCode(problem.templates[lang] || "");
  }, [language, problem, slug]);

  useEffect(() => {
    if (!slug || !code) return;
    const lang = language === "python" ? "python" : "cpp";
    localStorage.setItem(`code_${slug}_${lang}`, code);
  }, [code, slug, language]);

  const parseTestCases = (raw: string): TestCase[] => {
    const cases: TestCase[] = [];
    const lines = raw.split("\n");
    for (const line of lines) {
      const parts = line.split("|");
      if (parts[0] === "CASE" && parts.length >= 6) {
        cases.push({
          id: parts[1],
          passed: parts[2] === "PASS",
          input: parts[3],
          output: parts[4],
          expected: parts[5],
        });
      }
    }
    return cases;
  };

  const handleRun = async () => {
    setIsRunning(true);
    setActiveBottomTab("testcases");
    setTestCases([]);
    setRawOutput("");
    try {
      const res = await fetch(`${getApiBase()}/api/v1/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language === "python" ? "python" : "cpp",
          code,
          problem_id: slug,
          user_id: userId,
        }),
      });
      if (!res.ok) throw new Error("Run failed");
      const data = await res.json();
      const output = data.output || data.error || "";
      setRawOutput(output);
      const cases = parseTestCases(output);
      if (cases.length > 0) setTestCases(cases);
    } catch {
      setRawOutput("Error running code. Check your connection.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setActiveBottomTab("testcases");
    setTestCases([]);
    setRawOutput("");
    try {
      const res = await fetch(`${getApiBase()}/api/v1/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          problem_id: slug,
          language: language === "python" ? "python" : "cpp",
          code,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      const output = data.output || data.error || "";
      setRawOutput(output);
      const cases = parseTestCases(output);
      if (cases.length > 0) setTestCases(cases);
    } catch {
      setRawOutput("Error submitting code. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startY.current = e.clientY;
    startH.current = bottomHeight;
    e.preventDefault();
  }, [bottomHeight]);

  // Horizontal panel resizing
  const [leftWidth, setLeftWidth] = useState(35);
  const [rightWidth, setRightWidth] = useState(25);
  const hResizing = useRef<"left" | "right" | null>(null);
  const hStartX = useRef(0);
  const hStartW = useRef(0);

  const onHResizeMouseDown = useCallback((side: "left" | "right") => (e: React.MouseEvent) => {
    hResizing.current = side;
    hStartX.current = e.clientX;
    hStartW.current = side === "left" ? leftWidth : rightWidth;
    e.preventDefault();
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hResizing.current) {
        const containerWidth = window.innerWidth;
        const pctPerPx = 100 / containerWidth;
        const dx = e.clientX - hStartX.current;

        if (hResizing.current === "left") {
          setLeftWidth(Math.max(15, Math.min(55, hStartW.current + dx * pctPerPx)));
        } else {
          setRightWidth(Math.max(15, Math.min(45, hStartW.current - dx * pctPerPx)));
        }
      }
      if (isResizing.current) {
        const diff = startY.current - e.clientY;
        setBottomHeight(Math.max(80, Math.min(500, startH.current + diff)));
      }
    };
    const onUp = () => {
      isResizing.current = false;
      hResizing.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const diffBadge = (d: string) => {
    const dl = d?.toLowerCase();
    if (dl === "easy") return <span className="diff-badge diff-easy" style={{ fontSize: 11 }}>Easy</span>;
    if (dl === "medium") return <span className="diff-badge diff-medium" style={{ fontSize: 11 }}>Medium</span>;
    return <span className="diff-badge diff-hard" style={{ fontSize: 11 }}>Hard</span>;
  };

  const renderDescription = () => {
    if (!problem) return null;
    return (
      <div
        className="problem-description"
        dangerouslySetInnerHTML={{ __html: problem.description || "" }}
      />
    );
  };

  return (
    <div className="ide-layout">
      <Navbar />
      <div className="ide-sub-bar">
        <div className="ide-problem-name">
          {problem?.title || "Loading..."}
          {problem && <> {diffBadge(problem.difficulty)}</>}
        </div>
        <div className="ide-nav-spacer" />
        <div className="ide-nav-actions">
          <button className="run-btn" onClick={handleRun} disabled={isRunning || !problem}>
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            {isRunning ? "Running..." : "Run"}
          </button>
          <button className="submit-code-btn" onClick={handleSubmit} disabled={isSubmitting || !problem}>
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <div className="panels">
        <div className="panel panel-left" style={{ width: `${leftWidth}%` }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <button
                className={`panel-tab${activePanelTab === "description" ? " active" : ""}`}
                onClick={() => setActivePanelTab("description")}
              >
                Description
              </button>
              <button
                className={`panel-tab${activePanelTab === "editorial" ? " active" : ""}`}
                onClick={() => setActivePanelTab("editorial")}
              >
                Editorial
              </button>
            </div>
          </div>
          <div className="panel-content">
            {problem ? (
              <>
                <div className="problem-header">
                  <h1>{problem.title}</h1>
                  <div className="problem-meta">
                    {diffBadge(problem.difficulty)}
                  </div>
                </div>
                {renderDescription()}
              </>
            ) : (
              <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading problem...</div>
            )}
          </div>
        </div>

        <div className="resize-handle-h" onMouseDown={onHResizeMouseDown("left")} />

        <div className="panel panel-center" style={{ width: `${100 - leftWidth - rightWidth}%` }}>
          <div className="editor-toolbar">
            <select
              className="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="editor-area">
            <CodeEditor
              language={language === "python" ? "python" : "cpp"}
              value={code}
              onChange={(v) => setCode(v || "")}
            />
          </div>

          <div className="resize-handle-v" onMouseDown={onResizeMouseDown} />
          <div className="bottom-panel" style={{ height: bottomHeight }}>
            <div className="panel-header">
              <div className="panel-tabs">
                <button
                  className={`panel-tab${activeBottomTab === "testcases" ? " active" : ""}`}
                  onClick={() => setActiveBottomTab("testcases")}
                >
                  Test Cases
                </button>
                <button
                  className={`panel-tab${activeBottomTab === "output" ? " active" : ""}`}
                  onClick={() => setActiveBottomTab("output")}
                >
                  Output
                </button>
              </div>
            </div>
            <div className="panel-content">
              {activeBottomTab === "testcases" ? (
                testCases.length > 0 ? (
                  testCases.map((tc) => (
                    <div key={tc.id} className={`test-case-result ${tc.passed ? "pass" : "fail"}`}>
                      <div className="test-case-header">
                        <span className={`test-badge ${tc.passed ? "pass" : "fail"}`}>
                          {tc.passed ? "PASS" : "FAIL"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Case #{tc.id}</span>
                      </div>
                      <div className="test-row">
                        <span className="test-label">Input:</span>
                        <span className="test-value">{tc.input}</span>
                      </div>
                      <div className="test-row">
                        <span className="test-label">Output:</span>
                        <span className="test-value">{tc.output}</span>
                      </div>
                      <div className="test-row">
                        <span className="test-label">Expected:</span>
                        <span className="test-value">{tc.expected}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {isRunning || isSubmitting ? "Running..." : "Run or submit your code to see test results."}
                  </div>
                )
              ) : (
                <div className="output-raw">
                  {rawOutput || "No output yet. Run or submit code first."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="resize-handle-h" onMouseDown={onHResizeMouseDown("right")} />

        <div className="panel panel-right" style={{ width: `${rightWidth}%` }}>
          <div className="panel-header">
            <div className="panel-tabs">
              <span className="panel-tab active">
                AI Assistant
                <span className="ai-header-badge">Gemini</span>
              </span>
            </div>
          </div>
          <AISidebar
            code={code}
            language={language}
            userId={userId}
            problemId={slug}
          />
        </div>
      </div>
    </div>
  );
}
