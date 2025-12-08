# MeetWith

An open source, AI-powered scheduling platform. Better than Calendly.

## Features

- 🗓️ **Multi-Calendar Sync** - Connect Google Calendar, iCloud, and more
- 🤖 **AI Smart Scheduling** - Learns your preferences, suggests optimal times
- 🔒 **Privacy-First** - Self-hostable, your data stays yours
- ⚡ **Modern Stack** - Next.js 15, Supabase, TypeScript
- 🎨 **Beautiful UI** - Glass morphism design, dark mode

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google Cloud Console project (for Calendar API)

### Installation

```bash
# Clone the repo
git clone https://github.com/neelvora/meetwith.git
cd meetwith

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run the development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Calendar**: Google Calendar API, CalDAV

## Roadmap

- [x] Project setup
- [ ] Google OAuth + Calendar sync
- [ ] Availability rules engine
- [ ] Public booking pages
- [ ] Email notifications
- [ ] AI meeting prep
- [ ] Voice booking
- [ ] iCloud Calendar support

## License

MIT License - feel free to use this for your own projects!

## Author

Built by [Neel Vora](https://neelvora.com)
