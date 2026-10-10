"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";
import { updateMeasurements } from "@/lib/actions/design";
import type { DesignMeasurements } from "@/lib/data/operations";

function MeasurementsForm({ projectId, measurements }: { projectId: string; measurements: DesignMeasurements | null }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await updateMeasurements(projectId, {
      width: form.get("width"),
      depth: form.get("depth"),
      height: form.get("height"),
      notes: form.get("notes"),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Mesures enregistrées");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Ruler className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Mesures</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <FormMessage>{error}</FormMessage>}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="width" className="text-xs">Largeur (m)</Label>
            <Input id="width" name="width" type="number" step={0.01} min={0} defaultValue={measurements?.width ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depth" className="text-xs">Profondeur (m)</Label>
            <Input id="depth" name="depth" type="number" step={0.01} min={0} defaultValue={measurements?.depth ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="height" className="text-xs">Hauteur (m)</Label>
            <Input id="height" name="height" type="number" step={0.01} min={0} defaultValue={measurements?.height ?? ""} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="measurements-notes" className="text-xs">Notes de relevé</Label>
          <Textarea id="measurements-notes" name="notes" defaultValue={measurements?.notes ?? ""} placeholder="Contraintes, particularités du chantier…" />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={submitting} className="self-end">
          {submitting ? "Enregistrement…" : "Enregistrer les mesures"}
        </Button>
      </form>
    </Card>
  );
}

export { MeasurementsForm };
