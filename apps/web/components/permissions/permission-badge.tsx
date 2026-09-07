"use client";

import { ChevronDown, Crown, Eye, MessageSquare, Pencil, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flow/ui";
import { cn } from "@flow/utils";
import {
  PERMISSION_META,
  PERMISSION_ORDER,
  type PermissionLevel,
  type PermissionSource,
} from "@/lib/data/permissions";

const ICON: Record<PermissionLevel, typeof Eye> = {
  admin: Crown,
  editor: Pencil,
  commenter: MessageSquare,
  viewer: Eye,
};

/**
 * A permission, at a glance.
 *
 * Carries an icon as well as a colour: four levels distinguished only by
 * hue would be four badges somebody has to learn, and the one that
 * matters most — who can change things — should be readable without
 * decoding a palette.
 */
export function PermissionBadge({
  level,
  source,
  className,
}: {
  level: PermissionLevel;
  /** Shown as a small link glyph when the level came from somewhere else. */
  source?: PermissionSource;
  className?: string;
}) {
  const meta = PERMISSION_META[level];
  const Icon = ICON[level];
  const inherited = source === "space" || source === "workspace";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset",
        meta.tone,
        className
      )}
      title={meta.summary}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {meta.label}
      {inherited && <Link2 className="size-2.5 shrink-0 opacity-70" aria-label="Inherited" />}
    </span>
  );
}

/**
 * The badge, but changeable.
 *
 * The same shape as the static one so a row does not jump when somebody
 * turns out to have permission to edit it. "Revert to inherited" is
 * offered as its own item rather than as a fifth level — it removes the
 * override, which is a different act from setting one.
 */
export function PermissionPicker({
  level,
  source,
  onChange,
  onRevert,
  disabled,
  align = "end",
}: {
  level: PermissionLevel;
  source: PermissionSource;
  onChange: (level: PermissionLevel) => void;
  onRevert?: () => void;
  disabled?: boolean;
  align?: "start" | "end";
}) {
  if (disabled) return <PermissionBadge level={level} source={source} />;

  const meta = PERMISSION_META[level];
  const Icon = ICON[level];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-medium ring-1 ring-inset",
            "transition-colors duration-fast hover:brightness-110",
            "focus-visible:outline-none focus-visible:shadow-focus",
            meta.tone
          )}
        >
          <Icon className="size-3 shrink-0" aria-hidden="true" />
          {meta.label}
          <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-72">
        {[...PERMISSION_ORDER].reverse().map((option) => {
          const optionMeta = PERMISSION_META[option];
          const OptionIcon = ICON[option];
          return (
            <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
              <OptionIcon className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{optionMeta.label}</span>
                  {option === level && <span className="text-caption text-text-muted">· current</span>}
                </span>
                <span className="block text-caption text-text-muted">{optionMeta.summary}</span>
              </span>
            </DropdownMenuItem>
          );
        })}

        {onRevert && source === "project" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRevert}>
              <Link2 className="size-4" />
              <span className="min-w-0">
                <span className="block truncate">Use the inherited permission</span>
                <span className="block text-caption text-text-muted">
                  Removes this project&rsquo;s override
                </span>
              </span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
