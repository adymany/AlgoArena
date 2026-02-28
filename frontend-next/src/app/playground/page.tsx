"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { getApiBase, authHeaders } from "@/lib/api";
import Navbar from "@/components/Navbar";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
});

export default function PlaygroundPage() {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(
    '# Write your code here...\n\nprint("Hello, World!")',
  );
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [leftWidth, setLeftWidth] = useState(50);
  const [bottomHeight, setBottomHeight] = useState(250);

  const hResizing = useRef(false);
  const vResizing = useRef(false);
  const hStartX = useRef(0);
  const hStartW = useRef(0);
  const vStartY = useRef(0);
  const vStartH = useRef(0);

  // Preserve user code locally
  useEffect(() => {
    const savedCode = localStorage.getItem(`playground_code_${language}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      if (language === "python")
        setCode('# Write your code here...\n\nprint("Hello, World!")');
      if (language === "cpp")
        setCode(
          '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!\\n";\n    return 0;\n}',
        );
      if (language === "c")
        setCode(
          '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
        );
    }
  }, [language]);

  const handleCodeChange = (newCode: string | undefined) => {
    const v = newCode || "";
    setCode(v);
    localStorage.setItem(`playground_code_${language}`, v);
  };

  const onHResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      hResizing.current = true;
      hStartX.current = e.clientX;
      hStartW.current = leftWidth;
      e.preventDefault();
    },
    [leftWidth],
  );

  const onVResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      vResizing.current = true;
      vStartY.current = e.clientY;
      vStartH.current = bottomHeight;
      e.preventDefault();
    },
    [bottomHeight],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (hResizing.current) {
        const containerWidth = window.innerWidth;
        const pctPerPx = 100 / containerWidth;
        const dx = e.clientX - hStartX.current;
        setLeftWidth(
          Math.max(20, Math.min(80, hStartW.current + dx * pctPerPx)),
        );
      }
      if (vResizing.current) {
        const diff = vStartY.current - e.clientY;
        setBottomHeight(
          Math.max(
            100,
            Math.min(window.innerHeight - 200, vStartH.current + diff),
          ),
        );
      }
    };
    const onUp = () => {
      hResizing.current = false;
      vResizing.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...\n");
    try {
      const res = await fetch(`${getApiBase()}/api/v1/playground/execute`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          language,
          code,
          stdin,
        }),
      });
      if (!res.ok) {
        throw new Error("Execution failed. Please check your connection.");
      }
      const data = await res.json();

      let outText = "";
      if (data.status === "TLE") {
        outText = "Execution Time Limit Exceeded (60s)\n";
      } else if (data.status === "Error") {
        outText = "Runtime Error:\n" + (data.output || data.error || "");
      } else {
        outText = data.output || "";
      }

      if (data.execution_time) {
        outText += `\n\n--- Execution Time: ${data.execution_time}s ---`;
      }

      setOutput(outText);
    } catch (err: any) {
      setOutput(err.message || "An error occurred during execution.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="ide-layout">
      <Navbar />

      <div className="panels">
        {/* Left Panel: Code Editor */}
        <div className="panel panel-left" style={{ width: `${leftWidth}%` }}>
          <div className="editor-toolbar">
            <select
              className="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="python">Python 3</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>

            <div style={{ flex: 1 }} />

            <button
              className="run-btn"
              onClick={handleRun}
              disabled={isRunning}
            >
              <svg viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>

          <div className="editor-area">
            <CodeEditor
              language={
                language === "python"
                  ? "python"
                  : language === "cpp"
                    ? "cpp"
                    : "c"
              }
              value={code}
              onChange={handleCodeChange}
            />
          </div>
        </div>

        <div className="resize-handle-h" onMouseDown={onHResizeMouseDown} />

        {/* Right Panel: I/O */}
        <div
          className="panel panel-right"
          style={{
            width: `${100 - leftWidth}%`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top of Right Panel: STDIN */}
          <div className="panel-header">
            <div className="panel-tabs">
              <span className="panel-tab active">Input (stdin)</span>
            </div>
          </div>
          <div
            className="panel-content"
            style={{ padding: 0, display: "flex" }}
          >
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter terminal input here..."
              style={{
                width: "100%",
                height: "100%",
                background: "var(--code-bg)",
                color: "var(--text-primary)",
                border: "none",
                padding: "16px",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "14px",
                resize: "none",
                outline: "none",
              }}
            />
          </div>

          <div className="resize-handle-v" onMouseDown={onVResizeMouseDown} />

          {/* Bottom of Right Panel: STDOUT */}
          <div
            className="bottom-panel"
            style={{
              height: bottomHeight,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="panel-header">
              <div className="panel-tabs">
                <span className="panel-tab active">Output (stdout)</span>
              </div>
            </div>
            <div
              className="panel-content"
              style={{
                padding: 0,
                background: "var(--code-bg)",
                overflowY: "auto",
                flex: 1,
              }}
            >
              <pre
                style={{
                  margin: 0,
                  padding: "16px",
                  color: "var(--text-primary)",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "14px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {output || "Output will appear here..."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
