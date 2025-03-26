import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Clean up temporary data (imported but not saved/shared)
export const cleanupTemporaryData = internalMutation({
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    // Get all stories that were imported but not saved
    const temporaryStories = await ctx.db
      .query("stories")
      .filter((q) => 
        q.and(
          q.lt(q.field("_creationTime"), oneDayAgo),
          q.eq(q.field("isTemporary"), true)
        )
      )
      .collect();
    
    // Delete temporary stories
    let deletedCount = 0;
    for (const story of temporaryStories) {
      await ctx.db.delete(story._id);
      deletedCount++;
    }
    
    return {
      deletedCount,
      timestamp: Date.now(),
    };
  },
});

// Reset FREE tier to static set
export const resetFreeTier = internalMutation({
  handler: async (ctx) => {
    // Define our standard business values according to user's standardized terminology
    const standardBusinessValues = ["Critical", "Important", "Nice to Have"];
    
    // Standard set of FREE tier stories
    const standardStories = [
      {
        title: "User Authentication",
        userStory: "As a user, I can sign up and log in to access the application",
        businessValue: "Critical", // Using standardized terminology
        category: "Security",
        points: 5,
        effortCategory: "Medium",
      },
      {
        title: "Dashboard Overview",
        userStory: "As a user, I can view a dashboard with key metrics and information",
        businessValue: "Important", // Using standardized terminology
        category: "Feature",
        points: 3,
        effortCategory: "Low",
      },
      {
        title: "Profile Management",
        userStory: "As a user, I can update my profile information and preferences",
        businessValue: "Nice to Have", // Using standardized terminology 
        category: "User Management",
        points: 2,
        effortCategory: "Low",
      },
    ];
    
    // Get all shared projects in free tier
    const freeProjects = await ctx.db
      .query("sharedProjects")
      .filter((q) => 
        q.eq(q.field("security.paymentTier"), "free")
      )
      .collect();
    
    // For each free project, reset to standard stories
    for (const project of freeProjects) {
      // Remove existing stories for this project
      const existingStories = await ctx.db
        .query("sharedStories")
        .filter((q) => q.eq(q.field("projectId"), project._id))
        .collect();
      
      for (const story of existingStories) {
        await ctx.db.delete(story._id);
      }
      
      // Add standard stories
      for (const story of standardStories) {
        await ctx.db.insert("sharedStories", {
          projectId: project._id,
          title: story.title,
          userStory: story.userStory,
          businessValue: story.businessValue,
          category: story.category,
          points: story.points,
          storyPoints: story.points,
          effortCategory: story.effortCategory,
          notes: "",
          isPublic: true,
          sharedWithClients: []
          // Removed matrixPosition as it's causing schema conflicts
        });
      }
      
      // Update project metrics
      await ctx.db.patch(project._id, {
        updatedAt: Date.now(),
        metrics: {
          visits: 0,
          shares: 0,
          currentViewers: 0
        }
      });
    }
    
    return {
      resetCount: freeProjects.length,
      timestamp: Date.now()
    };
  }
});

// Display warning for temporary data
export const getDataExpiryWarning = query({
  handler: async (ctx) => {
    return {
      message: "Imported data is temporary and will be deleted after 24 hours unless shared or saved. To keep your data, please share your project or upgrade to a paid plan.",
      type: "warning",
      expiryHours: 24
    };
  }
});
