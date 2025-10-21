/**
 * Example schema showing different Convex types that the generator can handle
 * Copy sections from this file to convex/schema.ts to test the generator
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Simple types
  users: defineTable({
    name: v.string(),
    email: v.string(),
    age: v.number(),
    isActive: v.boolean(),
  }),

  // Optional fields
  profiles: defineTable({
    userId: v.string(),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
    phone: v.optional(v.string()),
  }),

  // Arrays
  posts: defineTable({
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    authorId: v.string(),
  }),

  // Complex nested types
  articles: defineTable({
    title: v.string(),
    content: v.string(),
    metadata: v.object({
      views: v.number(),
      likes: v.number(),
      published: v.boolean(),
    }),
    categories: v.array(v.string()),
    featuredImage: v.optional(v.string()),
  }),

  // References to other tables
  comments: defineTable({
    postId: v.id('posts'),
    authorId: v.id('users'),
    text: v.string(),
    likes: v.number(),
  }),

  // Union types
  notifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal('comment'),
      v.literal('like'),
      v.literal('follow'),
    ),
    message: v.string(),
    isRead: v.boolean(),
  }),
});
