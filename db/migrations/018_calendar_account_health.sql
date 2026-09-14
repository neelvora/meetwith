-- Migration: 018_calendar_account_health
-- Date: 2026-09-13
-- Description: Somewhere for the token refresh to record that an account died.
--
-- A refresh that fails leaves no trace today, so a Google account whose grant
-- has expired looks exactly like a healthy account with an empty calendar:
-- availability treats it as free and offers slots over real meetings.
--
-- disconnected_at is set on the first failure and left alone by later ones, so
-- it reads as "since". It is cleared the moment a refresh or a reconnect works.

ALTER TABLE calendar_accounts
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_refresh_at TIMESTAMPTZ;
