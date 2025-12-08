-- Add cancellation_token to bookings table for guest self-cancel links
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token ON bookings(cancellation_token);
