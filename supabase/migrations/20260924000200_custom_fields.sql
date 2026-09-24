-- Tyriaq — custom fields
--
-- Every team keeps a column the product never thought of: a client
-- reference, a budget, a shirt size, which campaign this belongs to.
-- Without somewhere to put it, that information ends up in the task
-- title — "[ACME-441] Print the banner" — where nothing can filter,
-- group or total it.
--
-- The shape here matches `packages/types/src/custom-field.ts`, which was
-- designed before the tables existed. Two tables, and the values are
-- stored as jsonb rather than a column per type:
--
--   · one row per (task, field) instead of six nullable columns, so a
--     new field type is a new entry in an enum rather than a migration
--     on a table that by then holds millions of rows;
--   · jsonb because the shape genuinely differs per type — a number, a
--     date string, a boolean, one option id, or several — and storing
--     them all as text means every read has to parse and every write has
--     to remember which format it chose.

do $$
begin
  create type public.custom_field_type as enum (
    'text', 'number', 'select', 'multi_select', 'date', 'checkbox'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  /*
    Null means the field belongs to the whole workspace and appears on
    every task in it. Set means one project only.

    Both are wanted: "Client" is a company-wide idea, while "Print run"
    belongs to the one project that prints things — and a product that
    only offers the second ends up with the same field defined eleven
    times.
  */
  project_id uuid references public.projects (id) on delete cascade,
  name text not null,
  field_type public.custom_field_type not null,
  options jsonb,
  position integer not null default 0,
  archived boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint custom_fields_name_length check (char_length(name) between 1 and 60),

  /*
    A select with no options is a field nobody can fill in, and a text
    field with options is a contradiction. Enforced here rather than in
    a form, because the form is not the only thing that writes.
  */
  constraint custom_fields_options_match_type check (
    case
      when field_type in ('select', 'multi_select')
        then options is not null and jsonb_array_length(options) > 0
      else options is null
    end
  )
);

alter table public.custom_fields enable row level security;

create index if not exists custom_fields_workspace_idx
  on public.custom_fields (workspace_id, position) where archived = false;
create index if not exists custom_fields_project_idx
  on public.custom_fields (project_id) where archived = false;

/*
  One field per name, per scope.

  Two "Budget" columns on the same board is a data entry problem nobody
  can untangle afterwards. Partial, so an archived field frees its name.
*/
create unique index if not exists custom_fields_unique_name
  on public.custom_fields (workspace_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  where archived = false;

create table if not exists public.task_custom_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  field_id uuid not null references public.custom_fields (id) on delete cascade,
  /*
    Denormalised, like every other child table here: it is what lets a
    policy ask one membership question instead of joining back up to the
    task and the project on every row.
  */
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),

  unique (task_id, field_id)
);

alter table public.task_custom_field_values enable row level security;

create index if not exists task_field_values_task_idx
  on public.task_custom_field_values (task_id);
create index if not exists task_field_values_field_idx
  on public.task_custom_field_values (field_id);

/*
  The workspace comes from the task, never from the client — the same
  guard every other child table uses, and for the same reason: without
  it a request could name any workspace it liked.
*/
create or replace function public.task_field_values_sync_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_workspace uuid;
  field_workspace uuid;
  field_project uuid;
  task_project uuid;
begin
  select t.workspace_id, t.project_id into owner_workspace, task_project
  from public.tasks t where t.id = new.task_id;

  if owner_workspace is null then
    raise exception 'Task does not exist' using errcode = 'P0001';
  end if;

  select f.workspace_id, f.project_id into field_workspace, field_project
  from public.custom_fields f where f.id = new.field_id;

  if field_workspace is null then
    raise exception 'Field does not exist' using errcode = 'P0001';
  end if;
  if field_workspace <> owner_workspace then
    raise exception 'That field belongs to another workspace' using errcode = 'P0001';
  end if;
  -- A project-scoped field cannot be filled in on a task somewhere else.
  if field_project is not null and field_project <> task_project then
    raise exception 'That field does not apply to this project' using errcode = 'P0001';
  end if;

  new.workspace_id := owner_workspace;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists task_field_values_sync_scope on public.task_custom_field_values;
create trigger task_field_values_sync_scope
  before insert or update on public.task_custom_field_values
  for each row execute function public.task_field_values_sync_scope();

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

/*
  A field DEFINITION is visible to anybody who can see the project it
  belongs to — or to the whole workspace when it has no project. The
  definition is a column heading, and hiding it from somebody who can
  see the rows underneath would show them values with no labels.
*/
drop policy if exists "people read fields they can use" on public.custom_fields;
create policy "people read fields they can use"
  on public.custom_fields for select
  to authenticated
  using (
    case
      when project_id is null then public.is_workspace_member(workspace_id)
      else public.can_see_project(project_id)
    end
  );

/*
  Creating and changing them is narrower: a column that appears on
  everybody's board is a decision about how the team works, not a
  personal preference. Workspace-wide fields are for workspace admins;
  a project field is for somebody who can manage that project's space.
*/
drop policy if exists "managers create fields" on public.custom_fields;
create policy "managers create fields"
  on public.custom_fields for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and case
      when project_id is null then public.is_workspace_admin(workspace_id)
      else public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
    end
  );

drop policy if exists "managers change fields" on public.custom_fields;
create policy "managers change fields"
  on public.custom_fields for update
  to authenticated
  using (
    case
      when project_id is null then public.is_workspace_admin(workspace_id)
      else public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
    end
  )
  with check (
    case
      when project_id is null then public.is_workspace_admin(workspace_id)
      else public.can_manage_space((select p.space_id from public.projects p where p.id = project_id))
    end
  );

/*
  No delete policy. A field is archived, never dropped: deleting one
  takes every value anybody ever entered with it, and "where did the
  budget column go" is not a question a product should be able to
  answer with "somebody removed it on Tuesday".
*/

drop policy if exists "people read values on tasks they can see" on public.task_custom_field_values;
create policy "people read values on tasks they can see"
  on public.task_custom_field_values for select
  to authenticated
  using (public.can_see_task(task_id));

drop policy if exists "people write values on tasks they can see" on public.task_custom_field_values;
create policy "people write values on tasks they can see"
  on public.task_custom_field_values for insert
  to authenticated
  with check (public.can_see_task(task_id));

drop policy if exists "people update values on tasks they can see" on public.task_custom_field_values;
create policy "people update values on tasks they can see"
  on public.task_custom_field_values for update
  to authenticated
  using (public.can_see_task(task_id))
  with check (public.can_see_task(task_id));

drop policy if exists "people clear values on tasks they can see" on public.task_custom_field_values;
create policy "people clear values on tasks they can see"
  on public.task_custom_field_values for delete
  to authenticated
  using (public.can_see_task(task_id));
