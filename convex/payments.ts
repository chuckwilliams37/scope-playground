import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { calculatePrice, generateSimpleId } from "./payment_utils";

// Define promo code structure
interface PromoCode {
  code: string;
  discount: number; // Percentage discount (0-100)
  type: 'percentage' | 'fixed' | 'unlimited'; // Type of discount
  maxUses: number; // Maximum number of times this code can be used
  expirationDate: number; // Timestamp when code expires
}

// Simple hash function for promo codes (non-cryptographic)
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Create a new promo code (admin only function in real implementation)
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    discount: v.number(),
    type: v.string(),
    maxUses: v.number(),
    expirationDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Basic validation
    if (args.discount < 0 || args.discount > 100) {
      throw new ConvexError({ message: "Discount must be between 0 and 100" });
    }
    
    if (args.maxUses < 0) {
      throw new ConvexError({ message: "Max uses cannot be negative" });
    }
    
    // Use proper date format and validation
    const expirationDate = args.expirationDate || Date.now() + 365 * 24 * 60 * 60 * 1000; // Default 1 year
    
    // Store the promo code with a simple hash
    const hashedCode = simpleHash(args.code.toUpperCase());
    
    const promoCodeId = await ctx.db.insert("promoCodes", {
      code: hashedCode,
      originalCode: args.code.toUpperCase(), // Store original for easy comparison - in production you'd use proper encryption
      discount: args.discount,
      type: args.type,
      maxUses: args.maxUses,
      expirationDate,
      isTeamCode: false, // All codes are treated as regular promo codes in this simplified version
      usageCount: 0,
      isActive: true,
      createdAt: Date.now(),
    });
    
    return { success: true, id: promoCodeId };
  },
});

// Validate a promo code
export const validatePromoCode = mutation({
  args: { 
    code: v.string(),
    projectPoints: v.number(),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    
    // Find promo code by original code (in production, you'd use proper encryption)
    const promoCodes = await ctx.db
      .query("promoCodes")
      .filter((q) => q.eq(q.field("originalCode"), code))
      .collect();
    
    if (promoCodes.length === 0) {
      throw new ConvexError({ message: "Invalid promo code" });
    }
    
    const promoCode = promoCodes[0];
    
    // Validate the promo code
    if (promoCode.expirationDate < Date.now()) {
      throw new ConvexError({ message: "Promo code has expired" });
    }
    
    if (promoCode.maxUses > 0 && promoCode.usageCount >= promoCode.maxUses) {
      throw new ConvexError({ message: "Promo code has reached its usage limit" });
    }
    
    // Increment usage count
    await ctx.db.patch(promoCode._id, {
      usageCount: promoCode.usageCount + 1,
    });
    
    return {
      valid: true,
      discount: promoCode.discount,
      type: promoCode.type,
      promoCodeId: promoCode._id
    };
  },
});

// Process a payment with promo code (simplified for demo)
export const processPayment = mutation({
  args: {
    projectId: v.id("sharedProjects"),
    promoCode: v.optional(v.string()),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const { projectId, promoCode, paymentMethod } = args;
    
    // Get project details to calculate price
    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }
    
    // Calculate base price based on points
    const basePrice = calculatePrice(project.totalPoints || 0);
    let finalPrice = basePrice;
    let discount = 0;
    let promoCodeId: Id<"promoCodes"> | undefined = undefined;
    
    // Apply promo code if provided
    if (promoCode) {
      try {
        const code = promoCode.trim().toUpperCase();
        
        // Find promo code by original code
        const promoCodes = await ctx.db
          .query("promoCodes")
          .filter((q) => q.eq(q.field("originalCode"), code))
          .collect();
          
        if (promoCodes.length > 0) {
          const matchedCode = promoCodes[0];
          promoCodeId = matchedCode._id;
          
          // Apply the discount
          if (matchedCode.type === 'percentage') {
            discount = (basePrice * matchedCode.discount) / 100;
            finalPrice = basePrice - discount;
          } else if (matchedCode.type === 'fixed') {
            discount = matchedCode.discount;
            finalPrice = Math.max(0, basePrice - discount);
          } else if (matchedCode.type === 'unlimited') {
            discount = basePrice;
            finalPrice = 0;
          }
        }
      } catch (error) {
        console.error("Error processing promo code:", error);
        // Continue without the promo code
      }
    }
    
    // Generate a unique session ID without crypto
    const sessionId = generateSimpleId();
    
    await ctx.db.insert("paymentSessions", {
      sessionId,
      projectId,
      userId: "anonymous", // In a real app, this would be the authenticated user
      amount: finalPrice,
      currency: "USD",
      status: "pending",
      promoCodeId, // May be undefined if no promo code was applied
      paymentMethod,
      createdAt: Date.now(),
      completedAt: undefined,
    });
    
    return {
      sessionId,
      basePrice,
      discount,
      finalPrice,
      currency: "USD",
    };
  },
});

// Mark a payment as complete (for demo purposes)
export const completePayment = mutation({
  args: { 
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId } = args;
    
    // Find the payment session
    const paymentSessions = await ctx.db
      .query("paymentSessions")
      .filter((q) => q.eq(q.field("sessionId"), sessionId))
      .collect();
    
    if (paymentSessions.length === 0) {
      throw new ConvexError("Payment session not found");
    }
    
    const paymentSession = paymentSessions[0];
    
    // Update session status
    await ctx.db.patch(paymentSession._id, {
      status: "completed",
      completedAt: Date.now(),
    });
    
    // Update project to mark as paid
    const project = await ctx.db.get(paymentSession.projectId);
    
    if (project) {
      await ctx.db.patch(paymentSession.projectId, {
        security: {
          ...project.security,
          paymentCompleted: true,
          paymentTier: "pro" // Example tier
        }
      });
    }
    
    return {
      success: true,
      sessionId
    };
  },
});
