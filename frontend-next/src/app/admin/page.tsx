"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

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
    if (!formData.title) {
      setMessage("❌ Please enter a title first");
      setIsError(true);
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const prompt = `
You are a coding problem generator. Generate a competitive programming problem.

Title: "${formData.title}"
Difficulty: "${formData.difficulty}"

=== MANDATORY FORMAT ===

Each test case in test_data MUST be a single-line JSON object:
{"input": {...}, "expected": ...}

The driver MUST parse this JSON format. Here's the EXACT pattern to follow:

=== COMPLETE PYTHON DRIVER TEMPLATE ===
import sys
import json
sys.path.insert(0, '/app')
from solution import Solution

sol = Solution()
case_id = 0

with open('test_data.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        case_id += 1
        try:
            data = json.loads(line)
            # Extract input args and expected result
            inp = data["input"]
            expected = data["expected"]
            
            # Call solution - ADAPT THIS LINE to match your function signature
            result = sol.solve(inp["arg1"], inp["arg2"])  # Example: adjust argument names
            
            status = "PASS" if result == expected else "FAIL"
            print(f"CASE|{case_id}|{status}|{inp}|{result}|{expected}")
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|error|{str(e)}|N/A")

=== COMPLETE C++ DRIVER TEMPLATE ===
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include "solution.cpp"
// Include any needed headers like <vector>, <algorithm>

int main() {
    Solution sol;
    std::ifstream file("test_data.txt");
    std::string line;
    int case_id = 0;
    
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        case_id++;
        // Parse JSON manually or use simple format
        // Call sol.methodName(...) 
        // Compare and print CASE|id|PASS/FAIL|input|output|expected
    }
    return 0;
}

=== TEST DATA FORMAT (one JSON per line) ===
{"input": {"nums": [1,2,3], "target": 2}, "expected": 1}
{"input": {"nums": [4,5,6], "target": 7}, "expected": -1}

=== OUTPUT JSON (return ONLY this, no markdown) ===
{
  "slug": "problem-slug-here",
  "description": "<h3>Problem Statement</h3><p>Clear description with examples...</p>",
  "python_template": "class Solution:\\n    def methodName(self, arg1, arg2):\\n        # Write your solution here\\n        pass",
  "cpp_template": "class Solution {\\npublic:\\n    int methodName(vector<int>& arg1, int arg2) {\\n        // Write your solution here\\n        return 0;\\n    }\\n};",
  "driver_python": "PASTE THE COMPLETE PYTHON DRIVER CODE HERE - adapted for this problem's function signature",
  "driver_cpp": "PASTE THE COMPLETE C++ DRIVER CODE HERE - adapted for this problem",
  "test_data": "One JSON object per line as shown above. Include 10-20 test cases covering edge cases."
}

CRITICAL:
1. driver_python MUST use json.loads() to parse each line
2. driver_python MUST call the EXACT method name from python_template
3. test_data MUST have input field names matching what driver expects
4. Solution template must have EMPTY body (pass/return 0) - NO SOLUTION CODE
5. Driver must NEVER contain solution logic - only call user's Solution class
      `;

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

      if (!response.ok) throw new Error("AI Request Failed");

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("No data received from AI");

      const generated = JSON.parse(rawText);

      setFormData((prev) => ({
        ...prev,
        slug: generated.slug || prev.slug,
        description: generated.description || prev.description,
        python_template: generated.python_template || prev.python_template,
        cpp_template: generated.cpp_template || prev.cpp_template,
        driver_python: generated.driver_python || prev.driver_python,
        driver_cpp: generated.driver_cpp || prev.driver_cpp,
        test_data: generated.test_data || prev.test_data,
      }));

      setMessage("✨ Content generated successfully!");
      setIsError(false);
    } catch (err) {
      console.error(err);
      setMessage(`❌ AI Generation failed: ${err}`);
      setIsError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const [problems, setProblems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"create" | "edit">("create");

  // Fetch problems on mount
  useState(() => {
    fetchProblems();
  });

  async function fetchProblems() {
    try {
      const res = await fetch("http://localhost:9000/api/v1/problems");
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
      const res = await fetch(`http://localhost:9000/api/v1/problems/${slug}`);
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
      setMessage("❌ Failed to load problem");
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
        `http://localhost:9000/api/v1/admin/problems/${formData.slug}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        setMessage("✅ Problem deleted");
        setIsError(false);
        fetchProblems();
        resetForm();
      } else {
        throw new Error("Delete failed");
      }
    } catch (e) {
      setMessage("❌ Delete failed");
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
        ? "http://localhost:9000/api/v1/admin/problems"
        : `http://localhost:9000/api/v1/admin/problems/${formData.slug}`;

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
            ? `✅ Problem "${formData.title}" created!`
            : `✅ Problem updated!`,
        );
        setIsError(false);
        fetchProblems();
        if (viewMode === "create") resetForm();
      } else {
        setMessage(`❌ ${data.error}`);
        setIsError(true);
      }
    } catch {
      setMessage("❌ Connection failed");
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
            onClick={() => router.push("/dashboard")}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Dashboard
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
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={isGenerating}
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                    border: "none",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: isGenerating ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: isGenerating ? 0.7 : 1,
                  }}
                >
                  {isGenerating ? "🔮 Generating..." : "✨ Auto-Fill with AI"}
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
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
