import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, MailCheck } from "lucide-react";
import { Button } from "@flow/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { previewInvitation } from "@/lib/actions/invitation";
import { AcceptInvitation } from "./accept-invitation";

export const metadata: Metadata = { title: "Invitation" };

/**
 * Where an invitation link lands.
 *
 * Deliberately readable while signed out: somebody who has never used
 * Tyriaq should see who invited them and to what BEFORE being asked to
 * create an account. A link that opens on a login form with no
 * explanation is one people close.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<JSX.Element> {
  const { token } = await params;
  const invitation = await previewInvitation(token);
  const user = await getCurrentUser();

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <main className="tq-aurora flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        {children}
      </div>
    </main>
  );

  if (!invitation) {
    return (
      <Frame>
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-h2 text-text-primary">This link is not valid</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          It may have been revoked, or the address may have been copied incompletely. Ask whoever
          invited you to send a new one.
        </p>
        <Button className="mt-5 w-full" asChild>
          <Link href="/">Go to Tyriaq</Link>
        </Button>
      </Frame>
    );
  }

  if (invitation.expired) {
    return (
      <Frame>
        <span className="flex size-10 items-center justify-center rounded-full bg-warning-subtle text-warning">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-h2 text-text-primary">This invitation has expired</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          Invitations to <span className="text-text-primary">{invitation.workspaceName}</span> are
          good for 14 days. Ask {invitation.inviterName} to send another.
        </p>
        <Button className="mt-5 w-full" asChild>
          <Link href="/">Go to Tyriaq</Link>
        </Button>
      </Frame>
    );
  }

  /*
    Signed out: send them to sign up with the invited address prefilled,
    carrying the invitation so they come straight back here afterwards.
    Signing up under a different address would fail the acceptance check,
    which is a confusing place to discover the rule.
  */
  if (!user) {
    return (
      <Frame>
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-muted text-primary">
          <MailCheck className="size-5" />
        </span>
        <h1 className="mt-4 text-h2 text-text-primary">
          {invitation.inviterName} invited you to {invitation.workspaceName}
        </h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          The invitation was sent to{" "}
          <span className="text-text-primary">{invitation.invitedEmail}</span>. Sign in with that
          address, or create an account with it, and you will join automatically.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild>
            <Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invitation.invitedEmail)}`}>
              Create an account
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
              I already have one
            </Link>
          </Button>
        </div>
      </Frame>
    );
  }

  // Already a member and the invitation is spent: nothing to decide.
  if (invitation.accepted) redirect("/dashboard");

  return (
    <Frame>
      <span className="flex size-10 items-center justify-center rounded-full bg-primary-muted text-primary">
        <MailCheck className="size-5" />
      </span>
      <h1 className="mt-4 text-h2 text-text-primary">
        Join {invitation.workspaceName}
      </h1>
      <p className="mt-2 text-body-sm text-text-secondary">
        {invitation.inviterName} invited {invitation.invitedEmail} as a{" "}
        {invitation.invitedRole}.
      </p>

      <AcceptInvitation
        token={token}
        signedInAs={user.email ?? ""}
        invitedEmail={invitation.invitedEmail}
      />
    </Frame>
  );
}
