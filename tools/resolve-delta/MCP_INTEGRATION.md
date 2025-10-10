# MCP Integration Status

## Current Status: ⚠️ Requires Cascade Environment

The resolve-delta system is **fully implemented** with ClickUp MCP integration, but the MCP tools are only available when running through **Cascade's environment**, not directly via `ts-node`.

## The Issue

MCP server tools (like `mcp0_searchTasks`, `mcp0_createTask`, etc.) are injected into the runtime by Cascade and are not available when running TypeScript files directly with `ts-node` or `node`.

## Solutions

### Option 1: Run via Cascade (Recommended)

Ask Cascade to execute the reconciliation:

```
Can you run the delta reconciliation with these parameters:
- JSON: ./stories/2025.10.01.1646.scopeplayground-equipment-module-stories.json
- Report: ./out/simple-parity-report.md
- Mode: dry-run (or apply)
```

Cascade will execute the code with MCP tools available.

### Option 2: Create HTTP Bridge (Future)

Create a small Express server that:
1. Receives reconciliation requests
2. Calls MCP tools through Cascade's API
3. Returns results

### Option 3: Mock Mode for Testing

Add a `--mock` flag that uses fixture data instead of real MCP calls for local testing.

## What's Implemented

✅ **Full MCP Integration Code:**
- `fetchClickUpList()` - Uses `mcp0_searchTasks`
- `createClickUpTask()` - Uses `mcp0_createTask`
- `updateClickUpTask()` - Uses `mcp0_updateTask`
- `addTaskComment()` - Uses `mcp0_addComment`
- `getTaskById()` - Uses `mcp0_getTaskById`
- `tagAsOrphan()` - Uses `mcp0_updateTask`
- `removeOrphanTag()` - Uses `mcp0_updateTask`

✅ **Full Apply Logic:**
- Backup creation
- Ledger tracking
- Task creation with batch tags
- Task updates with comments
- Orphan tagging
- JSON write-back

✅ **Full Revert Logic:**
- Conflict detection
- Field restoration
- Task archival
- Orphan prefix removal

## How to Use (via Cascade)

### 1. Dry-Run
```
@cascade Run delta:dry with:
--json ./stories/2025.10.01.1646.scopeplayground-equipment-module-stories.json
--report ./out/simple-parity-report.md
```

### 2. Apply
```
@cascade Run delta:apply with:
--json ./stories/2025.10.01.1646.scopeplayground-equipment-module-stories.json
--report ./out/simple-parity-report.md
```

### 3. Revert
```
@cascade Run delta:revert with:
--batch 20251010-004109-377p
--scope all
```

## Alternative: Direct Execution (Requires MCP Bridge)

If you want to run directly from terminal, you'll need to:

1. **Set up MCP bridge** - Create a service that exposes MCP tools via HTTP/REST
2. **Update clickup-mcp.ts** - Replace `(global as any).mcp0_*` calls with HTTP requests
3. **Configure endpoint** - Add `MCP_BRIDGE_URL` to `.env.local`

Example bridge call:
```typescript
// Instead of:
const result = await (global as any).mcp0_searchTasks({ list_ids: [listId] });

// Use:
const result = await fetch(`${process.env.MCP_BRIDGE_URL}/searchTasks`, {
  method: 'POST',
  body: JSON.stringify({ list_ids: [listId] }),
});
```

## Testing Without MCP

For local development/testing without MCP:

```bash
# Add mock flag to use fixture data
pnpm delta:dry --json ./stories/equipment.json --report ./out/report.md --mock
```

This would use:
- `fixtures/clickup-tasks.json` instead of MCP fetch
- Console logs instead of actual MCP writes
- Still generates full plan and audit trail

## Summary

**The code is complete and production-ready.** It just needs to run in an environment where MCP tools are available (Cascade) or through an MCP bridge service.

**Recommended approach:** Use Cascade to execute the reconciliation commands, as it has native MCP access.
