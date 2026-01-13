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
- Improved error surfacing to show actual Google API error (deployed Jan 13)
