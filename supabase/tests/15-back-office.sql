\set ON_ERROR_STOP on
\pset pager off

-- The back office: who can read it, and what a customer can see of it.

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'staff@tyriaq.test',    '{"full_name":"Staff Member"}'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'customer@tyriaq.test', '{"full_name":"A Customer"}')
on conflict (id) do nothing;

begin;
set local role postgres;
insert into public.platform_admins (user_id, note)
values ('eeeeeeee-0000-0000-0000-000000000001', 'test')
on conflict (user_id) do nothing;

set local role authenticated;

\echo '1. Staff are staff; customers are not'
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000001"}';
select public.is_platform_admin() as staff_yes;
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}';
select public.is_platform_admin() = false as customer_no;

\echo '2. A customer cannot see that the staff list exists'
select count(*) = 0 as staff_list_hidden from public.platform_admins;

\echo '3. Nobody can make themselves staff'
do $$
begin
  insert into public.platform_admins (user_id)
  values ('eeeeeeee-0000-0000-0000-000000000002');
  raise exception 'FAIL: granted themselves the back office';
exception when insufficient_privilege then raise notice 'PASS: %', 'platform_admins is not writable from a session';
end $$;

\echo '4. A customer opens a ticket and can read their own'
insert into public.support_tickets (opened_by, subject, body)
values (auth.uid(), 'Cannot upload a file', 'It says 25 MB but refuses at 10.');
select count(*) = 1 as sees_own_ticket from public.support_tickets;
select id as ticket from public.support_tickets limit 1 \gset

\echo '5. Staff reply, and add a note the customer must never see'
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000001"}';
insert into public.support_messages (ticket_id, author_id, is_staff, internal, body)
values (:'ticket', auth.uid(), true, false, 'Looking into it.'),
       (:'ticket', auth.uid(), true, true,  'Their plan is over quota.');
select count(*) = 2 as staff_see_both from public.support_messages;

set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}';
select count(*) = 1 as customer_sees_only_the_reply from public.support_messages;
select count(*) = 0 as internal_note_hidden
from public.support_messages where internal = true;

\echo '6. A customer cannot pass their own reply off as staff'
do $$
begin
  insert into public.support_messages (ticket_id, author_id, is_staff, body)
  select id, auth.uid(), true, 'Resolved, pay me'
  from public.support_tickets limit 1;
  raise exception 'FAIL: a customer posted as staff';
exception when insufficient_privilege then raise notice 'PASS: %', 'is_staff cannot be claimed';
end $$;

\echo '7. The audit trail is readable by staff and nobody else'
set local role postgres;
insert into public.admin_audit (actor_id, action, kind, result)
values ('eeeeeeee-0000-0000-0000-000000000001', 'Suspended a user', 'user', 'success');
set local role authenticated;
select count(*) = 0 as customer_cannot_read_audit from public.admin_audit;
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000001"}';
select count(*) = 1 as staff_can_read_audit from public.admin_audit;

\echo '8. and nobody can edit or delete it, staff included'
do $$
declare touched int;
begin
  update public.admin_audit set action = 'Did nothing wrong';
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: an admin rewrote the audit trail'; end if;
  raise notice 'PASS: the audit trail is append-only';
end $$;

\echo '9. Settings and plans are staff-only'
set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}';
select count(*) = 0 as customer_cannot_read_settings from public.platform_settings;
do $$
declare touched int;
begin
  update public.plans set price_cents = 0;
  get diagnostics touched = row_count;
  if touched > 0 then raise exception 'FAIL: a customer set every plan to free'; end if;
  raise notice 'PASS: plans are not writable by customers';
end $$;

set local request.jwt.claims = '{"sub":"eeeeeeee-0000-0000-0000-000000000001"}';
select count(*) = 3 as staff_read_settings from public.platform_settings;

rollback;
