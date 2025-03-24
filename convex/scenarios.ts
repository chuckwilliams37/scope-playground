import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { defaultProjectSettings } from "./settings";

// Helper function to ensure all required settings are present
function ensureSettingsComplete(settings: any) {
  // Start with a deep copy of the default settings
  const completeSettings = JSON.parse(JSON.stringify(defaultProjectSettings));
  
  // Override with provided settings where available
  if (settings) {
    Object.keys(completeSettings).forEach(key => {
      if (settings[key] !== undefined) {
        completeSettings[key] = settings[key];
      }
    });
  }
  
  return completeSettings;
}

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
      aiProductivityFactors: v.object({
        linesOfCode: v.number(),
        testing: v.number(),
        debugging: v.number(),
        systemDesign: v.number(),
        documentation: v.number()
      }),
      aiSimulationEnabled: v.boolean(),
      pointsToHoursConversion: v.number(),
      selfManagedPartner: v.optional(v.object({
        enabled: v.boolean(),
        managementReductionPercent: v.number()
      }))
    }),
    storyPositions: v.string() // JSON string
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Ensure all settings are complete
    const completeSettings = ensureSettingsComplete(args.settings);

    const id = await ctx.db.insert("scenarios", {
      name: args.name,
      description: args.description ?? "",
      createdBy: args.createdBy,
      createdAt: now,
      lastModified: now,
      isPreset: false,
      isPublic: args.isPublic,
      sharedWithClients: args.sharedWithClients,
      settings: completeSettings,
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
      aiProductivityFactors: v.object({
        linesOfCode: v.number(),
        testing: v.number(),
        debugging: v.number(),
        systemDesign: v.number(),
        documentation: v.number()
      }),
      aiSimulationEnabled: v.boolean(),
      pointsToHoursConversion: v.number(),
      selfManagedPartner: v.optional(v.object({
        enabled: v.boolean(),
        managementReductionPercent: v.number()
      }))
    })),
    storyPositions: v.optional(v.string()) // JSON string
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Get the existing scenario to make sure we have all settings fields
    const existingScenario = await ctx.db.get(id);
    if (!existingScenario) {
      throw new Error("Scenario not found");
    }
    
    // If settings are being updated, ensure they're complete
    if (updates.settings) {
      updates.settings = ensureSettingsComplete(updates.settings);
    }
    
    // Create the update object with lastModified
    const updateObj = {
      ...updates,
      lastModified: Date.now()
    };
    
    await ctx.db.patch(id, updateObj);
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

// Generate a shareable link for a scenario
export const generateShareableLink = mutation({
  args: { 
    scenarioId: v.id("scenarios")
  },
  handler: async (ctx, args) => {
    // Get the scenario to make sure it exists
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new Error("Scenario not found");
    }
    
    // Generate a unique shareId if one doesn't exist already
    let shareId = scenario.shareId;
    if (!shareId) {
      // Create a random ID (using timestamp + random string)
      shareId = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update the scenario with the new shareId
      await ctx.db.patch(args.scenarioId, { 
        shareId,
        lastModified: Date.now()
      });
    }
    
    // Build the shareable URL
    // For local development, use localhost:3000
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000';
    
    return `${baseUrl}/shared/${shareId}`;
  }
});

// Get a shared scenario by its share ID
export const getSharedScenario = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const scenarios = await ctx.db
      .query("scenarios")
      .filter(q => q.eq(q.field("shareId"), args.shareId))
      .collect();
    return scenarios.length > 0 ? scenarios[0] : null;
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
          contributorCost: 750,
          contributorCount: 3,
          hoursPerDay: 8,
          contributorAllocation: 80,
          scopeLimiters: {
            points: {
              default: 1
            },
            hours: {
              default: 1
            },
            duration: {
              default: 1,
              unit: "days"
            }
          },
          aiProductivityFactors: {
            linesOfCode: 1,
            testing: 1,
            debugging: 1,
            systemDesign: 1,
            documentation: 1
          },
          aiSimulationEnabled: false,
          pointsToHoursConversion: 1,
          selfManagedPartner: {
            enabled: false,
            managementReductionPercent: 0
          }
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
          contributorCost: 750,
          contributorCount: 5,
          hoursPerDay: 8,
          contributorAllocation: 80,
          scopeLimiters: {
            points: {
              default: 1
            },
            hours: {
              default: 1
            },
            duration: {
              default: 1,
              unit: "days"
            }
          },
          aiProductivityFactors: {
            linesOfCode: 1,
            testing: 1,
            debugging: 1,
            systemDesign: 1,
            documentation: 1
          },
          aiSimulationEnabled: false,
          pointsToHoursConversion: 1,
          selfManagedPartner: {
            enabled: false,
            managementReductionPercent: 0
          }
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
