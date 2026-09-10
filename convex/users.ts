import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The 40-character admin access code is stored as a Convex environment
// variable (ADMIN_CODE), NOT in the source code — so a public repo
// contains no secrets. Set it with: bun convex env set ADMIN_CODE <code>
function getAdminCode(): string | undefined {
  return process.env.ADMIN_CODE?.trim() || undefined;
}

// Brute-force protection: after 3 failed attempts, lock for 30 minutes
const MAX_ATTEMPTS = 3;
const LOCK_MS = 30 * 60 * 1000;

// Auth rate limit: max 10 auth requests per minute (DDoS protection)
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW = 60_000;

async function checkAuthRate(ctx: any) {
  const now = Date.now();
  const rl = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q: any) => q.eq("identifier", "auth"))
    .first();
  if (rl) {
    if (now - rl.windowStart > AUTH_RATE_WINDOW) {
      await ctx.db.patch(rl._id, { count: 1, windowStart: now });
      return true;
    }
    if (rl.count >= AUTH_RATE_LIMIT) return false;
    await ctx.db.patch(rl._id, { count: rl.count + 1 });
    return true;
  }
  await ctx.db.insert("rateLimits", { identifier: "auth", count: 1, windowStart: now });
  return true;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkLocked(ctx: any): Promise<string | null> {
  const lock = await ctx.db
    .query("authLimits")
    .withIndex("by_identifier", (q: any) => q.eq("identifier", "global"))
    .first();
  if (lock?.lockedUntil && Date.now() < lock.lockedUntil) {
    const mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
    return `Слишком много попыток. Подождите ${mins} мин.`;
  }
  return null;
}

async function recordFailure(ctx: any) {
  const lock = await ctx.db
    .query("authLimits")
    .withIndex("by_identifier", (q: any) => q.eq("identifier", "global"))
    .first();
  const failed = (lock?.failedCount || 0) + 1;
  if (failed >= MAX_ATTEMPTS) {
    if (lock) {
      await ctx.db.patch(lock._id, { failedCount: failed, lockedUntil: Date.now() + LOCK_MS });
    } else {
      await ctx.db.insert("authLimits", { identifier: "global", failedCount: failed, lockedUntil: Date.now() + LOCK_MS });
    }
    return;
  }
  if (lock) {
    await ctx.db.patch(lock._id, { failedCount: failed });
  } else {
    await ctx.db.insert("authLimits", { identifier: "global", failedCount: failed });
  }
}

async function clearFailures(ctx: any) {
  const lock = await ctx.db
    .query("authLimits")
    .withIndex("by_identifier", (q: any) => q.eq("identifier", "global"))
    .first();
  if (lock) await ctx.db.delete(lock._id);
}

async function getUserByToken(ctx: any, token: string) {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session) return null;
  return await ctx.db.get(session.userId);
}

// Register a new publisher via admin code. Returns a session token.
export const register = mutation({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await checkAuthRate(ctx))) {
      throw new Error("Слишком много запросов. Подождите минуту.");
    }
    const locked = await checkLocked(ctx);
    if (locked) throw new Error(locked);

    // Validate code (server-side secret; if unset, registration is disabled)
    const adminCode = getAdminCode();
    if (!adminCode || args.code.trim() !== adminCode) {
      await recordFailure(ctx);
      throw new Error("Неверный код доступа.");
    }

    // Validate name
    const name = args.name.trim();
    if (!name || name.length < 2 || name.length > 50) {
      throw new Error("Имя должно быть от 2 до 50 символов.");
    }

    // Check if name already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      throw new Error("Пользователь с таким именем уже существует.");
    }

    // Determine role
    const existingUsers = await ctx.db.query("users").collect();
    const role = existingUsers.length === 0 ? "admin" : "publisher";

    const userId = await ctx.db.insert("users", {
      name,
      role,
      createdAt: Date.now(),
    });

    await clearFailures(ctx);
    const token = randomToken();
    await ctx.db.insert("sessions", { token, userId, createdAt: Date.now() });
    return { token, name, role };
  },
});

// Login as an existing publisher. Returns a session token.
export const login = mutation({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await checkAuthRate(ctx))) {
      throw new Error("Слишком много запросов. Подождите минуту.");
    }
    const locked = await checkLocked(ctx);
    if (locked) throw new Error(locked);

    const name = args.name.trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    const adminCode = getAdminCode();
    if (!adminCode || args.code.trim() !== adminCode) {
      await recordFailure(ctx);
      throw new Error("Неверное имя или код доступа.");
    }

    await clearFailures(ctx);
    const token = randomToken();
    await ctx.db.insert("sessions", { token, userId: user._id, createdAt: Date.now() });
    return { token, name: user.name, role: user.role };
  },
});

// Logout: invalidate the session token
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});

// Validate a session token (used on page load)
export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const user = await getUserByToken(ctx, args.token);
    if (!user) return null;
    return { name: user.name, role: user.role };
  },
});

// Check if a user is registered
export const check = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return user;
  },
});

// List all registered publishers (admin only - called after code verification)
export const listPublishers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Remove a publisher
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// TEMPORARY: wipe all test data (news, users, sessions)
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    for (const t of ["news", "users", "sessions", "authLimits", "rateLimits"] as const) {
      const rows = await ctx.db.query(t).collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return "cleared";
  },
});