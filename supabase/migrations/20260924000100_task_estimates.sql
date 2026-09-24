-- Tyriaq — task estimates
--
-- The task panel has shown an estimate next to the time logged since
-- time tracking was built, and compares the two to warn when work has
-- run over. It reads `detail.estimateMinutes`, which was never stored
-- anywhere — it came from `emptyDetail()` and was therefore always
-- zero, so the comparison could never fire and the field could not be
-- set.
--
-- A number on screen that no write path can change is worse than a
-- missing feature: somebody types into it, sees nothing happen, and
-- learns not to trust the panel.

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
