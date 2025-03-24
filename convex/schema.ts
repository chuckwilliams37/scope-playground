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
    isPublic: v.boolean(), // Whether this story is visible to all clients
    originalPoints: v.optional(v.number()), // Original story point estimate
    adjustmentReason: v.optional(v.string()) // Reason for point adjustment
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
      contributorCost: v.number(),
      contributorCount: v.number(),
      hoursPerDay: v.number(),
      contributorAllocation: v.number(),
      scopeLimiters: v.object({
        points: v.object({
          default: v.number()
        }),
        hours: v.object({
          default: v.number()
        }),
        duration: v.object({
          default: v.number(),
          unit: v.string()
        })
      }),
      pointsToHoursConversion: v.number(), // Points to hours conversion rate (between 5-12)
      aiProductivityFactors: v.object({
        linesOfCode: v.number(),
        testing: v.number(),
        debugging: v.number(),
        systemDesign: v.number(),
        documentation: v.number()
      }),
      aiSimulationEnabled: v.boolean(),
      selfManagedPartner: v.object({
        enabled: v.boolean(),
        managementReductionPercent: v.number()
      })
    }),
    // Story positions in the matrix (store as a JSON object in a string field)
    storyPositions: v.string(), // JSON string containing mapping of storyId -> position
    // Share functionality
    shareId: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
    lastShared: v.optional(v.string())
  }),

  // Project Settings table - for storing project-level settings
  projectSettings: defineTable({
    projectId: v.string(), // Identifier for the project
    settings: v.object({
      contributorCost: v.number(),
      contributorCount: v.number(),
      hoursPerDay: v.number(),
      contributorAllocation: v.number(),
      scopeLimiters: v.object({
        points: v.object({
          default: v.number()
        }),
        hours: v.object({
          default: v.number()
        }),
        duration: v.object({
          default: v.number(),
          unit: v.string()
        })
      }),
      pointsToHoursConversion: v.number(), // Points to hours conversion rate (between 5-12)
      aiProductivityFactors: v.object({
        linesOfCode: v.number(),
        testing: v.number(),
        debugging: v.number(),
        systemDesign: v.number(),
        documentation: v.number()
      }),
      aiSimulationEnabled: v.boolean(),
      selfManagedPartner: v.object({
        enabled: v.boolean(),
        managementReductionPercent: v.number()
      })
    }),
    createdAt: v.number(), // Timestamp
    lastModified: v.number() // Timestamp
  })
});
