import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Get all stories accessible to the current user
export const listAccessibleStories = query({
  args: {
    clientId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // In a real app, we would authenticate the user and get their clientId
    // For now, we'll use the provided clientId or return all stories if none
    const stories = await ctx.db.query("stories")
      .collect();
    
    // Filter stories based on client access
    if (args.clientId) {
      return stories.filter(story => 
        story.isPublic || 
        story.sharedWithClients.includes(args.clientId as string)
      );
    }
    
    // Return all stories if no clientId provided (admin/PM view)
    return stories;
  }
});

// Get a specific story by ID
export const getStory = query({
  args: {
    id: v.id("stories")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

// Import stories from a JSON file (admin function)
export const importStories = mutation({
  args: {
    stories: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        userStory: v.string(),
        businessValue: v.string(),
        category: v.string(),
        points: v.number(),
        isPublic: v.optional(v.boolean()),
        sharedWithClients: v.optional(v.array(v.string()))
      })
    )
  },
  handler: async (ctx, args) => {
    const storyIds = [];
    
    for (const story of args.stories) {
      const id = await ctx.db.insert("stories", {
        id: story.id,
        title: story.title,
        userStory: story.userStory,
        businessValue: story.businessValue,
        category: story.category,
        points: story.points,
        isPublic: story.isPublic ?? true,
        sharedWithClients: story.sharedWithClients ?? []
      });
      storyIds.push(id);
    }
    
    return storyIds;
  }
});

// Adjust story points with tracking of original estimate
export const adjustStoryPoints = mutation({
  args: {
    id: v.id("stories"),
    newPoints: v.number(),
    adjustmentReason: v.string()
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.id);
    
    if (!story) {
      throw new Error(`Story with ID ${args.id} not found`);
    }
    
    // Store original points if this is the first adjustment
    const originalPoints = story.originalPoints !== undefined ? 
      story.originalPoints : 
      story.points;
    
    // Update story with new points and reason
    await ctx.db.patch(args.id, {
      points: args.newPoints,
      originalPoints: originalPoints,
      adjustmentReason: args.adjustmentReason
    });
    
    return {
      success: true,
      story: await ctx.db.get(args.id)
    };
  }
});

// Reset story points to original estimate
export const resetStoryPoints = mutation({
  args: {
    id: v.id("stories")
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.id);
    
    if (!story) {
      throw new Error(`Story with ID ${args.id} not found`);
    }
    
    // Only reset if there's an original points value stored
    if (story.originalPoints === undefined) {
      return {
        success: false,
        message: "No original estimate found to reset to"
      };
    }
    
    // Reset points to original and clear adjustment reason
    await ctx.db.patch(args.id, {
      points: story.originalPoints,
      adjustmentReason: undefined
    });
    
    return {
      success: true,
      story: await ctx.db.get(args.id)
    };
  }
});
