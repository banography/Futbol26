/**
 * Format a UTC ISO string into a human-readable local time string.
 *
 * @param dateUtc - ISO-8601 UTC string, e.g. "2026-06-11T19:00:00Z"
 * @param timeZone - IANA timezone identifier, e.g. "America/New_York"
 * @returns e.g. "3:00 PM EDT"
 */
export function formatMatchTime(dateUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateUtc));
}

/**
 * Format a UTC ISO string into a human-readable local date string.
 *
 * @param dateUtc - ISO-8601 UTC string, e.g. "2026-06-11T19:00:00Z"
 * @param timeZone - IANA timezone identifier, e.g. "America/New_York"
 * @returns e.g. "Thu, Jun 11"
 */
export function formatMatchDate(dateUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateUtc));
}
