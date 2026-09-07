import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../dialog/dialog";
import { FormField } from "../form-field/form-field";
import { Input } from "../input/input";
import { Textarea } from "../textarea/textarea";
import { Button } from "../button/button";
import { Alert } from "../alert/alert";

export interface TimeEntryFormValues {
  startedAt: string;
  endedAt: string;
  note: string;
}

export interface TimeEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValues?: Partial<TimeEntryFormValues>;
  error?: string | null;
  pending?: boolean;
  onSubmit: (values: TimeEntryFormValues) => void;
}

/** Manual time-entry create/edit form. Datetimes are plain
 * `datetime-local` inputs — the caller converts to/from ISO strings, so
 * this component has no timezone-conversion logic of its own. */
export function TimeEntryForm({ open, onOpenChange, title, initialValues, error, pending, onSubmit }: TimeEntryFormProps) {
  const [startedAt, setStartedAt] = React.useState(initialValues?.startedAt ?? "");
  const [endedAt, setEndedAt] = React.useState(initialValues?.endedAt ?? "");
  const [note, setNote] = React.useState(initialValues?.note ?? "");

  React.useEffect(() => {
    if (open) {
      setStartedAt(initialValues?.startedAt ?? "");
      setEndedAt(initialValues?.endedAt ?? "");
      setNote(initialValues?.note ?? "");
    }
  }, [open, initialValues]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ startedAt, endedAt, note });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start" htmlFor="time-entry-start">
              <Input id="time-entry-start" type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
            </FormField>
            <FormField label="End" htmlFor="time-entry-end">
              <Input id="time-entry-end" type="datetime-local" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} required />
            </FormField>
          </div>

          <FormField label="Note" htmlFor="time-entry-note" hint="Optional">
            <Textarea id="time-entry-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
