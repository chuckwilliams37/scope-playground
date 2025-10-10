#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { StorySchema, Story, ReconciliationPlan, StoryUpdate, POLICIES } from './types';
import { normalizeStory } from './normalize';
import { matchStories, findStoryByTitle } from './fuzzy';
import { parseReport } from './parseReport';
import { mergeStories } from './merge';
import { z } from 'zod';

// Load environment
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * CLI arguments
 */
interface Args {
  json: string;
  report: string;
  titleSim?: number;
  userStorySim?: number;
  apply?: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    json: '',
    report: '',
    apply: process.env.APPLY === 'true',
  };

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--json') args.json = process.argv[++i];
    if (process.argv[i] === '--report') args.report = process.argv[++i];
    if (process.argv[i] === '--titleSim') args.titleSim = parseFloat(process.argv[++i]);
    if (process.argv[i] === '--userStorySim') args.userStorySim = parseFloat(process.argv[++i]);
  }

  if (!args.json || !args.report) {
    console.error('Usage: pnpm delta:dry --json <path> --report <path>');
    process.exit(1);
  }

  return args;
}

/**
 * Load and normalize JSON stories
 */
function loadJsonStories(filePath: string): Story[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle consolidated format
  const storiesArray = data.stories && Array.isArray(data.stories) ? data.stories : data;

  // Validate and normalize
  const stories: Story[] = [];
  for (const item of storiesArray) {
    try {
      const story = StorySchema.parse(item);
      const normalized = normalizeStory(story);
      
      // Set metadata
      normalized._meta = {
        source: 'json',
        updatedAt: normalized._meta?.updatedAt || new Date().toISOString(),
      };
      
      stories.push(normalized);
    } catch (error) {
      console.warn(`⚠️  Skipping invalid story: ${item.title || 'unknown'}`, error);
    }
  }

  return stories;
}

/**
 * Fetch ClickUp stories via MCP
 */
async function fetchClickUpStories(listId: string): Promise<Story[]> {
  console.log(`📡 Fetching ClickUp list ${listId}...`);
  
  const { fetchClickUpList } = await import('./clickup-mcp');
  const stories = await fetchClickUpList(listId);
  
  return stories;
}

/**
 * Generate batch ID
 */
function generateBatchId(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const hash = Math.random().toString(36).substring(2, 6);
  return `${date}-${time}-${hash}`;
}

/**
 * Build reconciliation plan
 */
function buildPlan(
  jsonStories: Story[],
  clickupStories: Story[],
  parsedReport: ReturnType<typeof parseReport>
): ReconciliationPlan {
  console.log('\n🔍 Matching stories...');
  const matches = matchStories(jsonStories, clickupStories);

  const createInClickUp: Story[] = [];
  const updateClickUp: StoryUpdate[] = [];
  const updateJSON: Story[] = [];
  const tagOrphans: Array<{ taskId: string; title: string }> = [];
  const ambiguities: Array<{ reason: string; stories: string[] }> = [];

  // Process matches
  for (const match of matches) {
    if (match.ambiguous) {
      ambiguities.push({
        reason: 'Multiple similar candidates found',
        stories: [match.jsonStory?.title || '', match.clickupStory?.title || ''].filter(Boolean),
      });
    }

    if (match.matchType === 'unmatched') {
      if (match.jsonStory && !match.clickupStory) {
        // Check if this story is in the "missing" list from report
        const shouldCreate = parsedReport.missingInClickUp.some(
          title => findStoryByTitle(title, [match.jsonStory!], 0.6)
        );
        
        if (shouldCreate) {
          createInClickUp.push(match.jsonStory);
        }
      } else if (match.clickupStory && !match.jsonStory) {
        // Orphan in ClickUp
        const isOrphan = parsedReport.orphansInClickUp.some(
          title => findStoryByTitle(title, [match.clickupStory!], 0.6)
        );
        
        if (isOrphan && !match.clickupStory.title.startsWith(POLICIES.orphans.prefix)) {
          tagOrphans.push({
            taskId: match.clickupStory.id || '',
            title: match.clickupStory.title,
          });
        }
      }
    } else if (match.jsonStory && match.clickupStory) {
      // Merge matched stories
      const { merged, changes } = mergeStories(match, parsedReport.fieldDirectives);
      
      if (changes.length > 0) {
        // Update ClickUp
        updateClickUp.push({
          externalId: match.clickupStory.id || match.clickupStory.title,
          title: match.clickupStory.title,
          clickupTaskId: match.clickupStory.id,
          changes,
        });
        
        // Update JSON
        updateJSON.push(merged);
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    createInClickUp,
    updateClickUp,
    updateJSON,
    tagOrphans,
    ambiguities,
    counts: {
      create: createInClickUp.length,
      update: updateClickUp.length,
      tagOrphans: tagOrphans.length,
      ambiguities: ambiguities.length,
    },
  };
}

/**
 * Apply the reconciliation plan
 */
async function applyPlan(
  plan: ReconciliationPlan,
  jsonPath: string,
  listId: string,
  clickupStories: Story[]
): Promise<void> {
  const batchId = plan.batchId!;
  
  // Import MCP functions
  const {
    createClickUpTask,
    updateClickUpTask,
    tagAsOrphan,
    addTaskComment,
    generateChangeSummary,
  } = await import('./clickup-mcp');
  
  // Create backup directory
  const backupDir = path.join(process.cwd(), 'backups', batchId);
  fs.mkdirSync(backupDir, { recursive: true });
  
  console.log(`\n📁 Creating backups in ${backupDir}/`);
  
  // Backup ClickUp export
  const clickupExportPath = path.join(backupDir, 'clickup-export.json');
  fs.writeFileSync(clickupExportPath, JSON.stringify(clickupStories, null, 2), 'utf-8');
  console.log(`  ✓ ClickUp export saved`);
  
  // Backup input JSON
  const inputJsonPath = path.join(backupDir, 'stories.json');
  fs.copyFileSync(jsonPath, inputJsonPath);
  console.log(`  ✓ Input JSON backed up`);
  
  // Initialize ledger
  const ledger: any[] = [];
  const ledgerPath = path.join(backupDir, 'ledger.json');
  
  // Apply creates
  if (plan.createInClickUp.length > 0) {
    console.log(`\n🆕 Creating ${plan.createInClickUp.length} tasks in ClickUp...`);
    
    for (const story of plan.createInClickUp) {
      try {
        const { taskId, url } = await createClickUpTask(listId, story, batchId);
        console.log(`  ✓ Created: ${story.title}`);
        console.log(`    ${url}`);
        
        // Add to ledger
        ledger.push({
          taskId,
          externalId: story.id || story.title,
          operation: 'create',
          titleBefore: '',
          titleAfter: story.title,
          fields: [
            { field: 'points', before: null, after: story.points },
            { field: 'businessValue', before: null, after: story.businessValue },
            { field: 'status', before: null, after: story.status },
          ],
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`  ❌ Failed to create ${story.title}:`, error);
      }
    }
  }
  
  // Apply updates
  if (plan.updateClickUp.length > 0) {
    console.log(`\n🔄 Updating ${plan.updateClickUp.length} tasks in ClickUp...`);
    
    for (const update of plan.updateClickUp) {
      try {
        if (!update.clickupTaskId) {
          console.warn(`  ⚠️  Skipping ${update.title}: no task ID`);
          continue;
        }
        
        await updateClickUpTask(update.clickupTaskId, update.changes, batchId, listId);
        console.log(`  ✓ Updated: ${update.title}`);
        
        // Add comment
        const summary = generateChangeSummary(update.changes, batchId);
        await addTaskComment(update.clickupTaskId, summary);
        
        // Add to ledger
        ledger.push({
          taskId: update.clickupTaskId,
          externalId: update.externalId,
          operation: 'update',
          titleBefore: update.title,
          titleAfter: update.title,
          fields: update.changes.map(c => ({
            field: c.field,
            before: c.before,
            after: c.after,
          })),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`  ❌ Failed to update ${update.title}:`, error);
      }
    }
  }
  
  // Tag orphans
  if (plan.tagOrphans.length > 0) {
    console.log(`\n🏷️  Tagging ${plan.tagOrphans.length} orphans...`);
    
    for (const orphan of plan.tagOrphans) {
      try {
        await tagAsOrphan(orphan.taskId, orphan.title, batchId);
        console.log(`  ✓ Tagged: ${orphan.title}`);
        
        // Add to ledger
        ledger.push({
          taskId: orphan.taskId,
          externalId: orphan.taskId,
          operation: 'tag_orphan',
          titleBefore: orphan.title,
          titleAfter: `(ORPHAN) ${orphan.title}`,
          fields: [],
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`  ❌ Failed to tag ${orphan.title}:`, error);
      }
    }
  }
  
  // Write merged JSON back
  if (plan.updateJSON.length > 0) {
    console.log(`\n💾 Writing merged JSON...`);
    
    // Load original JSON structure
    const originalContent = fs.readFileSync(jsonPath, 'utf-8');
    const originalData = JSON.parse(originalContent);
    
    // Update stories
    if (originalData.stories && Array.isArray(originalData.stories)) {
      // Consolidated format
      originalData.stories = plan.updateJSON;
    } else {
      // Array format
      // Write the merged stories
      fs.writeFileSync(jsonPath, JSON.stringify(plan.updateJSON, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ Updated ${jsonPath}`);
    }
    
    if (originalData.stories) {
      fs.writeFileSync(jsonPath, JSON.stringify(originalData, null, 2) + '\n', 'utf-8');
      console.log(`  ✓ Updated ${jsonPath}`);
    }
  }
  
  // Save ledger
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf-8');
  console.log(`\n📋 Ledger saved: ${ledgerPath}`);
  
  console.log(`\n✅ Apply complete!`);
  console.log(`   Created: ${plan.counts.create}`);
  console.log(`   Updated: ${plan.counts.update}`);
  console.log(`   Tagged: ${plan.counts.tagOrphans}`);
  console.log(`   Batch ID: ${batchId}`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(plan: ReconciliationPlan): string {
  const lines: string[] = [];

  lines.push('# Reconciliation Plan');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`**Batch ID:** ${plan.batchId || 'DRY-RUN'}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Create in ClickUp:** ${plan.counts.create}`);
  lines.push(`- **Update ClickUp:** ${plan.counts.update}`);
  lines.push(`- **Update JSON:** ${plan.updateJSON.length}`);
  lines.push(`- **Tag Orphans:** ${plan.counts.tagOrphans}`);
  lines.push(`- **Ambiguities:** ${plan.counts.ambiguities}`);
  lines.push('');

  // Create section
  if (plan.createInClickUp.length > 0) {
    lines.push(`## Create in ClickUp (${plan.createInClickUp.length})`);
    lines.push('');
    for (const story of plan.createInClickUp) {
      lines.push(`### ${story.title}`);
      lines.push(`- **Points:** ${story.points}`);
      lines.push(`- **Business Value:** ${story.businessValue}`);
      lines.push(`- **Status:** ${story.status}`);
      lines.push('');
    }
  }

  // Update section
  if (plan.updateClickUp.length > 0) {
    lines.push(`## Update ClickUp (${plan.updateClickUp.length})`);
    lines.push('');
    for (const update of plan.updateClickUp) {
      lines.push(`### ${update.title}`);
      lines.push('');
      for (const change of update.changes) {
        const icon = change.source === 'json' ? '📝' : change.source === 'clickup' ? '🔵' : '⚠️';
        lines.push(`${icon} **${change.field}**`);
        lines.push(`  - Before: ${JSON.stringify(change.before)}`);
        lines.push(`  - After: ${JSON.stringify(change.after)}`);
        lines.push(`  - Source: ${change.source}`);
        if (change.directive) {
          lines.push(`  - Directive: ${change.directive}`);
        }
        lines.push('');
      }
    }
  }

  // Orphans
  if (plan.tagOrphans.length > 0) {
    lines.push(`## Tag Orphans (${plan.tagOrphans.length})`);
    lines.push('');
    lines.push('These tasks will be prefixed with "(ORPHAN) ":');
    lines.push('');
    for (const orphan of plan.tagOrphans) {
      lines.push(`- ${orphan.title}`);
    }
    lines.push('');
  }

  // Ambiguities
  if (plan.ambiguities.length > 0) {
    lines.push(`## Ambiguities (${plan.ambiguities.length})`);
    lines.push('');
    lines.push('⚠️ **Manual review required:**');
    lines.push('');
    for (const amb of plan.ambiguities) {
      lines.push(`- ${amb.reason}`);
      lines.push(`  - Stories: ${amb.stories.join(', ')}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();

  console.log('🔄 Resolve Delta - Reconciliation Tool\n');
  console.log(`Mode: ${args.apply ? '🚀 APPLY' : '🔍 DRY-RUN'}`);
  console.log(`JSON: ${args.json}`);
  console.log(`Report: ${args.report}`);
  console.log('');

  // Override thresholds if provided
  if (args.titleSim) POLICIES.fuzzyThresholds.title = args.titleSim;
  if (args.userStorySim) POLICIES.fuzzyThresholds.userStory = args.userStorySim;

  // Load data
  console.log('📂 Loading data...');
  const jsonStories = loadJsonStories(args.json);
  console.log(`✓ Loaded ${jsonStories.length} stories from JSON`);

  const parsedReport = parseReport(args.report);
  console.log(`✓ Parsed report: ${parsedReport.missingInClickUp.length} missing, ${parsedReport.orphansInClickUp.length} orphans, ${parsedReport.fieldDirectives.length} directives`);

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) {
    console.error('❌ CLICKUP_LIST_ID not set in environment');
    process.exit(1);
  }

  const clickupStories = await fetchClickUpStories(listId);
  console.log(`✓ Fetched ${clickupStories.length} stories from ClickUp`);

  // Build plan
  const plan = buildPlan(jsonStories, clickupStories, parsedReport);

  if (args.apply) {
    plan.batchId = generateBatchId();
    console.log(`\n📦 Batch ID: ${plan.batchId}`);
    
    await applyPlan(plan, args.json, listId, clickupStories);
  }

  // Write outputs
  const outDir = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const planPath = path.join(outDir, 'resolve-delta-plan.json');
  const reportPath = path.join(outDir, 'resolve-delta-report.md');

  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');
  fs.writeFileSync(reportPath, generateMarkdownReport(plan), 'utf-8');

  console.log(`\n✅ Plan generated:`);
  console.log(`   ${planPath}`);
  console.log(`   ${reportPath}`);

  if (!args.apply) {
    console.log(`\n📋 Next steps:`);
    console.log(`   Review the plan, then run:`);
    console.log(`   APPLY=true pnpm delta:dry --json ${args.json} --report ${args.report}`);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
