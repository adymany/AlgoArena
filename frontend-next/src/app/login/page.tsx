"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/v1/register" : "/api/v1/login";

    try {
      const res = await fetch(`http://localhost:9000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          setError("Account created! Please login.");
          setIsRegister(false);
        } else {
          localStorage.setItem("user_id", data.user_id);
          localStorage.setItem("username", data.username);
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "var(--bg-panel)",
          padding: "2rem",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <h1
          style={{
            color: "white",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          {isRegister ? "Join AlgoArena" : "Welcome Back"}
        </h1>

        {error && (
          <div
            style={{
              background: "rgba(248, 113, 113, 0.2)",
              color: "#f87171",
              padding: "0.75rem",
              borderRadius: "4px",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                color: "var(--text-secondary)",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "4px",
                background: "var(--bg-editor)",
                border: "1px solid var(--border-color)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: "var(--text-secondary)",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "4px",
                background: "var(--bg-editor)",
                border: "1px solid var(--border-color)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem",
              background: "var(--accent-purple)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: 600,
              marginTop: "1rem",
            }}
          >
            {loading ? "Processing..." : isRegister ? "Sign Up" : "Log In"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
          }}
        >
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{
              color: "var(--accent-blue)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isRegister ? "Log In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}
