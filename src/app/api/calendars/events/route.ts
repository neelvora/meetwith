import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCalendarEvents, type GoogleCalendarEvent } from '@/lib/calendar/googleClient'
import type { CalendarAccount } from '@/types'

export interface CalendarEventWithSource extends GoogleCalendarEvent {
  calendarId: string
  calendarName: string
  calendarColor: string
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 })
  }

  const timeMin = new Date(startDate)
  const timeMax = new Date(endDate)

  // Get all calendar accounts for this user
  let accounts: CalendarAccount[] = []

  if (supabaseAdmin && session.user.id) {
    const { data } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('include_in_availability', true)

    accounts = (data || []) as CalendarAccount[]
  }

  // Fallback if no accounts in DB
  if (accounts.length === 0 && session.accessToken) {
    accounts = [
      {
        id: 'google-primary',
        user_id: session.user.id || 'temp',
        provider: 'google' as const,
        provider_account_id: session.user.email,
        account_email: session.user.email,
        access_token: session.accessToken,
        calendar_id: 'primary',
        calendar_name: 'Primary Calendar',
        is_primary: true,
        include_in_availability: true,
        write_to_calendar: true,
        created_at: new Date().toISOString(),
      },
    ]
  }

  // Fetch events from all calendars
  const allEvents: CalendarEventWithSource[] = []

  // Color palette for different calendars
  const colors = [
    '#8b5cf6', // violet
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
  ]

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    try {
      const events = await getCalendarEvents(
        account,
        account.calendar_id,
        timeMin,
        timeMax
      )

      // Add calendar source info to each event
      const eventsWithSource = events.map((event) => ({
        ...event,
        calendarId: account.calendar_id,
        calendarName: account.calendar_name || account.calendar_id,
        calendarColor: colors[i % colors.length],
      }))

      allEvents.push(...eventsWithSource)
    } catch (error) {
      console.error(`Error fetching events from ${account.calendar_id}:`, error)
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => {
    const aStart = a.start.dateTime || a.start.date || ''
    const bStart = b.start.dateTime || b.start.date || ''
    return new Date(aStart).getTime() - new Date(bStart).getTime()
  })

  return NextResponse.json({ events: allEvents })
}
