-- Add payment support for paid event types
-- This migration adds the ability to charge for meetings

-- Add payment fields to event_types table
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_cents INTEGER, -- Price in cents (e.g., 5000 = $50.00)
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT; -- Stripe Price ID for checkout

-- Create a table to track payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  
  -- Stripe fields
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Amount info
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded'
  
  -- Payer info
  payer_email TEXT,
  payer_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add payment_id to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT; -- mirrors payments.status for quick lookup

-- Add Stripe connect fields to users (for receiving payments)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT, -- Stripe Connect account ID
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT, -- 'pending', 'active', 'restricted'
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_checkout ON payments(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON bookings(payment_id);

-- Add RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" 
  ON payments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
  ON payments FOR UPDATE 
  USING (auth.uid() = user_id);
