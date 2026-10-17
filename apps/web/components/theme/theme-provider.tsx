"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Which palette the product is wearing.
 *
 * Three states, not two. "system" is a real choice — it means "follow
 * the machine", and collapsing it into whichever value the machine
 * happens to report right now loses the instruction: the person who
 * picked it wants the UI to change at sunset, and a stored "dark" would
 * not.
 */
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "tyriaq-theme";

interface ThemeContextValue {
  /** What the person chose, "system" included. */
  theme: Theme;
  /** What is actually on screen — "system" already resolved. */
  resolved: "light" | "dark";
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(prefers-color-scheme: light)").matches;
}

/**
 * Applied to <html>, which is also what the inline boot script writes
 * to — same attribute, same values, so the first client render agrees
 * with the server paint instead of fighting it.
 */
function apply(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  // Kept in sync because parts of the product (and Tailwind's own
  // `dark:` variant) key off the class rather than the attribute.
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  /*
    Starts as "dark" rather than reading storage, because this runs on
    the server too. The real value arrives in the effect below — by
    which point the inline boot script has ALREADY painted the correct
    palette, so there is no flash to see.
  */
  const [theme, setThemeState] = useState<Theme>("dark");
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    } catch {
      // Safari in private mode throws on localStorage. A theme is not
      // worth a blank screen.
    }
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
    setSystemDark(systemPrefersDark());

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemDark(!media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  /*
    `first` keeps the cross-fade off the initial paint. On mount the DOM
    already carries the right theme (the inline boot script put it
    there), so this run is a no-op that must not look like a switch.
  */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      apply(resolved);
      return;
    }

    const root = document.documentElement;
    root.setAttribute("data-theme-switching", "");
    apply(resolved);
    const timer = window.setTimeout(
      () => root.removeAttribute("data-theme-switching"),
      300
    );
    return () => window.clearTimeout(timer);
  }, [resolved]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Same as above — the choice just won't survive a reload.
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}
