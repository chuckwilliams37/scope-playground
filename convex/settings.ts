import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Default project settings
export const defaultProjectSettings = {
  contributorCost: 800,
  contributorCount: 2,
  contributorAllocation: 0.8, // 80% allocation by default
  hoursPerDay: 6,
  scopeLimiters: {
    points: { default: 50 },
    hours: { default: 400 },
    duration: { default: 2, unit: 'months' }
  },
  pointsToHoursConversion: 8, // Default of 8 hours per point (min: 5, max: 12)
  aiProductivityFactors: {
    linesOfCode: 0.3,
    testing: 0.2,
    debugging: 0.15,
    systemDesign: 0.1,
    documentation: 0.15
  },
  aiSimulationEnabled: true,
  selfManagedPartner: {
    enabled: true,
    managementReductionPercent: 0.5
  }
};

// Get project settings for a specific project
export const getProjectSettings = query({
  args: {
    projectId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // If no projectId is specified, get the default settings
    const projectId = args.projectId || 'default';
    
    // Try to find settings for this project
    const settings = await ctx.db
      .query("projectSettings")
      .filter(q => q.eq(q.field("projectId"), projectId))
      .first();
    
    return settings;
  }
});

// Create or update project settings
export const upsertProjectSettings = mutation({
  args: {
    projectId: v.string(),
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
      pointsToHoursConversion: v.number(), // Added pointsToHoursConversion
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
    })
  },
  handler: async (ctx, args) => {
    const { projectId, settings } = args;
    
    // Check if settings already exist for this project
    const existingSettings = await ctx.db
      .query("projectSettings")
      .filter(q => q.eq(q.field("projectId"), projectId))
      .first();
    
    if (existingSettings) {
      // Update existing settings
      return await ctx.db.patch(existingSettings._id, {
        settings: settings,
        lastModified: Date.now()
      });
    } else {
      // Create new settings
      return await ctx.db.insert("projectSettings", {
        projectId,
        settings,
        createdAt: Date.now(),
        lastModified: Date.now()
      });
    }
  }
});

// Delete project settings
export const deleteProjectSettings = mutation({
  args: {
    projectId: v.string()
  },
  handler: async (ctx, args) => {
    const { projectId } = args;
    
    // Find settings for this project
    const settings = await ctx.db
      .query("projectSettings")
      .filter(q => q.eq(q.field("projectId"), projectId))
      .first();
    
    if (settings) {
      await ctx.db.delete(settings._id);
      return { success: true };
    }
    
    return { success: false, message: "Settings not found" };
  }
});
