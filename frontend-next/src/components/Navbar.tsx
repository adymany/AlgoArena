"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBase, fetchJSON } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeSelector";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("username");
    setUsername(u);
    // Verify admin status from server
    const uid = localStorage.getItem("user_id");
    if (uid) {
      fetchJSON<{ is_admin?: boolean }>(`${getApiBase()}/api/v1/check-admin?user_id=${uid}`)
        .then(data => {
          if (data?.is_admin) {
            setIsAdmin(true);
            localStorage.setItem("is_admin", "true");
          }
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("is_admin");
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
        <Link href="/problems" className={`nav-link${pathname === "/problems" ? " active" : ""}`}>
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Problems
        </Link>
        <Link href="/profile" className={`nav-link${pathname === "/profile" ? " active" : ""}`}>
          <svg viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
        {isAdmin && (
          <Link href="/admin" className={`nav-link${pathname?.startsWith("/admin") ? " active" : ""}`}>
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
          <>
            <div className="nav-avatar" onClick={handleLogout} title="Click to logout">
              {initial}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: "13px" }}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
