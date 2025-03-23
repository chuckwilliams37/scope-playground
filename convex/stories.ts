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
