import "server-only";

/**
 * What the mail looks like.
 *
 * Plain text is written first and HTML wraps it, rather than the other
 * way round: the text version is what reaches a watch, a terminal
 * client, or anybody whose mail app blocks images, and a text version
 * generated from HTML always reads like it.
 *
 * The HTML is deliberately plain — a table, inline styles, no images, no
 * web fonts. Mail clients are not browsers, and a design that survives
 * Outlook is a design with very little in it.
 */

function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Absolute, because a relative link in an email goes nowhere. */
export function absolute(path: string): string {
  return path.startsWith("http") ? path : `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface Line {
  title: string;
  body?: string | null;
  href?: string | null;
}

/**
 * One layout for everything.
 *
 * A heading, some lines, one button. Every message Tyriaq sends fits
 * that shape, and giving each its own template is how a product ends up
 * with five slightly different-looking emails.
 */
export function layout(input: {
  heading: string;
  intro?: string;
  lines?: Line[];
  action?: { label: string; href: string };
  footer?: string;
}): { text: string; html: string } {
  const parts: string[] = [input.heading, ""];
  if (input.intro) parts.push(input.intro, "");
  for (const line of input.lines ?? []) {
    parts.push(`• ${line.title}`);
    if (line.body) parts.push(`  ${line.body}`);
    if (line.href) parts.push(`  ${absolute(line.href)}`);
  }
  if ((input.lines ?? []).length > 0) parts.push("");
  if (input.action) parts.push(`${input.action.label}: ${absolute(input.action.href)}`, "");
  parts.push(input.footer ?? "You are receiving this because you use Tyriaq.");
  parts.push(`Change what reaches you: ${absolute("/settings/notifications")}`);

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0d0b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#151221;border:1px solid #2a2440;border-radius:12px;">
    <tr><td style="padding:24px;">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8b7fb8;">Tyriaq</p>
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#f2eeff;font-weight:600;">${escape(input.heading)}</h1>
      ${input.intro ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#b6acd4;">${escape(input.intro)}</p>` : ""}
      ${(input.lines ?? [])
        .map(
          (line) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px;background:#1c1830;border:1px solid #2a2440;border-radius:8px;">
        <tr><td style="padding:12px 14px;">
          ${
            line.href
              ? `<a href="${escape(absolute(line.href))}" style="font-size:14px;color:#c9bcff;text-decoration:none;font-weight:500;">${escape(line.title)}</a>`
              : `<span style="font-size:14px;color:#f2eeff;font-weight:500;">${escape(line.title)}</span>`
          }
          ${line.body ? `<div style="margin-top:4px;font-size:13px;line-height:1.5;color:#9c92bd;">${escape(line.body)}</div>` : ""}
        </td></tr></table>`
        )
        .join("")}
      ${
        input.action
          ? `<p style="margin:18px 0 0;"><a href="${escape(absolute(input.action.href))}" style="display:inline-block;padding:10px 18px;background:#7c5cff;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${escape(input.action.label)}</a></p>`
          : ""
      }
      <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #2a2440;font-size:12px;line-height:1.5;color:#7b7296;">
        ${escape(input.footer ?? "You are receiving this because you use Tyriaq.")}<br>
        <a href="${escape(absolute("/settings/notifications"))}" style="color:#9c92bd;">Change what reaches you</a>
      </p>
    </td></tr>
  </table>
</body></html>`;

  return { text: parts.join("\n"), html };
}
