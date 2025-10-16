# PDF Optimization Guide

## Current Issues

The PDFs are very large due to:
1. **High-resolution screenshots** - `html2canvas` at scale 1.5
2. **PNG format** - Uncompressed images
3. **Multiple full-page captures** - Matrix and metrics panels
4. **No image compression** - Direct PNG to PDF

## Optimization Strategies

### 1. Reduce html2canvas Scale (Immediate Impact)
**Current**: `scale: 1.5`
**Recommended**: `scale: 0.8` to `1.0`

```typescript
const canvas = await html2canvas(element, {
  scale: 0.8,  // Reduced from 1.5
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff'
});
```

**Impact**: ~40-50% file size reduction

### 2. Use JPEG Instead of PNG (High Impact)
**Current**: `canvas.toDataURL('image/png')`
**Recommended**: `canvas.toDataURL('image/jpeg', 0.85)`

```typescript
// Change from PNG to JPEG with 85% quality
const imgData = canvas.toDataURL('image/jpeg', 0.85);
pdf.addImage(imgData, 'JPEG', xOffset, y, imgWidth, imgHeight);
```

**Impact**: ~60-70% file size reduction for images

### 3. Compress Images Before Adding to PDF
Add image compression using canvas:

```typescript
// After capturing with html2canvas
const compressedCanvas = document.createElement('canvas');
const ctx = compressedCanvas.getContext('2d');

// Reduce dimensions
compressedCanvas.width = canvas.width * 0.75;
compressedCanvas.height = canvas.height * 0.75;

// Draw with smoothing
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(canvas, 0, 0, compressedCanvas.width, compressedCanvas.height);

// Convert to JPEG
const imgData = compressedCanvas.toDataURL('image/jpeg', 0.85);
```

**Impact**: Additional 20-30% reduction

### 4. Reduce Image Dimensions in PDF
**Current**: `imgWidth = 170mm`
**Recommended**: `imgWidth = 150mm` or smaller

```typescript
const imgWidth = 150;  // Reduced from 170
const imgHeight = (canvas.height * imgWidth) / canvas.width;
```

**Impact**: ~15-20% reduction

### 5. Use PDF Compression
Add jsPDF compression option:

```typescript
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true  // Enable PDF compression
});
```

**Impact**: ~10-15% overall reduction

### 6. Optimize Table Rendering
Tables are text-based and efficient, but can be optimized:

```typescript
styles: {
  fontSize: 8,  // Reduced from 9-10
  cellPadding: 2,  // Reduced from 3
  overflow: 'linebreak',
  valign: 'top'
}
```

**Impact**: Minimal, but helps with page count

### 7. Lazy Load / Skip Screenshots for Client-Safe Mode
For client-facing PDFs, consider skipping screenshots entirely:

```typescript
if (!clientSafeMode && matrixElement) {
  // Only capture screenshots in internal mode
  const canvas = await html2canvas(matrixElement, {...});
}
```

**Impact**: ~50-70% reduction for client PDFs

## Recommended Implementation Order

### Phase 1: Quick Wins (Implement First)
1. ✅ Change PNG to JPEG (0.85 quality)
2. ✅ Reduce scale from 1.5 to 0.9
3. ✅ Enable PDF compression
4. ✅ Reduce image width to 150mm

**Expected Result**: 60-75% file size reduction

### Phase 2: Advanced Optimization
5. ✅ Add canvas compression before PDF
6. ✅ Implement progressive JPEG loading
7. ✅ Skip screenshots in client-safe mode

**Expected Result**: Additional 15-25% reduction

## Code Changes Required

### File: `components/ExportPanel.tsx`

#### Change 1: Update html2canvas calls (Lines 348-353, 400-405)
```typescript
// BEFORE
const canvas = await html2canvas(matrixClone, {
  scale: 1.5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff'
});

// AFTER
const canvas = await html2canvas(matrixClone, {
  scale: 0.9,  // Reduced from 1.5
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  imageTimeout: 0,
  removeContainer: true
});
```

#### Change 2: Add image compression function
```typescript
// Add this helper function after line 112
const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.85): string => {
  // Create compressed canvas
  const compressed = document.createElement('canvas');
  const ctx = compressed.getContext('2d')!;
  
  // Reduce to 75% of original size
  compressed.width = canvas.width * 0.75;
  compressed.height = canvas.height * 0.75;
  
  // High-quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, compressed.width, compressed.height);
  
  // Return JPEG with specified quality
  return compressed.toDataURL('image/jpeg', quality);
};
```

#### Change 3: Update image conversion (Lines 359, 411)
```typescript
// BEFORE
const imgData = canvas.toDataURL('image/png');
const imgWidth = 170;

// AFTER
const imgData = compressImage(canvas, 0.85);  // Use compression
const imgWidth = 150;  // Reduced from 170
```

#### Change 4: Update addImage calls (Lines 365, 417)
```typescript
// BEFORE
pdf.addImage(imgData, 'PNG', xOffset, y, imgWidth, imgHeight);

// AFTER
pdf.addImage(imgData, 'JPEG', xOffset, y, imgWidth, imgHeight);
```

#### Change 5: Enable PDF compression (Line 62)
```typescript
// BEFORE
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// AFTER
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true  // Add compression
});
```

## Expected Results

### Before Optimization
- Typical file size: 5-15 MB
- Large files: 20-30 MB
- Images: PNG at 1.5x scale

### After Phase 1 Optimization
- Typical file size: 1-4 MB (70-80% reduction)
- Large files: 5-8 MB (70-75% reduction)
- Images: JPEG at 0.9x scale with compression

### After Phase 2 Optimization
- Typical file size: 0.8-3 MB (additional 20% reduction)
- Large files: 3-6 MB (additional 25% reduction)
- Client-safe PDFs: 0.3-1 MB (no screenshots)

## Testing Checklist

After implementing changes, verify:
- ✅ PDF file size reduced significantly
- ✅ Matrix image still readable
- ✅ Metrics panel still clear
- ✅ Text remains crisp
- ✅ Tables render correctly
- ✅ Colors preserved accurately
- ✅ No visual artifacts from JPEG compression
- ✅ Client-safe mode works correctly

## Alternative: Vector-Based Rendering

For maximum quality with minimal file size, consider replacing screenshots with vector-based rendering:

```typescript
// Instead of html2canvas, render matrix directly to PDF
// This requires more code but produces smallest files
const renderMatrixToVector = (pdf: jsPDF, stories: Story[]) => {
  // Draw matrix grid
  // Draw story cards as text/shapes
  // Much smaller file size, perfect quality
};
```

**Impact**: 90-95% reduction vs current approach
**Effort**: High (requires rewriting matrix rendering)

## Monitoring

Add file size tracking:

```typescript
const handleExportPDF = async () => {
  const startTime = performance.now();
  
  // ... PDF generation code ...
  
  const blob = pdf.output('blob');
  const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
  const duration = ((performance.now() - startTime) / 1000).toFixed(1);
  
  console.log(`PDF generated: ${sizeInMB} MB in ${duration}s`);
};
```

## Summary

**Quick wins** (30 minutes):
- JPEG instead of PNG: -60%
- Reduce scale to 0.9: -20%
- Enable compression: -10%
- **Total: ~70-75% reduction**

**Advanced** (2-3 hours):
- Canvas compression: -15%
- Skip screenshots in client mode: -50% (for client PDFs)
- **Total: ~80-90% reduction**

**Long-term** (1-2 days):
- Vector-based rendering: -90-95%
- Progressive loading
- Lazy image generation
