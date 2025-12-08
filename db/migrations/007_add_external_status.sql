-- Migration: Add external_status to bookings table
-- Purpose: Track the status of external calendar event creation (Google/Outlook)
-- This allows bookings to succeed even if external API calls fail, with retry capability

-- Add external_status column with default 'pending'
-- Values: 'pending', 'created', 'failed', 'not_applicable'
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_status TEXT DEFAULT 'pending';

-- Add external_error column to store error messages for debugging
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_error TEXT;

-- Add external_retry_count to track retry attempts
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS external_retry_count INT DEFAULT 0;

-- Add index for finding bookings that need retry
CREATE INDEX IF NOT EXISTS idx_bookings_external_status
ON bookings(external_status)
WHERE external_status = 'failed' OR external_status = 'pending';

-- Update existing bookings that have external_event_id
UPDATE bookings
SET external_status = 'created'
WHERE external_event_id IS NOT NULL AND external_status = 'pending';

-- Update existing bookings without external_event_id (calendar not configured)
-- Note: Some may have failed, but we assume not_applicable for old data
UPDATE bookings
SET external_status = 'not_applicable'
WHERE external_event_id IS NULL AND external_status = 'pending';

COMMENT ON COLUMN bookings.external_status IS 'Status of external calendar event: pending, created, failed, not_applicable';
COMMENT ON COLUMN bookings.external_error IS 'Error message if external event creation failed';
COMMENT ON COLUMN bookings.external_retry_count IS 'Number of retry attempts for external event creation';
