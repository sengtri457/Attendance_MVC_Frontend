/**
 * Shared date formatting utilities.
 * Use these instead of duplicating formatDate across components.
 */

/** Format a Date as ISO date string (YYYY-MM-DD). */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Format a date string for display (e.g. "Jan 15, 2025"). */
export function formatDateLocale(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a date string as full locale date-time. */
export function formatDateTimeLocale(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
