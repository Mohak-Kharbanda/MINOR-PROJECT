/**
 * Due dates and deadlines are calendar dates. A date-only value such as
 * "2026-11-20" is stored as the end of that day (23:59:59.999 UTC), so a task
 * only becomes overdue after its due day has ended, and the web app can show
 * the same calendar date in every timezone.
 */
export function parseDueDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59.999Z`);
  return new Date(value);
}
