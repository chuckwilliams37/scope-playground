# Client-Safe Estimates Mode

## Overview

Client-Safe Estimates Mode is a feature that hides sensitive internal estimation data when sharing with clients. By default, the mode is **ON** (client-safe), hiding hourly rates, internal levers, and calculation details.

## What Gets Hidden

When Client-Safe Mode is **ON**, the following information is hidden:

### UI (MetricsPanel)
- Hourly rate display
- Points-to-hours conversion factor
- AI productivity gain details
- Team overhead breakdowns (communication, management, etc.)
- Effective team size calculations
- Productivity loss percentages
- Internal calculation formula

### PDF Exports
- Contributor cost (daily rate)
- Hours per day
- Contributor allocation percentage
- Scope limiters (points, hours, duration limits)
- Self-managed partner settings
- AI productivity factor percentages
- AI productivity gains research section

### CSV Exports
- Contributor cost
- Hours per day
- Contributor allocation
- Points-to-hours conversion
- AI productivity factors
- Team overhead metrics
- Internal calculation details

## What Remains Visible

Client-safe mode preserves all essential project information:

- Total stories and story points
- Estimated duration (days/weeks)
- Total estimated cost
- Team size (number of contributors)
- Story details and acceptance criteria
- Business value categorization
- Scope matrix positioning

## Usage

### In the UI

1. **Toggle Location**: The Client-Safe mode toggle appears in the MetricsPanel (right sidebar)
2. **Default State**: ON (client-safe) - hourly rates hidden
3. **Toggle Action**: Click the toggle to switch between client-safe and internal modes
4. **Persistence**: Your preference is saved in browser localStorage

### In Exports

**PDF Export**:
- Automatically respects the current Client-Safe mode setting
- Generate PDF while toggle is ON for client-safe version
- Generate PDF while toggle is OFF for internal version with all details

**CSV Export**:
- Two buttons: "Stories CSV" and "Metrics CSV"
- Both respect the current Client-Safe mode setting
- Filename includes `-client-safe` or `-full` suffix

### Programmatic Usage

```typescript
import { useClientSafe } from '../hooks/useClientSafe';

function MyComponent() {
  const { clientSafeMode, toggleClientSafeMode, isLoaded } = useClientSafe();
  
  // Check if client-safe mode is active
  if (clientSafeMode) {
    // Hide sensitive data
  }
  
  // Toggle the mode
  toggleClientSafeMode(true); // Enable client-safe
  toggleClientSafeMode(false); // Disable client-safe
}
```

## Redaction Utilities

### Check if a field is sensitive

```typescript
import { isSensitiveField } from '../utils/estimation/redact';

if (isSensitiveField('hourlyRate')) {
  // This field should be hidden in client-safe mode
}
```

### Redact estimation data

```typescript
import { redactEstimates, redactSettings } from '../utils/estimation/redact';

const safeEstimates = redactEstimates(estimates, { clientSafe: true });
const safeSettings = redactSettings(settings, { clientSafe: true });
```

### Validate exports for forbidden tokens

```typescript
import { containsForbiddenTokens } from '../utils/estimation/redact';

const pdfContent = generatePDF();
const validation = containsForbiddenTokens(pdfContent);

if (validation.hasForbidden) {
  console.error('Forbidden tokens found:', validation.tokens);
}
```

## Testing

### Run Client-Safe Tests

```bash
# Run all client-safe mode tests
npm run test:clientsafe

# Run specific test suites
npm test -- tests/estimation/redact.test.ts
npm test -- tests/export/csv_clientsafe.test.ts
```

### Test Coverage

Tests verify:
- ✅ Sensitive fields are correctly identified
- ✅ Redaction preserves totals while removing sensitive data
- ✅ CSV exports don't contain forbidden tokens in client-safe mode
- ✅ Client-safe labels are applied correctly
- ✅ Settings redaction works as expected

## CI/CD Integration

Add to your CI pipeline to ensure client-safe exports don't leak sensitive data:

```yaml
- name: Test Client-Safe Mode
  run: npm run test:clientsafe

- name: Validate Exports
  run: |
    npm run export:pdf:client
    npm run export:csv:client
    # Add validation script to check for forbidden tokens
```

## Security Best Practices

1. **Default to Safe**: Always default to client-safe mode ON
2. **Explicit Override**: Require explicit user action to disable client-safe mode
3. **Visual Indicators**: Show clear banners when client-safe mode is active
4. **Export Validation**: Test exports to ensure no sensitive data leaks
5. **Audit Trail**: Consider logging when client-safe mode is toggled off

## Sensitive Field Patterns

The following patterns are automatically flagged as sensitive:

- `hourly`, `rate`
- `internal`, `assumption`
- `model`, `buffer`
- `gain`, `multiplier`
- `overhead`, `margin`
- `allocation`, `efficiency`
- `velocity`, `discount`

## Backward Compatibility

- **Missing flag**: If `clientSafe` parameter is absent, defaults to `true` (safer default)
- **Explicit override**: Explicit `clientSafe=false` parameter overrides the default
- **UI state**: If toggle is not available, mode defaults to ON

## Future Enhancements

Potential improvements:
- Role-based access control (RBAC) for internal mode
- Watermarking of internal exports
- Audit logging of mode toggles
- Custom redaction rules per organization
- Encrypted internal exports
