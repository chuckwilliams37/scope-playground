#!/usr/bin/env node

import * as path from 'path';
import { loadConfig, resolveFieldIds, validateBusinessValueOptions } from './config';
import { ClickUpClient } from './clickup-client';
import { ParityChecker } from './parity-checker';
import { SyncOperations, loadStoriesFromJson } from './sync-operations';
import { writeReports } from './report-generator';

/**
 * Main CLI for JSON ↔ ClickUp parity checking and sync
 * 
 * Usage:
 *   pnpm parity --json ./data/stories.json --list $CLICKUP_LIST_ID [--mode check|pull|push]
 */

interface CLIArgs {
  json?: string;
  list?: string;
  mode: 'check' | 'pull' | 'push';
  writeFixes: boolean;
  forceDeleteOrphans: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    mode: 'check',
    writeFixes: false,
    forceDeleteOrphans: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const next = process.argv[i + 1];

    switch (arg) {
      case '--json':
        args.json = next;
        i++;
        break;
      case '--list':
        args.list = next;
        i++;
        break;
      case '--mode':
        if (next === 'check' || next === 'pull' || next === 'push') {
          args.mode = next;
        }
        i++;
        break;
      case '--write-fixes':
        args.writeFixes = next === 'true';
        i++;
        break;
      case '--force-delete-orphans':
        args.forceDeleteOrphans = true;
        break;
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage: pnpm parity [options]

Options:
  --json <path>              Path to JSON stories file (default: ./data/stories.json)
  --list <id>                ClickUp list ID (or use CLICKUP_LIST_ID env var)
  --mode <check|pull|push>   Operation mode (default: check)
  --write-fixes <bool>       Write fixes to files (default: false)
  --force-delete-orphans     Delete orphan tasks in ClickUp (use with caution)

Modes:
  check  - Compare JSON and ClickUp, generate parity report
  pull   - Export ClickUp tasks to JSON file
  push   - Create/update ClickUp tasks from JSON (idempotent)

Environment Variables:
  CLICKUP_API_TOKEN          Required: ClickUp API token
  CLICKUP_LIST_ID            Required: ClickUp list ID (or use --list)
  CLICKUP_CF_POINTS          Optional: Custom field ID for Points
  CLICKUP_CF_BUSINESS_VALUE  Optional: Custom field ID for Business Value
  CLICKUP_CF_EXTERNAL_ID     Optional: Custom field ID for External ID

Examples:
  pnpm parity:check
  pnpm parity:pull
  pnpm parity:push
  pnpm parity --mode check --json ./stories/all_stories_consolidated.json
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Show help if no mode specified
  if (process.argv.length === 2) {
    printUsage();
    process.exit(0);
  }

  console.log('🔍 ClickUp Parity Checker\n');

  // Load configuration
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error('❌ Configuration error:', (error as Error).message);
    console.error('\nMake sure you have set the following environment variables:');
    console.error('  - CLICKUP_API_TOKEN');
    console.error('  - CLICKUP_LIST_ID (or use --list argument)');
    process.exit(1);
  }

  // Override list ID from args
  if (args.list) {
    config.clickupListId = args.list;
  }

  // Set default JSON path
  const jsonPath = args.json || path.join(process.cwd(), 'data', 'stories.json');
  const outputDir = path.join(process.cwd(), 'out');

  console.log(`Mode: ${args.mode}`);
  console.log(`JSON file: ${jsonPath}`);
  console.log(`ClickUp list: ${config.clickupListId}`);
  console.log('');

  // Initialize ClickUp client
  const client = new ClickUpClient(config.clickupApiToken);

  try {
    // Fetch and resolve custom fields
    console.log('Fetching custom fields from ClickUp...');
    const customFields = await client.getCustomFields(config.clickupListId);
    console.log(`✓ Found ${customFields.length} custom fields`);

    const fieldIds = resolveFieldIds(customFields, config.customFieldIds);
    console.log('✓ Resolved field IDs:');
    console.log(`  - Points: ${fieldIds.points}`);
    console.log(`  - Business Value: ${fieldIds.businessValue}`);
    console.log(`  - External ID: ${fieldIds.externalId}`);
    console.log('');

    // Validate Business Value field
    validateBusinessValueOptions(customFields, fieldIds.businessValue);
    console.log('');

    // Execute based on mode
    if (args.mode === 'pull') {
      // PULL mode: Export from ClickUp to JSON
      const syncOps = new SyncOperations(client, fieldIds, config.clickupListId);
      const outputPath = path.join(outputDir, 'clickup-export.json');
      await syncOps.pull(outputPath);
      console.log('\n✅ Pull complete!');
    } else if (args.mode === 'push') {
      // PUSH mode: Push JSON to ClickUp
      console.log('Loading stories from JSON...');
      const stories = loadStoriesFromJson(jsonPath);
      console.log(`✓ Loaded ${stories.length} stories from JSON\n`);

      const syncOps = new SyncOperations(client, fieldIds, config.clickupListId);
      await syncOps.push(stories, { forceDeleteOrphans: args.forceDeleteOrphans });
    } else {
      // CHECK mode: Compare and report
      console.log('Loading stories from JSON...');
      const stories = loadStoriesFromJson(jsonPath);
      console.log(`✓ Loaded ${stories.length} stories from JSON\n`);

      console.log('Fetching tasks from ClickUp...');
      const tasks = await client.getListTasks(config.clickupListId);
      console.log(`✓ Fetched ${tasks.length} tasks from ClickUp\n`);

      console.log('Checking parity...');
      const checker = new ParityChecker(fieldIds);
      const report = checker.checkParity(stories, tasks);

      // Write reports
      writeReports(report, outputDir);
      console.log('');

      // Print summary
      console.log('📊 Parity Summary:');
      console.log(`   Total in JSON: ${report.summary.totalInJson}`);
      console.log(`   Total in ClickUp: ${report.summary.totalInClickUp}`);
      console.log(`   Missing in ClickUp: ${report.summary.missingInClickUp}`);
      console.log(`   Orphans in ClickUp: ${report.summary.orphansInClickUp}`);
      console.log(`   Field Mismatches: ${report.summary.fieldMismatches}`);
      console.log(`   Total Differences: ${report.summary.totalDiffs}`);
      console.log('');

      if (report.summary.totalDiffs === 0) {
        console.log('✅ Perfect parity! JSON and ClickUp are in sync.');
        process.exit(0);
      } else {
        console.log('⚠️  Differences found. See reports in ./out/ directory.');
        console.log('');
        console.log('Next steps:');
        if (report.summary.missingInClickUp > 0) {
          console.log('  - Run `pnpm parity:push` to create missing tasks in ClickUp');
        }
        if (report.summary.fieldMismatches > 0) {
          console.log('  - Run `pnpm parity:push` to update ClickUp with JSON values');
          console.log('  - Or run `pnpm parity:pull` to update JSON with ClickUp values');
        }
        if (report.summary.orphansInClickUp > 0) {
          console.log('  - Review orphan tasks manually in ClickUp');
        }
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    if ((error as Error).stack) {
      console.error('\nStack trace:');
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
