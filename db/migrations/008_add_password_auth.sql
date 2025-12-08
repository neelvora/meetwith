-- Migration: Add password authentication support
-- Purpose: Allow users to sign up with email/password without requiring Google OAuth

-- Add password column for email/password users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add provider column to track how user signed up
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'google';

-- Add email_verified column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update existing users to mark as google authenticated
UPDATE users
SET auth_provider = 'google', email_verified = true
WHERE auth_provider IS NULL OR auth_provider = 'google';

-- Create index for email lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email_auth ON users(email, auth_provider);

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for email/password auth users';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: google, email, etc.';
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
