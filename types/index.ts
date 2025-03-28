import { Id } from "@/convex/_generated/dataModel";

// Define the Story type for use across the application
export type Story = {
  _id: string;
  id?: string;  // Add id for imported stories
  title: string;
  userStory?: string;
  businessValue?: string; // Using standardized values: "Critical", "Important", "Nice to Have"
  category?: string;
  points?: number;  // Make points optional
  storyPoints?: number;  // Make storyPoints optional
  effortCategory?: string;
  notes?: string;
  acceptanceCriteria?: string[];  // Array of acceptance criteria strings
  // Matrix position for shareable URLs
  matrixPosition?: {
    value: string;
    effort: string;
  };
  position?: {  // Add backward-compatibility for position
    value: string;
    effort: string;
  };
  // For point adjustments
  adjustmentReason?: string;
  originalPoints?: number;
  businessValueMismatch?: string; // The expected matrix value that doesn't match the story's value
  urlPath?: string; // URL path this story is associated with
};

// Define the backend story type (used with Convex)
export type ConvexStory = {
  _id: Id<"stories">;
  _creationTime: number;
  title: string;
  userStory: string;
  businessValue?: string;
  category: string;
  points: number;
  id: string;
  effortCategory?: string;
  notes?: string;
  acceptanceCriteria?: string[];  // Array of acceptance criteria strings
  isPublic: boolean;
  sharedWithClients: string[];
  originalPoints?: number;
  adjustmentReason?: string;
  businessValueMismatch?: string;
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
  onAssignAllToDefaultCells?: (stories: Story[]) => void;
  onClearBacklog?: () => void; // Function to clear the backlog
};
