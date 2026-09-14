-- Tyriaq — spaces become a real boundary, and profile pictures.
--
-- Run this in the Supabase SQL editor: select all, press Run.
--
-- Until now, being in a workspace meant seeing everything in it, which
-- is why accepting a link to ONE space handed over every other space in
-- that workspace. After this, a space is only visible to the people in
-- it (workspace owners and admins still see everything), and everything
-- underneath — projects, tasks, comments, files, time — follows the
-- same answer.
--
-- One consequence, worth knowing before you run it: somebody who
-- accepts a WORKSPACE invitation now sees an empty app until an admin
-- puts them in a space. That is the point of the change, but it makes
-- "invite to the workspace" an incomplete action on its own.

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
create policy "people read spaces they are in"
  on public.spaces for select
  to authenticated
  using (public.can_see_space(id));

drop policy if exists "members update spaces in their workspaces" on public.spaces;
create policy "managers update spaces"
  on public.spaces for update
  to authenticated
  using (public.can_manage_space(id))
  with check (public.can_manage_space(id));

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

drop policy if exists "members read projects in their workspaces" on public.projects;
create policy "people read projects they can see"
  on public.projects for select
  to authenticated
  using (public.can_see_project(id));

drop policy if exists "members update projects in their workspaces" on public.projects;
create policy "people update projects they can see"
  on public.projects for update
  to authenticated
  using (public.can_see_project(id))
  with check (public.can_see_project(id));

drop policy if exists "members create projects" on public.projects;
create policy "people create projects in their spaces"
  on public.projects for insert
  to authenticated
  with check (public.can_see_space(space_id) and created_by = (select auth.uid()));

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

drop policy if exists "members read tasks in their workspaces" on public.tasks;
create policy "people read tasks in projects they can see"
  on public.tasks for select
  to authenticated
  using (public.can_see_project(project_id));

drop policy if exists "members create tasks" on public.tasks;
create policy "people create tasks in projects they can see"
  on public.tasks for insert
  to authenticated
  with check (public.can_see_project(project_id));

drop policy if exists "members update tasks in their workspaces" on public.tasks;
create policy "people update tasks in projects they can see"
  on public.tasks for update
  to authenticated
  using (public.can_see_project(project_id))
  with check (public.can_see_project(project_id));

drop policy if exists "members delete tasks in their workspaces" on public.tasks;
create policy "people delete tasks in projects they can see"
  on public.tasks for delete
  to authenticated
  using (public.can_see_project(project_id));

/* ------------------------------------------------------------------ */
/* Everything hanging off a task                                       */
/* ------------------------------------------------------------------ */

drop policy if exists "members read task assignees" on public.task_assignees;
create policy "people read assignees of tasks they can see"
  on public.task_assignees for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members assign tasks" on public.task_assignees;
create policy "people assign on tasks they can see"
  on public.task_assignees for insert
  to authenticated
  with check (public.can_see_task(task_id));

drop policy if exists "members unassign tasks" on public.task_assignees;
create policy "people unassign on tasks they can see"
  on public.task_assignees for delete
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members read task dependencies" on public.task_dependencies;
create policy "people read dependencies they can see"
  on public.task_dependencies for select
  to authenticated
  using (public.can_see_task(predecessor_id));

drop policy if exists "members create task dependencies" on public.task_dependencies;
create policy "people link tasks they can see"
  on public.task_dependencies for insert
  to authenticated
  with check (public.can_see_task(predecessor_id) and public.can_see_task(successor_id));

drop policy if exists "members delete task dependencies" on public.task_dependencies;
create policy "people unlink tasks they can see"
  on public.task_dependencies for delete
  to authenticated
  using (public.can_see_task(predecessor_id));

drop policy if exists "members read task comments" on public.task_comments;
create policy "people read comments on tasks they can see"
  on public.task_comments for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members write task comments" on public.task_comments;
create policy "people comment on tasks they can see"
  on public.task_comments for insert
  to authenticated
  with check (public.can_see_task(task_id) and author_id = (select auth.uid()));

drop policy if exists "members read task attachments" on public.task_attachments;
create policy "people read files on tasks they can see"
  on public.task_attachments for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members attach files" on public.task_attachments;
create policy "people attach to tasks they can see"
  on public.task_attachments for insert
  to authenticated
  with check (public.can_see_task(task_id) and uploaded_by = (select auth.uid()));

drop policy if exists "members read task activity" on public.task_activity;
create policy "people read activity on tasks they can see"
  on public.task_activity for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "members read time entries" on public.time_entries;
create policy "people read time on tasks they can see"
  on public.time_entries for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "people log their own time" on public.time_entries;
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
create policy "people read links to tasks they can see"
  on public.document_task_links for select
  to authenticated
  using (public.can_see_task(task_id));

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
