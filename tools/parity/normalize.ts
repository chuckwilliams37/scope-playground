/**
 * Normalization utilities for comparing JSON and ClickUp data
 * Ensures consistent comparison by trimming, collapsing whitespace, and normalizing case
 */

/**
 * Normalize a string for comparison:
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces into single space
 * - Lowercase for case-insensitive comparison
 */
export function normalizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalize an array of strings for set comparison
 */
export function normalizeStringArray(arr: string[]): string[] {
  return arr.map(normalizeString).sort();
}

/**
 * Compare two strings after normalization
 */
export function stringsMatch(a: string, b: string): boolean {
  return normalizeString(a) === normalizeString(b);
}

/**
 * Compare two string arrays as sets (order-independent, case-insensitive)
 */
export function stringArraysMatch(a: string[], b: string[]): boolean {
  const normA = normalizeStringArray(a);
  const normB = normalizeStringArray(b);

  if (normA.length !== normB.length) {
    return false;
  }

  return normA.every((item, index) => item === normB[index]);
}

/**
 * Get the difference between two string arrays
 */
export function getArrayDiff(
  a: string[],
  b: string[]
): { inAOnly: string[]; inBOnly: string[] } {
  const normA = normalizeStringArray(a);
  const normB = normalizeStringArray(b);

  const setA = new Set(normA);
  const setB = new Set(normB);

  const inAOnly = normA.filter((item) => !setB.has(item));
  const inBOnly = normB.filter((item) => !setA.has(item));

  return { inAOnly, inBOnly };
}

/**
 * Normalize title for comparison (trim and collapse whitespace, but preserve case for display)
 */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

/**
 * Compare titles (case-insensitive after normalization)
 */
export function titlesMatch(a: string, b: string): boolean {
  return normalizeString(a) === normalizeString(b);
}
