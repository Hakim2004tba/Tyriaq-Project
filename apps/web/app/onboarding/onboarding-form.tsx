"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Card, Wordmark } from "@flow/ui";
import { createWorkspace } from "@/lib/auth/workspace-actions";
import type { ActionResult } from "@/lib/auth/actions";
import { FormMessage } from "../(auth)/auth-card";
import { Field, SubmitButton } from "../(auth)/fields";

export function OnboardingForm({ email }: { email: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(createWorkspace, {});

  return (
    <div className="tq-aurora flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Wordmark size={30} />

      <main className="w-full max-w-[440px]">
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-2 text-h3 text-text-primary">Create your workspace</h1>
            <p className="text-body-sm text-text-secondary">
              A workspace holds your spaces, projects and the people you work with. You can rename it
              later.
            </p>
          </div>

          <form action={action} className="flex flex-col gap-4">
            <FormMessage error={state.error} message={state.message} />
            <Field
              label="Workspace name"
              name="name"
              placeholder="Acme, Design Team, Personal…"
              hint="We'll generate a URL from this."
            />
            <SubmitButton>Create workspace</SubmitButton>
          </form>

          <p className="border-t border-border pt-4 text-caption text-text-muted">
            Signed in as {email}
          </p>
        </Card>
      </main>
    </div>
  );
}
