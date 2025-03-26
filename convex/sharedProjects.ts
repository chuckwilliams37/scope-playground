import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Generate a random slug
function generateSlug(length = 8) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Helper to determine pricing tier based on total points
function getPricingTier(totalPoints: number) {
  if (totalPoints <= 10) return { tier: "free", price: 0 };
  if (totalPoints <= 50) return { tier: "basic", price: 10 };
  if (totalPoints <= 100) return { tier: "premium", price: 50 };
  return { tier: "enterprise", price: 250 };
}

// Create a new shared project
export const createSharedProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    businessValues: v.array(v.string()),
    categories: v.array(v.string()),
    effortCategories: v.array(v.string()),
    initialStories: v.array(v.object({
      title: v.string(),
      userStory: v.optional(v.string()),
      businessValue: v.string(), 
      category: v.optional(v.string()),
      points: v.number(),
      effortCategory: v.optional(v.string()),
      notes: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    // Generate a unique slug
    const slug = generateSlug(10);
    
    // Calculate total points for pricing
    const totalPoints = args.initialStories.reduce((sum, story) => sum + story.points, 0);
    const pricingTier = getPricingTier(totalPoints);
    
    // Create the project
    const projectId = await ctx.db.insert("sharedProjects", {
      slug,
      name: args.name,
      description: args.description || "",
      createdBy: "anonymous", // To be replaced with user ID when auth is implemented
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        businessValues: args.businessValues.length > 0 
          ? args.businessValues 
          : ["Critical", "Important", "Nice to Have"], // Using standardized values
        categories: args.categories.length > 0 
          ? args.categories 
          : ["Feature", "Bug", "Tech Debt", "Security"],
        effortCategories: args.effortCategories.length > 0 
          ? args.effortCategories 
          : ["Low", "Medium", "High"],
      },
      metrics: {
        visits: 0,
        shares: 0,
        currentViewers: 0,
      },
      security: {
        isLocked: false,
        hasPassword: false,
        paymentTier: pricingTier.tier,
        paymentCompleted: pricingTier.tier === "free", // Free tier is auto-completed
      },
      totalPoints,
    });
    
    // Create initial stories
    for (const story of args.initialStories) {
      await ctx.db.insert("sharedStories", {
        projectId,
        title: story.title,
        userStory: story.userStory || "",
        businessValue: story.businessValue || "Important",
        category: story.category || "Feature",
        points: story.points,
        storyPoints: story.points,
        effortCategory: story.effortCategory || "Medium",
        notes: story.notes || "",
        isPublic: true,
        sharedWithClients: [],
      });
    }
    
    return { projectId, slug };
  },
});

// Get a project by slug
export const getProjectBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("sharedProjects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();
      
    if (projects.length === 0) {
      return null;
    }
    
    // In a query we can't update metrics, just return the project
    return projects[0];
  },
});

// Update project metrics when viewed (separate mutation)
export const updateProjectMetrics = mutation({
  args: { projectId: v.id("sharedProjects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    
    if (!project) {
      return { success: false, message: "Project not found" };
    }
    
    // Update metrics properly using nested object
    await ctx.db.patch(args.projectId, {
      metrics: {
        visits: (project.metrics?.visits || 0) + 1,
        shares: project.metrics?.shares || 0,
        currentViewers: project.metrics?.currentViewers || 0
      },
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Get stories for a project
export const getProjectStories = query({
  args: { projectId: v.id("sharedProjects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sharedStories")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Record user viewing a project
export const recordProjectView = mutation({
  args: { 
    projectId: v.id("sharedProjects"),
    userId: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user has viewed this project before
    const existingAccess = await ctx.db
      .query("projectAccess")
      .withIndex("by_project", (q) => 
        q.eq("projectId", args.projectId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    // Update project metrics to increment current viewers
    const project = await ctx.db.get(args.projectId);
    if (!project) return { success: false };
    
    await ctx.db.patch(args.projectId, {
      metrics: {
        ...project.metrics,
        currentViewers: project.metrics.currentViewers + 1,
      },
    });
    
    // Record or update access
    if (existingAccess) {
      await ctx.db.patch(existingAccess._id, {
        lastAccessTime: Date.now(),
        accessCount: existingAccess.accessCount + 1,
        ipAddress: args.ipAddress,
      });
    } else {
      await ctx.db.insert("projectAccess", {
        projectId: args.projectId,
        userId: args.userId,
        accessGranted: true,
        lastAccessTime: Date.now(),
        accessCount: 1,
        ipAddress: args.ipAddress,
      });
    }
    
    return { success: true };
  },
});

// Record user leaving a project
export const recordProjectLeave = mutation({
  args: { 
    projectId: v.id("sharedProjects"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Update project metrics to decrement current viewers
    const project = await ctx.db.get(args.projectId);
    if (!project) return { success: false };
    
    await ctx.db.patch(args.projectId, {
      metrics: {
        ...project.metrics,
        currentViewers: Math.max(0, project.metrics.currentViewers - 1),
      },
    });
    
    return { success: true };
  },
});

// Record a project share
export const recordProjectShare = mutation({
  args: { projectId: v.id("sharedProjects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return { success: false };
    
    await ctx.db.patch(args.projectId, {
      metrics: {
        ...project.metrics,
        shares: project.metrics.shares + 1,
      },
    });
    
    return { success: true };
  },
});

// Update project security settings
export const updateProjectSecurity = mutation({
  args: { 
    projectId: v.id("sharedProjects"),
    isLocked: v.boolean(),
    passwordHash: v.optional(v.string()),
    requires2FA: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return { success: false };
    
    await ctx.db.patch(args.projectId, {
      security: {
        ...project.security,
        isLocked: args.isLocked,
        hasPassword: !!args.passwordHash,
        passwordHash: args.passwordHash,
        requires2FA: args.requires2FA || false,
      },
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Add/update stories in a shared project
export const updateSharedStory = mutation({
  args: { 
    projectId: v.id("sharedProjects"),
    storyId: v.optional(v.id("sharedStories")),
    story: v.object({
      title: v.string(),
      userStory: v.optional(v.string()),
      businessValue: v.string(),
      category: v.optional(v.string()),
      points: v.number(),
      effortCategory: v.optional(v.string()),
      notes: v.optional(v.string()),
      matrixPosition: v.optional(v.object({
        value: v.string(),
        effort: v.string(),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Check if project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) return { success: false };
    
    // Create new story or update existing
    if (args.storyId) {
      // Update existing story
      const story = await ctx.db.get(args.storyId);
      if (!story) return { success: false, message: "Story not found" };
      
      // Record history for undo/redo
      const history = story.history || [];
      history.push({
        timestamp: Date.now(),
        changeType: "update",
        previousState: {
          title: story.title,
          userStory: story.userStory,
          businessValue: story.businessValue,
          category: story.category,
          points: story.points,
          effortCategory: story.effortCategory,
          notes: story.notes,
          matrixPosition: story.matrixPosition,
        },
      });
      
      await ctx.db.patch(args.storyId, {
        title: args.story.title,
        userStory: args.story.userStory || "",
        businessValue: args.story.businessValue,
        category: args.story.category || "Feature",
        points: args.story.points,
        storyPoints: args.story.points,
        effortCategory: args.story.effortCategory || "Medium",
        notes: args.story.notes || "",
        matrixPosition: args.story.matrixPosition,
        history: history.slice(-10), // Keep last 10 changes
      });
      
      // Update total points
      const stories = await ctx.db
        .query("sharedStories")
        .withIndex("by_project", q => q.eq("projectId", args.projectId))
        .collect();
      
      const totalPoints = stories.reduce((sum, s) => {
        // Check if this is the story being updated
        if (args.storyId && s._id.toString() === args.storyId.toString()) {
          return sum + (args.story.points || 0);
        }
        return sum + s.points;
      }, 0);
      
      await ctx.db.patch(args.projectId, {
        totalPoints,
        updatedAt: Date.now(),
      });
      
      return { success: true, storyId: args.storyId };
    } else {
      // Create new story
      const storyId = await ctx.db.insert("sharedStories", {
        projectId: args.projectId,
        title: args.story.title,
        userStory: args.story.userStory || "",
        businessValue: args.story.businessValue,
        category: args.story.category || "Feature",
        points: args.story.points,
        storyPoints: args.story.points,
        effortCategory: args.story.effortCategory || "Medium",
        notes: args.story.notes || "",
        matrixPosition: args.story.matrixPosition,
        isPublic: true,
        sharedWithClients: [],
      });
      
      // Update total points
      await ctx.db.patch(args.projectId, {
        totalPoints: project.totalPoints + args.story.points,
        updatedAt: Date.now(),
      });
      
      return { success: true, storyId };
    }
  },
});

// Delete a story from a shared project
export const deleteSharedStory = mutation({
  args: { 
    projectId: v.id("sharedProjects"),
    storyId: v.id("sharedStories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) return { success: false };
    
    // Update total points in project
    const project = await ctx.db.get(args.projectId);
    if (project) {
      await ctx.db.patch(args.projectId, {
        totalPoints: Math.max(0, project.totalPoints - (story.points || 0)),
        updatedAt: Date.now(),
      });
    }
    
    // Delete the story
    await ctx.db.delete(args.storyId);
    
    return { success: true };
  },
});
