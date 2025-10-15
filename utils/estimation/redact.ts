/**
 * Client-Safe Estimates Mode - Redaction Utilities
 * 
 * These utilities hide sensitive internal estimation data when sharing with clients.
 * Sensitive fields include: hourly rates, conversion factors, AI gains, overhead percentages, etc.
 */

export interface EstimationTotals {
  totalStories: number;
  totalPoints: number;
  rawEffort: number;
  adjustedEffort: number;
  totalDays: number;
  totalCost: number;
  scopeLimits?: {
    overPoints: boolean;
    overHours: boolean;
    overDuration: boolean;
  };
  aiProductivityGain?: number;
  contributorCount?: number;
  effectiveContributorCount?: number;
  productivityLossPercent?: number;
  communicationOverhead?: number;
  managementOverhead?: number;
  accountManagementOverhead?: number;
  selfManagedPartnerDiscount?: number;
  rampUpOverhead?: number;
  contextSwitchingOverhead?: number;
  totalOverhead?: number;
  [key: string]: any;
}

export interface Settings {
  contributorCost?: number;
  contributorCount?: number;
  hoursPerDay?: number;
  contributorAllocation?: number;
  pointsToHoursConversion?: number;
  aiProductivityFactors?: {
    linesOfCode?: number;
    testing?: number;
    debugging?: number;
    systemDesign?: number;
    documentation?: number;
  };
  aiSimulationEnabled?: boolean;
  selfManagedPartner?: {
    enabled?: boolean;
    managementReductionPercent?: number;
  };
  [key: string]: any;
}

// List of sensitive field keys to redact
const SENSITIVE_KEYS = [
  'hourlyRate',
  'contributorCost',
  'pointsToHours',
  'pointsToHoursConversion',
  'aiGainCap',
  'aiEfficiency',
  'aiProductivityGain',
  'aiProductivityFactors',
  'velocityBoost',
  'allocation',
  'contributorAllocation',
  'contributors',
  'contributorDetails',
  'overheadPct',
  'marginPct',
  'internalNotes',
  'assumptions',
  'buffer',
  'multiplier',
  'communicationOverhead',
  'managementOverhead',
  'accountManagementOverhead',
  'selfManagedPartnerDiscount',
  'rampUpOverhead',
  'contextSwitchingOverhead',
  'totalOverhead',
  'effectiveContributorCount',
  'productivityLossPercent',
  'aiSimulationEnabled',
  'selfManagedPartner'
];

// Patterns to match in field names (case-insensitive)
const SENSITIVE_PATTERNS = [
  /hourly/i,
  /rate/i,
  /internal/i,
  /assumption/i,
  /model/i,
  /buffer/i,
  /gain/i,
  /multiplier/i,
  /overhead/i,
  /margin/i,
  /allocation/i,
  /efficiency/i,
  /velocity/i,
  /discount/i
];

/**
 * Check if a field key is sensitive and should be redacted
 */
export function isSensitiveField(key: string): boolean {
  // Check exact matches
  if (SENSITIVE_KEYS.includes(key)) {
    return true;
  }
  
  // Check pattern matches
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Redact sensitive fields from estimation totals
 * Preserves totals but removes internal calculation inputs
 */
export function redactEstimates(
  estimates: EstimationTotals,
  options: { clientSafe: boolean } = { clientSafe: true }
): EstimationTotals {
  if (!options.clientSafe) {
    return estimates;
  }

  const redacted: EstimationTotals = {
    // Keep core totals
    totalStories: estimates.totalStories,
    totalPoints: estimates.totalPoints,
    totalDays: estimates.totalDays,
    totalCost: estimates.totalCost,
    rawEffort: estimates.rawEffort,
    adjustedEffort: estimates.adjustedEffort,
    scopeLimits: estimates.scopeLimits
  };

  // Copy non-sensitive fields
  Object.keys(estimates).forEach(key => {
    if (!isSensitiveField(key) && !(key in redacted)) {
      redacted[key] = estimates[key];
    }
  });

  return redacted;
}

/**
 * Redact sensitive fields from settings
 */
export function redactSettings(
  settings: Settings,
  options: { clientSafe: boolean } = { clientSafe: true }
): Partial<Settings> {
  if (!options.clientSafe) {
    return settings;
  }

  const redacted: Partial<Settings> = {
    // Keep only contributor count (team size is not sensitive)
    contributorCount: settings.contributorCount
  };

  return redacted;
}

/**
 * Get client-safe label for a metric
 * Replaces technical/internal labels with client-friendly ones
 */
export function getClientSafeLabel(key: string, defaultLabel: string): string {
  const labelMap: Record<string, string> = {
    'hourlyRate': 'Rate',
    'contributorCost': 'Team Cost',
    'pointsToHoursConversion': 'Effort Calculation',
    'aiProductivityGain': 'Productivity Optimization',
    'contributorAllocation': 'Team Availability',
    'effectiveContributorCount': 'Effective Team Size',
    'productivityLossPercent': 'Team Efficiency Factor'
  };

  return labelMap[key] || defaultLabel;
}

/**
 * Check if content contains forbidden tokens when in client-safe mode
 * Used for CI validation of exports
 */
export function containsForbiddenTokens(content: string): { 
  hasForbidden: boolean; 
  tokens: string[] 
} {
  const forbiddenTokens = [
    'hourly rate',
    'hourlyRate',
    'contributor cost',
    'contributorCost',
    'points to hours',
    'pointsToHours',
    'AI gain',
    'aiGain',
    'overhead %',
    'overheadPct',
    'margin %',
    'marginPct',
    'allocation %',
    'internal note',
    'assumption',
    'buffer',
    'multiplier',
    'velocity boost',
    'efficiency factor'
  ];

  const found: string[] = [];
  const lowerContent = content.toLowerCase();

  forbiddenTokens.forEach(token => {
    if (lowerContent.includes(token.toLowerCase())) {
      found.push(token);
    }
  });

  return {
    hasForbidden: found.length > 0,
    tokens: found
  };
}
