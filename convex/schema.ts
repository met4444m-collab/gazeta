import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Registered publishers (added via admin code)
  users: defineTable({
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("publisher")),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

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
});
