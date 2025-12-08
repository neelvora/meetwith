import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { listCalendars as listGoogleCalendars } from '@/lib/calendar/googleClient'
import type { CalendarAccount } from '@/types'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')

  // If accountId is provided, fetch that specific account's calendars
  if (accountId && supabaseAdmin) {
    const { data: account, error } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', session.user.id) // Security: ensure user owns this account
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const calendarAccount: CalendarAccount = {
      id: account.id,
      user_id: account.user_id,
      provider: account.provider,
      provider_account_id: account.provider_account_id,
      account_email: account.account_email,
      access_token: account.access_token,
      refresh_token: account.refresh_token || undefined,
      expires_at: account.expires_at || undefined,
      calendar_id: account.calendar_id || 'primary',
      is_primary: account.is_primary || false,
      include_in_availability: account.include_in_availability ?? true,
      write_to_calendar: account.write_to_calendar ?? false,
      created_at: account.created_at,
    }

    const calendars = await listGoogleCalendars(calendarAccount)
    return NextResponse.json({ calendars })
  }

  // Fallback: use session token (for the primary login account)
  if (!session.accessToken) {
    return NextResponse.json({ error: 'No calendar access token' }, { status: 401 })
  }

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
