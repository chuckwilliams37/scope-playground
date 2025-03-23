import { mutation } from "./_generated/server";

export const seedStories = mutation({
  async handler({ db }, { }) {
    const existingStories = await db.query("stories").collect();
    
    // Only seed if no stories exist
    if (existingStories.length > 0) {
      return { status: "Stories already exist", count: existingStories.length };
    }
    
    // Stories data from the JSON file
    const stories = [
      {
        title: "User Management",
        businessValue: "Critical",
        storyPoints: 13,
        notes: "Core system functionality. Required for login, roles, etc."
      },
      {
        title: "Safety Inspections",
        businessValue: "Critical",
        storyPoints: 13,
        notes: "Allows recording and review of OSHA-required safety inspections."
      },
      {
        title: "Training Management",
        businessValue: "High",
        storyPoints: 8,
        notes: "Manage assignment and completion tracking for training modules."
      },
      {
        title: "Forms Management",
        businessValue: "High",
        storyPoints: 8,
        notes: "Submit and archive compliance-related forms and PDFs."
      },
      {
        title: "Admin Dashboard",
        businessValue: "High",
        storyPoints: 13,
        notes: "Access controls, org-level overview, training and inspection stats."
      }
    ];
    
    // Insert each story into the database
    const storyIds = await Promise.all(
      stories.map(async (story) => {
        return await db.insert("stories", story);
      })
    );
    
    return { status: "Seeded successfully", count: storyIds.length };
  },
});
