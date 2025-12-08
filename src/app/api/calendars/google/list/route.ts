import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listCalendars as listGoogleCalendars } from '@/lib/calendar/googleClient'
import type { CalendarAccount } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized or no calendar access' }, { status: 401 })
  }

  // Create a mock CalendarAccount from the session for the API call
  const mockAccount: CalendarAccount = {
    id: 'session',
    user_id: 'session',
    provider: 'google',
    provider_account_id: session.user.email,
    account_email: session.user.email,
    access_token: session.accessToken,
    calendar_id: 'primary',
    is_primary: true,
    include_in_availability: true,
    write_to_calendar: false,
    created_at: new Date().toISOString(),
  }

  const calendars = await listGoogleCalendars(mockAccount)

  return NextResponse.json({ calendars })
}
