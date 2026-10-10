const dzd = new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 });

/** Formats a DZD amount, e.g. 1250000 -> "1 250 000 DA". */
export function formatCurrencyDA(amount: number): string {
  return `${dzd.format(amount)} DA`;
}

/** Formats a DZD amount in compact form, e.g. 8450000 -> "8,45 M DA". */
export function formatCurrencyCompactDA(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("fr-DZ", { maximumFractionDigits: 2 })} M DA`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toLocaleString("fr-DZ", { maximumFractionDigits: 0 })} K DA`;
  }
  return formatCurrencyDA(amount);
}

/** Formats an ISO date string as a short French date, e.g. "28 avr. 2026". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Formats an ISO date string as a short French date + time, e.g. "28 avr. 2026, 14:30". */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** Formats an ISO date string as a short French relative time, e.g. "il y a 5 min". */
export function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();

  for (const [unit, ms] of UNITS) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "à l'instant";
}

/** Very small heuristic device/browser label extracted from a user-agent string. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";

  const isMobile = /mobile/i.test(userAgent);
  let browser = "Navigateur";
  if (/edg\//i.test(userAgent)) browser = "Edge";
  else if (/chrome\//i.test(userAgent)) browser = "Chrome";
  else if (/firefox\//i.test(userAgent)) browser = "Firefox";
  else if (/safari\//i.test(userAgent)) browser = "Safari";

  let os = "";
  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/mac os/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad/i.test(userAgent)) os = "iOS";
  else if (/linux/i.test(userAgent)) os = "Linux";

  return [browser, os && `sur ${os}`, isMobile && "(mobile)"].filter(Boolean).join(" ");
}
