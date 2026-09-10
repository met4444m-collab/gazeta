// In dev we use the Vite proxy at /convex. In production builds, set VITE_CONVEX_URL
// (e.g. https://your-deployment.convex.cloud) via repo Settings → Secrets/Variables.
const CONVEX_URL =
  (import.meta as any).env?.VITE_CONVEX_URL || "/convex";

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

export async function convexQuery(name: string, args: Record<string, any> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, args }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.errorMessage || "Query error");
  return data.value;
}

export async function convexMutation(name: string, args: Record<string, any> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, args }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errorMessage || err.message || `Mutation failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.status === "error") throw new Error(data.errorMessage || "Mutation error");
  return data.value;
}
