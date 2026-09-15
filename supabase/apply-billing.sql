-- Tyriaq — plans, limits, and who may open the back office.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- Three things:
--
--   1. `plans`, `workspace_subscriptions` and `billing_events`. A
--      workspace with no subscription row is on Free — which is every
--      workspace that exists today, so nothing changes until somebody
--      pays.
--
--   2. Limits that mean something: the Free plan allows 3 people and 2
--      projects, and the app now says so instead of letting you past.
--
--   3. `platform_admins`. The admin panel was open to anybody signed in,
--      which was harmless while it drew sample data and a hole the
--      moment it read a real subscription. Nobody is staff until you
--      add yourself — see the bottom of this file.
--
-- No payment provider is named anywhere in here. Stripe does not operate
-- in Algeria, so that question is still open, and everything here works
-- without an answer to it: a workspace can be put on a plan by hand and
-- the product will honour it.

-- ============================================================
-- 20260910000200_billing.sql
-- ============================================================
create table if not exists public.plans (
  id text primary key,
  name text not null,
  /*
    Minor units, integer. Never a float: 0.1 + 0.2 is not 0.3 in any
    currency, and the one place that must not happen is money.
  */
  price_cents integer not null default 0,
  currency text not null default 'USD',
  cycle text not null default 'monthly',

  -- Null means unlimited, which is different from zero.
  member_limit integer,
  project_limit integer,
  storage_limit_mb integer,

  features jsonb not null default '[]'::jsonb,
  /** Whether it appears on the pricing screen; Enterprise usually does not. */
  is_public boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),

  constraint plans_price_not_negative check (price_cents >= 0),
  constraint plans_cycle_known check (cycle in ('monthly', 'yearly', 'custom'))
);

alter table public.plans enable row level security;

-- Plans are public knowledge: the pricing page shows them to people who
-- have no account at all.
drop policy if exists "anybody reads public plans" on public.plans;
create policy "anybody reads public plans"
  on public.plans for select
  to anon, authenticated
  using (is_public);

create table if not exists public.workspace_subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  plan_id text not null references public.plans (id) on delete restrict,
  status text not null default 'active',

  /*
    Seats are recorded rather than counted at read time.

    What a workspace PAYS for and how many people are in it are
    different numbers — somebody removed mid-month does not reduce an
    invoice already issued, and a seat count that silently follows the
    member count cannot be reconciled with anything.
  */
  seats integer not null default 1,

  started_at timestamptz not null default now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  trial_ends_at timestamptz,

  -- Whatever ends up processing the payment. Empty until one does.
  provider text,
  provider_ref text,

  updated_at timestamptz not null default now(),

  constraint subscriptions_status_known
    check (status in ('trialing', 'active', 'past_due', 'cancelled'))
);

alter table public.workspace_subscriptions enable row level security;

drop policy if exists "members read their subscription" on public.workspace_subscriptions;
create policy "members read their subscription"
  on public.workspace_subscriptions for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

/*
  No insert or update policy, on purpose.

  A row here decides what a workspace is entitled to. If an admin could
  write it from the browser, the paid tiers would be a suggestion — so
  everything that changes a subscription goes through a function, and
  the only one that exists today records an intention to pay rather than
  granting anything.
*/

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null,
  plan_id text references public.plans (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

create index if not exists billing_events_workspace_idx
  on public.billing_events (workspace_id, created_at desc);

drop policy if exists "admins read their billing history" on public.billing_events;
create policy "admins read their billing history"
  on public.billing_events for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

/* ------------------------------------------------------------------ */
/* What a workspace is on, and what it is using                        */
/* ------------------------------------------------------------------ */

/*
  A workspace with no subscription row is on Free.

  Every workspace that already exists is in exactly that state, and
  backfilling rows for them would mean this migration deciding something
  it has no business deciding. Absence IS the free plan.
*/
create or replace function public.workspace_plan(p_workspace uuid)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.plans p
  where p.id = coalesce(
    (select s.plan_id from public.workspace_subscriptions s
      where s.workspace_id = p_workspace
        and s.status in ('trialing', 'active')),
    'free'
  );
$$;

create or replace function public.workspace_usage(p_workspace uuid)
returns table (members integer, projects integer, storage_mb numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.workspace_members m
      where m.workspace_id = p_workspace),
    (select count(*)::integer from public.projects pr
      where pr.workspace_id = p_workspace and pr.archived_at is null),
    /*
      Storage is what has been uploaded, from the rows that record it.
      Asking the storage API would mean a network call inside a policy
      check, and these numbers are drawn on every billing screen.
    */
    round(coalesce((
      select sum(a.size_bytes) from public.task_attachments a
       where a.workspace_id = p_workspace
    ), 0)::numeric / 1048576, 1);
$$;

grant execute on function public.workspace_plan(uuid) to authenticated;
grant execute on function public.workspace_usage(uuid) to authenticated;

/*
  Whether one more of something is allowed.

  Returns a reason rather than a boolean, because every caller needs to
  say WHY — "you are on Free, which allows three people" is a sentence
  somebody can act on, and `false` is not.
*/
create or replace function public.plan_allows(p_workspace uuid, p_what text)
returns table (allowed boolean, reason text, plan_name text, used integer, allowance integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  plan public.plans;
  usage record;
  current_count integer;
  cap integer;
begin
  select * into plan from public.workspace_plan(p_workspace);
  select * into usage from public.workspace_usage(p_workspace);

  if p_what = 'member' then
    current_count := usage.members;
    cap := plan.member_limit;
  elsif p_what = 'project' then
    current_count := usage.projects;
    cap := plan.project_limit;
  else
    return query select true, null::text, plan.name, 0, null::integer;
    return;
  end if;

  if cap is null then
    return query select true, null::text, plan.name, current_count, null::integer;
  elsif current_count < cap then
    return query select true, null::text, plan.name, current_count, cap;
  else
    return query select
      false,
      format('The %s plan allows %s %s%s.', plan.name, cap, p_what, case when cap = 1 then '' else 's' end),
      plan.name,
      current_count,
      cap;
  end if;
end;
$$;

grant execute on function public.plan_allows(uuid, text) to authenticated;

/* ------------------------------------------------------------------ */
/* Asking to pay                                                       */
/* ------------------------------------------------------------------ */

/*
  Records that a workspace wants a plan. It does NOT grant it.

  Tyriaq cannot take a payment yet — the provider question is open — and
  a function that moved a workspace onto Pro because somebody pressed
  Upgrade would be giving the product away while looking like billing.
  So this writes an event an admin can act on, and the plan changes when
  money actually arrives.
*/
create or replace function public.request_plan(p_workspace uuid, p_plan text, p_note text default '')
returns public.billing_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.billing_events;
begin
  if not public.is_workspace_admin(p_workspace) then
    raise exception 'Only an owner or admin can change the plan' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.plans where id = p_plan) then
    raise exception 'No such plan' using errcode = 'P0001';
  end if;

  insert into public.billing_events (workspace_id, kind, plan_id, actor_id, note)
  values (p_workspace, 'requested', p_plan, auth.uid(), left(coalesce(p_note, ''), 500))
  returning * into result;

  return result;
end;
$$;

grant execute on function public.request_plan(uuid, text, text) to authenticated;

/*
  Moves a workspace onto a plan. Service-role only.

  No `to authenticated` grant: this is called by whatever confirms a
  payment — a webhook, or a person in the admin panel — never by a
  browser holding a session.
*/
create or replace function public.set_workspace_plan(
  p_workspace uuid,
  p_plan text,
  p_status text default 'active',
  p_seats integer default 1,
  p_renews_at timestamptz default null,
  p_provider text default null,
  p_provider_ref text default null
)
returns public.workspace_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.workspace_subscriptions;
begin
  insert into public.workspace_subscriptions
    (workspace_id, plan_id, status, seats, renews_at, provider, provider_ref, updated_at)
  values
    (p_workspace, p_plan, p_status, greatest(p_seats, 1), p_renews_at, p_provider, p_provider_ref, now())
  on conflict (workspace_id) do update set
    plan_id = excluded.plan_id,
    status = excluded.status,
    seats = excluded.seats,
    renews_at = excluded.renews_at,
    provider = coalesce(excluded.provider, public.workspace_subscriptions.provider),
    provider_ref = coalesce(excluded.provider_ref, public.workspace_subscriptions.provider_ref),
    cancelled_at = case when excluded.status = 'cancelled' then now() else null end,
    updated_at = now()
  returning * into result;

  insert into public.billing_events (workspace_id, kind, plan_id, note)
  values (p_workspace, 'plan_set', p_plan, format('status %s, %s seat(s)', p_status, p_seats));

  return result;
end;
$$;

revoke execute on function public.set_workspace_plan(uuid, text, text, integer, timestamptz, text, text) from authenticated;

/* ------------------------------------------------------------------ */
/* The plans themselves                                                */
/* ------------------------------------------------------------------ */

/*
  The same five the admin panel has been drawing from sample data, with
  the same names, prices and limits. Nothing invented here: the pricing
  decision is not this migration's to make, and these can be edited in
  place once it is.
*/
insert into public.plans (id, name, price_cents, currency, cycle, member_limit, project_limit, storage_limit_mb, features, is_public, position)
values
  ('free', 'Free', 0, 'USD', 'monthly', 3, 2, 1024,
   '["Up to 3 members","2 projects","Board and list views","Community support"]'::jsonb, true, 0),
  ('team', 'Team', 900, 'USD', 'monthly', 10, null, 20480,
   '["Up to 10 members","Unlimited projects","Calendar and timeline","Email support"]'::jsonb, true, 1),
  ('business', 'Business', 1900, 'USD', 'monthly', 50, null, 102400,
   '["Up to 50 members","Documents and chat","Reporting","Priority support"]'::jsonb, true, 2),
  ('pro', 'Pro', 2900, 'USD', 'monthly', 200, null, 512000,
   '["Up to 200 members","Advanced permissions","Audit history","SSO"]'::jsonb, true, 3),
  ('enterprise', 'Enterprise', 7900, 'USD', 'custom', null, null, null,
   '["Unlimited members","Unlimited storage","Dedicated support","Custom contract"]'::jsonb, false, 4)
on conflict (id) do update set
  name = excluded.name,
  member_limit = excluded.member_limit,
  project_limit = excluded.project_limit,
  storage_limit_mb = excluded.storage_limit_mb,
  features = excluded.features,
  position = excluded.position;

-- ============================================================
-- 20260910000300_platform_admins.sql
-- ============================================================
create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

/*
  Readable only by the people in it.

  Anybody else asking gets an empty set rather than a refusal, which is
  the same answer they would get if the table were empty — there is no
  reason for a customer to be able to learn that a staff list exists, let
  alone who is on it.
*/

/*
  No insert, update or delete policy at all.

  The first platform admin is added with SQL, by somebody holding the
  database credentials. There is no path from a browser session to
  granting yourself the back office, and that is the property worth
  having — the alternative is one bug away from every workspace's data.
*/

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

/*
  Through the function, NOT an inline `exists` over this same table.

  A policy on platform_admins that reads platform_admins re-enters
  itself, and Postgres refuses the whole query with "infinite recursion
  detected in policy". `is_platform_admin()` is SECURITY DEFINER, so it
  runs as the table's owner and is not subject to the policy — breaking
  the cycle is the entire reason the function exists, and the same trick
  keeps every other policy in this schema from recursing.
*/
drop policy if exists "platform admins read the list" on public.platform_admins;
create policy "platform admins read the list"
  on public.platform_admins for select
  to authenticated
  using (public.is_platform_admin());

/*
  To make somebody staff, run this as the database owner:

    insert into public.platform_admins (user_id, note)
    select id, 'founder' from auth.users where email = 'you@example.com';
*/

-- ============================================================
-- Make yourself staff
-- ============================================================

/*
  Edit the address and run this line. Without it, /admin is a 404 for
  everybody — including you.
*/
insert into public.platform_admins (user_id, note)
select id, 'founder' from auth.users where email = 'aissahakim20@gmail.com'
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
