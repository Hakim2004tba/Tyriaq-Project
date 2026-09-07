import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import type { CustomField, CustomFieldValue } from "@flow/types";
import { cn } from "@flow/utils";
import { Input } from "../input/input";
import { Checkbox } from "../checkbox/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "../dropdown-menu/dropdown-menu";
import { Badge } from "../badge/badge";

export interface CustomFieldInputProps {
  field: CustomField;
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
  disabled?: boolean;
}

/**
 * Renders the right control for a field's type and reports value
 * changes back to the caller — never fetches or persists anything
 * itself. Extensibility point: a future field type needs exactly one
 * new `case` here, matching the same dispatch-on-fieldType pattern
 * already used in @flow/validation's validateCustomFieldValue.
 */
export function CustomFieldInput({ field, value, onChange, disabled }: CustomFieldInputProps) {
  switch (field.fieldType) {
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          placeholder="Empty"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          disabled={disabled}
          placeholder="Empty"
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
        />
      );

    case "checkbox":
      return <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked === true)} disabled={disabled} />;

    case "select": {
      const options = field.options ?? [];
      const selected = options.find((o) => o.id === value);
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-body-sm",
                "hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
                !selected && "text-text-muted"
              )}
            >
              {selected ? selected.label : "Empty"}
              <ChevronDown className="size-3.5 text-text-muted" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {value !== null && (
              <DropdownMenuItem onSelect={() => onChange(null)} className="text-text-muted">
                Clear
              </DropdownMenuItem>
            )}
            {options.map((option) => (
              <DropdownMenuItem key={option.id} onSelect={() => onChange(option.id)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    case "multi_select": {
      const options = field.options ?? [];
      const selectedIds = Array.isArray(value) ? value : [];
      const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

      function toggle(optionId: string) {
        const next = selectedIds.includes(optionId) ? selectedIds.filter((id) => id !== optionId) : [...selectedIds, optionId];
        onChange(next.length > 0 ? next : null);
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-border px-2 py-1",
                "hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {selectedOptions.length === 0 ? (
                <span className="px-1 text-body-sm text-text-muted">Empty</span>
              ) : (
                selectedOptions.map((o) => (
                  <Badge key={o.id} variant="neutral" className="gap-1">
                    {o.label}
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(o.id);
                      }}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </span>
                  </Badge>
                ))
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={selectedIds.includes(option.id)}
                onCheckedChange={() => toggle(option.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    default:
      return null;
  }
}
