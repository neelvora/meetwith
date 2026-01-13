# MeetWith - Decisions

## Architecture

### Tech Stack
- Next.js 16 with App Router
- Supabase (PostgreSQL) for database
- NextAuth.js for authentication
- Google Calendar API for calendar integration
- Resend for transactional email
- Tailwind CSS for styling
- Vitest for testing

### Auth Strategy
- Primary: Google OAuth
- Secondary: Email/password
- Multi-account OAuth lookup by email
- Session stores database UUID

### Calendar Integration
- Multi-account support (connect multiple Google accounts)
- Multi-calendar per account with overlap view
- Real-time busy/free checking
- Auto-create Google Meet links

### Availability Engine
- Weekly rules (per-day start/end times)
- Respects calendar busy times
- Buffer before/after meetings
- Minimum notice hours
- Maximum future days
- Auto-create default rules for new users

## UI/UX

### Design
- Glass morphism aesthetic
- Light/dark mode
- Plus Jakarta Sans font
- Fully mobile responsive

### Booking Flow
- Public pages at /[username]
- Custom slugs with availability checking
- Time slot picker with timezone support
- ICS file generation
- Cancellation tokens

## Constraints

### External Dependencies
- Google Calendar API requires proper OAuth scopes
- Permission detection added to warn users
- Calendar disconnect functionality for cleanup

### Data Model
- 10 migrations applied on top of initial schema
- Includes: notification prefs, cancellation tokens, sort index, analytics, follow-up drafts, external status, password auth, user_settings, reminder_sent

### Reminder Emails Strategy
- Cron job at `/api/cron/reminders` runs every 15 minutes (configure in Vercel)
- Finds confirmed bookings within 24 hours that haven't been reminded
- Respects user's notification_preferences.reminders setting
- Marks `reminder_sent = true` after successful send
- Uses Resend email with styled template

### Per-Event Buffers
- Event types can have buffer_before and buffer_after (minutes)
- Falls back to global buffer_time from user_settings if event buffers are 0
- Effective buffer = event buffer > 0 ? event buffer : global buffer

### Calendar Sync Strategy
- Booking creation requires `write_to_calendar = true` on a calendar account
- If no write calendar configured, booking succeeds but `external_status = 'not_applicable'`
- If calendar API fails, booking succeeds but `external_status = 'failed'` with `external_error`
- Retry mechanism allows manual re-sync from dashboard
- Calendar ID matching handles Google's inconsistency (email vs 'primary')
- OAuth reconnect preserves existing refresh_token if Google doesn't return a new one
