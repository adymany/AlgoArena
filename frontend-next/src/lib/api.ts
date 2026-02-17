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
