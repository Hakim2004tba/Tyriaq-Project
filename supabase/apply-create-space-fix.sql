-- Tyriaq — fix "new row violates row-level security policy for table spaces".
--
-- Run this in the Supabase SQL editor: select all, press Run.
-- Safe to run more than once.
--
-- Creating a space stopped working after spaces became a boundary. The
-- insert was allowed; the RETURNING was not. `INSERT ... RETURNING`
-- needs SELECT on the new row, and seeing a space now means being a
-- member of it — which the creator was not yet, because that row was
-- written afterwards, using the id the RETURNING was meant to return.
--
-- Postgres reports that as a violated policy on the INSERT, which points
-- at the wrong half of the statement.
--
-- Both rows are written together now, the way create_workspace and
-- create_project already did it.

create or replace function public.create_space(
  space_name text,
  space_slug text,
  space_description text default '',
  space_icon text default 'layers',
  space_color public.space_color default 'violet'
)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  created public.spaces;
  candidate text;
  attempt integer := 1;
begin
  /*
    The workspace is derived, not passed.

    It is the caller's own — the one they are a member of — so there is
    no id from the client to be trusted or checked, and no way to create
    a space inside somebody else's workspace by naming it.
  */
  select m.workspace_id into ws
  from public.workspace_members m
  where m.user_id = auth.uid()
  order by m.created_at asc
  limit 1;

  if ws is null then
    raise exception 'You are not in a workspace' using errcode = 'P0001';
  end if;

  /*
    The slug is made unique HERE, not by the caller.

    The app used to pick one by looking at the spaces it could see — and
    since spaces became a boundary, a member cannot see the ones they
    are not in, so "marketing" would look free while colliding with a
    space they have no idea exists. The unique index would then refuse
    the insert with an error about an index name.
  */
  candidate := space_slug;
  while exists (
    select 1 from public.spaces s where s.workspace_id = ws and s.slug = candidate
  ) and attempt <= 50 loop
    attempt := attempt + 1;
    candidate := space_slug || '-' || attempt;
  end loop;

  insert into public.spaces (workspace_id, name, slug, description, icon, color, created_by)
  values (ws, space_name, candidate, coalesce(space_description, ''), space_icon, space_color, auth.uid())
  returning * into created;

  /*
    The creator is its admin.

    Without this row they could not see what they just made — and could
    not add themselves either, since adding somebody to a space requires
    already being able to manage it.
  */
  insert into public.space_members (space_id, user_id, workspace_id, level, added_by)
  values (created.id, auth.uid(), ws, 'admin', auth.uid())
  on conflict (space_id, user_id) do nothing;

  return created;
end;
$$;

grant execute on function public.create_space(
  text, text, text, text, public.space_color
) to authenticated;

notify pgrst, 'reload schema';
