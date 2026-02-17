"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";

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
      const res = await fetch(`${getApiBase()}${endpoint}`, {
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
          router.push("/problems");
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

  const isSuccess = error === "Account created! Please login.";

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isRegister ? "Join AlgoArena" : "Welcome Back"}</h1>
        <p className="login-subtitle">
          {isRegister
            ? "Create your account to start coding"
            : "Sign in to continue solving problems"}
        </p>

        {error && (
          <div className={isSuccess ? "login-success" : "login-error"}>
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label className="login-label">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="login-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Processing..." : isRegister ? "Sign Up" : "Log In"}
          </button>
        </form>

        <p className="login-toggle">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="login-toggle-link"
          >
            {isRegister ? "Log In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}
