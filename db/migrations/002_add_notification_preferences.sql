-- Add notification_preferences to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_confirmations": true, "reminders": true, "cancellations": true, "marketing": false}';
