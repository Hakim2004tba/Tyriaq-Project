import * as React from "react";
import { cn } from "@flow/utils";
import { Label } from "../label/label";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Generic label + control + error-message layout, used by any form. */
export function FormField({ label, htmlFor, error, hint, className, children }: FormFieldProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            "aria-invalid": Boolean(error) || undefined,
            "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
