import * as React from "react";
import { Check } from "lucide-react";
import type { CustomField, CustomFieldValue } from "@flow/types";
import { formatTaskDate } from "../../lib/task-date";
import { Badge } from "../badge/badge";

export interface CustomFieldBadgeProps {
  field: CustomField;
  value: CustomFieldValue;
}

/** A compact, read-only rendering of a field's current value — used in
 * Task List rows and anywhere else a value needs to show without the
 * editing affordances CustomFieldInput provides. Renders nothing for
 * an empty value rather than an empty badge, so List rows don't fill
 * up with clutter for unset fields. */
export function CustomFieldBadge({ field, value }: CustomFieldBadgeProps) {
  if (value === null || value === undefined) return null;

  switch (field.fieldType) {
    case "text":
      return <span className="truncate text-caption text-text-secondary">{String(value)}</span>;

    case "number":
      return <span className="text-caption text-text-secondary">{String(value)}</span>;

    case "date":
      return <span className="text-caption text-text-secondary">{formatTaskDate(value as string)}</span>;

    case "checkbox":
      return value ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-success-subtle text-success">
          <Check className="size-2.5" aria-hidden="true" />
        </span>
      ) : null;

    case "select": {
      const option = field.options?.find((o) => o.id === value);
      if (!option) return null;
      return <Badge variant="neutral">{option.label}</Badge>;
    }

    case "multi_select": {
      const ids = Array.isArray(value) ? value : [];
      const options = (field.options ?? []).filter((o) => ids.includes(o.id));
      if (options.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((o) => (
            <Badge key={o.id} variant="neutral">
              {o.label}
            </Badge>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
