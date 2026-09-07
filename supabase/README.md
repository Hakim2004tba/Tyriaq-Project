# Tyriaq database

Thirty-one migrations, applied in filename order.

| File | Contents |
|---|---|
| `20260904000100_profiles.sql` | `profiles` + RLS, `set_updated_at()`, and the `handle_new_user` trigger that creates a profile for every new account |
| `20260904000200_workspaces.sql` | `workspaces` table. **No policies** — they depend on `workspace_members`, which does not exist yet |
| `20260904000300_workspace_members.sql` | `workspace_role` enum, `workspace_members`, the `is_workspace_member` / `is_workspace_admin` helpers, all policies for both tables, and the last-owner guard |
| `20260904000400_create_workspace_rpc.sql` | `create_workspace()` and `workspace_slug_available()` |
| `20260904000500_spaces.sql` | `space_color` enum, `spaces` + RLS inherited from workspace membership |
| `20260904000600_projects.sql` | `project_status` enum, `projects` + RLS, and the trigger that derives `workspace_id` from the project's space |
| `20260904000700_project_members.sql` | `project_role` enum, `project_members`, `is_project_lead()`, `create_project()`, `project_slug_available()`, and the guard that a project member must already be in the workspace |
| `20260904000800_tasks.sql` | `task_status` / `task_priority` enums, `tasks` + RLS, and the trigger that derives `workspace_id` from the project and keeps a subtask in its parent's project |
| `20260904000900_task_assignees.sql` | `task_assignees` + RLS, and the guard that only a workspace member can be assigned |
| `20260904001000_task_dependencies.sql` | `task_dependencies` + RLS, same-project check, and the cycle guard |
| `20260904001100_task_rpc.sql` | `create_task()`, `move_task()` and `renormalise_task_positions()` |
| `20260904001200_task_comments.sql` | `task_comments` + RLS: everyone reads, the author alone edits, the author or an admin deletes; mentions are filtered to workspace members |
| `20260904001300_task_attachments.sql` | `task_attachments` + RLS, and the check that a file is stored under its own workspace and task |
| `20260904001400_task_activity.sql` | `task_activity` and the triggers that write it — read-only to every client, with no insert, update or delete policy at all |
| `20260904001500_storage.sql` | the private `task-files` bucket and its `storage.objects` policies |
| `20260904001600_realtime.sql` | adds comments, activity and attachments to the `supabase_realtime` publication |
| `20260904001700_assignee_profile_fk.sql` | a second foreign key from `task_assignees.user_id` to `profiles`, so assignees and their names come back in one query |
| `20260905000100_documents.sql` | `document_folders` and `documents` + RLS, the trigger deriving a document's workspace from its project, and the folder cycle guard |
| `20260905000200_document_task_links.sql` | the derived index of which documents reference which tasks, and the jsonb function that extracts them |
| `20260905000300_document_images.sql` | the private `document-images` bucket and its policies |
| `20260905000400_document_realtime.sql` | publishes `documents`, so an open editor can be told somebody else saved |
| `20260905000500_conversations.sql` | `conversations` and `conversation_members` + RLS, the `is_conversation_member` / `can_read_conversation` helpers, and the unique index that stops a DM forking in two |
| `20260905000600_messages.sql` | `messages` (with a generated `tsvector` for search), `message_reactions`, `message_attachments`, and the trigger that drops references a message could not have made honestly |
| `20260905000700_chat_rpc.sql` | `open_direct_message()`, `create_group_conversation()`, `open_project_conversation()`, `create_task_from_message()` |
| `20260905000800_chat_storage_realtime.sql` | the private `chat-files` bucket, and live delivery for messages, reactions and conversations |
| `20260905000900_time_entries.sql` | `time_entries` + RLS: everyone reads the totals, only its author writes an entry; logged time appears in the task's history |
| `20260906000100_notifications.sql` | `notifications` and `notification_preferences` + RLS, `notify_user()`, and the index that makes a daily reminder daily |
| `20260906000200_notification_triggers.sql` | the triggers that produce every kind, and `sweep_due_notifications()` for the two that no event can fire |
| `20260906000300_fix_cascade_logging.sql` | **fix**: deleting a task with an assignee or attachment used to fail |
| `20260907000100_invitations.sql` | `workspace_invitations` + RLS, `invitation_preview()` and `accept_invitation()` — the only path by which a second person can join a workspace |
| `20260907000200_space_members.sql` | `permission_level` enum, `space_members` + RLS, and `can_manage_space()` |

## The two decisions worth knowing

**Membership helpers are `SECURITY DEFINER`.** A policy on `workspace_members`
that asks "is the caller a member of this workspace?" has to read
`workspace_members`, which re-triggers the same policy — Postgres aborts with
*infinite recursion detected in policy*. Running the lookup as the function
owner skips RLS on that inner read and breaks the cycle. Every such function
sets `search_path = ''`, without which a caller could shadow `public` with
their own schema.

**`projects.workspace_id` is denormalised, and a trigger keeps it honest.**
Policies read it directly instead of joining through `spaces` — a join inside
a policy runs per row on every read. The trigger re-derives the value from the
project's space on every insert and space change, so a client cannot pass a
workspace it belongs to alongside a space it does not and slip past the check.

**`workspaces` has no INSERT policy.** A workspace and its first membership
must be written together: every read policy requires membership, so a
workspace with no members is invisible to everyone forever, including whoever
created it. `create_workspace()` writes both in one transaction and is the
only way in.

## Applying them

**Quickest:** open the SQL editor in your Supabase dashboard and paste
[`supabase/apply-all.sql`](./apply-all.sql) — every migration concatenated in
order, in one run.

With the CLI instead, from the repo root:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Locally: `supabase start` then `supabase db reset`.

## Before going public

`supabase/config.toml` has `auth.email.enable_confirmations = false` so local
signup returns a session immediately and the flow is testable without an
inbox. **Turn confirmations on for any deployment that strangers can reach** —
without it, anyone can register an email address they do not control.

## Applying it

- A **fresh project**: paste `apply-all.sql` into the Supabase SQL editor.
- A project that already ran `apply-all.sql` before the task system
  existed: paste `apply-tasks.sql`, then `apply-collaboration.sql`.
- A project that already has the task system: paste
  `apply-collaboration.sql`, then `apply-documents.sql`.
- A project already carrying everything up to collaboration: paste
  `apply-documents.sql`, then `apply-chat.sql`.
- A project that already has documents: paste `apply-chat.sql`, then
  `apply-reports.sql`.
- A project that already has chat: paste `apply-reports.sql`, then
  `apply-notifications.sql`.
- A project already carrying reports: paste `apply-notifications.sql`, then
  `apply-invitations.sql`.
- A project that already has notifications: paste `apply-invitations.sql`.

`verify.sql` prints one row per object with OK or MISSING and names the
file to run for anything absent. `repair.sql` fixes the two things an
older database can be missing rather than simply not have.

Both are generated from `migrations/` and are safe to run once — a second
run errors on objects that already exist, which is the intended guard.

## Task ordering

`tasks.position` is a `double precision`, not an integer. Dropping a task
between two others writes the midpoint of its neighbours' positions and
touches exactly one row; integer positions would mean renumbering
everything below the drop on every move. `move_task()` renormalises a
column to whole numbers when repeated drops into the same gap exhaust the
precision available to halve.

## Why the activity feed has no write policy

`task_activity` is written entirely by `SECURITY DEFINER` triggers on the
tables it describes. There is deliberately no insert, update or delete
policy, which means no client — member, admin or owner — can add an entry
that never happened or quietly remove one that did. It also means the
history cannot drift from the data: a task updated by a future server
job, or by hand in the SQL editor, is logged like anything else, because
the log is a consequence of the row change rather than something the
application has to remember to do.

## Why files reference `profiles`, not `auth.users`

Comments, attachments and activity key their person columns to
`public.profiles`. The identity is the same — a profile exists for every
account and is deleted with it — but only a key into a table the API can
read lets a comment come back with its author's name attached. A key to
`auth.users` would be correct and useless, costing a second query per
screen to turn ids into names.

## Why a document stores a task's id and nothing else

A `taskLink` node carries only `attrs.id`. The title, status and project
shown inside the page are read from `tasks` when the document is opened,
so renaming a task updates every document that mentions it and a closed
task reads as closed everywhere. The node does keep a `title` as a
fallback, used only when the task cannot be resolved at all — otherwise
deleting a task would silently empty the middle of somebody's sentence.

`document_task_links` is the reverse index of those nodes, rebuilt by a
trigger on every save and readable but not writable by clients. It exists
so "which documents mention this task" is a lookup rather than a scan of
every document body in the workspace, and it only ever records tasks in
the same workspace — pasting a foreign id into a body cannot manufacture
a reference across the boundary.

## Why reading a project channel is not permission to post in it

`can_read_conversation` answers two different questions at once: a
project channel is visible to everyone in the workspace, while a DM or a
group is visible only to its members. Posting asks a narrower question —
`is_conversation_member` — so somebody browsing a channel has to join
before they can write in it. Without that split, a message could arrive
from somebody the roster does not list, and the roster would stop
describing who is talking.

Both helpers are `SECURITY DEFINER` for the same reason the workspace
ones are: a policy on `conversation_members` that reads
`conversation_members` recurses forever.

## Why presence is not a table

"Who is online" and "who is typing" live in Realtime's presence channel,
in memory. They are true only while a socket is open, so persisting them
would mean a write per keystroke and a stale row for every session that
ended by closing a laptop lid.

## Why notifications have no insert policy

Every notification is written by a `SECURITY DEFINER` trigger on the
table where the event actually happened. Clients can read their own rows
and mark them read; nothing else. So a notification cannot be forged —
there is no path by which one person can put a message in another
person's list, claiming to be from a third.

`notify_user()` is the single door they all go through, and it refuses
three things centrally rather than in nine triggers: notifying somebody
about their own action, notifying somebody who muted that kind, and
notifying somebody who is no longer in the workspace.

## Why due dates are swept, not triggered

Nothing is written when a deadline passes, so no trigger can fire. The
sweep is idempotent — a partial unique index on (user, task, kind, day)
makes a second run on the same day a no-op — which is what makes it safe
to call on an ordinary read, and that is how it runs without `pg_cron`.
Where the extension is available it belongs on a schedule:

```sql
select cron.schedule('tyriaq-due', '0 7 * * *',
                     $$select public.sweep_due_notifications()$$);
```

## Why an invitation is a row, not an email

The token in `workspace_invitations` IS the authorisation to join; the
email, the link, the message are only how it travels. So invitations work
before any mail provider exists — you send the link however you already
talk to the person — and adding one later changes nothing about how they
are accepted.

Two rules make the link safe to forward carelessly:

- **The address must match.** `accept_invitation()` compares the invited
  address with the account accepting it, so a link pasted into a group
  chat grants nothing to anybody else.
- **It expires.** Fourteen days, because an invitation that never expires
  is a permanent key to the workspace sitting in somebody's inbox.

Accepting twice is deliberately harmless — people double-click, and links
get opened twice.
