-- ================================================================
-- RLS FIX — Login nahi hai to anon access allow karo
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================

-- LEADS: anon read/write allow
DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;
DROP POLICY IF EXISTS "leads_all_auth" ON leads;

CREATE POLICY "leads_open" ON leads FOR ALL USING (true) WITH CHECK (true);

-- TRIALS: anon read/write allow
DROP POLICY IF EXISTS "trials_select" ON trials;
DROP POLICY IF EXISTS "trials_insert" ON trials;
DROP POLICY IF EXISTS "trials_update" ON trials;
DROP POLICY IF EXISTS "trials_delete" ON trials;
DROP POLICY IF EXISTS "trials_all_auth" ON trials;

CREATE POLICY "trials_open" ON trials FOR ALL USING (true) WITH CHECK (true);

-- CALL LOGS: anon read/write allow
DROP POLICY IF EXISTS "calls_select" ON call_logs;
DROP POLICY IF EXISTS "calls_insert" ON call_logs;
DROP POLICY IF EXISTS "calls_update" ON call_logs;
DROP POLICY IF EXISTS "calls_delete" ON call_logs;
DROP POLICY IF EXISTS "calls_all_auth" ON call_logs;

CREATE POLICY "calls_open" ON call_logs FOR ALL USING (true) WITH CHECK (true);

-- DAILY TARGETS: anon read/write allow
DROP POLICY IF EXISTS "targets_select" ON daily_targets;
DROP POLICY IF EXISTS "targets_insert" ON daily_targets;
DROP POLICY IF EXISTS "targets_update" ON daily_targets;
DROP POLICY IF EXISTS "targets_delete" ON daily_targets;
DROP POLICY IF EXISTS "targets_all_auth" ON daily_targets;

CREATE POLICY "targets_open" ON daily_targets FOR ALL USING (true) WITH CHECK (true);

-- USERS: anon read/write allow
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_update_self_or_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

CREATE POLICY "users_open" ON users FOR ALL USING (true) WITH CHECK (true);
