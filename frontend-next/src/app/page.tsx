"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";

import AISidebarSkeleton from "@/components/AISidebarSkeleton";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="editor-wrapper"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
      }}
    >
      Loading editor...
    </div>
  ),
});

const AISidebar = dynamic(() => import("@/components/AISidebar"), {
  ssr: false,
  loading: () => <AISidebarSkeleton />,
});

// Hardcoded defaults no longer used, templates fetched from API
const defaultCode = "# Select a language to start coding";

type Language = "python" | "cpp";

interface ExecuteResponse {
  output?: string;
  exit_code?: number;
  status?: string;
}

interface TestCase {
  id: string;
  status: "PASS" | "FAIL";
  input: string;
  output: string;
  expected: string;
}

function parseTestCases(rawOutput: string): TestCase[] {
  const lines = rawOutput
    .split("\n")
    .filter((line) => line.startsWith("CASE|"));
  return lines.map((line) => {
    const parts = line.split("|");
    return {
      id: parts[1] || "?",
      status: parts[2] as "PASS" | "FAIL",
      input: parts[3] || "",
      output: parts[4] || "",
      expected: parts[5] || "",
    };
  });
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const problemSlug = searchParams.get("problem") || "two_sum";

  const [problem, setProblem] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(defaultCode);
  const [rawOutput, setRawOutput] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resizable panel state
  const [outputHeight, setOutputHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const editorPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auth Check
    const uid = localStorage.getItem("user_id");
    const uname = localStorage.getItem("username");
    if (!uid) {
      router.push("/login");
      return;
    }
    setUserId(parseInt(uid));
    setUsername(uname || "");

    // Fetch Problem
    fetch(`http://localhost:9000/api/v1/problems/${problemSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Problem not found");
        } else {
          setProblem(data);
          // Set initial code based on current language
          if (data.templates && data.templates[language]) {
            setCode(data.templates[language]);
          }
        }
      })
      .catch((err) => console.error("Failed to load problem", err));
  }, [problemSlug, router]); // NOTE: language in dep array might reset code on lang switch, handle carefully below

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (problem && problem.templates && problem.templates[newLang]) {
      setCode(problem.templates[newLang]);
    } else {
      setCode("# No template found for this language");
    }
  };

  const handleRun = async () => {
    setStatus("Running...");
    setIsError(false);
    setRawOutput("Executing...");
    setTestCases([]);
    setIsRunning(true);

    try {
      const response = await fetch("http://localhost:9000/api/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          problem_id: problem?.slug || "two_sum",
          user_id: userId,
        }),
      });

      const data: ExecuteResponse = await response.json();
      const output = data.output || "No output";
      setRawOutput(output);

      const cases = parseTestCases(output);
      setTestCases(cases);

      if (data.exit_code === 0 && data.status === "Executed") {
        const allPassed =
          cases.length > 0 && cases.every((c) => c.status === "PASS");
        if (allPassed) {
          setStatus(`All ${cases.length} test cases passed!`);
          setIsError(false);
        } else {
          const failed = cases.filter((c) => c.status === "FAIL").length;
          setStatus(`${failed} test case(s) failed`);
          setIsError(true);
        }
      } else if (data.status === "TLE") {
        setStatus("Time Limit Exceeded");
        setIsError(true);
      } else {
        setStatus("Error");
        setIsError(true);
      }
    } catch (error) {
      setRawOutput("Server error: " + String(error));
      setStatus("Connection Error");
      setIsError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !problem) return;
    setIsSubmitting(true);
    setStatus("Submitting...");

    try {
      const res = await fetch("http://localhost:9000/api/v1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          problem_id: problem.slug,
          language,
          code,
        }),
      });

      if (res.ok) {
        setStatus("✅ Submitted successfully!");
        setIsError(false);
      } else {
        const data = await res.json();
        setStatus(`❌ ${data.error}`);
        setIsError(true);
      }
    } catch (err) {
      setStatus("Connection error");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resize handlers
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !editorPanelRef.current) return;

      const panelRect = editorPanelRef.current.getBoundingClientRect();
      const newHeight = panelRect.bottom - e.clientY;

      // Constrain between 150px and 60% of panel height
      const minHeight = 150;
      const maxHeight = panelRect.height * 0.6;
      setOutputHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            {problem?.title || "Loading..."}
          </span>
        </div>
      </nav>

      <div className="main-container">
        {/* Problem Description Panel */}
        <div className="problem-panel">
          <div className="panel-header">
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-blue)",
                cursor: "pointer",
                marginRight: "1rem",
              }}
            >
              ← Back
            </button>
            📋 Description
          </div>
          <div className="problem-content">
            {problem ? (
              <>
                <h1 className="problem-title">{problem.title}</h1>
                <span className="difficulty-badge">{problem.difficulty}</span>
                <div
                  className="problem-description"
                  dangerouslySetInnerHTML={{ __html: problem.description }}
                />
              </>
            ) : (
              <div style={{ color: "var(--text-secondary)" }}>
                Loading problem...
              </div>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="editor-panel" ref={editorPanelRef}>
          <div className="editor-toolbar">
            <select
              className="language-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>

            <div className="btn-group">
              <button
                className="btn-run primary"
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
              >
                {isRunning ? "⏳ Running..." : "▶ Run"}
              </button>
              <button
                className="btn-run"
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                style={{ background: "#22c55e", marginLeft: "0.5rem" }}
              >
                {isSubmitting ? "⏳ Submitting..." : "✓ Submit"}
              </button>
            </div>
          </div>

          <div className="editor-wrapper">
            <CodeEditor
              language={language === "cpp" ? "cpp" : "python"}
              value={code}
              onChange={(value) => setCode(value || "")}
            />
          </div>

          {/* Resize Handle */}
          <div
            className={`resize-handle ${isResizing ? "active" : ""}`}
            onMouseDown={handleMouseDown}
          >
            <div className="resize-grip"></div>
          </div>

          {/* Output Panel */}
          <div className="output-panel" style={{ height: outputHeight }}>
            <div className="output-header">
              <span className="output-tab">Test Results</span>
              <div className="status-indicator">
                <span
                  className="status-dot"
                  style={{ background: isError ? "#f87171" : "#4ade80" }}
                ></span>
                <span className={`status-text ${isError ? "error" : ""}`}>
                  {status}
                </span>
              </div>
            </div>
            <div className="output-content">
              {testCases.length > 0 ? (
                <div className="test-cases">
                  {testCases.map((tc) => (
                    <div
                      key={tc.id}
                      className={`test-case ${tc.status.toLowerCase()}`}
                    >
                      <div className="test-case-header">
                        <span
                          className={`test-badge ${tc.status.toLowerCase()}`}
                        >
                          {tc.status === "PASS" ? "✓" : "✗"} Case {tc.id}
                        </span>
                      </div>
                      <div className="test-case-body">
                        <div className="test-row">
                          <span className="test-label">Input:</span>
                          <span className="test-value">{tc.input}</span>
                        </div>
                        <div className="test-row">
                          <span className="test-label">Your Output:</span>
                          <span className="test-value">[{tc.output}]</span>
                        </div>
                        <div className="test-row">
                          <span className="test-label">Expected:</span>
                          <span className="test-value">[{tc.expected}]</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="output-result">
                  {rawOutput || 'Click "Run" to execute your code...'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Sidebar */}
        {problem ? (
          <AISidebar
            code={code}
            language={language}
            userId={userId}
            problemId={problem.slug}
          />
        ) : (
          <AISidebarSkeleton />
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          className="main-container"
          style={{ color: "white", padding: "2rem" }}
        >
          Loading Arena...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
