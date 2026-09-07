import type { ReactNode } from "react";
import { Card } from "@flow/ui";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h3 text-text-primary">{title}</h1>
        <p className="text-body-sm text-text-secondary">{description}</p>
      </div>
      {children}
      {footer && <div className="border-t border-border pt-4 text-center text-body-sm text-text-secondary">{footer}</div>}
    </Card>
  );
}

/** Inline result banner. Errors are assertive so a screen reader announces them. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-body-sm text-danger"
          : "rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-body-sm text-success"
      }
    >
      {error ?? message}
    </p>
  );
}
