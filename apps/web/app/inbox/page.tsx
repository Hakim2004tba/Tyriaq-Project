import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Button } from "@flow/ui";
import { requireUser } from "@/lib/auth/session";
import { getNotifications } from "@/lib/data/notifications";
import { sweepDueNotifications } from "@/lib/actions/notification";
import { InboxList } from "./inbox-list";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Everything waiting for you, in one page.
 *
 * The bell in the top bar shows the most recent handful and is meant to
 * be glanced at; this is the same feed with room to read it, which is
 * what the sidebar's Inbox has been pointing at — until now, at a route
 * that did not exist.
 */
export default async function InboxPage(): Promise<JSX.Element> {
  await requireUser();

  // Deadlines pass without anything being written, so the only moment to
  // notice them is when somebody looks.
  await sweepDueNotifications();
  const feed = await getNotifications(100);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 text-text-primary">Inbox</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            {feed.unread > 0
              ? `${feed.unread} unread`
              : "Nothing unread — this is everything from the last while."}
          </p>
        </div>
        <Button variant="secondary" size="md" asChild>
          <Link href="/settings/notifications">
            <Settings2 className="size-4" />
            What lands here
          </Link>
        </Button>
      </header>

      <InboxList items={feed.items} unread={feed.unread} />
    </div>
  );
}
