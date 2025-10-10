import { z } from 'zod';

/**
 * Canonical Story schema - locked with Zod
 * This is the single source of truth for story structure
 */
export const StorySchema = z.object({
  id: z.string().optional(), // Optional - can use title as fallback
  title: z.string().min(1, 'Title is required'),
  category: z.string().optional(),
  userStory: z.string().min(1, 'User story is required'),
  points: z.number().int().nonnegative('Points must be a non-negative integer').optional().default(0), // Optional with default
  businessValue: z.enum(['Critical', 'Important', 'Nice to Have'], {
    errorMap: () => ({ message: 'Business value must be Critical, Important, or Nice to Have' }),
  }),
  status: z.string(), // Accept any status string
  acceptanceCriteria: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
  position: z.any().optional(), // Allow position field
  meta: z.any().optional(), // Allow meta field
}).passthrough(); // Allow additional fields

export type Story = z.infer<typeof StorySchema>;

/**
 * Schema for an array of stories
 */
export const StoriesArraySchema = z.array(StorySchema);

/**
 * Schema for the consolidated stories file format
 */
export const ConsolidatedStoriesSchema = z.object({
  modelVersion: z.string().optional(),
  lastUpdated: z.string().optional(),
  description: z.string().optional(),
  stories: z.array(StorySchema),
});

export type ConsolidatedStories = z.infer<typeof ConsolidatedStoriesSchema>;

/**
 * ClickUp Task representation (raw from API)
 */
export interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    type: string;
  };
  custom_fields: Array<{
    id: string;
    name: string;
    type: string;
    value?: any;
    type_config?: any;
  }>;
  tags: Array<{
    name: string;
    tag_fg?: string;
    tag_bg?: string;
  }>;
  checklists?: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      resolved: boolean;
    }>;
  }>;
}

/**
 * Custom field definitions from ClickUp
 */
export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: {
    options?: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
  };
}

/**
 * Parity diff types
 */
export type DiffType =
  | 'missing_in_clickup'
  | 'orphan_in_clickup'
  | 'title_mismatch'
  | 'points_mismatch'
  | 'business_value_mismatch'
  | 'status_mismatch'
  | 'acceptance_criteria_mismatch'
  | 'tags_mismatch';

export interface ParityDiff {
  storyId: string;
  type: DiffType;
  jsonValue?: any;
  clickupValue?: any;
  details?: string;
}

export interface ParityReport {
  timestamp: string;
  summary: {
    totalInJson: number;
    totalInClickUp: number;
    missingInClickUp: number;
    orphansInClickUp: number;
    fieldMismatches: number;
    totalDiffs: number;
  };
  diffs: ParityDiff[];
}
