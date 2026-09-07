# RLS tests

The authorization model is the security boundary, so it is tested by
executing it — not by reading the policies and hoping.

`00-supabase-stub.sql` recreates just enough of Supabase for the migrations
to run on a plain Postgres: an `auth.users` table, an `auth.uid()` that reads
the same GUC Supabase populates from the verified JWT, and the `authenticated`
/ `anon` roles with the grants Supabase gives them by default.

`01-rls.sql` then impersonates two unrelated users and asserts:

1. the `handle_new_user` trigger creates a profile for every signup
2. `create_workspace()` creates the workspace **and** the owner membership
3. a member may add a space to their own workspace
4. a direct `INSERT` into `workspaces` is refused — the RPC is the only way in
5. a second user sees **zero** workspaces, members and spaces belonging to the first
6. that second user cannot write into a workspace even knowing its id
7. `workspace_slug_available()` answers without exposing rows
8. the last owner cannot remove themselves and strand the workspace

`03-tasks-rls.sql` covers the task system:

1. `create_task()` stamps the workspace, the author and an end-of-column position
2. every task field round-trips, and inverted start/due dates are refused
3. subtasks are tasks with a parent, and must stay in the parent's project
4. only workspace members can be assigned to a task
5. dependencies must link tasks in one project, and may never close a cycle
6. `move_task()` reorders within a column and moves between columns
7. an outsider sees no tasks, assignees or dependencies, and can neither
   create one nor move one

`04-collaboration-rls.sql` covers comments, history and files:

1. creating a task, commenting, assigning and rescheduling all write
   history without the application asking
2. a mention of somebody outside the workspace is dropped
3. an attachment cannot claim a storage path under another workspace
4. the activity feed rejects a hand-written entry and cannot be pruned
5. a member may not edit or delete another member's comment, but may
   edit and delete their own
6. an outsider sees no comments, files or history, and cannot write any
7. storage objects follow the same boundary, with an admin able to
   moderate a file somebody else uploaded
8. realtime broadcasts the three collaboration tables and not `tasks`

`05-documents-rls.sql` covers documents:

1. a document takes its workspace from its project, and cannot be filed
   into another workspace's folder
2. a folder cannot be made its own ancestor
3. a `taskLink` node is indexed automatically, and removing it from the
   body removes the link
4. a bare uuid typed as text is not a task reference
5. any member may edit and archive any document; only the author or an
   admin may delete one permanently
6. the task-link index rejects hand-written rows
7. an outsider sees no documents, folders or links, and can create none
8. document images follow the same workspace boundary as everything else

`06-chat-rls.sql` covers chat:

1. opening a DM twice returns the same conversation, from either side
2. a message's mentions, task and project references are filtered to the
   workspace, and a reply cannot cross conversations
3. the conversation's activity clock is maintained by the database
4. a reaction is one per person per emoji, and only its author's to remove
5. a workspace member outside a DM sees nothing of it and cannot post
6. a project channel is readable by the whole workspace, but posting
   requires joining
7. somebody in no shared workspace sees nothing at all
8. a message becomes a task, and the message keeps a reference to it
9. an outsider cannot make a task from a message they cannot read
10. full-text search is indexed and scoped by the same policies

`07-time-entries-rls.sql` covers time tracking:

1. an entry derives its workspace and project from the task
2. logging time appears in the task's activity history
3. durations longer than a day are refused
4. everyone in the workspace reads the totals — that is what makes a team
   report possible — but an entry is only its author's to write, edit or
   delete
5. an outsider sees none of it

`08-notifications-rls.sql` covers notifications:

1. events produce notifications for the right people, and never for the
   person who caused them
2. each carries what it points at, so a click can lead somewhere
3. the due-date sweep is idempotent — running it twice is still one
   reminder per task per day
4. a notification addressed to somebody else is invisible; one person
   cannot mark another's read, nor forge one at all
5. muting a kind stops it being created
6. a mention beats the plain "new message" for the same message
7. a notification about a deleted task disappears with the task

`09-invitations-rls.sql` covers joining:

1. an invited address is normalised, tokenised and given an expiry
2. the link previews who invited you and to what, without exposing the table
3. one live invitation per address per workspace
4. holding the token is not enough — the signed-in address must match
5. an expired invitation is refused, and a made-up token is refused
6. accepting twice produces one membership, not an error
7. only admins can invite
8. space membership derives its workspace, refuses non-members of the
   workspace, and only a space admin can change levels — though anybody
   may leave

## Running

Needs any local Postgres 13+ (`psql` on PATH). Nothing is written to your
project database — it creates and drops a scratch one.

```bash
createdb tyriaq_test
psql -q -d tyriaq_test -v ON_ERROR_STOP=1 -f supabase/tests/00-supabase-stub.sql
for f in supabase/migrations/*.sql; do
  psql -q -d tyriaq_test -v ON_ERROR_STOP=1 -f "$f"
done
for t in 01-rls 02-projects-rls 03-tasks-rls 04-collaboration-rls 05-documents-rls 06-chat-rls 07-time-entries-rls 08-notifications-rls 09-invitations-rls; do
  psql -d tyriaq_test -f "supabase/tests/$t.sql"
done
dropdb tyriaq_test
```

Every assertion prints `PASS`; a failure raises and aborts the script.
