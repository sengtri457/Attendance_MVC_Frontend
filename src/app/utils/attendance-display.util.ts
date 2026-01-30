/**
 * Shared attendance rate display utilities.
 * Centralizes threshold logic to avoid duplication and magic numbers.
 */

const RATE_GOOD = 90;
const RATE_WARNING = 75;
const RATE_CRITICAL = 50;

/** Parse attendance rate string (e.g. "85%" or "85") to number. */
export function parseAttendanceRate(rate: string): number {
  return parseFloat(String(rate).replace('%', '')) || 0;
}

/** Bootstrap badge class for attendance rate (success / warning / danger). */
export function getStatusColor(rate: string): string {
  const n = parseAttendanceRate(rate);
  if (n >= RATE_GOOD) return 'success';
  if (n >= RATE_WARNING) return 'warning';
  return 'danger';
}

/** Risk level label: Critical / At Risk / Monitor. */
export function getRiskLevel(rate: string): string {
  const n = parseAttendanceRate(rate);
  if (n < RATE_CRITICAL) return 'Critical';
  if (n < RATE_WARNING) return 'At Risk';
  return 'Monitor';
}

/** Full badge class for risk (badge-danger / badge-warning / badge-info). */
export function getRiskBadgeClass(rate: string): string {
  const n = parseAttendanceRate(rate);
  if (n < RATE_CRITICAL) return 'badge-danger';
  if (n < RATE_WARNING) return 'badge-warning';
  return 'badge-info';
}
