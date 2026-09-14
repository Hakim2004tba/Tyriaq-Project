-- Tyriaq — MySQL 5.7 schema
--
-- Ported from supabase/migrations/. Read this alongside them: the design
-- notes there still explain WHY each table looks like it does, and this
-- file only records what had to change to leave Postgres behind.
--
-- The four differences that matter:
--
--   1. There is no Row Level Security in MySQL. All 95 policies move into
--      apps/web/lib/db/guard.ts. Every read and write goes through it.
--   2. MySQL 5.7 parses CHECK constraints and then ignores them. The same
--      rules live in packages/validation (zod) and are enforced on write.
--   3. There is no `auth` schema. `users` below replaces `auth.users`, and
--      sessions are ours to keep.
--   4. `uuid` becomes CHAR(36) and ids are generated in Node with
--      crypto.randomUUID(), not by the database.
--
-- utf8mb4 throughout, not utf8: message reactions store emoji, and MySQL's
-- "utf8" is three bytes and cannot hold them.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* ================================================================
   Identity — replaces Supabase Auth
   ================================================================ */

CREATE TABLE users (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  -- Null until the address is confirmed. Unverified accounts may sign in
  -- but are refused invitations, so a typo cannot silently join a team.
  email_verified_at DATETIME(3) NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*
  Sessions.

  A row per signed-in browser. The cookie carries only `id`; nothing about
  the user is trusted from the client. Deleting the row signs that browser
  out immediately, which a stateless JWT could not do — and on one small
  server there is no reason to pay for statelessness.
*/
CREATE TABLE sessions (
  id         CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  expires_at DATETIME(3)  NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY sessions_user_idx (user_id),
  KEY sessions_expiry_idx (expires_at),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*
  Password reset and email verification tokens.

  `token_hash`, never the token itself: this table is what an attacker
  reads if they get the database, and a stored reset token would be a
  working key to every account in it.
*/
CREATE TABLE auth_tokens (
  id         CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  purpose    ENUM('password_reset','email_verify') NOT NULL,
  token_hash CHAR(64)    NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at    DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY auth_tokens_hash_unique (token_hash),
  KEY auth_tokens_user_idx (user_id),
  CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Profiles
   ================================================================ */

CREATE TABLE profiles (
  id         CHAR(36)     NOT NULL,
  full_name  VARCHAR(120) NOT NULL DEFAULT '',
  avatar_url VARCHAR(500) NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Workspaces — the tenant boundary
   ================================================================ */

CREATE TABLE workspaces (
  id         CHAR(36)    NOT NULL,
  name       VARCHAR(80) NOT NULL,
  slug       VARCHAR(48) NOT NULL,
  created_by CHAR(36)    NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY workspaces_slug_unique (slug),
  KEY workspaces_created_by_idx (created_by),
  CONSTRAINT workspaces_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workspace_members (
  workspace_id CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  role         ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (workspace_id, user_id),
  KEY workspace_members_user_idx (user_id),
  CONSTRAINT workspace_members_ws_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_user_fk FOREIGN KEY (user_id)      REFERENCES users (id)      ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Spaces and projects
   ================================================================ */

CREATE TABLE spaces (
  id           CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  name         VARCHAR(80) NOT NULL,
  slug         VARCHAR(48) NOT NULL,
  -- TEXT cannot carry a DEFAULT in MySQL 5.7, so this is nullable and the
  -- data layer reads NULL as the empty string. Same for every TEXT and
  -- JSON column below that was `not null default ...` in Postgres.
  description  TEXT        NULL,
  icon         VARCHAR(40) NOT NULL DEFAULT 'layers',
  color        ENUM('violet','blue','emerald','amber','rose','cyan') NOT NULL DEFAULT 'violet',
  `position`   INT         NOT NULL DEFAULT 0,
  archived_at  DATETIME(3) NULL,
  created_by   CHAR(36)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY spaces_slug_per_workspace (workspace_id, slug),
  KEY spaces_workspace_idx (workspace_id),
  CONSTRAINT spaces_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT spaces_creator_fk FOREIGN KEY (created_by)   REFERENCES users (id)      ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
  id           CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  space_id     CHAR(36)    NOT NULL,
  name         VARCHAR(80) NOT NULL,
  slug         VARCHAR(48) NOT NULL,
  description  TEXT        NULL,
  status       ENUM('on_track','at_risk','off_track','on_hold','completed') NOT NULL DEFAULT 'on_track',
  color        ENUM('violet','blue','emerald','amber','rose','cyan') NOT NULL DEFAULT 'violet',
  start_date   DATE        NULL,
  due_date     DATE        NULL,
  archived_at  DATETIME(3) NULL,
  created_by   CHAR(36)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY projects_slug_per_workspace (workspace_id, slug),
  KEY projects_space_idx (space_id),
  KEY projects_workspace_idx (workspace_id),
  CONSTRAINT projects_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT projects_space_fk   FOREIGN KEY (space_id)     REFERENCES spaces (id)     ON DELETE CASCADE,
  CONSTRAINT projects_creator_fk FOREIGN KEY (created_by)   REFERENCES users (id)      ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_members (
  project_id CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  role       ENUM('lead','member','viewer') NOT NULL DEFAULT 'member',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (project_id, user_id),
  KEY project_members_user_idx (user_id),
  CONSTRAINT project_members_project_fk FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT project_members_user_fk    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE space_members (
  space_id     CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  `level`      ENUM('viewer','commenter','editor','admin') NOT NULL DEFAULT 'editor',
  added_by     CHAR(36)    NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (space_id, user_id),
  KEY space_members_user_idx (user_id),
  KEY space_members_workspace_idx (workspace_id),
  CONSTRAINT space_members_space_fk FOREIGN KEY (space_id)     REFERENCES spaces (id)     ON DELETE CASCADE,
  CONSTRAINT space_members_user_fk  FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT space_members_ws_fk    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT space_members_added_fk FOREIGN KEY (added_by)     REFERENCES profiles (id)   ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Tasks
   ================================================================ */

CREATE TABLE tasks (
  id             CHAR(36)     NOT NULL,
  workspace_id   CHAR(36)     NOT NULL,
  project_id     CHAR(36)     NOT NULL,
  parent_task_id CHAR(36)     NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT         NULL,
  status         ENUM('todo','in_progress','review','done','blocked') NOT NULL DEFAULT 'todo',
  priority       ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  start_date     DATE         NULL,
  due_date       DATE         NULL,
  -- Was text[]. A JSON array of strings; MySQL 5.7 forbids a DEFAULT on
  -- JSON, so the data layer writes [] explicitly and reads NULL as [].
  tags           JSON         NULL,
  is_milestone   TINYINT(1)   NOT NULL DEFAULT 0,
  `position`     DOUBLE       NOT NULL DEFAULT 0,
  created_by     CHAR(36)     NOT NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY tasks_project_idx (project_id),
  KEY tasks_workspace_idx (workspace_id),
  KEY tasks_parent_idx (parent_task_id),
  KEY tasks_position_idx (project_id, `position`),
  KEY tasks_due_idx (workspace_id, due_date),
  CONSTRAINT tasks_ws_fk      FOREIGN KEY (workspace_id)   REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT tasks_project_fk FOREIGN KEY (project_id)     REFERENCES projects (id)   ON DELETE CASCADE,
  CONSTRAINT tasks_parent_fk  FOREIGN KEY (parent_task_id) REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT tasks_creator_fk FOREIGN KEY (created_by)     REFERENCES users (id)      ON DELETE RESTRICT
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_assignees (
  task_id      CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  assigned_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (task_id, user_id),
  KEY task_assignees_user_idx (user_id),
  KEY task_assignees_workspace_idx (workspace_id),
  CONSTRAINT task_assignees_task_fk FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_assignees_user_fk FOREIGN KEY (user_id)      REFERENCES users (id)      ON DELETE CASCADE,
  CONSTRAINT task_assignees_ws_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_dependencies (
  predecessor_id CHAR(36)    NOT NULL,
  successor_id   CHAR(36)    NOT NULL,
  workspace_id   CHAR(36)    NOT NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (predecessor_id, successor_id),
  KEY task_dependencies_successor_idx (successor_id),
  KEY task_dependencies_workspace_idx (workspace_id),
  CONSTRAINT task_dep_pred_fk FOREIGN KEY (predecessor_id) REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_dep_succ_fk FOREIGN KEY (successor_id)   REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_dep_ws_fk   FOREIGN KEY (workspace_id)   REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_comments (
  id           CHAR(36)    NOT NULL,
  task_id      CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  author_id    CHAR(36)    NOT NULL,
  body         TEXT        NOT NULL,
  -- Was uuid[] with a GIN index. JSON array of ids; "mentions of me" is a
  -- JSON_CONTAINS scan, which at this size costs nothing.
  mentions     JSON        NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  edited_at    DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY task_comments_task_idx (task_id, created_at),
  KEY task_comments_workspace_idx (workspace_id),
  CONSTRAINT task_comments_task_fk   FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_comments_ws_fk     FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT task_comments_author_fk FOREIGN KEY (author_id)    REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_attachments (
  id           CHAR(36)     NOT NULL,
  task_id      CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  uploaded_by  CHAR(36)     NOT NULL,
  -- Was a path inside a Supabase bucket; now a path under the app's
  -- uploads directory. Same shape: <workspace>/<task>/<uuid>.<ext>.
  storage_path VARCHAR(191) NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(191) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes   BIGINT       NOT NULL DEFAULT 0,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY task_attachments_path_unique (storage_path),
  KEY task_attachments_task_idx (task_id, created_at),
  KEY task_attachments_workspace_idx (workspace_id),
  CONSTRAINT task_attachments_task_fk FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_attachments_ws_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT task_attachments_up_fk   FOREIGN KEY (uploaded_by)  REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_activity (
  id           CHAR(36)    NOT NULL,
  task_id      CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  actor_id     CHAR(36)    NULL,
  kind         ENUM('created','status','assigned','due','attached','commented','logged') NOT NULL,
  `text`       TEXT        NOT NULL,
  detail       TEXT        NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY task_activity_task_idx (task_id, created_at),
  KEY task_activity_workspace_idx (workspace_id),
  CONSTRAINT task_activity_task_fk  FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_activity_ws_fk    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT task_activity_actor_fk FOREIGN KEY (actor_id)     REFERENCES profiles (id)   ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE task_stars (
  task_id      CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (task_id, user_id),
  KEY task_stars_user_idx (user_id, created_at),
  CONSTRAINT task_stars_task_fk FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT task_stars_user_fk FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT task_stars_ws_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Documents
   ================================================================ */

CREATE TABLE document_folders (
  id           CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  parent_id    CHAR(36)     NULL,
  name         VARCHAR(120) NOT NULL,
  `position`   DOUBLE       NOT NULL DEFAULT 0,
  created_by   CHAR(36)     NOT NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY document_folders_workspace_idx (workspace_id),
  KEY document_folders_parent_idx (parent_id),
  CONSTRAINT document_folders_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id)       ON DELETE CASCADE,
  CONSTRAINT document_folders_parent_fk  FOREIGN KEY (parent_id)    REFERENCES document_folders (id) ON DELETE SET NULL,
  CONSTRAINT document_folders_creator_fk FOREIGN KEY (created_by)   REFERENCES profiles (id)         ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documents (
  id           CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  folder_id    CHAR(36)     NULL,
  project_id   CHAR(36)     NULL,
  title        VARCHAR(200) NOT NULL DEFAULT 'Untitled',
  -- TipTap/ProseMirror JSON. NULL here means "never saved", same as it did
  -- in Postgres; an empty document is {"type":"doc","content":[]}.
  content      JSON         NULL,
  archived_at  DATETIME(3)  NULL,
  created_by   CHAR(36)     NOT NULL,
  updated_by   CHAR(36)     NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY documents_workspace_idx (workspace_id, updated_at),
  KEY documents_folder_idx (folder_id),
  KEY documents_project_idx (project_id),
  CONSTRAINT documents_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id)       ON DELETE CASCADE,
  CONSTRAINT documents_folder_fk  FOREIGN KEY (folder_id)    REFERENCES document_folders (id) ON DELETE SET NULL,
  CONSTRAINT documents_project_fk FOREIGN KEY (project_id)   REFERENCES projects (id)         ON DELETE CASCADE,
  CONSTRAINT documents_creator_fk FOREIGN KEY (created_by)   REFERENCES profiles (id)         ON DELETE CASCADE,
  CONSTRAINT documents_updater_fk FOREIGN KEY (updated_by)   REFERENCES profiles (id)         ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE document_task_links (
  document_id  CHAR(36) NOT NULL,
  task_id      CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  PRIMARY KEY (document_id, task_id),
  KEY document_task_links_task_idx (task_id),
  KEY document_task_links_workspace_idx (workspace_id),
  CONSTRAINT dtl_document_fk FOREIGN KEY (document_id)  REFERENCES documents (id)  ON DELETE CASCADE,
  CONSTRAINT dtl_task_fk     FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT dtl_ws_fk       FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Chat
   ================================================================ */

CREATE TABLE conversations (
  id              CHAR(36)     NOT NULL,
  workspace_id    CHAR(36)     NOT NULL,
  kind            ENUM('dm','group','project') NOT NULL,
  title           VARCHAR(120) NULL,
  project_id      CHAR(36)     NULL,
  dm_key          VARCHAR(80)  NULL,
  last_message_at DATETIME(3)  NULL,
  created_by      CHAR(36)     NOT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  /*
    Postgres expressed these as partial indexes (`where dm_key is not
    null`). MySQL needs no equivalent: a UNIQUE index treats every NULL as
    distinct, so rows without a dm_key or a project_id never collide, and
    the guarantee is exactly the one the partial index gave.
  */
  UNIQUE KEY conversations_dm_unique (workspace_id, dm_key),
  UNIQUE KEY conversations_project_unique (project_id),
  KEY conversations_workspace_idx (workspace_id, last_message_at),
  CONSTRAINT conversations_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT conversations_project_fk FOREIGN KEY (project_id)   REFERENCES projects (id)   ON DELETE CASCADE,
  CONSTRAINT conversations_creator_fk FOREIGN KEY (created_by)   REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_members (
  conversation_id CHAR(36)    NOT NULL,
  user_id         CHAR(36)    NOT NULL,
  workspace_id    CHAR(36)    NOT NULL,
  last_read_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  muted           TINYINT(1)  NOT NULL DEFAULT 0,
  joined_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (conversation_id, user_id),
  KEY conversation_members_user_idx (user_id),
  KEY conversation_members_workspace_idx (workspace_id),
  CONSTRAINT conv_members_conv_fk FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT conv_members_user_fk FOREIGN KEY (user_id)         REFERENCES profiles (id)      ON DELETE CASCADE,
  CONSTRAINT conv_members_ws_fk   FOREIGN KEY (workspace_id)    REFERENCES workspaces (id)    ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id              CHAR(36)    NOT NULL,
  conversation_id CHAR(36)    NOT NULL,
  workspace_id    CHAR(36)    NOT NULL,
  author_id       CHAR(36)    NOT NULL,
  body            TEXT        NOT NULL,
  reply_to_id     CHAR(36)    NULL,
  mentions        JSON        NULL,
  task_refs       JSON        NULL,
  project_refs    JSON        NULL,
  edited_at       DATETIME(3) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY messages_conversation_idx (conversation_id, created_at),
  KEY messages_workspace_idx (workspace_id),
  KEY messages_author_idx (author_id),
  -- Replaces the tsvector column and its GIN index. InnoDB FULLTEXT is
  -- weaker than to_tsvector, but it searches the same field for the same
  -- purpose and needs no generated column to maintain.
  FULLTEXT KEY messages_body_ft (body),
  CONSTRAINT messages_conv_fk   FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT messages_ws_fk     FOREIGN KEY (workspace_id)    REFERENCES workspaces (id)    ON DELETE CASCADE,
  CONSTRAINT messages_author_fk FOREIGN KEY (author_id)       REFERENCES profiles (id)      ON DELETE CASCADE,
  CONSTRAINT messages_reply_fk  FOREIGN KEY (reply_to_id)     REFERENCES messages (id)      ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_reactions (
  message_id   CHAR(36)    NOT NULL,
  user_id      CHAR(36)    NOT NULL,
  -- utf8mb4 matters here specifically: a flag or skin-tone emoji does not
  -- fit in MySQL's three-byte "utf8".
  emoji        VARCHAR(24) NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (message_id, user_id, emoji),
  KEY message_reactions_workspace_idx (workspace_id),
  CONSTRAINT reactions_message_fk FOREIGN KEY (message_id)   REFERENCES messages (id)   ON DELETE CASCADE,
  CONSTRAINT reactions_user_fk    FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT reactions_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_attachments (
  id           CHAR(36)     NOT NULL,
  message_id   CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  uploaded_by  CHAR(36)     NOT NULL,
  storage_path VARCHAR(191) NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(191) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes   BIGINT       NOT NULL DEFAULT 0,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY message_attachments_path_unique (storage_path),
  KEY message_attachments_message_idx (message_id),
  KEY message_attachments_workspace_idx (workspace_id),
  CONSTRAINT msg_attach_message_fk FOREIGN KEY (message_id)   REFERENCES messages (id)   ON DELETE CASCADE,
  CONSTRAINT msg_attach_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT msg_attach_up_fk      FOREIGN KEY (uploaded_by)  REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Time tracking
   ================================================================ */

CREATE TABLE time_entries (
  id           CHAR(36)     NOT NULL,
  task_id      CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  project_id   CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  minutes      INT          NOT NULL,
  note         VARCHAR(500) NOT NULL DEFAULT '',
  -- No `default current_date` in MySQL for a DATE column; the data layer
  -- supplies today in the user's own reckoning, which is the more correct
  -- answer anyway.
  spent_on     DATE         NOT NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY time_entries_task_idx (task_id),
  KEY time_entries_workspace_idx (workspace_id, spent_on),
  KEY time_entries_project_idx (project_id, spent_on),
  KEY time_entries_user_idx (user_id, spent_on),
  CONSTRAINT time_entries_task_fk    FOREIGN KEY (task_id)      REFERENCES tasks (id)      ON DELETE CASCADE,
  CONSTRAINT time_entries_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT time_entries_project_fk FOREIGN KEY (project_id)   REFERENCES projects (id)   ON DELETE CASCADE,
  CONSTRAINT time_entries_user_fk    FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Notifications
   ================================================================ */

CREATE TABLE notifications (
  id              CHAR(36)     NOT NULL,
  workspace_id    CHAR(36)     NOT NULL,
  user_id         CHAR(36)     NOT NULL,
  actor_id        CHAR(36)     NULL,
  kind            ENUM(
                    'task_assigned','task_mentioned','comment_mention','task_status',
                    'task_completed','due_soon','task_overdue','project_added',
                    'workspace_added','message_received',
                    'space_join_request','space_join_approved','space_join_declined'
                  ) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT         NULL,
  task_id         CHAR(36)     NULL,
  project_id      CHAR(36)     NULL,
  document_id     CHAR(36)     NULL,
  space_id        CHAR(36)     NULL,
  conversation_id CHAR(36)     NULL,
  message_id      CHAR(36)     NULL,
  comment_id      CHAR(36)     NULL,
  read_at         DATETIME(3)  NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  /*
    "One due reminder per task per person per day."

    Postgres said this with a partial unique index over a generated date
    column. MySQL has no partial indexes, so the whole condition is folded
    into one generated column instead: it is NULL — and therefore never
    collides — for every kind that is not a due reminder, and a fixed
    string for the ones that are. The unique key below does the rest.
  */
  dedupe_key VARCHAR(160) GENERATED ALWAYS AS (
    CASE WHEN kind IN ('due_soon','task_overdue')
         THEN CONCAT(user_id, ':', task_id, ':', kind, ':', DATE(created_at))
    END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY notifications_due_once_daily (dedupe_key),
  KEY notifications_user_idx (user_id, created_at),
  KEY notifications_unread_idx (user_id, read_at, created_at),
  KEY notifications_workspace_idx (workspace_id),
  CONSTRAINT notifications_ws_fk      FOREIGN KEY (workspace_id)    REFERENCES workspaces (id)     ON DELETE CASCADE,
  CONSTRAINT notifications_user_fk    FOREIGN KEY (user_id)         REFERENCES profiles (id)       ON DELETE CASCADE,
  CONSTRAINT notifications_actor_fk   FOREIGN KEY (actor_id)        REFERENCES profiles (id)       ON DELETE SET NULL,
  CONSTRAINT notifications_task_fk    FOREIGN KEY (task_id)         REFERENCES tasks (id)          ON DELETE CASCADE,
  CONSTRAINT notifications_project_fk FOREIGN KEY (project_id)      REFERENCES projects (id)       ON DELETE CASCADE,
  CONSTRAINT notifications_doc_fk     FOREIGN KEY (document_id)     REFERENCES documents (id)      ON DELETE CASCADE,
  CONSTRAINT notifications_space_fk   FOREIGN KEY (space_id)        REFERENCES spaces (id)         ON DELETE CASCADE,
  CONSTRAINT notifications_conv_fk    FOREIGN KEY (conversation_id) REFERENCES conversations (id)  ON DELETE CASCADE,
  CONSTRAINT notifications_msg_fk     FOREIGN KEY (message_id)      REFERENCES messages (id)       ON DELETE CASCADE,
  CONSTRAINT notifications_comment_fk FOREIGN KEY (comment_id)      REFERENCES task_comments (id)  ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_preferences (
  user_id      CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  -- Was notification_kind[]. JSON array of kind strings; still an opt-out
  -- list, so a kind added later arrives by default.
  muted_kinds  JSON     NULL,
  PRIMARY KEY (user_id, workspace_id),
  CONSTRAINT notif_prefs_user_fk FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT notif_prefs_ws_fk   FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================================================
   Invitations
   ================================================================ */

CREATE TABLE workspace_invitations (
  id           CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  email        VARCHAR(191) NOT NULL,
  role         ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  -- Was `encode(gen_random_bytes(24), 'hex')` from pgcrypto. Generated in
  -- Node now with crypto.randomBytes(24) — the same 24 random bytes, from
  -- the same kind of source.
  token        VARCHAR(64)  NOT NULL,
  invited_by   CHAR(36)     NOT NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Was `now() + interval '14 days'`; the data layer sets it.
  expires_at   DATETIME(3)  NOT NULL,
  accepted_at  DATETIME(3)  NULL,
  accepted_by  CHAR(36)     NULL,
  /*
    "One pending invitation per address per workspace."

    The same trick as `dedupe_key` above: NULL once the invitation has
    been accepted, so accepted rows never collide and the address can be
    invited again, while two pending invitations cannot coexist.
  */
  pending_email VARCHAR(191) GENERATED ALWAYS AS (
    CASE WHEN accepted_at IS NULL THEN email END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY workspace_invitations_token_unique (token),
  UNIQUE KEY workspace_invitations_pending_unique (workspace_id, pending_email),
  KEY workspace_invitations_workspace_idx (workspace_id),
  KEY workspace_invitations_email_idx (email),
  CONSTRAINT invitations_ws_fk       FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT invitations_inviter_fk  FOREIGN KEY (invited_by)   REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT invitations_accepter_fk FOREIGN KEY (accepted_by)  REFERENCES profiles (id)   ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

/* ==================================================================== */
/* Joining a space by link                                              */
/* ==================================================================== */

/*
  A space admin shares one link; whoever opens it asks to join, and an
  admin approves. The link is not an entry — holding it lets you ASK,
  which is why a forwarded link produces requests somebody has to look
  at rather than members nobody chose.
*/
CREATE TABLE space_invite_links (
  id           CHAR(36)    NOT NULL,
  space_id     CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  -- Was `encode(gen_random_bytes(24), 'hex')`; generated in Node now,
  -- from the same kind of source, like the workspace invitation token.
  token        VARCHAR(64) NOT NULL,
  created_by   CHAR(36)    NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at   DATETIME(3) NULL,
  /*
    "One live link per space."

    Postgres said this with a partial unique index (`where revoked_at is
    null`). The same trick as the other two partial indexes in this
    file: a generated column that is NULL once the row no longer
    counts, so revoked links never collide and a space can be re-shared.
  */
  live_space CHAR(36) GENERATED ALWAYS AS (
    CASE WHEN revoked_at IS NULL THEN space_id END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY space_invite_links_token_unique (token),
  UNIQUE KEY space_invite_links_live_unique (live_space),
  KEY space_invite_links_workspace_idx (workspace_id),
  CONSTRAINT space_links_space_fk   FOREIGN KEY (space_id)     REFERENCES spaces (id)     ON DELETE CASCADE,
  CONSTRAINT space_links_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT space_links_creator_fk FOREIGN KEY (created_by)   REFERENCES profiles (id)   ON DELETE CASCADE
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE space_join_requests (
  id            CHAR(36)     NOT NULL,
  space_id      CHAR(36)     NOT NULL,
  workspace_id  CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  -- "Hi, I'm the new designer" — optional, and the only thing the
  -- person asking controls besides asking.
  note          VARCHAR(300) NOT NULL DEFAULT '',
  status        ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
  granted_level ENUM('viewer','commenter','editor','admin') NULL,
  decided_by    CHAR(36)     NULL,
  decided_at    DATETIME(3)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  /*
    "One PENDING request per person per space."

    Pending only, so a declined request does not lock somebody out
    forever — circumstances change, and a permanent no from one click
    would be a support problem rather than a policy.
  */
  pending_space CHAR(36) GENERATED ALWAYS AS (
    CASE WHEN status = 'pending' THEN space_id END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY space_join_requests_pending_unique (pending_space, user_id),
  KEY space_join_requests_space_idx (space_id, status),
  KEY space_join_requests_user_idx (user_id),
  CONSTRAINT space_requests_space_fk   FOREIGN KEY (space_id)     REFERENCES spaces (id)     ON DELETE CASCADE,
  CONSTRAINT space_requests_ws_fk      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  CONSTRAINT space_requests_user_fk    FOREIGN KEY (user_id)      REFERENCES profiles (id)   ON DELETE CASCADE,
  CONSTRAINT space_requests_decider_fk FOREIGN KEY (decided_by)   REFERENCES profiles (id)   ON DELETE SET NULL
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
