"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import type { JSX } from "react";

/** Drop <Toaster /> once near the root of the app; call toast(...) anywhere. */
export function Toaster(): JSX.Element {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-elevated !border !border-border !text-text-primary !shadow-md !rounded-lg",
          title: "!text-body-sm !font-medium",
          description: "!text-body-sm !text-text-secondary",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-surface-muted !text-text-secondary",
        },
      }}
    />
  );
}

export { toast };
