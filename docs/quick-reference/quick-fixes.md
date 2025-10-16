# Quick Fixes - Oct 15, 2025

## ✅ Three Issues Fixed

### 1. PDF Quality Improved
**Target**: 2-5 MB file size with better quality

**Changes** (`ExportPanel.tsx`):
- Scale: 0.9 → **1.2**
- JPEG Quality: 85% → **92%**
- Canvas: 75% → **80%**
- Width: 150mm → **160mm**

**Result**: Better image quality, 2-5 MB PDFs

---

### 2. Contributors Section Hidden (Client Mode)
**Problem**: Artifacts in client PDFs

**Fix** (`MetricsPanel.tsx` line 276):
```typescript
{!clientSafeMode && (
  <div>Contributors section</div>
)}
```

**Result**: Clean client PDFs, no artifacts

---

### 3. Collection Save Error Fixed
**Error**: `acceptanceCriteria` field not in validator

**Fix** (`schema.ts` line 218):
```typescript
acceptanceCriteria: v.optional(v.array(v.string()))
```

**Result**: Collections save successfully

---

## Test It
1. Export PDF → Check quality & size (2-5 MB)
2. Toggle client mode → Contributors hidden
3. Save collection → No errors
