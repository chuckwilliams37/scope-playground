import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Get all scenarios accessible to the current user
export const listAccessibleScenarios = query({
  args: {
    clientId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const scenarios = await ctx.db.query("scenarios").collect();
    
    // Filter scenarios based on client access
    if (args.clientId) {
      return scenarios.filter(scenario => 
        scenario.isPublic || 
        scenario.sharedWithClients.includes(args.clientId as string)
      );
    }
    
    // Return all scenarios if no clientId provided (admin/PM view)
    return scenarios;
  }
});

// Get a specific scenario by ID
export const getScenario = query({
  args: {
    id: v.id("scenarios")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

// Create a new scenario
export const createScenario = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    isPublic: v.boolean(),
    sharedWithClients: v.array(v.string()),
    settings: v.object({
      developerCost: v.number(),
      developerCount: v.number(),
      hoursPerDay: v.number(),
      developerAllocation: v.number()
    }),
    storyPositions: v.string() // JSON string
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const id = await ctx.db.insert("scenarios", {
      name: args.name,
      description: args.description ?? "",
      createdBy: args.createdBy,
      createdAt: now,
      lastModified: now,
      isPreset: false,
      isPublic: args.isPublic,
      sharedWithClients: args.sharedWithClients,
      settings: args.settings,
      storyPositions: args.storyPositions
    });
    
    return id;
  }
});

// Update an existing scenario
export const updateScenario = mutation({
  args: {
    id: v.id("scenarios"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    sharedWithClients: v.optional(v.array(v.string())),
    settings: v.optional(v.object({
      developerCost: v.number(),
      developerCount: v.number(),
      hoursPerDay: v.number(),
      developerAllocation: v.number()
    })),
    storyPositions: v.optional(v.string()) // JSON string
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    // First retrieve the current scenario to preserve unchanged fields
    const scenario = await ctx.db.get(id);
    if (!scenario) {
      throw new Error("Scenario not found");
    }
    
    // Apply updates while keeping existing values for fields not included in the update
    await ctx.db.patch(id, {
      ...updates,
      lastModified: now
    });
    
    return id;
  }
});

// Delete a scenario
export const deleteScenario = mutation({
  args: {
    id: v.id("scenarios")
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  }
});

// Create preset scenarios (MVP, Lovable, etc.)
export const createPresetScenarios = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const presets = [
      {
        name: "MVP (Minimum Viable Product)",
        description: "Focus on critical features only to get a working product to market",
        isPreset: true,
        isPublic: true,
        sharedWithClients: [],
        createdBy: "system",
        createdAt: now,
        lastModified: now,
        settings: {
          developerCost: 750,
          developerCount: 3,
          hoursPerDay: 8,
          developerAllocation: 80
        },
        storyPositions: JSON.stringify({
          // This will be populated with critical stories
          // in the high-value, low-effort quadrant
        })
      },
      {
        name: "Lovable Product",
        description: "A well-rounded product with both critical and high-value features",
        isPreset: true,
        isPublic: true,
        sharedWithClients: [],
        createdBy: "system",
        createdAt: now,
        lastModified: now,
        settings: {
          developerCost: 750,
          developerCount: 5,
          hoursPerDay: 8,
          developerAllocation: 80
        },
        storyPositions: JSON.stringify({
          // This will include more stories across all quadrants
        })
      }
    ];
    
    const presetIds = [];
    for (const preset of presets) {
      const id = await ctx.db.insert("scenarios", preset);
      presetIds.push(id);
    }
    
    return presetIds;
  }
});
