"use client";

import { useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@flow/ui";

/**
 * The gate in front of anything destructive.
 *
 * Where `confirmText` is given, the action stays disabled until it is
 * typed. That is reserved for the few things with no undo — deleting a
 * person's account, deleting a workspace — because a confirmation people
 * clear by reflex protects nobody.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmText,
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);

  const ready = !confirmText || typed.trim() === confirmText;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {confirmText && (
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-text-secondary">
              Type <span className="font-medium text-text-primary">{confirmText}</span> to confirm
            </span>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label={`Type ${confirmText} to confirm`}
              autoComplete="off"
            />
          </label>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            disabled={!ready}
            loading={pending}
            onClick={() => {
              setPending(true);
              // Nothing is wired to a backend in this phase; the pause is
              // where the request will go, so the pending state is real
              // rather than decorative.
              setTimeout(() => {
                onConfirm();
                setPending(false);
                setTyped("");
                onOpenChange(false);
              }, 450);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small helper so pages can say "this is a prototype" once, consistently. */
export function notWired(what: string) {
  toast.info(`${what} — not connected to the backend in this phase.`);
}
