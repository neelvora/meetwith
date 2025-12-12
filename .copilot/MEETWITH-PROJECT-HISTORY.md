# MeetWith - Complete Project History

> Last Updated: December 12, 2025
> Share this file with AI assistants to provide full project context.

---

## Project Overview

**MeetWith** is an open-source, AI-powered scheduling platform - an alternative to Calendly.
- **Live URL**: [meetwith.dev](https://www.meetwith.dev)
- **Repository**: github.com/neelvora/meetwith
- **Started**: December 7, 2025
- **Tech Stack**: Next.js 16, Supabase (PostgreSQL), NextAuth.js, Google Calendar API, Resend (email), Tailwind CSS, Vitest

---

## Core Features Built

### 🗓️ Calendar Integration
- Google Calendar OAuth connection
- Multi-account support (connect multiple Google accounts)
- Multi-calendar support per account with overlap view
- Real-time busy/free status checking
- Auto-create Google Meet links for bookings
- Detect and warn about missing Calendar permissions
- Ability to disconnect calendar accounts

### 📅 Booking System
- Public booking pages at `/[username]`
- Custom booking link slugs with availability checking
- Event types (30min meeting, 1hr consultation, etc.)
- Time slot picker with timezone support
- Booking form with attendee details
- Booking confirmation page
- Cancellation flow with tokens
- ICS file generation for calendar downloads

### ⏰ Availability Engine
- Weekly availability rules (per-day start/end times)
- Respects calendar busy times
- Buffer before/after meetings
- Minimum notice hours
- Maximum future days
- Automatic slot computation with conflict detection
- Default availability rules created for new users

### 📧 Email Notifications
- Automated confirmations to host and attendee
- Timezone-aware email formatting
- Google Meet link included
- Powered by Resend

### 🔐 Authentication
- Google OAuth (primary)
- Email/password authentication
- Multi-account OAuth user lookup by email
- Session with database UUID

### 🎨 UI/UX
- Glass morphism design
- Light/dark mode with Plus Jakarta Sans font
- Fully mobile responsive
- Premium styling throughout
- Setup checklist for new users
- Real dashboard stats
- Feedback button

### 🤖 AI Features
- AI-powered event descriptions
- Smart window suggestions
- Follow-up draft generation

### 📊 Analytics & Status
- Booking analytics tracking
- Public status endpoint for external availability badges
- Real-time busy status from Google Calendar

---

## Database Schema

### Tables
1. **users** - User profiles with username, timezone, welcome message, brand color
2. **calendar_accounts** - Connected Google/Apple/Outlook accounts with tokens
3. **availability_rules** - Weekly availability (day, start time, end time)
4. **event_types** - Booking links with duration, buffer, location settings
5. **bookings** - Scheduled meetings with status tracking

### Migrations Applied
1. `001_initial_setup.sql` - Core schema (in schema.sql)
2. `002_add_notification_preferences.sql`
3. `003_add_cancellation_token.sql`
4. `004_add_sort_index.sql`
5. `005_add_booking_analytics.sql`
6. `006_add_follow_up_draft.sql`
7. `007_add_external_status.sql`
8. `008_add_password_auth.sql`

---

## Complete Commit History (Chronological)

### December 7, 2025 - Project Inception

| Commit | Description |
|--------|-------------|
| `2386820` | Initial MeetWith scaffolding - Next.js 15, NextAuth, Supabase, Glass UI |
| `db95f1a` | Phase 2: Google Calendar integration and availability engine |
| `5d3cb38` | Update description to clarify platform comparison |
| `26610f0` | Add public booking page at /[username] |
| `af4a45b` | Add complete booking flow: time picker, form, confirmation |
| `a67ac02` | Add modern favicon with violet gradient M logo |
| `d0835c0` | Add production booking flow: DB storage, Google Calendar events, email confirmations |
| `222c03a` | Add multi-calendar support with overlap view |
| `59bd5e1` | Add multiple Google account support |
| `5473976` | Fix user ID in session for multi-account OAuth flow |
| `e06a0bb` | Fix multi-account OAuth user lookup by email |
| `affd8ac` | Fix auth to use DB UUID, add event logging |
| `df1ca4a` | Fix timezone issues in booking page |

### December 8, 2025 - Major Feature Sprint

| Commit | Description |
|--------|-------------|
| `df8c9ce` | Add tests and fix timezone bug in slot generation |
| `559863d` | Fix slots API to fetch host calendar, fix email timezone |
| `f9538f6` | Add logging for calendar event creation debugging |
| `80217f9` | Add functional dashboard pages: Availability, Settings, Event Types |
| `078c546` | Update booking page to fetch from database |
| `09e0cbd` | Add mobile responsive updates, booking management, and cancellation flow |
| `6e67681` | Phase 3: UX polish, reliability, analytics, and marketing |
| `203ec58` | Phase 1: AI features, multi-user security fixes, mobile polish |
| `7c5c3d6` | Phase 1: Testing and hardening |
| `60ec869` | Add debug logging for booking validation |
| `ff39a37` | Add failsafe: create default availability rules for new users |
| `4e7a754` | Update site copy: user-focused product language |
| `3a84ce1` | feat: calendar list per account + email/password auth |
| `34f138a` | feat: add beta signup form to homepage |
| `38d5417` | revert: hero CTA back to Get Started Free |
| `0f3f8ac` | feat: add setup checklist and real dashboard stats |
| `c5a8e67` | improve: clearer calendar selection UI |
| `57e1eed` | feat: feedback button + calendar UX improvements |
| `25534c0` | improve: calendar page UX clarity |
| `b5d54c9` | improve: default calendar dropdown + dedupe accounts |
| `3e0cf8e` | Add light/dark mode with premium styling and Plus Jakarta Sans font |
| `fd4750a` | Continue theme updates for calendar pages |
| `3b1963a` | Add theme support for availability page |
| `ea82cea` | Fix bugs and continue theme updates |
| `e329a39` | Add custom booking link slug with availability checking |
| `1a81b95` | Auto-select first calendar as default for new bookings |
| `18b1c04` | Detect and warn about missing Google Calendar permissions |
| `d628721` | Add ability to disconnect calendar accounts |
| `b80d068` | Fix booking page bugs and event type ordering |

### December 9, 2025 - Status API & Polish

| Commit | Description |
|--------|-------------|
| `1a69728` | Add public status endpoint for external availability badges |
| `6cb9de0` | Test: Set availability to false (busy) |
| `8fea6ad` | Status endpoint now checks Google Calendar for real-time busy status |

---

## Test Coverage

### Test Files
- `ai-helpers.test.ts` - AI feature tests
- `availability-engine.test.ts` - Core availability logic
- `availability.test.ts` - Availability rules
- `booking-creation.test.ts` - Booking flow
- `cancellation.test.ts` - Cancellation logic
- `computeSlots.test.ts` - Slot generation
- `rateLimit.test.ts` - Rate limiting
- `timezone-behavior.test.ts` - Timezone handling
- `timezone.test.ts` - Timezone utilities
- `validateRequest.test.ts` - Request validation
- `validateSlot.test.ts` - Slot validation

---

## API Routes

### Public
- `GET /api/public/status` - Real-time availability status
- `GET /api/availability/slots` - Available time slots
- `POST /api/bookings` - Create booking

### Protected (Authenticated)
- `GET/POST /api/availability` - Availability rules
- `GET/POST /api/calendars` - Calendar connections
- `GET/POST /api/calendars/accounts` - Calendar accounts
- `GET /api/calendars/events` - Calendar events
- `POST /api/calendars/google` - Google OAuth callback
- `GET/POST /api/event-types` - Event types CRUD
- `GET/POST /api/settings` - User settings
- `GET /api/settings/check-username` - Username availability
- `POST /api/bookings/cancel` - Cancel booking

### AI
- `POST /api/ai/event-description` - Generate event descriptions
- `POST /api/ai/suggest-window` - Smart time suggestions

---

## Key Files & Structure

```
meetwith/
├── src/
│   ├── app/
│   │   ├── [username]/          # Public booking page
│   │   │   ├── BookingClient.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── TimeSlotPicker.tsx
│   │   │   └── BookingConfirmation.tsx
│   │   ├── dashboard/           # Protected dashboard
│   │   │   ├── availability/
│   │   │   ├── bookings/
│   │   │   ├── calendars/
│   │   │   ├── event-types/
│   │   │   └── settings/
│   │   └── api/                 # API routes
│   ├── components/
│   │   ├── SetupChecklist.tsx
│   │   ├── FeedbackButton.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── availability/        # Slot computation
│   │   ├── booking/             # Booking validation
│   │   ├── calendar/            # Google Calendar
│   │   ├── email/               # Resend integration
│   │   ├── ai/                  # AI helpers
│   │   └── supabase/            # Database clients
│   └── types/
└── db/
    ├── schema.sql
    └── migrations/
```

---

## Current Status (as of Dec 12, 2025)

### ✅ Fully Working
- User registration and login (Google OAuth + email/password)
- Calendar connection and sync
- Availability rule management
- Event type creation and management
- Public booking pages
- Booking creation with Google Calendar events
- Email notifications
- Cancellation flow
- Light/dark mode
- Mobile responsive design
- Real-time status endpoint

### 🔄 In Development
- Additional calendar providers (Apple, Outlook)
- Team/organization features
- Recurring availability exceptions
- Custom domains

### 📝 Future Ideas
- Zoom integration
- Payment integration (Stripe)
- SMS notifications
- Webhooks for integrations
- Calendar embed widget

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth & Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# App
APP_BASE_URL=https://www.meetwith.dev
```

---

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run test     # Run Vitest tests
npm run lint     # ESLint
```

---

## Notes for Future Sessions

1. **Status API** - The `/api/public/status` endpoint checks real-time Google Calendar availability
2. **Multi-account** - Users can connect multiple Google accounts, each with multiple calendars
3. **Timezone handling** - Extensive work done on timezone bugs; see test files for edge cases
4. **AI features** - Event description generation and smart window suggestions are functional
5. **Beta signup** - Form on homepage collects interest, stored in Supabase

---

*This document maintained for AI assistant context. Update after significant changes.*
