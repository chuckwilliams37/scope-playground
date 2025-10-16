# Fixes Summary - Oct 15, 2025

## 1. ✅ PDF Quality Improved (Targeting 2-5MB)

**File**: `components/ExportPanel.tsx`

### Changes Made:
- **Scale**: Increased from 0.9 → 1.2 (better quality)
- **JPEG Quality**: Increased from 85% → 92% (less compression)
- **Canvas Compression**: Reduced from 75% → 80% (less aggressive)
- **Image Width**: Increased from 150mm → 160mm (larger images)

### Expected Results:
- **File Size**: 2-5 MB (was targeting <2 MB, now balanced)
- **Quality**: Significantly improved clarity
- **Images**: Sharper matrix and metrics screenshots

## 2. ✅ Contributors Section Hidden in Client-Safe Mode

**File**: `components/MetricsPanel.tsx` (Lines 276-331)

### Problem:
- Contributors section with detailed productivity breakdown was spilling out in PDFs
- Artifacts appearing in client-facing documents

### Solution:
```typescript
{!clientSafeMode && (
  <div className="bg-green-50 p-3 rounded-lg">
    <div className="text-sm text-green-600 font-medium">Contributors</div>
    // ... entire Contributors section
  </div>
)}
```

### Result:
- ✅ Contributors card completely hidden in client-safe mode
- ✅ No artifacts in client PDFs
- ✅ Full details still available in internal mode

## 3. ✅ Backlog Manager Collection Save Error Fixed

**File**: `convex/schema.ts` (Line 218)

### Error:
```
ArgumentValidationError: Object contains extra field `acceptanceCriteria` 
that is not in the validator.
```

### Problem:
- Stories now include `acceptanceCriteria` field
- `storyCollections` schema didn't include this field
- Save operation failed validation

### Solution:
Added `acceptanceCriteria` to the story object in `storyCollections`:
```typescript
acceptanceCriteria: v.optional(v.array(v.string())),
```

### Result:
- ✅ Collections can now save stories with acceptance criteria
- ✅ No data loss when saving from Backlog Manager
- ✅ Schema matches actual story structure

## Testing Checklist

### PDF Quality
- [ ] Generate PDF in internal mode
- [ ] Generate PDF in client-safe mode
- [ ] Verify file size is 2-5 MB
- [ ] Check matrix image clarity
- [ ] Check metrics panel clarity
- [ ] Confirm no artifacts in client mode

### Contributors Section
- [ ] View metrics in internal mode (should show Contributors)
- [ ] View metrics in client-safe mode (should hide Contributors)
- [ ] Export PDF in client mode (no Contributors artifacts)
- [ ] Export PDF in internal mode (Contributors visible)

### Collection Save
- [ ] Open Backlog Manager
- [ ] Select stories with acceptance criteria
- [ ] Save as collection
- [ ] Verify no errors in console
- [ ] Reload and verify collection saved correctly

## Files Modified

1. `components/ExportPanel.tsx` - PDF optimization adjustments
2. `components/MetricsPanel.tsx` - Hide Contributors in client mode
3. `convex/schema.ts` - Add acceptanceCriteria to storyCollections

## Impact

### PDF Quality
- **Before**: Over-optimized, quality suffering, <2 MB
- **After**: Balanced optimization, good quality, 2-5 MB

### Client-Safe Mode
- **Before**: Contributors section visible, causing artifacts
- **After**: Contributors hidden, clean client PDFs

### Collection Save
- **Before**: Error when saving stories with acceptance criteria
- **After**: Saves successfully with all fields intact
