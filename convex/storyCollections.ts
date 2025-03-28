import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Save a collection of stories
export const saveStoryCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    stories: v.array(v.object({
      _id: v.string(),
      title: v.string(),
      businessValue: v.string(),
      userStory: v.optional(v.string()),
      category: v.optional(v.string()),
      points: v.optional(v.number()),
      storyPoints: v.optional(v.number()),
      notes: v.optional(v.string()),
      effortCategory: v.optional(v.string()),
      adjustmentReason: v.optional(v.string()),
      originalPoints: v.optional(v.number()),
      position: v.optional(v.object({
        value: v.string(),
        effort: v.string()
      }))
    }))
  },
  handler: async (ctx, args) => {
    // Check if a collection with the same name already exists
    const existingCollection = await ctx.db
      .query('storyCollections')
      .filter(q => q.eq(q.field('name'), args.name))
      .first();

    // If it exists, update it
    if (existingCollection) {
      return await ctx.db.patch(existingCollection._id, {
        description: args.description,
        stories: args.stories,
        lastModified: Date.now()
      });
    }

    // Otherwise create a new collection
    return await ctx.db.insert('storyCollections', {
      name: args.name,
      description: args.description,
      stories: args.stories,
      createdBy: '',  // Add user ID here if authentication is implemented
      createdAt: Date.now(),
      lastModified: Date.now()
    });
  }
});

// Get all story collections
export const getStoryCollections = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('storyCollections').collect();
  }
});

// Get a specific story collection by ID
export const getStoryCollectionById = query({
  args: { id: v.id('storyCollections') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

// Delete a story collection
export const deleteStoryCollection = mutation({
  args: { id: v.id('storyCollections') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  }
});

// Load a story collection (returns just the stories)
export const loadStoryCollection = query({
  args: { id: v.id('storyCollections') },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) {
      throw new Error('Collection not found');
    }
    return collection.stories;
  }
});
