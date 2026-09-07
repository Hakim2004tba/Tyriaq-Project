"use client";

// The directive must be the FIRST line of the file — Next does not
// detect it behind a leading comment block, and this module would be
// evaluated in the RSC graph where createContext throws.
// Radix Tabs is interactive throughout, and TabsList shares its variant
// with TabsTrigger through context, so the client boundary belongs here.

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@flow/utils";

export const Tabs = TabsPrimitive.Root;

type TabsVariant = "underline" | "pill";

const TabsVariantContext = React.createContext<TabsVariant>("underline");

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /**
   * `underline` — page and object navigation (project views, profile
   * sections). Sits directly on the canvas, no container.
   * `pill` — segmented control for switching a view's mode inside a
   * panel, where an underline would fight the panel's own edges.
   */
  variant?: TabsVariant;
}

export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant = "underline", ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          variant === "underline"
            ? "inline-flex items-center gap-1 border-b border-border"
            : "inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted p-1",
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
);
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm font-medium",
        "text-text-secondary transition-all duration-fast ease-emphasized hover:text-text-primary",
        "focus-visible:outline-none focus-visible:shadow-focus",
        "disabled:pointer-events-none disabled:opacity-40 disabled:hover:text-text-secondary",
        variant === "underline"
          ? // The active marker is a violet bar drawn on the shared bottom
            // border via ::after, so tabs don't shift by a pixel when the
            // selection moves.
            "rounded-t-sm px-3 pb-2.5 pt-2 data-[state=active]:text-text-primary " +
              "after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full " +
              "after:bg-brand after:opacity-0 after:transition-opacity after:duration-fast " +
              "data-[state=active]:after:opacity-100"
          : "rounded-[7px] px-3 py-1 data-[state=active]:bg-surface-elevated " +
              "data-[state=active]:text-text-primary data-[state=active]:shadow-rim",
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-5 rounded-sm focus-visible:outline-none focus-visible:shadow-focus", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
