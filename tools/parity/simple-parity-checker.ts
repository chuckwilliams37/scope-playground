#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ClickUpClient } from './clickup-client';
import { loadStoriesFromJson } from './sync-operations';
import { Story, ClickUpTask } from './schema';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

interface SimpleDiff {
  storyId: string;
  field: 'points' | 'description' | 'acceptance_criteria' | 'missing' | 'orphan';
  jsonValue?: any;
  clickupValue?: any;
  recommendation: 'use_json' | 'use_clickup' | 'create' | 'review';
  reason: string;
}

interface SimpleReport {
  summary: {
    totalInJson: number;
    totalInClickUp: number;
    perfectMatches: number;
    differences: number;
  };
  diffs: SimpleDiff[];
}

/**
 * Simple parity checker - matches by title (no External ID required)
 */
class SimpleParityChecker {
  private normalizeTitle(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Calculate similarity score between two strings (0-1, higher is more similar)
   * Uses Levenshtein-like approach with word matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeTitle(str1);
    const norm2 = this.normalizeTitle(str2);

    // Exact match
    if (norm1 === norm2) return 1.0;

    // Split into words
    const words1 = norm1.split(' ').filter(w => w.length > 2); // Ignore short words
    const words2 = norm2.split(' ').filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Count matching words
    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }

    // Similarity is ratio of matching words to total unique words
    const totalWords = Math.max(words1.length, words2.length);
    return matches / totalWords;
  }

  /**
   * Find similar tasks in ClickUp that might be duplicates
   */
  private findSimilarTasks(title: string, clickupTasks: ClickUpTask[], threshold = 0.6): ClickUpTask[] {
    const similar: Array<{ task: ClickUpTask; score: number }> = [];

    for (const task of clickupTasks) {
      const score = this.calculateSimilarity(title, task.name);
      if (score >= threshold) {
        similar.push({ task, score });
      }
    }

    // Sort by similarity score (highest first)
    similar.sort((a, b) => b.score - a.score);
    return similar.map(s => s.task);
  }

  private getPoints(task: ClickUpTask): number {
    // Sprint Points is a built-in ClickUp field, not a custom field
    // It's stored directly on the task object as 'points'
    if ((task as any).points != null) {
      return Number((task as any).points);
    }

    // Fallback: check time_estimate (in milliseconds) and convert to points
    // Assuming 1 point = 1 hour = 3600000 ms
    if ((task as any).time_estimate != null) {
      const hours = Number((task as any).time_estimate) / 3600000;
      return Math.round(hours);
    }

    // No points found
    return 0;
  }

  private getDescription(task: ClickUpTask): string {
    return (task as any).description || task.name || '';
  }

  private getAcceptanceCriteria(task: ClickUpTask): string[] {
    const criteria: string[] = [];
    
    // Method 1: Get from subtasks
    const subtasks = (task as any).subtasks || [];
    for (const st of subtasks) {
      if (st.name && st.name.trim().length > 0) {
        criteria.push(st.name.trim());
      }
    }
    
    // Method 2: Also check checklists as fallback (some might be there)
    const checklists = task.checklists || [];
    for (const checklist of checklists) {
      // Look for acceptance criteria checklist
      if (checklist.name.toLowerCase().includes('acceptance') || 
          checklist.name.toLowerCase().includes('criteria') ||
          checklist.name.toLowerCase().includes('ac')) {
        for (const item of checklist.items || []) {
          if (item.name && item.name.trim().length > 0) {
            criteria.push(item.name.trim());
          }
        }
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(criteria));
  }

  /**
   * Determine which version is more complete/complex
   */
  private compareComplexity(jsonValue: any, clickupValue: any): 'json' | 'clickup' | 'equal' {
    // For strings, longer and more detailed wins
    if (typeof jsonValue === 'string' && typeof clickupValue === 'string') {
      const jsonLen = jsonValue.trim().length;
      const clickupLen = clickupValue.trim().length;
      
      if (jsonLen > clickupLen * 1.2) return 'json'; // JSON is significantly longer
      if (clickupLen > jsonLen * 1.2) return 'clickup'; // ClickUp is significantly longer
      return 'equal';
    }

    // For arrays, more items wins
    if (Array.isArray(jsonValue) && Array.isArray(clickupValue)) {
      if (jsonValue.length > clickupValue.length) return 'json';
      if (clickupValue.length > jsonValue.length) return 'clickup';
      return 'equal';
    }

    // For numbers, non-zero wins
    if (typeof jsonValue === 'number' && typeof clickupValue === 'number') {
      if (jsonValue > 0 && clickupValue === 0) return 'json';
      if (clickupValue > 0 && jsonValue === 0) return 'clickup';
      if (jsonValue !== clickupValue) return 'json'; // Default to JSON if different
      return 'equal';
    }

    return 'equal';
  }

  checkParity(jsonStories: Story[], clickupTasks: ClickUpTask[]): SimpleReport {
    const diffs: SimpleDiff[] = [];
    let perfectMatches = 0;

    // Build map by normalized title
    const jsonMap = new Map<string, Story>();
    for (const story of jsonStories) {
      jsonMap.set(this.normalizeTitle(story.title), story);
    }

    const clickupMap = new Map<string, ClickUpTask>();
    for (const task of clickupTasks) {
      clickupMap.set(this.normalizeTitle(task.name), task);
    }

    // Check each JSON story
    for (const story of jsonStories) {
      const normalizedTitle = this.normalizeTitle(story.title);
      let task = clickupMap.get(normalizedTitle);

      // If no exact match, try fuzzy matching to find similar tasks
      if (!task) {
        const similarTasks = this.findSimilarTasks(story.title, clickupTasks, 0.6);
        
        if (similarTasks.length > 0) {
          // Found similar task(s) - don't recommend creation
          console.log(`  ℹ️  Story "${story.title}" has similar task(s) in ClickUp: "${similarTasks[0].name}"`);
          // Use the most similar task for comparison
          task = similarTasks[0];
        } else {
          // No similar tasks found - recommend creation
          diffs.push({
            storyId: story.id || story.title,
            field: 'missing',
            jsonValue: story.title,
            recommendation: 'create',
            reason: 'Story exists in JSON but not in ClickUp',
          });
          continue;
        }
      }

      let storyHasDiffs = false;

      // Compare points
      const clickupPoints = this.getPoints(task);
      if (story.points !== clickupPoints) {
        const winner = this.compareComplexity(story.points, clickupPoints);
        diffs.push({
          storyId: story.id || story.title,
          field: 'points',
          jsonValue: story.points,
          clickupValue: clickupPoints,
          recommendation: winner === 'json' ? 'use_json' : winner === 'clickup' ? 'use_clickup' : 'review',
          reason: `Points differ: JSON=${story.points}, ClickUp=${clickupPoints}`,
        });
        storyHasDiffs = true;
      }

      // Compare description
      const clickupDesc = this.getDescription(task);
      const jsonDesc = story.userStory || '';
      
      if (this.normalizeText(jsonDesc) !== this.normalizeText(clickupDesc)) {
        const winner = this.compareComplexity(jsonDesc, clickupDesc);
        diffs.push({
          storyId: story.id || story.title,
          field: 'description',
          jsonValue: jsonDesc.substring(0, 100) + (jsonDesc.length > 100 ? '...' : ''),
          clickupValue: clickupDesc.substring(0, 100) + (clickupDesc.length > 100 ? '...' : ''),
          recommendation: winner === 'json' ? 'use_json' : winner === 'clickup' ? 'use_clickup' : 'review',
          reason: `Description differs (JSON: ${jsonDesc.length} chars, ClickUp: ${clickupDesc.length} chars)`,
        });
        storyHasDiffs = true;
      }

      // Compare acceptance criteria
      const clickupCriteria = this.getAcceptanceCriteria(task);
      const jsonCriteria = story.acceptanceCriteria || [];

      if (jsonCriteria.length !== clickupCriteria.length ||
          !jsonCriteria.every((c, i) => this.normalizeText(c) === this.normalizeText(clickupCriteria[i] || ''))) {
        const winner = this.compareComplexity(jsonCriteria, clickupCriteria);
        diffs.push({
          storyId: story.id || story.title,
          field: 'acceptance_criteria',
          jsonValue: `${jsonCriteria.length} criteria`,
          clickupValue: `${clickupCriteria.length} criteria`,
          recommendation: winner === 'json' ? 'use_json' : winner === 'clickup' ? 'use_clickup' : 'review',
          reason: `Acceptance criteria count differs: JSON=${jsonCriteria.length}, ClickUp=${clickupCriteria.length}`,
        });
        storyHasDiffs = true;
      }

      if (!storyHasDiffs) {
        perfectMatches++;
      }
    }

    // Check for orphans in ClickUp (but use fuzzy matching to avoid false positives)
    for (const task of clickupTasks) {
      const normalizedTitle = this.normalizeTitle(task.name);
      
      if (!jsonMap.has(normalizedTitle)) {
        // Check if there's a similar story in JSON
        const similarStories = jsonStories.filter(story => 
          this.calculateSimilarity(task.name, story.title) >= 0.6
        );
        
        if (similarStories.length === 0) {
          // No similar stories found - this is truly an orphan
          diffs.push({
            storyId: task.id,
            field: 'orphan',
            clickupValue: task.name,
            recommendation: 'review',
            reason: 'Task exists in ClickUp but not in JSON',
          });
        }
      }
    }

    return {
      summary: {
        totalInJson: jsonStories.length,
        totalInClickUp: clickupTasks.length,
        perfectMatches,
        differences: diffs.length,
      },
      diffs,
    };
  }
}

/**
 * Generate readable report
 */
function generateReport(report: SimpleReport): string {
  const lines: string[] = [];

  lines.push('# Simple Parity Report: JSON ↔ ClickUp');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('**Comparing:**');
  lines.push('- Sprint Points (built-in ClickUp field)');
  lines.push('- Description/User Story text');
  lines.push('- Acceptance Criteria (from subtasks or checklists)');
  lines.push('');
  lines.push('**Goal:** Ensure JSON is 100% represented in ClickUp, with most detailed version winning.');
  lines.push('');
  lines.push('**Note:** Fuzzy matching (60% similarity threshold) is used to detect similar tasks and avoid duplicate creation recommendations.');
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Stories in JSON:** ${report.summary.totalInJson}`);
  lines.push(`- **Tasks in ClickUp:** ${report.summary.totalInClickUp}`);
  lines.push(`- **Perfect Matches:** ${report.summary.perfectMatches}`);
  lines.push(`- **Differences Found:** ${report.summary.differences}`);
  lines.push('');

  if (report.summary.differences === 0) {
    lines.push('✅ **Perfect parity!** All stories match.');
    return lines.join('\n');
  }

  // Group diffs by type
  const missing = report.diffs.filter((d) => d.field === 'missing');
  const orphans = report.diffs.filter((d) => d.field === 'orphan');
  const fieldDiffs = report.diffs.filter((d) => d.field !== 'missing' && d.field !== 'orphan');

  if (missing.length > 0) {
    lines.push(`## Missing in ClickUp (${missing.length})`);
    lines.push('');
    lines.push('**Recommendation:** Create these tasks in ClickUp');
    lines.push('');
    for (const diff of missing) {
      lines.push(`- **${diff.storyId}**`);
    }
    lines.push('');
  }

  if (orphans.length > 0) {
    lines.push(`## Orphans in ClickUp (${orphans.length})`);
    lines.push('');
    lines.push('**Recommendation:** Add these to JSON or archive in ClickUp');
    lines.push('');
    for (const diff of orphans) {
      lines.push(`- **${diff.clickupValue}**`);
    }
    lines.push('');
  }

  if (fieldDiffs.length > 0) {
    lines.push(`## Field Differences (${fieldDiffs.length})`);
    lines.push('');

    // Group by story
    const byStory = new Map<string, SimpleDiff[]>();
    for (const diff of fieldDiffs) {
      const existing = byStory.get(diff.storyId) || [];
      existing.push(diff);
      byStory.set(diff.storyId, existing);
    }

    for (const [storyId, diffs] of Array.from(byStory.entries())) {
      lines.push(`### ${storyId}`);
      lines.push('');
      for (const diff of diffs) {
        const icon = diff.recommendation === 'use_json' ? '📝' : diff.recommendation === 'use_clickup' ? '🔵' : '⚠️';
        lines.push(`${icon} **${diff.field}** - ${diff.reason}`);
        lines.push(`  - JSON: ${JSON.stringify(diff.jsonValue)}`);
        lines.push(`  - ClickUp: ${JSON.stringify(diff.clickupValue)}`);
        lines.push(`  - **Recommendation:** ${diff.recommendation.replace(/_/g, ' ').toUpperCase()}`);
        lines.push('');
      }
    }
  }

  // Legend
  lines.push('## Legend');
  lines.push('');
  lines.push('- 📝 **USE_JSON** - JSON version is more complete/detailed');
  lines.push('- 🔵 **USE_CLICKUP** - ClickUp version is more complete/detailed');
  lines.push('- ⚠️ **REVIEW** - Manual review needed to determine which is better');
  lines.push('');

  return lines.join('\n');
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let jsonPath = '';
  let listId = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') jsonPath = args[++i];
    if (args[i] === '--list') listId = args[++i];
  }

  if (!jsonPath) {
    console.error('Usage: pnpm simple-parity --json <file> --list <list-id>');
    process.exit(1);
  }

  const apiToken = process.env.CLICKUP_API_TOKEN;
  listId = listId || process.env.CLICKUP_LIST_ID || '';

  if (!apiToken || !listId) {
    console.error('❌ Missing CLICKUP_API_TOKEN or CLICKUP_LIST_ID');
    process.exit(1);
  }

  console.log('🔍 Simple Parity Checker\n');
  console.log(`JSON file: ${jsonPath}`);
  console.log(`ClickUp list: ${listId}`);
  console.log('');
  console.log('Comparing:');
  console.log('  • Sprint Points (built-in ClickUp field)');
  console.log('  • Description/User Story text');
  console.log('  • Acceptance Criteria (subtasks or checklists)');
  console.log('');
  console.log('Goal: Ensure JSON is 100% in ClickUp, most detailed wins\n');

  try {
    // Load JSON stories
    let stories;
    try {
      stories = loadStoriesFromJson(jsonPath);
    } catch (error) {
      console.error('❌ Failed to load JSON file:', (error as Error).message);
      console.error('\nThe JSON file should be in one of these formats:');
      console.error('1. Array: [{ "id": "...", "title": "...", ... }]');
      console.error('2. Consolidated: { "stories": [{ "id": "...", ... }] }');
      process.exit(1);
    }
    console.log(`✓ Loaded ${stories.length} stories from JSON\n`);

    // Fetch ClickUp tasks (with subtasks included)
    const client = new ClickUpClient(apiToken);
    const allTasks = await client.getListTasks(listId, true);
    
    // Filter out subtasks - we only want parent tasks
    // Subtasks have a 'parent' property
    const tasks = allTasks.filter((task: any) => !task.parent);
    
    // Build a map of parent tasks with their subtasks
    const taskMap = new Map<string, any>();
    for (const task of tasks) {
      taskMap.set(task.id, { ...task, subtasks: [] });
    }
    
    // Assign subtasks to their parents
    for (const task of allTasks) {
      if ((task as any).parent) {
        const parentId = (task as any).parent;
        const parent = taskMap.get(parentId);
        if (parent) {
          parent.subtasks.push(task);
        }
      }
    }
    
    // Convert map back to array
    const tasksWithSubtasks = Array.from(taskMap.values());
    
    console.log(`✓ Fetched ${tasksWithSubtasks.length} tasks from ClickUp\n`);

    // Check parity (with fuzzy matching to avoid duplicate recommendations)
    console.log('🔎 Checking for similar tasks using fuzzy matching...\n');
    const checker = new SimpleParityChecker();
    const report = checker.checkParity(stories, tasksWithSubtasks);
    console.log('');

    // Generate reports
    const outputDir = path.join(process.cwd(), 'out');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const markdown = generateReport(report);
    fs.writeFileSync(path.join(outputDir, 'simple-parity-report.md'), markdown, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'simple-parity-report.json'), JSON.stringify(report, null, 2), 'utf-8');

    console.log('📊 Results:');
    console.log(`   Perfect Matches: ${report.summary.perfectMatches}`);
    console.log(`   Differences: ${report.summary.differences}`);
    console.log('');
    console.log('✓ Reports written to ./out/simple-parity-report.{md,json}');
    console.log('');

    if (report.summary.differences > 0) {
      console.log('⚠️  Differences found. Review ./out/simple-parity-report.md for details.');
      process.exit(1);
    } else {
      console.log('✅ Perfect parity!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
