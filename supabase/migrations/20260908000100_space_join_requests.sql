-- Tyriaq — joining a space by link, with approval
--
-- The existing way into a space is: an admin invites you to the
-- workspace, you accept, then the admin adds you to the space. Three
-- steps, two of them the admin's, and the admin has to know your email
-- address before anything can start.
--
-- This is the other direction. A space admin copies one link and sends
-- it however they already talk to people. Whoever opens it asks to join;
-- the admin approves, and approval does everything at once — workspace
-- membership if they need it, space membership at the level chosen when
-- approving.
--
-- The link is not itself an entry. Anyone holding it can ASK, which is
-- deliberately cheap and reversible: a link that got forwarded around
-- produces requests somebody has to look at, not members nobody chose.

create table public.space_invite_links (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Same shape as the workspace invitation token: 24 random bytes, hex.
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.space_invite_links enable row level security;

/*
  One live link per space.

  Regenerating revokes the old one rather than adding a second, so
  "the link to this space" always means one thing — and revoking is
  something a person can reason about: the link they sent last week
  stops working, and there is no second one still open.
*/
create unique index space_invite_links_live_unique
  on public.space_invite_links (space_id)
  where revoked_at is null;

create index space_invite_links_workspace_idx on public.space_invite_links (workspace_id);

create type public.join_request_status as enum ('pending', 'approved', 'declined');

create table public.space_join_requests (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- "Hi, I'm the new designer" — optional, and the only thing the
  -- requester controls besides asking.
  note text not null default '',
  status public.join_request_status not null default 'pending',
  granted_level public.permission_level,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.space_join_requests enable row level security;

/*
  One pending request per person per space.

  Partial, so that a declined request does not block asking again later —
  circumstances change, and a permanent lockout from one "no" would be a
  support problem rather than a policy.
*/
create unique index space_join_requests_pending_unique
  on public.space_join_requests (space_id, user_id)
  where status = 'pending';

create index space_join_requests_space_idx on public.space_join_requests (space_id, status);
create index space_join_requests_user_idx on public.space_join_requests (user_id);

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

-- Links are an administrative object: only people who could add a member
-- by hand can see or mint one.
create policy "managers read space links"
  on public.space_invite_links for select
  to authenticated
  using (public.can_manage_space(space_id));

create policy "managers create space links"
  on public.space_invite_links for insert
  to authenticated
  with check (public.can_manage_space(space_id) and created_by = (select auth.uid()));

create policy "managers revoke space links"
  on public.space_invite_links for update
  to authenticated
  using (public.can_manage_space(space_id))
  with check (public.can_manage_space(space_id));

-- A requester sees their own request, so the page can say "waiting".
-- Managers see every request for their space, which is the queue.
create policy "requesters and managers read requests"
  on public.space_join_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or public.can_manage_space(space_id));

create policy "managers decide requests"
  on public.space_join_requests for update
  to authenticated
  using (public.can_manage_space(space_id))
  with check (public.can_manage_space(space_id));

/*
  There is no INSERT policy, on purpose.

  Asking to join happens through `request_space_join`, which is the only
  thing that has seen the token. Without that, an insert policy would
  have to allow any authenticated person to file a request against any
  space id they cared to guess — which is a way to spam every admin in
  the system from outside their workspace.
*/

/* ------------------------------------------------------------------ */
/* Notifications need somewhere to point                               */
/* ------------------------------------------------------------------ */

/*
  A join request is about a SPACE, and `notifications` had no column for
  one — every other kind hangs off a task, project, document or
  conversation. Without this the notification arrives unclickable, which
  for "somebody is waiting on you" is close to useless.
*/
alter table public.notifications
  add column if not exists space_id uuid references public.spaces (id) on delete cascade;

create index if not exists notifications_space_idx on public.notifications (space_id);

-- Same function, one more optional argument. Existing callers pass
-- nothing extra and behave exactly as before.
create or replace function public.notify_user(
  p_user uuid,
  p_workspace uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text default null,
  p_task uuid default null,
  p_project uuid default null,
  p_document uuid default null,
  p_conversation uuid default null,
  p_message uuid default null,
  p_comment uuid default null,
  p_space uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;

  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace and m.user_id = p_user
  ) then
    /*
      One exception to "members only": being approved into a workspace
      is news for somebody who was not a member a moment ago, and the
      membership row is written in the same transaction as this call, so
      whether it is visible here depends on statement order. The
      approval kinds are allowed through.
    */
    if p_kind not in ('space_join_approved', 'space_join_declined', 'workspace_added') then
      return;
    end if;
  end if;

  if exists (
    select 1 from public.notification_preferences p
    where p.user_id = p_user and p.workspace_id = p_workspace
      and p_kind = any (p.muted_kinds)
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id, workspace_id, actor_id, kind, title, body,
    task_id, project_id, document_id, conversation_id, message_id, comment_id, space_id
  )
  values (
    p_user, p_workspace, auth.uid(), p_kind, p_title, p_body,
    p_task, p_project, p_document, p_conversation, p_message, p_comment, p_space
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.notify_user(
  uuid, uuid, public.notification_kind, text, text,
  uuid, uuid, uuid, uuid, uuid, uuid, uuid
) to authenticated;

/* ------------------------------------------------------------------ */
/* What the link shows                                                 */
/* ------------------------------------------------------------------ */

/*
  Deliberately readable by anybody signed in, token in hand.

  It gives up the space's name, its workspace's name, and how many people
  are in it — which is what the recipient already learned from whoever
  sent them the link. It does not list members, projects, or anything
  inside.
*/
create or replace function public.space_link_preview(link_token text)
returns table (
  space_id uuid,
  space_name text,
  space_icon text,
  space_color public.space_color,
  workspace_name text,
  inviter_name text,
  member_count integer,
  is_revoked boolean,
  already_member boolean,
  pending_request boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.icon,
    s.color,
    w.name,
    coalesce(p.full_name, 'Someone'),
    (select count(*)::integer from public.space_members m where m.space_id = s.id),
    l.revoked_at is not null,
    exists (
      select 1 from public.space_members m
      where m.space_id = s.id and m.user_id = auth.uid()
    ),
    exists (
      select 1 from public.space_join_requests r
      where r.space_id = s.id and r.user_id = auth.uid() and r.status = 'pending'
    )
  from public.space_invite_links l
  join public.spaces s on s.id = l.space_id
  join public.workspaces w on w.id = l.workspace_id
  left join public.profiles p on p.id = l.created_by
  where l.token = link_token;
$$;

grant execute on function public.space_link_preview(text) to authenticated;

/* ------------------------------------------------------------------ */
/* Asking                                                              */
/* ------------------------------------------------------------------ */

create or replace function public.request_space_join(link_token text, request_note text default '')
returns public.space_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.space_invite_links;
  result public.space_join_requests;
  manager uuid;
  space_name text;
  asker_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to ask to join' using errcode = 'P0001';
  end if;

  select * into link from public.space_invite_links where token = link_token;
  if link.id is null then
    raise exception 'That link is not valid' using errcode = 'P0001';
  end if;
  if link.revoked_at is not null then
    raise exception 'That link has been turned off — ask for a new one' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.space_members m
    where m.space_id = link.space_id and m.user_id = auth.uid()
  ) then
    raise exception 'You are already in this space' using errcode = 'P0001';
  end if;

  insert into public.space_join_requests (space_id, workspace_id, user_id, note)
  values (link.space_id, link.workspace_id, auth.uid(), left(coalesce(request_note, ''), 300))
  -- Asking twice is the same as asking once; the second click should not
  -- be an error message.
  on conflict (space_id, user_id) where status = 'pending' do nothing
  returning * into result;

  if result.id is null then
    select * into result from public.space_join_requests
    where space_id = link.space_id and user_id = auth.uid() and status = 'pending';
    return result;
  end if;

  select s.name into space_name from public.spaces s where s.id = link.space_id;
  select coalesce(p.full_name, 'Someone') into asker_name
  from public.profiles p where p.id = auth.uid();

  /*
    Told to: everybody who could approve it.

    Space admins, and workspace admins and owners — the same set
    `can_manage_space` answers for. A request nobody is told about is a
    request that sits there, which is the failure mode this whole feature
    exists to avoid.
  */
  for manager in
    select m.user_id from public.space_members m
    where m.space_id = link.space_id and m.level = 'admin'
    union
    select m.user_id from public.workspace_members m
    where m.workspace_id = link.workspace_id and m.role in ('owner', 'admin')
  loop
    perform public.notify_user(
      manager, link.workspace_id, 'space_join_request',
      asker_name || ' wants to join ' || space_name,
      nullif(result.note, ''),
      null, null, null, null, null, null, link.space_id
    );
  end loop;

  return result;
end;
$$;

grant execute on function public.request_space_join(text, text) to authenticated;

/* ------------------------------------------------------------------ */
/* Deciding                                                            */
/* ------------------------------------------------------------------ */

/*
  Approval does all of it in one transaction: the workspace, if they are
  not in it yet, then the space at the level chosen here.

  That is the point of the whole feature. The old path made an admin
  invite somebody to the workspace, wait for them to accept, and only
  then add them to the space — three steps with a gap in the middle where
  nothing looks like it is happening.
*/
create or replace function public.decide_space_join(
  request_id uuid,
  approve boolean,
  level public.permission_level default 'editor'
)
returns public.space_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.space_join_requests;
  space_name text;
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
  end if;

  update public.space_join_requests
  set status = case when approve then 'approved' else 'declined' end,
      granted_level = case when approve then level end,
      decided_by = auth.uid(),
      decided_at = now()
  where id = request_id
  returning * into request;

  select s.name into space_name from public.spaces s where s.id = request.space_id;

  perform public.notify_user(
    request.user_id, request.workspace_id,
    case when approve then 'space_join_approved' else 'space_join_declined' end,
    case when approve then 'You are in ' || space_name
         else 'Your request to join ' || space_name || ' was declined' end,
    null, null, null, null, null, null, null, request.space_id
  );

  return request;
end;
$$;

grant execute on function public.decide_space_join(uuid, boolean, public.permission_level) to authenticated;
