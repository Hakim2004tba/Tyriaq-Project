"use client";

import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-ink-950 !text-white !border !border-white/10 !rounded-md !shadow-elevation-lg !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-stone-400",
          actionButton: "!bg-accent !text-ink-950",
          cancelButton: "!bg-white/10 !text-white",
        },
      }}
    />
  );
}

export { Toaster };
