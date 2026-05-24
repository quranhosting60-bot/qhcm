-- ════════════════════════════════════════════════════════════════════
-- QURAN HOSTING CRM — Supabase Database Schema
-- Run this file in Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USERS (profile table linked to Supabase auth.users) ─────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  role VARCHAR(50) NOT NULL
    CHECK (role IN ('superadmin', 'admin', 'salesperson')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. LEADS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  platform VARCHAR(50) NOT NULL
    CHECK (platform IN ('Facebook', 'Instagram', 'YouTube', 'TikTok', 'WhatsApp', 'Other')),
  status VARCHAR(50) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'trial_booked', 'trial_done', 'joined', 'not_joined', 'lost')),
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  trial_date DATE,
  trial_done BOOLEAN DEFAULT FALSE,
  joined_date DATE,
  fee_amount NUMERIC(10, 2),
  fee_paid BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. TRIALS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  trial_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. CALL_LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  agent_name VARCHAR(255) NOT NULL,
  call_type VARCHAR(50) NOT NULL CHECK (call_type IN ('whatsapp', 'viki')),
  duration INTEGER,
  call_date DATE NOT NULL,
  notes TEXT,
  outcome VARCHAR(50) NOT NULL
    CHECK (outcome IN ('no_answer', 'callback', 'interested', 'not_interested', 'trial_booked', 'joined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. DAILY_TARGETS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  date DATE NOT NULL,
  lead_id_from TEXT NOT NULL,
  lead_id_to TEXT NOT NULL,
  target_calls INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_country     ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_platform    ON leads(platform);
CREATE INDEX IF NOT EXISTS idx_leads_created_by  ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_trials_lead_id    ON trials(lead_id);
CREATE INDEX IF NOT EXISTS idx_trials_date       ON trials(trial_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead    ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent   ON call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_date    ON call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_targets_date      ON daily_targets(date);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);

-- ─── Row-Level Security (RLS) ───────────────────────────────────────
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

-- USERS policies — signup ke time circular-dependency se bachao
DROP POLICY IF EXISTS "users_insert_self" ON users;
CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_update_self" ON users;
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow superadmin / admin to update any user's status / active
DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'approved'
    )
  );

-- Simple policies for authenticated users
DROP POLICY IF EXISTS "leads_all_auth" ON leads;
CREATE POLICY "leads_all_auth" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "trials_all_auth" ON trials;
CREATE POLICY "trials_all_auth" ON trials
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "calls_all_auth" ON call_logs;
CREATE POLICY "calls_all_auth" ON call_logs
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "targets_all_auth" ON daily_targets;
CREATE POLICY "targets_all_auth" ON daily_targets
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- PATCH v2 — Fix leads INSERT policy (auth.role() deprecated in new Supabase)
-- Run these extra statements if leads insert is failing
-- ════════════════════════════════════════════════════════════════════

-- Drop old policy and recreate with correct syntax
DROP POLICY IF EXISTS "leads_all_auth" ON leads;

CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
          AND role IN ('admin', 'superadmin')
          AND status = 'approved'
      )
    )
  );

-- Fix trials policy too
DROP POLICY IF EXISTS "trials_all_auth" ON trials;

CREATE POLICY "trials_select" ON trials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "trials_insert" ON trials
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "trials_update" ON trials
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "trials_delete" ON trials
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fix call_logs policy
DROP POLICY IF EXISTS "calls_all_auth" ON call_logs;

CREATE POLICY "calls_select" ON call_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "calls_insert" ON call_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "calls_update" ON call_logs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "calls_delete" ON call_logs
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fix daily_targets policy
DROP POLICY IF EXISTS "targets_all_auth" ON daily_targets;

CREATE POLICY "targets_select" ON daily_targets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "targets_insert" ON daily_targets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "targets_update" ON daily_targets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "targets_delete" ON daily_targets
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Also fix users update policy (admins can update any user)
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;

CREATE POLICY "users_update_self_or_admin" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid()
        AND u2.role IN ('admin', 'superadmin')
        AND u2.status = 'approved'
    )
  );
