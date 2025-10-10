import { Story, STATUS_SET, POLICIES } from './types';

/**
 * Normalize a story according to policies
 */
export function normalizeStory(story: Story): Story {
  return {
    ...story,
    title: normalizeText(story.title),
    userStory: normalizeText(story.userStory),
    category: story.category ? normalizeText(story.category) : undefined,
    status: normalizeStatus(story.status),
    acceptanceCriteria: normalizeAcceptanceCriteria(story.acceptanceCriteria || []),
    tags: normalizeTags(story.tags || []),
  };
}

/**
 * Trim and collapse whitespace
 */
export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize status to canonical STATUS_SET value
 */
export function normalizeStatus(status: string): string {
  const normalized = status.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Try exact match first
  const exactMatch = STATUS_SET.find(s => s === normalized);
  if (exactMatch) return exactMatch;
  
  // Try fuzzy match (contains or partial)
  const fuzzyMatch = STATUS_SET.find(s => 
    normalized.includes(s) || s.includes(normalized)
  );
  
  if (fuzzyMatch) return fuzzyMatch;
  
  // Return original if no match (will be flagged)
  return status;
}

/**
 * Normalize acceptance criteria: trim, dedupe, sort
 */
export function normalizeAcceptanceCriteria(criteria: string[]): string[] {
  const normalized = criteria
    .map(c => normalizeText(c))
    .filter(c => c.length > 0);
  
  // Dedupe
  const unique = Array.from(new Set(normalized));
  
  // Sort alphabetically
  return unique.sort();
}

/**
 * Normalize tags: lowercase, sort
 */
export function normalizeTags(tags: string[]): string[] {
  if (!POLICIES.tags.lowercase && !POLICIES.tags.sorted) {
    return tags;
  }
  
  let normalized = tags.map(t => t.trim()).filter(t => t.length > 0);
  
  if (POLICIES.tags.lowercase) {
    normalized = normalized.map(t => t.toLowerCase());
  }
  
  // Dedupe
  normalized = Array.from(new Set(normalized));
  
  if (POLICIES.tags.sorted) {
    normalized.sort();
  }
  
  return normalized;
}

/**
 * Normalize business value to exact canonical form
 */
export function normalizeBusinessValue(value: string): 'Critical' | 'Important' | 'Nice to Have' {
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('critical') || normalized.includes('high')) {
    return 'Critical';
  }
  
  if (normalized.includes('important') || normalized.includes('medium')) {
    return 'Important';
  }
  
  if (normalized.includes('nice') || normalized.includes('low')) {
    return 'Nice to Have';
  }
  
  // Default to Important if unclear
  return 'Important';
}

/**
 * Check if status is in canonical set
 */
export function isValidStatus(status: string): boolean {
  return STATUS_SET.includes(status as any);
}

/**
 * Compare two normalized strings for equality
 */
export function areEqual(a: string, b: string): boolean {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}

/**
 * Compare two arrays for equality (order-independent)
 */
export function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  
  return sortedA.every((val, idx) => areEqual(val, sortedB[idx]));
}
