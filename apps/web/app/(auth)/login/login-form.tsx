"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type ActionResult } from "@/lib/auth/actions";
import { AuthCard, FormMessage } from "../auth-card";
import { Field, PasswordField, SubmitButton } from "../fields";

export function LoginForm() {
  const params = useSearchParams();
  // Where the middleware wanted to send us before it found no session.
  const next = params.get("next") ?? "/dashboard";
  const [state, action] = useActionState<ActionResult, FormData>(signIn, {});

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your Tyriaq workspace."
      footer={
        <>
          New to Tyriaq?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <FormMessage error={state.error} message={state.message} />
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <PasswordField />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-caption text-text-muted hover:text-text-primary">
            Forgot your password?
          </Link>
        </div>
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
