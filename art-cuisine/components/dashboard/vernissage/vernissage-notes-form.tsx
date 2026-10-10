"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { updateVernissageNotes } from "@/lib/actions/vernissage";

function VernissageNotesForm({ jobId, notes }: { jobId: string; notes: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(notes);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await updateVernissageNotes(jobId, { notes: value });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Notes enregistrées");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <NotebookPen className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Notes</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <FormMessage>{error}</FormMessage>}
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nombre de couches, temps de séchage, remarques de l'équipe…"
          className="min-h-28"
        />
        <Button type="submit" size="sm" variant="outline" disabled={submitting} className="self-end">
          {submitting ? "Enregistrement…" : "Enregistrer les notes"}
        </Button>
      </form>
    </Card>
  );
}

export { VernissageNotesForm };
