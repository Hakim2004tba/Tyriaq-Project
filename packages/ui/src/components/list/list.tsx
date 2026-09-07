import * as React from "react";
import { cn } from "@flow/utils";

export const List = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} role="list" className={cn("flex flex-col divide-y divide-border", className)} {...props} />
  )
);
List.displayName = "List";

export interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  interactive?: boolean;
}

export const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, leading, trailing, interactive, children, ...props }, ref) => (
    <li
      ref={ref}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-body-sm text-text-primary",
        interactive && "cursor-pointer transition-colors hover:bg-surface-muted rounded-md",
        className
      )}
      {...props}
    >
      {leading}
      <div className="flex-1 min-w-0">{children}</div>
      {trailing}
    </li>
  )
);
ListItem.displayName = "ListItem";
