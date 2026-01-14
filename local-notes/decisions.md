# MeetWith - Decisions








































































































































































- E2E tests with Playwright- Test coverage for UI components- TypeScript strict mode (lots of `any`)### Can Defer- [ ] Bundle size optimization- [ ] API response caching for public endpoints- [ ] Rate limiting persistence (currently in-memory)- [ ] Supabase RLS audit for multi-tenant security### Should Address## Technical Debt---- **Break-even: 6 Pro subscribers**- **Monthly cost: ~$67**- Domain: $15/yr- Sentry: Free tier- Resend: $20/mo- Supabase Pro: $25/mo- Vercel Pro: $20/mo### Break-even Analysis- **MRR: $600/mo**- 5% conversion = 50 Pro users- 1000 free users by Q2- Launch Pro tier at $12/mo### Assumptions## Revenue Projection---12. Custom domains11. Team support (design first)### Q1 202610. Pricing page9. Usage dashboard8. Branding options### This Month7. Recurring booking UI6. Connect Outlook button5. Event Type payment fields UI### Next Week4. Stripe Connect Settings UI3. Webhooks Settings UI2. Vercel Cron for reminders1. ✅ Fix "free" language (done)### This Week## Recommended Priority Order---**Impact:** Low - no user requests**Recommendation:** Not needed yet - responsive web is fine**Effort:** 4-6 weeks### 3. Full Mobile App**Impact:** High for branding-conscious users- DNS instruction UI- SSL provisioning- Vercel API integration- Domain verification flow**Includes:****Effort:** 1 week### 2. Custom Domains**Impact:** Very high - B2B market- Admin dashboard- Team availability union- Round-robin booking- Shared calendars view- Organization model + invites**Includes:****Effort:** 2-3 weeks### 1. Team/Organization Support## Larger Efforts (Multi-day)---- **Impact:** Medium - differentiation for Pro- "Powered by MeetWith" toggle (paid)- Primary color picker- Logo upload### 4. Branding Options- **Impact:** Low now, high for monetization- Prep for usage-based limits- Show calendar API calls- Show bookings this month### 3. Usage Dashboard- **Impact:** Medium - professional use case- Show "This is a recurring meeting" info- Add recurrence options to booking form### 2. Recurring Booking UI- **Impact:** High - enables paid events- Redirect to Stripe onboarding- Show connection status- Add "Connect Stripe" button to Settings### 1. Stripe Connect Settings UI## Medium Effort (Half-day each)---- **Impact:** Medium - expands user base- Routes already exist- Add button to Calendars page### 4. Connect Outlook Button- **Impact:** High - enables monetization for hosts- Display price on public booking page- Add "Paid event" toggle + price input to event form### 3. Event Type Payment Fields- **Impact:** Medium - power users can integrate- List/add/delete webhooks- Add section to Settings page### 2. Webhooks Settings UI- **Impact:** High - users get 24h reminder emails- Reminders start sending automatically- Add cron config to `vercel.json`### 1. Vercel Cron for Reminders## Quick Wins (1-2 hours each)---- **Zoom Integration** - Not planned (Google Meet works)- **Mobile App** - Not planned- **Custom Domains** - Needs Vercel config + UI- **Team/Organization Support** - Big undertaking### Not Started ❌- **Error Monitoring** - Sentry configured, live- **iCloud Calendar** - ICS files work, CalDAV placeholder### What's Scaffolded 🔧- **Reminder Emails** - Cron endpoint ready, needs Vercel cron config- **Webhooks** - API complete, no settings UI- **Outlook Calendar** - OAuth routes exist, no "Connect" button- **Recurring Meetings** - API complete, no booking form UI- **Stripe Payments** - Backend complete, no settings UI### What's Built But Needs UI ⚠️- **Cancellation/Reschedule** - Token-based self-service for guests- **Event Types** - Multiple per user, custom colors, slugs- **User Settings** - Timezone, min notice, max future days- **Availability Rules** - Per-day schedules, buffer times, daily limits- **Email Notifications** - Booking confirmations, cancellations, reschedules- **Google Calendar** - Multi-account, multi-calendar, busy/free detection- **Core Scheduling** - Public booking pages, time slot picker, calendar sync### What's Live & Working ✅## Current State Summary> Last updated: January 14, 2026## Business Model & Pricing Strategy

### Philosophy
- Start generous, monetize as users scale
- Never paywall core scheduling functionality
- Charge for usage/resources, not artificial feature gates
- Make it profitable at scale, not predatory for individuals

### Free Tier (Always)
- Unlimited event types
- Google Calendar sync (1 account)
- Basic availability rules
- Email confirmations
- Cancellation/reschedule links
- Up to ~50 bookings/month

### Future Paid Tiers (When Implemented)
**Pro ($12-15/mo):**
- Unlimited bookings
- Multiple calendar accounts (Google, Outlook, iCloud)
- Custom branding (logo, colors)
- Remove "Powered by MeetWith" 
- Priority support
- Webhooks (5 endpoints)

**Business ($25-30/mo):**
- Everything in Pro
- Team/organization support
- Paid event types (Stripe Connect)
- Recurring meeting series
- Unlimited webhooks
- API access
- Custom domain

### Resource-Based Limits (Not Feature Gates)
- Calendar API calls (polling frequency)
- Email sends per month
- Webhook delivery attempts
- AI-generated descriptions (when implemented)

### Language Guidelines
- ✅ "Get Started Free" - implies free to start
- ✅ "No credit card required" - removes friction
- ✅ "Generous free tier" - honest about limits
- ❌ "Free forever" - false promise
- ❌ "100% free" - misleading
- ❌ "No premium tiers" - false

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
