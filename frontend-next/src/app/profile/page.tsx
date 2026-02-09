"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const uname = localStorage.getItem("username");

    if (!userId) {
      router.push("/login");
      return;
    }

    setUsername(uname || "");

    fetch(`http://localhost:9000/api/v1/submissions?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load submissions", err);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    router.push("/login");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "Pass") return "#4ade80";
    if (status === "Fail") return "#f87171";
    if (status === "Submitted") return "#60a5fa";
    return "#94a3b8";
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">AlgoArena</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              cursor: "pointer",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "2rem",
              padding: "1.5rem",
              background: "var(--bg-panel)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "var(--accent-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              👤
            </div>
            <div>
              <h1 style={{ color: "white", margin: 0 }}>{username}</h1>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                {submissions.length} submissions
              </p>
            </div>
          </div>

          <h2 style={{ color: "white", marginBottom: "1rem" }}>
            Submission History
          </h2>

          {loading ? (
            <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
          ) : submissions.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary)",
                background: "var(--bg-panel)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              No submissions yet. Start solving problems!
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => router.push(`/?problem=${sub.problem_id}`)}
                  style={{
                    padding: "1rem 1.25rem",
                    background: "var(--bg-panel)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent-purple)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-color)")
                  }
                >
                  <div>
                    <span style={{ color: "white", fontWeight: 500 }}>
                      {sub.problem_id
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.75rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {sub.language}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <span
                      style={{
                        color: getStatusColor(sub.status),
                        fontSize: "0.85rem",
                        padding: "0.125rem 0.5rem",
                        background: `${getStatusColor(sub.status)}22`,
                        borderRadius: "4px",
                      }}
                    >
                      {sub.status}
                    </span>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {formatDate(sub.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
