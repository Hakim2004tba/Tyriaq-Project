/**
 * Turning rows into a spreadsheet.
 *
 * Excel is where this data goes next in most organisations — a manager
 * asks for "the list" and means a file they can sort and send on — so
 * this is not an export feature, it is the handover between the product
 * and the tool the rest of the company already uses.
 *
 * Three details that decide whether the file opens correctly:
 *
 *   · A BOM. Without it Excel reads UTF-8 as the local code page and
 *     every Arabic and accented character arrives as mojibake. It is
 *     three bytes and it is the difference between a usable file and a
 *     support request.
 *
 *   · Values are quoted whenever they contain a comma, a quote or a
 *     newline, and quotes inside are doubled. A task called
 *     `Design "the" hero, again` must not become three columns.
 *
 *   · A leading `=`, `+`, `-` or `@` is prefixed with a single quote.
 *     Spreadsheets treat those as formulas, so a task titled
 *     `=SUM(A1:A9)` would execute on open — CSV injection, and the
 *     reason a file from a task tracker is a plausible attack.
 */

export type CsvValue = string | number | boolean | null | undefined;

function escape(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);

  // Neutralise anything a spreadsheet would treat as a formula.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(columns: string[], rows: CsvValue[][]): string {
  const lines = [columns.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  // CRLF, which is what every spreadsheet expects from a .csv.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/**
 * Hands the file to the browser.
 *
 * An anchor with `download` rather than navigating: navigation would
 * leave the app, and on a blob URL some browsers show the CSV as text
 * instead of saving it.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: revoking synchronously can cancel the
  // download in Safari before it has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `tyriaq-hakathon-tasks-2026-09-24.csv` — sortable, and says what it is. */
export function csvFilename(...parts: string[]): string {
  const slug = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `tyriaq-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
}
