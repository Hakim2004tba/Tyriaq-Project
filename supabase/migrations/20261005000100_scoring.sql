-- Tyriaq — points, and the ways a project measures its people
--
-- "A member earns points for finishing a task." Easy to ask for, and
-- easy to build badly: points per completed task is farmed by anybody
-- who creates ten trivial tasks and ticks them off, and a leaderboard
-- that can be farmed is worse than no leaderboard — it does not just
-- fail to measure contribution, it actively rewards the wrong thing and
-- teaches the team that the number is noise.
--
-- So the model is built around four decisions:
--
-- 1. A LEDGER, NOT A COUNTER. Every award is a row saying what happened,
--    which rule paid, and how much. A running total on a member row
--    could not be audited, could not be explained — "why do I have 40
--    points?" — and could not be undone when a task is reopened.
--
-- 2. EFFORT, NOT COUNT. A rule can pay by the task's estimate or its
--    priority, so a two-minute task and a two-day task are not worth the
--    same. This is the single biggest defence against farming.
--
-- 3. A DAILY CEILING PER RULE. Even weighted, a burst of small work
--    should not dominate a month. The cap is per person per rule per
--    day, and it is visible in the settings so nobody discovers it by
--    hitting it.
--
-- 4. REVERSIBLE. Reopening a completed task takes its points back, by
--    writing a NEGATIVE row rather than deleting the original: the
--    history of what was awarded and then withdrawn is itself worth
--    keeping.
--
-- Beyond task completion there are two other ways to earn, because a
-- project where the only measurable act is closing a ticket quietly
-- tells everybody that reviewing, helping and writing things down do not
-- count:
--
--   · KUDOS — a teammate gives you points from a small weekly budget.
--     Nobody can give to themselves, and the budget is what makes it
--     mean something.
--   · REVIEW RATINGS — whoever moves work out of review can rate it,
--     and the rating pays the person who did the work.

/* ------------------------------------------------------------------ */
/* The rules a project scores by                                       */
/* ------------------------------------------------------------------ */

create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,

  /*
    What earns. A closed set: the engine has to recognise it, and a
    rule nothing awards is a promise the project silently never keeps.
  */
  event text not null,

  points integer not null default 10,

  /*
    How the points scale.

    `flat`     — always `points`.
    `estimate` — `points` per hour estimated, so a day of work pays more
                 than ten minutes. Falls back to flat when nobody
                 estimated, because punishing people for an unestimated
                 task would make the estimate a chore rather than a tool.
    `priority` — multiplied by urgency: urgent 2x, high 1.5x, medium 1x,
                 low 0.5x.
  */
  weight text not null default 'flat',

  /** Most somebody can earn from this rule in a day. Null means no cap. */
  daily_cap integer,

  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint scoring_rules_event_known check (
    event in (
      'task_completed',
      'completed_on_time',
      'completed_early',
      'review_passed',
      'kudos_received',
      'comment_posted',
      'time_logged'
    )
  ),
  constraint scoring_rules_weight_known check (weight in ('flat', 'estimate', 'priority')),
  constraint scoring_rules_points_sane check (points between -1000 and 1000),
  constraint scoring_rules_cap_sane check (daily_cap is null or daily_cap between 1 and 100000),
  -- One rule per event per project: two rules paying for the same thing
  -- is a question nobody should have to answer at award time.
  unique (project_id, event)
);

alter table public.scoring_rules enable row level security;

/* ------------------------------------------------------------------ */
/* The ledger                                                          */
/* ------------------------------------------------------------------ */

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,

  event text not null,
  points integer not null,

  /** What it was for, so a total can always be explained. */
  task_id uuid references public.tasks (id) on delete set null,
  /** Who caused it — the giver of kudos, the reviewer. */
  actor_id uuid references public.profiles (id) on delete set null,
  reason text,

  /*
    Idempotency.

    "Completed task X" must pay once however many times the status is
    nudged. The key is built by the engine from the event and the thing
    it is about; a reversal uses the same key with a `-` prefix, so a
    withdrawal also happens only once.
  */
  dedupe_key text,

  created_at timestamptz not null default now()
);

alter table public.score_events enable row level security;

create unique index if not exists score_events_dedupe_unique
  on public.score_events (project_id, user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists score_events_leaderboard_idx
  on public.score_events (project_id, created_at desc);

create index if not exists score_events_person_idx
  on public.score_events (project_id, user_id, created_at desc);

/* ------------------------------------------------------------------ */
/* Kudos                                                               */
/* ------------------------------------------------------------------ */

/*
  Peer recognition, with a budget.

  The budget is the whole mechanism. Unlimited praise is worth nothing
  and becomes a popularity contest; five a week means spending one is a
  decision, which is what makes receiving one a signal.
*/
create table if not exists public.kudos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  message text not null default '',
  created_at timestamptz not null default now(),

  constraint kudos_not_self check (from_user <> to_user),
  constraint kudos_message_length check (char_length(message) <= 300)
);

alter table public.kudos enable row level security;

create index if not exists kudos_budget_idx on public.kudos (project_id, from_user, created_at desc);
create index if not exists kudos_received_idx on public.kudos (project_id, to_user, created_at desc);

/** How many a person may give per week. Deliberately small. */
create or replace function public.kudos_remaining(p_project uuid, p_user uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    5 - (
      select count(*)::integer from public.kudos k
      where k.project_id = p_project
        and k.from_user = p_user
        and k.created_at > now() - interval '7 days'
    )
  );
$$;

grant execute on function public.kudos_remaining(uuid, uuid) to authenticated;

/* ------------------------------------------------------------------ */
/* Who sees and who edits                                              */
/* ------------------------------------------------------------------ */

/*
  Everybody on the project reads everything here.

  A leaderboard whose workings are private is a leaderboard nobody
  believes. The rules, the ledger and the kudos are all visible to the
  people being measured by them — that transparency is not a nicety, it
  is what makes the number arguable, and therefore trustable.
*/
drop policy if exists "people read scoring rules" on public.scoring_rules;
create policy "people read scoring rules"
  on public.scoring_rules for select
  to authenticated
  using (public.can_see_project(project_id));

/*
  Only a space or workspace admin changes them — the same bar as who is
  in the space. Somebody who could rewrite the rules they are measured
  by is not being measured.
*/
drop policy if exists "managers write scoring rules" on public.scoring_rules;
create policy "managers write scoring rules"
  on public.scoring_rules for all
  to authenticated
  using (
    public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
  )
  with check (
    public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
    and workspace_id = (select p.workspace_id from public.projects p where p.id = project_id)
  );

drop policy if exists "people read the ledger" on public.score_events;
create policy "people read the ledger"
  on public.score_events for select
  to authenticated
  using (public.can_see_project(project_id));

/*
  No insert, update or delete policy on the ledger at all.

  Points are written by `award_points` alone. A client that could insert
  here could award itself a thousand points, and one that could delete
  could erase the evidence — which between them is every way a
  leaderboard dies.
*/

drop policy if exists "people read kudos" on public.kudos;
create policy "people read kudos"
  on public.kudos for select
  to authenticated
  using (public.can_see_project(project_id));

/* Giving kudos goes through a function too, for the budget check. */

/* ------------------------------------------------------------------ */
/* Awarding                                                            */
/* ------------------------------------------------------------------ */

/*
  Writes one ledger row, applying the project's rule for that event.

  Returns the points actually awarded, which may be zero — because the
  rule is off, because the daily cap is reached, or because this exact
  award already happened. Zero is a normal answer, not a failure.
*/
create or replace function public.award_points(
  p_project uuid,
  p_user uuid,
  p_event text,
  p_task uuid default null,
  p_actor uuid default null,
  p_reason text default null,
  p_dedupe text default null,
  /** Hours of work, for an `estimate`-weighted rule. */
  p_hours numeric default null,
  /** The task's priority, for a `priority`-weighted rule. */
  p_priority text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule public.scoring_rules;
  earned numeric;
  awarded_today integer;
  ws uuid;
begin
  select * into rule
  from public.scoring_rules
  where project_id = p_project and event = p_event and enabled;

  if rule.id is null then
    return 0;
  end if;

  earned := rule.points;

  if rule.weight = 'estimate' then
    /*
      Per hour estimated, and an unestimated task still pays the base.
      Paying nothing for an unestimated task would turn the estimate
      field into a toll — people would fill it in to be paid rather than
      to plan, which is how an estimate stops being useful.
    */
    earned := rule.points * greatest(coalesce(p_hours, 1), 0.25);
  elsif rule.weight = 'priority' then
    earned := rule.points * case p_priority
      when 'urgent' then 2
      when 'high' then 1.5
      when 'low' then 0.5
      else 1
    end;
  end if;

  earned := round(earned);
  if earned = 0 then
    return 0;
  end if;

  -- The daily ceiling, counted over what this rule has already paid
  -- this person today.
  if rule.daily_cap is not null then
    select coalesce(sum(points), 0) into awarded_today
    from public.score_events
    where project_id = p_project
      and user_id = p_user
      and event = p_event
      and points > 0
      and created_at >= date_trunc('day', now());

    if awarded_today >= rule.daily_cap then
      return 0;
    end if;
    earned := least(earned, rule.daily_cap - awarded_today);
  end if;

  select workspace_id into ws from public.projects where id = p_project;

  insert into public.score_events
    (project_id, workspace_id, user_id, event, points, task_id, actor_id, reason, dedupe_key)
  values
    (p_project, ws, p_user, p_event, earned::integer, p_task, p_actor, p_reason, p_dedupe)
  -- Already awarded. The second attempt is not an error, it is the
  -- same thing happening twice.
  on conflict do nothing;

  if not found then
    return 0;
  end if;

  return earned::integer;
end;
$$;

grant execute on function public.award_points(
  uuid, uuid, text, uuid, uuid, text, text, numeric, text
) to authenticated;

/*
  Takes points back, as a negative row rather than a deletion.

  A reopened task should not quietly keep paying — but the record that
  it was awarded and then withdrawn is worth more than a clean total.
  Somebody asking "did I get points for that?" deserves the whole story.
*/
create or replace function public.revoke_points(
  p_project uuid,
  p_user uuid,
  p_dedupe text,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  original public.score_events;
  ws uuid;
begin
  select * into original
  from public.score_events
  where project_id = p_project and user_id = p_user and dedupe_key = p_dedupe
  limit 1;

  if original.id is null or original.points <= 0 then
    return 0;
  end if;

  select workspace_id into ws from public.projects where id = p_project;

  insert into public.score_events
    (project_id, workspace_id, user_id, event, points, task_id, actor_id, reason, dedupe_key)
  values
    (p_project, ws, p_user, original.event, -original.points, original.task_id, auth.uid(),
     coalesce(p_reason, 'Reversed'), '-' || p_dedupe)
  on conflict do nothing;

  if not found then
    return 0;
  end if;

  return -original.points;
end;
$$;

grant execute on function public.revoke_points(uuid, uuid, text, text) to authenticated;

/*
  Giving kudos: the budget check and the award, together.

  In one function because they are one act — a kudos row written without
  its points, or points without the row, is a bug nobody would notice
  until somebody counted.
*/
create or replace function public.give_kudos(
  p_project uuid,
  p_to uuid,
  p_message text default '',
  p_task uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  kudos_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = 'P0001';
  end if;
  if p_to = auth.uid() then
    raise exception 'You cannot thank yourself' using errcode = 'P0001';
  end if;
  if not public.can_see_project(p_project) then
    raise exception 'You are not on that project' using errcode = 'P0001';
  end if;
  if public.kudos_remaining(p_project, auth.uid()) <= 0 then
    raise exception 'You have given all your kudos this week' using errcode = 'P0001';
  end if;

  select workspace_id into ws from public.projects where id = p_project;

  insert into public.kudos (project_id, workspace_id, from_user, to_user, task_id, message)
  values (p_project, ws, auth.uid(), p_to, p_task, left(coalesce(p_message, ''), 300))
  returning id into kudos_id;

  return public.award_points(
    p_project, p_to, 'kudos_received', p_task, auth.uid(),
    nullif(left(coalesce(p_message, ''), 200), ''),
    'kudos:' || kudos_id::text
  );
end;
$$;

grant execute on function public.give_kudos(uuid, uuid, text, uuid) to authenticated;

/* ------------------------------------------------------------------ */
/* The leaderboard                                                     */
/* ------------------------------------------------------------------ */

/*
  Totals, with the figures that stop a total being the whole story.

  Points alone reward volume. `on_time_rate` and `completed` sit beside
  them so a project can see the person who finished eleven things late
  next to the one who finished four on time — and decide for itself
  which it would rather have.
*/
create or replace function public.project_leaderboard(p_project uuid, p_since timestamptz default null)
returns table (
  user_id uuid,
  points integer,
  completed integer,
  on_time integer,
  kudos_received integer,
  last_earned timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.user_id,
    coalesce(sum(s.points), 0)::integer,
    count(*) filter (where s.event = 'task_completed' and s.points > 0)::integer,
    count(*) filter (where s.event = 'completed_on_time' and s.points > 0)::integer,
    count(*) filter (where s.event = 'kudos_received' and s.points > 0)::integer,
    max(s.created_at)
  from public.score_events s
  where s.project_id = p_project
    and (p_since is null or s.created_at >= p_since)
    -- The caller must be able to see the project; without this the
    -- function would hand any signed-in person another team's standings.
    and public.can_see_project(p_project)
  group by s.user_id
  order by 2 desc;
$$;

grant execute on function public.project_leaderboard(uuid, timestamptz) to authenticated;

/*
  Turns scoring on for a project, with a set of rules that already make
  sense.

  A points system that arrives empty is one nobody configures — the
  defaults are the design, and they say what this product thinks is
  worth rewarding: finishing things, finishing them on time, work that
  passes review, and being useful to somebody else.
*/
create or replace function public.enable_scoring(p_project uuid)
returns setof public.scoring_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  space uuid;
begin
  select workspace_id, space_id into ws, space from public.projects where id = p_project;
  if ws is null then
    raise exception 'Project does not exist' using errcode = 'P0001';
  end if;
  if not public.can_manage_space(space) then
    raise exception 'Only a space or workspace admin can set up scoring' using errcode = 'P0001';
  end if;

  insert into public.scoring_rules (project_id, workspace_id, event, points, weight, daily_cap)
  values
    -- Paid per hour estimated, so size matters more than count.
    (p_project, ws, 'task_completed',    5,  'estimate', 200),
    -- A bonus on top, flat: being on time is worth the same whatever
    -- the task, and scaling it would pay most for being on time with
    -- the work that had the most slack.
    (p_project, ws, 'completed_on_time', 10, 'flat',     100),
    (p_project, ws, 'completed_early',   5,  'flat',     50),
    (p_project, ws, 'review_passed',     15, 'flat',     100),
    (p_project, ws, 'kudos_received',    20, 'flat',     null)
  on conflict (project_id, event) do nothing;

  return query select * from public.scoring_rules where project_id = p_project order by event;
end;
$$;

grant execute on function public.enable_scoring(uuid) to authenticated;
