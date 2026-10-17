"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
} from "@flow/ui";
import { cn } from "@flow/utils";
import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match system", icon: Monitor },
];

/**
 * The palette switch.
 *
 * A menu rather than a two-way toggle, because there are three states
 * and "match system" is the one a toggle cannot express — a person who
 * wants the UI to follow sunset has no way to say so by flipping a
 * switch, and whichever value the switch landed on would silently
 * become a permanent override.
 *
 * The trigger shows what is ON SCREEN, not what was chosen: under
 * "match system" at night, a monitor glyph tells you less than the moon
 * does. What was chosen is still visible — it's the checked row.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label={`Theme: ${theme === "system" ? "match system" : theme}`}
          className={cn("relative", className)}
        >
          {/*
            Both glyphs are always mounted and cross-faded, rather than
            one being swapped for the other. A swap cannot be animated —
            the outgoing node is gone before any transition starts — and
            the rotation is what makes this read as a sunrise rather
            than as a flicker.
          */}
          <Sun
            className={cn(
              "absolute size-[18px] transition-all duration-slow ease-emphasized",
              resolved === "light"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-50 opacity-0"
            )}
            aria-hidden="true"
          />
          <Moon
            className={cn(
              "absolute size-[18px] transition-all duration-slow ease-emphasized",
              resolved === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-50 opacity-0"
            )}
            aria-hidden="true"
          />
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => setTheme(option.id)}>
            <span className="flex size-4 items-center justify-center">
              {theme === option.id && <Check className="size-3.5" />}
            </span>
            <option.icon className="size-4 text-text-muted" aria-hidden="true" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
