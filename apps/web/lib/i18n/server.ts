import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { LOCALE_COOKIE } from "./config";
import { translator, type Translator } from "./messages";

/**
 * Which language this request is in.
 *
 * From a cookie rather than the URL. A `/ar/...` prefix would be the
 * textbook answer and it costs every link in the product a locale
 * segment, every route a duplicate, and every shared link the sender's
 * language — somebody in Algiers pasting a task into a group chat
 * should not hand an English reader an Arabic page.
 *
 * The trade is that language is per person rather than per address,
 * which is what a signed-in product wants anyway.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The translator for this request. */
export async function getT(): Promise<Translator> {
  return translator(await getLocale());
}
