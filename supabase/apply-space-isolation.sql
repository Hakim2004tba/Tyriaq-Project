-- Tyriaq — spaces become a real boundary, profile pictures, and removal.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- It finishes with "Success. No rows returned".
--
-- Safe to run more than once: every policy and function here replaces
-- itself rather than assuming it is new.
--
-- Three things:
--
--   1. A space is now only visible to the people in it. Until now, being
--      in a workspace meant seeing everything in it, which is why
--      accepting a link to ONE space handed over every other space in
--      that workspace. Workspace owners and admins still see everything.
--
--   2. An avatars bucket, so people can have a face instead of initials.
--
--   3. remove_from_workspace(), and a rule that the owner can never be
--      removed — from the workspace or from a space. Removing the owner
--      would leave a workspace nobody can administer.
--
-- One consequence worth knowing before you run it: somebody who accepts
-- a WORKSPACE invitation now sees an empty app until an admin puts them
-- in a space. That is the point of the change, but it makes "invite to
-- the workspace" an incomplete action on its own.

-- ============================================================
-- 20260909000100_space_scoped_visibility.sql
-- ============================================================
/* ------------------------------------------------------------------ */
/* The two questions everything else asks                              */
/* ------------------------------------------------------------------ */

create or replace function public.can_see_space(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.spaces s
    where s.id = target
      and (
        public.is_workspace_admin(s.workspace_id)
        or exists (
          select 1 from public.space_members m
          where m.space_id = s.id and m.user_id = auth.uid()
        )
      )
  );
$$;

/*
  A project is visible through its space, or through its own roster.

  The second half matters: somebody can be put on one project without
  being given the space around it, which is the narrowest grant the
  product can express.
*/
create or replace function public.can_see_project(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = target
      and (
        public.is_workspace_admin(p.workspace_id)
        or public.can_see_space(p.space_id)
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
      )
  );
$$;

/** The project a task belongs to — one hop, used by every child table. */
create or replace function public.can_see_task(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project((select t.project_id from public.tasks t where t.id = target));
$$;

grant execute on function public.can_see_space(uuid) to authenticated;
grant execute on function public.can_see_project(uuid) to authenticated;
grant execute on function public.can_see_task(uuid) to authenticated;

/* ------------------------------------------------------------------ */
/* Spaces                                                              */
/* ------------------------------------------------------------------ */

drop policy if exists "members read spaces in their workspaces" on public.spaces;
drop policy if exists "people read spaces they are in" on public.spaces;
create policy "people read spaces they are in"
  on public.spaces for select
  to authenticated
  using (public.can_see_space(id));

drop policy if exists "members update spaces in their workspaces" on public.spaces;
drop policy if exists "managers update spaces" on public.spaces;
create policy "managers update spaces"
  on public.spaces for update
  to authenticated
  using (public.can_manage_space(id))
  with check (public.can_manage_space(id));

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

drop policy if exists "members read projects in their workspaces" on public.projects;
drop policy if exists "people read projects they can see" on public.projects;
create policy "people read projects they can see"
  on public.projects for select
  to authenticated
  using (public.can_see_project(id));

drop policy if exists "members update projects in their workspaces" on public.projects;
drop policy if exists "people update projects they can see" on public.projects;
create policy "people update projects they can see"
  on public.projects for update
  to authenticated
  using (public.can_see_project(id))
  with check (public.can_see_project(id));

drop policy if exists "members create projects" on public.projects;
drop policy if exists "people create projects in their spaces" on public.projects;
create policy "people create projects in their spaces"
  on public.projects for insert
  to authenticated
  with check (public.can_see_space(space_id) and created_by = (select auth.uid()));

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

drop policy if exists "members read tasks in their workspaces" on public.tasks;
drop policy if exists "people read tasks in projects they can see" on public.tasks;
create policy "people read tasks in projects they can see"
  on public.tasks for select
  to authenticated
  using (public.can_see_project(project_id));

drop policy if exists "members create tasks" on public.tasks;
drop policy if exists "people create tasks in projects they can see" on public.tasks;
create policy "people create tasks in projects they can see"
  on public.tasks for insert
  to authenticated
  with check (public.can_see_project(project_id));

drop policy if exists "members update tasks in their workspaces" on public.tasks;
drop policy if exists "people update tasks in projects they can see" on public.tasks;
create policy "people update tasks in projects they can see"
  on public.tasks for update
  to authenticated
  using (public.can_see_project(project_id))
  with check (public.can_see_project(project_id));

drop policy if exists "members delete tasks in their workspaces" on public.tasks;
drop policy if exists "people delete tasks in projects they can see" on public.tasks;
create policy "people delete tasks in projects they can see"
  on public.tasks for delete
  to authenticated
  using (public.can_see_project(project_id));

/* ------------------------------------------------------------------ */
/* Everything hanging off a task                                       */
/* ------------------------------------------------------------------ */

drop policy if exists "members read task assignees" on public.task_assignees;
drop policy if exists "people read assignees of tasks they can see" on public.task_assignees;
create policy "people read assignees of tasks they can see"
  on public.task_assignees for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members assign tasks" on public.task_assignees;
drop policy if exists "people assign on tasks they can see" on public.task_assignees;
create policy "people assign on tasks they can see"
  on public.task_assignees for insert
  to authenticated
  with check (public.can_see_task(task_id));

drop policy if exists "members unassign tasks" on public.task_assignees;
drop policy if exists "people unassign on tasks they can see" on public.task_assignees;
create policy "people unassign on tasks they can see"
  on public.task_assignees for delete
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members read task dependencies" on public.task_dependencies;
drop policy if exists "people read dependencies they can see" on public.task_dependencies;
create policy "people read dependencies they can see"
  on public.task_dependencies for select
  to authenticated
  using (public.can_see_task(predecessor_id));

drop policy if exists "members create task dependencies" on public.task_dependencies;
drop policy if exists "people link tasks they can see" on public.task_dependencies;
create policy "people link tasks they can see"
  on public.task_dependencies for insert
  to authenticated
  with check (public.can_see_task(predecessor_id) and public.can_see_task(successor_id));

drop policy if exists "members delete task dependencies" on public.task_dependencies;
drop policy if exists "people unlink tasks they can see" on public.task_dependencies;
create policy "people unlink tasks they can see"
  on public.task_dependencies for delete
  to authenticated
  using (public.can_see_task(predecessor_id));

drop policy if exists "members read task comments" on public.task_comments;
drop policy if exists "people read comments on tasks they can see" on public.task_comments;
create policy "people read comments on tasks they can see"
  on public.task_comments for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members write task comments" on public.task_comments;
drop policy if exists "people comment on tasks they can see" on public.task_comments;
create policy "people comment on tasks they can see"
  on public.task_comments for insert
  to authenticated
  with check (public.can_see_task(task_id) and author_id = (select auth.uid()));

drop policy if exists "members read task attachments" on public.task_attachments;
drop policy if exists "people read files on tasks they can see" on public.task_attachments;
create policy "people read files on tasks they can see"
  on public.task_attachments for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members attach files" on public.task_attachments;
drop policy if exists "people attach to tasks they can see" on public.task_attachments;
create policy "people attach to tasks they can see"
  on public.task_attachments for insert
  to authenticated
  with check (public.can_see_task(task_id) and uploaded_by = (select auth.uid()));

drop policy if exists "members read task activity" on public.task_activity;
drop policy if exists "people read activity on tasks they can see" on public.task_activity;
create policy "people read activity on tasks they can see"
  on public.task_activity for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members read time entries" on public.time_entries;
drop policy if exists "people read time on tasks they can see" on public.time_entries;
create policy "people read time on tasks they can see"
  on public.time_entries for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "people log their own time" on public.time_entries;
drop policy if exists "people log time on tasks they can see" on public.time_entries;
create policy "people log time on tasks they can see"
  on public.time_entries for insert
  to authenticated
  with check (public.can_see_task(task_id) and user_id = (select auth.uid()));

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

/*
  A document filed under a project follows that project. One filed at
  the workspace level — no project — stays workspace-wide, because it
  belongs to nowhere narrower and hiding it would leave it unreachable
  for everybody but admins.
*/
drop policy if exists "members read documents" on public.documents;
drop policy if exists "people read documents they can reach" on public.documents;
create policy "people read documents they can reach"
  on public.documents for select
  to authenticated
  using (
    case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  );

drop policy if exists "members update documents" on public.documents;
drop policy if exists "people update documents they can reach" on public.documents;
create policy "people update documents they can reach"
  on public.documents for update
  to authenticated
  using (
    case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  )
  with check (
    case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  );

drop policy if exists "members read document task links" on public.document_task_links;
drop policy if exists "people read links to tasks they can see" on public.document_task_links;
create policy "people read links to tasks they can see"
  on public.document_task_links for select
  to authenticated
  using (public.can_see_task(task_id));

-- ============================================================
-- 20260909000200_avatars.sql
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars are readable" on storage.objects;
create policy "avatars are readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "people upload their own avatar" on storage.objects;
create policy "people upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    -- First path segment is the owner's id: "<uid>/<uuid>.png".
    -- split_part rather than storage.foldername() so the policy can be
    -- applied and tested outside Supabase too.
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "people replace their own avatar" on storage.objects;
create policy "people replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

drop policy if exists "people delete their own avatar" on storage.objects;
create policy "people delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

-- ============================================================
-- 20260909000300_remove_from_workspace.sql
-- ============================================================
create or replace function public.remove_from_workspace(p_workspace uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.workspace_role;
begin
  if not public.is_workspace_admin(p_workspace) then
    raise exception 'Only an owner or admin can remove somebody' using errcode = 'P0001';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot remove yourself' using errcode = 'P0001';
  end if;

  select role into target_role from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;

  if target_role is null then
    -- Already gone. Saying so would be pedantic about an outcome the
    -- caller already has.
    return;
  end if;
  if target_role = 'owner' then
    raise exception 'The owner cannot be removed from their own workspace' using errcode = 'P0001';
  end if;

  /*
    Every grant they held, in one transaction.

    `space_members` and `project_members` reference `profiles`, not
    `workspace_members`, so nothing cascades from the membership row —
    left behind, those rows would keep working the moment somebody was
    re-invited, silently restoring access an admin thought they had
    taken away.
  */
  delete from public.project_members pm
  using public.projects pr
  where pm.project_id = pr.id
    and pr.workspace_id = p_workspace
    and pm.user_id = p_user;

  delete from public.space_members
  where workspace_id = p_workspace and user_id = p_user;

  delete from public.task_assignees
  where workspace_id = p_workspace and user_id = p_user;

  delete from public.conversation_members cm
  using public.conversations c
  where cm.conversation_id = c.id
    and c.workspace_id = p_workspace
    and cm.user_id = p_user;

  delete from public.space_join_requests
  where workspace_id = p_workspace and user_id = p_user and status = 'pending';

  delete from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
end;
$$;

grant execute on function public.remove_from_workspace(uuid, uuid) to authenticated;

/*
  The owner's own space membership is equally load-bearing.

  Removing the last admin of a space leaves it visible to workspace
  admins only — which for a space whose members were the point is a
  space nobody can administer from inside. The UI hides that button, and
  this refuses it regardless, because a hidden button is not a rule.
*/
create or replace function public.space_members_protect_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = old.workspace_id
      and m.user_id = old.user_id
      and m.role = 'owner'
  ) then
    raise exception 'The workspace owner cannot be removed from a space' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists space_members_protect_owner on public.space_members;
create trigger space_members_protect_owner
  before delete on public.space_members
  for each row execute function public.space_members_protect_owner();

-- ============================================================
-- Tell the API about the new functions
-- ============================================================

/*
  PostgREST answers RPC calls from a cached picture of the schema, and it
  usually reloads on its own — but not always, and a function it has not
  noticed yet comes back as:

    Could not find the function public.remove_from_workspace(...)
    in the schema cache

  which reads like the SQL failed when it did not.
*/
notify pgrst, 'reload schema';
