import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@flow/utils";

/**
 * A side-panel drawer built on the same Radix Dialog primitive as
 * ./dialog — not a separate modal system, just a different positioning
 * treatment (slides in from the right instead of centering), which is
 * exactly what a Task Detail panel needs (brief section 11: "prefer a
 * side panel / drawer / modal pattern").
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Deep and blurred, matching Dialog: on a dark canvas a light scrim
      // brightens the page instead of dimming it.
      "fixed inset-0 z-50 bg-[#05030D]/70 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Panel width. `lg` is a comfortable reading width; `xl` and `2xl`
   * are for detail panels that carry their own sub-layout (a task's
   * fields beside its description and comment thread). */
  width?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, children, width = "lg", ...props }, ref) => (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface",
          "shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.75)]",
          WIDTH_CLASSES[width],
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "data-[state=closed]:duration-slow data-[state=open]:duration-base",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-text-muted transition-colors duration-fast hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
SheetContent.displayName = "SheetContent";

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 border-b border-border p-5", className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-h4 text-text-primary pr-8", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-body-sm text-text-secondary", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-5", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 border-t border-border p-4", className)} {...props} />;
}
