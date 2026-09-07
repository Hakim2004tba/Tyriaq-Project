"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@flow/ui";
import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-label text-text-secondary">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
      {hint && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

/** A password field with a reveal toggle — typing a long password blind is
 * the most common cause of a failed sign-in. */
export function PasswordField({
  label = "Password",
  name = "password",
  autoComplete = "current-password",
  hint,
}: {
  label?: string;
  name?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-label text-text-secondary">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="rounded transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      {hint && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

/** Disables itself while the action is in flight, so a slow network cannot
 * produce two signups from one impatient person. */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}
