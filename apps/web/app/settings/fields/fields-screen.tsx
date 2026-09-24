"use client";

import { useState, useTransition } from "react";
import { Layers } from "lucide-react";
import {
  CustomFieldConfigDialog,
  CustomFieldConfigList,
  SectionCard,
  toast,
} from "@flow/ui";
import type { CustomField, CustomFieldOption, CustomFieldType } from "@flow/types";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { archiveField, createField, updateField } from "@/lib/actions/custom-field";

/**
 * Where custom fields are defined.
 *
 * Grouped by scope, because the distinction is the whole point: a
 * workspace field appears on every task in the company, and a project
 * field only on one board. Somebody adding "Client" needs to know which
 * one they are making before they make it, not afterwards.
 */
export function FieldsScreen({
  fields,
  projects,
  canManage,
}: {
  fields: CustomField[];
  projects: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState(fields);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [scope, setScope] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CustomField | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function submit(values: {
    name: string;
    fieldType: CustomFieldType;
    options?: CustomFieldOption[];
  }) {
    setError(undefined);
    startTransition(async () => {
      const result = editing
        ? await updateField({ id: editing.id, ...values })
        : await createField({ ...values, projectId: scope });

      if (result.error) {
        // Kept in the dialog rather than a toast: the dialog stays open,
        // and an error about a name is only useful next to the name.
        setError(result.error);
        return;
      }

      setOpen(false);
      setEditing(null);
      toast.success(result.message ?? "Saved.");

      // The server has the truth; this keeps the list honest until the
      // page revalidates underneath it.
      if (editing) {
        setRows((current) =>
          current.map((field) =>
            field.id === editing.id
              ? { ...field, name: values.name, fieldType: values.fieldType, options: values.options ?? null }
              : field
          )
        );
      }
    });
  }

  const workspaceFields = rows.filter((field) => field.projectId === null);
  const projectFields = rows.filter((field) => field.projectId !== null);

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-h1 text-text-primary">Custom fields</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          The columns your team keeps that Tyriaq did not think of — a client reference, a budget, a
          print run. Without them that information ends up in the task title, where nothing can
          filter or total it.
        </p>
      </header>

      <SectionCard
        title="Everywhere"
        subtitle="On every task in the workspace"
      >
        <CustomFieldConfigList
          fields={workspaceFields}
          canManage={canManage}
          onAdd={() => {
            setEditing(null);
            setScope(null);
            setError(undefined);
            setOpen(true);
          }}
          onEdit={(field) => {
            setEditing(field);
            setScope(field.projectId);
            setError(undefined);
            setOpen(true);
          }}
          onDelete={setRemoving}
        />
      </SectionCard>

      {projects.map((project) => {
        const mine = projectFields.filter((field) => field.projectId === project.id);
        if (mine.length === 0 && !canManage) return null;
        return (
          <SectionCard
            key={project.id}
            title={project.name}
            subtitle="Only on this project's tasks"
          >
            <CustomFieldConfigList
              fields={mine}
              canManage={canManage}
              onAdd={() => {
                setEditing(null);
                setScope(project.id);
                setError(undefined);
                setOpen(true);
              }}
              onEdit={(field) => {
                setEditing(field);
                setScope(field.projectId);
                setError(undefined);
                setOpen(true);
              }}
              onDelete={setRemoving}
            />
          </SectionCard>
        );
      })}

      {projects.length === 0 && (
        <p className="flex items-center gap-2 text-body-sm text-text-muted">
          <Layers className="size-4" aria-hidden="true" />
          Make a project and you can give it fields of its own.
        </p>
      )}

      <CustomFieldConfigDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setEditing(null);
            setError(undefined);
          }
        }}
        editingField={editing ?? undefined}
        error={error}
        pending={pending}
        onSubmit={submit}
      />

      {/*
        "Remove" archives. Said in the dialog, because the button says
        remove and the outcome is not what that word usually means — and
        somebody who expected deletion should find out before pressing
        it, not when the data comes back.
      */}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        description={
          <>
            It disappears from every board, and the values people already entered are kept — so
            adding it back brings them with it. Nothing is deleted.
          </>
        }
        confirmLabel="Remove"
        onConfirm={() => {
          const field = removing;
          if (!field) return;
          const previous = rows;
          setRows((current) => current.filter((row) => row.id !== field.id));
          setRemoving(null);
          startTransition(async () => {
            const result = await archiveField(field.id);
            if (result.error) {
              setRows(previous);
              toast.error(result.error);
              return;
            }
            toast.success(result.message ?? "Removed.");
          });
        }}
      />
    </div>
  );
}
