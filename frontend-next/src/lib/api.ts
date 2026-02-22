/**
 * Returns the base URL for the backend API.
 *
 * In development on the same machine, this resolves to http://localhost:9000.
 * When accessed from another device (e.g. mobile phone on the same network),
 * it dynamically uses the hostname from the browser's URL bar + port 9000,
 * so the API calls reach the correct machine.
 *
 * You can override this by setting NEXT_PUBLIC_API_URL in .env.local.
 */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Use the same hostname the browser is currently on, but target port 9000
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
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Safe wrapper around fetch that guarantees a JSON result.
 * Automatically includes the JWT Authorization header when available.
 * Returns `null` when the response is not OK or not valid JSON
 * (e.g. the backend is down and Next.js serves its own HTML page).
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
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
