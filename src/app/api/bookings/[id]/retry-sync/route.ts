import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/calendar/googleClient'
import type { CalendarAccount } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email, timezone')
      .eq('email', session.user.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        event_types (name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot sync cancelled booking' }, { status: 400 })
    }

    if (booking.external_status === 'created' && booking.external_event_id) {
      return NextResponse.json({ error: 'Booking already synced' }, { status: 400 })
    }

    // Get the user's write calendar
    const { data: calendarAccount, error: calError } = await supabaseAdmin
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('write_to_calendar', true)
      .single()

    if (calError || !calendarAccount) {
      return NextResponse.json({ 
        error: 'No default calendar configured. Go to Dashboard > Calendars and select a default calendar for new bookings.',
        code: 'NO_WRITE_CALENDAR'
      }, { status: 400 })
    }

    const account: CalendarAccount = {
      id: calendarAccount.id,
      user_id: calendarAccount.user_id,
      provider: calendarAccount.provider,
      provider_account_id: calendarAccount.provider_account_id,
      account_email: calendarAccount.account_email,
      access_token: calendarAccount.access_token,
      refresh_token: calendarAccount.refresh_token || undefined,
      expires_at: calendarAccount.expires_at || undefined,
      scope: calendarAccount.scope || undefined,
      calendar_id: calendarAccount.calendar_id || 'primary',
      calendar_name: calendarAccount.calendar_name || undefined,
      is_primary: calendarAccount.is_primary || false,
      include_in_availability: calendarAccount.include_in_availability ?? true,
      write_to_calendar: calendarAccount.write_to_calendar ?? false,
      created_at: calendarAccount.created_at,
    }

    const eventType = Array.isArray(booking.event_types) ? booking.event_types[0] : booking.event_types
    const eventTitle = eventType?.name
      ? `${eventType.name} - ${booking.attendee_name}`
      : `Meeting with ${booking.attendee_name}`

    const eventDescription = `
Booked via MeetWith

Attendee: ${booking.attendee_name}
Email: ${booking.attendee_email}
${booking.notes ? `\nNotes: ${booking.notes}` : ''}
${booking.attendee_timezone ? `\nAttendee Timezone: ${booking.attendee_timezone}` : ''}

---
Manage this booking at https://www.meetwith.dev/dashboard
    `.trim()

    try {
      const calendarEvent = await createCalendarEvent(
        account,
        calendarAccount.calendar_id || 'primary',
        {
          summary: eventTitle,
          description: eventDescription,
          start: new Date(booking.start_time),
          end: new Date(booking.end_time),
          attendees: [booking.attendee_email],
          conferenceDataVersion: 1,
        }
      )

      if (!calendarEvent) {
        // Update with new error
        await supabaseAdmin
          .from('bookings')
          .update({
            external_status: 'failed',
            external_error: 'Calendar API returned empty response',
            external_retry_count: (booking.external_retry_count || 0) + 1,
          })
          .eq('id', id)

        return NextResponse.json({ 
          error: 'Calendar event creation failed. Check your calendar permissions.' 
        }, { status: 500 })
      }

      // Extract Google Meet link
      let meetLink: string | undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conferenceData = (calendarEvent as any).conferenceData
      if (conferenceData?.entryPoints) {
        const videoEntry = conferenceData.entryPoints.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ep: any) => ep.entryPointType === 'video'
        )
        meetLink = videoEntry?.uri
      }

      // Update booking with success
      await supabaseAdmin
        .from('bookings')
        .update({
          external_event_id: calendarEvent.id,
          external_status: 'created',
          external_error: null,
          location: meetLink || booking.location,
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        calendarEventId: calendarEvent.id,
        meetLink,
      })

    } catch (calendarError) {
      console.error('Calendar sync error:', calendarError)
      
      const errorMessage = calendarError instanceof Error ? calendarError.message : 'Unknown error'
      
      await supabaseAdmin
        .from('bookings')
        .update({
          external_status: 'failed',
          external_error: errorMessage,
          external_retry_count: (booking.external_retry_count || 0) + 1,
        })
        .eq('id', id)

      return NextResponse.json({ 
        error: `Calendar sync failed: ${errorMessage}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Retry sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
