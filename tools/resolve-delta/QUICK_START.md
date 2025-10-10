# Resolve Delta - Quick Start

## One-Line Summary
Policy-driven JSON ↔ ClickUp reconciliation with fuzzy matching, audit trails, and revert capability.

## Quick Commands

```bash
# Dry-run (preview changes)
pnpm delta:dry --json ./stories/equipment.json --report ./out/simple-parity-report.md

# Apply changes (when MCP integrated)
pnpm delta:apply --json ./stories/equipment.json --report ./out/simple-parity-report.md

# Revert a batch
pnpm delta:revert --batch 20251010-001530-a3f2
```

## What It Does

1. **Parses** your parity report for directives (USE_JSON, USE_CLICKUP, REVIEW)
2. **Matches** JSON stories with ClickUp tasks using fuzzy logic (60% threshold)
3. **Merges** according to locked policies:
   - Orphans: keep in ClickUp, prefix with "(ORPHAN) "
   - Points: prefer ClickUp if JSON == 0
   - Tags: union, lowercase, sorted
   - Status: normalize to canonical set
   - Review: prefer longer text
4. **Generates** a plan with creates, updates, and orphan tags
5. **Applies** changes with full audit trail (when MCP integrated)
6. **Reverts** any batch with conflict detection

## Outputs

### Dry-Run
- `./out/resolve-delta-plan.json` - Machine-readable
- `./out/resolve-delta-report.md` - Human-readable

### Apply
- `/backups/<BATCH_ID>/clickup-export.json` - Pre-change snapshot
- `/backups/<BATCH_ID>/ledger.json` - Audit ledger
- `/backups/<BATCH_ID>/stories.json` - Input snapshot
- Updated JSON file (merged stories)
- Updated ClickUp tasks

## Locked Policies

| Policy | Behavior |
|--------|----------|
| **Orphans** | Keep in ClickUp, prefix "(ORPHAN) " |
| **Status** | Normalize to: captured, defined, prioritized, blocked, in progress, in review, ready for deploy, deployed, closed, complete |
| **Business Value** | Critical, Important, Nice to Have |
| **Points** | Prefer ClickUp if JSON == 0 |
| **Tags** | Union, lowercase, sorted |
| **Review** | Prefer longer text / larger set |
| **Fuzzy Threshold** | 60% for title and userStory |

## Status

🟡 **Core Complete** - MCP integration pending

- ✅ Dry-run mode fully functional
- ⏳ Apply mode awaiting MCP
- ⏳ Revert awaiting MCP

## Next Steps

1. Run dry-run to preview changes
2. Review `./out/resolve-delta-report.md`
3. Integrate ClickUp MCP server
4. Run apply mode
5. Use revert if needed

See `README.md` for full documentation.
