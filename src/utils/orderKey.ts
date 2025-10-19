/**
 * Utilities for managing orderKey values for sibling ordering
 * Uses fractional keys between siblings for efficient reordering
 */

/**
 * Compute midpoint between two orderKey values
 * Returns null if the midpoint would be too close to either value (requires reindexing)
 * @param a - OrderKey of previous sibling (null if inserting at start)
 * @param b - OrderKey of next sibling (null if inserting at end)
 * @returns Midpoint value or null if reindexing needed
 */
export function midpoint(a: number | null, b: number | null): number | null {
  // Both null: return default starting value
  if (a == null && b == null) return 1000;

  // Only before: insert 1000 units before
  if (a == null && b != null) return b - 1000;

  // Only after: insert 1000 units after
  if (a != null && b == null) return a + 1000;

  // Both defined: compute midpoint
  const m = ((a as number) + (b as number)) / 2;

  // Check if midpoint is too close to either boundary (precision loss)
  if (
    Math.abs(m - (a as number)) < 1e-6 ||
    Math.abs((b as number) - m) < 1e-6
  ) {
    return null; // Signal that reindexing is needed
  }

  return m;
}

/**
 * Generate new orderKey values for reindexing siblings
 * Distributes keys evenly with spacing
 * @param count - Number of siblings to reindex
 * @param startKey - Starting orderKey value (default 1000)
 * @param spacing - Spacing between keys (default 1000)
 * @returns Array of new orderKey values
 */
export function generateOrderKeys(
  count: number,
  startKey: number = 1000,
  spacing: number = 1000
): number[] {
  const keys: number[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(startKey + i * spacing);
  }
  return keys;
}
