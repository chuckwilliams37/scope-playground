import { ParityReport, ParityDiff } from './schema';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate human-readable Markdown report from parity check results
 */
export function generateMarkdownReport(report: ParityReport): string {
  const lines: string[] = [];

  lines.push('# Parity Report: JSON ↔ ClickUp');
  lines.push('');
  lines.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('');

  // Summary section
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Stories in JSON | ${report.summary.totalInJson} |`);
  lines.push(`| Total Tasks in ClickUp | ${report.summary.totalInClickUp} |`);
  lines.push(`| Missing in ClickUp | ${report.summary.missingInClickUp} |`);
  lines.push(`| Orphans in ClickUp | ${report.summary.orphansInClickUp} |`);
  lines.push(`| Field Mismatches | ${report.summary.fieldMismatches} |`);
  lines.push(`| **Total Differences** | **${report.summary.totalDiffs}** |`);
  lines.push('');

  if (report.summary.totalDiffs === 0) {
    lines.push('✅ **Perfect parity!** JSON and ClickUp are in sync.');
    lines.push('');
    return lines.join('\n');
  }

  // Missing in ClickUp
  const missingDiffs = report.diffs.filter((d) => d.type === 'missing_in_clickup');
  if (missingDiffs.length > 0) {
    lines.push('## Missing in ClickUp');
    lines.push('');
    lines.push('The following stories exist in JSON but not in ClickUp:');
    lines.push('');
    for (const diff of missingDiffs) {
      lines.push(`- **${diff.storyId}**: ${diff.jsonValue}`);
    }
    lines.push('');
  }

  // Orphans in ClickUp
  const orphanDiffs = report.diffs.filter((d) => d.type === 'orphan_in_clickup');
  if (orphanDiffs.length > 0) {
    lines.push('## Orphans in ClickUp');
    lines.push('');
    lines.push('The following tasks exist in ClickUp but not in JSON:');
    lines.push('');
    for (const diff of orphanDiffs) {
      lines.push(`- **${diff.storyId}**: ${diff.clickupValue}`);
    }
    lines.push('');
  }

  // Field mismatches
  const fieldDiffs = report.diffs.filter(
    (d) => d.type !== 'missing_in_clickup' && d.type !== 'orphan_in_clickup'
  );

  if (fieldDiffs.length > 0) {
    lines.push('## Field Mismatches');
    lines.push('');

    // Group by type
    const byType = new Map<string, ParityDiff[]>();
    for (const diff of fieldDiffs) {
      const existing = byType.get(diff.type) || [];
      existing.push(diff);
      byType.set(diff.type, existing);
    }

    for (const [type, diffs] of Array.from(byType.entries())) {
      const typeName = type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      lines.push(`### ${typeName} (${diffs.length})`);
      lines.push('');

      for (const diff of diffs) {
        lines.push(`- **${diff.storyId}**`);
        lines.push(`  - JSON: \`${JSON.stringify(diff.jsonValue)}\``);
        lines.push(`  - ClickUp: \`${JSON.stringify(diff.clickupValue)}\``);
        if (diff.details) {
          lines.push(`  - ${diff.details}`);
        }
      }
      lines.push('');
    }
  }

  // Suggested actions
  lines.push('## Suggested Actions');
  lines.push('');

  if (missingDiffs.length > 0) {
    lines.push(`- **Create ${missingDiffs.length} missing task(s) in ClickUp:**`);
    lines.push('  ```bash');
    lines.push('  pnpm parity:push');
    lines.push('  ```');
    lines.push('');
  }

  if (orphanDiffs.length > 0) {
    lines.push(`- **${orphanDiffs.length} orphan task(s) in ClickUp** - review manually or use \`--force-delete-orphans\``);
    lines.push('');
  }

  if (fieldDiffs.length > 0) {
    lines.push(`- **Fix ${fieldDiffs.length} field mismatch(es):**`);
    lines.push('  ```bash');
    lines.push('  pnpm parity:push  # Push JSON values to ClickUp');
    lines.push('  # OR');
    lines.push('  pnpm parity:pull  # Pull ClickUp values to JSON');
    lines.push('  ```');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Write reports to output directory
 */
export function writeReports(report: ParityReport, outputDir: string): void {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON report
  const jsonPath = path.join(outputDir, 'parity-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✓ Wrote JSON report to ${jsonPath}`);

  // Write Markdown report
  const markdown = generateMarkdownReport(report);
  const mdPath = path.join(outputDir, 'parity-report.md');
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  console.log(`✓ Wrote Markdown report to ${mdPath}`);
}
