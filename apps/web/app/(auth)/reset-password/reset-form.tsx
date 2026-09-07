"use client";

import { useActionState } from "react";
import { updatePassword, type ActionResult } from "@/lib/auth/actions";
import { AuthCard, FormMessage } from "../auth-card";
import { PasswordField, SubmitButton } from "../fields";

/**
 * Reached from the emailed link, which the /auth/callback route exchanges
 * for a short-lived recovery session. `updateUser` only succeeds while
 * that session is active, so this page cannot be used to change someone
 * else's password by visiting the URL directly.
 */
export function ResetForm() {
  const [state, action] = useActionState<ActionResult, FormData>(updatePassword, {});

  return (
    <AuthCard title="Choose a new password" description="Pick something you haven't used before.">
      <form action={action} className="flex flex-col gap-4">
        <FormMessage error={state.error} message={state.message} />
        <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters." />
        <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" />
        <SubmitButton>Update password</SubmitButton>
      </form>
    </AuthCard>
  );
}
