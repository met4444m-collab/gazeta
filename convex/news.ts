import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Rate limit: max 30 requests per minute per IP
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000; // 1 minute

async function checkRateLimit(ctx: any, identifier: string) {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q: any) => q.eq("identifier", identifier))
    .first();

  if (existing) {
    if (now - existing.windowStart > RATE_WINDOW) {
      // Reset window
      await ctx.db.patch(existing._id, { count: 1, windowStart: now });
      return true;
    }
    if (existing.count >= RATE_LIMIT) {
      return false; // Rate limited
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return true;
  }

  await ctx.db.insert("rateLimits", {
    identifier,
    count: 1,
    windowStart: now,
  });
  return true;
}

// Get all news posts, newest first
export const list = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("news")
      .withIndex("by_created")
      .order("desc")
      .collect();
    return posts;
  },
});

// Get single post
export const get = query({
  args: { id: v.id("news") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create news post (only for registered publishers)
export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    authorName: v.string(),
    clientIp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit check
    const identifier = args.clientIp || "unknown";
    const allowed = await checkRateLimit(ctx, identifier);
    if (!allowed) {
      throw new Error("Слишком много запросов. Подождите минуту.");
    }

    // Validate author exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_name", (q) => q.eq("name", args.authorName))
      .first();
    if (!user) {
      throw new Error("Пользователь не зарегистрирован.");
    }

    // Validate content
    if (!args.title.trim()) throw new Error("Заголовок обязателен.");
    if (!args.body.trim()) throw new Error("Текст обязателен.");
    if (args.title.length > 200) throw new Error("Заголовок слишком длинный.");
    if (args.body.length > 10000) throw new Error("Текст слишком длинный.");

    return await ctx.db.insert("news", {
      title: args.title.trim(),
      body: args.body.trim(),
      imageUrl: args.imageUrl?.trim(),
      videoUrl: args.videoUrl?.trim(),
      authorName: args.authorName,
      createdAt: Date.now(),
    });
  },
});

// Update news post
export const update = mutation({
  args: {
    id: v.id("news"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.body !== undefined) updates.body = args.body.trim();
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl?.trim();
    if (args.videoUrl !== undefined) updates.videoUrl = args.videoUrl?.trim();
    await ctx.db.patch(args.id, updates);
  },
});

// Delete news post
export const remove = mutation({
  args: { id: v.id("news") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
