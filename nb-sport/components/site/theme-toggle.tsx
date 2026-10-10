"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Changer de thème"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-10 w-[4.5rem] items-center rounded-full border border-border bg-surface-2 transition-colors duration-300",
        className
      )}
    >
      <span
        className={cn(
          "absolute left-1 flex h-8 w-8 items-center justify-center rounded-full nb-gradient-accent shadow-[0_0_14px_rgba(57,255,138,0.45)] transition-transform duration-300 ease-out",
          isDark && "translate-x-[1.9rem]"
        )}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-accent-foreground" strokeWidth={2} />
        ) : (
          <Sun className="h-4 w-4 text-accent-foreground" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
