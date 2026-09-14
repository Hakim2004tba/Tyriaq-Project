-- Tyriaq — per-project access, decided when somebody is let in
--
-- A space membership grants the same level across every project in the
-- space. That is the right default and the wrong answer often enough:
-- the new contractor should edit the one project they were hired for and
-- only read the rest.
--
-- So `project_members` gains a LEVEL that overrides the space's for that
-- project. Null means "whatever the space says", which is different from
-- any explicit level — it follows the space when the space changes,
-- where a copied value would silently stop tracking it.

alter table public.project_members
  add column if not exists level public.permission_level;

comment on column public.project_members.level is
  'Overrides the space level for this project. Null inherits.';

/*
  What somebody may do in one project, after both grants are considered.

  The project wins when it says anything, because it is the more specific
  grant — that is the whole point of having one. A workspace admin is an
  admin everywhere regardless; there is no level below that worth
  computing for them.
*/
create or replace function public.project_level(p_project uuid, p_user uuid default auth.uid())
returns public.permission_level
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select 'admin'::public.permission_level
       from public.projects pr
       join public.workspace_members wm
         on wm.workspace_id = pr.workspace_id and wm.user_id = p_user
      where pr.id = p_project and wm.role in ('owner', 'admin')),
    (select pm.level from public.project_members pm
      where pm.project_id = p_project and pm.user_id = p_user and pm.level is not null),
    (select sm.level from public.space_members sm
       join public.projects pr on pr.space_id = sm.space_id
      where pr.id = p_project and sm.user_id = p_user)
  );
$$;

grant execute on function public.project_level(uuid, uuid) to authenticated;

/*
  Approval, now able to say which projects and at what level.

  `project_levels` is a json object of project id → level, e.g.
  {"<uuid>": "editor", "<uuid>": "viewer"}. Anything left out of it is
  not granted a project row at all, and the person simply inherits the
  space level there — which is what the plain "let them in" case wants.

  Replaces the three-argument version rather than sitting beside it: two
  functions matching the same call is what broke notify_user, and once is
  enough to learn that.
*/
drop function if exists public.decide_space_join(uuid, boolean, public.permission_level);

create or replace function public.decide_space_join(
  request_id uuid,
  approve boolean,
  level public.permission_level default 'editor',
  project_levels jsonb default '{}'::jsonb
)
returns public.space_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.space_join_requests;
  space_name text;
  entry record;
begin
  select * into request from public.space_join_requests where id = request_id;
  if request.id is null then
    raise exception 'That request no longer exists' using errcode = 'P0001';
  end if;
  if not public.can_manage_space(request.space_id) then
    raise exception 'Only a space or workspace admin can decide this' using errcode = 'P0001';
  end if;
  if request.status <> 'pending' then
    -- Two admins clicking at once; the second should see the outcome,
    -- not an error about a race they had no way to know about.
    return request;
  end if;

  if approve then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (request.workspace_id, request.user_id, 'member')
    on conflict (workspace_id, user_id) do nothing;

    insert into public.space_members (space_id, user_id, workspace_id, level, added_by)
    values (request.space_id, request.user_id, request.workspace_id, level, auth.uid())
    on conflict (space_id, user_id) do update set level = excluded.level;

    /*
      Per-project grants. Only for projects that are actually in this
      space — a json body naming a project somewhere else would
      otherwise be a way to grant yourself a roster row anywhere.
    */
    for entry in
      select pr.id as project_id, (project_levels ->> pr.id::text) as wanted
      from public.projects pr
      where pr.space_id = request.space_id
        and project_levels ? pr.id::text
    loop
      if entry.wanted in ('viewer', 'commenter', 'editor', 'admin') then
        insert into public.project_members (project_id, user_id, role, level)
        values (
          entry.project_id,
          request.user_id,
          /*
            The old role column stays meaningful: a viewer is a viewer on
            the roster too, so anything reading `role` alone still sees
            something true.

            Cast explicitly. A CASE over bare literals is `text`, and
            Postgres will not coerce text into an enum column - it
            refuses with "column role is of type project_role but
            expression is of type text".
          */
          (case when entry.wanted = 'viewer' then 'viewer' else 'member' end)::public.project_role,
          entry.wanted::public.permission_level
        )
        on conflict (project_id, user_id)
        do update set level = excluded.level, role = excluded.role;
      end if;
    end loop;
  end if;

  /*
    Every CASE below is cast.

    A CASE over bare literals has type `text` — unlike a bare literal on
    its own, which is `unknown` and coerces to whatever the column or
    parameter needs. Postgres will not put text into an enum, and says so
    one column at a time, so they are all done together here rather than
    discovered in sequence.
  */
  update public.space_join_requests
  set status = (case when approve then 'approved' else 'declined' end)::public.join_request_status,
      granted_level = case when approve then level end,
      decided_by = auth.uid(),
      decided_at = now()
  where id = request_id
  returning * into request;

  select s.name into space_name from public.spaces s where s.id = request.space_id;

  perform public.notify_user(
    request.user_id, request.workspace_id,
    (case when approve then 'space_join_approved' else 'space_join_declined' end)::public.notification_kind,
    case when approve then 'You are in ' || space_name
         else 'Your request to join ' || space_name || ' was declined' end,
    null, null, null, null, null, null, null, request.space_id
  );

  return request;
end;
$$;

grant execute on function public.decide_space_join(
  uuid, boolean, public.permission_level, jsonb
) to authenticated;

/* ------------------------------------------------------------------ */
/* Changing it afterwards                                              */
/* ------------------------------------------------------------------ */

/*
  An admin adjusting one person on one project, after the fact.

  A function rather than a policy on `project_members` because the write
  is an upsert whose meaning depends on the SPACE the project sits in —
  and because "null clears the override" is a third case a plain update
  policy would have to express as deleting a row, which reads as removing
  somebody from the project.
*/
create or replace function public.set_project_level(
  p_project uuid,
  p_user uuid,
  p_level public.permission_level default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  space uuid;
begin
  select pr.space_id into space from public.projects pr where pr.id = p_project;
  if space is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;
  if not public.can_manage_space(space) then
    raise exception 'Only a space or workspace admin can change access' using errcode = 'P0001';
  end if;

  if p_level is null then
    -- Back to inheriting: the roster row stays, the override goes.
    update public.project_members set level = null
    where project_id = p_project and user_id = p_user;
    return;
  end if;

  insert into public.project_members (project_id, user_id, role, level)
  values (
    p_project, p_user,
    -- Cast, for the same reason as in decide_space_join above.
    (case when p_level = 'viewer' then 'viewer' else 'member' end)::public.project_role,
    p_level
  )
  on conflict (project_id, user_id)
  do update set level = excluded.level, role = excluded.role;
end;
$$;

grant execute on function public.set_project_level(uuid, uuid, public.permission_level) to authenticated;
