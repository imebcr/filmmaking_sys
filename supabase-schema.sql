-- ============================================================
-- Agency Platform V1 - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── project_types ───────────────────────────────────────────
CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  default_duration_hours INTEGER NOT NULL DEFAULT 24,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  default_price INTEGER NOT NULL DEFAULT 0,
  default_revisions INTEGER NOT NULL DEFAULT 0,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── editors / team_members ─────────────────────────────────
CREATE TABLE editors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  email TEXT,
  password_hash TEXT,
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT UNIQUE,
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,
  account_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (account_status IN ('pending', 'invited', 'active', 'suspended')),
  telegram_chat_id TEXT,
  telegram_linked_at TIMESTAMP WITH TIME ZONE,
  telegram_link_code TEXT,
  telegram_link_code_expires_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00:00',
  quiet_hours_end TIME NOT NULL DEFAULT '08:00:00',
  cgu_accepted_at TIMESTAMP WITH TIME ZONE,
  contract_type TEXT NOT NULL DEFAULT 'freelance'
    CHECK (contract_type IN ('staff', 'freelance')),
  level TEXT DEFAULT '',
  default_rate DECIMAL(12, 2) DEFAULT 0,
  phone TEXT DEFAULT '',
  specialty TEXT NOT NULL DEFAULT 'both'
    CHECK (specialty IN ('talking_head', 'motion', 'both')),
  contact_info TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Email only needs to be unique among active members — a soft-deleted (is_active=false)
-- member's old email must not block reusing it for someone new.
CREATE UNIQUE INDEX editors_email_active_key ON editors(email) WHERE is_active = true;

-- ─── client_orders ───────────────────────────────────────────
-- A single client request can span several videos (projects) delivered on
-- independent timelines. The order groups them so commercial + team stay
-- shared across every video in the batch.
CREATE TABLE client_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_company TEXT DEFAULT '',
  commercial_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── projects ────────────────────────────────────────────────
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  stage_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_company TEXT DEFAULT '',
  commercial_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  order_id UUID REFERENCES client_orders(id) ON DELETE SET NULL,
  project_type_id UUID REFERENCES project_types(id) ON DELETE SET NULL,
  deal_price DECIMAL(12, 2) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  revision_count INTEGER NOT NULL DEFAULT 0,
  revisions_allowed INTEGER NOT NULL DEFAULT 2,
  deadline DATE,
  stage TEXT NOT NULL DEFAULT 'incoming'
    CHECK (stage IN ('incoming', 'pre-production', 'shooting', 'editing', 'delivered')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── deliverables ────────────────────────────────────────────
CREATE TABLE deliverables (
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
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploading', 'submitted', 'reviewed', 'validated', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_decision_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT DEFAULT '',
  rejection_comment TEXT DEFAULT '',
  client_share_token TEXT UNIQUE,
  client_share_expires_at TIMESTAMP WITH TIME ZONE,
  client_share_access_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  download_token TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, stage, version)
);

-- ─── contacts ────────────────────────────────────────────────
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL
    CHECK (type IN ('FIGURANT', 'COMMERCIAL')),
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  daily_rate DECIMAL(12, 2) DEFAULT 0,
  notes TEXT DEFAULT '',
  email TEXT DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── notifications ──────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES editors(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── project_stakeholders ────────────────────────────────────
CREATE TABLE project_stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('filmmaker', 'media_face', 'voiceover', 'scriptwriter', 'editor')),
  name TEXT NOT NULL DEFAULT '',
  editor_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  cost DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── editor_assignments ──────────────────────────────────────
CREATE TABLE editor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id UUID REFERENCES editors(id) ON DELETE SET NULL,
  editor_name TEXT NOT NULL DEFAULT '',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── project_files — reference files attached to a project ────
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES editors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seed default project types ──────────────────────────────
INSERT INTO project_types (name, default_duration_hours, color) VALUES
  ('Talking Head', 24, '#3B82F6'),
  ('Motion Design', 72, '#8B5CF6'),
  ('Video Representative', 48, '#F97316');

-- ─── Disable RLS for V1 (no auth) ───────────────────────────
ALTER TABLE project_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE editors DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders DISABLE ROW LEVEL SECURITY;
ALTER TABLE editor_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
