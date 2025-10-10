#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { BatchAudit, LedgerEntry, RevertResult } from './types';

/**
 * CLI arguments
 */
interface Args {
  batch: string;
  scope: string; // 'all' | 'task:<id>' | 'external:<id>'
  dry?: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    batch: '',
    scope: 'all',
    dry: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--batch') args.batch = process.argv[++i];
    if (process.argv[i] === '--scope') args.scope = process.argv[++i];
    if (process.argv[i] === '--dry') args.dry = true;
  }

  if (!args.batch) {
    console.error('Usage: pnpm delta:revert --batch <BATCH_ID> [--scope all|task:<id>|external:<id>] [--dry]');
    process.exit(1);
  }

  return args;
}

/**
 * Load ledger for a batch
 */
function loadLedger(batchId: string): LedgerEntry[] {
  const ledgerPath = path.join(process.cwd(), 'backups', batchId, 'ledger.json');
  
  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`Ledger not found for batch ${batchId}: ${ledgerPath}`);
  }

  const content = fs.readFileSync(ledgerPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Revert a batch of changes
 */
async function revertBatch(args: Args): Promise<RevertResult> {
  console.log(`🔄 Revert Tool - Batch ${args.batch}\n`);
  console.log(`Mode: ${args.dry ? '🔍 DRY-RUN' : '🚀 APPLY'}`);
  console.log(`Scope: ${args.scope}\n`);

  // Load ledger
  console.log('📂 Loading ledger...');
  const ledger = loadLedger(args.batch);
  console.log(`✓ Found ${ledger.length} entries`);

  // Filter by scope
  let entriesToRevert = ledger;
  if (args.scope !== 'all') {
    if (args.scope.startsWith('task:')) {
      const taskId = args.scope.substring(5);
      entriesToRevert = ledger.filter(e => e.taskId === taskId);
    } else if (args.scope.startsWith('external:')) {
      const externalId = args.scope.substring(9);
      entriesToRevert = ledger.filter(e => e.externalId === externalId);
    }
  }

  console.log(`\n📋 ${entriesToRevert.length} entries to revert`);

  const result: RevertResult = {
    batchId: args.batch,
    reverted: 0,
    skipped: 0,
    errors: [],
  };

  // Import MCP functions
  const {
    getTaskById,
    updateClickUpTask,
    removeOrphanTag,
    addTaskComment,
  } = await import('./clickup-mcp');

  // Process each entry
  for (const entry of entriesToRevert) {
    console.log(`\n  Processing: ${entry.titleBefore}`);
    
    if (args.dry) {
      console.log(`    [DRY-RUN] Would revert ${entry.operation}`);
      result.reverted++;
      continue;
    }

    try {
      // Get current task state
      const currentTask = await getTaskById(entry.taskId);
      
      // Check for conflicts (task modified since batch)
      if (entry.clickupDateUpdatedBefore && currentTask.date_updated) {
        const batchDate = new Date(entry.clickupDateUpdatedBefore);
        const currentDate = new Date(currentTask.date_updated);
        
        if (currentDate > batchDate) {
          console.log(`    ⚠️  SKIPPED: Task modified since batch (conflict)`);
          result.skipped++;
          continue;
        }
      }
      
      switch (entry.operation) {
        case 'create':
          // Archive task (update status to closed/archived)
          await updateClickUpTask(entry.taskId, [
            { field: 'status', after: 'closed' }
          ], args.batch);
          await addTaskComment(
            entry.taskId,
            `🗃️ Archived on revert of batch ${args.batch}. This task was created by the batch and is being removed.`
          );
          console.log(`    ✓ Archived task`);
          result.reverted++;
          break;
          
        case 'update':
          // Revert fields to before values
          const revertChanges = entry.fields.map(f => ({
            field: f.field,
            after: f.before,
          }));
          await updateClickUpTask(entry.taskId, revertChanges, args.batch);
          await addTaskComment(
            entry.taskId,
            `↩️ Reverted ${entry.fields.length} field(s) from batch ${args.batch}.`
          );
          console.log(`    ✓ Reverted ${entry.fields.length} fields`);
          result.reverted++;
          break;
          
        case 'tag_orphan':
          // Remove orphan prefix
          await removeOrphanTag(entry.taskId, entry.titleAfter, args.batch);
          console.log(`    ✓ Removed orphan tag`);
          result.reverted++;
          break;
      }
    } catch (error) {
      console.error(`    ❌ Error: ${(error as Error).message}`);
      result.errors.push({
        taskId: entry.taskId,
        error: (error as Error).message,
      });
    }
  }

  // Write revert report
  const reportPath = path.join(process.cwd(), 'backups', args.batch, 'revert-report.md');
  const reportContent = generateRevertReport(result, entriesToRevert);
  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  console.log(`\n✅ Revert report: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Reverted: ${result.reverted}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Errors: ${result.errors.length}`);

  return result;
}

/**
 * Generate revert report
 */
function generateRevertReport(result: RevertResult, entries: LedgerEntry[]): string {
  const lines: string[] = [];

  lines.push(`# Revert Report - Batch ${result.batchId}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Reverted:** ${result.reverted}`);
  lines.push(`- **Skipped:** ${result.skipped}`);
  lines.push(`- **Errors:** ${result.errors.length}`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`- **Task ${error.taskId}:** ${error.error}`);
    }
    lines.push('');
  }

  lines.push('## Reverted Entries');
  lines.push('');
  for (const entry of entries) {
    lines.push(`### ${entry.titleBefore}`);
    lines.push(`- **Operation:** ${entry.operation}`);
    lines.push(`- **Task ID:** ${entry.taskId}`);
    lines.push(`- **External ID:** ${entry.externalId}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs();
  await revertBatch(args);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
