"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eraser, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/auth/form-message";
import { recordClientSignature } from "@/lib/actions/montage";
import { formatShortDate } from "@/lib/format";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  function getContext(): CanvasRenderingContext2D | null {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  /** Maps CSS-pixel pointer coordinates to the canvas's own drawing-buffer resolution, since it's stretched to fill its container. */
  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore — some input sources (or programmatic events) don't support capture; drawing still works.
    }
    drawingRef.current = true;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    }
  }

  function commit() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    onChange(canvas && hasDrawn ? canvas.toDataURL("image/png") : null);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Signature du client</Label>
      <canvas
        ref={canvasRef}
        width={500}
        height={180}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={commit}
        onPointerLeave={commit}
        className="w-full touch-none rounded-md border border-border-default bg-white"
      />
      <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="self-start">
        <Eraser className="h-3.5 w-3.5" /> Effacer
      </Button>
    </div>
  );
}

function ClientReceptionPanel({
  jobId,
  canSign,
  clientName,
  signedBy,
  signedAt,
  signatureDataUrl,
}: {
  jobId: string;
  canSign: boolean;
  clientName: string;
  signedBy: string | null;
  signedAt: string | null;
  signatureDataUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(clientName);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (signedAt) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 rounded-md border border-[var(--status-success-fg)]/30 bg-[var(--status-success-bg)] p-4">
          <CircleCheck className="h-4 w-4 shrink-0 text-[var(--status-success-fg)]" />
          <p className="text-sm text-text-secondary">Réception signée par {signedBy} le {formatShortDate(signedAt)}.</p>
        </div>
        {signatureDataUrl && (
          <Card className="w-fit p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signatureDataUrl} alt={`Signature de ${signedBy}`} className="h-32 w-auto" />
          </Card>
        )}
      </div>
    );
  }

  if (!canSign) {
    return <p className="py-8 text-center text-sm text-text-muted">La signature du client se fait à l&rsquo;étape « Réception client ».</p>;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!signature) {
      setError("Merci de faire signer le client avant de valider.");
      return;
    }

    setSubmitting(true);
    const result = await recordClientSignature(jobId, { signedBy: name, signatureDataUrl: signature });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Réception validée — installation terminée");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <FormMessage>{error}</FormMessage>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="reception-name">Nom du client</Label>
        <Input id="reception-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <SignaturePad onChange={setSignature} />
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Validation…" : "Valider la réception"}
      </Button>
    </form>
  );
}

export { ClientReceptionPanel };
