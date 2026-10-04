"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_COOKIE, type Locale } from "./config";
import { translator, type MessageKey, type Translator } from "./messages";

interface LocaleValue {
  locale: Locale;
  t: Translator;
  setLocale: (next: Locale) => void;
}

const Ctx = createContext<LocaleValue | null>(null);

/**
 * The language, for everything below it.
 *
 * The dictionary is built once per locale rather than per render — it
 * is a closure over a frozen object, and rebuilding it on every render
 * would make `t` a new function each time and re-render every memoised
 * component that takes it.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const setLocale = useCallback((next: Locale) => {
    /*
      Written here and then the page is RELOADED, not re-rendered.

      `dir` lives on <html>, which React does not own, and half the
      product is server-rendered — so flipping language in place would
      leave Arabic text in a left-to-right layout until the next
      navigation. A reload is one second and always correct.
    */
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({ locale, t: translator(locale), setLocale }),
    [locale, setLocale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return value;
}

/** The common case: just the translator. */
export function useT(): Translator {
  return useLocale().t;
}

export type { MessageKey };
