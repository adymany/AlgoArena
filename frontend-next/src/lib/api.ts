/**
 * Returns the base URL for the backend API.
 *
 * In production (Vercel), returns "" so calls are relative (e.g. /api/v1/...)
 * and go through Next.js rewrites which proxy to the EC2 backend.
 *
 * In development, uses localhost:9000 or the current hostname:9000.
 */
export function getApiBase(): string {
  // In production, use relative URLs (Vercel rewrites handle proxying)
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "";
  }
  // Development: use the same hostname the browser is on, but target port 9000
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:9000`;
  }
  // Fallback for SSR
  return "http://localhost:9000";
}

/**
 * Get the stored JWT token from localStorage.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Build headers with Authorization if a token exists.
 */
export function authHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/* ── Session expiry handling ── */

// Prevent multiple simultaneous redirects
let isRedirecting = false;

/**
 * Clear all auth credentials from localStorage and redirect to login.
 * Called automatically whenever a 401 response is detected from the backend,
 * meaning the JWT token has expired or been revoked.
 */
export function handleSessionExpired(): void {
  if (typeof window === "undefined") return;
  if (isRedirecting) return; // already handling it
  isRedirecting = true;

  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  localStorage.removeItem("is_admin");
  localStorage.removeItem("token");

  // Redirect to login — using window.location ensures a full navigation
  // (works even outside React component tree / router context)
  window.location.href = "/login?expired=1";
}

/**
 * Safe wrapper around fetch that guarantees a JSON result.
 * Automatically includes the JWT Authorization header when available.
 * Returns `null` when the response is not OK or not valid JSON
 * (e.g. the backend is down and Next.js serves its own HTML page).
 *
 * **401 responses automatically trigger session expiry → redirect to login.**
 */
export async function fetchJSON<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Merge with any existing headers
    const mergedInit: RequestInit = {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers || {}),
      },
    };
    const res = await fetch(url, mergedInit);
    if (res.status === 401) {
      handleSessionExpired();
      return null;
    }
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Wrapper around the native fetch that automatically handles 401 session expiry.
 * Use this instead of raw `fetch()` for any authenticated API calls.
 * This does NOT parse JSON — use the response as you normally would with fetch.
 *
 * **401 responses automatically trigger session expiry → redirect to login.**
 */
export async function authFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    handleSessionExpired();
  }
  return res;
}
