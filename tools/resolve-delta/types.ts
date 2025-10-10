import { z } from 'zod';

/**
 * Locked status set - normalize to these canonical values
 */
export const STATUS_SET = [
  'captured',
  'defined',
  'prioritized',
  'blocked',
  'in progress',
  'in review',
  'ready for deploy',
  'deployed',
  'closed',
  'complete',
] as const;

export type StatusValue = typeof STATUS_SET[number];

/**
 * Story schema with metadata
 */
export const StorySchema = z.object({
  id: z.string().optional(), // External ID
  title: z.string().min(1),
  userStory: z.string().min(1),
  category: z.string().optional(),
  points: z.number().int().nonnegative().default(0),
  businessValue: z.enum(['Critical', 'Important', 'Nice to Have']),
  status: z.string(),
  acceptanceCriteria: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
  _meta: z.object({
    source: z.enum(['json', 'clickup', 'merged']).optional(),
    updatedAt: z.string().optional(),
  }).optional(),
}).passthrough();

export type Story = z.infer<typeof StorySchema>;

/**
 * Report directive from parity report
 */
export type ReportDirective = {
  storyTitle: string;
  field: string;
  action: 'USE_JSON' | 'USE_CLICKUP' | 'REVIEW';
  jsonValue?: any;
  clickupValue?: any;
};

/**
 * Parsed report sections
 */
export type ParsedReport = {
  missingInClickUp: string[]; // titles to CREATE
  orphansInClickUp: string[]; // titles to mark as ORPHAN
  fieldDirectives: ReportDirective[]; // per-story field decisions
};

/**
 * Match result between JSON and ClickUp
 */
export type StoryMatch = {
  jsonStory?: Story;
  clickupStory?: Story;
  matchType: 'exact_id' | 'fuzzy_title' | 'fuzzy_story' | 'unmatched';
  similarityScore?: number;
  ambiguous?: boolean;
};

/**
 * Field change for a story
 */
export type FieldChange = {
  field: string;
  before: any;
  after: any;
  source: 'json' | 'clickup' | 'review_longer';
  directive?: 'USE_JSON' | 'USE_CLICKUP' | 'REVIEW';
};

/**
 * Update plan for a single story
 */
export type StoryUpdate = {
  externalId: string;
  title: string;
  clickupTaskId?: string;
  changes: FieldChange[];
};

/**
 * Reconciliation plan (dry-run output)
 */
export type ReconciliationPlan = {
  batchId?: string;
  timestamp: string;
  createInClickUp: Story[];
  updateClickUp: StoryUpdate[];
  updateJSON: Story[];
  tagOrphans: Array<{ taskId: string; title: string }>;
  ambiguities: Array<{ reason: string; stories: string[] }>;
  counts: {
    create: number;
    update: number;
    tagOrphans: number;
    ambiguities: number;
  };
};

/**
 * Ledger entry for audit trail
 */
export type LedgerEntry = {
  taskId: string;
  externalId: string;
  operation: 'create' | 'update' | 'tag_orphan';
  titleBefore: string;
  titleAfter: string;
  fields: Array<{ field: string; before: any; after: any }>;
  updatedAt: string;
  clickupDateUpdatedBefore?: string;
};

/**
 * Batch audit metadata
 */
export type BatchAudit = {
  batchId: string;
  timestamp: string;
  inputJsonPath: string;
  reportPath: string;
  ledger: LedgerEntry[];
  backupPaths: {
    clickupExport: string;
    clickupExportCsv: string;
    inputJson: string;
    ledger: string;
  };
};

/**
 * Revert result
 */
export type RevertResult = {
  batchId: string;
  reverted: number;
  skipped: number;
  errors: Array<{ taskId: string; error: string }>;
};

/**
 * Policy configuration
 */
export const POLICIES = {
  orphans: {
    keep: true,
    prefix: '(ORPHAN) ',
  },
  fuzzyThresholds: {
    title: 0.60,
    userStory: 0.60,
  },
  reviewDefault: 'prefer_longer_text' as const,
  pointsRule: 'prefer_clickup_if_json_zero' as const,
  businessValues: ['Critical', 'Important', 'Nice to Have'] as const,
  tags: {
    autoCreate: true,
    lowercase: true,
    sorted: true,
  },
  statusSet: STATUS_SET,
};
