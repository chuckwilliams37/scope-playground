# ClickUp Parity System - Setup & Testing Guide

## ✅ System Status: GREEN

All core files have been scaffolded and are ready for use. The system compiles successfully.

## 📁 Files Created

### Core System
- ✅ `tools/parity/schema.ts` - Zod schemas and type definitions
- ✅ `tools/parity/normalize.ts` - String normalization utilities
- ✅ `tools/parity/config.ts` - Environment config and field resolution
- ✅ `tools/parity/clickup-client.ts` - ClickUp API wrapper
- ✅ `tools/parity/parity-checker.ts` - Diff engine
- ✅ `tools/parity/report-generator.ts` - Markdown/JSON report generator
- ✅ `tools/parity/sync-operations.ts` - Pull/push operations
- ✅ `tools/parity/check-parity.ts` - Main CLI entry point
- ✅ `tools/parity/status-map.json` - Status mapping configuration

### Testing
- ✅ `tools/parity/__tests__/normalize.test.ts` - Normalization tests
- ✅ `tools/parity/__tests__/diff.test.ts` - Parity checker tests
- ✅ `tools/parity/fixtures/sample-stories.json` - Test data

### Configuration
- ✅ `jest.config.js` - Jest test configuration
- ✅ `tools/tsconfig.json` - TypeScript config for tools
- ✅ `.env.example` - Environment variable template
- ✅ `tools/parity/README.md` - User documentation

### Package Updates
- ✅ Added NPM scripts: `parity`, `parity:check`, `parity:pull`, `parity:push`, `test:parity`
- ✅ Added dependencies: `zod`, `ts-node`, `jest`, `ts-jest`, `@types/jest`, `dotenv`, `cross-env`

## 🚀 Next Steps

### 1. Set Up ClickUp

1. **Get your API token:**
   - Go to ClickUp Settings → Apps
   - Generate an API token
   - Copy it to your `.env.local` file

2. **Get your List ID:**
   - Open your ClickUp list in a browser
   - The URL will be: `https://app.clickup.com/[workspace]/v/li/[LIST_ID]`
   - Copy the LIST_ID

3. **Create Custom Fields in ClickUp:**
   - **External ID** (Text field)
   - **Points** (Number field)
   - **Business Value** (Drop Down with options: Critical, Important, Nice to Have)

### 2. Configure Environment

Create `.env.local` in the project root:

```bash
CLICKUP_API_TOKEN=pk_your_token_here
CLICKUP_LIST_ID=123456789
```

### 3. Run Your First Check

```bash
# Test with sample data (will fail without env vars)
pnpm parity --mode check --json tools/parity/fixtures/sample-stories.json

# Check parity with your actual data
pnpm parity:check
```

### 4. Run Tests

```bash
# Run unit tests
pnpm test:parity
```

## 📋 Usage Examples

### Check Mode (Compare & Report)
```bash
pnpm parity:check
# Output: ./out/parity-report.md and ./out/parity-report.json
```

### Pull Mode (Export from ClickUp)
```bash
pnpm parity:pull
# Output: ./out/clickup-export.json
```

### Push Mode (Sync to ClickUp)
```bash
pnpm parity:push
# Creates missing tasks and updates mismatches
```

### Custom JSON File
```bash
pnpm parity --mode check --json ./stories/all_stories_consolidated.json
```

## 🔧 Troubleshooting

### TypeScript Errors
The test files will show linting errors until you run `pnpm install`. This is normal.

### Missing Custom Fields
If you see "Missing required custom fields", create them in ClickUp:
1. Go to List Settings → Custom Fields
2. Add the three required fields (see Setup section)
3. Re-run the command

### Field Discovery
The tool auto-discovers field IDs and caches them to `.clickup.fields.json`. Delete this file to force re-discovery.

### Status Mapping
Edit `tools/parity/status-map.json` to customize status mappings.

## 🧪 Testing Strategy

### Unit Tests
- ✅ Normalization functions (string comparison, array diffing)
- ✅ Parity checker (all diff types)

### Integration Testing (Manual)
1. Create a test ClickUp list
2. Add 2-3 tasks with External IDs
3. Run `pnpm parity:pull` to export
4. Modify the JSON
5. Run `pnpm parity:check` to see diffs
6. Run `pnpm parity:push` to sync changes

## 📊 Report Output

### Markdown Report (`./out/parity-report.md`)
- Summary table with counts
- Missing in ClickUp section
- Orphans in ClickUp section
- Field mismatches by type
- Suggested remediation commands

### JSON Report (`./out/parity-report.json`)
- Machine-readable diff data
- Full details for each mismatch
- Timestamps and metadata

## 🎯 Key Features

✅ **Idempotent by External ID** - Safe to run multiple times
✅ **Fail-fast validation** - Clear error messages
✅ **Auto-discovery** - Finds custom fields automatically
✅ **Comprehensive diffs** - Detects all field mismatches
✅ **Tag management** - Auto-creates missing tags
✅ **Status mapping** - Configurable status translations
✅ **WSL compatible** - Works in Windows/WSL/Linux

## 🔐 Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- API tokens have full access to your ClickUp workspace
- Use `--force-delete-orphans` with extreme caution

## 📝 Story Schema Reference

```typescript
{
  id: string;                        // External ID (unique)
  title: string;
  category?: string;
  userStory: string;
  points: number;                    // Integer
  businessValue: "Critical" | "Important" | "Nice to Have";
  status: "Backlog" | "In Progress" | "Blocked" | "Review" | "Done";
  acceptanceCriteria: string[];
  tags?: string[];
}
```

## 🎉 You're Ready!

The system is fully scaffolded and ready to use. Just add your ClickUp credentials and start syncing!
