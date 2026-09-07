-- Tyriaq — workspace creation
--
-- The only way to create a workspace. `workspaces` deliberately has no
-- INSERT policy: a workspace and its owner membership have to appear
-- together or not at all, because a workspace with no members is
-- invisible to everyone forever.

create or replace function public.create_workspace(
  workspace_name text,
  workspace_slug text
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  created public.workspaces;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if coalesce(trim(workspace_name), '') = '' then
    raise exception 'Workspace name is required' using errcode = 'P0001';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(workspace_name), lower(trim(workspace_slug)), caller)
  returning * into created;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created.id, caller, 'owner');

  return created;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

/*
  Slug availability.

  `workspaces` is only readable by members, so a signed-in user cannot
  discover whether a slug is taken by querying the table — the row is
  invisible to them and the insert would fail with a unique-violation they
  cannot explain. This runs as owner to answer that one question, and
  returns nothing but a boolean.
*/
create or replace function public.workspace_slug_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.workspaces w where w.slug = lower(trim(candidate))
  );
$$;

revoke all on function public.workspace_slug_available(text) from public;
grant execute on function public.workspace_slug_available(text) to authenticated;
