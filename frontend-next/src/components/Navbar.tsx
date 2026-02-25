"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBase, fetchJSON, authHeaders } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeSelector";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Close dropdown anytime the body is clicked
    const handleBodyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".nav-avatar-container")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleBodyClick);
    return () => document.removeEventListener("click", handleBodyClick);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("username");
    setUsername(u);
    // Verify admin status from server (now via JWT)
    const token = localStorage.getItem("token");
    if (token) {
      fetchJSON<{ is_admin?: boolean }>(
        `${getApiBase()}/api/v1/check-admin`,
      ).then((data) => {
        const adminStatus = !!data?.is_admin;
        setIsAdmin(adminStatus);
        localStorage.setItem("is_admin", adminStatus ? "true" : "false");
      });
    }
  }, []);

  const handleLogout = () => {
    // Call backend to revoke token in Redis
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${getApiBase()}/api/v1/logout`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
    }
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("token");
    router.push("/login");
  };

  const initial = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <nav className="navbar">
      <Link href="/" className="nav-brand">
        <div className="nav-brand-icon" role="img" aria-label="AlgoArena" />
        <span className="nav-brand-text">AlgoArena</span>
      </Link>

      <div className="nav-links">
        <Link
          href="/problems"
          className={`nav-link${pathname === "/problems" ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Problems
        </Link>
        <Link
          href="/leaderboard"
          className={`nav-link${pathname === "/leaderboard" ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
            <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
            <rect x="6" y="2" width="12" height="7" rx="1" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 20v2" />
          </svg>
          Leaderboard
        </Link>
        <Link
          href="/profile"
          className={`nav-link${pathname === "/profile" ? " active" : ""}`}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className={`nav-link${pathname?.startsWith("/admin") ? " active" : ""}`}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Admin
          </Link>
        )}
      </div>

      <div className="nav-right">
        <ThemeToggle />
        {username ? (
          <div className="nav-avatar-container">
            <div
              className="nav-avatar"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Profile menu"
            >
              {initial}
            </div>
            {dropdownOpen && (
              <div className="nav-dropdown fade-in">
                <Link
                  href="/profile"
                  className="nav-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profile
                </Link>
                <div className="nav-dropdown-divider" />
                <button
                  className="nav-dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  style={{ color: "var(--error)" }}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="btn btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
