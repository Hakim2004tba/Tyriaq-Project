-- Tyriaq — "did all the SQL actually run?"
--
-- Paste this into the Supabase SQL editor and run it. It changes
-- nothing. Every row should say OK; anything that says MISSING tells you
-- which file still needs to be pasted.

with expected(kind, name, needed_by) as (
  values
    ('table', 'profiles',           'apply-all.sql'),
    ('table', 'workspaces',         'apply-all.sql'),
    ('table', 'workspace_members',  'apply-all.sql'),
    ('table', 'spaces',             'apply-all.sql'),
    ('table', 'projects',           'apply-all.sql'),
    ('table', 'project_members',    'apply-all.sql'),
    ('table', 'tasks',              'apply-tasks.sql'),
    ('table', 'task_assignees',     'apply-tasks.sql'),
    ('table', 'task_dependencies',  'apply-tasks.sql'),
    ('table', 'task_comments',      'apply-collaboration.sql'),
    ('table', 'task_attachments',   'apply-collaboration.sql'),
    ('table', 'task_activity',      'apply-collaboration.sql'),

    ('function', 'create_workspace',            'apply-all.sql'),
    ('function', 'create_project',              'apply-all.sql'),
    ('function', 'is_workspace_member',         'apply-all.sql'),
    ('function', 'is_workspace_admin',          'apply-all.sql'),
    ('function', 'create_task',                 'apply-tasks.sql'),
    ('function', 'move_task',                   'apply-tasks.sql'),
    ('function', 'renormalise_task_positions',  'apply-tasks.sql'),
    ('function', 'log_task_activity',           'apply-collaboration.sql'),

    ('table', 'document_folders',    'apply-documents.sql'),
    ('table', 'documents',           'apply-documents.sql'),
    ('table', 'document_task_links', 'apply-documents.sql'),
    ('function', 'document_task_ids', 'apply-documents.sql'),

    ('table', 'conversations',        'apply-chat.sql'),
    ('table', 'conversation_members', 'apply-chat.sql'),
    ('table', 'messages',             'apply-chat.sql'),
    ('table', 'message_reactions',    'apply-chat.sql'),
    ('table', 'message_attachments',  'apply-chat.sql'),
    ('function', 'open_direct_message',      'apply-chat.sql'),
    ('function', 'create_group_conversation','apply-chat.sql'),
    ('function', 'open_project_conversation','apply-chat.sql'),
    ('function', 'create_task_from_message', 'apply-chat.sql'),
    ('function', 'can_read_conversation',    'apply-chat.sql'),

    ('table', 'time_entries', 'apply-reports.sql'),

    ('table', 'workspace_invitations', 'apply-invitations.sql'),
    ('table', 'space_members',         'apply-invitations.sql'),
    ('function', 'accept_invitation',   'apply-invitations.sql'),
    ('function', 'invitation_preview',  'apply-invitations.sql'),
    ('function', 'can_manage_space',    'apply-invitations.sql'),

    ('table', 'notifications',             'apply-notifications.sql'),
    ('table', 'notification_preferences',  'apply-notifications.sql'),
    ('function', 'notify_user',              'apply-notifications.sql'),
    ('function', 'sweep_due_notifications',  'apply-notifications.sql')
)
select
  case when found then 'OK' else 'MISSING' end as status,
  kind,
  name,
  case when found then '' else 'run ' || needed_by end as action
from (
  select e.*,
    case e.kind
      when 'table' then exists (
        select 1 from pg_tables t
        where t.schemaname = 'public' and t.tablename = e.name
      )
      when 'function' then exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = e.name
      )
    end as found
  from expected e
) checked

union all

-- Storage: the private bucket every attachment is written into.
select
  case when exists (select 1 from storage.buckets where id = 'task-files') then 'OK' else 'MISSING' end,
  'bucket', 'task-files',
  case when exists (select 1 from storage.buckets where id = 'task-files') then ''
       else 'run apply-collaboration.sql' end

union all

select
  case when exists (select 1 from storage.buckets where id = 'document-images') then 'OK' else 'MISSING' end,
  'bucket', 'document-images',
  case when exists (select 1 from storage.buckets where id = 'document-images') then ''
       else 'run apply-documents.sql' end

union all

select
  case when exists (select 1 from storage.buckets where id = 'chat-files') then 'OK' else 'MISSING' end,
  'bucket', 'chat-files',
  case when exists (select 1 from storage.buckets where id = 'chat-files') then ''
       else 'run apply-chat.sql' end

union all

/*
  Not just "does it exist" — CAN THE API FOLLOW IT.

  Every person column needs a key into `profiles`, because `auth.users`
  is not exposed through the API and an embed across it fails the whole
  query. This is the check that would have caught projects coming back
  empty while the rows were plainly there.
*/
select
  case when count(*) = 6 then 'OK' else 'MISSING' end,
  'relationships',
  'person columns the API can follow (' || count(*) || '/6)',
  case when count(*) = 6 then '' else 'run repair.sql' end
from pg_constraint c
join pg_class referenced on referenced.oid = c.confrelid
where c.contype = 'f'
  and referenced.relname = 'profiles'
  and c.conrelid::regclass::text in (
    'workspace_members', 'project_members', 'task_assignees',
    'task_comments', 'task_attachments', 'task_activity'
  )

union all

-- Realtime: without these three, comments and activity still save but do
-- not appear for other people until they reload.
select
  case when count(*) = 3 then 'OK' else 'MISSING' end,
  'realtime',
  'task_comments, task_activity, task_attachments (' || count(*) || '/3)',
  case when count(*) = 3 then '' else 'run apply-collaboration.sql' end
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('task_comments', 'task_activity', 'task_attachments')

union all

select
  case when count(*) = 1 then 'OK' else 'MISSING' end,
  'realtime', 'documents (conflict warnings)',
  case when count(*) = 1 then '' else 'run apply-documents.sql' end
from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'documents'

union all

select
  case when count(*) = 3 then 'OK' else 'MISSING' end,
  'realtime',
  'messages, message_reactions, conversations (' || count(*) || '/3)',
  case when count(*) = 3 then '' else 'run apply-chat.sql' end
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('messages', 'message_reactions', 'conversations')

union all

select
  case when count(*) = 1 then 'OK' else 'MISSING' end,
  'realtime', 'notifications',
  case when count(*) = 1 then '' else 'run apply-notifications.sql' end
from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'notifications'

order by status desc, kind, name;
