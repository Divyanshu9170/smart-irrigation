// ✅ Central place for the backend URL + authenticated fetch helper.
// Replaces the hardcoded "https://smart-irrigation-1-mawh.onrender.com"
// that was previously repeated in app/page.tsx.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://smart-irrigation-1-mawh.onrender.com";

const TOKEN_KEY = "agrosense_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

// ✅ Wraps fetch() and attaches "Authorization: Bearer <token>" when a
// token is available. Safe to use on public routes too — if there's no
// token, it just behaves like a normal fetch.
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
