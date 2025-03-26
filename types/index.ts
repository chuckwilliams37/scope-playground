import { Id } from "@/convex/_generated/dataModel";

// Define the Story type for use across the application
export type Story = {
  _id: string;
  title: string;
  userStory?: string;
  businessValue: string; // Using standardized values: "Critical", "Important", "Nice to Have"
  category?: string;
  points: number;
  storyPoints?: number;
  effortCategory?: string;
  notes?: string;
  // Matrix position for shareable URLs
  matrixPosition?: {
    value: string;
    effort: string;
  };
  // For point adjustments
  adjustmentReason?: string;
  originalPoints?: number;
};

// Define the backend story type (used with Convex)
export type ConvexStory = {
  _id: Id<"stories">;
  _creationTime: number;
  title: string;
  userStory: string;
  businessValue: string;
  category: string;
  points: number;
  id: string;
  effortCategory?: string;
  notes?: string;
  isPublic: boolean;
  sharedWithClients: string[];
  originalPoints?: number;
  adjustmentReason?: string;
};

// Define props for the BacklogViewer component
export type BacklogViewerProps = {
  stories: Story[];
  categoryFilter?: string;
  valueFilter?: string;
  pointsFilter?: number;
  expandedStoryIds?: string[];
  onToggleExpandStory?: (storyId: string) => void;
  onCreateStory?: (story: Story) => Promise<Story | undefined>;
  onUpdateStory?: (storyId: string, story: Story) => Promise<boolean>;
  onDeleteStory?: (storyId: string) => Promise<boolean>;
};
