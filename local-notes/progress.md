# MeetWith - Progress (Last 6 Months)

## January 2026

### January 13 - Reschedule, Rate Limiting, Webhooks

#### Test Suite Fixes
- Fixed 11 pre-existing test failures caused by hardcoded December 2025 dates
- Added helper functions (`getNextWeekday`, `toEndOfDay`) for dynamic future dates
- All 138 tests now pass consistently

#### Reschedule Functionality
- Created `/api/bookings/reschedule` endpoint (GET to validate token, POST to reschedule)
- Migration `011_add_reschedule_token.sql` adds:
  - `reschedule_token` column for guest self-service
  - `reschedule_count` to track reschedules (max 3)
  - `rescheduled_from_id` for history tracking
- Added `updateCalendarEvent()` function to modify existing calendar events
- Created beautiful HTML reschedule email templates (attendee + host)
- Booking creation now generates both cancellation and reschedule tokens

#### Rate Limiting for Public Endpoints
- Added rate limiting to `/api/availability/slots` (30 requests/minute)
- Added rate limiting to `/api/bookings/cancel` (10 requests/minute)
- Added rate limiting to `/api/bookings/reschedule` (10 requests/minute)
- Uses existing `checkRateLimit` infrastructure

#### Webhooks System
- Migration `012_add_webhooks.sql` creates:
  - `webhooks` table (user_id, name, url, events, secret, is_active)
  - `webhook_logs` table (webhook_id, event_type, payload, response, success)
- Created `/lib/webhooks.ts` with:
  - HMAC-SHA256 signature generation for payload verification
  - Non-blocking delivery with 10s timeout
  - Event payload builders for booking.created/cancelled/rescheduled
- Created `/api/settings/webhooks` for CRUD operations
- Integrated webhooks into:
  - Booking creation flow
  - Cancellation flow  
  - Reschedule flow

---

### January 14 - Feature Audit & Implementation Sprint
- **Audit**: Scanned codebase for unimplemented features that were promised in UI
- Implemented 6 missing features:

#### 1. Analytics Tracking (page_view, slot_selected)
- Created `/api/analytics/track` endpoint for public page events
- BookingClient now tracks page_view on mount and slot_selected when choosing time
- Uses existing `booking_events` table

#### 2. Daily Meeting Limit Enforcement  
- Extended `computeSlots.ts` to accept `dailyLimit` and `existingBookings` params
- Slots API fetches confirmed bookings count per day
- Slots become unavailable once daily limit reached
- Created migration `009_add_user_settings.sql` for user_settings table

#### 3. Delete Account Functionality
- Created `/api/account` DELETE endpoint
- Deletes all user data in correct order (booking_events, bookings, event_types, availability_rules, calendar_accounts, user_settings, users)
- Added confirmation modal to SettingsClient with "DELETE" confirmation input

#### 4. Per-Event Buffer Times UI
- Added location_type, location_value, buffer_before, buffer_after to EventType interface
- Created UI in EventTypesClient modal (location dropdown + buffer selects)
- Updated POST/PUT in event-types API to save new fields
- Slots API now fetches event type buffers and uses them (falls back to global buffer)

#### 5. Event Type Location Options
- Added location type selector (Google Meet, Zoom, Phone, In Person, Custom)
- Conditional location_value input for Zoom link/phone/address
- BookingClient displays location info on event type cards

#### 6. Reminder Emails Infrastructure
- Created `sendReminderEmail()` in lib/email with styled template
- Created `/api/cron/reminders` endpoint for scheduled reminder sending
- Finds bookings starting within 24h that haven't been reminded
- Respects user's notification_preferences.reminders setting
- Created migration `010_add_reminder_support.sql` for reminder_sent column
- Note: Requires Vercel Cron or external scheduler to actually send reminders

### January 13 (continued)
- Fix: Google calendar ID mismatch when setting default calendar
  - Google sometimes returns email address as calendar ID instead of 'primary'
  - PATCH `/api/calendars` now falls back to matching `account_email` when `calendar_id` doesn't match
- Fix: Preserve existing `refresh_token` on OAuth reconnect
  - Google doesn't always return a new refresh_token on re-auth
  - Callback now preserves existing token instead of overwriting with null
- Fix: Surface actual Google API error in retry-sync endpoint
  - Users now see the real error message when calendar sync fails

### January 13 (earlier)
- Calendar sync issue tracking and retry functionality
- Dashboard shows "Sync Issues" filter tab for bookings that failed to sync
- New `/api/bookings/[id]/retry-sync` endpoint to re-attempt calendar event creation
- Alert banner on dashboard home when sync issues exist
- Tracks `external_status`, `external_error` in booking records

## December 2025

### Late December
- Project history documentation added
- Real-time busy status via Google Calendar
- Public status endpoint for external availability badges
- Booking page bug fixes, event type ordering
- Calendar account disconnect functionality
- Google Calendar permission detection/warnings
- Auto-select first calendar as default
- Custom booking link slugs with availability checking

### Mid December - Theme & UX
- Light/dark mode with Plus Jakarta Sans font
- Premium styling throughout
- Theme support across availability, calendar pages
- Calendar page UX clarity improvements
- Feedback button
- Setup checklist and real dashboard stats
- Beta signup form

### Early-Mid December - Core Features
- Email/password authentication
- Calendar list per account
- Default availability rules failsafe
- AI features, multi-user security fixes, mobile polish
- UX polish, reliability, analytics, marketing
- Mobile responsive updates
- Booking management and cancellation flow
- Functional dashboard pages (Availability, Settings, Event Types)

### December 7-10 - Initial Build
- Multi-account Google OAuth support
- Multi-calendar support with overlap view
- Production booking flow (DB storage, Google Calendar events, email)
- Complete booking flow (time picker, form, confirmation)
- Public booking page at /[username]
- Google Calendar integration
- Availability engine
- Initial scaffolding (Next.js 15, NextAuth, Supabase, Glass UI)

## Pre-December 2025
- Project started December 7, 2025
