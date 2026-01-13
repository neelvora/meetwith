-- Migration: Add user_settings table
-- This table stores per-user scheduling settings like buffer times and daily limits

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  buffer_time INT DEFAULT 0,           -- Buffer minutes between meetings
  min_notice INT DEFAULT 4,            -- Minimum hours notice required
  daily_limit INT DEFAULT 0,           -- Max meetings per day (0 = unlimited)
  max_future_days INT DEFAULT 60,      -- How far in future can book
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Upsert helper: ensure settings exist for a user
-- Run this to create default settings for existing users:
-- INSERT INTO user_settings (user_id)
-- SELECT id FROM users
-- ON CONFLICT (user_id) DO NOTHING;
