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

### Webhook System
- Users can configure webhooks in settings
- Events: booking.created, booking.cancelled, booking.rescheduled
- HMAC-SHA256 signature verification (X-MeetWith-Signature header)
- Non-blocking delivery (fire and forget, 10s timeout)
- Webhook logs track delivery success/failure

### Recurring Meetings
- Event types can be configured as recurring
- Recurrence patterns: daily, weekly (with specific days), biweekly, monthly
- End conditions: count-based (max 52), date-based, or indefinite
- Creating a recurring booking:
  1. Validates all slots are available upfront
  2. Creates a booking_series record
  3. Creates individual bookings linked via series_id
  4. Creates calendar events for each occurrence
  5. Sends single confirmation email for the series
- Each booking in series has series_index (1-based)

### Error Monitoring (Sentry)
- Conditional loading: only active when SENTRY_DSN env var is set
- Server, client, and edge runtime coverage
- Session replay: 1% sampling (100% on error)
- Trace sampling: 10%
- Source maps hidden in production
- Tunnel route: /monitoring (to avoid ad blockers)

### Payment Integration (Stripe)
- Using Stripe Connect for marketplace model
- Hosts connect their Stripe Express accounts
- Platform takes configurable fee (default 5%)
- Payment flow:
  1. Guest selects paid event type
  2. Create pending booking + payment record
  3. Redirect to Stripe Checkout
  4. Webhook confirms payment → confirm booking → send emails
- Stripe Connect Express for simplest onboarding
- Refunds supported through admin action
- Environment variables needed:
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET  
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

### Outlook Calendar Integration
- Uses Microsoft Graph API (v1.0)
- OAuth 2.0 with authorization code flow
- Required Azure AD app permissions:
  - Calendars.ReadWrite
  - User.Read
  - offline_access (for refresh tokens)
- Supports Teams meeting creation via isOnlineMeeting flag
- Environment variables:
  - OUTLOOK_CLIENT_ID
  - OUTLOOK_CLIENT_SECRET

### iCloud Calendar Integration
- Apple uses CalDAV protocol, not REST API
- Options:
  1. CalDAV with tsdav package (requires app-specific passwords)
  2. ICS file generation (implemented, user imports manually)
- Current implementation: ICS file generation only
- Full CalDAV requires user to generate app-specific password at appleid.apple.com
