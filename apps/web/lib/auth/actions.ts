"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
  message?: string;
}

/**
 * Auth server actions.
 *
 * Every one of these returns a MESSAGE rather than throwing, because the
 * forms render the result inline. The messages are also deliberately
 * uniform where they touch account existence — see `requestPasswordReset`.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): string | null {
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  // Supabase enforces a minimum too; checking here avoids a round trip and
  // gives a message written in our own words.
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

/** Absolute URL for links Supabase emails to the user. */
async function siteUrl(path: string) {
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  return `${origin}${path}`;
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  // Only ever an in-app path: an absolute URL here would turn signup into
  // an open redirect somebody could point at their own site.
  const rawNext = String(formData.get("next") ?? "/onboarding");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/onboarding";

  if (!fullName) return { error: "Enter your name." };
  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the handle_new_user trigger to seed the profile row.
      data: { full_name: fullName },
      emailRedirectTo: await siteUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });

  if (error) return { error: error.message };

  // With email confirmation on, no session is returned yet.
  if (!data.session) {
    return { message: "Check your email to confirm your account, then sign in." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately not "no account with that email" — distinguishing the two
  // turns the login form into a way to enumerate who has an account here.
  if (error) return { error: "That email and password do not match an account." };

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await siteUrl("/auth/callback?next=/reset-password"),
  });

  // The same answer whether or not the account exists. Reporting "no such
  // account" here would let anyone test which emails are registered.
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };

  const supabase = await createClient();
  // Only works while the recovery session from the email link is active.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  if (!fullName) return { error: "Name cannot be empty." };
  if (fullName.length > 120) return { error: "Name is too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, avatar_url: avatarUrl || null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Profile updated." };
}
