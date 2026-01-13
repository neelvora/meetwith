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

## Resolved
- Calendar sync failures now visible and retryable from dashboard
- Root cause of missing calendar events: no `write_to_calendar` flag set on any calendar account

## In Progress
- Investigating calendar sync failure for neelbvora@gmail.com
- Root cause: refresh_token was null - callback was overwriting with null on reconnect
- Fix deployed: preserve existing refresh_token if Google doesn't return new one
- User action needed: revoke app at myaccount.google.com/permissions and reconnect
