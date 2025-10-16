# Billable Hours Verification Test

## Quick Math Check

Use this to verify the implementation is working correctly.

### Test Scenario

**Settings:**
- 50 story points
- $800/day contributor cost
- 6 hours/day productive time
- 1.5 contributors (with overhead)
- 65% AI productivity gain

### Expected Calculations

```
1. Raw Effort
   50 points × 8 hrs/point = 400 hrs

2. AI Optimization
   400 hrs × 65% gain = 260 hrs saved
   Productive hours = 400 - 260 = 140 hrs

3. Days Calculation
   140 hrs ÷ (6 hrs/day × 1.5 effective team) = 15.6 days
   15.6 days × 1.4 (weekends) = 21.8 calendar days

4. Cost Calculation
   21.8 days × $800/day × 1.5 contributors = $26,160

5. Billable Hours (NEW!)
   Hourly rate = $800 ÷ 6 = $133.33/hr
   Billable hours = $26,160 ÷ $133.33 = 196 hrs

6. Efficiency
   140 productive hrs ÷ 196 billable hrs = 71%
```

### Verification Checklist

#### ✅ Math Reconciliation
```
Cost ÷ Hourly Rate = Billable Hours
$26,160 ÷ $133.33 = 196 hrs ✓

Billable Hours × Hourly Rate = Cost
196 hrs × $133.33 = $26,160 ✓
```

#### ✅ Display Checks

**Client-Safe Mode:**
- [ ] Shows "Project Hours: 196"
- [ ] Does NOT show productive hours
- [ ] Does NOT show efficiency

**Internal Mode:**
- [ ] Shows "Billable Hours: 196"
- [ ] Shows "140 productive hrs"
- [ ] Shows "(71% efficiency)"

**PDF Export (Client):**
- [ ] Shows "Project Hours: 196"
- [ ] Does NOT show productive hours

**PDF Export (Internal):**
- [ ] Shows "Project Hours: 196"
- [ ] Shows "Productive Hours: 140 (71% efficiency)"

**CSV Export (Client):**
- [ ] Has "Project Hours" row with value ~196

**CSV Export (Internal):**
- [ ] Has "Project Hours" row with value ~196
- [ ] Has "Productive Hours" row with value ~140

### Common Values to Expect

| Metric | Value | Notes |
|--------|-------|-------|
| Productive Hours | 140 | After AI optimization |
| Billable Hours | 196 | Includes overhead |
| Overhead | 56 hrs | 29% of total |
| Efficiency | 71% | Productive/Billable |
| Cost | $26,160 | Unchanged |
| Days | 21.8 | Unchanged |

### Red Flags

❌ **If billable hours < productive hours**
- Something is wrong with the calculation
- Should always be: billable ≥ productive

❌ **If efficiency > 100%**
- Math error in efficiency calculation
- Should be: 0% < efficiency < 100%

❌ **If back-calculation doesn't match**
- `billableHours × hourlyRate ≠ totalCost`
- Core issue not fixed

❌ **If overhead is negative**
- `overheadHours = billableHours - productiveHours`
- Should always be positive

### Browser Console Test

Open browser console and run:
```javascript
// Get metrics from the page
const metrics = window.__SCOPE_METRICS__ || {};

// Verify calculations
const hourlyRate = 800 / 6; // $133.33
const expectedBillable = metrics.totalCost / hourlyRate;
const actualBillable = metrics.billableHours;

console.log('Expected Billable:', expectedBillable);
console.log('Actual Billable:', actualBillable);
console.log('Match:', Math.abs(expectedBillable - actualBillable) < 0.01);

// Verify efficiency
const efficiency = metrics.productiveHours / metrics.billableHours;
console.log('Efficiency:', (efficiency * 100).toFixed(1) + '%');
console.log('Valid:', efficiency > 0 && efficiency <= 1);
```

### Manual Verification Steps

1. **Open Scope Playground**
   - Navigate to http://localhost:3000

2. **Add Stories to Matrix**
   - Drag 7 stories into the matrix
   - Total should be ~50 points

3. **Check Metrics Panel**
   - Toggle client-safe mode OFF
   - Look for "Billable Hours" card
   - Should show: 196 hrs
   - Should show: 140 productive hrs
   - Should show: 71% efficiency

4. **Toggle Client-Safe Mode ON**
   - Card should say "Project Hours"
   - Should show: 196 hrs
   - Should NOT show productive hours

5. **Export PDF (Internal Mode)**
   - Click Export
   - Check "Key Metrics" section
   - Should list both Project Hours and Productive Hours

6. **Export PDF (Client Mode)**
   - Toggle client-safe mode ON
   - Click Export
   - Should only show Project Hours

7. **Back-Calculate**
   - Note the Total Cost (e.g., $26,160)
   - Note the Project Hours (e.g., 196)
   - Calculate: Cost ÷ Hours = Rate
   - $26,160 ÷ 196 = $133.33/hr ✓
   - Verify: $800/day ÷ 6 hrs = $133.33/hr ✓

### Success Criteria

✅ All math checks pass
✅ Display shows correct values in both modes
✅ PDF exports correctly in both modes
✅ CSV exports correctly in both modes
✅ Back-calculation reconciles
✅ No console errors
✅ Efficiency is between 0-100%
✅ Overhead is positive

### If Something's Wrong

**Hours don't match:**
- Check `app/page.tsx` line 659-664
- Verify `billableHours = totalCost / hourlyRate`

**Display is wrong:**
- Check `components/MetricsPanel.tsx` line 246-265
- Verify conditional rendering based on clientSafeMode

**PDF is wrong:**
- Check `components/ExportPanel.tsx` line 179-186
- Verify metricsData array construction

**Efficiency > 100%:**
- Check calculation: `productiveHours / billableHours`
- Should always be < 1.0

**Negative overhead:**
- Check: `billableHours - productiveHours`
- Billable should always be larger
