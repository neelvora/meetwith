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
- 8 migrations applied on top of initial schema
- Includes: notification prefs, cancellation tokens, sort index, analytics, follow-up drafts, external status, password auth
