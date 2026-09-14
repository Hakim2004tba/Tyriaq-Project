-- Tyriaq — just the removal part.
--
-- Run this in the Supabase SQL editor: select all, press Run.
--
-- The larger file (apply-space-isolation.sql) stopped partway on its
-- second run, so its first two sections are already in place and this
-- third one never was. Nothing here touches a policy, so it cannot
-- collide with what already applied — it only adds:
--
--   · remove_from_workspace(), which takes somebody out of every space,
--     project, assignment and conversation in one go;
--   · a rule that the workspace owner can never be removed from a space;
--   · a nudge for the API to notice both.
--
-- Safe to run more than once.

create or replace function public.remove_from_workspace(p_workspace uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.workspace_role;
begin
  if not public.is_workspace_admin(p_workspace) then
    raise exception 'Only an owner or admin can remove somebody' using errcode = 'P0001';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot remove yourself' using errcode = 'P0001';
  end if;

  select role into target_role from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;

  if target_role is null then
    -- Already gone. Saying so would be pedantic about an outcome the
    -- caller already has.
    return;
  end if;
  if target_role = 'owner' then
    raise exception 'The owner cannot be removed from their own workspace' using errcode = 'P0001';
  end if;

  /*
    Every grant they held, in one transaction.

    `space_members` and `project_members` reference `profiles`, not
    `workspace_members`, so nothing cascades from the membership row —
    left behind, those rows would keep working the moment somebody was
    re-invited, silently restoring access an admin thought they had
    taken away.
  */
  delete from public.project_members pm
  using public.projects pr
  where pm.project_id = pr.id
    and pr.workspace_id = p_workspace
    and pm.user_id = p_user;

  delete from public.space_members
  where workspace_id = p_workspace and user_id = p_user;

  delete from public.task_assignees
  where workspace_id = p_workspace and user_id = p_user;

  delete from public.conversation_members cm
  using public.conversations c
  where cm.conversation_id = c.id
    and c.workspace_id = p_workspace
    and cm.user_id = p_user;

  delete from public.space_join_requests
  where workspace_id = p_workspace and user_id = p_user and status = 'pending';

  delete from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
end;
$$;

grant execute on function public.remove_from_workspace(uuid, uuid) to authenticated;

/*
  The owner's own space membership is equally load-bearing.

  Removing the last admin of a space leaves it visible to workspace
  admins only — which for a space whose members were the point is a
  space nobody can administer from inside. The UI hides that button, and
  this refuses it regardless, because a hidden button is not a rule.
*/
create or replace function public.space_members_protect_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.workspace_members m
    where m.workspace_id = old.workspace_id
      and m.user_id = old.user_id
      and m.role = 'owner'
  ) then
    raise exception 'The workspace owner cannot be removed from a space' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists space_members_protect_owner on public.space_members;
create trigger space_members_protect_owner
  before delete on public.space_members
  for each row execute function public.space_members_protect_owner();

-- PostgREST answers RPC calls from a cached picture of the schema. A
-- function it has not noticed yet comes back as "could not find the
-- function ... in the schema cache", which reads like this failed when
-- it did not.
notify pgrst, 'reload schema';
