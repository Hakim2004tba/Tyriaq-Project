-- Tyriaq — task estimates.
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- The task panel has compared time logged against an estimate since
-- time tracking was built, reading a field that was never stored — so
-- it was always zero, the bar never appeared, and the number could not
-- be set. This gives it a column, and the panel an input.

alter table public.tasks
  add column if not exists estimate_minutes integer not null default 0;

alter table public.tasks
  drop constraint if exists tasks_estimate_sane;

/*
  A day of work per task is already a large estimate; anything past a
  fortnight is somebody typing minutes where they meant hours, and it
  would quietly wreck every capacity figure it appears in.
*/
alter table public.tasks
  add constraint tasks_estimate_sane
  check (estimate_minutes >= 0 and estimate_minutes <= 20160);

comment on column public.tasks.estimate_minutes is
  'Expected effort in minutes. 0 means nobody has estimated it.';

notify pgrst, 'reload schema';
