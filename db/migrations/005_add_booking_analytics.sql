-- Migration: Add booking analytics tracking
-- Run this migration manually in Supabase SQL editor

-- Create booking_events table for analytics
CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'page_view', 'slot_selected', 'booking_created', 'booking_cancelled'
  event_data JSONB DEFAULT '{}',
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45), -- Support IPv6
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_booking_events_user_id ON booking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_event_type ON booking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);

-- Create daily stats view for dashboard
CREATE OR REPLACE VIEW booking_daily_stats AS
SELECT 
  user_id,
  DATE(created_at AT TIME ZONE 'UTC') as date,
  event_type,
  COUNT(*) as event_count
FROM booking_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at AT TIME ZONE 'UTC'), event_type
ORDER BY date DESC;

-- RLS Policies
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users can view own booking events" ON booking_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can insert booking events (for anonymous visitors)
CREATE POLICY "Allow insert booking events" ON booking_events
  FOR INSERT
  WITH CHECK (true);
