-- Tyriaq — let a task be deleted again
--
-- Deleting a task cascades to its assignees and attachments, and each of
-- those has an AFTER DELETE trigger that writes an activity entry. The
-- entry references the task — which, by then, is already gone. Postgres
-- refuses the foreign key and the whole delete aborts.
--
-- The effect: any task with an assignee or an attachment could not be
-- deleted at all. The board's Delete action simply failed.
--
-- The fix is to recognise the difference between the two ways these
-- rows disappear. Somebody unassigning a colleague is an event worth
-- recording. A row vanishing because its task was deleted is not — there
-- is no longer anything for the entry to be attached to, and the history
-- goes with the task by design.

create or replace function public.task_assignees_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_name text;
  target_id uuid;
  workspace uuid;
  task uuid;
begin
  if tg_op = 'INSERT' then
    target_id := new.user_id; workspace := new.workspace_id; task := new.task_id;
  else
    target_id := old.user_id; workspace := old.workspace_id; task := old.task_id;
  end if;

  -- The task is on its way out; there is nothing left to log against.
  if not exists (select 1 from public.tasks t where t.id = task) then
    return null;
  end if;

  select coalesce(nullif(p.full_name, ''), 'someone') into target_name
  from public.profiles p where p.id = target_id;

  perform public.log_task_activity(
    task, workspace, 'assigned',
    case
      when tg_op = 'INSERT' and target_id = auth.uid() then 'took this on'
      when tg_op = 'INSERT' then 'assigned ' || coalesce(target_name, 'someone')
      when target_id = auth.uid() then 'stepped off this task'
      else 'unassigned ' || coalesce(target_name, 'someone')
    end
  );

  return null;
end;
$$;

create or replace function public.task_attachments_log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(
      new.task_id, new.workspace_id, 'attached', 'attached a file', new.file_name
    );
    return null;
  end if;

  if not exists (select 1 from public.tasks t where t.id = old.task_id) then
    return null;
  end if;

  perform public.log_task_activity(
    old.task_id, old.workspace_id, 'attached', 'removed a file', old.file_name
  );
  return null;
end;
$$;
