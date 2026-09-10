// Supabase Edge Function: /functions/v1/gazeta
// Routes (all POST JSON):
//   auth/register { name, code }            -> { token, name, role }
//   auth/login    { name, code }            -> { token, name, role }
//   auth/me       { token }                 -> { name, role } | null
//   auth/logout   { token }                 -> {}
//   news/create   { token, title, body, imageUrl?, videoUrl? }
//   news/update   { token, id, title, body, imageUrl?, videoUrl? }
//   news/remove   { token, id }
// Secrets (set via: supabase secrets set ...):
//   ADMIN_CODE  - the 40-char publisher access code
//   SERVICE_ROLE_KEY? no — use Deno.env SUPABASE_SERVICE_ROLE_KEY (auto-provided)
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_CODE = Deno.env.get("ADMIN_CODE") ?? "";
const MAX_USERS = 5;           // registration is closed after the first N accounts
const MAX_ATTEMPTS = 3;
const LOCK_MS = 30 * 60 * 1000; // 30 min lockout
const RATE_LIMIT = 10;          // auth requests per minute per IP
const RATE_WINDOW = 60_000;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// --- in-memory abuse guards (per function instance) ---
const fails = new Map<string, { count: number; lockedUntil: number }>();
const rate = new Map<string, number[]>();

function ip(req: Request): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
function tooFast(key: string): boolean {
  const now = Date.now();
  const arr = (rate.get(key) ?? []).filter((t) => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) { rate.set(key, arr); return true; }
  arr.push(now);
  rate.set(key, arr);
  return false;
}
function locked(key: string): number {
  const f = fails.get(key);
  return f && f.lockedUntil > Date.now() ? Math.ceil((f.lockedUntil - Date.now()) / 60_000) : 0;
}
function recordFail(key: string) {
  const f = fails.get(key) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= MAX_ATTEMPTS) { f.lockedUntil = Date.now() + LOCK_MS; f.count = 0; }
  fails.set(key, f);
}
function newToken(): string {
  return crypto.randomUUID();
}

async function userByToken(token: string) {
  const { data } = await admin.from("sessions").select("users(id,name,role)").eq("token", token).maybeSingle();
  return (data as any)?.users ?? null;
}

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" } });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const addr = ip(req);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const route = String(body.action ?? "");

  // --- news list is public and served by the REST Data API directly,
  // --- but keep an authenticated mirror here for writes:
  if (route.startsWith("news/")) {
    const user = await userByToken(String(body.token ?? ""));
    if (!user) return json({ error: "Требуется вход." }, 401);
    if (route === "news/create") {
      const { data, error } = await admin.from("news").insert({
        title: String(body.title ?? "").trim().slice(0, 200),
        body: String(body.body ?? "").trim().slice(0, 10000),
        image_url: body.imageUrl ? String(body.imageUrl) : null,
        video_url: body.videoUrl ? String(body.videoUrl) : null,
        author_name: user.name,
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }
    if (route === "news/update") {
      // fetch the post to enforce ownership (admin and moderator may edit any post)
      const isStaff = user.role === "admin" || user.role === "moderator";
      const post = await admin.from("news").select("author_name").eq("id", body.id).maybeSingle();
      if (!post.data) return json({ error: "Новость не найдена." }, 404);
      if (!isStaff && post.data.author_name !== user.name)
        return json({ error: "Можно редактировать только свои новости." }, 403);
      const patch: any = {
        title: String(body.title ?? "").trim().slice(0, 200),
        body: String(body.body ?? "").trim().slice(0, 10000),
      };
      if (body.imageUrl !== undefined) patch.image_url = body.imageUrl ? String(body.imageUrl) : null;
      if (body.videoUrl !== undefined) patch.video_url = body.videoUrl ? String(body.videoUrl) : null;
      const { data, error } = await admin.from("news").update(patch).eq("id", body.id).select().single();
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }
    if (route === "news/remove") {
      // fetch the post to enforce ownership (admin and moderator may delete any post)
      const isStaff = user.role === "admin" || user.role === "moderator";
      const post = await admin.from("news").select("author_name").eq("id", body.id).maybeSingle();
      if (!post.data) return json({ error: "Новость не найдена." }, 404);
      if (!isStaff && post.data.author_name !== user.name)
        return json({ error: "Можно удалять только свои новости." }, 403);
      const { error } = await admin.from("news").delete().eq("id", body.id);
      if (error) return json({ error: error.message }, 400);
      return json({});
    }
  }

  // --- auth routes ---
  if (tooFast(addr)) return json({ error: "Слишком много запросов. Подождите минуту." }, 429);
  const lockMin = locked(addr);
  if (lockMin > 0) return json({ error: `Слишком много попыток. Повторите через ${lockMin} мин.` }, 429);

  if (route === "auth/register" || route === "auth/login") {
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "").trim();
    if (!ADMIN_CODE || code !== ADMIN_CODE) {
      recordFail(addr);
      return json({ error: route === "auth/register" ? "Неверный код доступа." : "Неверное имя или код доступа." }, 401);
    }
    if (name.length < 2 || name.length > 50) return json({ error: "Имя должно быть от 2 до 50 символов." }, 400);

    const existing = await admin.from("users").select("*").eq("name", name).maybeSingle();
    if (route === "auth/register") {
      if (existing.data) return json({ error: "Пользователь с таким именем уже существует." }, 400);
      const count = await admin.from("users").select("id", { count: "exact", head: true });
      if ((count.count ?? 0) >= MAX_USERS)
        return json({ error: "Регистрация закрыта: все места издателей заняты." }, 403);
      // 1st account = admin, 2nd account = moderator (can edit/delete ANY posts),
      // everyone after = publisher (own posts only)
      const role = (count.count ?? 0) === 0 ? "admin" : (count.count ?? 0) === 1 ? "moderator" : "publisher";
      const { data: user, error } = await admin.from("users").insert({ name, role }).select().single();
      if (error) return json({ error: error.message }, 400);
      const token = newToken();
      await admin.from("sessions").insert({ token, user_id: user.id });
      fails.delete(addr);
      return json({ token, name: user.name, role });
    }
    // login
    if (!existing.data) { recordFail(addr); return json({ error: "Неверное имя или код доступа." }, 401); }
    const token = newToken();
    await admin.from("sessions").insert({ token, user_id: existing.data.id });
    fails.delete(addr);
    return json({ token, name: existing.data.name, role: existing.data.role });
  }

  if (route === "auth/me") {
    const user = await userByToken(String(body.token ?? ""));
    return json(user ? { name: user.name, role: user.role } : null);
  }
  if (route === "auth/logout") {
    await admin.from("sessions").delete().eq("token", String(body.token ?? ""));
    return json({});
  }

  return json({ error: "unknown action" }, 400);
});
