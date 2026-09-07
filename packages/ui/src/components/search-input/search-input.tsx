import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@flow/utils";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  shortcut?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, shortcut, placeholder = "Search…", ...props }, ref) => (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        role="searchbox"
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-md border border-border bg-surface pl-9 pr-16 text-body text-text-primary",
          "placeholder:text-text-muted transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
          "read-only:bg-surface-muted read-only:hover:bg-surface-muted/70 read-only:cursor-pointer read-only:border-transparent",
          className
        )}
        {...props}
      />
      {shortcut && (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-muted px-1.5 py-0.5 text-caption text-text-muted">
          {shortcut}
        </kbd>
      )}
    </div>
  )
);
SearchInput.displayName = "SearchInput";
