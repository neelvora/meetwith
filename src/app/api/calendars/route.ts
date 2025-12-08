import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCalendarAccounts } from '@/lib/calendar'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // For now, return a mock based on session token
  // In production, this would query Supabase
  const accounts = session.accessToken
    ? [
        {
          id: 'google-primary',
          user_id: session.user.id || 'temp',
          provider: 'google' as const,
          provider_account_id: session.user.email,
          account_email: session.user.email,
          access_token: session.accessToken,
          calendar_id: 'primary',
          calendar_name: 'Google Calendar',
          is_primary: true,
          include_in_availability: true,
          write_to_calendar: false,
          created_at: new Date().toISOString(),
        },
      ]
    : []

  return NextResponse.json({ accounts })
}
