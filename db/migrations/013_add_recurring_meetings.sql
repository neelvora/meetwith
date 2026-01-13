-- Add recurring meetings support
-- This migration adds the ability to create recurring event types and booking series

-- Add recurrence fields to event_types table
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT, -- 'daily', 'weekly', 'biweekly', 'monthly'
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[], -- array of days (0=Sun, 6=Sat) for weekly
ADD COLUMN IF NOT EXISTS recurrence_end_type TEXT DEFAULT 'count', -- 'count', 'date', 'never'
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER DEFAULT 4, -- number of occurrences
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ; -- end date if using date-based

-- Create a table to track booking series (group of related recurring bookings)
CREATE TABLE IF NOT EXISTS booking_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  recurrence_type TEXT NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly'
  recurrence_days INTEGER[], -- array of days for weekly recurrence
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_timezone TEXT DEFAULT 'America/Chicago',
  notes TEXT,
  total_occurrences INTEGER NOT NULL,
  active_occurrences INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add series reference to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES booking_series(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS series_index INTEGER; -- 1-based index within the series

-- Create index for efficient series lookups
CREATE INDEX IF NOT EXISTS idx_bookings_series_id ON bookings(series_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_user_id ON booking_series(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_status ON booking_series(status);

-- Add RLS policies for booking_series
ALTER TABLE booking_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own booking series" 
  ON booking_series FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booking series" 
  ON booking_series FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booking series" 
  ON booking_series FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking series" 
  ON booking_series FOR DELETE 
  USING (auth.uid() = user_id);
