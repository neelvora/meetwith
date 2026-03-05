-- Migration: 015_security_hardening
-- Date: 2026-03-05
-- Description: Fix security vulnerabilities flagged by Supabase Security Advisor
-- Issues addressed:
--   1. RLS Disabled on user_settings
--   2. Security Definer View on booking_daily_stats
--   3. Function search_path mutable on update_updated_at
--   4. RLS Policy Always True on multiple tables

-- =====================================================
-- 1. Enable RLS on user_settings and add policies
-- =====================================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own settings (via service role since we use server-side auth)
CREATE POLICY "Service role manages user_settings" ON user_settings
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 2. Fix Security Definer View on booking_daily_stats
-- =====================================================
-- Drop and recreate with SECURITY INVOKER (the default, but explicit is better)
DROP VIEW IF EXISTS booking_daily_stats;

CREATE VIEW booking_daily_stats 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  DATE(created_at AT TIME ZONE 'UTC') as date,
  event_type,
  COUNT(*) as event_count
FROM booking_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at AT TIME ZONE 'UTC'), event_type
ORDER BY date DESC;

-- =====================================================
-- 3. Fix Function Search Path Mutable
-- =====================================================
-- Recreate update_updated_at with immutable search_path
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Fix RLS Policy Always True
-- =====================================================
-- These tables use service_role for all access from Next.js backend
-- Replace USING (true) with proper service role checks

-- users table
DROP POLICY IF EXISTS users_own_data ON users;
CREATE POLICY "Service role manages users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- calendar_accounts table
DROP POLICY IF EXISTS calendar_own_data ON calendar_accounts;
CREATE POLICY "Service role manages calendar_accounts" ON calendar_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- availability_rules table
DROP POLICY IF EXISTS availability_own_data ON availability_rules;
CREATE POLICY "Service role manages availability_rules" ON availability_rules
  FOR ALL USING (auth.role() = 'service_role');

-- event_types table
DROP POLICY IF EXISTS event_types_own_data ON event_types;
CREATE POLICY "Service role manages event_types" ON event_types
  FOR ALL USING (auth.role() = 'service_role');

-- bookings table
DROP POLICY IF EXISTS bookings_own_data ON bookings;
CREATE POLICY "Service role manages bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

-- booking_events table (analytics)
DROP POLICY IF EXISTS "Users can view own booking events" ON booking_events;
DROP POLICY IF EXISTS "Allow insert booking events" ON booking_events;

-- Service role for full access
CREATE POLICY "Service role manages booking_events" ON booking_events
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous insert for analytics tracking (this is intentional public access)
CREATE POLICY "Allow public insert booking events" ON booking_events
  FOR INSERT WITH CHECK (true);

-- webhooks table
DROP POLICY IF EXISTS webhooks_own_data ON webhooks;
CREATE POLICY "Service role manages webhooks" ON webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- webhook_logs table
DROP POLICY IF EXISTS webhook_logs_own_data ON webhook_logs;
CREATE POLICY "Service role manages webhook_logs" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. Enable RLS on migrations table
-- =====================================================
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages migrations" ON migrations
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Record migration
-- =====================================================
INSERT INTO migrations (name) VALUES ('015_security_hardening')
ON CONFLICT (name) DO NOTHING;
