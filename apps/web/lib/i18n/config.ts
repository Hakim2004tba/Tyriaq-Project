/**
 * Languages Tyriaq speaks.
 *
 * Arabic is not a translation of this product, it is the point of it.
 * ClickUp has no Arabic-first version and will not build one — the
 * market is not their priority — which makes this the one thing a
 * competitor cannot copy by writing a cheque.
 *
 * Pure data, no imports: this is read by the middleware, by server
 * components and by the browser bundle.
 */

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** The cookie the choice lives in. Read on the server, set in the browser. */
export const LOCALE_COOKIE = "tyriaq_locale";

export const LOCALE_META: Record<Locale, { label: string; native: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", native: "English", dir: "ltr" },
  ar: { label: "Arabic", native: "العربية", dir: "rtl" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value !== null && value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
