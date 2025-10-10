# ClickUp Parity & Sync Tool

Validates and synchronizes user stories between local JSON files and ClickUp tasks.

## Features

- ✅ **Parity Checking**: Compare JSON stories with ClickUp tasks and generate detailed diff reports
- 📥 **Pull**: Export ClickUp tasks to JSON format
- 📤 **Push**: Create/update ClickUp tasks from JSON (idempotent by External ID)
- 🔍 **Field Validation**: Strict validation of titles, points, business value, status, acceptance criteria, and tags
- 📊 **Reports**: Generate both JSON and Markdown reports

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
CLICKUP_API_TOKEN=your_api_token_here
CLICKUP_LIST_ID=your_list_id_here

# Optional: Specify custom field IDs directly (otherwise auto-discovered)
CLICKUP_CF_POINTS=field_id
CLICKUP_CF_BUSINESS_VALUE=field_id
CLICKUP_CF_EXTERNAL_ID=field_id
```

### 3. Set Up ClickUp Custom Fields

Your ClickUp list must have these custom fields:

- **External ID** (Text) - Unique identifier for each story
- **Points** (Number) - Story points
- **Business Value** (Drop Down) - Options: `Critical`, `Important`, `Nice to Have`

The tool will auto-discover field IDs and cache them to `.clickup.fields.json`.

## Usage

### Check Parity

Compare JSON and ClickUp, generate reports:

```bash
pnpm parity:check
```

Reports are written to `./out/`:
- `parity-report.json` - Machine-readable diff data
- `parity-report.md` - Human-readable summary

### Pull from ClickUp

Export ClickUp tasks to JSON:

```bash
pnpm parity:pull
```

Output: `./out/clickup-export.json`

### Push to ClickUp

Create/update ClickUp tasks from JSON:

```bash
pnpm parity:push
```

This will:
- Create tasks for stories missing in ClickUp
- Update existing tasks with mismatched fields
- Preserve tasks not in JSON (unless `--force-delete-orphans` is used)

### Advanced Usage

```bash
# Use a different JSON file
pnpm parity --mode check --json ./stories/all_stories_consolidated.json

# Use a different list
pnpm parity --mode check --list 123456789

# Force delete orphan tasks (use with caution!)
pnpm parity --mode push --force-delete-orphans
```

## Story Schema

```typescript
{
  id: string;                        // External ID (unique)
  title: string;
  category?: string;
  userStory: string;
  points: number;                    // Integer
  businessValue: "Critical" | "Important" | "Nice to Have";
  status: "Backlog" | "In Progress" | "Blocked" | "Review" | "Done";
  acceptanceCriteria: string[];      // Array of criteria
  tags?: string[];                   // Optional tags
}
```

## Mapping

| JSON Field | ClickUp Field |
|------------|---------------|
| `id` | Custom Field: External ID |
| `title` | Task Name |
| `points` | Custom Field: Points |
| `businessValue` | Custom Field: Business Value |
| `status` | Task Status |
| `acceptanceCriteria` | Checklist: "Acceptance Criteria" |
| `tags` | Task Tags |

## Testing

Run tests:

```bash
pnpm test:parity
```

## Troubleshooting

### Missing Custom Fields

If you see an error about missing custom fields:

1. Go to your ClickUp list settings
2. Create the required custom fields (see Setup section)
3. Re-run the command

### Status Mapping Issues

Edit `tools/parity/status-map.json` to customize status mappings between JSON and ClickUp.

### Field Discovery

The tool caches discovered field IDs in `.clickup.fields.json`. Delete this file to force re-discovery.

## Windows/WSL Notes

- Prefer running in WSL Ubuntu for best compatibility
- If running on Windows, ensure `cross-env` is installed (already in devDependencies)
- The tool handles CRLF vs LF line endings automatically
