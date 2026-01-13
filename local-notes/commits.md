# MeetWith - Commits (Grouped Intent)

## Feature Audit Implementation (Jan 14, 2026)
- Analytics tracking: page_view and slot_selected events on public booking page
- Daily meeting limit enforcement in availability engine
- Delete account API and confirmation UI
- Per-event buffer times UI in event types editor
- Event type location options (Google Meet, Zoom, Phone, In Person, Custom)
- Reminder email infrastructure (template + cron endpoint)
- Migrations: 009_add_user_settings.sql, 010_add_reminder_support.sql

## Public API & Integrations
- Status endpoint for external availability badges
- Real-time Google Calendar busy status

## Booking Flow
- Custom booking link slugs
- Event type ordering
- Booking page bug fixes
- Cancellation flow with tokens

## Calendar Management
- Calendar disconnect functionality
- Permission detection and warnings
- Auto-select first calendar as default
- Multi-account and multi-calendar support

## Theme & UX
- Light/dark mode
- Plus Jakarta Sans font
- Glass morphism styling
- Mobile responsive updates
- Setup checklist
- Feedback button

## Auth
- Email/password authentication
- Multi-account OAuth user lookup
- Session with database UUID

## Calendar Sync Improvements (Jan 2026)
- Sync issue tracking in bookings table (`external_status`, `external_error`)
- Retry sync API endpoint (`/api/bookings/[id]/retry-sync`)
- Dashboard UI for surfacing and fixing sync failures
- Fix: Google calendar ID mismatch when setting default (handles email vs 'primary' ID)
- Fix: Preserve existing refresh_token on reconnect (prevents null overwrite)
- Fix: Surface actual Google API error in retry-sync response

## Initial Build (Dec 7-10)
- Core scaffolding
- Google Calendar integration
- Availability engine
- Booking flow (time picker, form, confirmation)
- Public booking pages
- Email notifications via Resend
