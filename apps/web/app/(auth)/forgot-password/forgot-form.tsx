"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ActionResult } from "@/lib/auth/actions";
import { AuthCard, FormMessage } from "../auth-card";
import { Field, SubmitButton } from "../fields";

export function ForgotForm() {
  const [state, action] = useActionState<ActionResult, FormData>(requestPasswordReset, {});

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <FormMessage error={state.error} message={state.message} />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <SubmitButton>Send reset link</SubmitButton>
      </form>
    </AuthCard>
  );
}
