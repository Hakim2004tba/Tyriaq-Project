-- Tyriaq — invitations
--
-- Until now a workspace could only ever contain the person who created
-- it: `workspace_members` had no path in for anybody else. This is that
-- path.
--
-- An invitation is a row, not an email. The email (or the link, or the
-- message) is just how the token travels — which means invitations work
-- before any mail provider is configured, and keep working if one is
-- swapped out later.

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  /*
    Lower-cased on write.

    Mail addresses are case-insensitive in the part that matters, and an
    invitation to `Ahmed@x.com` that refuses `ahmed@x.com` would be a
    dead end nobody could diagnose from the outside.
  */
  email text not null,
  role public.workspace_role not null default 'member',

  /*
    The secret in the link.

    Long and random: this token IS the authorisation to join, so it has
    to be unguessable. `gen_random_bytes` is from pgcrypto, which
    Supabase enables by default.
  */
  token text not null unique default encode(gen_random_bytes(24), 'hex'),

  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- An invitation that never expires is a permanent key to the
  -- workspace sitting in somebody's inbox.
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,

  constraint workspace_invitations_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

alter table public.workspace_invitations enable row level security;

create index workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id);
create index workspace_invitations_email_idx on public.workspace_invitations (email);

-- One live invitation per address per workspace. Re-inviting somebody
-- should not litter the list with five rows that all still work.
create unique index workspace_invitations_pending_unique
  on public.workspace_invitations (workspace_id, email)
  where accepted_at is null;

create or replace function public.invitations_normalise_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger invitations_normalise_email
  before insert or update of email on public.workspace_invitations
  for each row execute function public.invitations_normalise_email();

/*
  Admins manage invitations; nobody else sees them.

  The invitee cannot read this table at all — they arrive holding a
  token, and `invitation_preview()` below answers for exactly that row
  without exposing the rest.
*/
create policy "admins read invitations"
  on public.workspace_invitations for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "admins create invitations"
  on public.workspace_invitations for insert
  to authenticated
  with check (invited_by = auth.uid() and public.is_workspace_admin(workspace_id));

create policy "admins revoke invitations"
  on public.workspace_invitations for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

/* ------------------------------------------------------------------ */
/* Accepting                                                           */
/* ------------------------------------------------------------------ */

/**
 * What the link says before you act on it.
 *
 * Runs as definer because the reader is, by definition, not yet a member
 * of anything. It returns only what a joining page needs — which
 * workspace, who invited you, whether it is still good — and never the
 * token, the other invitations, or anything about the workspace itself.
 */
create or replace function public.invitation_preview(invite_token text)
returns table (
  workspace_name text,
  invited_email text,
  invited_role public.workspace_role,
  inviter_name text,
  is_expired boolean,
  is_accepted boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    w.name,
    i.email,
    i.role,
    coalesce(nullif(p.full_name, ''), 'Somebody'),
    i.expires_at < now(),
    i.accepted_at is not null
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = invite_token;
$$;

/**
 * Joins the caller to the workspace the token names.
 *
 * The address on the invitation must match the account accepting it.
 * Without that check the link alone would be enough to join — and links
 * get forwarded, pasted into group chats and indexed by whatever sits in
 * front of somebody's inbox.
 *
 * Idempotent: accepting twice, or accepting when already a member,
 * succeeds quietly rather than erroring on the unique constraint. People
 * double-click, and links get opened twice.
 */
create or replace function public.accept_invitation(invite_token text)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.workspace_invitations;
  caller_email text;
  result public.workspaces;
begin
  select * into invite from public.workspace_invitations where token = invite_token;
  if invite.id is null then
    raise exception 'That invitation link is not valid' using errcode = 'P0001';
  end if;
  if invite.expires_at < now() then
    raise exception 'That invitation has expired — ask for a new one' using errcode = 'P0001';
  end if;

  select lower(u.email) into caller_email from auth.users u where u.id = auth.uid();
  if caller_email is null then
    raise exception 'Sign in to accept an invitation' using errcode = 'P0001';
  end if;
  if caller_email <> invite.email then
    raise exception 'This invitation was sent to % — sign in with that address', invite.email
      using errcode = 'P0001';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, auth.uid(), invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set accepted_at = coalesce(accepted_at, now()),
      accepted_by = coalesce(accepted_by, auth.uid())
  where id = invite.id;

  select * into result from public.workspaces where id = invite.workspace_id;
  return result;
end;
$$;

grant execute on function public.invitation_preview(text) to authenticated, anon;
grant execute on function public.accept_invitation(text) to authenticated;
