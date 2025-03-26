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
    adjustmentReason: v.optional(v.string()), // Reason for point adjustment
    effortCategory: v.optional(v.string()), // Effort category (e.g., Core Functionality, Development, etc.)
    notes: v.optional(v.string()), // Additional notes about the story
    isTemporary: v.optional(v.boolean()) // Whether this story is temporary and should be cleaned up
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
  }),

  // Schema for shared projects
  sharedProjects: defineTable({
    // Unique identifier for the URL (will be used in the URL path)
    slug: v.string(),
    // Name of the project
    name: v.string(),
    // Project description
    description: v.optional(v.string()),
    // Creator user ID
    createdBy: v.optional(v.string()),
    // Creation timestamp
    createdAt: v.number(),
    // Last updated timestamp
    updatedAt: v.number(),
    // Project settings
    settings: v.object({
      businessValues: v.array(v.string()),
      categories: v.array(v.string()),
      effortCategories: v.array(v.string()),
      // Additional project settings can be added here
    }),
    // Project metrics
    metrics: v.object({
      visits: v.number(),
      shares: v.number(),
      currentViewers: v.number(),
    }),
    // Security options
    security: v.object({
      isLocked: v.boolean(),
      hasPassword: v.boolean(),
      passwordHash: v.optional(v.string()), // Hashed password
      requires2FA: v.optional(v.boolean()),
      paymentTier: v.optional(v.string()), // "free", "basic", "premium", "enterprise"
      paymentCompleted: v.optional(v.boolean()),
    }),
    // Total points - used for pricing tier calculation
    totalPoints: v.number(),
  })
  .index("by_slug", ["slug"]),

  // Schema for project viewers and access
  projectAccess: defineTable({
    projectId: v.id("sharedProjects"),
    userId: v.string(), // Could be anonymous session ID or authenticated user ID
    accessGranted: v.boolean(),
    lastAccessTime: v.number(),
    accessCount: v.number(),
    ipAddress: v.optional(v.string()), // For analytics
  })
  .index("by_project", ["projectId"]),

  // Schema for shared stories (linked to projects)
  sharedStories: defineTable({
    projectId: v.id("sharedProjects"),
    // Story content
    title: v.string(),
    userStory: v.optional(v.string()),
    businessValue: v.string(), // Using standardized values: "Critical", "Important", "Nice to Have"
    category: v.optional(v.string()),
    points: v.number(),
    storyPoints: v.optional(v.number()),
    effortCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Matrix position (if placed on matrix)
    matrixPosition: v.optional(v.object({
      value: v.string(),
      effort: v.string(),
    })),
    isPublic: v.boolean(),
    sharedWithClients: v.array(v.string()),
    // For undo/redo functionality
    history: v.optional(v.array(v.object({
      timestamp: v.number(),
      changeType: v.string(), // "create", "update", "delete", "move"
      previousState: v.object({}),
    }))),
  })
  .index("by_project", ["projectId"]),

  // Schema for promo codes
  promoCodes: defineTable({
    code: v.string(), // The promo code string (hashed version)
    originalCode: v.string(), // The original promo code string (for comparison)
    type: v.string(), // "percentage", "fixed", "unlimited"
    discount: v.number(), // Discount amount (percentage or fixed)
    expirationDate: v.number(), // When the code expires
    isTeamCode: v.boolean(), // Whether this is a team-specific code
    maxUses: v.number(), // Maximum number of times this code can be used
    usageCount: v.number(), // Current usage count
    isActive: v.boolean(), // Whether this code is currently active
    createdAt: v.number(), // When this code was created
    description: v.optional(v.string()) // Description of the promo code
  })
  .index("by_code", ["code"]),

  // Schema for payment sessions
  paymentSessions: defineTable({
    sessionId: v.string(), // Unique session ID for this payment attempt
    projectId: v.id("sharedProjects"), // Reference to the shared project
    userId: v.optional(v.string()), // User ID if authenticated
    amount: v.number(), // Payment amount
    currency: v.string(), // Payment currency
    status: v.string(), // "pending", "completed", "failed"
    promoCodeId: v.optional(v.id("promoCodes")), // Reference to the promo code if used
    paymentMethod: v.optional(v.string()), // Payment method used
    createdAt: v.number(), // When this session was created
    completedAt: v.optional(v.number()) // When the payment was completed
  })
  .index("by_session_id", ["sessionId"]),
});
