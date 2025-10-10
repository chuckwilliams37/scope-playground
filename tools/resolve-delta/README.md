# Resolve Delta - Reconciliation & Audit System

Policy-driven reconciliation between local JSON stories and ClickUp with full audit trails and revert capability.

## Features

✅ **Policy-Driven Merging** - Locked policies for orphans, status, business value, tags  
✅ **Fuzzy Matching** - 60% similarity threshold for title and user story  
✅ **Report-Driven** - Parses parity report directives (USE_JSON, USE_CLICKUP, REVIEW)  
✅ **Audit Trail** - Full ledger with before/after snapshots  
✅ **Revert Capability** - Rollback any batch with conflict detection  
✅ **Dry-Run Mode** - Preview changes before applying  

## Locked Policies

### Orphans
- **Keep in ClickUp** - Never delete
- **Prefix with "(ORPHAN) "** - Idempotent tagging

### Status Set (Canonical)
```
captured, defined, prioritized, blocked, in progress, in review,
ready for deploy, deployed, closed, complete
```

### Business Value
```
Critical, Important, Nice to Have
```

### Tags
- Auto-create missing in ClickUp
- Lowercase + sorted

### Points Rule
- If JSON points == 0 and ClickUp points > 0, use ClickUp

### Review Default
- **prefer_longer_text** - More chars for descriptions, larger set for criteria

## Usage

### 1. Dry-Run (Preview)

```bash
pnpm delta:dry --json ./stories/equipment-stories.json --report ./out/simple-parity-report.md
```

**Outputs:**
- `./out/resolve-delta-plan.json` - Machine-readable plan
- `./out/resolve-delta-report.md` - Human-readable report

### 2. Apply Changes

```bash
pnpm delta:apply --json ./stories/equipment-stories.json --report ./out/simple-parity-report.md
```

**Creates:**
- `/backups/<BATCH_ID>/clickup-export.json` - Pre-change snapshot
- `/backups/<BATCH_ID>/clickup-export.csv` - CSV export
- `/backups/<BATCH_ID>/stories.json` - Input JSON snapshot
- `/backups/<BATCH_ID>/ledger.json` - Audit ledger

**Updates:**
- ClickUp tasks (create/update/tag orphans)
- Local JSON file (merged stories)
- Adds ClickUp tags: `sync-batch-<BATCH_ID>`
- Adds ClickUp comments with change summaries

### 3. Revert Batch

```bash
# Revert all changes in a batch
pnpm delta:revert --batch 20251010-001530-a3f2

# Revert specific task
pnpm delta:revert --batch 20251010-001530-a3f2 --scope task:abc123

# Revert by external ID
pnpm delta:revert --batch 20251010-001530-a3f2 --scope external:story-001

# Dry-run revert
pnpm delta:revert --batch 20251010-001530-a3f2 --dry
```

**Revert Logic:**
- **create** → Archive task
- **update** → Restore fields to "before" values (skips if ClickUp modified since)
- **tag_orphan** → Remove "(ORPHAN) " prefix

## CLI Options

### delta:dry / delta:apply

```bash
--json <path>           Path to JSON stories file (required)
--report <path>         Path to parity report (required)
--titleSim <0-1>        Override title similarity threshold (default: 0.60)
--userStorySim <0-1>    Override user story similarity threshold (default: 0.60)
```

### delta:revert

```bash
--batch <id>            Batch ID to revert (required)
--scope <scope>         Scope: all | task:<id> | external:<id> (default: all)
--dry                   Dry-run mode (preview only)
```

## Story Schema

```typescript
type Story = {
  id?: string;                    // External ID (optional)
  title: string;
  userStory: string;
  category?: string;
  points: number;                 // Default: 0
  businessValue: "Critical" | "Important" | "Nice to Have";
  status: string;                 // Normalized to STATUS_SET
  acceptanceCriteria: string[];   // Trimmed, deduped, sorted
  tags?: string[];                // Lowercase, sorted
  _meta?: {
    source?: "json" | "clickup" | "merged";
    updatedAt?: string;           // ISO timestamp
  }
}
```

## Report Directive Format

The tool parses these sections from the parity report:

### Missing in ClickUp
```markdown
## Missing in ClickUp (15)

- **ENHANCEMENT: Admin View of Employee Profiles**
- **Provide Cost Estimate: Equipment Maintenance/Warranty Service Project**
```

### Orphans in ClickUp
```markdown
## Orphans in ClickUp (3)

- **COMMENTS - NOTES (FOR EQUIPMENT, MAINTENANCE REQUESTS, ETC)**
- **?? QUESTIONS ??**
```

### Field Differences
```markdown
### Employee Equipment Assignment

🔵 **description** - Description differs (JSON: 147 chars, ClickUp: 216 chars)
  - JSON: "As a company administrator..."
  - ClickUp: "As a logged in administrator..."
  - **Recommendation:** USE CLICKUP

📝 **acceptance_criteria** - Acceptance criteria count differs: JSON=5, ClickUp=0
  - JSON: "5 criteria"
  - ClickUp: "0 criteria"
  - **Recommendation:** USE JSON
```

## Merge Logic

### Field-by-Field Decision Tree

1. **Check for report directive** (USE_JSON, USE_CLICKUP, REVIEW)
2. **Apply directive** if present
3. **Fallback to policy:**
   - **title**: prefer JSON
   - **userStory**: prefer longer text
   - **points**: prefer ClickUp if JSON == 0
   - **businessValue**: prefer JSON
   - **status**: prefer JSON (normalized)
   - **acceptanceCriteria**: prefer larger set on REVIEW
   - **tags**: union (lowercase, sorted)

## Audit Trail

### Ledger Entry Format

```json
{
  "taskId": "abc123",
  "externalId": "story-001",
  "operation": "update",
  "titleBefore": "Employee Equipment Assignment",
  "titleAfter": "Employee Equipment Assignment",
  "fields": [
    {
      "field": "points",
      "before": 3,
      "after": 5
    }
  ],
  "updatedAt": "2025-10-10T05:15:30.000Z",
  "clickupDateUpdatedBefore": "2025-10-09T20:00:00.000Z"
}
```

### ClickUp Metadata

Each synced task gets:
- **Custom Field:** "Sync: Last Batch" = `<BATCH_ID>`
- **Custom Field:** "Sync: Touched" = `true`
- **Tag:** `sync-batch-<BATCH_ID>`
- **Comment:** Change summary

## Architecture

```
tools/resolve-delta/
├── types.ts          # Zod schemas, types, policies
├── normalize.ts      # Normalization functions
├── fuzzy.ts          # Fuzzy matching logic
├── parseReport.ts    # Report parser
├── merge.ts          # Merge logic with policy engine
├── run.ts            # Main CLI (dry-run & apply)
├── revert.ts         # Revert CLI
└── README.md         # This file
```

## MCP Integration (TODO)

The system is designed to integrate with ClickUp MCP server:

```typescript
// Resolve fields
await mcp.clickup.resolveFields({ listId });

// Fetch list
await mcp.clickup.fetchList({ listId });

// Push stories
await mcp.clickup.pushStories({ 
  listId, 
  stories, 
  forceDeleteOrphans: false 
});
```

## Example Workflow

```bash
# 1. Run simple parity check
pnpm simple-parity --json ./stories/equipment.json --list 901320515803

# 2. Review the report
cat out/simple-parity-report.md

# 3. Run reconciliation (dry-run)
pnpm delta:dry --json ./stories/equipment.json --report ./out/simple-parity-report.md

# 4. Review the plan
cat out/resolve-delta-report.md

# 5. Apply changes
pnpm delta:apply --json ./stories/equipment.json --report ./out/simple-parity-report.md

# 6. If needed, revert
pnpm delta:revert --batch 20251010-001530-a3f2
```

## Status

🟡 **PARTIAL** - Core logic complete, MCP integration pending

**Complete:**
- ✅ Policy engine
- ✅ Normalization
- ✅ Fuzzy matching
- ✅ Report parsing
- ✅ Merge logic
- ✅ Dry-run mode
- ✅ Plan generation

**Pending:**
- ⏳ MCP ClickUp integration
- ⏳ Apply mode with audit trail
- ⏳ Revert implementation
- ⏳ CSV export
- ⏳ ClickUp comments
