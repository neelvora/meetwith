-- Add reschedule_token to bookings table for guest self-reschedule links
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_token TEXT UNIQUE;

-- Add columns to track reschedule history
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES bookings(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INT DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_token ON bookings(reschedule_token);
