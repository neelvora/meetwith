-- Migration: Add sort_index to event_types for custom ordering
-- Run this migration manually in Supabase SQL editor

-- Add sort_index column for custom ordering
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS sort_index INTEGER DEFAULT 0;

-- Initialize sort_index based on current order (created_at)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as rn
  FROM event_types
)
UPDATE event_types
SET sort_index = ranked.rn
FROM ranked
WHERE event_types.id = ranked.id;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_event_types_sort_index ON event_types(user_id, sort_index);
