/**
 * Tests for Client-Safe Redaction Utilities
 */

import {
  isSensitiveField,
  redactEstimates,
  redactSettings,
  getClientSafeLabel,
  containsForbiddenTokens,
  EstimationTotals,
  Settings
} from '../../utils/estimation/redact';

describe('isSensitiveField', () => {
  it('should identify exact sensitive keys', () => {
    expect(isSensitiveField('hourlyRate')).toBe(true);
    expect(isSensitiveField('contributorCost')).toBe(true);
    expect(isSensitiveField('aiProductivityGain')).toBe(true);
    expect(isSensitiveField('totalOverhead')).toBe(true); // overhead is in the pattern list
  });

  it('should identify pattern-based sensitive keys', () => {
    expect(isSensitiveField('someHourlyValue')).toBe(true);
    expect(isSensitiveField('internalNotes')).toBe(true);
    expect(isSensitiveField('bufferPercent')).toBe(true);
    expect(isSensitiveField('totalStories')).toBe(false);
  });

  it('should not flag safe fields', () => {
    expect(isSensitiveField('totalStories')).toBe(false);
    expect(isSensitiveField('totalPoints')).toBe(false);
    expect(isSensitiveField('totalCost')).toBe(false);
    expect(isSensitiveField('totalDays')).toBe(false);
  });
});

describe('redactEstimates', () => {
  const mockEstimates: EstimationTotals = {
    totalStories: 10,
    totalPoints: 50,
    rawEffort: 400,
    adjustedEffort: 350,
    totalDays: 20,
    totalCost: 50000,
    scopeLimits: {
      overPoints: false,
      overHours: false,
      overDuration: false
    },
    aiProductivityGain: 50,
    contributorCount: 3,
    effectiveContributorCount: 2.5,
    productivityLossPercent: 15,
    communicationOverhead: 0.1,
    managementOverhead: 0.05,
    totalOverhead: 0.15
  };

  it('should preserve totals when client-safe is enabled', () => {
    const redacted = redactEstimates(mockEstimates, { clientSafe: true });
    
    expect(redacted.totalStories).toBe(10);
    expect(redacted.totalPoints).toBe(50);
    expect(redacted.totalDays).toBe(20);
    expect(redacted.totalCost).toBe(50000);
    expect(redacted.adjustedEffort).toBe(350);
  });

  it('should remove sensitive fields when client-safe is enabled', () => {
    const redacted = redactEstimates(mockEstimates, { clientSafe: true });
    
    expect(redacted.aiProductivityGain).toBeUndefined();
    expect(redacted.effectiveContributorCount).toBeUndefined();
    expect(redacted.productivityLossPercent).toBeUndefined();
    expect(redacted.communicationOverhead).toBeUndefined();
    expect(redacted.managementOverhead).toBeUndefined();
    expect(redacted.totalOverhead).toBeUndefined();
  });

  it('should preserve all fields when client-safe is disabled', () => {
    const redacted = redactEstimates(mockEstimates, { clientSafe: false });
    
    expect(redacted.aiProductivityGain).toBe(50);
    expect(redacted.effectiveContributorCount).toBe(2.5);
    expect(redacted.productivityLossPercent).toBe(15);
    expect(redacted.communicationOverhead).toBe(0.1);
  });
});

describe('redactSettings', () => {
  const mockSettings: Settings = {
    contributorCost: 1000,
    contributorCount: 3,
    hoursPerDay: 8,
    contributorAllocation: 80,
    pointsToHoursConversion: 8,
    aiProductivityFactors: {
      linesOfCode: 30,
      testing: 25,
      debugging: 20,
      systemDesign: 15,
      documentation: 35
    },
    aiSimulationEnabled: true
  };

  it('should only keep contributor count when client-safe is enabled', () => {
    const redacted = redactSettings(mockSettings, { clientSafe: true });
    
    expect(redacted.contributorCount).toBe(3);
    expect(redacted.contributorCost).toBeUndefined();
    expect(redacted.hoursPerDay).toBeUndefined();
    expect(redacted.contributorAllocation).toBeUndefined();
    expect(redacted.pointsToHoursConversion).toBeUndefined();
    expect(redacted.aiProductivityFactors).toBeUndefined();
  });

  it('should preserve all settings when client-safe is disabled', () => {
    const redacted = redactSettings(mockSettings, { clientSafe: false });
    
    expect(redacted.contributorCost).toBe(1000);
    expect(redacted.contributorCount).toBe(3);
    expect(redacted.hoursPerDay).toBe(8);
    expect(redacted.aiProductivityFactors).toBeDefined();
  });
});

describe('getClientSafeLabel', () => {
  it('should return client-friendly labels for sensitive fields', () => {
    expect(getClientSafeLabel('hourlyRate', 'Hourly Rate')).toBe('Rate');
    expect(getClientSafeLabel('contributorCost', 'Contributor Cost')).toBe('Team Cost');
    expect(getClientSafeLabel('aiProductivityGain', 'AI Productivity Gain')).toBe('Productivity Optimization');
  });

  it('should return default label for non-mapped fields', () => {
    expect(getClientSafeLabel('totalStories', 'Total Stories')).toBe('Total Stories');
    expect(getClientSafeLabel('customField', 'Custom Field')).toBe('Custom Field');
  });
});

describe('containsForbiddenTokens', () => {
  it('should detect forbidden tokens in content', () => {
    const content = 'The hourly rate is $150 per hour with a 10% overhead.';
    const result = containsForbiddenTokens(content);
    
    expect(result.hasForbidden).toBe(true);
    expect(result.tokens).toContain('hourly rate');
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it('should be case-insensitive', () => {
    const content = 'HOURLY RATE and AI GAIN are internal metrics.';
    const result = containsForbiddenTokens(content);
    
    expect(result.hasForbidden).toBe(true);
  });

  it('should not flag safe content', () => {
    const content = 'Total cost is $50,000 for 10 stories over 20 days.';
    const result = containsForbiddenTokens(content);
    
    expect(result.hasForbidden).toBe(false);
    expect(result.tokens).toHaveLength(0);
  });

  it('should detect multiple forbidden tokens', () => {
    const content = 'The contributor cost includes hourly rate, overhead %, and margin %.';
    const result = containsForbiddenTokens(content);
    
    expect(result.hasForbidden).toBe(true);
    expect(result.tokens.length).toBeGreaterThan(1);
  });
});
