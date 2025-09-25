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
      return stories.filter(story => {
        // Handle legacy stories that might not have these fields
        const isPublic = story.isPublic ?? true; // Default to public if not set
        const sharedWithClients = story.sharedWithClients ?? []; // Default to empty array
        return isPublic || sharedWithClients.includes(args.clientId as string);
      });
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

// Create a new story
export const createStory = mutation({
  args: {
    title: v.string(),
    userStory: v.string(),
    businessValue: v.string(),
    category: v.string(),
    points: v.number(),
    id: v.string(),
    effortCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    sharedWithClients: v.optional(v.array(v.string())),
    acceptanceCriteria: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    // Validate business value
    const validBusinessValues = ["Critical", "Important", "Nice to Have"];
    if (!validBusinessValues.includes(args.businessValue)) {
      throw new Error(`Invalid business value: ${args.businessValue}. Must be one of: ${validBusinessValues.join(", ")}`);
    }

    try {
      // Insert the new story
      const id = await ctx.db.insert("stories", {
        title: args.title,
        userStory: args.userStory,
        businessValue: args.businessValue,
        category: args.category,
        points: args.points,
        id: args.id,
        effortCategory: args.effortCategory,
        notes: args.notes,
        isPublic: args.isPublic ?? true,
        sharedWithClients: args.sharedWithClients ?? [],
        acceptanceCriteria: args.acceptanceCriteria ?? []
      });

      // Return the newly created story
      const newStory = await ctx.db.get(id);
      return newStory;
    } catch (error) {
      throw new Error(`Failed to create story: ${error}`);
    }
  }
});

// Update an existing story
export const updateStory = mutation({
  args: {
    id: v.id("stories"),
    title: v.optional(v.string()),
    userStory: v.optional(v.string()),
    businessValue: v.optional(v.string()),
    category: v.optional(v.string()),
    points: v.optional(v.number()),
    effortCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    sharedWithClients: v.optional(v.array(v.string())),
    acceptanceCriteria: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    // Get the existing story
    const story = await ctx.db.get(args.id);
    if (!story) {
      throw new Error(`Story with ID ${args.id} not found`);
    }

    // Validate business value if provided
    if (args.businessValue) {
      const validBusinessValues = ["Critical", "Important", "Nice to Have"];
      if (!validBusinessValues.includes(args.businessValue)) {
        throw new Error(`Invalid business value: ${args.businessValue}. Must be one of: ${validBusinessValues.join(", ")}`);
      }
    }

    // Build update object with only the fields that were provided
    const updateFields: Partial<Doc<"stories">> = {};
    if (args.title !== undefined) updateFields.title = args.title;
    if (args.userStory !== undefined) updateFields.userStory = args.userStory;
    if (args.businessValue !== undefined) updateFields.businessValue = args.businessValue;
    if (args.category !== undefined) updateFields.category = args.category;
    if (args.points !== undefined) updateFields.points = args.points;
    if (args.effortCategory !== undefined) updateFields.effortCategory = args.effortCategory;
    if (args.notes !== undefined) updateFields.notes = args.notes;
    if (args.isPublic !== undefined) updateFields.isPublic = args.isPublic;
    if (args.sharedWithClients !== undefined) updateFields.sharedWithClients = args.sharedWithClients;
    if (args.acceptanceCriteria !== undefined) updateFields.acceptanceCriteria = args.acceptanceCriteria;

    try {
      // Update the story
      await ctx.db.patch(args.id, updateFields);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to update story: ${error}`);
    }
  }
});

// Delete a story
export const deleteStory = mutation({
  args: {
    id: v.id("stories")
  },
  handler: async (ctx, args) => {
    // Check if the story exists
    const story = await ctx.db.get(args.id);
    if (!story) {
      throw new Error(`Story with ID ${args.id} not found`);
    }

    try {
      // Delete the story
      await ctx.db.delete(args.id);
      return { 
        success: true,
        deletedId: args.id,
        message: "Story deleted successfully"
      };
    } catch (error) {
      throw new Error(`Failed to delete story: ${error}`);
    }
  }
});

// Import multiple stories and position them in the matrix
export const importStories = mutation({
  args: {
    stories: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        userStory: v.string(),
        businessValue: v.string(),
        category: v.string(),
        points: v.float64(),
        isPublic: v.optional(v.boolean()),
        sharedWithClients: v.optional(v.array(v.string())),
        position: v.optional(
          v.object({
            value: v.string(),
            effort: v.string(),
            rank: v.optional(v.float64()),
          })
        ),
        notes: v.optional(v.string()),
        acceptanceCriteria: v.optional(v.array(v.string()))
      })
    )
  },
  handler: async (ctx, args) => {
    const storyIds = [];
    const validBusinessValues = ["Critical", "Important", "Nice to Have"];
    const importResults = {
      success: 0,
      duplicates: 0,
      errors: [] as string[],
      storyIds: [] as string[],
      positions: {} as Record<string, { value: string, effort: string, rank?: number }>
    };
    
    // First, gather all existing story titles for duplicate checking
    const existingStories = await ctx.db
      .query("stories")
      .collect();
    
    const existingTitles = new Set(existingStories.map(story => story.title.toLowerCase().trim()));
    
    for (const story of args.stories) {
      try {
        // Check for duplicates by title
        const normalizedTitle = story.title.toLowerCase().trim();
        if (existingTitles.has(normalizedTitle)) {
          importResults.duplicates++;
          importResults.errors.push(`Duplicate story: "${story.title}" - A story with this title already exists`);
          continue;
        }
        
        // Validate business value
        if (!validBusinessValues.includes(story.businessValue)) {
          importResults.errors.push(`Story "${story.title}" has invalid business value: ${story.businessValue}. Must be one of: ${validBusinessValues.join(", ")}`);
          continue;
        }
        
        const id = await ctx.db.insert("stories", {
          id: story.id,
          title: story.title,
          userStory: story.userStory,
          businessValue: story.businessValue,
          category: story.category,
          points: story.points,
          isPublic: story.isPublic ?? true,
          sharedWithClients: story.sharedWithClients ?? [],
          notes: story.notes,
          acceptanceCriteria: story.acceptanceCriteria ?? []
        });
        
        // Add to existing titles set to prevent duplicates in the same import batch
        existingTitles.add(normalizedTitle);
        
        importResults.success++;
        importResults.storyIds.push(id);
        storyIds.push(id);
        
        // Store position if provided
        if (story.position) {
          importResults.positions[id] = {
            value: story.position.value,
            effort: story.position.effort,
            rank: story.position.rank || 0
          };
        }
      } catch (error) {
        importResults.errors.push(`Failed to import story "${story.title}": ${error}`);
      }
    }
    
    return importResults;
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
