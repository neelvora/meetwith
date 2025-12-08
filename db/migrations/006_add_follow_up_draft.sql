-- Migration: Add follow_up_draft to bookings for AI-generated follow-up emails
-- Run this migration manually in Supabase SQL editor

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS follow_up_draft TEXT;
