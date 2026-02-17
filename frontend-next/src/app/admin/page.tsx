"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    difficulty: "Easy",
    description: "",
    python_template: "class Solution:\n    def solve(self):\n        ",
    cpp_template:
      "class Solution {\npublic:\n    void solve() {\n        \n    }\n};",
    driver_python: "",
    driver_cpp: "",
    test_data: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim() && !formData.title) {
      setMessage("Please enter a prompt or a title first");
      setIsError(true);
      return;
    }

    setIsGenerating(true);
    setMessage("");

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
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("No data received from AI");

      // Strip markdown code fences if present (```json ... ```)
      let jsonStr = rawText.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\s*/, "")
          .replace(/\s*```$/, "");
      }

      console.log("Raw AI text (first 500 chars):", jsonStr.substring(0, 500));

      let generated;
      try {
        generated = JSON.parse(jsonStr);
      } catch {
        // Fix literal control chars that break JSON
        const fixed = jsonStr.replace(/[\x00-\x1f]/g, (ch: string) => {
          if (ch === "\n") return "\\n";
          if (ch === "\r") return "\\r";
          if (ch === "\t") return "\\t";
          return "";
        });
        generated = JSON.parse(fixed);
      }

      let testDataStr = generated.test_data;
      if (Array.isArray(generated.test_data)) {
        testDataStr = generated.test_data
          .map((item: any) => JSON.stringify(item))
          .join("\n");
      }

      console.log("AI generated keys:", Object.keys(generated));
      console.log("AI generated data:", generated);

      setFormData((prev) => ({
        ...prev,
        slug: generated.slug || prev.slug,
        title: generated.title || prev.title,
        description: generated.description || prev.description,
        python_template:
          generated.python_template ||
          generated.pythonTemplate ||
          generated.python_starter ||
          prev.python_template,
        cpp_template:
          generated.cpp_template ||
          generated.cppTemplate ||
          generated.cpp_starter ||
          prev.cpp_template,
        driver_python:
          generated.driver_python ||
          generated.driverPython ||
          generated.python_driver ||
          prev.driver_python,
        driver_cpp:
          generated.driver_cpp ||
          generated.driverCpp ||
          generated.cpp_driver ||
          prev.driver_cpp,
        test_data: testDataStr || prev.test_data,
      }));

      setMessage("Content generated successfully!");
      setIsError(false);
    } catch (err) {
      console.error(err);
      setMessage(`AI Generation failed: ${err}`);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const testProblem = async () => {
    if (
      !formData.driver_python ||
      !formData.python_template ||
      !formData.test_data
    ) {
      setMessage("Need driver code, template, and test data to test");
      setIsError(true);
      return;
    }

    setIsTesting(true);
    setTestOutput("");
    setMessage("");

    try {
      // Use the python template as-is (it's the correct solution scaffold)
      // The execute endpoint will pair it with the driver + test data
      const res = await fetch(`${getApiBase()}/api/v1/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "python",
          code: formData.python_template,
          problem_id: formData.slug || "__test__",
          user_id: 0,
          // Pass driver and test data for ad-hoc testing
          driver_code: formData.driver_python,
          test_data: formData.test_data,
        }),
      });

      const data = await res.json();
      const output = data.output || "No output";
      setTestOutput(output);

      if (data.exit_code === 0 && output.includes("CASE|")) {
        const hasFailures = output.includes("|FAIL|");
        if (hasFailures) {
          setMessage("Test ran but some cases failed — check output below");
          setIsError(true);
        } else {
          setMessage("All test cases passed! Driver is working correctly.");
          setIsError(false);
        }
      } else if (data.status === "TLE") {
        setMessage("Time Limit Exceeded during testing");
        setIsError(true);
      } else {
        setMessage("Test execution failed — check output below");
        setIsError(true);
      }
    } catch (err) {
      setMessage(`Test failed: ${err}`);
      setIsError(true);
    } finally {
      setIsTesting(false);
    }
  };

  const [problems, setProblems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"create" | "edit">("create");

  // Fetch problems on mount
  useEffect(() => {
    fetchProblems();
  }, []);

  async function fetchProblems() {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/problems`);
      const data = await res.json();
      if (Array.isArray(data)) setProblems(data);
    } catch (e) {
      console.error("Failed to fetch problems", e);
    }
  }

  const resetForm = () => {
    setViewMode("create");
    setFormData({
      slug: "",
      title: "",
      difficulty: "Easy",
      description: "",
      python_template: "class Solution:\n    def solve(self):\n        ",
      cpp_template:
        "class Solution {\npublic:\n    void solve() {\n        \n    }\n};",
      driver_python: "",
      driver_cpp: "",
      test_data: "",
    });
    setMessage("");
    setIsError(false);
  };

  const handleEditClick = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/problems/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch problem details");
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
      setMessage("");
    } catch (e) {
      console.error(e);
      setMessage("Failed to load problem");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${formData.title}"?`))
      return;

    setLoading(true);
    try {
      const res = await fetch(
        `${getApiBase()}/api/v1/admin/problems/${formData.slug}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        setMessage("Problem deleted");
        setIsError(false);
        fetchProblems();
        resetForm();
      } else {
        throw new Error("Delete failed");
      }
    } catch (e) {
      setMessage("Delete failed");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const url =
      viewMode === "create"
        ? `${getApiBase()}/api/v1/admin/problems`
        : `${getApiBase()}/api/v1/admin/problems/${formData.slug}`;

    const method = viewMode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(
          viewMode === "create"
            ? `Problem "${formData.title}" created!`
            : `Problem updated!`,
        );
        setIsError(false);
        fetchProblems();
        if (viewMode === "create") resetForm();
      } else {
        setMessage(`Error: ${data.error}`);
        setIsError(true);
      }
    } catch {
      setMessage("Connection failed");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    background: "var(--bg-editor)",
    color: "white",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 500,
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "120px",
    fontFamily: "monospace",
    resize: "vertical",
  };

  return (
    <>
      {/* ... navbar ... */}
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--accent-purple)", fontWeight: 600 }}>
            Admin Panel
          </span>
          <button
            onClick={() => router.push("/admin/dashboard")}
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#a78bfa",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => router.push("/problems")}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </nav>

      <div
        className="main-container"
        style={{ display: "flex", overflow: "hidden" }}
      >
        {/* Sidebar List */}
        <div
          style={{
            width: "300px",
            background: "var(--bg-panel)",
            borderRight: "1px solid var(--border-color)",
            overflowY: "auto",
            padding: "1rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ color: "white", fontSize: "1rem" }}>Problems</h3>
            <button
              onClick={resetForm}
              style={{
                background: "var(--accent-green)",
                border: "none",
                color: "white",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="New Problem"
            >
              +
            </button>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {problems.map((p) => (
              <div
                key={p.slug}
                onClick={() => handleEditClick(p.slug)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background:
                    formData.slug === p.slug
                      ? "var(--accent-purple)"
                      : "var(--bg-editor)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {p.title}
                <div
                  style={{
                    fontSize: "0.7rem",
                    color:
                      formData.slug === p.slug
                        ? "white"
                        : "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {p.difficulty}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h1 style={{ color: "white", margin: 0 }}>
                {viewMode === "create" ? "Add New Problem" : "Edit Problem"}
              </h1>
              <div style={{ display: "flex", gap: "1rem" }}>
                {viewMode === "edit" && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      background: "rgba(248,113,113,0.2)",
                      border: "1px solid #f87171",
                      color: "#f87171",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* AI Prompt Section */}
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1.25rem",
                borderRadius: "8px",
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              <label
                style={{
                  ...labelStyle,
                  color: "#a78bfa",
                  marginBottom: "0.75rem",
                }}
              >
                AI Prompt (describe the problem you want to generate)
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Generate a medium difficulty problem about finding the longest palindromic substring. Include edge cases for single character strings and strings with all same characters."
                style={{
                  ...textareaStyle,
                  minHeight: "100px",
                  marginBottom: "0.75rem",
                  borderColor: "rgba(139,92,246,0.3)",
                }}
              />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={isGenerating}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                    border: "none",
                    color: "white",
                    padding: "0.5rem 1.25rem",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: isGenerating ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isGenerating ? 0.7 : 1,
                  }}
                >
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </button>
              </div>
            </div>

            {message && (
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "6px",
                  marginBottom: "1.5rem",
                  background: isError
                    ? "rgba(248,113,113,0.2)"
                    : "rgba(74,222,128,0.2)",
                  color: isError ? "#f87171" : "#4ade80",
                  border: `1px solid ${isError ? "#f87171" : "#4ade80"}`,
                }}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ... rest of form ... */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="e.g. two_sum"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Two Sum"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <label style={labelStyle}>Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <label style={labelStyle}>Description (HTML)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="<p>Given an array...</p>"
                style={{ ...textareaStyle, minHeight: "200px" }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label style={labelStyle}>Python Template</label>
                  <textarea
                    name="python_template"
                    value={formData.python_template}
                    onChange={handleChange}
                    style={textareaStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>C++ Template</label>
                  <textarea
                    name="cpp_template"
                    value={formData.cpp_template}
                    onChange={handleChange}
                    style={textareaStyle}
                  />
                </div>
              </div>

              <label style={labelStyle}>Driver Code (Python)</label>
              <textarea
                name="driver_python"
                value={formData.driver_python}
                onChange={handleChange}
                placeholder="import sys\nfrom solution import Solution\n..."
                style={{ ...textareaStyle, minHeight: "200px" }}
              />

              <label style={labelStyle}>Driver Code (C++)</label>
              <textarea
                name="driver_cpp"
                value={formData.driver_cpp}
                onChange={handleChange}
                placeholder={'#include "solution.cpp"\nint main() {...}'}
                style={{ ...textareaStyle, minHeight: "200px" }}
              />

              <label style={labelStyle}>Test Data</label>
              <textarea
                name="test_data"
                value={formData.test_data}
                onChange={handleChange}
                placeholder="input1 expected1\ninput2 expected2"
                style={{ ...textareaStyle, minHeight: "150px" }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "var(--accent-purple)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: "1rem",
                }}
              >
                {loading
                  ? "Saving..."
                  : viewMode === "create"
                    ? "Create Problem"
                    : "Update Problem"}
              </button>

              {/* Test Button */}
              <button
                type="button"
                onClick={testProblem}
                disabled={isTesting}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: isTesting ? "#334155" : "rgba(59,130,246,0.2)",
                  color: "#60a5fa",
                  border: "1px solid #3b82f6",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: isTesting ? "wait" : "pointer",
                  marginTop: "0.5rem",
                }}
              >
                {isTesting ? "Testing..." : "Test Problem (Run Driver)"}
              </button>

              {/* Test Output */}
              {testOutput && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    borderRadius: "6px",
                    background: "var(--bg-editor)",
                    border: "1px solid var(--border-color)",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    color: "#e2e8f0",
                    whiteSpace: "pre-wrap",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      marginBottom: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    Test Output:
                  </div>
                  {testOutput}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
