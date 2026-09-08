import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The 40-character admin access code (letters + numbers)
const ADMIN_CODE = "Xk9mP2vL8nQ4wR7jT5yH3bD6fG1cA0sE";

// Register a new publisher via admin code
export const register = mutation({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate code
    if (args.code !== ADMIN_CODE) {
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

    return await ctx.db.insert("users", {
      name,
      role,
      createdAt: Date.now(),
    });
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
