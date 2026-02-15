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
You are an expert competitive programming problem generator.
Your task is to generate a complete problem in JSON format, including robust driver code for testing.

Title: "${formData.title}"
Difficulty: "${formData.difficulty}"

=== GOAL ===
Generate a valid JSON object containing:
1. slug (kebab-case)
2. description (HTML format)
3. python_template (Solution class scaffold)
4. cpp_template (Solution class scaffold)
5. driver_python (Complete runnable test script)
6. driver_cpp (Complete runnable test script)
7. test_data (One JSON object per line)

=== CRITICAL REQUIREMENTS ===
1. **Driver Code**: MUST read 'test_data.txt' line by line.
2. **Test Data**: Each line is a JSON object: {"input": {...}, "expected": ...}
3. **Execution**: Driver must parse input, call the Solution method, and print results.
4. **Validation**: Compare result with expected. Print "CASE|{id}|PASS|..." or "CASE|{id}|FAIL|...".
5. **C++ Parsing**: Use std::regex to parse the JSON input manually (since no external JSON lib is available).
6. **Quantity**: Generate exactly 3-4 diverse test cases.

=== ONE-SHOT EXAMPLE (follow this structure EXACTLY) ===

If the problem is "Two Sum" (find two indices adding to target):

python_template:
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return []

driver_python:
import sys
import json
from solution import Solution

sol = Solution()
case_id = 0

with open('test_data.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        case_id += 1
        try:
            data = json.loads(line)
            inputs = data['input']
            expected = data['expected']
            
            # ADAPT: Unpack arguments based on problem
            result = sol.twoSum(inputs['nums'], inputs['target'])
            
            status = "PASS" if result == expected else "FAIL"
            print(f"CASE|{case_id}|{status}|{inputs}|{result}|{expected}")
        except Exception as e:
            print(f"CASE|{case_id}|FAIL|ERROR|{e}|N/A")

driver_cpp:
#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <regex>
#include "solution.cpp"

// Simple helper to parse list of ints from string "[1,2,3]"
std::vector<int> parseIntArray(std::string s) {
    std::vector<int> res;
    std::regex r("-?\\\\d+");
    auto words_begin = std::sregex_iterator(s.begin(), s.end(), r);
    auto words_end = std::sregex_iterator();
    for (std::sregex_iterator i = words_begin; i != words_end; ++i)
        res.push_back(std::stoi(i->str()));
    return res;
}

int main() {
    Solution sol;
    std::ifstream file("test_data.txt");
    std::string line;
    int case_id = 0;


    // ADAPT: Regex to extract inputs. Example for {"input": {"nums": [...], "target": 9}, "expected": [...]}
    // You MUST write a specific regex for the generated test_data format.
    // Use R"(...)" for raw strings to avoid escape hell.
    // Use \\s* to be flexible with whitespace.
    // Example Pattern: R"(\"nums\":\s*(\[.*?\]),\s*\"target\":\s*(-?\d+).*\"expected\":\s*(-?\d+))"
    std::regex pattern(R"(\"nums\":\s*(\[.*?\]),\s*\"target\":\s*(-?\d+).*\"expected\":\s*(-?\d+))");

    while (std::getline(file, line)) {
        if (line.empty()) continue;
        case_id++;
        std::smatch matches;
        if (std::regex_search(line, matches, pattern)) {
            // Parse extracted strings
            std::vector<int> nums = parseIntArray(matches[1].str());
            int target = std::stoi(matches[2].str());
            std::vector<int> expected = parseIntArray(matches[3].str());

            // ADAPT: Call solution
            std::vector<int> result = sol.twoSum(nums, target);

            bool pass = (result == expected);
            std::cout << "CASE|" << case_id << "|" << (pass ? "PASS" : "FAIL") 
                      << "|" << line << "|" << (pass ? "OK" : "BAD") << "|" << "N/A" << std::endl;
        } else {
             std::cout << "CASE|" << case_id << "|FAIL|Parse Error|N/A|N/A" << std::endl;
        }
    }
    return 0;
}

test_data:
{"input": {"nums": [2,7,11,15], "target": 9}, "expected": [0,1]}
{"input": {"nums": [3,2,4], "target": 6}, "expected": [1,2]}

=== END ONE-SHOT ===

Now generate the JSON for the new problem: "${formData.title}".
Ensure driver_cpp uses distinct regex for the specific input format of this new problem.
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("No data received from AI");

      const generated = JSON.parse(rawText);

      let testDataStr = generated.test_data;
      if (Array.isArray(generated.test_data)) {
        testDataStr = generated.test_data
          .map((item: any) => JSON.stringify(item))
          .join("\n");
      }

      setFormData((prev) => ({
        ...prev,
        slug: generated.slug || prev.slug,
        description: generated.description || prev.description,
        python_template: generated.python_template || prev.python_template,
        cpp_template: generated.cpp_template || prev.cpp_template,
        driver_python: generated.driver_python || prev.driver_python,
        driver_cpp: generated.driver_cpp || prev.driver_cpp,
        test_data: testDataStr || prev.test_data,
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
