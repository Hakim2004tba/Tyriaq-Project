-- Tyriaq — three notification kinds for space join requests
--
-- In its own file, ahead of the feature that uses them, because
-- `alter type ... add value` cannot be used by statements in the same
-- transaction that added it. Run this one first; the functions in
-- `20260908000100` only mention the values at call time, which is
-- afterwards.

alter type public.notification_kind add value if not exists 'space_join_request';
alter type public.notification_kind add value if not exists 'space_join_approved';
alter type public.notification_kind add value if not exists 'space_join_declined';
