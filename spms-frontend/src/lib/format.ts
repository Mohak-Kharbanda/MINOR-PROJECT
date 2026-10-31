const DAY = 24 * 60 * 60 * 1000;

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, opts);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function timeAgo(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const sign = diff > 0 ? -1 : 1;
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return rtf.format(sign * Math.round(abs / 60_000), "minute");
  if (abs < DAY) return rtf.format(sign * Math.round(abs / 3_600_000), "hour");
  if (abs < 30 * DAY) return rtf.format(sign * Math.round(abs / DAY), "day");
  return formatDate(value);
}

/** Calendar date of a due date/deadline (stored as end-of-day UTC), same in every timezone. */
export function formatDay(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
}

/** Whole days from today (local calendar) to the due date's calendar day. */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const due = new Date(value);
  const now = new Date();
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDay - today) / DAY);
}

/** "Due in 3 days", "Due today", "2 days overdue" */
export function dueLabel(value: string | null | undefined, done = false) {
  if (!value) return "No due date";
  if (done) return `Due ${formatDay(value, { day: "numeric", month: "short" })}`;
  const days = daysUntil(value)!;
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Value for <input type="date"> — the stored calendar date (UTC). */
export function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}
