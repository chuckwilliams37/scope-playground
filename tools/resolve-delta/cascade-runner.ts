/**
 * Cascade Runner - Execute resolve-delta with MCP access
 * 
 * This file is designed to be executed by Cascade, which has access to MCP tools.
 * It wraps the main run.ts logic and injects MCP functions into the global scope.
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Execute delta reconciliation with MCP access
 */
export async function runDeltaReconciliation(args: {
  json: string;
  report: string;
  apply?: boolean;
  titleSim?: number;
  userStorySim?: number;
}): Promise<void> {
  console.log('🚀 Cascade Delta Runner - MCP Enabled\n');
  
  // Verify MCP tools are available
  const mcpTools = [
    'mcp0_searchTasks',
    'mcp0_createTask',
    'mcp0_updateTask',
    'mcp0_addComment',
    'mcp0_getTaskById',
  ];
  
  const missingTools: string[] = [];
  for (const tool of mcpTools) {
    if (typeof (global as any)[tool] !== 'function') {
      missingTools.push(tool);
    }
  }
  
  if (missingTools.length > 0) {
    throw new Error(
      `MCP tools not available: ${missingTools.join(', ')}\n` +
      `This script must be run through Cascade with ClickUp MCP server enabled.`
    );
  }
  
  console.log('✓ MCP tools verified\n');
  
  // Set environment for run.ts
  process.argv = [
    'node',
    'run.ts',
    '--json', args.json,
    '--report', args.report,
  ];
  
  if (args.titleSim) {
    process.argv.push('--titleSim', args.titleSim.toString());
  }
  
  if (args.userStorySim) {
    process.argv.push('--userStorySim', args.userStorySim.toString());
  }
  
  if (args.apply) {
    process.env.APPLY = 'true';
  }
  
  // Import and run
  const runModule = await import('./run');
  
  console.log('\n✅ Execution complete');
}

/**
 * Quick helpers for common operations
 */
export async function dryRun(jsonPath: string, reportPath: string) {
  return runDeltaReconciliation({
    json: jsonPath,
    report: reportPath,
    apply: false,
  });
}

export async function apply(jsonPath: string, reportPath: string) {
  return runDeltaReconciliation({
    json: jsonPath,
    report: reportPath,
    apply: true,
  });
}

export async function revert(batchId: string, scope = 'all', dry = false) {
  console.log('🔄 Cascade Revert Runner - MCP Enabled\n');
  
  process.argv = [
    'node',
    'revert.ts',
    '--batch', batchId,
    '--scope', scope,
  ];
  
  if (dry) {
    process.argv.push('--dry');
  }
  
  const revertModule = await import('./revert');
  
  console.log('\n✅ Revert complete');
}
