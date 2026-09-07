-- Tyriaq — task RPCs
--
-- Drag and drop and progress both need more than a single-row update, so
-- they live here rather than being assembled client-side out of several
-- round trips that could half-apply.

/*
  Places a task between two neighbours, optionally moving it to another
  status column at the same time — which is what a Kanban drop is.

  The caller passes the ids it dropped between rather than a number,
  because only the server knows the current positions; a client computing
  the midpoint from a stale list would collide with a concurrent move.

  Positions are only ever midpoints, so a move rewrites exactly one row.
  Doubles run out of precision after roughly fifty successive drops into
  the same gap, so the function renormalises that column to whole numbers
  when the gap it is handed gets too small to halve meaningfully.
*/
create or replace function public.move_task(
  p_task uuid,
  p_status public.task_status default null,
  p_previous uuid default null,
  p_next uuid default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.tasks;
  previous_position double precision;
  next_position double precision;
  new_position double precision;
  target_status public.task_status;
begin
  -- security invoker: this select is subject to RLS, so a caller who
  -- cannot read the task cannot move it either.
  select * into target from public.tasks where id = p_task;
  if target.id is null then
    raise exception 'Task not found' using errcode = 'P0001';
  end if;

  target_status := coalesce(p_status, target.status);

  select position into previous_position from public.tasks
  where id = p_previous and project_id = target.project_id;

  select position into next_position from public.tasks
  where id = p_next and project_id = target.project_id;

  if previous_position is null and next_position is null then
    -- Dropped into an empty column: start a fresh scale.
    new_position := 0;
  elsif previous_position is null then
    new_position := next_position - 1;
  elsif next_position is null then
    new_position := previous_position + 1;
  else
    new_position := (previous_position + next_position) / 2;
  end if;

  update public.tasks
  set position = new_position, status = target_status
  where id = p_task
  returning * into target;

  if previous_position is not null and next_position is not null
     and abs(next_position - previous_position) < 0.000001 then
    perform public.renormalise_task_positions(target.project_id, target_status);
    select * into target from public.tasks where id = p_task;
  end if;

  return target;
end;
$$;

-- Rewrites one column's positions as 0, 1, 2, … preserving current order.
create or replace function public.renormalise_task_positions(
  p_project uuid,
  p_status public.task_status
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.tasks t
  set position = ordered.rank
  from (
    select id, (row_number() over (order by position, created_at)) - 1 as rank
    from public.tasks
    where project_id = p_project and status = p_status
  ) ordered
  where t.id = ordered.id and t.position is distinct from ordered.rank;
$$;

/*
  Creates a task at the end of its column in one round trip, so the client
  never has to read the current maximum position and race another writer.
*/
create or replace function public.create_task(
  p_project uuid,
  p_title text,
  p_status public.task_status default 'todo',
  p_priority public.task_priority default 'medium',
  p_parent uuid default null,
  p_start_date date default null,
  p_due_date date default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.tasks;
begin
  insert into public.tasks (project_id, workspace_id, title, status, priority,
                            parent_task_id, start_date, due_date, position, created_by)
  values (
    p_project,
    -- Overwritten by tasks_sync_scope; a value is needed for the not-null
    -- column before the trigger replaces it with the authoritative one.
    '00000000-0000-0000-0000-000000000000',
    p_title, p_status, p_priority, p_parent, p_start_date, p_due_date,
    coalesce(
      (select max(position) + 1 from public.tasks
       where project_id = p_project and status = p_status),
      0
    ),
    auth.uid()
  )
  returning * into created;

  return created;
end;
$$;

grant execute on function public.move_task(uuid, public.task_status, uuid, uuid) to authenticated;
grant execute on function public.renormalise_task_positions(uuid, public.task_status) to authenticated;
grant execute on function public.create_task(uuid, text, public.task_status, public.task_priority, uuid, date, date) to authenticated;
