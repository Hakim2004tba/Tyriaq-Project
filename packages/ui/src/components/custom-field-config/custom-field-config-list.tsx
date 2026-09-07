import * as React from "react";
import { Plus, MoreHorizontal, Type, Hash, ChevronDownSquare, ListChecks, Calendar, CheckSquare, Layers } from "lucide-react";
import type { CustomField, CustomFieldType } from "@flow/types";
import { Button } from "../button/button";
import { IconButton } from "../button/icon-button";
import { EmptyState } from "../empty-state/empty-state";
import { Skeleton } from "../skeleton/skeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../dropdown-menu/dropdown-menu";

const TYPE_META: Record<CustomFieldType, { label: string; icon: React.ElementType }> = {
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  select: { label: "Select", icon: ChevronDownSquare },
  multi_select: { label: "Multi-select", icon: ListChecks },
  date: { label: "Date", icon: Calendar },
  checkbox: { label: "Checkbox", icon: CheckSquare },
};

export interface CustomFieldConfigListProps {
  fields: CustomField[];
  loading?: boolean;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (field: CustomField) => void;
  onDelete: (field: CustomField) => void;
}

/** The Project Settings → Custom Fields surface: a plain list, one row
 * per field, with a type badge and edit/delete actions — deliberately
 * simple rather than a heavy data-grid, since a project typically has
 * a handful of fields, not hundreds. */
export function CustomFieldConfigList({ fields, loading, canManage, onAdd, onEdit, onDelete }: CustomFieldConfigListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-label text-text-primary">Custom fields</h2>
          <p className="text-caption text-text-muted">Track extra details on tasks in this project.</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="size-3.5" />
            Add field
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-5" />}
          title="No custom fields yet"
          description="Add fields like Story Points, Severity, or Sprint to track what matters for this project."
          action={canManage ? <Button onClick={onAdd}>Add field</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col divide-y divide-border">
            {fields.map((field) => {
              const { label, icon: Icon } = TYPE_META[field.fieldType];
              return (
                <div key={field.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-muted text-text-secondary">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-text-primary">{field.name}</p>
                    <p className="text-caption text-text-muted">
                      {label}
                      {field.options && field.options.length > 0 ? ` · ${field.options.length} option${field.options.length === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton label={`Actions for ${field.name}`} variant="ghost" className="size-7">
                          <MoreHorizontal className="size-3.5" />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(field)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => onDelete(field)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
