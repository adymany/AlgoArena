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
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalInput, setTerminalInput] = useState("");

  const [leftWidth, setLeftWidth] = useState(50);
  const hResizing = useRef(false);
  const hStartX = useRef(0);
  const hStartW = useRef(0);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Preserve user code locally
  useEffect(() => {
    const savedCode = localStorage.getItem(`playground_code_${language}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      if (language === "python")
        setCode(
          '# Write your code here...\ni = input("Enter value: ")\nprint("You said:", i)',
        );
      if (language === "cpp")
        setCode(
          '#include <iostream>\nusing namespace std;\n\nint main() {\n    string s;\n    cout << "Enter value: ";\n    cin >> s;\n    cout << "You said: " << s << "\\n";\n    return 0;\n}',
        );
      if (language === "c")
        setCode(
          '#include <stdio.h>\n\nint main() {\n    char s[100];\n    printf("Enter value: ");\n    scanf("%s", s);\n    printf("You said: %s\\n", s);\n    return 0;\n}',
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
    };
    const onUp = () => {
      hResizing.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isRunning]);

  const pollTerminal = async (sid: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/playground/poll/${sid}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("poll failed");
      const data = await res.json();

      if (data.output) {
        // Strip all TTY control characters:
        // 1. ANSI escape sequences (colors, cursor moves, etc.)
        // 2. Carriage returns
        // 3. Any remaining non-printable chars (except newline \n and tab \t)
        const cleanOutput = data.output
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "") // ANSI escape sequences
          .replace(/\x1b\].*?(\x07|\x1b\\)/g, "") // OSC sequences
          .replace(/\r/g, "") // carriage returns
          .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ""); // other control chars
        setOutput((prev) => prev + cleanOutput);
      }

      if (data.running) {
        setTimeout(() => pollTerminal(sid), 200);
      } else {
        setIsRunning(false);
        setSessionId(null);
        if (data.execution_time !== undefined) {
          setOutput(
            (prev) =>
              prev +
              `\n\n--- Process exited with code ${data.exit_code} in ${data.execution_time}s ---`,
          );
        }
      }
    } catch (e: any) {
      setIsRunning(false);
      setSessionId(null);
      setOutput(
        (prev) => prev + "\n[Terminal connection lost or ended unexpectedly]",
      );
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...\n");
    setSessionId(null);
    setTerminalInput("");

    try {
      const res = await fetch(`${getApiBase()}/api/v1/playground/start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          language,
          code,
        }),
      });
      if (!res.ok) {
        throw new Error("Execution failed to start.");
      }
      const data = await res.json();
      const sid = data.session_id;
      setSessionId(sid);

      // Focus the terminal input box immediately
      setTimeout(() => terminalInputRef.current?.focus(), 100);

      // Start polling
      pollTerminal(sid);
    } catch (err: any) {
      setOutput(err.message || "An error occurred starting the execution.");
      setIsRunning(false);
    }
  };

  const handleTerminalInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" && sessionId) {
      const val = terminalInput;
      setTerminalInput(""); // Reset input box

      try {
        await fetch(`${getApiBase()}/api/v1/playground/input/${sessionId}`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ input: val }),
        });
      } catch (e) {
        console.error("Failed to send input", e);
      }
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

        {/* Right Panel: Terminal */}
        <div
          className="panel panel-right"
          style={{
            width: `${100 - leftWidth}%`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="panel-header">
            <div className="panel-tabs">
              <span className="panel-tab active">Terminal</span>
            </div>
          </div>
          <div
            className="panel-content"
            style={{
              padding: "16px",
              background: "var(--code-bg)",
              overflowY: "auto",
              flex: 1,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "14px",
              color: "var(--text-primary)",
              cursor: "text",
            }}
            onClick={() => isRunning && terminalInputRef.current?.focus()}
          >
            <pre
              style={{
                margin: 0,
                color: "inherit",
                fontFamily: "inherit",
                fontSize: "inherit",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {output || "Output will appear here..."}
            </pre>

            {isRunning && (
              <div style={{ display: "flex", marginTop: "2px" }}>
                <input
                  ref={terminalInputRef}
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalInputKeyDown}
                  autoComplete="off"
                  spellCheck="false"
                  style={{
                    background: "transparent",
                    color: "var(--text-primary)",
                    border: "none",
                    outline: "none",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: "14px",
                    flex: 1,
                    padding: 0,
                    margin: 0,
                  }}
                />
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
