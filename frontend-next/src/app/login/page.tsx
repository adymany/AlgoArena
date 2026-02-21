"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // Login state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register state
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength (0-4)
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (uid) router.push("/problems");
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
        body: JSON.stringify({ username: regUser, email: regEmail, password: regPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess("Account created! You can now sign in.");
      setActiveTab("login");
      setLoginUser(regUser);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const EyeOpen = (
    <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
  const EyeClosed = (
    <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  );

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
        <div className="login-wrapper">
          <div className="login-card">
            {/* Brand */}
            <div className="brand">
              <div className="brand-icon" role="img" aria-label="AlgoArena" />
              <h1>AlgoArena</h1>
              <p>Master algorithms, ace interviews</p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <div className={`tab-slider${activeTab === "register" ? " right" : ""}`} />
              <button
                className={`auth-tab${activeTab === "login" ? " active" : ""}`}
                onClick={() => { setActiveTab("login"); setError(""); }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab${activeTab === "register" ? " active" : ""}`}
                onClick={() => { setActiveTab("register"); setError(""); }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="login-error-msg">{error}</div>}
            {success && <div className="login-success-msg">{success}</div>}

            {/* Login Form */}
            <form
              className={activeTab === "login" ? "form-panel-active" : "form-panel-hidden"}
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
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? EyeClosed : EyeOpen}
                  </button>
                </div>
              </div>
              <div className="form-options">
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--accent-primary)" }} /> Remember me
                </label>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="divider"><span>or continue with</span></div>
              <div className="social-row">
                <button type="button" className="social-btn">
                  <svg viewBox="0 0 24 24" fill="var(--text-primary)">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.509 11.509 0 0 1 3.004-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
                <button type="button" className="social-btn">
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </div>
              <div className="card-footer">
                <p>Don&apos;t have an account? <a onClick={() => setActiveTab("register")}>Create one</a></p>
              </div>
            </form>

            {/* Register Form */}
            <form
              className={activeTab === "register" ? "form-panel-active" : "form-panel-hidden"}
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
                <label className="form-label">Email</label>
                <div className="input-wrap">
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="Enter your email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
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
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? EyeClosed : EyeOpen}
                  </button>
                </div>
                <div className="strength-row">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`strength-seg${strength >= i ? ` s${i}` : ""}`} />
                  ))}
                </div>
                {strength > 0 && (
                  <div className="strength-label" style={{ color: strengthColors[strength] }}>
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
                  <button type="button" className="pw-toggle" onClick={() => setShowPwConfirm(!showPwConfirm)}>
                    {showPwConfirm ? EyeClosed : EyeOpen}
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
              <div className="divider"><span>or continue with</span></div>
              <div className="social-row">
                <button type="button" className="social-btn">
                  <svg viewBox="0 0 24 24" fill="var(--text-primary)">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.509 11.509 0 0 1 3.004-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
                <button type="button" className="social-btn">
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
              </div>
              <div className="card-footer">
                <p>Already have an account? <a onClick={() => setActiveTab("login")}>Sign in</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
