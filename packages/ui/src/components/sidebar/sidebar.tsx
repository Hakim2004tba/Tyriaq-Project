import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@flow/utils";

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Collapses to an icon-only rail. The caller owns the state (and any
   * width-dependent layout around the sidebar) — this only changes the
   * rendered width and padding. */
  collapsed?: boolean;
}

/**
 * The permanent app-shell rail.
 *
 * It renders one step darker than the canvas so it reads as *chrome*
 * rather than as another panel, and it lets the aurora bleed through its
 * top-left corner — the rail is where the brand light enters the
 * interface. Its right edge is a hairline, never a hard border.
 */
export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsed, children, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Primary"
      className={cn(
        // `min-w-0 overflow-hidden` is load-bearing, not cosmetic: a flex
        // item's automatic minimum size is its content's min-content width,
        // which silently overrides the 72px rail width and leaves the
        // collapsed sidebar stuck at its expanded size.
        "relative flex h-full min-w-0 shrink-0 flex-col gap-1 overflow-hidden",
        "border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-base ease-emphasized",
        collapsed ? "w-sidebar-rail px-2.5 py-3" : "w-sidebar px-3 py-3",
        className
      )}
      {...props}
    >
      {/* The rail's share of the aurora. Sits behind content, never
          scrolls, and is the only decorative layer in the shell. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.22),transparent_70%)]"
      />
      <div className="relative flex min-h-0 flex-1 flex-col gap-1">{children}</div>
    </nav>
  )
);
Sidebar.displayName = "Sidebar";

export function SidebarSection({
  label,
  action,
  children,
  collapsed,
  className,
}: {
  label?: string;
  /** Right-aligned affordance in the section header — "+" to add a space. */
  action?: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {label && !collapsed && (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-1 pt-5">
          <p className="text-overline uppercase text-sidebar-text-muted">{label}</p>
          {action}
        </div>
      )}
      {/* Collapsed sections still need separation, but a label would not
          fit the rail — a hairline stands in for it. */}
      {label && collapsed && <div className="tq-rule my-2.5" aria-hidden="true" />}
      {children}
    </div>
  );
}

export interface NavigationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  /** Render as the child element (e.g. a Next.js <Link>) instead of a
   * <button>, so navigation items can be real links without nesting
   * interactive elements. */
  asChild?: boolean;
  /** Icon-only rail state — hides everything but the leading icon and
   * shows a title tooltip instead. */
  collapsed?: boolean;
}

/**
 * A row in the rail.
 *
 * The active state is a violet-tinted fill plus a 2px bar on the left
 * edge — not a solid violet block. A saturated block for every visited
 * page would put a large area of accent colour permanently on screen and
 * flatten the hierarchy the glow rule is protecting.
 */
export const NavigationItem = React.forwardRef<HTMLButtonElement, NavigationItemProps>(
  ({ className, icon, active, badge, children, asChild = false, collapsed, title, ...props }, ref) => {
    const itemClassName = cn(
      "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-body-sm font-medium",
      "transition-colors duration-fast ease-emphasized",
      "focus-visible:outline-none focus-visible:shadow-focus",
      "disabled:pointer-events-none disabled:opacity-35",
      collapsed && "justify-center px-0",
      active
        ? "bg-sidebar-active-bg text-sidebar-active-text " +
            "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 " +
            "before:rounded-r-full before:bg-primary before:content-['']"
        : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
      className
    );

    if (asChild) {
      // Slot merges these props onto its single child (e.g. a <Link>),
      // which must already contain any icon/text content itself.
      return (
        <Slot
          ref={ref}
          aria-current={active ? "page" : undefined}
          className={itemClassName}
          title={collapsed ? title : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-current={active ? "page" : undefined}
        className={itemClassName}
        title={collapsed ? title : undefined}
        {...props}
      >
        {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{children}</span>
            {badge}
          </>
        )}
      </button>
    );
  }
);
NavigationItem.displayName = "NavigationItem";
