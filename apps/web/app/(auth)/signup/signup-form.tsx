"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp, type ActionResult } from "@/lib/auth/actions";
import { AuthCard, FormMessage } from "../auth-card";
import { Field, PasswordField, SubmitButton } from "../fields";

export function SignupForm() {
  const [state, action] = useActionState<ActionResult, FormData>(signUp, {});
  const params = useSearchParams();
  /*
    An invitation link sends people here carrying where to return to and
    which address the invitation was for. Without both, somebody invited
    to a workspace would sign up, land in onboarding and create a second
    workspace of their own — having never joined the one they were asked
    to.
  */
  const next = params.get("next") ?? "/onboarding";
  const invitedEmail = params.get("email") ?? "";

  return (
    <AuthCard
      title="Create your account"
      description={
        invitedEmail
          ? "Use the address your invitation was sent to."
          : "Start with a workspace of your own."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <FormMessage error={state.error} message={state.message} />
        <input type="hidden" name="next" value={next} />
        <Field label="Your name" name="fullName" autoComplete="name" placeholder="Hakim Aissa" />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={invitedEmail}
        />
        <PasswordField autoComplete="new-password" hint="At least 8 characters." />
        <SubmitButton>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
