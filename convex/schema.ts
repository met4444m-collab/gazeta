import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Registered publishers (added via admin code)
  users: defineTable({
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("publisher")),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // Session tokens (one per logged-in user)
  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  // News posts
  news: defineTable({
    title: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    authorName: v.string(),
    pinned: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_created", ["createdAt"]),

  // Rate limiting: tracks requests per IP
  rateLimits: defineTable({
    identifier: v.string(), // IP or fingerprint
    count: v.number(),
    windowStart: v.number(),
  }).index("by_identifier", ["identifier"]),

  // Access code for publisher registration
  accessCode: defineTable({
    code: v.string(),
    active: v.boolean(),
  }),

  // Brute-force protection for the access code
  authLimits: defineTable({
    identifier: v.string(), // "global" lockout
    failedCount: v.number(),
    lockedUntil: v.optional(v.number()),
  }).index("by_identifier", ["identifier"]),
});