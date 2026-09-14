-- Tyriaq — one notify_user, not two
--
-- `20260908000100` added a `p_space` argument by re-declaring
-- notify_user with twelve parameters. `create or replace function` does
-- not replace a function with a different signature — it creates a
-- second one. Both then matched every existing call site, because those
-- pass untyped NULLs for the trailing arguments, and Postgres refuses an
-- ambiguous call rather than guessing:
--
--   function public.notify_user(uuid, uuid, unknown, text, text,
--     unknown, unknown, unknown, uuid, uuid) is not unique
--
-- Which took out everything that raises a notification: sending a
-- message, assigning a task, moving one to Done.
--
-- The eleven-argument version goes. Its callers are triggers that name
-- fewer arguments than the survivor has, and the missing ones have
-- defaults, so they keep working untouched.

drop function if exists public.notify_user(
  uuid, uuid, public.notification_kind, text, text,
  uuid, uuid, uuid, uuid, uuid, uuid
);
