import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

// Scheduled function to run every day
const crons = cronJobs();

// Register a cron job to clean up temporary data
crons.daily(
  "cleanup-temporary-stories",
  {
    hourUTC: 0, // Midnight UTC
    minuteUTC: 0,
  },
  internal.maintenance.cleanupTemporaryData
);

// Register a weekly cron job to reset the free tier data
crons.weekly(
  "reset-free-tier",
  {
    dayOfWeek: "monday", // Monday
    hourUTC: 1, // 1 AM UTC
    minuteUTC: 0,
  },
  internal.maintenance.resetFreeTier
);

// Track temporary stories and import data
export const cleanupTemporaryData = internalMutation({
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    // Get all stories that were imported but not saved
    const temporaryStories = await ctx.db
      .query("stories")
      // Using default creation time index
      .filter((q) => 
        q.and(
          q.lt(q.field("_creationTime"), oneDayAgo), 
          q.eq(q.field("isTemporary"), true)
        )
      )
      .collect();
    
    // Delete temporary stories
    for (const story of temporaryStories) {
      await ctx.db.delete(story._id);
    }
    
    // Get all shared projects in free tier that haven't been accessed in 30 days
    const inactiveProjects = await ctx.db
      .query("sharedProjects")
      .filter((q) => 
        q.and(
          q.lt(q.field("updatedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          q.eq(q.field("security.paymentTier"), "free")
        )
      )
      .collect();
    
    // Delete inactive free projects and their stories
    for (const project of inactiveProjects) {
      // Delete associated stories
      const projectStories = await ctx.db
        .query("sharedStories")
        .filter((q) => q.eq(q.field("projectId"), project._id))
        .collect();
        
      for (const story of projectStories) {
        await ctx.db.delete(story._id);
      }
      
      // Delete the project itself
      await ctx.db.delete(project._id);
    }
    
    return {
      deletedTemporaryStories: temporaryStories.length,
      deletedInactiveProjects: inactiveProjects.length,
    };
  },
});

// Reset FREE tier to static set
export const resetFreeTier = internalMutation({
  handler: async (ctx) => {
    // Standard set of FREE tier stories
    const standardStories = [
      {
        title: "User Authentication",
        userStory: "As a user, I can sign up and log in to access the application",
        businessValue: "Critical",
        category: "Security",
        points: 5,
        effortCategory: "Medium",
      },
      {
        title: "Dashboard Overview",
        userStory: "As a user, I can view a dashboard with key metrics and information",
        businessValue: "Important",
        category: "Feature",
        points: 3,
        effortCategory: "Low",
      },
      {
        title: "Profile Management",
        userStory: "As a user, I can update my profile information and preferences",
        businessValue: "Nice to Have",
        category: "User Management",
        points: 2,
        effortCategory: "Low",
      },
    ];
    
    // Reset the FREE tier demo project
    const demoProjects = await ctx.db
      .query("sharedProjects")
      .filter((q) => q.eq(q.field("slug"), "demo-free"))
      .collect();
      
    if (demoProjects.length > 0) {
      const demoProject = demoProjects[0];
      
      // Delete existing stories
      const existingStories = await ctx.db
        .query("sharedStories")
        .filter((q) => q.eq(q.field("projectId"), demoProject._id))
        .collect();
        
      for (const story of existingStories) {
        await ctx.db.delete(story._id);
      }
      
      // Add standard stories
      for (const story of standardStories) {
        await ctx.db.insert("sharedStories", {
          projectId: demoProject._id,
          title: story.title,
          userStory: story.userStory,
          businessValue: story.businessValue,
          category: story.category,
          points: story.points,
          storyPoints: story.points,
          effortCategory: story.effortCategory,
          notes: "",
          isPublic: true,
          sharedWithClients: [],
        });
      }
      
      // Update project
      await ctx.db.patch(demoProject._id, {
        updatedAt: Date.now(),
        metrics: {
          ...demoProject.metrics,
          currentViewers: 0,
        },
      });
    } else {
      // Create a new demo project if it doesn't exist
      const demoProjectId = await ctx.db.insert("sharedProjects", {
        slug: "demo-free",
        name: "FREE Demo Project",
        description: "A demonstration project with standard stories",
        createdBy: "system",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          businessValues: ["Critical", "Important", "Nice to Have"],
          categories: ["Feature", "Bug", "Security", "User Management"],
          effortCategories: ["Low", "Medium", "High"],
        },
        metrics: {
          visits: 0,
          shares: 0,
          currentViewers: 0,
        },
        security: {
          isLocked: false,
          hasPassword: false,
          paymentTier: "free",
          paymentCompleted: true,
        },
        totalPoints: standardStories.reduce((sum, story) => sum + story.points, 0),
      });
      
      // Add standard stories to new project
      for (const story of standardStories) {
        await ctx.db.insert("sharedStories", {
          projectId: demoProjectId,
          title: story.title,
          userStory: story.userStory,
          businessValue: story.businessValue,
          category: story.category,
          points: story.points,
          storyPoints: story.points,
          effortCategory: story.effortCategory,
          notes: "",
          isPublic: true,
          sharedWithClients: [],
        });
      }
    }
    
    return {
      success: true,
      message: "FREE tier reset complete",
    };
  },
});
