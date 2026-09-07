import * as React from "react";
import { Plus, X, Type, Hash, ChevronDownSquare, ListChecks, Calendar, CheckSquare } from "lucide-react";
import type { CustomField, CustomFieldType, CustomFieldOption } from "@flow/types";
import { CUSTOM_FIELD_TYPES } from "@flow/types";
import { cn } from "@flow/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../dialog/dialog";
import { Input } from "../input/input";
import { Button } from "../button/button";
import { FormField } from "../form-field/form-field";
import { Alert } from "../alert/alert";

const TYPE_META: Record<CustomFieldType, { label: string; icon: React.ElementType }> = {
  text: { label: "Text", icon: Type },
  number: { label: "Number", icon: Hash },
  select: { label: "Select", icon: ChevronDownSquare },
  multi_select: { label: "Multi-select", icon: ListChecks },
  date: { label: "Date", icon: Calendar },
  checkbox: { label: "Checkbox", icon: CheckSquare },
};

export interface CustomFieldConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingField?: CustomField;
  error?: string | null;
  pending?: boolean;
  onSubmit: (input: { name: string; fieldType: CustomFieldType; options?: CustomFieldOption[] }) => void;
}

let optionIdCounter = 0;
function nextOptionId() {
  optionIdCounter += 1;
  return `opt-${Date.now()}-${optionIdCounter}`;
}

/** Create/edit a field definition. Type is locked once a field exists
 * (changing it out from under existing task values could silently
 * corrupt them). The options editor only appears for
 * select/multi_select — same type-dispatch principle as
 * CustomFieldInput. */
export function CustomFieldConfigDialog({ open, onOpenChange, editingField, error, pending, onSubmit }: CustomFieldConfigDialogProps) {
  const [name, setName] = React.useState(editingField?.name ?? "");
  const [fieldType, setFieldType] = React.useState<CustomFieldType>(editingField?.fieldType ?? "text");
  const [options, setOptions] = React.useState<CustomFieldOption[]>(editingField?.options ?? []);

  React.useEffect(() => {
    if (open) {
      setName(editingField?.name ?? "");
      setFieldType(editingField?.fieldType ?? "text");
      setOptions(editingField?.options ?? []);
    }
  }, [open, editingField]);

  const needsOptions = fieldType === "select" || fieldType === "multi_select";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, fieldType, options: needsOptions ? options : undefined });
  }

  function addOption() {
    setOptions((prev) => [...prev, { id: nextOptionId(), label: "" }]);
  }

  function updateOption(id: string, label: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  }

  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingField ? "Edit field" : "New custom field"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormField label="Name" htmlFor="field-name">
            <Input id="field-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Story Points" required autoFocus />
          </FormField>

          <FormField label="Type" htmlFor="field-type">
            <div className="grid grid-cols-3 gap-2">
              {CUSTOM_FIELD_TYPES.map((type) => {
                const { label, icon: Icon } = TYPE_META[type];
                const active = fieldType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={Boolean(editingField)}
                    onClick={() => setFieldType(type)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-caption transition-colors",
                      active ? "border-primary bg-primary-subtle text-primary" : "border-border text-text-secondary hover:bg-surface-muted",
                      editingField && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            {editingField && <p className="mt-1 text-caption text-text-muted">A field&apos;s type can&apos;t be changed after creation.</p>}
          </FormField>

          {needsOptions && (
            <FormField label="Options" htmlFor="field-options">
              <div className="flex flex-col gap-2">
                {options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input value={option.label} onChange={(e) => updateOption(option.id, e.target.value)} placeholder="Option label" />
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove option" onClick={() => removeOption(option.id)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addOption} className="w-fit">
                  <Plus className="size-3.5" />
                  Add option
                </Button>
              </div>
            </FormField>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editingField ? "Save" : "Create field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
