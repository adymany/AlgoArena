"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Problem {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export default function Dashboard() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("username");
    if (!user) {
      router.push("/login");
      return;
    }
    setUsername(user);

    // Fetch problems from API
    fetch("http://localhost:9000/api/v1/problems")
      .then((res) => res.json())
      .then((data) => setProblems(data))
      .catch((err) => console.error("Failed to load problems", err));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    router.push("/login");
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === "Easy") return "#4ade80";
    if (diff === "Medium") return "#fbbf24";
    if (diff === "Hard") return "#f87171";
    return "#94a3b8";
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>
            Welcome, {username}
          </span>
          <button
            onClick={() => router.push("/profile")}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            👤 Profile
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div
        className="main-container"
        style={{ display: "block", overflowY: "auto", padding: "2rem" }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ color: "white", marginBottom: "2rem" }}>Problems</h1>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {problems.map((p) => (
              <div
                key={p.slug}
                onClick={() => router.push(`/?problem=${p.slug}`)}
                style={{
                  background: "var(--bg-panel)",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "var(--accent-purple)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <div>
                  <h3 style={{ color: "white", marginBottom: "0.5rem" }}>
                    {p.title}
                  </h3>
                  <span
                    style={{
                      color: getDifficultyColor(p.difficulty),
                      fontSize: "0.8rem",
                      background: `${getDifficultyColor(p.difficulty)}22`,
                      padding: "0.125rem 0.5rem",
                      borderRadius: "4px",
                    }}
                  >
                    {p.difficulty}
                  </span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>Solve ➤</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
