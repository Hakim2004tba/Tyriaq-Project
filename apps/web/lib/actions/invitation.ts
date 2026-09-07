"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentWorkspace } from "@/lib/data/queries";
import type { ActionResult } from "./workspace";

/**
 * Invitations.
 *
 * An invitation is a row carrying a token; the link is how the token
 * travels. That means invitations work today, with no mail provider
 * configured — you send the link however you already talk to the person
 * — and adding email later changes nothing about how they are accepted.
 */

export type WorkspaceRole = "admin" | "member";

export interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  url: string;
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
}

/**
 * The address the links must point at.
 *
 * A link built from the request would carry whatever host the browser
 * happened to use — `localhost:3000` in development, a preview URL on a
 * branch deploy — and land the recipient somewhere they cannot reach.
 */
function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Not exported: every export from a "use server" file must be an async
// server action, and this is a plain string builder.
function invitationUrl(token: string): string {
  return `${siteUrl()}/invite/${token}`;
}

export async function listInvitations(): Promise<Invitation[]> {
  const ws = await getCurrentWorkspace();
  if (!ws) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, token, created_at, expires_at, accepted_at")
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string; email: string; role: WorkspaceRole; token: string;
    created_at: string; expires_at: string; accepted_at: string | null;
  }[]).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    url: invitationUrl(row.token),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    accepted: row.accepted_at !== null,
  }));
}

export async function inviteToWorkspace(
  email: string,
  role: WorkspaceRole = "member"
): Promise<ActionResult & { url?: string }> {
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { error: "That does not look like an email address." };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const ws = await getCurrentWorkspace();
  if (!ws) return { error: "No workspace selected." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: ws.id,
      email: address,
      role: role === "admin" ? "admin" : "member",
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    // The partial unique index is what enforces one live invitation per
    // address; this turns that into something a person can act on.
    if (error.code === "23505") {
      const { data: current } = await supabase
        .from("workspace_invitations")
        .select("token")
        .eq("email", address)
        .is("accepted_at", null)
        .single();
      return current?.token
        ? { message: "They already have an invitation — here is the same link.", url: invitationUrl(current.token) }
        : { error: error.message };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { message: "Invitation ready to send.", url: invitationUrl(data!.token) };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: "Invitation revoked." };
}

export interface InvitationPreview {
  workspaceName: string;
  invitedEmail: string;
  invitedRole: string;
  inviterName: string;
  expired: boolean;
  accepted: boolean;
}

export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { invite_token: token });

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        workspace_name: string; invited_email: string; invited_role: string;
        inviter_name: string; is_expired: boolean; is_accepted: boolean;
      }
    | undefined;
  if (!row) return null;

  return {
    workspaceName: row.workspace_name,
    invitedEmail: row.invited_email,
    invitedRole: row.invited_role,
    inviterName: row.inviter_name,
    expired: row.is_expired,
    accepted: row.is_accepted,
  };
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: "You are in." };
}
