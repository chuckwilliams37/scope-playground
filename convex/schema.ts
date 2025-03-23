import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stories table - contains all story data
  stories: defineTable({
    title: v.string(),
    userStory: v.string(),
    businessValue: v.string(),
    category: v.string(),
    points: v.number(),
    id: v.string(), // External ID for reference (story-001, etc.)
    // Visibility controls for client-specific access
    sharedWithClients: v.array(v.string()), // Array of client IDs that can see this story
    isPublic: v.boolean() // Whether this story is visible to all clients
  }),

  // Users table - for client-specific access
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(), // "admin", "pm", "client"
    clientId: v.optional(v.string()), // For client users
    clerkId: v.string() // Auth ID from Clerk
  }),

  // Scenarios table - for saving/loading scope decisions
  scenarios: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // User ID
    createdAt: v.number(), // Timestamp
    lastModified: v.number(), // Timestamp
    isPreset: v.boolean(), // Whether this is a system preset (MVP, etc.)
    // Visibility and sharing
    isPublic: v.boolean(),
    sharedWithClients: v.array(v.string()), // Array of client IDs that can see this scenario
    // Configuration settings
    settings: v.object({
      developerCost: v.number(),
      developerCount: v.number(),
      hoursPerDay: v.number(),
      developerAllocation: v.number()
    }),
    // Story positions in the matrix (store as a JSON object in a string field)
    storyPositions: v.string() // JSON string containing mapping of storyId -> position
  })
});
