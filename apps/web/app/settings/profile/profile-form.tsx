"use client";

import { useActionState } from "react";
import { Avatar, Button, Card } from "@flow/ui";
import { signOut, updateProfile, type ActionResult } from "@/lib/auth/actions";
import { FormMessage } from "@/app/(auth)/auth-card";
import { Field, SubmitButton } from "@/app/(auth)/fields";

export function ProfileForm({
  fullName,
  avatarUrl,
  email,
}: {
  fullName: string;
  avatarUrl: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(updateProfile, {});

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={fullName || email} src={avatarUrl || null} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-h4 text-text-primary">{fullName || "Unnamed"}</p>
            <p className="truncate text-body-sm text-text-muted">{email}</p>
          </div>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <FormMessage error={state.error} message={state.message} />
          <Field label="Full name" name="fullName" autoComplete="name" defaultValue={fullName} />
          <Field
            label="Avatar URL"
            name="avatarUrl"
            type="url"
            required={false}
            defaultValue={avatarUrl}
            placeholder="https://…"
            hint="Leave empty to use your initials."
          />
          <div className="flex justify-end">
            <div className="w-40">
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <div>
          <p className="text-h4 text-text-primary">Email</p>
          <p className="mt-1 text-body-sm text-text-secondary">
            {email} — changing your email is not available yet.
          </p>
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-h4 text-text-primary">Sign out</p>
          <p className="mt-1 text-body-sm text-text-secondary">
            Ends this session on this device.
          </p>
        </div>
        {/* A server action in a form, not an onClick — signing out has to
            clear an httpOnly cookie, which client JavaScript cannot touch. */}
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="md">
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
