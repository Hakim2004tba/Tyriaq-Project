"use client";

import { useTransition } from "react";
import { CustomFieldInput, toast } from "@flow/ui";
import type { CustomField, CustomFieldValue } from "@flow/types";
import { setFieldValue } from "@/lib/actions/custom-field";
import { Section } from "./panel-sections";

/**
 * The team's own columns, on one task.
 *
 * Rendered from definitions rather than from anything in this file:
 * adding a field is a row in `custom_fields`, not a change here. The
 * input for each type comes from the design system, which has had one
 * since before the tables existed.
 *
 * Saves on change rather than behind a button. Each field is a separate
 * value with its own row, so there is nothing to submit together — and
 * a Save button at the bottom of a panel people close by pressing
 * Escape loses whatever they typed.
 */
export function CustomFieldsSection({
  taskId,
  fields,
  values,
  onChange,
}: {
  taskId: string;
  fields: CustomField[];
  values: Record<string, CustomFieldValue>;
  onChange: (fieldId: string, value: CustomFieldValue) => void;
}) {
  const [pending, startTransition] = useTransition();

  if (fields.length === 0) return null;

  function save(field: CustomField, value: CustomFieldValue) {
    const previous = values[field.id] ?? null;
    onChange(field.id, value);

    startTransition(async () => {
      const result = await setFieldValue(taskId, field.id, value);
      if (result.error) {
        // Put the old value back: the input is showing something the
        // database refused.
        onChange(field.id, previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <Section title="Fields">
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <label key={field.id} className="flex flex-col gap-1.5">
            <span className="text-caption text-text-muted">
              {field.name}
              {field.projectId === null && (
                <span className="ml-1.5 text-text-muted/70">· everywhere</span>
              )}
            </span>
            <CustomFieldInput
              field={field}
              value={values[field.id] ?? null}
              disabled={pending}
              onChange={(next) => save(field, next)}
            />
          </label>
        ))}
      </div>
    </Section>
  );
}
