-- ============================================================
-- Zidny Filmmaking — V2 migration
-- Run this in the Supabase SQL Editor against the EXISTING V1
-- project. Every statement is idempotent (safe to re-run).
-- ============================================================

-- ─── project_types ───────────────────────────────────────────
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS default_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS default_revisions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS stages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── editors / team_members ─────────────────────────────────
ALTER TABLE editors ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE editors ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS password_reset_token TEXT UNIQUE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'pending';
DO $$ BEGIN
  ALTER TABLE editors ADD CONSTRAINT editors_account_status_check
    CHECK (account_status IN ('pending', 'invited', 'active', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS telegram_link_code_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS quiet_hours_start TIME NOT NULL DEFAULT '22:00:00';
ALTER TABLE editors ADD COLUMN IF NOT EXISTS quiet_hours_end TIME NOT NULL DEFAULT '08:00:00';
ALTER TABLE editors ADD COLUMN IF NOT EXISTS cgu_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'freelance';
DO $$ BEGIN
  ALTER TABLE editors ADD CONSTRAINT editors_contract_type_check
    CHECK (contract_type IN ('staff', 'freelance'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS level TEXT DEFAULT '';
ALTER TABLE editors ADD COLUMN IF NOT EXISTS default_rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE editors ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- ─── client_orders (new) ─────────────────────────────────────
-- A single client request can span several videos (projects) delivered on
-- independent timelines. The order groups them so commercial + team stay
-- shared across every video in the batch.
CREATE TABLE IF NOT EXISTS client_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_company TEXT DEFAULT '',
  commercial_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE client_orders DISABLE ROW LEVEL SECURITY;

-- ─── projects ────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_requirements JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_company TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES editors(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES client_orders(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS revisions_allowed INTEGER NOT NULL DEFAULT 2;

-- ─── deliverables (new) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  version INTEGER NOT NULL,
  submitted_by UUID REFERENCES editors(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  mime_type TEXT NOT NULL,
  thumbnail_path TEXT,
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'submitted', 'reviewed', 'validated', 'rejected')),
  notes TEXT DEFAULT '',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_decision_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT DEFAULT '',
  rejection_comment TEXT DEFAULT '',
  client_share_token TEXT UNIQUE,
  client_share_expires_at TIMESTAMP WITH TIME ZONE,
  client_share_access_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, stage, version)
);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE deliverables DISABLE ROW LEVEL SECURITY;

-- ─── contacts (new) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('FIGURANT', 'COMMERCIAL')),
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  daily_rate DECIMAL(12, 2) DEFAULT 0,
  notes TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- ─── notifications (new) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES editors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ─── project_stakeholders — add scriptwriter role ───────────
ALTER TABLE project_stakeholders DROP CONSTRAINT IF EXISTS project_stakeholders_role_check;
ALTER TABLE project_stakeholders ADD CONSTRAINT project_stakeholders_role_check
  CHECK (role IN ('filmmaker', 'media_face', 'voiceover', 'scriptwriter', 'editor'));

-- ─── project_files (new) — reference files attached to a project ───────────
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES editors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;

-- ─── editors — email unique only among active members ───────
-- A soft-deleted (is_active=false) member's old email must not block reusing it.
ALTER TABLE editors DROP CONSTRAINT IF EXISTS editors_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS editors_email_active_key ON editors(email) WHERE is_active = true;

-- ─── deliverables — persistent internal download link ───────
-- Separate from client_share_token (that one's the expiring, client-review link with
-- decision buttons). This one is what the "copy link" button generates — a plain,
-- session-independent link any team member can paste and click, no login required
-- in that browser tab. Not expiring, since it's meant to be shared internally.
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS download_token TEXT;
UPDATE deliverables SET download_token = uuid_generate_v4()::text WHERE download_token IS NULL;
ALTER TABLE deliverables ALTER COLUMN download_token SET DEFAULT uuid_generate_v4()::text;
DO $$ BEGIN
  ALTER TABLE deliverables ADD CONSTRAINT deliverables_download_token_key UNIQUE (download_token);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── deliverables — group files submitted together as one batch ────
-- When a member submits several files at once, they must be reviewed together —
-- the project only advances once every file in that batch has a decision made on it.
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS batch_id UUID;
UPDATE deliverables SET batch_id = id WHERE batch_id IS NULL;

-- ─── notifications — read tracking for the notification bell ───────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- ─── editor_assignments — survive a hard-deleted editor ─────
-- "Delete" on a team member is now a real DELETE FROM editors (not a soft flag), so any
-- assignment they had must keep a name snapshot instead of relying on the FK join, and the
-- FK itself must not cascade-delete the assignment row (that would erase Kanban history).
ALTER TABLE editor_assignments ADD COLUMN IF NOT EXISTS editor_name TEXT NOT NULL DEFAULT '';
UPDATE editor_assignments ea SET editor_name = e.full_name
  FROM editors e WHERE ea.editor_id = e.id AND ea.editor_name = '';
ALTER TABLE editor_assignments ALTER COLUMN editor_id DROP NOT NULL;
ALTER TABLE editor_assignments DROP CONSTRAINT IF EXISTS editor_assignments_editor_id_fkey;
ALTER TABLE editor_assignments ADD CONSTRAINT editor_assignments_editor_id_fkey
  FOREIGN KEY (editor_id) REFERENCES editors(id) ON DELETE SET NULL;

-- ─── projects — per-stage deadlines, set alongside team assignment ───────
-- Keyed by stage ('pre-production' | 'shooting' | 'editing'), value is a yyyy-MM-dd string.
-- Always kept on/before the project's own final deadline (enforced client-side when set).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_deadlines JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── done ────────────────────────────────────────────────────
