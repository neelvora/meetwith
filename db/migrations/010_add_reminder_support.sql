-- Add reminder tracking to bookings table
-- Migration: 010_add_reminder_support.sql

-- Add reminder_sent flag to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

-- Index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_query 
ON bookings (status, reminder_sent, start_time) 
WHERE status = 'confirmed' AND reminder_sent = false;

-- Comment explaining the column
COMMENT ON COLUMN bookings.reminder_sent IS 'Whether a reminder email has been sent for this booking';

-- Note: Reminder preferences are stored in users.notification_preferences JSONB
-- The 'reminders' key controls whether attendees receive reminder emails
