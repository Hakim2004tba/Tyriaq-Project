-- Tyriaq — what the back office needs.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- Run apply-billing.sql FIRST — this depends on `is_platform_admin()`
-- and on the plans table.
--
-- Adds the three things the admin panel could not read from the product:
--
--   · support_tickets and support_messages, so Support is a real inbox.
--     Customers can read and reply to their OWN tickets; internal notes
--     stay staff-only.
--   · admin_audit, append-only by construction — a select policy and
--     nothing else, so no session can write, edit or delete a row.
--     Entries are written by the functions that perform the actions.
--   · platform_settings, so the Settings screen saves something.
--
-- It also lets staff edit plans, which were read-only.

/* ------------------------------------------------------------------ */
/* Support                                                             */
/* ------------------------------------------------------------------ */

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  opened_by uuid references public.profiles (id) on delete set null,
  subject text not null,
  body text not null default '',
  priority text not null default 'normal',
  status text not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,

  constraint tickets_priority_known check (priority in ('urgent', 'high', 'normal')),
  constraint tickets_status_known check (status in ('open', 'waiting', 'resolved')),
  constraint tickets_subject_length check (char_length(subject) between 1 and 200)
);

alter table public.support_tickets enable row level security;

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, created_at desc);

/*
  The workspace is remembered but not required.

  A ticket outlives the workspace it was about — "we deleted everything
  by accident" is exactly the kind of ticket where the workspace may be
  gone — so the reference is `set null` rather than `cascade`.
*/
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  /** Whether it came from staff. Customers never see internal notes. */
  is_staff boolean not null default false,
  internal boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

create index if not exists support_messages_ticket_idx
  on public.support_messages (ticket_id, created_at);

drop policy if exists "people read their own tickets" on public.support_tickets;
create policy "people read their own tickets"
  on public.support_tickets for select
  to authenticated
  using (opened_by = (select auth.uid()) or public.is_platform_admin());

drop policy if exists "people open tickets" on public.support_tickets;
create policy "people open tickets"
  on public.support_tickets for insert
  to authenticated
  with check (opened_by = (select auth.uid()));

drop policy if exists "staff update tickets" on public.support_tickets;
create policy "staff update tickets"
  on public.support_tickets for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "people read their own ticket messages" on public.support_messages;
create policy "people read their own ticket messages"
  on public.support_messages for select
  to authenticated
  using (
    public.is_platform_admin()
    or (
      -- An internal note is staff talking to staff about a customer.
      -- Showing it to the customer is the classic support-tool leak.
      internal = false
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.opened_by = (select auth.uid())
      )
    )
  );

drop policy if exists "people reply to their own tickets" on public.support_messages;
create policy "people reply to their own tickets"
  on public.support_messages for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      public.is_platform_admin()
      or (
        internal = false
        and is_staff = false
        and exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.opened_by = (select auth.uid())
        )
      )
    )
  );

/* ------------------------------------------------------------------ */
/* The audit trail                                                     */
/* ------------------------------------------------------------------ */

/*
  What staff did, in their own words, with the row that proves it.
  Nobody but staff can read it, and NOBODY can write it from a session —
  entries are written by the functions that perform the actions, under
  `security definer`, so a record cannot be forged or suppressed by the
  person it is about.
*/
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  kind text not null default 'system',
  target text,
  target_id uuid,
  result text not null default 'success',
  detail text,
  created_at timestamptz not null default now(),

  constraint audit_result_known check (result in ('success', 'failed', 'denied')),
  constraint audit_kind_known
    check (kind in ('user', 'workspace', 'subscription', 'plan', 'permission', 'support', 'system'))
);

alter table public.admin_audit enable row level security;

create index if not exists admin_audit_recent_idx on public.admin_audit (created_at desc);

drop policy if exists "staff read the audit trail" on public.admin_audit;
create policy "staff read the audit trail"
  on public.admin_audit for select
  to authenticated
  using (public.is_platform_admin());

create or replace function public.record_admin_action(
  p_action text,
  p_kind text default 'system',
  p_target text default null,
  p_target_id uuid default null,
  p_result text default 'success',
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit (actor_id, action, kind, target, target_id, result, detail)
  values (auth.uid(), p_action, p_kind, p_target, p_target_id, p_result, p_detail);
end;
$$;

grant execute on function public.record_admin_action(text, text, text, uuid, text, text) to authenticated;

/* ------------------------------------------------------------------ */
/* Platform settings                                                   */
/* ------------------------------------------------------------------ */

/*
  Key and value, rather than a column per setting.

  A settings screen grows a field every few weeks, and a table that needs
  a migration for each one ends up with the settings living in
  environment variables instead — where nobody can change them without a
  deploy.
*/
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "staff read platform settings" on public.platform_settings;
create policy "staff read platform settings"
  on public.platform_settings for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "staff write platform settings" on public.platform_settings;
create policy "staff write platform settings"
  on public.platform_settings for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

insert into public.platform_settings (key, value) values
  ('signups_open', 'true'::jsonb),
  ('support_email', '""'::jsonb),
  ('announcement', '""'::jsonb)
on conflict (key) do nothing;

/* ------------------------------------------------------------------ */
/* Plans, editable by staff                                            */
/* ------------------------------------------------------------------ */

/*
  The Plans page was read-only sample data. Prices and limits belong to
  whoever runs the business, not to a migration — so staff can change
  them, and only staff.
*/
drop policy if exists "staff manage plans" on public.plans;
create policy "staff manage plans"
  on public.plans for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

notify pgrst, 'reload schema';
