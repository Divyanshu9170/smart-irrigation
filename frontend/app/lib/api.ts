// ✅ Central place for the backend URL + authenticated fetch helper.
// API_BASE_URL is env-driven so the frontend never hardcodes
// localhost:5000 — set NEXT_PUBLIC_API_URL in .env.local (dev) and in
// your deployment platform's env vars (prod) to your deployed backend URL.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TOKEN_KEY = "agrosense_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ✅ Wraps fetch() and attaches "Authorization: Bearer <token>" when a
// token is available. Safe to use on public routes too.
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}
