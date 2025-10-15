/**
 * Formatting utilities for estimation data
 * Ensures no sensitive labels leak in client-safe mode
 */

import { getClientSafeLabel } from './redact';

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with specified decimal places
 */
export function formatNumber(num: number, decimalPlaces: number = 2): number {
  return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
}

/**
 * Format a metric label for display
 * In client-safe mode, uses client-friendly labels
 */
export function formatMetricLabel(
  key: string,
  defaultLabel: string,
  clientSafe: boolean = false
): string {
  if (!clientSafe) {
    return defaultLabel;
  }
  
  return getClientSafeLabel(key, defaultLabel);
}

/**
 * Format duration in days to human-readable format
 */
export function formatDuration(days: number): string {
  const weeks = Math.floor(days / 7);
  const remainingDays = Math.ceil(days % 7);
  
  if (weeks === 0) {
    return `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  }
  
  if (remainingDays === 0) {
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
  
  return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
}
