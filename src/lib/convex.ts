// Backend API layer (Supabase).
// - News list: public read via Supabase REST (PostgREST), no key exposure issues
//   (the anon/publishable key is designed to be public; writes are blocked by RLS).
// - Auth + news writes: go through the /gazeta Edge Function (admin code lives
//   server-side as a secret, never in this repo).

const SUPABASE_URL = "https://suhffagouinvkafrchfz.supabase.co";
const ANON_KEY = "sb_publishable_Hr6sFklUczCSb9eF28Ud5g_bdVGisam";
const FN_URL = `${SUPABASE_URL}/functions/v1/gazeta`;

export function getToken(): string {
  return localStorage.getItem("publisher_token") || "";
}

export function setSession(token: string, name: string) {
  localStorage.setItem("publisher_token", token);
  localStorage.setItem("publisher_name", name);
}

export function clearSession() {
  localStorage.removeItem("publisher_token");
  localStorage.removeItem("publisher_name");
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  author_name: string;
  created_at: string;
}

function authHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    ...extra,
  };
}

// ---- Public news list (PostgREST) ----
export async function listNews(): Promise<NewsPost[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/news?select=*&order=created_at.desc&limit=100`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return res.json();
}

// ---- Edge Function calls (auth + writes) ----
async function callFn(action: string, args: Record<string, any> = {}) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action, ...args }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ошибка сервера (${res.status})`);
  return data;
}

export const register = (name: string, code: string) => callFn("auth/register", { name, code });
export const login = (name: string, code: string) => callFn("auth/login", { name, code });
export const me = (token: string) => callFn("auth/me", { token });
export const logout = (token: string) => callFn("auth/logout", { token });

export const createNews = (token: string, p: { title: string; body: string; imageUrl?: string; videoUrl?: string }) =>
  callFn("news/create", { token, ...p });
export const updateNews = (token: string, id: string, p: { title: string; body: string; imageUrl?: string; videoUrl?: string }) =>
  callFn("news/update", { token, id, ...p });
export const removeNews = (token: string, id: string) => callFn("news/remove", { token, id });
