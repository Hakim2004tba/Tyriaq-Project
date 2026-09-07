-- Tyriaq — let assignees be read with their names
--
-- `task_assignees.user_id` references `auth.users`, which is correct but
-- opaque to the API: there is no relationship from it to `profiles`, so
-- a board cannot ask for its assignees and their names in one query and
-- has to follow up with a second lookup per screen.
--
-- Adding the second key alongside the first states the relationship the
-- API needs without weakening the one that guarantees the account
-- exists. Every `profiles` row is keyed to an `auth.users` row, so the
-- two can never disagree.

alter table public.task_assignees
  add constraint task_assignees_user_id_profile_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
