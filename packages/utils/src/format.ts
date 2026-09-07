/** Relative time formatting, e.g. "2m ago", "3h ago", "May 21". */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "1h 24m", "45m", "32s" — for tracked-time display. Never shows more
 * than two units (matches formatFileSize's "keep it glanceable" style). */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Formats a time ESTIMATE, stored in minutes, into the same "16h" /
 * "6h 20m" shape formatDuration() produces for tracked seconds — so an
 * estimate and the time tracked against it read in one visual language
 * when shown side by side. */
export function formatEstimate(totalMinutes: number): string {
  return formatDuration(totalMinutes * 60);
}

/** Parses human estimate input into whole minutes, or null if the input
 * is empty/unparseable. Accepts "16h", "1h 30m", "90m", "1.5h", and a
 * bare number (read as hours, which is what people mean when they type
 * "2" into an estimate field). Returns null rather than throwing —
 * callers surface the "we couldn't read that" message themselves. */
export function parseEstimate(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // Bare number => hours.
  if (/^\d+(\.\d+)?$/.test(text)) {
    const minutes = Math.round(parseFloat(text) * 60);
    return minutes > 0 ? minutes : null;
  }

  const pattern = /(\d+(?:\.\d+)?)\s*([hm])/g;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const [, amount, unit] = match;
    if (amount === undefined || unit === undefined) continue;
    matched = true;
    const value = parseFloat(amount);
    total += unit === "h" ? value * 60 : value;
  }

  if (!matched) return null;
  const minutes = Math.round(total);
  return minutes > 0 ? minutes : null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** "Acme Corp!" -> "acme-corp". Used to derive a workspace slug from its name. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Appends a short random suffix, for retrying a slug that's already taken. */
export function withRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug.slice(0, 42)}-${suffix}`;
}

/** "WEB-123" — the human-friendly task identifier, derived from the
 * project slug + the task's per-project sequential number (never the
 * task's UUID). Shared by web and mobile so the format never diverges. */
export function getTaskIdentifier(projectSlug: string, taskNumber: number): string {
  const prefix = projectSlug.split("-")[0]?.slice(0, 5).toUpperCase() || "TASK";
  return `${prefix}-${taskNumber}`;
}

