"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // Login state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register state
  const [regUser, setRegUser] = useState("");

  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength (0-4)
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (uid) {
      router.replace("/problems");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    let s = 0;
    if (regPass.length >= 6) s++;
    if (regPass.length >= 10) s++;
    if (/[A-Z]/.test(regPass) && /[a-z]/.test(regPass)) s++;
    if (/[^A-Za-z0-9]/.test(regPass)) s++;
    setStrength(regPass.length === 0 ? 0 : s);
  }, [regPass]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColors = [
    "var(--text-muted)",
    "var(--error)",
    "var(--warning)",
    "var(--warning)",
    "var(--success)",
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("user_id", String(data.user_id));
      localStorage.setItem("username", data.username);
      localStorage.setItem("is_admin", data.is_admin ? "true" : "false");
      localStorage.setItem("token", data.token);
      router.push("/problems");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (regPass !== regConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUser,
          password: regPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      // Auto-login on successful registration
      localStorage.setItem("user_id", String(data.user_id));
      localStorage.setItem("username", data.username);
      localStorage.setItem("is_admin", data.is_admin ? "true" : "false");
      localStorage.setItem("token", data.token);
      router.push("/problems");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const EyeOpen = (
    <svg viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeClosed = (
    <svg viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  if (!authChecked) return null;

  return (
    <>
      <div className="bg-animated">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>
      <div className="bg-grid" />
      <Navbar />

      <div className="login-page-body">
        <div className="login-wrapper fade-in-up">
          <div className="login-card">
            {/* Brand */}
            <div className="brand">
              <div className="brand-icon" role="img" aria-label="AlgoArena" />
              <h1>AlgoArena</h1>
              <p>Master algorithms, ace interviews</p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <div
                className={`tab-slider${activeTab === "register" ? " right" : ""}`}
              />
              <button
                className={`auth-tab${activeTab === "login" ? " active" : ""}`}
                onClick={() => {
                  setActiveTab("login");
                  setError("");
                }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab${activeTab === "register" ? " active" : ""}`}
                onClick={() => {
                  setActiveTab("register");
                  setError("");
                }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="login-error-msg">{error}</div>}
            {success && <div className="login-success-msg">{success}</div>}

            {/* Login Form */}
            <form
              className={
                activeTab === "login"
                  ? "form-panel-active"
                  : "form-panel-hidden"
              }
              onSubmit={handleLogin}
            >
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter your username"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    className="form-input"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? EyeClosed : EyeOpen}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <div className="card-footer">
                <p>
                  Don&apos;t have an account?{" "}
                  <a onClick={() => setActiveTab("register")}>Create one</a>
                </p>
              </div>
            </form>

            {/* Register Form */}
            <form
              className={
                activeTab === "register"
                  ? "form-panel-active"
                  : "form-panel-hidden"
              }
              onSubmit={handleRegister}
            >
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Choose a username"
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    className="form-input"
                    type={showPw ? "text" : "password"}
                    placeholder="Create a password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? EyeClosed : EyeOpen}
                  </button>
                </div>
                <div className="strength-row">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`strength-seg${strength >= i ? ` s${i}` : ""}`}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <div
                    className="strength-label"
                    style={{ color: strengthColors[strength] }}
                  >
                    {strengthLabel}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    className="form-input"
                    type={showPwConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPwConfirm(!showPwConfirm)}
                  >
                    {showPwConfirm ? EyeClosed : EyeOpen}
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <div className="card-footer">
                <p>
                  Already have an account?{" "}
                  <a onClick={() => setActiveTab("login")}>Sign in</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
