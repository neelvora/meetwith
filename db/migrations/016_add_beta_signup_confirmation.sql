-- Migration: 016_add_beta_signup_confirmation
-- Date: 2026-07-28
-- Description: Double opt-in for the public beta signup form.
--
-- The form was being used to relay mail to addresses the submitter does not
-- own (subscription bombing via Gmail dot-variants). Holding a signup here
-- until the address owner clicks a confirmation link means an attacker can
-- never get an address onto the list, because they cannot read that inbox.
--
-- Tokens are stored as SHA-256 hashes, so a leak of this table does not let
-- anyone confirm a pending signup.

CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  name TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup path for the confirm route
CREATE INDEX IF NOT EXISTS beta_signups_token_hash_idx
  ON beta_signups (token_hash);

-- One live pending request per address. Re-requesting replaces the old row
-- rather than stacking up, and a confirmed address cannot be re-submitted.
CREATE UNIQUE INDEX IF NOT EXISTS beta_signups_normalized_email_idx
  ON beta_signups (normalized_email);

-- Triage: what is still waiting, oldest first
CREATE INDEX IF NOT EXISTS beta_signups_pending_idx
  ON beta_signups (created_at)
  WHERE confirmed_at IS NULL;

ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

-- Written only by the server using the service role. No anon access at all:
-- the pending list is a list of email addresses and must not be readable.
CREATE POLICY "Service role manages beta_signups" ON beta_signups
  FOR ALL USING (auth.role() = 'service_role');
