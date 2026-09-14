-- Tyriaq — actor_name() must never return null
--
-- It returned null whenever there was no profile row for the caller —
-- a system-run insert, a backfill, a trigger firing outside a request.
-- Every notification title is built as `actor_name() || ' did a thing'`,
-- and in SQL `null || text` is null, so the title came out null, the
-- NOT NULL on notifications.title refused the row, and the refusal took
-- down the write that fired the trigger.
--
-- Which means adding somebody to a workspace could fail with a
-- constraint error about notifications. Found by executing the join
-- flow locally rather than in production.
--
-- The coalesce has to wrap the whole subquery: it was inside it, where
-- it only ever fixed an EMPTY name, not a missing row.

create or replace function public.actor_name()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select nullif(p.full_name, '') from public.profiles p where p.id = auth.uid()),
    'Somebody'
  );
$$;
