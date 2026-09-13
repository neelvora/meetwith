# MeetWith

An open source scheduling app. You connect a Google Calendar, set the hours you are
free, and share a booking link.

[meetwith.dev](https://www.meetwith.dev) is running as a private beta. Ask for access on
the landing page and I will add you. The code runs on its own with your own keys.

## Features

- **Google Calendar** - Connect one or more Google accounts and pick which calendars to
  check. Availability reads busy times through the free/busy API, not event details.
- **Public booking page** - Your page is at `/username`. It lists your event types,
  shows times in the visitor's timezone, and takes a booking without an account.
- **Availability rules** - Hours per day of the week, buffers before and after meetings,
  minimum notice, how far out people can book, and a cap on bookings per day.
- **Email notifications** - Confirmations to host and attendee, a reminder in the 24
  hours before the meeting, and cancellation and reschedule notices. Sent with Resend.
- **Google Meet links** - Created on the calendar event and included in both emails.
- **Optional AI helpers** - With `OPENAI_API_KEY` set, gpt-4o-mini drafts event type
  descriptions, a follow-up email after a booking, and tips about your availability
  settings. Without the key these are off.
- **Self-hostable** - Next.js 16, Supabase, TypeScript, MIT licensed.

### Not finished

Stripe payments, webhooks, recurring bookings, and rescheduling have working API routes
but no UI, so they cannot be used from the app. Attendees have no cancel or reschedule
link: the token is stored on the booking and never sent out, so cancelling is the host's
job from the dashboard. Outlook has OAuth routes and no connect button. iCloud is ICS
export only. Team scheduling is not started.

## Getting Started

### Prerequisites

- Node.js 22+
- Supabase account
- Google Cloud Console project (for Calendar API and OAuth)
- Resend account (for email notifications)

### Installation

```bash
# Clone the repo
git clone https://github.com/neelvora/meetwith.git
cd meetwith

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run database migrations in Supabase SQL Editor
# See db/schema.sql and db/migrations/

# Run the development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth & Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=MeetWith <bookings@yourdomain.com>

# App
APP_BASE_URL=https://www.meetwith.dev

# Cloudflare Turnstile (bot protection)
# Only the secret is required. The site key is public and lives in
# src/components/TurnstileWidget.tsx; set NEXT_PUBLIC_TURNSTILE_SITE_KEY only to
# override it with a Cloudflare test key. Verification FAILS CLOSED: without
# TURNSTILE_SECRET the protected forms reject every submission.
# Protects: beta signup, public booking, account signup, feedback.
TURNSTILE_SECRET=your_turnstile_secret

# Encryption at rest for stored OAuth tokens (32 bytes)
# Generate with: openssl rand -base64 32
# Without it tokens are stored in plaintext and a warning is logged.
# Losing this key after tokens are encrypted means users must reconnect
# their calendars, so keep a copy somewhere safe.
ENCRYPTION_KEY=your_encryption_key
```

After setting `ENCRYPTION_KEY` for the first time, encrypt any tokens already
in the database:

```bash
node --env-file=.env.local scripts/encrypt-tokens.mjs          # dry run
node --env-file=.env.local scripts/encrypt-tokens.mjs --apply  # write
```

### Database Setup

1. Create a new Supabase project
2. Run `db/schema.sql` in the SQL Editor to create tables
3. Run migrations in `db/migrations/` folder in order

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth.js v4 with Google OAuth
- **Calendar**: Google Calendar API
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## How It Works

1. **Host Setup**:
   - Sign in with Google
   - Connect your Google Calendar
   - Set your weekly availability hours
   - Create event types (e.g., "30min Meeting", "1hr Consultation")

2. **Booking Flow**:
   - Visitors go to your public page (e.g., meetwith.dev/username)
   - They select an event type and pick an available time
   - They enter their details and confirm
   - Both parties receive email confirmations with Google Meet link

3. **Management**:
   - View and cancel bookings from your dashboard
   - Cancelled bookings notify the attendee and remove calendar events

## Public Status API

MeetWith provides a public endpoint for external sites to fetch user availability status (e.g., for portfolio availability badges).

### Endpoint

```
GET /api/public/status/[username]
```

### Response

```json
{
  "available": true
}
```

### Authentication

- **Public mode**: If `MEETWITH_STATUS_TOKEN` is not set, the endpoint is fully public
- **Protected mode**: If `MEETWITH_STATUS_TOKEN` is set, requests must include:
  ```
  Authorization: Bearer <token>
  ```

### Caching

The endpoint includes caching headers for CDN optimization:
- `s-maxage=60` - CDN caches for 1 minute
- `stale-while-revalidate=300` - Serve stale content for up to 5 minutes while revalidating

### Example Usage (neelvora.com)

The portfolio site at neelvora.com fetches this endpoint to show real-time availability:

```typescript
// In neelvora.com
const res = await fetch('https://www.meetwith.dev/api/public/status/neelbvora', {
  headers: process.env.MEETWITH_STATUS_TOKEN 
    ? { Authorization: `Bearer ${process.env.MEETWITH_STATUS_TOKEN}` }
    : undefined,
  next: { revalidate: 300 },
})
const { available } = await res.json()
// Badge shows "Available" or "Busy" based on status
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MEETWITH_STATUS_TOKEN` | Bearer token for protecting the status endpoint | No |

## Roadmap

- [x] Google OAuth + Calendar sync
- [x] Calendar connections UI
- [x] Availability rules engine
- [x] Public booking pages
- [x] Email notifications (Resend)
- [x] Google Meet integration
- [x] Booking management dashboard
- [x] Mobile responsive design
- [ ] Cancel and reschedule links for attendees
- [ ] Payments UI on top of the Stripe routes
- [ ] Webhooks settings UI
- [ ] Recurring booking UI
- [ ] Outlook connect button
- [ ] Team scheduling
- [ ] AI meeting prep
- [ ] Zoom integration
- [ ] iCloud Calendar support
- [ ] Recurring availability exceptions

## License

MIT License. Use it for your own projects.

## Author

Built by [Neel Vora](https://neelvora.com)
