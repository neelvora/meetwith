# MeetWith - Scratch

## Open Questions
- Project is relatively new (started Dec 7, 2025)
- No pre-project history to backfill

## To Inspect
- Google Calendar OAuth scope requirements
- Supabase RLS policies for multi-user security
- Email templates in Resend

## Risks
- Multi-account OAuth can be complex with edge cases
- Calendar permission detection depends on Google API behavior
- Real-time busy status adds latency to status endpoint

## TODO
- [ ] Set up Vercel Cron for reminder emails (every 15 min)
- [x] Run migration 009_add_user_settings.sql ✅
- [x] Run migration 010_add_reminder_support.sql ✅
- [x] Run migration 011_add_reschedule_token.sql ✅
- [x] Run migration 012_add_webhooks.sql ✅
- [x] Run migration 013_add_recurring_meetings.sql ✅
- [x] Run migration 014_add_payments.sql ✅
- [ ] Add CRON_SECRET to environment variables for cron auth
- [ ] Add SENTRY_DSN to environment variables for error monitoring
- [ ] Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET for payments
- [ ] Add OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET for Outlook calendar
- [ ] Configure Stripe webhook endpoint in Stripe Dashboard

## Resolved
- Calendar sync failures now visible and retryable from dashboard
- Root cause of missing calendar events: no `write_to_calendar` flag set on any calendar account

## Resolved (Jan 14, 2026)
- Feature audit completed - all 6 unimplemented features now have code:
  1. Analytics tracking for page_view/slot_selected ✅
  2. Daily meeting limit enforcement ✅
  3. Delete account functionality ✅
  4. Per-event buffer times UI ✅
  5. Event type location options ✅
  6. Reminder email infrastructure ✅

## Resolved (Jan 13, 2026)
- Calendar sync failure for neelbvora@gmail.com
  - Root cause: `refresh_token` was null - callback was overwriting with null on reconnect
  - Fix deployed: preserve existing `refresh_token` if Google doesn't return new one
  - Secondary issue: Google returning email as calendar ID instead of 'primary'
  - Fix deployed: PATCH `/api/calendars` now handles ID mismatch
- User action completed: revoke app at myaccount.google.com/permissions and reconnect

## In Progress
- None currently

## Local Commits Ready to Push (8 total)
1. `feat: add Sentry error monitoring` - Error tracking with Sentry
2. `feat: add recurring meetings support` - Series bookings with 17 tests
3. `docs: update local notes with Sentry and recurring meetings progress`
4. `feat: scaffold Stripe payment integration` - Paid event types
5. `docs: update notes with payment integration details`
6. `feat: scaffold Outlook and iCloud calendar integrations`
7. `docs: update notes with calendar integration details`
8. `docs: update scratch notes with pending migrations and commits`

## Migrations Status (All Run ✅)
- 009_add_user_settings.sql ✅
- 010_add_reminder_support.sql ✅
- 011_add_reschedule_token.sql ✅
- 012_add_webhooks.sql ✅
- 013_add_recurring_meetings.sql ✅
- 014_add_payments.sql ✅

## Test Status
- All 155 tests passing
- Build compiles successfully
