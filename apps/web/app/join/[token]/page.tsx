import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@flow/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { previewJoinLink } from "@/lib/actions/space-link";
import { SpaceBadge } from "@/components/spaces/space-badge";
import { RequestToJoin } from "./request-to-join";

export const metadata: Metadata = { title: "Join a space" };

/**
 * Where a space link lands.
 *
 * Readable while signed out, like an invitation: somebody who has never
 * used Tyriaq should see what they are being asked to join BEFORE being
 * asked to make an account. A link that opens on a login form with no
 * explanation is one people close.
 *
 * Unlike an invitation, this link is not addressed to anybody. It shows
 * the space, and the way in is to ASK — which is why nothing here
 * promises entry.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<JSX.Element> {
  const { token } = await params;
  const user = await getCurrentUser();

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <main className="tq-aurora flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
        {children}
      </div>
    </main>
  );

  /*
    Signed out: the preview itself needs a session, because it reads
    "are you already in this space" — so the page asks them in first and
    comes straight back here. The link is carried through so nothing has
    to be re-found afterwards.
  */
  if (!user) {
    const back = encodeURIComponent(`/join/${token}`);
    return (
      <Frame>
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-muted text-primary">
          <Check className="size-5" />
        </span>
        <h1 className="mt-4 text-h2 text-text-primary">You have been sent a space</h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          Sign in, or create an account, and you can ask to join it. Any address will do — this
          link is not tied to one.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button asChild>
            <Link href={`/signup?next=${back}`}>Create an account</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/login?next=${back}`}>I already have one</Link>
          </Button>
        </div>
      </Frame>
    );
  }

  const preview = await previewJoinLink(token);

  if (!preview || preview.revoked) {
    return (
      <Frame>
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-subtle text-danger">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-h2 text-text-primary">
          {preview?.revoked ? "This link has been turned off" : "This link is not valid"}
        </h1>
        <p className="mt-2 text-body-sm text-text-secondary">
          {preview?.revoked
            ? "Whoever shared it has since replaced it. Ask them for the current one."
            : "It may have been copied incompletely, or replaced since it was sent."}
        </p>
        <Button className="mt-5 w-full" variant="secondary" asChild>
          <Link href="/dashboard">Go to Tyriaq</Link>
        </Button>
      </Frame>
    );
  }

  // Already in: there is nothing to ask for, so this is just a slow way
  // of opening the space.
  if (preview.alreadyMember) redirect("/spaces");

  return (
    <Frame>
      <div className="flex items-center gap-3">
        <SpaceBadge icon={preview.spaceIcon} color={preview.spaceColor} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-h2 text-text-primary">{preview.spaceName}</h1>
          <p className="truncate text-body-sm text-text-muted">
            in {preview.workspaceName} · {preview.memberCount}{" "}
            {preview.memberCount === 1 ? "person" : "people"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-body-sm text-text-secondary">
        {preview.inviterName} shared this space. Ask to join and an admin will let you in — you
        will get a notification either way.
      </p>

      <RequestToJoin token={token} pending={preview.pending} spaceName={preview.spaceName} />
    </Frame>
  );
}
