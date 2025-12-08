# MeetWith

An open source, AI-powered scheduling platform. Alternative to Calendly.

**Live at: [meetwith.dev](https://www.meetwith.dev)**

## Features

- 🗓️ **Multi-Calendar Sync** - Connect Google Calendar for availability checking
- 📅 **Public Booking Pages** - Share your link, let others book time with you
- ✅ **Smart Availability** - Respects your calendar busy times and weekly rules
- 📧 **Email Notifications** - Automated confirmations to host and attendee
- 🎥 **Google Meet Integration** - Auto-creates video call links for bookings
- 🔒 **Privacy-First** - Self-hostable, your data stays yours
- ⚡ **Modern Stack** - Next.js 16, Supabase, TypeScript
- 🎨 **Beautiful UI** - Glass morphism design, dark mode, fully mobile responsive

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

## Roadmap

- [x] Google OAuth + Calendar sync
- [x] Calendar connections UI
- [x] Availability rules engine
- [x] Public booking pages
- [x] Email notifications (Resend)
- [x] Google Meet integration
- [x] Booking management dashboard
- [x] Mobile responsive design
- [ ] AI meeting prep
- [ ] Zoom integration
- [ ] iCloud Calendar support
- [ ] Recurring availability exceptions

## License

MIT License - feel free to use this for your own projects!

## Author

Built by [Neel Vora](https://neelvora.com)
